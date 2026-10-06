<template>
  <div class="agent-tasks qd-workspace-page qd-page-frame" :class="{ 'theme-dark': isDarkTheme }">
    <header class="task-header">
      <div><h1>{{ t('title') }}</h1><p>{{ t('subtitle') }}</p></div>
      <div class="task-actions">
        <a-button @click="$router.push('/broker-accounts')">{{ t('accounts') }}</a-button>
        <a-button :loading="loading" @click="refresh">{{ t('refresh') }}</a-button>
        <a-button type="primary" icon="plus" @click="openEditor()">{{ t('new') }}</a-button>
      </div>
    </header>
    <a-alert v-if="error" type="error" show-icon :message="error" class="task-notice" />
    <div class="task-workspace">
      <aside class="task-rail">
        <a-empty v-if="!tasks.length && !loading" :description="t('empty')" />
        <button v-for="task in tasks" :key="task.id" class="task-row" :class="{ selected: selectedId === task.id }" @click="select(task.id)">
          <strong>{{ task.name }}</strong>
          <span>{{ task.config.symbols.join(' · ') }}</span>
          <small><i :class="{ running: task.active }" />{{ task.active ? t('active') : t('paused') }} · {{ task.config.execution_mode === 'paper_auto' ? t('paper') : t('research') }}</small>
        </button>
      </aside>
      <main v-if="dashboard" class="task-main">
        <section class="task-panel">
          <div class="task-heading">
            <div><h2>{{ dashboard.task.name }}</h2><p>{{ dashboard.task.monitor_status }}</p></div>
            <div class="task-actions">
              <a-button :disabled="dashboard.task.active || busy" @click="openEditor(dashboard.task)">{{ t('edit') }}</a-button>
              <a-button :loading="busy" @click="preview">{{ t('preview') }}</a-button>
              <a-button :type="dashboard.task.active ? 'default' : 'primary'" :loading="busy" @click="toggleActive">{{ dashboard.task.active ? t('pause') : t('start') }}</a-button>
            </div>
          </div>
          <p class="mandate">{{ dashboard.task.config.brief || t('briefHint') }}</p>
          <div class="task-meta">
            <span>{{ dashboard.task.config.market }} · {{ currency }} · {{ t('budget') }} {{ money(dashboard.task.config.budget) }}</span>
            <span v-if="dashboard.task.schedule">{{ t('nextReview') }} {{ date(dashboard.task.schedule.run_at) }}</span>
          </div>
          <p v-if="dashboard.task.decision_budget" class="task-footnote">{{ t('decisionQuota') }} {{ decisionQuota.used }} / {{ decisionQuota.limit }} · {{ t('quotaReset') }} {{ date(decisionQuota.resets_at) }}</p>
          <p v-if="dashboard.task.config.kind === 'event_portfolio'" class="task-footnote">{{ t('eventHint') }}</p>
          <a-alert :type="risk.halted || risk.stopped_symbols && risk.stopped_symbols.length ? 'warning' : riskFresh ? 'success' : 'info'" show-icon :message="protectionStatus">
            <div slot="description">
              <p v-if="risk.stopped_symbols && risk.stopped_symbols.length">{{ t('stopped') }}: {{ risk.stopped_symbols.join(', ') }}</p>
              <p v-if="risk.monitor_error">{{ risk.monitor_error }}</p>
              <p v-if="current.errors && current.errors.length">{{ dataErrors }}</p>
              <a-tooltip :title="t('resetHint')">
                <a-button v-if="risk.halted || risk.stopped_symbols && risk.stopped_symbols.length" size="small" :disabled="dashboard.task.active || busy" @click="resetRisk">{{ t('reset') }}</a-button>
              </a-tooltip>
            </div>
          </a-alert>
        </section>
        <section class="metrics">
          <div v-for="metric in metrics" :key="metric.key" class="task-panel"><span>{{ t(metric.key) }}</span><strong>{{ metric.value }}</strong></div>
        </section>
        <section class="task-panel">
          <div class="task-heading"><h3>{{ t('return') }}</h3><small>{{ t('lastMark') }}: {{ date(report.as_of) }}</small></div>
          <div v-show="dashboard.series.length" ref="chart" class="equity-chart" />
          <a-empty v-if="!dashboard.series.length" :description="t(dashboard.task.config.execution_mode === 'paper_auto' ? 'noSamples' : 'researchPerformance')" />
          <p class="task-footnote">{{ t('basis') }}</p>
          <p class="task-footnote">{{ t('baseline') }}: {{ (dashboard.performance.symbols || []).join(', ') }} · {{ t('benchmarkStart') }} {{ date(dashboard.performance.benchmark_started_at) }}. {{ t('changedUniverse') }}</p>
        </section>
        <section class="task-panel">
          <h3>{{ t('positions') }}</h3>
          <a-table
            :columns="positionColumns"
            :data-source="current.positions || report.positions || []"
            row-key="symbol"
            :pagination="false"
            :scroll="{ x: 640 }"
            size="small">
            <template slot="numeric" slot-scope="value">{{ money(value) }}</template>
          </a-table>
        </section>
        <section class="task-panel">
          <h3>{{ t('orders') }}</h3>
          <a-table
            :columns="orderColumns"
            :data-source="dashboard.orders"
            row-key="id"
            :pagination="{ pageSize: 8 }"
            :scroll="{ x: 760 }"
            size="small">
            <template slot="symbol" slot-scope="value, row">{{ row.order_spec.symbol }}</template>
            <template slot="side" slot-scope="value, row">{{ t(row.order_spec.side) }}</template>
            <template slot="numeric" slot-scope="value">{{ money(value) }}</template>
            <template slot="date" slot-scope="value">{{ date(value) }}</template>
          </a-table>
        </section>
        <section class="task-panel">
          <h3>{{ t('decisions') }}</h3>
          <a-empty v-if="!dashboard.runs.length" :description="t('noDecision')" />
          <article v-for="run in dashboard.runs" :key="run.id" class="decision-row">
            <div class="task-heading">
              <strong>{{ date(run.created_at) }} · {{ run.status }}</strong>
              <div class="task-actions">
                <a-tag v-if="run.preview">{{ t('previewLabel') }}</a-tag>
                <a-tag v-if="run.result.source === 'deterministic_protection'" color="orange">{{ t('protectiveLabel') }}</a-tag>
                <a-button size="small" @click="showRun(run.id)">{{ t('details') }}</a-button>
                <a-button v-if="['queued', 'researching', 'planned', 'executing'].includes(run.status)" size="small" :disabled="busy" @click="stopRun(run.id)">{{ t('stopRun') }}</a-button>
              </div>
            </div>
            <p>{{ run.phase }}</p>
            <small v-if="run.result.event">{{ t('eventCause') }}: {{ eventLabel(run.result.event.type) }} · {{ date(run.result.event.observed_at) }}</small>
            <small v-if="run.result.research_calls">{{ run.result.research_calls.length }} {{ t('calls') }} · {{ run.result.tool_request_count ?? (run.result.tool_trace || []).length }} {{ t('toolReads') }}</small>
            <p class="decision-summary">{{ run.result.summary || run.draft }}</p>
            <div v-for="(item, index) in run.result.items || []" :key="index" class="decision-item">
              <a-tag>{{ item.symbol }} · {{ item.action }}</a-tag>
              <span>{{ item.reason }}</span><small v-if="item.invalidation">{{ item.invalidation }}</small>
            </div>
            <small v-if="run.result.usage">{{ run.result.usage.provider }} / {{ run.result.usage.model }} · {{ run.result.prompt_version }} · {{ run.result.latency_ms }} ms</small>
          </article>
        </section>
        <section class="task-panel">
          <h3>{{ t('evaluation') }}</h3>
          <p v-if="dashboard.decision_stats">{{ t('recentWindow') }} · {{ dashboard.decision_stats.valid_model_decisions }} {{ t('validDecisions') }} · {{ dashboard.decision_stats.preview_decisions }} {{ t('previewLabel') }} · {{ dashboard.decision_stats.protective_runs }} {{ t('protectiveLabel') }}</p>
          <p class="task-footnote">{{ t('evaluationHint') }}</p>
          <h3>{{ t('usage') }}</h3>
          <p>{{ dashboard.model_usage.recorded_calls }} {{ t('calls') }} · {{ dashboard.model_usage.total_tokens }} {{ t('tokens') }} · {{ dashboard.model_usage.unpriced_calls }} {{ t('unpriced') }}</p>
          <p v-for="(cost, unit) in dashboard.model_usage.estimated_cost_by_currency" :key="unit">{{ unit }} {{ cost.toFixed(6) }}</p>
          <p class="task-footnote">{{ t('usageHint') }}</p>
        </section>
      </main>
      <main v-else class="task-main task-panel"><a-empty :description="loading ? t('refresh') : t('empty')" /></main>
    </div>
    <a-modal
      v-model="editorVisible"
      :title="editingId ? t('edit') : t('new')"
      :width="780"
      :confirm-loading="busy"
      :ok-text="t('save')"
      @ok="save">
      <a-form-model layout="vertical" class="task-form">
        <a-form-model-item :label="t('name')"><a-input v-model="form.name" :max-length="120" /></a-form-model-item>
        <div class="form-grid">
          <a-form-model-item :label="t('account')">
            <a-select v-model="form.config.credential_id"><a-select-option v-for="item in accounts" :key="item.id" :value="item.id">{{ item.name }} · #{{ item.id }}</a-select-option></a-select>
            <small v-if="!accounts.length">{{ t('noAccount') }}</small>
          </a-form-model-item>
          <a-form-model-item :label="t('market')"><a-select v-model="form.config.market"><a-select-option value="USStock">US</a-select-option><a-select-option value="HKStock">HK</a-select-option></a-select></a-form-model-item>
        </div>
        <a-form-model-item :label="t('symbols')"><a-input v-model="symbolsText" placeholder="AAPL, MSFT, NVDA" /></a-form-model-item>
        <a-form-model-item :label="t('brief')"><a-textarea v-model="form.config.brief" :rows="3" :max-length="4000" :placeholder="t('briefHint')" /></a-form-model-item>
        <div class="form-grid">
          <a-form-model-item :label="t('template')"><a-select v-model="form.config.kind"><a-select-option value="daily_portfolio">{{ t('daily') }}</a-select-option><a-select-option value="price_trigger">{{ t('trigger') }}</a-select-option><a-select-option value="event_portfolio">{{ t('eventPortfolio') }}</a-select-option></a-select></a-form-model-item>
          <a-form-model-item :label="t('mode')"><a-select v-model="form.config.execution_mode"><a-select-option value="plan_only">{{ t('research') }}</a-select-option><a-select-option value="paper_auto">{{ t('paper') }}</a-select-option></a-select></a-form-model-item>
        </div>
        <div v-if="form.config.kind === 'daily_portfolio'" class="form-grid">
          <a-form-model-item :label="t('beforeOpen')"><a-input-number v-model="form.config.before_open_minutes" :min="5" :max="180" /></a-form-model-item>
          <a-form-model-item :label="t('afterOpen')"><a-input-number v-model="form.config.execute_after_open_minutes" :min="1" :max="30" /></a-form-model-item>
        </div>
        <div v-else-if="form.config.kind === 'price_trigger'" class="form-grid">
          <a-form-model-item :label="t('trigger')"><a-select v-model="form.config.trigger.type"><a-select-option value="price_above">{{ t('above') }}</a-select-option><a-select-option value="price_below">{{ t('below') }}</a-select-option></a-select></a-form-model-item>
          <a-form-model-item :label="t('price')"><a-input-number v-model="form.config.trigger.price" :min="0.0001" /></a-form-model-item>
          <a-form-model-item :label="t('cooldown')"><a-input-number v-model="form.config.cooldown_seconds" :min="30" :max="86400" /></a-form-model-item>
        </div>
        <div v-if="form.config.kind === 'event_portfolio'" class="form-grid">
          <a-form-model-item :label="t('eventMove')"><a-input-number v-model="eventMove" :min="0.1" :max="50" /></a-form-model-item>
          <a-form-model-item :label="t('cooldown')"><a-input-number v-model="form.config.cooldown_seconds" :min="30" :max="86400" /></a-form-model-item>
          <a-form-model-item><a-checkbox v-model="form.config.events.on_fill">{{ t('onFill') }}</a-checkbox></a-form-model-item>
        </div>
        <div class="form-grid">
          <a-form-model-item v-if="form.config.kind !== 'price_trigger'" :label="t('researchMethod')"><a-select v-model="form.config.research.mode"><a-select-option value="snapshot">{{ t('snapshot') }}</a-select-option><a-select-option value="tool_loop">{{ t('toolLoop') }}</a-select-option></a-select></a-form-model-item>
          <a-form-model-item :label="t('decisionsPerDay')"><a-input-number v-model="form.config.research.max_decisions_per_day" :min="1" :max="100" :precision="0" /></a-form-model-item>
          <a-form-model-item :label="t('outputCap')"><a-input-number v-model="form.config.research.max_output_tokens" :min="700" :max="14000" :precision="0" /></a-form-model-item>
          <template v-if="form.config.kind !== 'price_trigger' && form.config.research.mode === 'tool_loop'">
            <a-form-model-item :label="t('modelCallCap')"><a-input-number v-model="form.config.research.max_model_calls" :min="1" :max="4" :precision="0" /></a-form-model-item>
            <a-form-model-item :label="t('toolCallCap')"><a-input-number v-model="form.config.research.max_tool_requests" :min="1" :max="8" :precision="0" /></a-form-model-item>
          </template>
        </div>
        <p class="task-footnote">{{ t('researchHint') }}</p>
        <div class="form-grid">
          <a-form-model-item :label="t('budget')"><a-input-number v-model="form.config.budget" :min="1" /></a-form-model-item>
          <a-form-model-item :label="t('weight')"><a-input-number v-model="weight" :min="1" :max="100" /></a-form-model-item>
          <a-form-model-item :label="t('reserve')"><a-input-number v-model="reserve" :min="0" :max="95" /></a-form-model-item>
          <a-form-model-item :label="t('orderLimit')"><a-input-number v-model="form.config.max_order_notional" :min="1" /></a-form-model-item>
          <a-form-model-item :label="t('dailyLimit')"><a-input-number v-model="form.config.max_daily_notional" :min="1" /></a-form-model-item>
        </div>
        <a-form-model-item><a-checkbox v-model="form.config.manage_existing">{{ t('adopt') }}</a-checkbox></a-form-model-item>
        <div class="form-grid">
          <a-form-model-item :label="t('model')"><a-select v-model="modelKey"><a-select-option value="">{{ t('defaultModel') }}</a-select-option><a-select-option v-for="item in models" :key="item.provider + ':' + item.model" :value="item.provider + ':' + item.model">{{ item.provider }} / {{ item.model }}</a-select-option></a-select></a-form-model-item>
          <a-form-model-item v-if="selectedModel" :label="t('reasoning')"><a-select v-model="effort"><a-select-option v-for="option in selectedModel.reasoning_options" :key="option" :value="option">{{ option }}</a-select-option></a-select></a-form-model-item>
        </div>
        <a-form-model-item :label="t('protection')"><a-switch v-model="form.config.risk.enabled" /></a-form-model-item>
        <div v-if="form.config.risk.enabled" class="form-grid">
          <a-form-model-item :label="t('stop')"><a-input-number v-model="stopLoss" :min="0.1" :max="50" /></a-form-model-item>
          <a-form-model-item :label="t('dayLoss')"><a-input-number v-model="dailyLoss" :min="0.1" :max="50" /></a-form-model-item>
          <a-form-model-item :label="t('drawdownLimit')"><a-input-number v-model="maxDrawdown" :min="0.1" :max="90" /></a-form-model-item>
        </div>
        <p class="task-footnote">{{ t('protectionHint') }}</p>
        <a-alert type="info" show-icon :message="t('authorizationHint')" />
      </a-form-model>
    </a-modal>
    <a-modal v-model="detailVisible" :title="t('details')" :width="900" :footer="null">
      <template v-if="detail">
        <h3>{{ detail.result.summary || detail.phase }}</h3>
        <a-collapse><a-collapse-panel key="decision" :header="t('rawDecision')"><pre>{{ JSON.stringify(detail.result, null, 2) }}</pre></a-collapse-panel></a-collapse>
        <template v-if="detail.result.tool_trace && detail.result.tool_trace.length">
          <h3>{{ t('toolTrace') }}</h3>
          <article v-for="entry in detail.result.tool_trace" :key="entry.sequence" class="decision-row">
            <strong>#{{ entry.sequence }} · {{ entry.request.tool }} · {{ date(entry.requested_at) }}</strong>
            <pre>{{ JSON.stringify(entry.request.arguments, null, 2) }}</pre>
            <pre>{{ JSON.stringify(entry.result, null, 2) }}</pre>
          </article>
        </template>
        <h3>{{ t('evidence') }}</h3><pre>{{ JSON.stringify(detail.evidence, null, 2) }}</pre>
      </template>
    </a-modal>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { listTasks, getDashboard, getRun, saveTask, setTaskActive, previewTask, cancelRun, resetTaskRisk, getModels } from '@/api/automations'
