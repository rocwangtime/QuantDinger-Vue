import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { researchCandidateFromRun, buildResearchStrategyPrompt } from '../../src/views/agent-task-center/researchCandidate.js'

const read = path => fs.readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
const taskCenter = read('../../src/views/agent-task-center/index.vue')
const strategyIde = read('../../src/views/strategy-ide/index.vue')

const run = {
  id: 42,
  status: 'completed',
  created_at: '2026-10-01T10:00:00Z',
  result: { success: true }
}
const analysis = {
  market: 'USStock', symbol: 'tsla', final_decision: 'BUY', confidence: 76,
  reasoning: 'Trend is strengthening', risk_report: 'Gap risk', suggested_entry: 400
}

test('only a completed BUY research result in a supported stock market can become a candidate', () => {
  const candidate = researchCandidateFromRun(run, analysis)
  assert.equal(candidate.symbol, 'TSLA')
  assert.equal(candidate.market, 'USStock')
  assert.equal(candidate.observedAt, run.created_at)
  assert.equal(researchCandidateFromRun(run, { ...analysis, confidence: null }).confidence, null)
  for (const invalid of [
    { ...run, status: 'failed' },
    { ...run, result: { success: false } }
  ]) assert.equal(researchCandidateFromRun(invalid, analysis), null)
  for (const invalid of [
    { ...analysis, final_decision: 'HOLD' },
    { ...analysis, market: 'Crypto' },
    { ...analysis, symbol: 'TSLA;DROP' },
    { ...analysis, error: 'data missing' }
  ]) assert.equal(researchCandidateFromRun(run, invalid), null)
})

test('candidate prompt treats report as historical data and never authorizes trading', () => {
  const candidate = researchCandidateFromRun(run, { ...analysis, reasoning: 'x'.repeat(2000) })
  const prompt = buildResearchStrategyPrompt(candidate)
  assert.match(prompt, /历史定时研究快照/)
  assert.match(prompt, /不要下单/)
  assert.match(prompt, /USStock/)
  assert.match(prompt, /TSLA/)
  assert.ok(prompt.length < 2400)
  assert.equal(buildResearchStrategyPrompt(null), '')
})

test('task center uses the validated generator and carries research origin into the editor', () => {
  assert.match(taskCenter, /aiGenerateStrategy\(\{/)
  assert.match(taskCenter, /data\.validation && data\.validation\.success/)
  assert.match(taskCenter, /research_origin: \{/)
  assert.match(taskCenter, /copilotBacktest: '1'/)
  assert.match(strategyIde, /research_origin: \{ \.\.\.this\.researchOrigin \}/)
  assert.match(strategyIde, /Historical research is not current market data or trading authorization/)
})
