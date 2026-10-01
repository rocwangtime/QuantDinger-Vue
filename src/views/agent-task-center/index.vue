<template>
  <div class="agent-task-center qd-workspace-page" :class="{ 'theme-dark': isDarkTheme }">
    <header class="task-header">
      <div>
        <span class="eyebrow">{{ copy.eyebrow }}</span>
        <h1>{{ copy.title }}</h1>
        <p>{{ copy.subtitle }}</p>
      </div>
      <a-button icon="reload" :loading="loading" @click="loadAll">{{ copy.refresh }}</a-button>
    </header>

    <a-alert v-if="loadError" type="warning" show-icon :message="copy.loadError" class="task-alert" />

    <section class="task-summary" :aria-label="copy.statusTitle">
      <div><span>{{ copy.activeResearch }}</span><strong>{{ activeMonitors.length }}</strong></div>
      <div><span>{{ copy.pausedResearch }}</span><strong>{{ pausedMonitors.length }}</strong></div>
      <div><span>{{ copy.runningStrategies }}</span><strong>{{ runningStrategies.length }}</strong></div>
      <div class="summary-safety"><a-icon type="safety-certificate" /><span>{{ copy.safetySummary }}</span></div>
    </section>

    <section class="task-section">
      <div class="section-heading"><div><h2>{{ copy.startTitle }}</h2><p>{{ copy.startHint }}</p></div></div>
      <div class="entry-grid">
        <button type="button" @click="openDiscovery">
          <a-icon type="radar-chart" /><strong>{{ copy.discover }}</strong><span>{{ copy.discoverDesc }}</span><em>{{ copy.openResearch }} →</em>
        </button>
        <button type="button" @click="openResearch">
          <a-icon type="search" /><strong>{{ copy.research }}</strong><span>{{ copy.researchDesc }}</span><em>{{ copy.openResearch }} →</em>
        </button>
        <button type="button" @click="openStrategyDraft">
          <a-icon type="experiment" /><strong>{{ copy.build }}</strong><span>{{ copy.buildDesc }}</span><em>{{ copy.openResearch }} →</em>
        </button>
        <button type="button" @click="openRuntime()">
          <a-icon type="fund" /><strong>{{ copy.review }}</strong><span>{{ copy.reviewDesc }}</span><em>{{ copy.openRuntime }} →</em>
        </button>
      </div>
    </section>

    <div class="task-columns">
      <section class="task-section">
        <div class="section-heading">
          <div><h2>{{ copy.monitorTitle }}</h2><p>{{ copy.monitorHint }}</p></div>
          <a-button type="primary" icon="plus" :disabled="!watchlist.length" @click="openCreateMonitor">{{ copy.createMonitor }}</a-button>
        </div>
        <a-alert type="info" show-icon :message="copy.monitorBoundary" class="task-alert" />
        <div v-if="!researchMonitors.length" class="task-empty">
          {{ copy.noMonitors }}
          <a-button type="link" @click="openResearch">{{ copy.openResearch }}</a-button>
        </div>
        <div v-for="monitor in researchMonitors" :key="monitor.id" class="task-row">
          <div class="task-row-main">
            <div class="task-row-title"><strong>{{ monitor.name || monitorTarget(monitor) }}</strong><span :class="monitor.is_active ? 'status-active' : 'status-paused'">{{ monitor.is_active ? copy.active : copy.paused }}</span></div>
            <p>{{ monitorTarget(monitor) }} · {{ copy.every }} {{ monitorInterval(monitor) }} · {{ copy.runs }} {{ monitor.run_count || 0 }}</p>
            <small>{{ copy.lastRun }} {{ displayTime(monitor.last_run_at) }} · {{ monitorResult(monitor) }}<template v-if="monitor.is_active"> · {{ copy.nextRun }} {{ displayTime(monitor.next_run_at) }}</template></small>
          </div>
          <a-button v-if="monitor.is_active" size="small" icon="pause" :loading="updatingId === monitor.id" @click="toggleMonitor(monitor)">{{ copy.pause }}</a-button>
          <a-popconfirm v-else :title="copy.enableConfirm" :ok-text="copy.enable" :cancel-text="copy.cancel" @confirm="toggleMonitor(monitor)">
            <a-button size="small" icon="caret-right" :loading="updatingId === monitor.id">{{ copy.enable }}</a-button>
          </a-popconfirm>
        </div>
      </section>

      <div class="task-aside">
        <section class="task-section">
          <div class="section-heading"><div><h2>{{ copy.universeTitle }}</h2><p>{{ copy.universeHint }}</p></div></div>
          <div v-if="!watchlist.length" class="task-empty">{{ copy.noWatchlist }}</div>
          <div v-else class="watch-tags"><button v-for="item in watchlist.slice(0, 12)" :key="`${item.market}:${item.symbol}`" type="button" @click="researchWatch(item)">{{ item.symbol }} <span>{{ item.market }}</span></button></div>
          <a-button type="link" class="section-link" @click="openResearch">{{ copy.manageUniverse }} →</a-button>
        </section>

        <section class="task-section">
          <div class="section-heading"><div><h2>{{ copy.executionTitle }}</h2><p>{{ copy.executionHint }}</p></div></div>
          <div v-if="!strategies.length" class="task-empty">{{ copy.noStrategies }}</div>
          <div v-for="strategy in strategies.slice(0, 5)" :key="strategy.id" class="strategy-row">
            <div><strong>{{ strategy.strategy_name || `#${strategy.id}` }}</strong><small>{{ strategyStatus(strategy) }}</small></div>
            <a-button size="small" type="link" @click="openRuntime(strategy.id)">{{ copy.details }} →</a-button>
          </div>
          <a-button type="link" class="section-link" @click="openRuntime()">{{ copy.allStrategies }} →</a-button>
          <div class="permission-note"><a-icon type="lock" />{{ copy.executionBoundary }}</div>
          <a-button type="link" class="section-link" @click="openAccounts">{{ copy.manageAccounts }} →</a-button>
        </section>
      </div>
    </div>

    <a-modal
      v-model="createVisible"
      :title="copy.createMonitor"
      :ok-text="copy.createPaused"
      :cancel-text="copy.cancel"
      :confirm-loading="creating"
      :ok-button-props="{ props: { disabled: !selectedWatchKey } }"
      @ok="createMonitor"
    >
      <a-form layout="vertical">
        <a-form-item :label="copy.target"><a-select v-model="selectedWatchKey" :placeholder="copy.chooseTarget"><a-select-option v-for="item in watchlist" :key="`${item.market}:${item.symbol}`" :value="`${item.market}:${item.symbol}`">{{ item.market }} · {{ item.symbol }} {{ item.name || '' }}</a-select-option></a-select></a-form-item>
        <a-form-item :label="copy.interval"><a-select v-model="intervalMinutes"><a-select-option :value="60">1 {{ copy.hour }}</a-select-option><a-select-option :value="240">4 {{ copy.hours }}</a-select-option><a-select-option :value="720">12 {{ copy.hours }}</a-select-option><a-select-option :value="1440">1 {{ copy.day }}</a-select-option></a-select></a-form-item>
        <a-alert type="info" show-icon :message="copy.createBoundary" />
      </a-form>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getMonitors, addMonitor, updateMonitor } from '@/api/portfolio'
