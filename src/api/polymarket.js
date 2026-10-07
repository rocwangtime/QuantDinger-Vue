import request from '@/utils/request'

const path = id => `/api/polymarket/jobs/${encodeURIComponent(id)}`
export const listPolymarketJobs = kind => request({ url: '/api/polymarket/jobs', method: 'get', params: { kind, limit: 20 } })
export const getPolymarketJob = id => request({ url: path(id), method: 'get' })
export const cancelPolymarketJob = id => request({ url: `${path(id)}/cancel`, method: 'post' })
export const getPolymarketEvidence = id => request({ url: `${path(id)}/evidence`, method: 'get' })
export const submitPolymarketJob = pending => request({
  url: pending.kind === 'scan' ? '/api/polymarket/scans' : pending.kind === 'paper' ? '/api/polymarket/paper-runs' : `${path(pending.sourceJobId)}/replay`,
  method: 'post',
  data: pending.payload,
  headers: { 'Idempotency-Key': pending.key }
})
