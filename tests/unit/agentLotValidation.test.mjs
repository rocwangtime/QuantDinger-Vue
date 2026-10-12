import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lotValidationError } from '../../src/views/agent-tasks/lotValidation.mjs'
const p = { budget: 100000, cash_reserve_pct: 20, lot_size: 200, reference_price: 100, per_order_cap: 20000, daily_buy_cap: 40000, max_position: 60000 }
test('exact lot cost is valid; each cap must cover one lot and fit reserve', () => {
  assert.equal(lotValidationError(p), '')
  for (const key of ['per_order_cap', 'daily_buy_cap', 'max_position']) {
    assert.match(lotValidationError({ ...p, [key]: 19999 }), /CAP_BELOW_ONE_LOT/)
    assert.match(lotValidationError({ ...p, [key]: 80001 }), /CAP_UNREACHABLE/)
  }
  assert.match(lotValidationError({ ...p, reference_price: null }), /REFERENCE_PRICE_REQUIRED/)
})
