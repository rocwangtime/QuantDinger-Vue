import request from '@/utils/request'
const dataOf = response => {
  if (!response || response.code !== 1) throw new Error('screener_unavailable')
  return response.data
}
export const latestScreener = () => request({ url: '/api/us-screener/latest' }).then(dataOf)
