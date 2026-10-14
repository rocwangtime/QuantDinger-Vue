import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isDarkTheme, splitSymbols, formatMetric } from '../../src/components/UsScreener/model.mjs'
import messages from '../../src/locales/lang/us-screener.js'
test('screener supports dark and realdark', () => {
  assert.equal(isDarkTheme('dark'), true)
  assert.equal(isDarkTheme('realdark'), true)
  assert.equal(isDarkTheme('light'), false)
})
test('shortlist sorts ranks and keeps excluded reasons', () => {
  const rows = [{ symbol: 'B', rank: 2, included: true }, { symbol: 'A', rank: 1, included: true }, { symbol: 'C', included: false, exclusion_reasons: ['earnings_blackout'] }]
  const result = splitSymbols({ symbols: rows })
  assert.deepEqual(result.included.map(r => r.symbol), ['A', 'B'])
  assert.deepEqual(result.excluded[0].exclusion_reasons, ['earnings_blackout'])
  assert.deepEqual(splitSymbols(null), { included: [], excluded: [] })
})
test('units distinguish percent fractions and percentage points', () => {
  assert.equal(formatMetric('momentum20', .1), '10.000%')
  assert.equal(formatMetric('atr14_pct', 2), '2.000%')
  assert.equal(formatMetric('score', null), '—')
})
test('English and Chinese screener keys match', () => {
  assert.deepEqual(Object.keys(messages['en-US']).sort(), Object.keys(messages['zh-CN']).sort())
})
