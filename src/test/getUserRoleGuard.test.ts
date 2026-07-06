import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression tests for public.get_user_role(uuid):
 *  - Body enforces self-or-admin caller check.
 *  - Migrations end with EXECUTE revoked from anon and PUBLIC.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function loadCombinedSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

const sql = loadCombinedSql();
const codeOnly = sql
  .split("\n")
  .map((l) => l.replace(/--.*$/, ""))
  .join("\n");

describe("get_user_role caller guard", () => {
  it("has a latest definition that returns NULL when auth.uid() is missing", () => {
    const re =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_user_role[\s\S]*?\$function\$([\s\S]*?)\$function\$/gi;
    const bodies = [...codeOnly.matchAll(re)].map((m) => m[1]);
    expect(bodies.length).toBeGreaterThan(0);
    const latest = bodies[bodies.length - 1];
    expect(latest).toMatch(/IF\s+auth\.uid\(\)\s+IS\s+NULL\s+THEN[\s\S]*?RETURN\s+NULL/i);
  });

  it("restricts non-admin callers to looking up their own user id", () => {
    const re =
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.get_user_role[\s\S]*?\$function\$([\s\S]*?)\$function\$/gi;
    const latest = [...codeOnly.matchAll(re)].pop()![1];
    // Must compare _user_id vs auth.uid() and consult has_role for admin bypass.
    expect(latest).toMatch(/_user_id\s*<>\s*auth\.uid\(\)/i);
    expect(latest).toMatch(/has_role\s*\(\s*auth\.uid\(\)\s*,\s*'admin'/i);
    expect(latest).toMatch(/RETURN\s+NULL\s*;/i);
  });
});

describe("get_user_role EXECUTE grants", () => {
  it("revokes EXECUTE from anon at least once", () => {
    expect(codeOnly).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_role\s*\(\s*uuid\s*\)\s+FROM\s+[^;]*\banon\b/i,
    );
  });

  it("revokes EXECUTE from PUBLIC at least once", () => {
    expect(codeOnly).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_role\s*\(\s*uuid\s*\)\s+FROM\s+[^;]*\bPUBLIC\b/i,
    );
  });

  it("never regrants EXECUTE to anon or PUBLIC after the revoke", () => {
    // Walk grant/revoke events in order; final state for anon / PUBLIC must be revoked.
    const evRe =
      /(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+public\.get_user_role\s*\(\s*uuid\s*\)\s+(?:TO|FROM)\s+([^;]+);/gi;
    const state: Record<string, "granted" | "revoked"> = {};
    for (const m of codeOnly.matchAll(evRe)) {
      const op = m[1].toUpperCase() === "GRANT" ? "granted" : "revoked";
      const roles = m[2]
        .toLowerCase()
        .split(",")
        .map((r) => r.trim());
      for (const r of roles) state[r] = op;
    }
    expect(state["anon"]).toBe("revoked");
    expect(state["public"]).toBe("revoked");
  });
});
