import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../../src/api/agentAutomations.js', import.meta.url), 'utf8')
const component = fs.readFileSync(new URL('../../src/views/agent-task-center/AutomationPanel.vue', import.meta.url), 'utf8')
const api = (request, fetch) => new Function('request', 'storage', 'ACCESS_TOKEN', 'fetch',
  source.replace(/^import .*$/gm, '').replace(/export /g, '') + '\nreturn { createAutomation, editAutomation, setAutomationState, previewAutomation, cancelAutomationRun, streamAutomationRun }'
)(request, { get: () => 'test-token' }, 'ACCESS_TOKEN', fetch)

test('task preview, cancellation and state use separate server commands', async () => {
  const calls = []
  const client = api(request => calls.push(request))
  await client.previewAutomation(7)
  await client.cancelAutomationRun(8)
  await client.setAutomationState(7, false)
  await client.editAutomation(7, { name: 'updated' })
  assert.deepEqual(calls.map(c => [c.url, c.method]), [
    ['/api/agent-automations/7/preview', 'post'],
    ['/api/agent-automations/runs/8/cancel', 'post'],
    ['/api/agent-automations/7/state', 'post'],
    ['/api/agent-automations/7', 'put']
  ])
  assert.deepEqual(calls[2].data, { active: false })
})

test('SSE updates render before completion even with split Unicode bytes', async () => {
  const bytes = new TextEncoder().encode('event: progress\ndata: {"id":7,"draft":"正在分析"}\n\nevent: done\ndata: {}\n\n')
  let offset = 0
  let cancelled = false
  let released = false
  const signal = new AbortController().signal
  const reader = {
    read: async () => offset < bytes.length ? { value: bytes.slice(offset, offset += 3), done: false } : { done: true },
    cancel: async () => { cancelled = true },
    releaseLock: () => { released = true }
  }
  const client = api(null, async (_url, options) => {
    assert.equal(options.signal, signal)
    return { ok: true, body: { getReader: () => reader } }
  })
  const progress = []
  await client.streamAutomationRun(7, signal, run => {
    assert.ok(offset < bytes.length)
    progress.push(run)
  })
  assert.deepEqual(progress, [{ id: 7, draft: '正在分析' }])
  assert.ok(cancelled && released)
})

test('templates default to read-only and paused with explicit execution controls', () => {
  assert.match(component, /execution_mode: 'plan_only'/)
  assert.match(component, /manage_existing: false/)
  assert.match(component, /创建并保持暂停/)
  assert.match(component, /cancelAutomationRun\(id\)/)
  assert.match(component, /:disabled="task.active"/)
  assert.match(component, /已提交订单请在账户页处理/)
  assert.match(component, /run.orders/)
})
