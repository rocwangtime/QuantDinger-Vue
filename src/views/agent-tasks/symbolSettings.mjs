export function marketCurrency (market) {
  return market === 'USStock' ? 'USD' : 'HKD'
}

export function visibleSymbolParams (params, market) {
  return Object.fromEntries(Object.entries(params).filter(([key]) =>
    market !== 'USStock' || !['blackout_lunch', 'blackout_auction'].includes(key)))
}
