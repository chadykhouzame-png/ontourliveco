import { test, expect, Page } from "@playwright/test";

/**
 * Visual regression coverage for dark-mode overlays, tokens, and contrast.
 *
 * Each route is captured in both dark and light themes so token drift (a
 * hardcoded `bg-white`, a reintroduced `text-yellow-400`, a broken overlay
 * gradient) shows up as a pixel diff on the next run.
 *
 * Snapshots live at `tests/visual/__screenshots__/`. Update with
 * `npx playwright test --update-snapshots` after intentional visual changes.
 */

// Storage key used by src/components/ThemeProvider.tsx
const THEME_STORAGE_KEY = "otl.theme";

type ThemeChoice = "dark" | "light";

const ROUTES: { name: string; path: string }[] = [
  { name: "landing", path: "/" },
  { name: "search-artists", path: "/search" },
  { name: "search-venues", path: "/search/venues" },
  { name: "artist-dashboard", path: "/artist/dashboard" },
  { name: "venue-dashboard", path: "/venue/dashboard" },
  { name: "analytics", path: "/analytics" },
  { name: "admin-dashboard", path: "/admin" },
  { name: "messages", path: "/messages" },
  { name: "terms", path: "/terms" },
  { name: "privacy", path: "/privacy" },
];

async function seedTheme(page: Page, theme: ThemeChoice) {
  await page.addInitScript(
    ([key, value]) => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        /* ignore private-mode failures */
      }
    },
    [THEME_STORAGE_KEY, theme],
  );
  await page.emulateMedia({ colorScheme: theme });
}

async function stabilize(page: Page) {
  // Wait for network to go idle so async data / images settle.
  await page.waitForLoadState("networkidle").catch(() => {});
  // Disable animations & caret blinking for deterministic pixels.
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
        caret-color: transparent !important;
      }
      html { scroll-behavior: auto !important; }
    `,
  });
  // Give React one frame to apply the theme class on <html>.
  await page.waitForTimeout(150);
}

for (const theme of ["dark", "light"] as ThemeChoice[]) {
  test.describe(`theme: ${theme}`, () => {
    for (const route of ROUTES) {
      test(`${route.name} renders without regressions`, async ({ page }) => {
        await seedTheme(page, theme);
        const response = await page.goto(route.path, {
          waitUntil: "domcontentloaded",
        });
        // Route may 302 to /select-role or /join/* for unauthenticated visits —
        // that's still a valid rendered surface to guard against contrast drift.
        expect(response?.status(), `HTTP status for ${route.path}`).toBeLessThan(500);

        await stabilize(page);

        // Assert the theme class actually applied — catches ThemeProvider bugs
        // before we compare pixels.
        const themeClass = await page.evaluate(() =>
          document.documentElement.classList.contains("dark") ? "dark" : "light",
        );
        expect(themeClass).toBe(theme);

        await expect(page).toHaveScreenshot(
          `${route.name}-${theme}.png`,
          {
            fullPage: false,
            mask: [
              // Mask timestamps, avatars, and other volatile UI so we only
              // catch true color/contrast regressions.
              page.locator("[data-visual-volatile]"),
              page.locator("img"),
              page.locator("time"),
            ],
          },
        );
      });
    }
  });
}
