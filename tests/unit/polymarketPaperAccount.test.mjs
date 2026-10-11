import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { formatNumber } from '../../src/utils/polymarket.js'

function load (bindings) {
  const source = readFileSync(new URL('../../src/views/polymarket/components/PaperAccount.vue', import.meta.url), 'utf8')
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*$/gm, '').replace('export default', 'return')
  // Evaluate the imported SFC script with isolated API bindings.
  // eslint-disable-next-line no-new-func
  return new Function(...Object.keys(bindings), script)(...Object.values(bindings))
}
function instance (component) {
  const vm = { ...component.data(), $t: key => key }
  for (const [key, fn] of Object.entries(component.methods)) vm[key] = fn.bind(vm)
  return vm
}

test('paper account applies server pagination and risk filters, reports UTC days', async () => {
  let query
  const component = load({
 formatNumber,
    getPaperAccountStatus: async () => ({ data: { equity: '5000', enabled: false } }),
    getPaperAccountReport: async params => ({ data: [{ day: '2026-10-11', days: params.days }] }),
    getPaperAccountTrades: async params => { query = params; return { data: { items: [{ id: 'trade' }], total: 99 } } }
  })
  const vm = instance(component)
  vm.page = 3; vm.tradeStatus = 'not_filled'; vm.marketType = 'up_down'
  await vm.refresh()
  assert.deepEqual(query, { limit: 20, offset: 40, status: 'not_filled', market_type: 'up_down' })
  assert.equal(vm.total, 99); assert.equal(vm.status.equity, '5000'); assert.equal(vm.reports[0].day, '2026-10-11')
})

test('drilldown replay uses the selected attempt and shows a deterministic match', async () => {
  const component = load({
 formatNumber,
    getPaperAccountTrade: async id => ({ data: { id, status: 'single_leg_residual' } }),
    replayPaperAccountTrade: async id => ({ data: { replayMatches: id === 'selected' } })
  })
  const vm = instance(component)
  await vm.inspect('selected'); await vm.replay()
  assert.equal(vm.replayResult.replayMatches, true); assert.equal(vm.replaying, false)
})

test('failed account refresh keeps existing balances and makes failure visible', async () => {
  const fail = async () => { throw new Error('unavailable') }
  const component = load({ formatNumber, getPaperAccountStatus: fail, getPaperAccountReport: fail, getPaperAccountTrades: fail })
  const vm = instance(component); vm.status = { equity: '4999' }
  await vm.refresh()
  assert.equal(vm.status.equity, '4999'); assert.equal(vm.error, 'polymarket.apiError'); assert.equal(vm.loading, false)
})
