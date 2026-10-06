export function objectValue (value) {
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch (error) { return {} }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

export function entryPolicy (row) {
  let checks = row.checks_json || []
  if (typeof checks === 'string') {
    try { checks = JSON.parse(checks) } catch (error) { checks = [] }
  }
  return Array.isArray(checks) ? [...checks].reverse().find(check => check && check.name === 'entry_policy') || {} : {}
}

export function decisionPresentation (row) {
  const policy = entryPolicy(row)
  if (policy.mode === 'shadow' || String(row.decision || '').startsWith('shadow_')) {
    const valid = policy.valid_decision === true
    return { color: valid ? 'blue' : 'orange', label: valid ? (policy.raw_allowed ? 'shadowPass' : 'shadowReject') : 'shadowUnavailable', execution: 'shadowContinues' }
  }
  if (row.allowed === false || ['reject', 'unavailable_rejected', 'audit_unavailable_rejected'].includes(row.decision)) {
    return { color: 'red', label: 'entryRejected', execution: 'entryBlocked' }
  }
  return null
}

export function researchDeployment (options) {
  const aiDecisionMode = ['advisory', 'shadow', 'required'].includes(options.aiDecisionMode) ? options.aiDecisionMode : 'advisory'
  let portfolioRisk = {}
  if (options.riskEnabled) {
    const model = objectValue(options.riskModel)
    const maximum = Number(options.maximumVolatility) / 100
    const age = Number(options.maximumAge)
    if (!Array.isArray(model.symbols) || !model.symbols.length || !Array.isArray(model.covariance) ||
      !model.as_of || model.period !== 'daily' || !Number.isFinite(maximum) || maximum <= 0 || !Number.isFinite(age) || age <= 0) {
      throw new Error('researchExecution.invalidRiskModel')
    }
    portfolioRisk = { portfolio_model: model, max_portfolio_daily_volatility: maximum, portfolio_model_max_age_hours: age }
  }
  return { aiDecisionMode, researchEvidenceJobId: String(options.researchEvidenceJobId || '').trim(), portfolioRisk }
}

export const percentage = value => value == null || !Number.isFinite(Number(value)) ? '—' : `${(Number(value) * 100).toFixed(2)}%`
export const busyJob = job => Boolean(job && ['queued', 'running'].includes(job.status))

export function groupStorageKey (userId, strategyId) {
  return `qd-order-group:${userId}:${strategyId}`
}

export function parseReturnFile (text) {
  const data = objectValue(JSON.parse(text))
  const returns = objectValue(data.returns || data)
  const symbols = Object.keys(returns)
  if (!symbols.length || symbols.length > 100 || symbols.some(key => !Object.keys(objectValue(returns[key])).length)) {
    throw new Error('researchExecution.invalidReturnFile')
  }
  return { returns, weights: Object.fromEntries(symbols.map(key => [key, Number((data.weights || {})[key] || 0)])) }
}
