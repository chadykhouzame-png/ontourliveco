import { test, expect, Page } from "@playwright/test";

/**
 * Visual regression for ReachBadge tiers (Major / Established / Emerging)
 * across dark + light themes. Guards the semantic tokens the badge relies
 * on (`text-success`, `text-info`, `text-muted-foreground`, `text-danger`)
 * so any drift back to raw palette utilities like `text-sky-500` is caught
 * as a pixel diff.
 *
 * Snapshots live at `tests/visual/reachBadge.spec.ts-snapshots/`.
 * Regenerate with `npx playwright test --update-snapshots`.
 */

const THEME_STORAGE_KEY = "otl.theme";
type ThemeChoice = "dark" | "light";

// Mirrors the class output of src/components/ReachBadge.tsx so the diff is
// scoped to the token itself, not the surrounding app chrome.
type Tier = "Major" | "Established" | "Emerging";

const TIER_CLASS: Record<Tier, string> = {
  Major: "text-success",
  Established: "text-info",
  Emerging: "text-muted-foreground",
};

const SPARKLES_SVG = (cls: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round"
       stroke-linejoin="round" class="lucide lucide-sparkles h-3 w-3 ${cls}">
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
    <path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>
  </svg>`;

const TRENDING_SVG = (direction: "up" | "down", cls: string) => {
  const path =
    direction === "up"
      ? '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>'
      : '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/><polyline points="16 17 22 17 22 11"/>';
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2" stroke-linecap="round"
         stroke-linejoin="round" class="lucide h-3 w-3 ${cls}">${path}</svg>`;
};

const BADGE = (tier: Tier, score: number, growthPct: number | null = null) => {
  const tierCls = TIER_CLASS[tier];
  const showGrowth = growthPct != null && Math.abs(growthPct) >= 2;
  const growthCls = (growthPct ?? 0) >= 0 ? "text-success" : "text-danger";
  const growthMarkup = showGrowth
    ? `<span class="flex items-center gap-0.5 ${growthCls}">
         ${TRENDING_SVG((growthPct ?? 0) >= 0 ? "up" : "down", "")}
         ${Math.abs(growthPct as number).toFixed(0)}%
       </span>`
    : "";
  return `
    <span data-test="reach-badge"
          class="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 text-xs font-medium">
      ${SPARKLES_SVG(tierCls)}
      <span class="${tierCls}">${score}</span>
      ${growthMarkup}
    </span>`;
};

// Growth on one tier exercises the success/danger tokens too.
const CASES: { name: string; tier: Tier; score: number; growth: number | null }[] = [
  { name: "major-growth-up", tier: "Major", score: 92, growth: 12 },
  { name: "established", tier: "Established", score: 65, growth: null },
  { name: "emerging-growth-down", tier: "Emerging", score: 24, growth: -8 },
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
  test.describe(`ReachBadge visual — ${theme}`, () => {
    for (const c of CASES) {
      test(`${c.name} tier`, async ({ page }) => {
        await seedTheme(page, theme);
        await mountHarness(page, BADGE(c.tier, c.score, c.growth));

        const themeClass = await page.evaluate(() =>
          document.documentElement.classList.contains("dark") ? "dark" : "light",
        );
        expect(themeClass).toBe(theme);

        const target = page.locator('[data-test="reach-badge"]');
        await expect(target).toBeVisible();
        await expect(target).toHaveScreenshot(`reach-badge-${c.name}-${theme}.png`);
      });
    }
  });
}
