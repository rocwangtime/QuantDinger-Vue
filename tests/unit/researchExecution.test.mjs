import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import test from 'node:test'
import { decisionPresentation, researchDeployment, parseReturnFile, percentage, objectValue, groupStorageKey, busyJob } from '../../src/utils/researchExecution.js'

const loadComponent = (name, bindings) => {
  const source = readFileSync(new URL(`../../src/views/strategy-center/components/${name}.vue`, import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  return new Function(...Object.keys(bindings), script)(...Object.values(bindings))
}

function instance (component, values = {}) {
  const vm = { ...component.data(), $t: key => key, $te: () => false, ...values }
  for (const [key, fn] of Object.entries(component.methods)) vm[key] = fn.bind(vm)
  for (const [key, fn] of Object.entries(component.computed || {})) Object.defineProperty(vm, key, { get: () => fn.call(vm) })
  return vm
}

test('shadow rejects remain suggestions while required failures are visibly blocked', () => {
  const checks = [{ name: 'entry_policy', mode: 'shadow', valid_decision: true, raw_allowed: false }]
  assert.equal(decisionPresentation({ allowed: true, decision: 'shadow_reject', checks_json: JSON.stringify(checks) }).label, 'shadowReject')
  assert.equal(decisionPresentation({ allowed: true, decision: 'shadow_unavailable' }).execution, 'shadowContinues')
  assert.equal(decisionPresentation({ allowed: false, provider: 'none', decision: 'audit_unavailable_rejected' }).execution, 'entryBlocked')
  assert.equal(decisionPresentation({ allowed: true, decision: 'pass' }), null)
  assert.equal(percentage(null), '—')
  assert.equal(percentage(0), '0.00%')
})

test('deployment preserves evidence and converts percent limits only when enabled', () => {
  const model = { symbols: ['BTC/USDT'], covariance: [[.0004]], as_of: '2026-10-06', period: 'daily' }
  const config = researchDeployment({ aiDecisionMode: 'required', researchEvidenceJobId: ' job ', riskEnabled: true, riskModel: model, maximumVolatility: 3, maximumAge: 96 })
  assert.equal(config.researchEvidenceJobId, 'job')
  assert.equal(config.aiDecisionMode, 'required')
  assert.equal(config.portfolioRisk.max_portfolio_daily_volatility, .03)
  assert.deepEqual(researchDeployment({ riskEnabled: false, riskModel: 'invalid' }).portfolioRisk, {})
  assert.throws(() => researchDeployment({ riskEnabled: true, riskModel: model, maximumVolatility: Infinity, maximumAge: 96 }))
})

test('dated return import preserves signed weights and rejects empty panels', () => {
  const panel = parseReturnFile(JSON.stringify({ returns: { 'BTC/USDT': { '2026-10-01': .01 } }, weights: { 'BTC/USDT': -.5 } }))
  assert.equal(panel.weights['BTC/USDT'], -.5)
  assert.throws(() => parseReturnFile('{}'))
  assert.throws(() => parseReturnFile('{"BTC/USDT":42}'))
  assert.notEqual(groupStorageKey(1, 42), groupStorageKey(2, 42))
})

test('unknown group submission restores the same payload and idempotency key after reopening', async () => {
  const saved = new Map(); const attempts = []
  const component = loadComponent('VirtualOrderGroups', {
    createOrderGroup: async (payload, key) => { attempts.push({ payload, key }); throw new Error('lost response') },
    getOrderGroup: () => assert.fail('no confirmed group ID to fetch'), cancelOrderGroup: () => {}, unwindOrderGroup: () => {}, resolveOrderGroup: () => {},
    objectValue, groupStorageKey, window: { crypto: webcrypto },
    sessionStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) }
  })
  const props = { strategy: { id: 42, status: 'stopped', execution_mode: 'signal', market_type: 'swap' }, $store: { state: { user: { info: { id: 1 } } } } }
  const first = instance(component, props)
  first.initialize()
  first.legs = [{ symbol: 'BTC/USDT', action: 'open_long', quantity: 1, referencePrice: 100 }, { symbol: 'ETH/USDT', action: 'open_short', quantity: 2, referencePrice: 50 }]
  await first.create()
  const reopened = instance(component, props)
  reopened.initialize()
  await reopened.create()
  assert.equal(attempts[0].key, attempts[1].key)
  assert.deepEqual(attempts[0].payload, attempts[1].payload)
  reopened.budget = 600
  await reopened.create()
  assert.notEqual(attempts[1].key, attempts[2].key)
})

test('late group response cannot replace another selected strategy or trigger follow-up orders', async () => {
  let finish
  const component = loadComponent('VirtualOrderGroups', {
    createOrderGroup: () => {}, getOrderGroup: () => new Promise(resolve => { finish = resolve }),
    cancelOrderGroup: () => {}, unwindOrderGroup: () => {}, resolveOrderGroup: () => {}, objectValue, groupStorageKey,
    window: { crypto: webcrypto }, sessionStorage: { getItem: () => null, setItem: () => {} }
  })
  const vm = instance(component, { strategy: { id: 42, execution_mode: 'signal', status: 'stopped' }, $store: { state: { user: { info: { id: 1 } } } } })
  const request = vm.refresh('old')
  vm.strategy = { id: 43, execution_mode: 'signal', status: 'stopped' }
  vm.initialize()
  finish({ data: { group_id: 'old', config: { strategyId: 42 }, state: { status: 'executing' } } })
  await request
  assert.equal(vm.group, null)
  assert.equal(vm.timer, null)
})

test('older shadow polling response cannot overwrite a completed report', async () => {
  const finishes = []
  const component = loadComponent('ShadowEvaluation', {
    submitShadowEvaluation: () => {}, cancelShadowEvaluation: () => {},
    getShadowEvaluation: () => new Promise(resolve => finishes.push(resolve)), busyJob, percentage
  })
  const vm = instance(component, { strategyId: 42, job: { jobId: 'report', status: 'queued' } })
  const older = vm.poll(); const newer = vm.poll()
  finishes[1]({ data: { jobId: 'report', status: 'succeeded', result: { observed: 5 } } })
  await newer
  finishes[0]({ data: { jobId: 'report', status: 'running' } })
  await older
  assert.equal(vm.job.status, 'succeeded')
  assert.equal(vm.report.observed, 5)
  assert.equal(vm.timer, null)
})
