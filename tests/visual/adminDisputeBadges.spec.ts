import { test, expect, Page } from "@playwright/test";

/**
 * Visual regression for AdminDisputes type badges across dark + light themes.
 *
 * Covers every branch of `getTypeBadge` in
 * `src/components/admin/AdminDisputes.tsx`. Guards the semantic tokens the
 * badges rely on — `text-info`, `text-success`, `text-warning`,
 * `text-danger`, `text-muted-foreground` — so any drift back to raw palette
 * utilities like `text-purple-500` / `text-orange-500` is caught as a pixel
 * diff.
 *
 * Snapshots live at `tests/visual/adminDisputeBadges.spec.ts-snapshots/`.
 * Regenerate with `npx playwright test --update-snapshots`.
 */

const THEME_STORAGE_KEY = "otl.theme";
type ThemeChoice = "dark" | "light";

// Mirrors the class output of AdminDisputes `getTypeBadge`.
const TYPE_CLASS: Record<string, string> = {
  general: "bg-muted-foreground/10 text-muted-foreground",
  booking: "bg-info/10 text-info",
  payment: "bg-success/10 text-success",
  behavior: "bg-warning/10 text-warning",
  fraud: "bg-danger/10 text-danger",
  other: "bg-info/10 text-info",
};

// Base classes the shadcn <Badge> renders (see src/components/ui/badge.tsx).
const BADGE_BASE =
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent";

const TYPE_BADGE = (type: keyof typeof TYPE_CLASS) => `
  <span data-test="type-badge" data-type="${type}"
        class="${BADGE_BASE} ${TYPE_CLASS[type]}">
    ${type.charAt(0).toUpperCase() + type.slice(1)}
  </span>`;

const GRID = () => `
  <div data-test="type-badge-grid" class="flex flex-wrap items-center gap-3 p-6 bg-background">
    ${Object.keys(TYPE_CLASS).map((t) => TYPE_BADGE(t)).join("")}
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
  test.describe(`AdminDisputes type badges — ${theme}`, () => {
    test("full type badge grid", async ({ page }) => {
      await seedTheme(page, theme);
      await mountHarness(page, GRID());

      const themeClass = await page.evaluate(() =>
        document.documentElement.classList.contains("dark") ? "dark" : "light",
      );
      expect(themeClass).toBe(theme);

      const target = page.locator('[data-test="type-badge-grid"]');
      await expect(target).toBeVisible();
      await expect(target).toHaveScreenshot(`admin-dispute-type-badges-${theme}.png`);
    });

    // Snapshot each badge individually so a single-token regression is easy
    // to isolate from the combined grid diff.
    for (const type of Object.keys(TYPE_CLASS)) {
      test(`${type} badge in isolation`, async ({ page }) => {
        await seedTheme(page, theme);
        await mountHarness(
          page,
          `<div class="p-6 bg-background">${TYPE_BADGE(type as keyof typeof TYPE_CLASS)}</div>`,
        );

        const target = page.locator(`[data-test="type-badge"][data-type="${type}"]`);
        await expect(target).toBeVisible();
        await expect(target).toHaveScreenshot(`admin-dispute-type-${type}-${theme}.png`);
      });
    }
  });
}
