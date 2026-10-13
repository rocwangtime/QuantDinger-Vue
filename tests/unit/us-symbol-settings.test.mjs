import test from 'node:test'
import assert from 'node:assert/strict'
import { marketCurrency, visibleSymbolParams } from '../../src/views/agent-tasks/symbolSettings.mjs'
import { lotValidationError } from '../../src/views/agent-tasks/lotValidation.mjs'
test('US caps report USD and whole share reference cost', () => {
  assert.match(lotValidationError({ reference_price: 250, lot_size: 1, budget: 15000, cash_reserve_pct: 20, per_order_cap: 100 }, 'USD'), /250 USD/)
})
test('US settings expose session controls and hide lunch', () => {
  const params = { blackout_lunch: true, blackout_auction: true, blackout_open_minutes: 5, extended_hours: false }
  assert.deepEqual(visibleSymbolParams(params, 'USStock'), { blackout_open_minutes: 5, extended_hours: false })
  assert.deepEqual(visibleSymbolParams(params, 'HKStock'), params)
  assert.equal(marketCurrency('USStock'), 'USD')
  assert.equal(marketCurrency('HKStock'), 'HKD')
})
