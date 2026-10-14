# US daily research screener

The read-only section on `/#/agent-tasks` reads `/api/us-screener/latest` and
shows the latest run's session date, status, QQQ regime, frozen parameters,
top-ten features/score and excluded symbols/reasons. Refresh only reads data;
it never changes Agent symbols, task activation, or orders. No admin trigger
button is included; the backend provides an admin-only POST and local CLI.

Both `dark` and `realdark` use the shared `isDarkTheme` predicate. Percentage
fractions (momentum, annualized volatility) are converted to percent for display;
ATR and MA distance are already percentage points. Null metrics display `—`.
English/Chinese labels include coverage and failure reasons. A flagged index
seed displays a warning; it must not be mistaken for verified complete index
membership. Unknown earnings remain visible even in included candidates.

Requires the corresponding backend PR and its two migrations; see backend
`docs/research/US_DAILY_SCREENER.md` for provenance, scoring, scheduling, environment
settings and process restart notes. No frontend environment setting is needed;
requests use the existing authenticated same-origin API proxy.

Validation: `pnpm test:unit`, `pnpm lint:nofix`, `pnpm build` with
`COREPACK_HOME=$HOME/.cache/corepack`. Existing build size warnings remain.
No deployment or merge was performed.
