import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { parseComponent, compileStyleAsync } from 'vue/compiler-sfc'
import { marketCurrency, visibleSymbolParams } from '../../src/views/agent-tasks/symbolSettings.mjs'
import { lotValidationError } from '../../src/views/agent-tasks/lotValidation.mjs'

const read = name => readFileSync(new URL(`../../src/views/agent-tasks/${name}`, import.meta.url), 'utf8')

test('paper workspace recognizes the default realdark theme as well as dark', () => {
  const body = read('index.vue').match(/isDarkTheme \(\) \{([^}]+)\}/)[1]
  for (const [theme, expected] of [['realdark', true], ['dark', true], ['light', false]]) {
    assert.equal(vm.runInNewContext(`(function () { ${body} }).call(context)`, {
      context: { $store: { getters: { theme } } }
    }), expected, theme)
  }
})

test('symbol form owns its scoped grid and reaches Ant controls inside child components', async () => {
  const component = parseComponent(read('SymbolSettings.vue'))
  const style = component.styles[0]
  const result = await compileStyleAsync({
    source: style.content, filename: 'SymbolSettings.vue',
    id: 'data-v-symbol', scoped: true, preprocessLang: style.lang
  })
  assert.deepEqual(result.errors, [])
  assert.match(result.code, /\.symbol-settings \.form-grid\[data-v-symbol\][^{]*\{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(result.code, /\.symbol-settings\[data-v-symbol\] \.ant-input-number/)
  assert.match(result.code, /\.symbol-settings\[data-v-symbol\] \.ant-select[^{]*\{\s*width: 100%/)
  assert.match(result.code, /@media \(max-width: 700px\)[\s\S]*grid-template-columns: 1fr/)
  // Labels are local strings with a key fallback, independent of API label metadata/i18n.
  assert.match(component.template.content, /:key="key" :label="\(labels\[key\] \|\| key\)\.replace/)
})
test('US caps report USD and whole share reference cost', () => {
  assert.match(lotValidationError({ reference_price: 250, lot_size: 1, budget: 15000, cash_reserve_pct: 20, per_order_cap: 100 }, 'USD'), /250 USD/)
})
test('US settings expose session controls and hide lunch', () => {
  const params = { blackout_lunch: true, blackout_auction: true, blackout_open_minutes: 5, extended_hours: false }
  assert.deepEqual(visibleSymbolParams(params, 'USStock'), { blackout_open_minutes: 5, extended_hours: false })
  assert.deepEqual(visibleSymbolParams(params, 'HKStock'), params)
  assert.equal(marketCurrency('USStock'), 'USD')
  assert.equal(marketCurrency('HKStock'), 'HKD')
})
