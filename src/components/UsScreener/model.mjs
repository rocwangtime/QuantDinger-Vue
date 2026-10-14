export const isDarkTheme = theme => ['dark', 'realdark'].includes(theme)
export const splitSymbols = run => {
  const symbols = (run && run.symbols) || []
  return { included: symbols.filter(r => r.included).sort((a, b) => a.rank - b.rank), excluded: symbols.filter(r => !r.included) }
}
export const formatMetric = (key, value) => {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—'
  return `${(Number(value) * (['momentum20', 'momentum60', 'volatility20'].includes(key) ? 100 : 1)).toFixed(3)}${['momentum20', 'momentum60', 'volatility20', 'atr14_pct', 'distance_ma50'].includes(key) ? '%' : ''}`
}
