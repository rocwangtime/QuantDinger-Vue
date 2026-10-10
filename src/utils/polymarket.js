export const activeJob = job => Boolean(job && ['queued', 'running'].includes(job.status))
export const paperDefaults = () => ({
  quantity: 100,
  budget: 200,
  minNetEdgeBps: 20,
  slippageBps: 10,
  settlementCost: 0.02,
  riskReserve: 0.05,
  latencyMs: 150,
  legDelayMs: 250,
  maxBookAgeMs: 5000,
  maxUnhedgedMs: 10000,
  maxUnwindLoss: 5,
  orderType: 'FOK'
})
export const formatNumber = (value, digits = 4) => {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  return Number.isFinite(number) ? number.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits }) : '—'
}
export const pendingStorageKey = owner => `qd-polymarket-pending:${owner}`
export function validatePending (value) {
  if (!value || !['scan', 'paper', 'replay'].includes(value.kind) || typeof value.key !== 'string' || !value.key || !value.payload || typeof value.payload !== 'object') return null
  if (value.kind === 'replay' && !/^[a-f0-9]{32}$/.test(value.sourceJobId || '')) return null
  return value
}
export function scanRows (job) {
  if (!job) return []
  return (job.result && job.result.rows) || (job.progress && job.progress.rows) || []
}
export function mergeJob (current, incoming) {
  if (!current || current.job_id !== incoming.job_id) return incoming
  if (!activeJob(current) && activeJob(incoming)) return current
  return incoming
}
export function paperSummary (jobs) {
  const completed = jobs.filter(job => job.kind === 'polymarket_paper' && job.status === 'succeeded' && job.result)
  const closed = completed.filter(job => !(job.result.residuals || []).length)
  return {
    observed: completed.length,
    closed: closed.length,
    residual: completed.length - closed.length,
    merged: completed.filter(job => ['merged', 'partial_merged'].includes(job.result.status)).length,
    // Exposed and replayed experiments must not inflate closed-run profit.
    closedPnl: closed.reduce((total, job) => total + Number(job.result.realizedPnl || 0), 0)
  }
}
