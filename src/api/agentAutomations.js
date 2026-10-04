import request from '@/utils/request'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'

const base = '/api/agent-automations'
export const listAutomations = () => request({ url: base, method: 'get' })
export const createAutomation = data => request({ url: base, method: 'post', data })
export const editAutomation = (id, data) => request({ url: `${base}/${id}`, method: 'put', data })
export const setAutomationState = (id, active) => request({ url: `${base}/${id}/state`, method: 'post', data: { active } })
export const previewAutomation = id => request({ url: `${base}/${id}/preview`, method: 'post' })
export const automationRuns = id => request({ url: `${base}/${id}/runs`, method: 'get' })
export const automationSnapshot = id => request({ url: `${base}/${id}/snapshot`, method: 'get' })
export const cancelAutomationRun = id => request({ url: `${base}/runs/${id}/cancel`, method: 'post' })

export async function streamAutomationRun (id, signal, onProgress) {
  const token = storage.get(ACCESS_TOKEN) || ''
  const response = await fetch(`${base}/runs/${id}/stream`, {
    signal, headers: { Authorization: `Bearer ${token}`, [ACCESS_TOKEN]: token, token }
  })
  if (!response.ok || !response.body) throw new Error('运行进度连接失败，请刷新运行记录')
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ''
      for (const event of events) {
        if (event.startsWith('event: done')) return
        const line = event.split('\n').find(line => line.startsWith('data: '))
        if (line) onProgress(JSON.parse(line.slice(6)))
      }
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
