import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8'
)

const page = read('../../src/views/agent-task-center/index.vue')
const router = read('../../src/config/router.config.js')
const layout = read('../../src/layouts/BasicLayout.vue')
const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')

test('research history supports readable vertical reports and portal-safe theme colors', () => {
  assert.match(page, /width="min\(720px, 100vw\)"/)
  assert.match(page, /:body-style="runsPanelStyle"/)
  assert.match(page, /\.task-run-symbol \{[^}]*flex-direction: column/)
  assert.match(page, /white-space: pre-wrap/)
  assert.match(page, /getMonitorRuns\(monitor.id\), getMonitors\(\).catch/)
})

test('task center is the default workspace and keeps research and execution separate', () => {
  assert.match(router, /redirect: '\/agent-task-center'/)
  assert.match(router, /path: '\/agent-task-center'/)
  assert.match(layout, /paths: \['\/agent-task-center'\]/)
  assert.match(page, /getMonitors\(\), getWatchlist\(\), getStrategyList\(\)/)
  assert.match(page, /monitor_type === 'ai'/)
  assert.match(page, /openRuntime \(id\)/)
})

test('new research schedules are paused and cannot place an order', () => {
  assert.match(page, /is_active: false/)
  assert.match(page, /monitor_type: 'ai'/)
  assert.match(page, /position_ids: \[\]/)
  assert.match(page, /:title="copy.enableConfirm"/)
  assert.doesNotMatch(page, /placeOrder|submitOrder|startStrategy\(/)
})

test('watchlist discovery does not silently inherit the previously selected symbol', () => {
  assert.match(page, /scope: 'watchlist'/)
  assert.match(page, /scope: 'unbound'/)
  assert.match(copilot, /query\.scope === 'watchlist' \|\| query\.scope === 'unbound'/)
  assert.match(copilot, /if \(this\.skipDefaultWatchSymbol \|\| this\.selectedSymbolValue/)
  assert.match(copilot, /activated \(\) \{\s*this\.applyIncomingCopilotPrompt\(\)/)
})

test('every desktop locale names the new task center', () => {
  for (const locale of ['en-US', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'de-DE', 'fr-FR', 'ru-RU', 'vi-VN', 'th-TH', 'ar-SA']) {
    assert.match(read(`../../src/locales/lang/${locale}.js`), /"menu\.dashboard\.agentTaskCenter"/)
  }
})
