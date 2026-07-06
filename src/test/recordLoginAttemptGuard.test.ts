import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression tests for the hardened `public.record_login_attempt` function.
 *
 * Threat model: an anonymous or wrong-user caller must NOT be able to clear
 * another account's failed-login history by passing p_success=true. Only a
 * caller authenticated as the email owner may trigger the DELETE that lifts
 * the lockout.
 *
 * We assert the guard exists in the latest CREATE OR REPLACE FUNCTION body
 * shipped in migrations so a future migration cannot silently regress it.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function loadCombinedMigrations(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

// Grab the most recent function definition body.
function latestRecordLoginAttemptBody(sql: string): string {
  const re =
    /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.record_login_attempt[\s\S]*?\$function\$([\s\S]*?)\$function\$/gi;
  const matches = [...sql.matchAll(re)];
  expect(matches.length, "record_login_attempt must be defined in a migration").toBeGreaterThan(0);
  return matches[matches.length - 1][1];
}

const sql = loadCombinedMigrations();
const body = latestRecordLoginAttemptBody(sql);
// Strip line comments so `-- foo auth.uid()` doesn't create false positives.
const code = body
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("record_login_attempt caller guard", () => {
  it("is defined as SECURITY DEFINER", () => {
    // Look for SECURITY DEFINER in the full function signature block, not just the body.
    const sigRe =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.record_login_attempt[\s\S]*?\$function\$/gi;
    const sig = [...sql.matchAll(sigRe)].pop()?.[0] ?? "";
    expect(sig).toMatch(/SECURITY\s+DEFINER/i);
  });

  it("always inserts the attempt row (independent of caller identity)", () => {
    expect(code).toMatch(
      /INSERT\s+INTO\s+public\.login_attempts[\s\S]*?VALUES\s*\(\s*LOWER\s*\(\s*p_email\s*\)/i,
    );
  });

  it("gates the failed-attempt DELETE on p_success AND auth.uid() IS NOT NULL", () => {
    // The IF-block that wraps the DELETE must require both conditions.
    const ifBlock = code.match(
      /IF\s+p_success\s+AND\s+auth\.uid\(\)\s+IS\s+NOT\s+NULL\s+THEN([\s\S]*?)END\s+IF\s*;/i,
    );
    expect(ifBlock, "expected an IF p_success AND auth.uid() IS NOT NULL guard").not.toBeNull();
    // The DELETE that lifts the lockout must live inside that guarded block.
    expect(ifBlock![1]).toMatch(/DELETE\s+FROM\s+public\.login_attempts/i);
  });

  it("only clears failed attempts when the authenticated caller's email matches p_email", () => {
    // The DELETE must be nested inside an email-match check against auth.users.
    const emailMatchRe =
      /SELECT\s+LOWER\s*\(\s*email\s*\)\s+INTO\s+caller_email\s+FROM\s+auth\.users\s+WHERE\s+id\s*=\s*auth\.uid\(\)[\s\S]*?IF\s+caller_email\s*=\s*LOWER\s*\(\s*p_email\s*\)\s+THEN([\s\S]*?)END\s+IF\s*;/i;
    const match = code.match(emailMatchRe);
    expect(
      match,
      "expected caller_email lookup followed by an IF caller_email = LOWER(p_email) guard",
    ).not.toBeNull();
    // The DELETE that clears failed attempts must be inside the email-match branch.
    expect(match![1]).toMatch(
      /DELETE\s+FROM\s+public\.login_attempts\s+WHERE\s+email\s*=\s*LOWER\s*\(\s*p_email\s*\)\s+AND\s+success\s*=\s*false/i,
    );
  });

  it("does not contain an unguarded DELETE of failed attempts", () => {
    // Strip the guarded IF block, then assert no residual DELETE remains.
    const withoutGuardedBlock = code.replace(
      /IF\s+p_success\s+AND\s+auth\.uid\(\)\s+IS\s+NOT\s+NULL\s+THEN[\s\S]*?END\s+IF\s*;/i,
      "",
    );
    expect(withoutGuardedBlock).not.toMatch(
      /DELETE\s+FROM\s+public\.login_attempts\s+WHERE\s+email\s*=\s*LOWER\s*\(\s*p_email\s*\)/i,
    );
  });
});

describe("login_attempts write surface", () => {
  it("does not restore a permissive public INSERT policy on login_attempts", () => {
    // Remove line comments across the full migrations corpus.
    const codeOnly = sql
      .split("\n")
      .map((l) => l.replace(/--.*$/, ""))
      .join("\n");

    // Find every CREATE POLICY block that targets login_attempts.
    const policyRe =
      /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.login_attempts([\s\S]*?);/gi;
    const permissive: string[] = [];
    for (const m of codeOnly.matchAll(policyRe)) {
      const [, name, rest] = m;
      const isInsert = /FOR\s+(INSERT|ALL)/i.test(rest);
      const roles = rest.match(/TO\s+([a-zA-Z_, ]+)/i)?.[1]?.toLowerCase() ?? "";
      const withCheck = rest.match(/WITH\s+CHECK\s*\(([\s\S]*?)\)/i)?.[1]?.trim() ?? "";
      const rolesPublic =
        roles.includes("anon") || roles.includes("public") || roles.trim() === "";
      if (isInsert && rolesPublic && withCheck === "true") {
        permissive.push(name);
      }
    }
    // There must be at least one migration that dropped the historical permissive policy.
    expect(codeOnly).toMatch(
      /DROP\s+POLICY\s+IF\s+EXISTS\s+"Allow insert login attempts"\s+ON\s+public\.login_attempts/i,
    );
    // And no later migration may recreate a permissive one.
    // (This is order-insensitive: if a recreate exists, the drop wouldn't clear it at runtime.
    //  We enforce "final state has no permissive INSERT policy" by checking the last matching
    //  CREATE/DROP pair per name.)
    const lastByName = new Map<string, "create" | "drop">();
    const eventRe =
      /(CREATE|DROP)\s+POLICY(?:\s+IF\s+EXISTS)?\s+"([^"]+)"\s+ON\s+public\.login_attempts/gi;
    for (const m of codeOnly.matchAll(eventRe)) {
      lastByName.set(m[2], m[1].toUpperCase() === "CREATE" ? "create" : "drop");
    }
    for (const name of permissive) {
      expect(
        lastByName.get(name),
        `policy "${name}" should end in a dropped state`,
      ).toBe("drop");
    }
  });
});
