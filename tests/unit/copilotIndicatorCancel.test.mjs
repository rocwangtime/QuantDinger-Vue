import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const source = fs.readFileSync(path.join(root, 'src/views/ai-analysis/components/CopilotWorkbench.vue'), 'utf8')
const start = source.indexOf('async generateChartIndicatorDraft (prompt, target)')
const end = source.indexOf('async generateStrategyV2Draft (prompt, target)', start)
const method = source.slice(start, end)

test('Copilot quick indicator streams with a cancellable server request', () => {
  assert.ok(start >= 0 && end > start)
  assert.match(method, /this\.activeAssistantMessage = assistantMsg/)
  assert.match(method, /this\.activeGenerationRequestId = requestId/)
  assert.match(method, /signal: controller\.signal/)
  assert.match(method, /request_id: requestId/)
  assert.match(method, /controller\.signal\.aborted \|\| this\.generationStopped/)
  assert.match(method, /if \(controller\.signal\.aborted \|\| this\.generationStopped\) return/)
})
