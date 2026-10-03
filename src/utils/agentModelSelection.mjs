export const modelKey = value => value && value.provider && value.model ? `${value.provider}:${value.model}` : ''
export function selectionFor (item, effort = 'default') {
  if (!item) return {}
  return { provider: item.provider, model: item.model, reasoning_effort: (item.reasoning_options || ['default']).includes(effort) ? effort : 'default' }
}
export function reasoningLabel (effort, isZh) {
  const labels = { default: ['厂商默认', 'Provider default'], none: ['关闭思考', 'Thinking off'], low: ['低 · 较快', 'Low · faster'], medium: ['中', 'Medium'], high: ['高', 'High'], xhigh: ['很高', 'Extra high'], max: ['最高 · 较慢', 'Maximum · slower'] }
  return (labels[effort] || [effort, effort])[isZh ? 0 : 1]
}
export function providerLabel (provider, isZh) {
  const labels = { volcengine: ['火山方舟', 'Volcengine Ark'], deepseek: ['DeepSeek 官方', 'DeepSeek official'], openai: ['OpenAI 官方', 'OpenAI official'] }
  return labels[provider] ? labels[provider][isZh ? 0 : 1] : provider
}