import { getWatchlist } from '@/api/market'
import { getStrategyList } from '@/api/strategy'

const words = {
  zh: {
    eyebrow: 'AGENT 工作台', title: '任务中心', subtitle: '从机会发现到模拟运行，查看任务状态并决定下一步。', refresh: '刷新', loadError: '部分任务数据未能加载，请刷新后核对。', statusTitle: '任务状态', activeResearch: '运行中的定时研究', pausedResearch: '已暂停的定时研究', runningStrategies: '运行中的策略', safetySummary: '研究任务不会下单；交易权限在账户与策略运行中独立控制。', startTitle: '开始一项工作', startHint: '选择目标，Agent 的产物会引导你进入下一阶段。', discover: '挖掘机会', discoverDesc: '从观察范围筛选值得进一步研究的标的', research: '研究标的', researchDesc: '追问行情、事件、风险与数据依据', build: '开发策略', buildDesc: '把想法写成可回测的策略草稿', review: '运行与复盘', reviewDesc: '检查策略状态、订单和交易记录', openResearch: '打开 AI 投研', openRuntime: '打开策略运行', monitorTitle: '定时研究任务', monitorHint: '按固定间隔分析观察名单中的标的；事件触发暂未接入。', createMonitor: '新建定时研究', monitorBoundary: '这里只进行 AI 分析与通知，不会产生交易订单。', noMonitors: '暂无定时研究任务。', active: '运行中', paused: '已暂停', every: '每', runs: '已运行', lastRun: '上次运行', nextRun: '下次计划', pause: '暂停', enable: '启用', enableConfirm: '启用后系统将按计划自动分析，可能消耗 AI 额度；确认启用？', cancel: '取消', never: '尚未运行', noResult: '暂无结果', success: '完成', skipped: '跳过', failed: '失败', universeTitle: '观察范围', universeHint: '作为机会筛选和定时研究的输入。', noWatchlist: '观察名单为空。先到 AI 投研添加标的。', manageUniverse: '管理观察名单', executionTitle: '策略运行', executionHint: '与定时研究分开管理。', noStrategies: '暂无策略运行记录。', details: '详情', allStrategies: '查看全部策略', manageAccounts: '管理模拟账户与授权', executionBoundary: '模拟账户选择、交易授权、风控和暂停操作均在账户及策略运行页面完成。', createPaused: '创建为暂停', target: '观察标的', chooseTarget: '从观察名单选择', interval: '分析间隔', hour: '小时', hours: '小时', day: '天', createBoundary: '新任务默认暂停。这里只支持固定间隔研究，不支持事件触发或自动下单。', created: '定时研究任务已创建（暂停）', updated: '任务状态已更新', actionError: '操作失败，请重试。'
  },
  en: {
    eyebrow: 'AGENT WORKSPACE', title: 'Task Center', subtitle: 'Track work from opportunity discovery to paper execution and choose the next step.', refresh: 'Refresh', loadError: 'Some task data could not be loaded. Refresh to verify.', statusTitle: 'Task status', activeResearch: 'Active research schedules', pausedResearch: 'Paused research schedules', runningStrategies: 'Running strategies', safetySummary: 'Research schedules never place orders. Trading authorization is managed separately.', startTitle: 'Start work', startHint: 'Choose an outcome and continue through the resulting workflow.', discover: 'Discover opportunities', discoverDesc: 'Screen your watchlist for research candidates', research: 'Research a symbol', researchDesc: 'Examine market data, events, risks and evidence', build: 'Develop a strategy', buildDesc: 'Turn an idea into a backtestable draft', review: 'Run and review', reviewDesc: 'Inspect strategy status, orders and fills', openResearch: 'Open AI Research', openRuntime: 'Open Strategy Run', monitorTitle: 'Scheduled research', monitorHint: 'Analyze watchlist symbols at fixed intervals; event triggers are not yet available.', createMonitor: 'New research schedule', monitorBoundary: 'These tasks only analyze and notify; they never place orders.', noMonitors: 'No scheduled research tasks yet.', active: 'Active', paused: 'Paused', every: 'Every', runs: 'Runs', lastRun: 'Last run', nextRun: 'Next planned', pause: 'Pause', enable: 'Enable', enableConfirm: 'This task may consume AI credits when scheduled. Enable it?', cancel: 'Cancel', never: 'Never', noResult: 'No result', success: 'Completed', skipped: 'Skipped', failed: 'Failed', universeTitle: 'Observation universe', universeHint: 'Input for discovery and scheduled research.', noWatchlist: 'Your watchlist is empty. Add a symbol in AI Research.', manageUniverse: 'Manage watchlist', executionTitle: 'Strategy run', executionHint: 'Managed separately from research schedules.', noStrategies: 'No strategy runs yet.', details: 'Details', allStrategies: 'View all strategies', manageAccounts: 'Manage paper accounts and authorization', executionBoundary: 'Paper account selection, authorization, risk limits and pausing are managed in Accounts and Strategy Run.', createPaused: 'Create paused', target: 'Watchlist symbol', chooseTarget: 'Select from watchlist', interval: 'Analysis interval', hour: 'hour', hours: 'hours', day: 'day', createBoundary: 'New tasks start paused. Only fixed-interval research is supported here; no event trigger or order execution.', created: 'Research schedule created (paused)', updated: 'Task status updated', actionError: 'Action failed. Please retry.'
  }
}

