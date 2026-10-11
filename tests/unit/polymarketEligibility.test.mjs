import test from 'node:test'
import assert from 'node:assert/strict'
import { canEnableLive } from '../../src/utils/polymarketEligibility.js'

test('live eligibility fails closed unless status is eligible', () => {
  assert.equal(canEnableLive({ status: 'eligible' }), true)
  for (const status of ['blocked', 'close_only', 'unknown', null]) assert.equal(canEnableLive({ status }), false)
  assert.equal(canEnableLive(null), false)
})
