import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

import { buildContextualFollowups } from '../../src/views/ai-analysis/components/copilotResearchPrompts.mjs'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('strategy answer suggests the right next stage instead of generic technical analysis', () => {
  const before = buildContextualFollowups({ isZh: true, intent: 'strategy_build' })
  const after = buildContextualFollowups({ isZh: true, intent: 'strategy_build', hasStrategyCode: true })
  assert.equal(before[0].key, 'followup_strategy_defaults')
  assert.equal(after[0].key, 'followup_strategy_risk')
  assert.equal(after.length, 3)
})

test('a generated strategy can be handed to validation and backtest without copy-paste or live launch', () => {
  const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')
  const editor = read('../../src/views/strategy-ide/index.vue')
  assert.match(copilot, /@click="reviewStrategyCode\(msg\)"/)
  assert.match(copilot, /sessionStorage\.setItem\('qd_strategy_source'/)
  assert.match(copilot, /copilotBacktest: '1'/)
  assert.match(editor, /if \(await this\.verifyScriptCode\(\)\) this\.openBacktestCenter\(\)/)
  assert.match(editor, /activated \(\) \{[\s\S]*?this\.resumeCopilotBacktest\(\)/)
  assert.match(editor, /async resumeCopilotBacktest \(\) \{[\s\S]*?this\.hasCopilotScriptDraft\(\)/)
  assert.match(copilot, /type === 'llm_usage'/)
  assert.doesNotMatch(copilot, /reviewStrategyCode \(msg\)[\s\S]*?startStrategy\(/)
})
