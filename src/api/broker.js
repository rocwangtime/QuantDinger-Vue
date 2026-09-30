import request from '@/utils/request'

/**
 * Unified broker API client.
 *
 * Wraps `/api/ibkr/*` and `/api/alpaca/*` behind one shape:
 *
 *   broker.<id>.status()
 *   broker.<id>.connect(payload)
 *   broker.<id>.disconnect()
 *   broker.<id>.account()
 *   broker.<id>.positions()
 *   broker.<id>.orders()
 *   broker.<id>.placeOrder(payload)
 *   broker.<id>.cancelOrder(id)
 *   broker.<id>.quote(symbol, params)
 *
 * Per-user multi-tenancy is handled server-side via BrokerSessionRegistry,
 * so callers do not pass a user id — the auth token determines isolation.
 */

const ENDPOINTS = {
  ibkr: {
    status: '/api/ibkr/status',
    connect: '/api/ibkr/connect',
    disconnect: '/api/ibkr/disconnect',
    account: '/api/ibkr/account',
    positions: '/api/ibkr/positions',
    orders: '/api/ibkr/orders',
    order: '/api/ibkr/order',
    quote: '/api/ibkr/quote'
  },
  alpaca: {
    status: '/api/alpaca/status',
    connect: '/api/alpaca/connect',
    disconnect: '/api/alpaca/disconnect',
    account: '/api/alpaca/account',
    positions: '/api/alpaca/positions',
    orders: '/api/alpaca/orders',
    order: '/api/alpaca/order',
    quote: '/api/alpaca/quote'
  },
  futu: {
    status: '/api/futu/status',
    connect: '/api/futu/connect',
    disconnect: '/api/futu/disconnect',
    automationArm: '/api/futu/automation/arm',
    automationPause: '/api/futu/automation/pause',
    probe: '/api/futu/probe',
    account: '/api/futu/account',
    positions: '/api/futu/positions',
    orders: '/api/futu/orders',
    fills: '/api/futu/fills',
    quote: '/api/futu/quote'
  }
}

function makeBrokerClient (id) {
  const ep = ENDPOINTS[id]
  if (!ep) throw new Error(`Unknown broker: ${id}`)

  return {
    id,
    accounts () {
      return request({ url: '/api/alpaca/accounts', method: 'get' })
    },
    status (params = {}) {
      return request({ url: ep.status, method: 'get', params })
    },
    connect (data = {}) {
      return request({ url: ep.connect, method: 'post', data })
    },
    probe (data = {}) {
      if (!ep.probe) throw new Error(`Probe unavailable for ${id}`)
      return request({ url: ep.probe, method: 'post', data })
    },
    fills () {
      if (!ep.fills) throw new Error(`Fills unavailable for ${id}`)
      return request({ url: ep.fills, method: 'get' })
    },
    disconnect (data = {}) {
      return request({ url: ep.disconnect, method: 'post', data })
    },
    armAutomation (data = {}) {
      if (!ep.automationArm) throw new Error(`Automation unavailable for ${id}`)
      return request({ url: ep.automationArm, method: 'post', data })
    },
    pauseAutomation (data = {}) {
      if (!ep.automationPause) throw new Error(`Automation unavailable for ${id}`)
      return request({ url: ep.automationPause, method: 'post', data })
    },
    account (params = {}) {
      return request({ url: ep.account, method: 'get', params })
    },
    positions (params = {}) {
      return request({ url: ep.positions, method: 'get', params })
    },
    orders (params = {}) {
      return request({ url: ep.orders, method: 'get', params })
    },
    placeOrder (data = {}) {
      return request({ url: ep.order, method: 'post', data })
    },
    cancelOrder (orderId, params = {}) {
      const url = id === 'alpaca'
        ? `${ep.order}/${encodeURIComponent(orderId)}`
        : `${ep.order}/${orderId}`
      return request({ url, method: 'delete', params })
    },
    quote (symbol, params = {}) {
      if (id === 'alpaca') {
        return request({ url: `${ep.quote}/${encodeURIComponent(symbol)}`, method: 'get', params })
      }
      return request({ url: ep.quote, method: 'get', params: { ...params, symbol } })
    }
  }
}

export const broker = {
  ibkr: makeBrokerClient('ibkr'),
  alpaca: makeBrokerClient('alpaca'),
  futu: makeBrokerClient('futu')
}

export const BROKER_IDS = ['futu', 'alpaca', 'ibkr']

/**
 * Static descriptor for each broker (logo color, market focus, connect form
 * schema). Keeps the page declarative and easy to extend with a 4th broker.
 */
export const BROKER_META = {
  futu: {
    id: 'futu',
    icon: 'line-chart',
    color: '#14b8a6',
    accent: '#0f766e',
    markets: ['USStock', 'HKStock'],
    badges: ['paper_default', 'terminal_required'],
    cloudFriendly: false
  },
  alpaca: {
    id: 'alpaca',
    icon: 'thunderbolt',
    color: '#1890ff',
    accent: '#722ed1',
    markets: ['USStock', 'Crypto'],
    badges: ['zero_commission', 'rest_api'],
    cloudFriendly: true
  },
  ibkr: {
    id: 'ibkr',
    icon: 'global',
    color: '#fa8c16',
    accent: '#d4380d',
    markets: ['USStock', 'Forex', 'Futures'],
    badges: ['tws_required', 'pro_features'],
    cloudFriendly: false
  }
}
