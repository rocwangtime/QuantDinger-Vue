import assert from 'node:assert/strict'
import test from 'node:test'

import {
  credentialMatchesLiveStrategy,
  formatExchangeCredentialLabel,
  supportsLiveExecutionMode
} from '../../src/utils/exchangeCredential.js'

const cryptoPortfolio = {
  strategyType: 'portfolio',
  markets: ['Crypto'],
  universe: {
    instruments: [
      { symbol: 'BTC/USDT', market: 'Crypto', market_type: 'swap' },
      { symbol: 'ETH/USDT', market: 'Crypto', market_type: 'swap' }
    ]
  }
}

test('same-market crypto portfolios support live execution with crypto credentials', () => {
  assert.equal(supportsLiveExecutionMode(cryptoPortfolio), true)
  for (const exchangeId of ['binance', 'bitget', 'bybit', 'okx', 'gate', 'htx']) {
    assert.equal(credentialMatchesLiveStrategy(cryptoPortfolio, exchangeId), true)
  }
  assert.equal(credentialMatchesLiveStrategy(cryptoPortfolio, 'alpaca'), false)
})

test('US stock strategies support configured stock brokers including Futu SIMULATE', () => {
  const manifest = { strategyType: 'portfolio', markets: ['USStock'] }
  assert.equal(supportsLiveExecutionMode(manifest), true)
  assert.equal(credentialMatchesLiveStrategy(manifest, 'alpaca'), true)
  assert.equal(credentialMatchesLiveStrategy(manifest, 'IBKR'), true)
  assert.equal(credentialMatchesLiveStrategy(manifest, 'futu'), true)
  assert.equal(credentialMatchesLiveStrategy(manifest, 'okx'), false)
})

test('mixed and unsupported markets remain signal-only', () => {
  for (const manifest of [
    { strategyType: 'portfolio', markets: ['Crypto', 'USStock'] },
    { strategyType: 'portfolio', markets: ['HKStock'] },
    { strategyType: 'portfolio', markets: [] }
  ]) {
    assert.equal(supportsLiveExecutionMode(manifest), false)
    assert.equal(credentialMatchesLiveStrategy(manifest, 'binance'), false)
    assert.equal(credentialMatchesLiveStrategy(manifest, 'alpaca'), false)
    assert.equal(credentialMatchesLiveStrategy(manifest, 'futu'), false)
  }
})

test('eligibility matches backend set semantics for duplicate market declarations', () => {
  const manifest = { strategyType: 'portfolio', markets: ['Crypto', 'Crypto'] }
  assert.equal(supportsLiveExecutionMode(manifest), true)
  assert.equal(credentialMatchesLiveStrategy(manifest, 'okx'), true)
})

test('Futu credential labels distinguish saved accounts with the same alias', () => {
  const first = { id: 7, exchange_id: 'futu', name: 'Futu US SIMULATE', api_key_hint: 'demo/US' }
  const second = { ...first, id: 8 }
  assert.match(formatExchangeCredentialLabel(first), /^Futu #7 ·/)
  assert.match(formatExchangeCredentialLabel(second), /^Futu #8 ·/)
  assert.notEqual(formatExchangeCredentialLabel(first), formatExchangeCredentialLabel(second))
  assert.equal(formatExchangeCredentialLabel({ id: 9, exchange_id: 'alpaca', name: 'Paper' }), 'Alpaca · Paper')
})
