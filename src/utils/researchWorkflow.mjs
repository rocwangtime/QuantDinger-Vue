export function researchTaskForm (config = {}) {
  return { prompt: config.prompt || config.focus_conditions || '', session_window: config.session_window || 'always', trigger_type: (config.trigger && config.trigger.type) || 'scheduled', trigger_price: config.trigger && config.trigger.price }
}

export function researchTaskConfig (form) {
  const kind = form.trigger_type || 'scheduled'
  const price = Number(form.trigger_price)
  if (kind !== 'scheduled' && (!Number.isFinite(price) || price <= 0)) throw new Error('请填写大于 0 的触发价格 / Enter a positive trigger price')
  return { prompt: String(form.prompt || '').trim().slice(0, 12000), session_window: form.session_window || 'always', trigger: kind === 'scheduled' ? { type: kind } : { type: kind, price } }
}

export function validatedStrategyCode (response) {
  const data = response && response.data
  if (!data || !data.validation || data.validation.success !== true || typeof data.code !== 'string' || !data.code.trim()) {
    throw new Error((data && data.error) || (response && response.msg) || 'Strategy validation failed')
  }
  return data.code.trim()
}

export function nextSessionRadar (symbol, isZh) {
  return { label: isZh ? `扫描 ${symbol} 下一交易日机会` : `Scan ${symbol} for next-session opportunities`, prompt: isZh ? `用最新可获得行情研究 ${symbol} 下一交易日的买入、减仓和观望机会。先确认交易日历与数据截止时间，再给触发、失效条件和需要继续跟踪的证据；不要把周末当交易时段，不要编造统计胜率。` : `Research ${symbol} buy, exit and wait scenarios for the next exchange session. Confirm the exchange calendar and data cutoff first; give triggers, invalidation and evidence to monitor. Do not treat weekends as sessions or invent a win rate.` }
}
