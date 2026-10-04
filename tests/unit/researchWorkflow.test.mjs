import test from 'node:test'
import assert from 'node:assert/strict'
import { researchTaskForm, researchTaskConfig, validatedStrategyCode, nextSessionRadar } from '../../src/utils/researchWorkflow.mjs'

test('research brief and price/window settings survive edit round trips', () => {
  const config = { prompt: 'SPCX volume confirmation, wait otherwise', session_window: 'regular', trigger: { type: 'price_above', price: 160 } }
  assert.deepEqual(researchTaskConfig(researchTaskForm(config)), config)
  assert.equal(researchTaskForm({ focus_conditions: 'legacy condition' }).prompt, 'legacy condition')
  assert.throws(() => researchTaskConfig({ trigger_type: 'price_above', trigger_price: NaN }))
  assert.deepEqual(researchTaskConfig(researchTaskForm({ trigger: { type: 'news_event' } })).trigger, { type: 'news_event' })
})

test('only validated generator artifacts can enter the strategy flow', () => {
  assert.throws(() => validatedStrategyCode({ data: { code: 'def on_bar(): pass' } }))
  assert.throws(() => validatedStrategyCode({ code: 0, data: { error: 'compile failed' } }), /compile failed/)
  assert.equal(validatedStrategyCode({ data: { code: 'def initialize(context): pass', validation: { success: true } } }), 'def initialize(context): pass')
})

test('stock opportunity presets ask for next exchange session, not continuous 24h', () => {
  const prompt = nextSessionRadar('SPCX', true)
  assert.match(prompt.label, /下一交易日/)
  assert.match(prompt.prompt, /交易日历/)
  assert.doesNotMatch(prompt.label, /24/)
})
