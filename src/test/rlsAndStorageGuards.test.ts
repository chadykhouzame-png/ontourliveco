import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Regression tests for the security migrations that:
 *  1. Hide `artists.stripe_account_id` and `artists.mobile` from anon + authenticated.
 *  2. Require path-ownership on `message-attachments` uploads.
 *
 * These parse the committed migration SQL so that a future migration cannot
 * silently widen access without also breaking this test.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function loadMigrations(): { name: string; sql: string }[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ name: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
}

const migrations = loadMigrations();
const combined = migrations.map((m) => m.sql).join("\n");
// Naive comment stripper — good enough to keep -- ... comments from matching.
const codeOnly = combined
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n");

describe("artists sensitive-column privileges", () => {
  it("revokes table-level SELECT on public.artists from anon and authenticated", () => {
    const re =
      /REVOKE\s+SELECT\s+ON\s+public\.artists\s+FROM\s+([^;]+);/gi;
    const matches = [...codeOnly.matchAll(re)];
    expect(matches.length).toBeGreaterThan(0);
    const target = matches[matches.length - 1][1].toLowerCase();
    expect(target).toContain("anon");
    expect(target).toContain("authenticated");
  });

  it("re-grants SELECT on safe columns without stripe_account_id or mobile", () => {
    const re =
      /GRANT\s+SELECT\s*\(([^)]+)\)\s+ON\s+public\.artists\s+TO\s+([^;]+);/gi;
    const matches = [...codeOnly.matchAll(re)];
    expect(matches.length).toBeGreaterThan(0);

    // Use the most recent column-scoped GRANT
    const [, cols, roles] = matches[matches.length - 1];
    const columns = cols
      .split(",")
      .map((c) => c.trim().toLowerCase());

    expect(columns).not.toContain("stripe_account_id");
    expect(columns).not.toContain("mobile");
    // Sanity: at least one expected public column is present.
    expect(columns).toContain("artist_name");

    const rolesLc = roles.toLowerCase();
    expect(rolesLc).toContain("anon");
    expect(rolesLc).toContain("authenticated");
  });

  it("never re-adds table-wide SELECT to anon or authenticated on public.artists", () => {
    // Any post-revoke GRANT SELECT ON public.artists TO anon/authenticated
    // (without a column list) would undo the fix.
    const re =
      /GRANT\s+(?:[A-Z, ]*\b)?SELECT\b(?!\s*\()[A-Z, ]*ON\s+public\.artists\s+TO\s+([^;]+);/gi;
    const badTargets = [...codeOnly.matchAll(re)]
      .map((m) => m[1].toLowerCase())
      .filter((t) => t.includes("anon") || t.includes("authenticated"));
    expect(badTargets).toEqual([]);
  });
});

describe("message-attachments storage upload policy", () => {
  it("enforces path ownership via storage.foldername on INSERT", () => {
    // Find the CREATE POLICY block for message-attachments uploads.
    const re =
      /CREATE\s+POLICY\s+"Users can upload message attachments"[\s\S]*?WITH\s+CHECK\s*\(([\s\S]*?)\)\s*;/gi;
    const matches = [...codeOnly.matchAll(re)];
    expect(matches.length).toBeGreaterThan(0);

    const withCheck = matches[matches.length - 1][1];
    expect(withCheck).toMatch(/bucket_id\s*=\s*'message-attachments'/i);
    expect(withCheck).toMatch(/auth\.uid\(\)/i);
    expect(withCheck).toMatch(/storage\.foldername\s*\(\s*name\s*\)/i);
  });
});
