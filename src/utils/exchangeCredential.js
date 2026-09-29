/** Display names for exchange_id values (shared across account pickers). */
export const CRYPTO_EXCHANGE_DISPLAY_NAMES = {
  binance: 'Binance',
  okx: 'OKX',
  bitget: 'Bitget',
  bybit: 'Bybit',
  gate: 'Gate.io',
  htx: 'HTX',
  alpaca: 'Alpaca',
  ibkr: 'IBKR',
  futu: 'Futu'
}

export const CRYPTO_EXCHANGE_IDS = new Set([
  'binance',
  'okx',
  'bitget',
  'bybit',
  'gate',
  'htx'
])

export const US_STOCK_EXCHANGE_IDS = new Set([
  'alpaca',
  'ibkr',
  'futu'
])

export const QUICK_TRADE_EXCHANGE_IDS = new Set([
  'binance',
  'okx',
  'bitget',
  'bybit',
  'gate',
  'htx'
])

export function isCryptoExchangeCredential (cred) {
  return CRYPTO_EXCHANGE_IDS.has(String(cred?.exchange_id || '').trim().toLowerCase())
}

export function filterCryptoExchangeCredentials (credentials, exchangeId) {
  const selectedExchangeId = String(exchangeId || '').trim().toLowerCase()
  return (Array.isArray(credentials) ? credentials : []).filter(cred => {
    const credentialExchangeId = String(cred?.exchange_id || '').trim().toLowerCase()
    return CRYPTO_EXCHANGE_IDS.has(credentialExchangeId) &&
      (!selectedExchangeId || credentialExchangeId === selectedExchangeId)
  })
}

export function isQuickTradeExchangeCredential (cred) {
  return QUICK_TRADE_EXCHANGE_IDS.has(String(cred?.exchange_id || '').trim().toLowerCase())
}

function liveExecutionMarket (manifest) {
  const markets = Array.isArray(manifest?.markets)
    ? [...new Set(manifest.markets.map(value => String(value || '').trim()).filter(Boolean))]
    : []
  if (markets.length !== 1) return ''
  return ['Crypto', 'USStock'].includes(markets[0]) ? markets[0] : ''
}

/**
 * Live execution is a market capability, not a CTA/portfolio distinction.
 * A same-market portfolio is supported; a mixed-market strategy is not.
 */
export function supportsLiveExecutionMode (manifest) {
  return Boolean(liveExecutionMarket(manifest))
}

export function credentialMatchesLiveStrategy (manifest, exchangeId) {
  const market = liveExecutionMarket(manifest)
  const normalizedExchangeId = String(exchangeId || '').trim().toLowerCase()
  if (market === 'Crypto') return CRYPTO_EXCHANGE_IDS.has(normalizedExchangeId)
  if (market === 'USStock') return US_STOCK_EXCHANGE_IDS.has(normalizedExchangeId)
  return false
}

export function getExchangeDisplayName (exchangeId) {
  const id = String(exchangeId || '').trim().toLowerCase()
  if (!id) return '--'
  return CRYPTO_EXCHANGE_DISPLAY_NAMES[id] || id.toUpperCase()
}

/**
 * Human-readable label for a saved exchange credential (select options, lists).
 * @param {object} cred - row from /api/credentials/list
 * @param {{ unnamed?: string, includeHint?: boolean }} opts
 */
export function formatExchangeCredentialLabel (cred, opts = {}) {
  if (!cred) return ''
  const { unnamed = '', includeHint = true } = opts
  const alias = String(cred.name || '').trim()
  const ex = getExchangeDisplayName(cred.exchange_id)
  const hint = includeHint && cred.api_key_hint ? String(cred.api_key_hint).trim() : ''
  const futuCredentialId = String(cred.exchange_id || '').trim().toLowerCase() === 'futu' && Number(cred.id) > 0
    ? ` · #${Number(cred.id)}`
    : ''
  if (alias) {
    return (hint ? `${ex} · ${alias} (${hint})` : `${ex} · ${alias}`) + futuCredentialId
  }
  if (hint) return `${ex} (${hint})${futuCredentialId}`
  return (unnamed ? `${ex} · ${unnamed}` : ex) + futuCredentialId
}
