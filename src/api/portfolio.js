/**
 * Portfolio API - Manual positions and monitoring
 */
import request from '@/utils/request'

// ==================== Positions ====================

export function getPositions (params = {}) {
  return request({
    url: '/api/portfolio/positions',
    method: 'get',
    params
  })
}

export function addPosition (data) {
  return request({
    url: '/api/portfolio/positions',
    method: 'post',
    data
  })
}

export function updatePosition (id, data) {
  return request({
    url: `/api/portfolio/positions/${id}`,
    method: 'put',
    data
  })
}

export function deletePosition (id) {
  return request({
    url: `/api/portfolio/positions/${id}`,
    method: 'delete'
  })
}

export function getPortfolioSummary (params = {}) {
  return request({
    url: '/api/portfolio/summary',
    method: 'get',
    params
  })
}

// ==================== Monitors ====================

export function getMonitors () {
  return request({
    url: '/api/portfolio/monitors',
    method: 'get'
  })
}

export function getMonitorRuns (id, limit = 20) {
  return request({
    url: `/api/portfolio/monitors/${id}/runs`,
    method: 'get',
    params: { limit }
  })
}

export function getResearchOpportunities (status = 'new', limit = 30) {
  return request({
    url: '/api/portfolio/opportunities',
    method: 'get',
    params: { status, limit }
  })
}

export function updateResearchOpportunity (id, status) {
  return request({
    url: `/api/portfolio/opportunities/${id}`,
    method: 'patch',
    data: { status }
  })
}

export function addMonitor (data) {
  return request({
    url: '/api/portfolio/monitors',
    method: 'post',
    data
  })
}

export function updateMonitor (id, data) {
  return request({
    url: `/api/portfolio/monitors/${id}`,
    method: 'put',
    data
  })
}

export function deleteMonitor (id) {
  return request({
    url: `/api/portfolio/monitors/${id}`,
    method: 'delete'
  })
}

export function runMonitor (id, params = {}) {
  return request({
    url: `/api/portfolio/monitors/${id}/run`,
    method: 'post',
    data: params
  })
}

// ==================== Alerts ====================

export function getAlerts () {
  return request({
    url: '/api/portfolio/alerts',
    method: 'get'
  })
}

export function addAlert (data) {
  return request({
    url: '/api/portfolio/alerts',
    method: 'post',
    data
  })
}

export function updateAlert (id, data) {
  return request({
    url: `/api/portfolio/alerts/${id}`,
    method: 'put',
    data
  })
}

export function deleteAlert (id) {
  return request({
    url: `/api/portfolio/alerts/${id}`,
    method: 'delete'
  })
}

// ==================== Groups ====================

export function getGroups () {
  return request({
    url: '/api/portfolio/groups',
    method: 'get'
  })
}

export function renameGroup (data) {
  return request({
    url: '/api/portfolio/groups/rename',
    method: 'post',
    data
  })
}

// ==================== Market (reuse from market.js) ====================

export function searchSymbols (data) {
  return request({
    url: '/api/market/symbols/search',
    method: 'post',
    data
  })
}

export function getMarketTypes () {
  return request({
    url: '/api/market/types',
    method: 'get'
  })
}
