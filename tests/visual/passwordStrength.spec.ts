import { test, expect, Page } from "@playwright/test";
import { getStrengthLabel } from "../../src/lib/passwordValidation";

/**
 * Visual regression for password strength indicator colors across
 * dark + light themes. Guards the semantic tokens returned by
 * `getStrengthLabel` in `src/lib/passwordValidation.ts` — `bg-destructive`,
 * `bg-destructive/70`, `bg-warning`, `bg-success/70`, `bg-success` — so any
 * drift back to raw palette utilities like `bg-orange-500` / `bg-lime-500`
 * is caught as a pixel diff.
 *
 * Snapshots live at `tests/visual/passwordStrength.spec.ts-snapshots/`.
 * Regenerate with `npx playwright test --update-snapshots`.
 */

const THEME_STORAGE_KEY = "otl.theme";
type ThemeChoice = "dark" | "light";

// Scores 0-5 map to the five labeled tiers in getStrengthLabel.
const SCORES = [0, 2, 3, 4, 5] as const;

const BAR = (score: number) => {
  const { label, color } = getStrengthLabel(score);
  // Bar segment width mirrors src/components/PasswordStrengthIndicator.tsx:
  // score 0-5 fills 0-100% of the track.
  const fillPct = Math.max(0, Math.min(100, (score / 5) * 100));
  const slug = label.toLowerCase().replace(/\s+/g, "-");
  return `
    <div data-test="password-strength" data-tier="${slug}"
         class="w-64 space-y-2 p-4">
      <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div class="h-full ${color} transition-all" style="width: ${fillPct}%"></div>
      </div>
      <p class="text-xs font-medium text-foreground">${label}</p>
    </div>`;
};

const GRID = () => `
  <div data-test="password-strength-grid"
       class="flex flex-col gap-2 p-6 bg-background">
    ${SCORES.map((s) => BAR(s)).join("")}
  </div>`;

async function seedTheme(page: Page, theme: ThemeChoice) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    [THEME_STORAGE_KEY, theme],
  );
  await page.emulateMedia({ colorScheme: theme });
}

async function mountHarness(page: Page, markup: string) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate((html) => {
    document.body.innerHTML = `<main id="visual-harness" class="min-h-screen bg-background flex items-center justify-center">${html}</main>`;
  }, markup);
  await page.addStyleTag({
    content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`,
  });
  await page.waitForTimeout(100);
}

for (const theme of ["dark", "light"] as ThemeChoice[]) {
  test.describe(`Password strength — ${theme}`, () => {
    test("all tiers stacked", async ({ page }) => {
      await seedTheme(page, theme);
      await mountHarness(page, GRID());

      const themeClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
      expect(themeClass).toBe(theme);

      const target = page.locator('[data-test="password-strength-grid"]');
      await expect(target).toBeVisible();
      await expect(target).toHaveScreenshot(`password-strength-grid-${theme}.png`);
    });

    // Snapshot each tier individually so a single-token regression is easy
    // to isolate from the combined grid diff.
    for (const score of SCORES) {
      const { label } = getStrengthLabel(score);
      const slug = label.toLowerCase().replace(/\s+/g, "-");
      test(`${slug} tier`, async ({ page }) => {
        await seedTheme(page, theme);
        await mountHarness(
          page,
          `<div class="p-6 bg-background">${BAR(score)}</div>`,
        );

        const target = page.locator(
          `[data-test="password-strength"][data-tier="${slug}"]`,
        );
        await expect(target).toBeVisible();
        await expect(target).toHaveScreenshot(
          `password-strength-${slug}-${theme}.png`,
        );
      });
    }
  });
}