import { listExchangeCredentials } from '@/api/credentials'

const defaults = () => ({
  name: '',
  config: {
    market: 'USStock',
    kind: 'daily_portfolio',
    execution_mode: 'plan_only',
    credential_id: undefined,
    symbols: [],
    brief: '',
    budget: 1000,
    max_weight: 0.25,
    reserve_ratio: 0.1,
    max_order_notional: 500,
    max_daily_notional: 2000,
    before_open_minutes: 60,
    execute_after_open_minutes: 5,
    cooldown_seconds: 300,
    manage_existing: false,
    research: { mode: 'tool_loop', max_model_calls: 3, max_tool_requests: 6, max_output_tokens: 7000, max_decisions_per_day: 8 },
    events: { price_move_pct: 0.02, on_fill: true },
    trigger: { type: 'price_above', price: 100 },
    risk: { enabled: true, stop_loss_pct: 0.08, max_daily_loss_pct: 0.03, max_drawdown_pct: 0.1 }
  }
})

export default {
  name: 'AgentTasks',
  data () {
    return {
      tasks: [],
      selectedId: null,
      dashboard: null,
      accounts: [],
      models: [],
      loading: false,
      busy: false,
      error: '',
      editorVisible: false,
      editingId: null,
      form: defaults(),
      symbolsText: '',
      weight: 25,
      reserve: 10,
      stopLoss: 8,
      dailyLoss: 3,
      maxDrawdown: 10,
      eventMove: 2,
      modelKey: '',
      effort: 'default',
      detailVisible: false,
      detail: null,
      timer: null,
      chart: null,
      polling: false,
      disposed: false
    }
  },
  computed: {
    decisionQuota () { return this.dashboard && this.dashboard.task.decision_budget || {} },
    isDarkTheme () { return this.$store.getters.theme === 'dark' },
    currency () { return this.dashboard && this.dashboard.task.config.market === 'HKStock' ? 'HKD' : 'USD' },
    current () { return this.dashboard && this.dashboard.performance.latest || {} },
    report () { return this.dashboard && this.dashboard.performance.latest_valid || {} },
    risk () { return this.dashboard && this.dashboard.risk || {} },
    riskFresh () { const age = Date.now() / 1000 - (this.risk.checked_at || 0); return this.risk.healthy && age >= 0 && age <= 90 },
    dataErrors () {
      return [...new Set((this.current.errors || []).map(code => {
        const prefix = String(code).split(':')[0]
        let key = 'quotesMissing'
        if (prefix === 'broker_quantity_mismatch' || prefix === 'oversold') key = 'quantityMismatch'
        else if (prefix === 'fill_price_missing' || prefix === 'baseline_price_missing') key = 'costMissing'
        return this.t(key)
      }))].join(' · ')
    },
    protectionStatus () {
      if (this.dashboard.task.config.execution_mode === 'plan_only') return this.t('researchStatus')
      if (this.risk.halted) return this.t('halted')
      if (this.risk.stopped_symbols && this.risk.stopped_symbols.length) return this.t('symbolHalted')
      if (!this.dashboard.task.config.risk || !this.dashboard.task.config.risk.enabled) return this.t('disabled')
      return this.riskFresh ? this.t('healthy') : this.t('unavailable')
    },
    selectedModel () { return this.models.find(m => `${m.provider}:${m.model}` === this.modelKey) },
    metrics () {
      return [
        { key: 'equity', value: this.money(this.report.equity) + ' ' + this.currency },
        { key: 'return', value: this.percent(this.report.return_pct) },
        { key: 'realized', value: this.money(this.report.realized_pnl) },
        { key: 'unrealized', value: this.money(this.report.unrealized_pnl) },
        { key: 'drawdown', value: this.percent(this.report.max_drawdown_pct) },
        { key: 'fills', value: this.report.filled_order_count ?? '—' }
      ]
    },
    positionColumns () { return this.columns([['symbol', 'symbol'], ['quantity', 'quantity'], ['average_cost', 'cost', 'numeric'], ['price', 'mark', 'numeric'], ['unrealized_pnl', 'unrealized', 'numeric']]) },
    orderColumns () { return this.columns([['order_spec', 'symbol', 'symbol'], ['side', 'side', 'side'], ['status', 'status'], ['filled_qty', 'filled', 'numeric'], ['avg_fill_price', 'fillPrice', 'numeric'], ['updated_at', 'time', 'date']]) }
  },
  watch: {
    modelKey () { if (this.selectedModel && !this.selectedModel.reasoning_options.includes(this.effort)) this.effort = 'default' },
    isDarkTheme () { this.drawChart() }
  },
  async mounted () {
    await this.refresh()
    if (this.disposed) return
    this.timer = setInterval(this.poll, 5000)
    window.addEventListener('resize', this.resizeChart)
  },
  beforeDestroy () {
    this.disposed = true
    clearInterval(this.timer)
    window.removeEventListener('resize', this.resizeChart)
    if (this.chart) this.chart.dispose()
  },
  methods: {
    eventLabel (type) { return this.t({ initial_observation: 'initialEvent', fills_changed: 'fillEvent', price_movement: 'moveEvent' }[type] || 'eventCause') },
    t (key) { return this.$t('agentTasks.' + key) },
    money (value) { return value === null || value === undefined || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) },
    percent (value) { return value === null || value === undefined ? '—' : Number(value).toFixed(2) + '%' },
    date (value) { if (!value) return '—'; const date = new Date(typeof value === 'number' ? value * 1000 : value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString() },
    columns (items) { return items.map(([dataIndex, key, slot]) => ({ title: this.t(key), dataIndex, key, ...(slot ? { scopedSlots: { customRender: slot } } : {}) })) },
    async refresh () {
      this.loading = true
      try {
        this.tasks = await listTasks()
        if (!this.selectedId && this.tasks.length) this.selectedId = this.tasks[0].id
        await this.loadDashboard()
        this.error = ''
      } catch (e) { this.error = e.message || this.t('error') } finally { this.loading = false }
    },
    async select (id) {
      if (this.chart) { this.chart.dispose(); this.chart = null }
      this.selectedId = id
      this.dashboard = null
      try { await this.loadDashboard(); this.error = '' } catch (e) { this.error = e.message || this.t('error') }
    },
    async loadDashboard () {
      const id = this.selectedId
      if (!id) return
      const value = await getDashboard(id)
      if (id !== this.selectedId || this.disposed) return
      this.dashboard = value
      this.tasks = this.tasks.map(t => t.id === id ? value.task : t)
      await this.$nextTick()
      this.drawChart()
    },
    async poll () {
      if (this.polling || this.loading || document.hidden) return
      this.polling = true
      try { await this.loadDashboard(); this.error = '' } catch (e) { this.error = this.t('error') } finally { this.polling = false }
    },
    async action (fn) {
      if (this.busy) return
      this.busy = true
      try { await fn(); await this.refresh() } catch (e) { this.$message.error(e.message || this.t('error')) } finally { this.busy = false }
    },
    preview () { this.action(() => previewTask(this.selectedId)) },
    toggleActive () { this.action(() => setTaskActive(this.selectedId, !this.dashboard.task.active)) },
    stopRun (id) { this.action(() => cancelRun(id)) },
    resetRisk () { this.action(() => resetTaskRisk(this.selectedId)) },
    async openEditor (task) {
      this.editingId = task && task.id
      const value = defaults()
      if (task) {
        value.name = task.name
        value.config = { ...value.config, ...JSON.parse(JSON.stringify(task.config)) }
        value.config.research = { ...defaults().config.research, mode: 'snapshot', ...(task.config.research || {}) }
        value.config.events = { ...defaults().config.events, ...(task.config.events || {}) }
        if (!task.config.risk) value.config.risk.enabled = false
      }
      this.form = value
      const c = value.config
      this.symbolsText = c.symbols.join(', ')
      this.weight = c.max_weight * 100
      this.reserve = c.reserve_ratio * 100
      this.stopLoss = c.risk.stop_loss_pct * 100
      this.dailyLoss = c.risk.max_daily_loss_pct * 100
      this.maxDrawdown = c.risk.max_drawdown_pct * 100
      this.eventMove = c.events.price_move_pct * 100
      this.modelKey = c.llm_selection && c.llm_selection.provider ? `${c.llm_selection.provider}:${c.llm_selection.model}` : ''
      this.effort = c.llm_selection && c.llm_selection.reasoning_effort || 'default'
      this.editorVisible = true
      const results = await Promise.allSettled([listExchangeCredentials(), getModels()])
      if (results[0].status === 'fulfilled' && results[0].value.code === 1) this.accounts = results[0].value.data.items.filter(a => a.exchange_id === 'futu' && a.environment === 'demo')
      else this.$message.error(this.t('noAccount'))
      if (results[1].status === 'fulfilled') this.models = results[1].value.items.filter(m => ['openai', 'deepseek', 'volcengine'].includes(m.provider))
    },
    save () {
      if (this.modelKey && !this.selectedModel) { this.$message.error(this.t('modelUnavailable')); return }
      const config = {
        ...this.form.config,
        research: { ...this.form.config.research, mode: this.form.config.kind === 'price_trigger' ? 'snapshot' : this.form.config.research.mode },
        events: { ...this.form.config.events, price_move_pct: this.eventMove / 100 },
        symbols: this.symbolsText.split(/[,，\s]+/).filter(Boolean),
        max_weight: this.weight / 100,
        reserve_ratio: this.reserve / 100,
        risk: {
          enabled: this.form.config.risk.enabled,
          stop_loss_pct: this.stopLoss / 100,
          max_daily_loss_pct: this.dailyLoss / 100,
          max_drawdown_pct: this.maxDrawdown / 100
        },
        llm_selection: this.selectedModel ? { provider: this.selectedModel.provider, model: this.selectedModel.model, reasoning_effort: this.effort } : {}
      }
      if (!this.form.name.trim() || !config.credential_id || !config.symbols.length) { this.$message.error(this.t('required')); return }
      this.action(async () => {
        const row = await saveTask(this.editingId, { name: this.form.name, config })
        this.selectedId = row.id
        this.editorVisible = false
      })
    },
    async showRun (id) {
      try { this.detail = await getRun(id); this.detailVisible = true } catch (e) { this.$message.error(e.message) }
    },
    resizeChart () { if (this.chart) this.chart.resize() },
    drawChart () {
      if (!this.$refs.chart || !this.dashboard) return
      if (!this.dashboard.series.length) {
        if (this.chart) { this.chart.dispose(); this.chart = null }
        return
      }
      if (!this.chart) this.chart = echarts.init(this.$refs.chart)
      const color = this.isDarkTheme ? '#aeb8c8' : '#586477'
      const series = this.dashboard.series
      this.chart.setOption({
        backgroundColor: 'transparent',
        animation: false,
        color: ['#3b82f6', '#94a3b8'],
        tooltip: { trigger: 'axis', valueFormatter: value => value === null ? '—' : Number(value).toFixed(2) + '%' },
        legend: { top: 0, data: [this.t('return'), this.t('baseline')], textStyle: { color } },
        grid: { left: 55, right: 20, top: 42, bottom: 35 },
        xAxis: { type: 'time', axisLabel: { color }, axisLine: { lineStyle: { color } } },
        yAxis: { type: 'value', axisLabel: { formatter: '{value}%', color }, splitLine: { lineStyle: { color: this.isDarkTheme ? '#283344' : '#edf0f5' } } },
        series: [
          { name: this.t('return'), type: 'line', showSymbol: series.length === 1, data: series.map(s => [s.report.as_of * 1000, s.report.return_pct]) },
          { name: this.t('baseline'), type: 'line', showSymbol: series.length === 1, lineStyle: { type: 'dashed' }, data: series.map(s => [s.report.as_of * 1000, s.report.benchmark_return_pct]) }
        ]
      }, true)
      this.chart.resize()
    }
  }
}
</script>