export default {
  name: 'AgentTaskCenter',
  data () {
    return { loading: false, loadError: false, monitors: [], watchlist: [], strategies: [], updatingId: null, createVisible: false, creating: false, selectedWatchKey: undefined, intervalMinutes: 240 }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () { return this.navTheme === 'dark' || this.navTheme === 'realdark' },
    copy () { return String(this.$i18n && this.$i18n.locale || '').toLowerCase().startsWith('zh') ? words.zh : words.en },
    researchMonitors () { return this.monitors.filter(item => item.monitor_type === 'ai') },
    activeMonitors () { return this.researchMonitors.filter(item => item.is_active) },
    pausedMonitors () { return this.researchMonitors.filter(item => !item.is_active) },
    runningStrategies () { return this.strategies.filter(item => String(item.status || '').toLowerCase() === 'running') }
  },
  mounted () { this.loadAll() },
  activated () { this.loadAll() },
  methods: {
    async loadAll () {
      if (this.loading) return
      this.loading = true
      this.loadError = false
      const results = await Promise.allSettled([getMonitors(), getWatchlist(), getStrategyList()])
      const value = index => {
        const result = results[index]
        if (result.status !== 'fulfilled' || !result.value || result.value.code !== 1) {
          this.loadError = true
          return []
        }
        const data = result.value.data
        if (Array.isArray(data)) return data
        if (index === 1 && data && Array.isArray(data.watchlist)) return data.watchlist
        return []
      }
      this.monitors = value(0)
      this.watchlist = value(1).filter(item => item && item.market && item.symbol)
      this.strategies = value(2)
      this.loading = false
    },
    monitorTarget (monitor) {
      const config = monitor.config || {}
      return [config.market, config.symbol].filter(Boolean).join(':') || '—'
    },
    monitorInterval (monitor) {
      const config = monitor.config || {}
      const minutes = Number(config.run_interval_minutes || config.interval_minutes || 60)
      if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`
      if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`
      return `${minutes}m`
    },
    monitorResult (monitor) {
      if (!monitor.last_run_at) return this.copy.noResult
      const result = monitor.last_result || {}
      return result.skipped ? this.copy.skipped : result.success ? this.copy.success : this.copy.failed
    },
    displayTime (value) { return value ? String(value).replace('T', ' ').slice(0, 19) : this.copy.never },
    strategyStatus (strategy) { return String(strategy.status || '—') },
    openResearch () { this.$router.push('/ai-asset-analysis') },
    openDiscovery () { this.$router.push({ path: '/ai-asset-analysis', query: { scope: 'watchlist', copilotPrompt: this.copy === words.zh ? '请从我的观察名单中筛选值得进一步研究的机会，说明所用数据及其时效、筛选依据和风险；不要下单。' : 'Screen my watchlist for research opportunities. Explain data sources, freshness, selection criteria, and risks. Do not place orders.' } }) },
    openStrategyDraft () { this.$router.push({ path: '/ai-asset-analysis', query: { scope: 'unbound', copilotPrompt: this.copy === words.zh ? '请帮我把交易想法整理成可回测的 QuantDinger Strategy API V2 策略。先确认市场、标的、周期、入场、退出与风控条件；不要启动交易。' : 'Help turn my idea into a backtestable QuantDinger Strategy API V2 draft. First clarify market, symbol, timeframe, entry, exit, and risk rules. Do not start trading.' } }) },
    openRuntime (id) { this.$router.push({ path: '/strategy-center', query: id ? { strategyId: id } : {} }) },
    openAccounts () { this.$router.push('/broker-accounts') },
    researchWatch (item) { this.$router.push({ path: '/ai-asset-analysis', query: { market: item.market, symbol: item.symbol, copilotPrompt: this.copy === words.zh ? `研究 ${item.market}:${item.symbol} 的近期机会与风险，请注明数据时效和依据，不要下单。` : `Research opportunities and risks for ${item.market}:${item.symbol}. Cite data freshness and evidence. Do not place orders.` } }) },
    openCreateMonitor () { this.selectedWatchKey = undefined; this.intervalMinutes = 240; this.createVisible = true },
    async createMonitor () {
      const item = this.watchlist.find(watch => `${watch.market}:${watch.symbol}` === this.selectedWatchKey)
      if (!item || this.creating) return
      this.creating = true
      try {
        const result = await addMonitor({
          name: `AI-${item.symbol}-${this.intervalMinutes}m`,
          position_ids: [],
          monitor_type: 'ai',
          config: { market: item.market, symbol: item.symbol, run_interval_minutes: this.intervalMinutes, language: this.$i18n.locale },
          notification_config: { channels: ['browser'] },
          is_active: false
        })
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        this.createVisible = false
        this.$message.success(this.copy.created)
        await this.loadAll()
      } catch (error) {
        this.$message.error((error && error.message) || this.copy.actionError)
      } finally { this.creating = false }
    },
    async toggleMonitor (monitor) {
      if (this.updatingId) return
      this.updatingId = monitor.id
      try {
        const result = await updateMonitor(monitor.id, { is_active: !monitor.is_active })
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        this.$message.success(this.copy.updated)
        await this.loadAll()
      } catch (error) {
        this.$message.error((error && error.message) || this.copy.actionError)
      } finally { this.updatingId = null }
    }
  }
}
</script>

