import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for dark-mode visual regression.
 *
 * The suite launches the Vite dev server (or reuses one already running on
 * :8080) and compares screenshots of the key landing and dashboard routes
 * against committed baselines under `tests/visual/__screenshots__/`.
 *
 * Regenerate baselines locally with:
 *   npx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: {
    // A little slack for anti-aliasing / font hinting differences across hosts.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: "http://localhost:8080",
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 8080",
    url: "http://localhost:8080",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
