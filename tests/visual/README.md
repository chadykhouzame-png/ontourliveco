# Visual regression tests

Playwright captures dark- and light-mode screenshots of the key landing and
dashboard routes so token drift (a stray `bg-white`, a reintroduced
`text-yellow-400`, a broken overlay gradient) shows up as a pixel diff.

## Run locally

```bash
# One-time: install the matching Chromium build
npx playwright install chromium

# Run the suite (auto-starts the Vite dev server on :8080)
npm run test:visual

# After an intentional UI change, refresh baselines and commit them
npm run test:visual:update
```

Baselines are written next to the spec at
`tests/visual/darkMode.spec.ts-snapshots/`. Commit them alongside the code
change that produced the new look. The runner tolerates up to a 2%
per-image pixel diff to absorb font hinting differences across hosts.

## What is covered

For every route below the suite renders it in both `dark` and `light` themes
(seeded through the `otl.theme` localStorage key used by
`src/components/ThemeProvider.tsx`) and asserts the `.dark` class is present
before capturing pixels.

- `/` — landing
- `/search`, `/search/venues`
- `/artist/dashboard`, `/venue/dashboard`
- `/analytics`
- `/admin`
- `/messages`
- `/terms`, `/privacy`

`img`, `time`, and any element tagged with `data-visual-volatile` are masked
so the diff only reflects color/contrast/overlay regressions, not live data.
