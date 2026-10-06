import request from '@/utils/request'

const base = '/api/agent-automations'
const dataOf = response => {
  if (!response || response.code !== 1) throw new Error((response && response.msg) || 'Task request failed')
  return response.data
}

export const listTasks = () => request({ url: base }).then(dataOf)
export const getDashboard = id => request({ url: `${base}/${id}/dashboard` }).then(dataOf)
export const getRun = id => request({ url: `${base}/runs/${id}` }).then(dataOf)
export const saveTask = (id, data) => request({ url: id ? `${base}/${id}` : base, method: id ? 'put' : 'post', data }).then(dataOf)
export const setTaskActive = (id, active) => request({ url: `${base}/${id}/state`, method: 'post', data: { active } }).then(dataOf)
export const previewTask = id => request({ url: `${base}/${id}/preview`, method: 'post' }).then(dataOf)
export const cancelRun = id => request({ url: `${base}/runs/${id}/cancel`, method: 'post' }).then(dataOf)
export const resetTaskRisk = id => request({ url: `${base}/${id}/risk/reset`, method: 'post' }).then(dataOf)
export const getModels = () => request({ url: '/api/ai/agent/models' }).then(dataOf)
