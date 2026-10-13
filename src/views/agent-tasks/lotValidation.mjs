export function lotValidationError (p, currency = 'HKD') {
  if (!Number.isFinite(p.reference_price) || p.reference_price <= 0) return 'REFERENCE_PRICE_REQUIRED: enter a positive reference price / 请填写参考价格'
  const cost = p.lot_size * p.reference_price
  const spendable = p.budget * (1 - p.cash_reserve_pct / 100)
  for (const key of ['per_order_cap', 'daily_buy_cap', 'max_position']) {
    if (p[key] < cost) return `CAP_BELOW_ONE_LOT: ${key} must cover one lot (${cost} ${currency}) / 上限不足一手`
    if (p[key] > spendable) return `CAP_UNREACHABLE: ${key} exceeds budget after reserve (${spendable} ${currency}) / 储备后预算不足`
  }
  return ''
}
