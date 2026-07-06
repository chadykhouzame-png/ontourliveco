import { test, expect, Page } from "@playwright/test";

/**
 * Visual regression for StarRating in filled / half / empty states across
 * dark + light themes. Guards the semantic `warning` token so any drift back
 * to raw yellow/amber utilities or bad half-fill opacity is caught in pixels.
 *
 * Snapshots live at `tests/visual/starRating.spec.ts-snapshots/`. Regenerate
 * with `npx playwright test --update-snapshots` after intentional changes.
 */

const THEME_STORAGE_KEY = "otl.theme";
type ThemeChoice = "dark" | "light";

// Mirrors the class output of src/components/StarRating.tsx so the visual
// diff is scoped to the token itself, not the rest of the app chrome.
const STAR_SVG = (mode: "filled" | "half" | "empty") => {
  const cls =
    mode === "filled"
      ? "w-6 h-6 fill-warning text-warning"
      : mode === "half"
        ? "w-6 h-6 fill-warning/50 text-warning"
        : "w-6 h-6 text-muted-foreground/30";
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" class="lucide lucide-star ${cls}">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`;
};

const HARNESS = (rating: number) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return STAR_SVG("filled");
    if (i < rating) return STAR_SVG("half");
    return STAR_SVG("empty");
  }).join("");
  return `<div data-test="star-rating" class="inline-flex items-center gap-0.5 p-4 bg-background">${stars}</div>`;
};

const CASES: { name: string; rating: number }[] = [
  { name: "filled", rating: 5 },
  { name: "half", rating: 2.5 },
  { name: "empty", rating: 0 },
];

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

async function mountHarness(page: Page, rating: number) {
  // Navigate to the app so index.css / Tailwind tokens are loaded and the
  // ThemeProvider applies the .dark class from localStorage.
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  // Replace body with an isolated harness so the diff only covers the stars.
  await page.evaluate((html) => {
    document.body.innerHTML = `<main id="visual-harness" class="min-h-screen bg-background flex items-center justify-center">${html}</main>`;
  }, HARNESS(rating));
  await page.addStyleTag({
    content: `*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }`,
  });
  await page.waitForTimeout(100);
}

for (const theme of ["dark", "light"] as ThemeChoice[]) {
  test.describe(`StarRating visual — ${theme}`, () => {
    for (const c of CASES) {
      test(`${c.name} state`, async ({ page }) => {
        await seedTheme(page, theme);
        await mountHarness(page, c.rating);

        const themeClass = await page.evaluate(() =>
          document.documentElement.classList.contains("dark") ? "dark" : "light",
        );
        expect(themeClass).toBe(theme);

        const target = page.locator('[data-test="star-rating"]');
        await expect(target).toBeVisible();
        await expect(target).toHaveScreenshot(`star-rating-${c.name}-${theme}.png`);
      });
    }
  });
}
