import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8'
)

const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')
const selectLang = read('../../src/components/SelectLang/index.jsx')
const zh = read('../../src/locales/lang/zh-CN.js')
const en = read('../../src/locales/lang/en-US.js')
const copilotOverrides = read('../../src/locales/copilot-overrides.js')

test('stream completion cancels the reader and releases the sending state', () => {
  assert.match(copilot, /const eventName = this\.handleStreamEvent\(part, assistantMsg\)[\s\S]*eventName === 'done'/)
  assert.match(copilot, /eventName === 'replace'[\s\S]*assistantMsg\.content = payload\.text/)
  assert.match(copilot, /if \(!streamComplete\) throw new Error\(this\.text\.streamIncomplete\)/)
  assert.match(copilot, /streamError\.streamAccepted \|\| streamError\.streamHasContent[\s\S]*streamWarning/)
  assert.match(copilot, /eventName === 'warning'[\s\S]*outputLimit/)
  assert.match(copilot, /await reader\.cancel\(\)/)
  assert.match(copilot, /await this\.sendMessageStream[\s\S]*?this\.sending = false/)
})

test('strategy generation reads artifact code from the API data envelope', () => {
  assert.match(copilot, /const code = validatedStrategyCode\(res\)/)
  const workflow = read('../../src/utils/researchWorkflow.mjs')
  assert.match(workflow, /data\.validation\.success !== true/)
  assert.match(workflow, /return data\.code\.trim\(\)/)
  assert.doesNotMatch(copilot, /sessionStorage\.setItem\('qd_strategy_source', res\.code\)/)
})

test('switching conversations clears workflow and composer state', () => {
  assert.match(copilot, /async loadHistory \(sessionId\) \{\s*this\.resetComposerDraft\(\)/)
  assert.match(copilot, /newSession \(\) \{\s*this\.resetComposerDraft\(\)/)
  for (const field of ['draft', 'attachments', 'draftContextLock', 'pendingAgentTask', 'monitorSetupDraft']) {
    assert.match(copilot, new RegExp(`this\\.${field} =`))
  }
})

test('language selector is click and keyboard accessible', () => {
  assert.match(selectLang, /trigger=\{\['click'\]\}/)
  assert.match(selectLang, /role="button" tabIndex="0" onKeydown=\{handleKeydown\}/)
  assert.match(selectLang, /event\.key === 'Enter' \|\| event\.key === ' '/)
})

test('copilot action and event labels exist in both primary locales', () => {
  const keys = [
    'eventMetaSeparator',
    'impactHigh',
    'impactMedium',
    'impactLow',
    'usedThisTurn',
    'rememberPreference'
  ]
  for (const key of keys) {
    const token = `"aiAssetAnalysis.copilot.${key}"`
    assert.ok(zh.includes(token), `missing zh-CN key: ${key}`)
    assert.ok(en.includes(token), `missing en-US key: ${key}`)
  }
})

test('trading script editor actions are localized for every supported language', () => {
  const localeNames = [
    'en-US.js',
    'zh-CN.js',
    'zh-TW.js',
    'ja-JP.js',
    'ko-KR.js',
    'de-DE.js',
    'fr-FR.js',
    'ru-RU.js',
    'vi-VN.js',
    'th-TH.js',
    'ar-SA.js'
  ]
  const keys = ['openStrategyV2Ide', 'scriptStrategyReady']

  for (const localeName of localeNames) {
    const locale = read(`../../src/locales/lang/${localeName}`)
    for (const key of keys) {
      assert.ok(locale.includes(`"aiAssetAnalysis.copilot.${key}"`), `missing ${localeName} key: ${key}`)
    }
  }
  assert.doesNotMatch(copilot, /i18nText\('aiAssetAnalysis\.copilot\.openStrategyV2Ide',\s*'Open Trading Script editor'/)
})

test('research workspace switches dedicated controls on the left and keeps answers wide', () => {
  assert.match(copilot, /grid-template-columns: 78px clamp\(320px, 27vw, 390px\) minmax\(0, 1fr\) !important/)
  assert.match(copilot, /activeWorkspaceTab: 'ask'/)
  assert.match(copilot, /activeWorkspaceTab === 'watch'/)
  assert.match(copilot, /activeWorkspaceTab === 'monitor'/)
  assert.match(copilot, /<aside v-if="activeWorkspaceTab !== 'ask'"/)
  assert.match(copilot, /<section v-if="activeWorkspaceTab === 'monitor'"/)
  assert.match(copilot, /\.copilot-workbench \.messages \{ grid-column: 3; grid-row: 2; \}/)
  assert.match(copilot, /\.copilot-workbench \.composer,[\s\S]*?grid-column: 2;/)
  assert.match(copilot, /mobileSessionsOpen = true/)
  assert.match(copilot, /responseStartLocked/)
  assert.match(copilot, /research-progress__steps/)
  assert.match(copilot, /usePrompt \(prompt, options = \{\}\) \{\s*this\.activeWorkspaceTab = 'ask'/)
})

test('question editor puts the prompt above modes and model controls inside its footer', () => {
  const editor = copilot.indexOf('<div class="question-editor">')
  const modes = copilot.indexOf('<div class="research-mode-bar"')
  assert.ok(editor >= 0 && modes > editor)
  assert.match(copilot.slice(editor, modes), /<textarea[\s\S]*?<div class="composer-foot">[\s\S]*?<AgentModelSelect v-model="llmSelection" compact/)
})

test('saved prompts use compact chat-history rows instead of stretched grid cards', () => {
  assert.match(copilot, /\.left-rail \.saved-prompt-library__list \{[\s\S]*?grid-auto-rows: min-content;[\s\S]*?align-content: start;/)
  assert.match(copilot, /\.left-rail \.saved-prompt-library__item \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\) 28px;/)
  assert.match(copilot, /\.left-rail \.saved-prompt-card \{\s*padding: 9px 10px;/)
})

test('analysis quick action is localized for every selectable language', () => {
  const localeCount = (copilotOverrides.match(/^ {2}"[a-z]{2}-[A-Z]{2}": \{/gm) || []).length
  const promptCount = (copilotOverrides.match(/"aiAssetAnalysis\.copilot\.analysisPromptTemplate"/g) || []).length

  assert.equal(localeCount, 11)
  assert.equal(promptCount, localeCount)
  assert.match(copilot, /i18nText\('aiAssetAnalysis\.copilot\.analysisPromptTemplate'/)
  assert.match(copilot, /'\$i18n\.locale' \(\) \{\s*this\.refreshLocalizedDraft\(\)/)
  assert.match(copilot, /localizedDraft: \{ type: 'analysis', target: analysisTarget \}/)
  for (const key of [
    'focusSymbol',
    'quickTasks.indicator_research.label',
    'quickTasks.strategy_research.label',
    'quickTasks.trade_plan.label',
    'quickTasks.macro_economic_data.label'
  ]) {
    const matches = copilotOverrides.match(new RegExp(`"aiAssetAnalysis\\.copilot\\.${key.replaceAll('.', '\\.')}"`, 'g')) || []
    assert.equal(matches.length, 9, `missing non-English overrides for ${key}`)
  }
  assert.match(copilot, /uploadImageLabel \(\) \{\s*return this\.text\.uploadChart/)
})
