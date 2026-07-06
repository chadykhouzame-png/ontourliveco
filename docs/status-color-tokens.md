# Status color tokens

Use these semantic tokens for every status-style surface (badges, banners,
toasts, inline validation, dispute states, payout states, etc.). Never
reintroduce raw palette classes like `bg-green-500`, `text-yellow-400`, or
`border-red-500` — the ESLint token-drift rule will flag them and dark mode
will look wrong.

## Meaning → token

| Meaning   | When to use it                                                      | Token       | Foreground on token |
| --------- | ------------------------------------------------------------------- | ----------- | ------------------- |
| `success` | Confirmed, paid, verified, connected, completed, positive delta     | `--success` | `--success-foreground` |
| `warning` | Pending action, expiring soon, star ratings, soft caution           | `--warning` | `--warning-foreground` |
| `danger`  | Errors, disputes, cancellations, destructive actions, failed payout | `--danger`  | `--danger-foreground`  |
| `info`    | Neutral status, in-progress, informational callouts, help text      | `--info`    | `--info-foreground`   |

All four tokens are defined in `src/index.css` and are theme-aware — do not
hardcode hex values or Tailwind palette shades in components.

## Tailwind utilities

Every token exposes the standard Tailwind utility families through the
theme config. Pick the family that matches the surface you're styling.

| Surface            | Success                                    | Warning                                    | Danger                                    | Info                                    |
| ------------------ | ------------------------------------------ | ------------------------------------------ | ----------------------------------------- | --------------------------------------- |
| Solid background   | `bg-success text-success-foreground`       | `bg-warning text-warning-foreground`       | `bg-danger text-danger-foreground`        | `bg-info text-info-foreground`          |
| Soft background    | `bg-success/10 text-success`               | `bg-warning/10 text-warning`               | `bg-danger/10 text-danger`                | `bg-info/10 text-info`                  |
| Text only          | `text-success`                             | `text-warning`                             | `text-danger`                             | `text-info`                             |
| Border             | `border border-success/40`                 | `border border-warning/40`                 | `border border-danger/40`                 | `border border-info/40`                 |
| Focus ring         | `focus-visible:ring-success`               | `focus-visible:ring-warning`               | `focus-visible:ring-danger`               | `focus-visible:ring-info`               |
| Icon fill (stars)  | `fill-warning text-warning`                | —                                          | —                                         | —                                       |

Prefer the soft-background pattern (`bg-<token>/10 text-<token>`) for
badges and inline pills — it stays legible in both themes without needing
a separate `dark:` override.

## Component recipes

```tsx
// Badge — pending state
<Badge className="bg-warning/10 text-warning border border-warning/30">
  Pending
</Badge>

// Banner — payout error
<Alert className="bg-danger/10 text-danger border-danger/30">
  Payout failed. Update your bank details to retry.
</Alert>

// Inline confirmation text
<p className="text-sm text-success">Profile verified</p>

// Star icon (rating)
<Star className="h-4 w-4 fill-warning text-warning" />
```

## What NOT to do

```tsx
// ❌ Raw palette — flagged by the token-drift ESLint rule
<Badge className="bg-green-500 text-white">Paid</Badge>
<Star className="fill-yellow-400 text-yellow-400" />
<Alert className="bg-red-50 text-red-700 border-red-200">Error</Alert>

// ❌ Hardcoded hex — bypasses theming entirely
<div style={{ background: "#22c55e" }} />

// ❌ `bg-white` / `bg-black` — use `bg-background` / `bg-foreground` instead
<div className="bg-white text-black" />
```

## Related

- `src/index.css` — token definitions for both themes
- `tailwind.config.ts` — utility surface mapping
- `tests/visual/darkMode.spec.ts` — screenshot regression for these tokens
- `src/test/darkModeTokens.test.ts` — unit regression for token presence
