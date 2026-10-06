# Research and execution controls

These desktop controls use the matching P0/P1 backend contracts in the separate
`rocwangtime/QuantDinger` repository. Updating this frontend alone does not apply
database migrations, deploy workers, or authorize broker orders.

- Backtest Center → Strategy Evolution: inspect research qualification, missing
  checks, cumulative attempts and holdout reuse. Frozen replay creates a new
  study and cannot restore holdout independence. The report displays the evidence
  job ID for optional deployment binding.
- Strategy deployment/editor: select shadow, advisory or required AI policy
  when AI filtering is enabled; bind an evidence job; import a covariance model
  and opt into entry volatility limits. Existing settings survive an edit.
- Strategy details → AI decisions: generate, refresh and cancel a fixed-horizon
  shadow comparison. Missing data stays missing. Suggested opportunity returns
  are not portfolio returns or actual execution gains.
- Strategy details → Portfolio risk: import daily returns, edit signed capital
  weights, calculate aligned covariance/tail/stress risk, and download the model
  for import into deployment. At least 30 common daily observations are needed.
- Stopped virtual strategy details → Virtual multi-leg execution: queue 2–8
  legs at explicit marks, inspect fills and residual exposure, cancel, unwind at
  supplied marks or acknowledge a verified flat account. The backend validates
  strategy isolation and reservation. Group IDs and unknown-response request
  keys are retained in browser session storage per user/strategy; retrying an
  unchanged unknown submission reuses its idempotency key. An ID can also be
  entered manually for server-side recovery.

Return-file format (the example is abbreviated and needs more observations):

```json
{
  "returns": {
    "BTC/USDT": {"2026-10-01": 0.01, "2026-10-02": -0.02},
    "ETH/USDT": {"2026-10-01": 0.02, "2026-10-02": -0.03}
  },
  "weights": {"BTC/USDT": 0.5, "ETH/USDT": -0.5}
}
```

Keep asset identifiers canonical and use one valuation currency. Import the
downloaded model, rather than the return panel, into deployment controls.
Volatility inputs use percentages: entering `3` means a daily limit of `0.03`.
The backend rejects invalid/stale models and mixed or unknown account currencies.
Exits and recovery of known broker orders bypass new entry admission.

New copy supports Chinese and English; other languages use the English fallback.
Unit checks cover rejection presentation, percentage conversion, signed weights,
unknown-response recovery, strategy-switch races and stale report polling.
Production builds and the existing frontend unit suite also validate integration.
