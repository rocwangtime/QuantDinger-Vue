import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import test from 'node:test'
import { activeJob, paperDefaults, formatNumber, pendingStorageKey, validatePending, scanRows, paperSummary, mergeJob } from '../../src/utils/polymarket.js'

const load = bindings => {
  const source = readFileSync(new URL('../../src/views/polymarket/index.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  return new Function(...Object.keys(bindings), script)(...Object.values(bindings))
}
function instance (component, values = {}) {
  const vm = { ...component.data(), $t: key => key, $te: () => false, $store: { state: { app: {}, user: { info: { id: 7 } } } }, ...values }
  for (const [key, fn] of Object.entries(component.methods)) vm[key] = fn.bind(vm)
  for (const [key, fn] of Object.entries(component.computed)) Object.defineProperty(vm, key, { get: () => fn.call(vm) })
  vm.schedulePoll = () => {}
  return vm
}
const helpers = { activeJob, paperDefaults, formatNumber, pendingStorageKey, validatePending, scanRows, paperSummary, mergeJob }
const api = { getPolymarketJob: () => {}, cancelPolymarketJob: () => {}, getPolymarketEvidence: () => {}, listPolymarketJobs: async () => ({ data: [] }) }

test('closed P&L excludes exposed runs and replay duplicates', () => {
  const row = (id, result, kind = 'polymarket_paper') => ({ job_id: id, kind, status: 'succeeded', result })
  const summary = paperSummary([
    row('closed', { status: 'merged', realizedPnl: '1.2', residuals: [] }),
    row('loss', { status: 'unwound', realizedPnl: '-0.5', residuals: [] }),
    row('exposed', { status: 'needs_review', realizedPnl: '100', residuals: [{ quantity: 1 }] }),
    row('replay', { status: 'merged', realizedPnl: '1.2', residuals: [] }, 'polymarket_replay')
  ])
  assert.equal(summary.closedPnl, 0.7)
  assert.equal(summary.observed, 3)
  assert.equal(summary.residual, 1)
  assert.equal(formatNumber(null), '—')
  assert.equal(formatNumber('NaN'), '—')
  assert.equal(formatNumber('0'), '0')
})

test('terminal responses cannot regress and evidence quotes survive polling phases', () => {
  const terminal = { job_id: 'id', status: 'succeeded', result: { rows: [{ marketId: '42' }] } }
  assert.equal(mergeJob(terminal, { job_id: 'id', status: 'running' }), terminal)
  assert.equal(scanRows(terminal).length, 1)
  assert.notEqual(pendingStorageKey(7), pendingStorageKey(8))
  assert.equal(validatePending({ kind: 'live', key: 'secret', payload: {} }), null)
})

test('unknown submit outcome restores the exact key and payload after reopening', async () => {
  const saved = new Map(); const attempts = []
  const component = load({ ...helpers, ...api,
    submitPolymarketJob: async pending => { attempts.push(JSON.parse(JSON.stringify(pending))); throw new Error('lost response') },
    window: { crypto: webcrypto },
    sessionStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  })
  const first = instance(component)
  await first.submit('paper', { scanJobId: 'a'.repeat(32), marketId: '42', settings: paperDefaults() })
  assert.equal(attempts.length, 1)
  const reopened = instance(component)
  reopened.reset()
  reopened.settings.quantity = 900 // retry must retain the frozen submitted parameters
  await reopened.retryPending()
  assert.deepEqual(attempts[1], attempts[0])
})

test('late history does not replace a newly submitted scan', async () => {
  let finishScans; let finishPapers
  const component = load({ ...helpers, ...api,
    listPolymarketJobs: kind => new Promise(resolve => { if (kind === 'polymarket_scan') finishScans = resolve; else finishPapers = resolve })
  })
  const vm = instance(component)
  const loading = vm.loadHistory()
  vm.revision++
  vm.scanJob = { job_id: 'new', status: 'queued' }
  finishScans({ data: [{ job_id: 'old', status: 'succeeded' }] })
  finishPapers({ data: [] })
  await loading
  assert.equal(vm.scanJob.job_id, 'new')
})

test('owner changes reject late polling data from the previous session', async () => {
  let finish
  const component = load({ ...helpers, ...api,
    getPolymarketJob: () => new Promise(resolve => { finish = resolve }),
    sessionStorage: { getItem: () => null }
  })
  const vm = instance(component, { scanJob: { job_id: 'other-owner', status: 'running' } })
  const polling = vm.poll()
  vm.reset()
  finish({ data: { job_id: 'other-owner', status: 'succeeded', result: { private: true } } })
  await polling
  assert.equal(vm.scanJob, null)
})

test('saved simulation can only be retried once at a time', async () => {
  let finish; let count = 0
  const component = load({ ...helpers, ...api,
    submitPolymarketJob: () => { count++; return new Promise(resolve => { finish = resolve }) },
    sessionStorage: { removeItem: () => {} }
  })
  const vm = instance(component, { pending: { kind: 'paper', key: 'k', payload: {} } })
  const first = vm.retryPending()
  await vm.retryPending()
  assert.equal(count, 1)
  finish({ data: { job_id: 'saved', status: 'queued' } })
  await first
  assert.equal(vm.pending, null)
  assert.equal(vm.selectedRun.job_id, 'saved')
})
