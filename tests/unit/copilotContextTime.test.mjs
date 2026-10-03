import assert from 'node:assert/strict'
import test from 'node:test'
import { formatContextTime } from '../../src/views/ai-analysis/components/copilotContextTime.mjs'

test('quote source timestamps are readable rather than raw Unix seconds', () => {
  const formatted = formatContextTime('1790985747', 'zh-CN')
  assert.match(formatted, /2026/)
  assert.notEqual(formatted, '1790985747')
  assert.match(formatted, /GMT|UTC|时区|标准时间/)
})

test('ISO timestamps and unavailable timestamps are handled', () => {
  assert.match(formatContextTime('2026-10-02T20:00:00Z', 'en-US'), /2026/)
  assert.equal(formatContextTime(''), '--')
  assert.equal(formatContextTime('unknown'), 'unknown')
})