<style scoped lang="less">
.agent-tasks { padding: 24px; color: #243147; --panel: #fff; --line: #e4e9f0; --muted: #68758a; --selected: #eef5ff; }
.theme-dark { color: #e3eaf4; --panel: #182233; --line: #2a3649; --muted: #a5b1c4; --selected: #22334d; }
.task-header, .task-heading { display: flex; justify-content: space-between; gap: 16px; align-items: center; flex-wrap: wrap; }
.task-header { margin-bottom: 24px; }
h1, h2, h3 { color: inherit; margin: 0 0 10px; }
h1 { font-size: 24px; } h2 { font-size: 21px; } h3 { font-size: 16px; }
p { margin: 0 0 12px; } .task-header p, .task-meta, .task-footnote, small { color: var(--muted); }
.task-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.task-workspace { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 20px; }
.task-rail { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 10px; align-self: start; }
.task-row { display: flex; width: 100%; flex-direction: column; text-align: start; gap: 8px; padding: 16px 12px; border: 0; background: transparent; color: inherit; border-radius: 8px; cursor: pointer; margin-bottom: 6px; }
.task-row.selected { background: var(--selected); } .task-row span { overflow-wrap: anywhere; font-size: 12px; }
.task-row small { font-size: 11px; } .task-row i { display: inline-block; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; background: #94a3b8; }
.task-row i.running { background: #22c55e; }
.task-main { min-width: 0; } .task-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 22px; margin-bottom: 16px; }
.task-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; font-size: 12px; }
.mandate { white-space: pre-wrap; line-height: 1.7; } .metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.metrics .task-panel { padding: 18px; } .metrics span { font-size: 12px; color: var(--muted); } .metrics strong { display: block; font-size: 23px; margin-top: 8px; }
.equity-chart { height: 280px; width: 100%; } .task-footnote { font-size: 12px; line-height: 1.7; margin-top: 12px; }
.decision-row { padding: 18px 0; border-bottom: 1px solid var(--line); } .decision-row:last-child { border-bottom: 0; }
.decision-summary { white-space: pre-wrap; line-height: 1.7; } .decision-item { padding: 6px 0; } .decision-item small { display: block; margin-top: 6px; }
.task-notice { margin-bottom: 16px; } .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 18px; }
.task-form .ant-input-number { width: 100%; } pre { max-height: 420px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; background: #f4f6f9; padding: 16px; }
@media (max-width: 1050px) { .task-workspace { grid-template-columns: 190px minmax(0, 1fr); gap: 12px; } .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .agent-tasks { padding: 12px; } .task-workspace { display: block; } .task-rail { display: flex; overflow-x: auto; gap: 8px; margin-bottom: 12px; } .task-row { min-width: 190px; } .task-panel { padding: 16px; } .form-grid { grid-template-columns: 1fr; } }
</style>
