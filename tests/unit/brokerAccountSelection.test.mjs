import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function options (file, mocks = {}) {
  let script = fs.readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1]
  const scope = { ...mocks, console, setTimeout, clearTimeout }
  script = script.replace(/^import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]\s*$/gm, (_, names) => {
    for (const item of names.replace(/[{}]/g, '').split(',')) {
      const name = item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name] = () => ({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default', 'result ='), scope)
  return scope.result
}

function page (broker) {
  const component = options('views/broker-accounts/index.vue', { broker })
  const state = { ...component.data(), $set: (object, key, value) => { object[key] = value } }
  for (const [name, method] of Object.entries(component.methods)) state[name] = method.bind(state)
  state.isBrokerBlocked = () => false
  return state
}

test('account status requests carry the selected credential and ignore late responses', async () => {
  const calls = []
  let resolveFirst
  const state = page({ alpaca: {
    accounts: async () => ({ data: [{ id: 11 }, { id: 22 }] }),
    status: params => {
      calls.push(params.credential_id)
      if (params.credential_id === 11) return new Promise(resolve => { resolveFirst = resolve })
      return Promise.resolve({ data: { connected: true, account_id: 'account-B' } })
    }
  } })
  state.alpacaCredentialId = 11
  const first = state.loadOne('alpaca')
  await new Promise(resolve => setImmediate(resolve))
  state.alpacaCredentialId = 22
  await state.loadOne('alpaca')
  resolveFirst({ data: { connected: true, account_id: 'account-A' } })
  await first
  assert.deepEqual(calls, [11, 22])
  assert.equal(state.connectionMap.alpaca.accountId, 'account-B')
})

test('quick trade balance uses selected credential and discards stale account data', async () => {
  let finish
  const calls = []
  const component = options('components/QuickTradePanel/QuickTradePanel.vue', { broker: { alpaca: {
    account: params => {
      calls.push(params.credential_id)
      return new Promise(resolve => { finish = resolve })
    }
  } } })
  const state = { selectedCredentialId: 11, isStockMarket: true, balance: { total: 0 }, apiPayload: res => res.data }
  const pending = component.methods.loadBalance.call(state)
  state.selectedCredentialId = 22
  finish({ data: { equity: 10000, buying_power: 20000 } })
  await pending
  assert.deepEqual(calls, [11])
  assert.equal(state.balance.total, 0)
})

test('account overview shows true zero and unknown counts separately', () => {
  const component = options('views/broker-accounts/components/BrokerAccountCard.vue')
  const metrics = info => component.computed.metrics.call({ info, brokerId: 'alpaca', $t: key => key })
  assert.equal(metrics({ position_count: 0 }).find(item => item.key === 'positions').value, '0')
  assert.equal(metrics({ position_count: null }).find(item => item.key === 'positions').value, '--')
  assert.equal(metrics({ recent_filled_order_count: 0 }).find(item => item.key === 'fills').value, '0')
})

test('US paper account displays USD when OpenD currency is N/A', () => {
  const component = options('views/broker-accounts/components/BrokerAccountCard.vue')
  const metrics = component.computed.metrics.call({
    info: { summary: { currency: 'N/A', total_assets: 1000, cash: 500, power: 750 }, account: 12345 },
    brokerId: 'futu',
    $t: key => key
  })
  assert.equal(metrics.find(item => item.key === 'assets').value, '$1,000.00')
  assert.equal(metrics.find(item => item.key === 'cash').value, '$500.00')
  assert.equal(metrics.find(item => item.key === 'power').value, '$750.00')
})

test('Futu connection requires typing the exact probed account ID', () => {
  const component = options('views/broker-accounts/components/forms/FutuConnectForm.vue')
  const state = { accountId: 12345, confirmedAccountId: '1234' }
  assert.equal(component.computed.accountConfirmed.call(state), false)
  state.confirmedAccountId = '12345'
  assert.equal(component.computed.accountConfirmed.call(state), true)
  component.methods.onAccountChange.call(state)
  assert.equal(state.confirmedAccountId, '')
})

test('Futu HK connect confirms one selected paper account without a separate save action', () => {
  const file = 'views/broker-accounts/components/forms/FutuConnectForm.vue'
  const source = fs.readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8')
  const component = options(file)
  const emitted = []
  const state = {
    ...component.data(), tradeMarket: 'HK', accountId: 12345,
    confirmedAccountId: '12345', accountConfirmed: true,
    $emit: (...args) => emitted.push(args)
  }
  state.payload = component.methods.payload.bind(state)
  component.methods.submit.call(state)
  assert.equal(emitted[0][1].trade_market, 'HK')
  assert.equal(emitted[0][1].market_category, 'HKStock')
  assert.equal(emitted[0][1].confirm_acc_id, '12345')
  assert.equal(source.includes('futuPaper.saveCredential'), false)
})

test('Futu automation remains separate from a connected diagnostic session', () => {
  const source = fs.readFileSync(new URL('../../src/views/broker-accounts/components/FutuAutomationControls.vue', import.meta.url), 'utf8')
  const component = options('views/broker-accounts/components/FutuAutomationControls.vue')
  const state = {
    status: { connected: true, accountId: 12345, raw: { automation: [], automation_hard_switch: true } }
  }
  for (const [name, getter] of Object.entries(component.computed)) {
    Object.defineProperty(state, name, { get: () => getter.call(state) })
  }
  assert.equal(state.connected, true)
  assert.equal(state.state, 'paused')
  assert.equal(state.accountId, 12345)
  assert.match(source, /connected && raw\.credential_id/)
  state.status.raw.automation = [{ acc_id: 12345, state: 'unconfirmed', enabled: false }]
  assert.equal(state.state, 'unconfirmed')
})

test('Agent policy follows the selected HK or US Futu credential market', async () => {
  const component = options('views/agent-tokens/AgentTradeIntents.vue')
  const warnings = []
  const state = {
    selectedAccount: 'futu:7',
    futuCredentials: [{ id: 7, api_key_hint: 'host:11112 (demo/HK)' }],
    enableText: 'PAPER_AUTO',
    $t: key => key,
    $message: { warning: message => warnings.push(message) }
  }
  for (const [name, getter] of Object.entries(component.computed)) {
    Object.defineProperty(state, name, { get: () => getter.call(state) })
  }
  assert.equal(state.selectedMarketCategory, 'HKStock')
  assert.equal(state.quoteCurrency, 'HKD')
  state.futuCredentials[0].api_key_hint = 'host:11112 (demo/US)'
  assert.equal(state.selectedMarketCategory, 'USStock')
  assert.equal(state.quoteCurrency, 'USD')
  state.futuCredentials[0].api_key_hint = 'unknown'
  assert.equal(state.selectedMarketCategory, '')
  await component.methods.changeMode.call(state, 'PAPER_AUTO')
  assert.deepEqual(warnings, ['agentTrade.marketUnknown'])
})