<style scoped>
.agent-task-center { --task-bg: #f3f6f9; --task-card: #fff; --task-text: #17222a; --task-muted: #687780; --task-border: #dce4e9; --task-accent: #169c60; min-height: calc(100vh - 88px); padding: 28px 34px 48px; background: var(--task-bg); color: var(--task-text); }
.agent-task-center.theme-dark { --task-bg: #0b0f12; --task-card: #141a1e; --task-text: #edf3f0; --task-muted: #9ca9a5; --task-border: #2d3835; --task-accent: #59cc82; }
.task-header, .section-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.task-header { margin-bottom: 22px; }
.task-header h1 { margin: 3px 0 4px; color: var(--task-text); font-size: 27px; font-weight: 600; }
.task-header p, .section-heading p { margin: 0; color: var(--task-muted); }
.eyebrow { color: var(--task-accent); font-size: 12px; letter-spacing: .1em; }
.task-alert { margin: 12px 0; }
.task-summary { display: grid; grid-template-columns: repeat(3, minmax(120px, 1fr)) minmax(230px, 1.4fr); gap: 12px; margin-bottom: 26px; }
.task-summary > div, .task-section { border: 1px solid var(--task-border); border-radius: 12px; background: var(--task-card); }
.task-summary > div { display: flex; flex-direction: column; padding: 17px 20px; }
.task-summary span { color: var(--task-muted); }
.task-summary strong { margin-top: 6px; color: var(--task-text); font-size: 25px; line-height: 1.2; }
.task-summary .summary-safety { flex-direction: row; align-items: center; gap: 10px; }
.summary-safety .anticon { color: var(--task-accent); font-size: 22px; }
.task-section { padding: 20px; margin-bottom: 16px; }
.section-heading { align-items: flex-start; margin-bottom: 16px; }
.section-heading h2 { margin: 0 0 3px; color: var(--task-text); font-size: 18px; font-weight: 600; }
.entry-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.entry-grid button { display: flex; flex-direction: column; align-items: flex-start; min-height: 145px; padding: 18px; border: 1px solid var(--task-border); border-radius: 10px; background: var(--task-bg); color: var(--task-text); text-align: left; cursor: pointer; }
.entry-grid button:hover, .watch-tags button:hover { border-color: var(--task-accent); }
.entry-grid .anticon { margin-bottom: 12px; color: var(--task-accent); font-size: 19px; }
.entry-grid strong { font-size: 16px; }
.entry-grid span { margin-top: 6px; color: var(--task-muted); line-height: 1.45; }
.entry-grid em { margin-top: auto; padding-top: 10px; color: var(--task-accent); font-style: normal; }
.task-columns { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); align-items: start; gap: 16px; }
.task-empty { padding: 24px 8px; color: var(--task-muted); }
.task-row, .strategy-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid var(--task-border); }
.task-row-main { min-width: 0; }
.task-row-title { display: flex; align-items: center; gap: 9px; }
.task-row-title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.task-row-title span { padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.status-active { color: var(--task-accent); background: rgba(35, 163, 98, .13); }
.status-paused { color: var(--task-muted); background: var(--task-bg); }
.task-row p { margin: 5px 0 2px; color: var(--task-muted); }
.task-row small, .strategy-row small { display: block; color: var(--task-muted); }
.watch-tags { display: flex; flex-wrap: wrap; gap: 7px; }
.watch-tags button { padding: 6px 9px; border: 1px solid var(--task-border); border-radius: 6px; background: var(--task-bg); color: var(--task-text); cursor: pointer; }
.watch-tags span { margin-left: 4px; color: var(--task-muted); font-size: 11px; }
.section-link { padding-left: 0; }
.strategy-row strong { display: block; }
.permission-note { display: flex; gap: 8px; margin-top: 12px; padding: 12px; border-radius: 7px; background: var(--task-bg); color: var(--task-muted); line-height: 1.5; }
.permission-note .anticon { flex: none; margin-top: 3px; color: var(--task-accent); }
@media (max-width: 1050px) { .task-summary { grid-template-columns: repeat(3, 1fr); } .summary-safety { grid-column: 1 / -1; } .entry-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 760px) { .agent-task-center { padding: 18px 14px 34px; } .task-columns { grid-template-columns: 1fr; } .task-summary { grid-template-columns: repeat(2, 1fr); } .task-header { align-items: flex-start; } }
@media (max-width: 480px) { .entry-grid, .task-summary { grid-template-columns: 1fr; } .section-heading { flex-wrap: wrap; } .entry-grid button { min-height: 120px; } }
</style>
