import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'

function authHeaders () {
  const token = storage.get(ACCESS_TOKEN) || ''
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
    [ACCESS_TOKEN]: token,
    token
  }
}

export async function cancelStrategyWorkspaceTurn (requestId) {
  if (!requestId) return
  await fetch('/api/ai/chat/message/cancel', {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ request_id: requestId })
  }).catch(() => {})
}

export async function streamStrategyWorkspaceTurn (payload, { signal, onDelta, onProgress, onRequestId } = {}) {
  const requestId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : ''
  if (!requestId) throw new Error('Browser UUID support is required for cancellable generation')
  if (onRequestId) onRequestId(requestId)
  const response = await fetch('/api/strategies/ai-workspace/turn/stream', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, request_id: requestId })
  })
  if (!response.ok || !response.body) throw new Error(`Strategy workspace stream API ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let finished = null
  try {
    while (!finished) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ''
      for (const rawEvent of events) {
        const lines = rawEvent.split(/\r?\n/)
        const name = (lines.find(line => line.startsWith('event:')) || '').replace(/^event:\s*/, '').trim()
        const data = lines.filter(line => line.startsWith('data:')).map(line => line.replace(/^data:\s*/, '')).join('\n')
        if (!data) continue
        const event = JSON.parse(data)
        if (name === 'delta' && onDelta) onDelta(event.text || '', event.phase || 'generation')
        if (name === 'progress' && onProgress) onProgress(event.phase || 'generation')
        if (name === 'done') { finished = event.data || {}; break }
        if (name === 'cancelled') {
          const error = new Error('Generation cancelled')
          error.name = 'AbortError'
          throw error
        }
        if (name === 'error') throw new Error(event.msg || 'Strategy generation failed')
      }
    }
  } finally {
    try { await reader.cancel() } catch (_) {}
  }
  if (signal && signal.aborted) {
    const error = new Error('Generation cancelled')
    error.name = 'AbortError'
    throw error
  }
  if (!finished || !finished.reply_type) throw new Error('Strategy workspace stream ended without a result')
  return finished
}
