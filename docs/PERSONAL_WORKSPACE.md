# Personal workspace UI

`src/config/workspace.mjs` enables personal mode for this deployment. It migrates saved top navigation preferences to a fixed sidebar, preserving theme and workspace tabs. All permitted tools remain accessible; short screens scroll the menu instead of hiding routes in a horizontal overflow menu.

Personal mode hides the billing menu, header credits / top-up controls, and profile credits, VIP and referral cards / tabs. Legacy profile links to commercial tabs fall back to basic settings. Header billing polling is disabled. Account authentication, security, notifications and agent tokens remain available. Backend billing policies are unchanged.

The Polymarket lab displays its execution mode, absence of a trading wallet, and per-run virtual pUSD budget. An expandable guide explains complete-set arbitrage, modeled costs, scanning, delayed execution, compensation and replay. This is public-data paper execution: no wallet balance, signing key, live order, deposit, or on-chain merge is integrated.

Collateral references (checked 2026-10-07):
- https://docs.polymarket.com/concepts/pusd
- https://docs.polymarket.com/trading/positions/manage

Validation: `pnpm test:unit`, targeted ESLint, `pnpm build`, and desktop / mobile layout checks using a disposable local account.
