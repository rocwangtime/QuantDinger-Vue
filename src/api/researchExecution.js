import request from '@/utils/request'

const encoded = value => encodeURIComponent(String(value))
export const replayEvolution = id => request({ url: `/api/strategy-evolution/jobs/${encoded(id)}/replay`, method: 'post' })
export const submitShadowEvaluation = (id, data) => request({ url: `/api/strategies/${encoded(id)}/ai-evaluation`, method: 'post', data })
export const getShadowEvaluation = id => request({ url: `/api/strategies/ai-evaluation/jobs/${encoded(id)}`, method: 'get' })
export const cancelShadowEvaluation = id => request({ url: `/api/strategies/ai-evaluation/jobs/${encoded(id)}/cancel`, method: 'post' })
export const analyzePortfolioRisk = data => request({ url: '/api/portfolio/risk-analysis', method: 'post', data })
export const createOrderGroup = (data, key) => request({ url: '/api/portfolio/order-groups', method: 'post', data, headers: { 'Idempotency-Key': key } })
export const getOrderGroup = id => request({ url: `/api/portfolio/order-groups/${encoded(id)}`, method: 'get' })
export const cancelOrderGroup = id => request({ url: `/api/portfolio/order-groups/${encoded(id)}/cancel`, method: 'post' })
export const unwindOrderGroup = (id, referencePrices) => request({ url: `/api/portfolio/order-groups/${encoded(id)}/unwind`, method: 'post', data: { referencePrices } })
export const resolveOrderGroup = (id, reason) => request({ url: `/api/portfolio/order-groups/${encoded(id)}/resolve`, method: 'post', data: { reason } })
