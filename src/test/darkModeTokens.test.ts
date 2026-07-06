import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Dark-mode UI regression check.
 *
 * The First Light palette is theme-token driven: bg-background, text-foreground,
 * bg-card, border-border, etc. Hardcoded utilities like `bg-white`, `text-black`,
 * `bg-gray-100`, or raw hex values bypass the .dark class and cause dark-mode
 * regressions (white cards on noir, invisible borders, etc.).
 *
 * This test scans the key landing + Analytics + Disputes surfaces and fails if
 * any off-brand color utility or hex literal sneaks back in.
 */

const SURFACES = [
  "src/pages/Index.tsx",
  "src/pages/Analytics.tsx",
  "src/components/UserDisputes.tsx",
  "src/components/admin/AdminDisputes.tsx",
  "src/components/DisputeSubmitDialog.tsx",
];

// Utilities that force a fixed color regardless of theme.
const FORBIDDEN_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "bg-white",  regex: /\bbg-white\b/ },
  { name: "bg-black",  regex: /\bbg-black(?![-\w])/ },
  { name: "text-white", regex: /\btext-white\b/ },
  { name: "text-black", regex: /\btext-black\b/ },
  { name: "bg-gray-*",  regex: /\bbg-(?:gray|slate|zinc|neutral|stone)-\d{2,3}\b/ },
  { name: "text-gray-*", regex: /\btext-(?:gray|slate|zinc|neutral|stone)-\d{2,3}\b/ },
  // Arbitrary hex color classes: bg-[#fff], text-[#000000], border-[#abc123]
  { name: "arbitrary hex color", regex: /(?:bg|text|border|from|to|via|ring|fill|stroke)-\[#[0-9a-fA-F]{3,8}\]/ },
];

function read(file: string) {
  return readFileSync(resolve(process.cwd(), file), "utf8");
}

describe("dark-mode token regression", () => {
  for (const file of SURFACES) {
    it(`${file} uses semantic tokens (no hardcoded colors)`, () => {
      const src = read(file);
      const hits: string[] = [];
      for (const { name, regex } of FORBIDDEN_PATTERNS) {
        const m = src.match(new RegExp(regex, "g"));
        if (m) hits.push(`${name} → ${[...new Set(m)].join(", ")}`);
      }
      expect(hits, `Off-brand color usage in ${file}:\n  ${hits.join("\n  ")}`).toEqual([]);
    });
  }

  it("index.css defines the tokens the dark theme depends on", () => {
    const css = read("src/index.css");
    // .dark block must remap the core surface + focus tokens.
    const darkBlock = css.match(/\.dark\s*\{[\s\S]*?\n\s*\}/)?.[0] ?? "";
    for (const token of [
      "--background",
      "--foreground",
      "--card",
      "--border",
      "--input",
      "--ring",
      "--primary",
    ]) {
      expect(darkBlock, `expected ${token} in .dark block`).toContain(token);
    }
  });
});
