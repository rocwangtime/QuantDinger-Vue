export function formatContextTime (value, locale = 'zh-CN') {
  const raw = String(value == null ? '' : value).trim()
  if (!raw) return '--'
  let date
  if (/^\d{10}(?:\.\d+)?$/.test(raw)) date = new Date(Number(raw) * 1000)
  else if (/^\d{13}$/.test(raw)) date = new Date(Number(raw))
  else date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZoneName: 'short'
  })
}
