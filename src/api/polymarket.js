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
export const getPolymarketEligibility = refresh => request({ url: '/api/polymarket/eligibility', method: 'get', params: refresh ? { refresh: 1 } : {} })
export const getPolymarketObserverStatus = () => request({ url: '/api/polymarket/observer/status', method: 'get' })
export const getPolymarketObserverSummary = (days, filters = {}) => request({ url: '/api/polymarket/observer/summary', method: 'get', params: { days, ...filters } })
export const getPolymarketObserverEpisodes = (days, filters = {}) => request({ url: '/api/polymarket/observer/episodes', method: 'get', params: { days, limit: 50, ...filters } })

const accountPath = '/api/polymarket/paper-account'
export const getPaperAccountStatus = () => request({ url: `${accountPath}/status`, method: 'get' })
export const getPaperAccountTrades = params => request({ url: `${accountPath}/trades`, method: 'get', params })
export const getPaperAccountTrade = id => request({ url: `${accountPath}/trades/${encodeURIComponent(id)}`, method: 'get' })
export const replayPaperAccountTrade = id => request({ url: `${accountPath}/trades/${encodeURIComponent(id)}/replay`, method: 'post' })
export const getPaperAccountReport = params => request({ url: `${accountPath}/daily-report`, method: 'get', params })
export const exportPaperAccountReport = params => request({ url: `${accountPath}/export`, method: 'get', params, responseType: 'blob' })
