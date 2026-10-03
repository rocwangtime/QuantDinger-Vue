import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { modelKey, selectionFor, reasoningLabel, providerLabel } from '../../src/utils/agentModelSelection.mjs'
import { researchTaskConfig, researchTaskForm } from '../../src/utils/researchWorkflow.mjs'

const ark = { provider: 'volcengine', model: 'deepseek-v4-1-flash-260910', reasoning_options: ['default', 'none', 'low', 'high', 'max'] }
test('model selection never forwards an unsupported effort or provider credentials', () => {
  assert.deepEqual(selectionFor(ark, 'medium'), { provider: ark.provider, model: ark.model, reasoning_effort: 'default' })
  assert.equal(selectionFor(ark, 'max').reasoning_effort, 'max')
  assert.notEqual(modelKey(ark), modelKey({ ...ark, provider: 'deepseek' }))
  assert.equal(providerLabel('volcengine', true), '火山方舟')
  assert.equal(reasoningLabel('none', true), '关闭思考')
})
test('saved research task roundtrips pinned provider model and effort', () => {
  const selection = selectionFor(ark, 'low')
  assert.deepEqual(researchTaskConfig(researchTaskForm({ llm_selection: selection })).llm_selection, selection)
})
test('every Copilot LLM request explicitly carries the chosen settings', () => {
  const source = readFileSync(new URL('../../src/views/ai-analysis/components/CopilotWorkbench.vue', import.meta.url), 'utf8')
  for (const api of ['fastAnalyze', 'classifyAgentIntent', 'chatMessage']) {
    assert.match(source, new RegExp(`${api}\\(\\{\\s+llm_selection: \\{ \\.\\.\\.this.llmSelection \\}`))
  }
  assert.match(source, /fetch\('\/api\/strategies\/generate\/stream'[\s\S]*llm_selection: \{ \.\.\.this\.llmSelection \}/)
  assert.match(source, /session_id: routingSessionId === undefined \? this.sessionId : routingSessionId,\s+llm_selection:/)
  assert.match(source, /prompt: agentPrompt,\s+llm_selection:/)
  assert.match(source, /modelSelectionReady && !this.sending/)
  assert.match(source, /reasoningLabel\(usage.reasoning_effort/)
})

test('native strategy and indicator Agent editors also select and forward models', () => {
  for (const editor of ['strategy-ide', 'indicator-ide']) {
    const source = readFileSync(new URL(`../../src/views/${editor}/index.vue`, import.meta.url), 'utf8')
    assert.match(source, /<AgentModelSelect v-model="llmSelection"/)
    assert.match(source, /llm_selection: \{ \.\.\.this.llmSelection \}/)
    assert.match(source, /if \(!this.modelSelectionReady\) return/)
  }
})
