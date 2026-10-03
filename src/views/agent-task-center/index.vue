<template>
  <div class="agent-task-center qd-workspace-page" :class="{ 'theme-dark': isDarkTheme }">
    <header class="task-header">
      <div>
        <span class="eyebrow">{{ monitorMode ? (copy === wordsZh ? 'EVENT-DRIVEN AGENT' : 'EVENT-DRIVEN AGENT') : copy.eyebrow }}</span>
        <h1>{{ monitorMode ? (copy === wordsZh ? 'AI 盯盘' : 'AI Monitoring') : copy.title }}</h1>
        <p>{{ monitorMode ? (copy === wordsZh ? '配置触发条件，让 Agent 定时复查并留下可审阅的机会线索。' : 'Configure triggers, re-run Agent research, and review opportunity leads.') : copy.subtitle }}</p>
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

    <section v-if="monitorMode" class="task-section monitor-workflow">
      <div class="section-heading"><div><h2>{{ copy === wordsZh ? '事件驱动工作流' : 'Event-driven workflow' }}</h2><p>{{ copy === wordsZh ? '目前只开放研究环节；自动下单链路尚未接入。' : 'Research stages are available; automatic order execution is not connected yet.' }}</p></div></div>
      <div class="workflow-steps">
        <div><strong>01 · {{ copy === wordsZh ? '触发检查' : 'Trigger check' }}</strong><span>{{ copy === wordsZh ? '定时 / 价位 / 交易时段' : 'Schedule / price / market session' }}</span></div>
        <div><strong>02 · {{ copy === wordsZh ? 'Agent 分析' : 'Agent analysis' }}</strong><span>{{ copy === wordsZh ? '研究简报与模型随任务保存' : 'Brief and model saved with each task' }}</span></div>
        <div><strong>03 · {{ copy === wordsZh ? '机会线索' : 'Research lead' }}</strong><span>{{ copy === wordsZh ? '可审阅并生成策略候选' : 'Review and draft a strategy candidate' }}</span></div>
        <div class="workflow-disabled"><strong>04 · {{ copy === wordsZh ? '模拟交易' : 'Paper execution' }}</strong><span>{{ copy === wordsZh ? '未联动；不会自动下单' : 'Not connected; no automatic orders' }}</span></div>
      </div>
      <p class="workflow-note">{{ copy === wordsZh ? '新闻热点触发也尚未接入。后续需把可信事件、交易意图、风险门禁和账户授权串起来，才能开放自动执行。' : 'News-event triggers are not connected yet. Trusted events, trade intents, risk gates and account authorization must be linked before automatic execution can be enabled.' }}</p>
    </section>

    <section v-if="!monitorMode" class="task-section">
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

    <section class="task-section opportunity-section">
      <div class="section-heading">
        <div><h2>{{ copy.opportunityTitle }}</h2><p>{{ copy.opportunityHint }}</p></div>
        <a-radio-group v-model="opportunityFilter" size="small" @change="loadOpportunities">
          <a-radio-button value="new">{{ copy.opportunityNew }}</a-radio-button>
          <a-radio-button value="reviewed">{{ copy.opportunityReviewed }}</a-radio-button>
          <a-radio-button value="dismissed">{{ copy.opportunityDismissed }}</a-radio-button>
        </a-radio-group>
      </div>
      <a-alert type="info" show-icon :message="copy.opportunityBoundary" class="task-alert" />
      <a-spin :spinning="loadingOpportunities">
        <div v-if="!opportunities.length" class="task-empty">{{ copy.noOpportunities }}</div>
        <div v-for="lead in opportunities" :key="lead.id" class="opportunity-row">
          <div class="task-row-main">
            <strong>{{ lead.market }}:{{ lead.symbol }} · {{ lead.analysis && lead.analysis.final_decision }}</strong>
            <small>{{ copy.researchSource }} #{{ lead.run_id }} · {{ displayTime(lead.run_created_at) }}<template v-if="lead.analysis && lead.analysis.confidence != null"> · {{ lead.analysis.confidence }}%</template></small>
            <p v-if="lead.analysis && lead.analysis.reasoning">{{ lead.analysis.reasoning }}</p>
          </div>
          <div class="task-row-actions">
            <a-popconfirm v-if="candidateFor(opportunityRun(lead), lead.analysis)" :title="copy.candidateConfirm" :ok-text="copy.generateCandidate" :cancel-text="copy.cancel" @confirm="generateCandidate(opportunityRun(lead), lead.analysis, lead.monitor_id)">
              <a-button size="small" type="primary" ghost :loading="candidateLoadingKey === `${lead.run_id}:${lead.market}:${lead.symbol}`">{{ copy.generateCandidate }}</a-button>
            </a-popconfirm>
            <a-button v-if="lead.status === 'new'" size="small" :loading="updatingOpportunityId === lead.id" @click="setOpportunityStatus(lead, 'reviewed')">{{ copy.markReviewed }}</a-button>
            <a-button v-if="lead.status !== 'dismissed'" size="small" :loading="updatingOpportunityId === lead.id" @click="setOpportunityStatus(lead, 'dismissed')">{{ copy.dismissOpportunity }}</a-button>
            <a-button v-if="lead.status !== 'new'" size="small" :loading="updatingOpportunityId === lead.id" @click="setOpportunityStatus(lead, 'new')">{{ copy.reopenOpportunity }}</a-button>
          </div>
        </div>
      </a-spin>
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
            <p v-if="monitor.config && monitor.config.prompt">{{ monitor.config.prompt.slice(0, 180) }}{{ monitor.config.prompt.length > 180 ? '…' : '' }}</p>
            <small>{{ monitorCondition(monitor) }}</small>
            <small>{{ copy.lastRun }} {{ displayTime(monitor.last_run_at) }} · {{ monitorResult(monitor) }}<template v-if="monitor.is_active"> · {{ copy.nextRun }} {{ displayTime(monitor.next_run_at) }}</template></small>
          </div>
          <div class="task-row-actions">
            <a-button size="small" icon="history" @click="openMonitorRuns(monitor)">{{ copy.runHistory }}</a-button>
            <a-button size="small" icon="edit" @click="editResearchMonitor(monitor)">{{ copy.edit }}</a-button>
            <a-popconfirm :title="copy.runOnceConfirm" :ok-text="copy.runOnce" :cancel-text="copy.cancel" @confirm="runResearchMonitor(monitor)"><a-button size="small" :loading="runningMonitorId === monitor.id">{{ copy.runOnce }}</a-button></a-popconfirm>
            <a-button v-if="monitor.is_active" size="small" icon="pause" :loading="updatingId === monitor.id" @click="toggleMonitor(monitor)">{{ copy.pause }}</a-button>
            <a-popconfirm v-else :title="copy.enableConfirm" :ok-text="copy.enable" :cancel-text="copy.cancel" @confirm="toggleMonitor(monitor)">
              <a-button size="small" icon="caret-right" :loading="updatingId === monitor.id">{{ copy.enable }}</a-button>
            </a-popconfirm>
          </div>
        </div>
      </section>

      <div class="task-aside">
        <section class="task-section">
          <div class="section-heading"><div><h2>{{ copy.developmentTitle }}</h2><p>{{ copy.developmentHint }}</p></div></div>
          <div v-if="!scriptSources.length && !backtests.length" class="task-empty">{{ copy.noDrafts }}</div>
          <div v-for="source in scriptSources.slice(0, 4)" :key="`source-${source.id}`" class="strategy-row">
            <div><strong>{{ source.name || source.strategy_name || `#${source.id}` }}</strong><small>{{ copy.sourceDraft }}<template v-if="sourceOrigin(source)"> · {{ copy.researchSource }} #{{ sourceOrigin(source).run_id }}</template></small></div>
            <div class="task-row-actions"><a-button size="small" type="link" @click="openSource(source.id)">{{ copy.edit }} →</a-button><a-button size="small" type="link" @click="openBacktest(source.id)">{{ copy.backtest }} →</a-button></div>
          </div>
          <div v-for="run in backtests.slice(0, 3)" :key="`backtest-${run.id}`" class="strategy-row">
            <div><strong>{{ run.strategy_name || run.symbol || `#${run.id}` }}</strong><small>{{ copy.backtestRecord }} · {{ displayTime(run.created_at) }}</small></div>
            <a-button size="small" type="link" @click="openBacktest(run.source_id)">{{ copy.reviewBacktest }} →</a-button>
          </div>
        </section>
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
      :title="editingMonitor ? copy.edit : copy.createMonitor"
      :ok-text="editingMonitor ? copy.save : copy.createPaused"
      :cancel-text="copy.cancel"
      :confirm-loading="creating"
      :ok-button-props="{ props: { disabled: !selectedWatchKey } }"
      @ok="createMonitor"
    >
      <a-form layout="vertical">
        <a-form-item :label="copy.target"><a-select v-model="selectedWatchKey" :placeholder="copy.chooseTarget"><a-select-option v-for="item in watchlist" :key="`${item.market}:${item.symbol}`" :value="`${item.market}:${item.symbol}`">{{ item.market }} · {{ item.symbol }} {{ item.name || '' }}</a-select-option></a-select></a-form-item>
        <a-form-item :label="copy.interval"><a-select v-model="intervalMinutes"><a-select-option :value="60">1 {{ copy.hour }}</a-select-option><a-select-option :value="240">4 {{ copy.hours }}</a-select-option><a-select-option :value="720">12 {{ copy.hours }}</a-select-option><a-select-option :value="1440">1 {{ copy.day }}</a-select-option></a-select></a-form-item>
        <ResearchTaskFields v-model="researchForm" :market="String(selectedWatchKey || '').split(':')[0]" :is-zh="copy === wordsZh" />
        <a-alert type="info" show-icon :message="copy.createBoundary" />
      </a-form>
    </a-modal>
    <a-drawer
      :visible="runsVisible"
      width="min(720px, 100vw)"
      :header-style="runsPanelStyle"
      :body-style="runsPanelStyle"
      :drawer-style="runsPanelStyle"
      @close="runsVisible = false"
    >
      <span slot="title" :style="{ color: runsPanelStyle.color }">{{ selectedMonitor ? selectedMonitor.name : copy.runHistory }}</span>
      <a-spin :spinning="loadingRuns">
        <a-button v-if="selectedMonitor" size="small" icon="reload" @click="openMonitorRuns(selectedMonitor)">{{ copy.refresh }}</a-button>
        <a-alert type="info" show-icon :message="copy.runsBoundary" class="task-alert" />
        <div v-if="!monitorRuns.length" class="task-empty">{{ copy.noRuns }}</div>
        <div v-for="run in monitorRuns" :key="run.id" class="task-run">
          <div class="task-run-heading"><strong>{{ runStatus(run) }}</strong><span>{{ displayTime(run.created_at) }}</span></div>
          <p v-if="run.result && run.result.error">{{ run.result.error }}</p>
          <p v-else-if="run.result">{{ copy.analyzed }} {{ run.result.analyzed_count || 0 }} / {{ run.result.position_count || 0 }}</p>
          <div v-for="item in ((run.result && run.result.position_analyses) || [])" :key="`${item.market}:${item.symbol}`" class="task-run-symbol">
            <div><strong>{{ item.market }}:{{ item.symbol }}</strong><small>{{ item.error || item.final_decision || copy.noResult }}<template v-if="item.confidence != null && !item.error"> · {{ item.confidence }}%</template></small></div>
            <p v-if="item.reasoning">{{ item.reasoning }}</p>
            <div v-if="item.risk_report" class="task-run-risks"><strong>{{ copy === wordsZh ? '风险与数据缺口' : 'Risks and data gaps' }}</strong><p>{{ item.risk_report }}</p></div>
            <a-popconfirm v-if="candidateFor(run, item)" :title="copy.candidateConfirm" :ok-text="copy.generateCandidate" :cancel-text="copy.cancel" @confirm="generateCandidate(run, item)">
              <a-button size="small" type="link" :loading="candidateLoadingKey === `${run.id}:${item.market}:${item.symbol}`">{{ copy.generateCandidate }} →</a-button>
            </a-popconfirm>
          </div>
        </div>
      </a-spin>
    </a-drawer>
    <a-modal :visible="!!candidateLoadingKey" :title="copy.generateCandidate" :footer="null" :closable="false" :mask-closable="false">
      <p>{{ candidatePhase === 'validation' ? (copy === wordsZh ? '正在校验策略契约…' : 'Checking strategy contract…') : (copy === wordsZh ? '正在流式生成草稿；校验完成前不可运行。' : 'Streaming a draft; it cannot run before validation.') }}</p>
      <pre v-if="candidateDraft" class="candidate-stream-preview">{{ candidateDraft }}</pre>
      <a-button icon="stop" @click="stopCandidateGeneration">{{ copy === wordsZh ? '停止生成' : 'Stop generation' }}</a-button>
    </a-modal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { getMonitors, getMonitorRuns, getResearchOpportunities, updateResearchOpportunity, addMonitor, updateMonitor, runMonitor } from '@/api/portfolio'
import ResearchTaskFields from '@/components/ResearchTaskFields.vue'
import { researchTaskForm, researchTaskConfig } from '@/utils/researchWorkflow.mjs'
import { getWatchlist } from '@/api/market'
import { getStrategyList, getScriptSourceList, getStrategyBacktestHistory } from '@/api/strategy'
import { streamStrategyDraft, cancelStrategyDraft } from '@/api/strategyDraftStream'
import { researchCandidateFromRun, buildResearchStrategyPrompt } from './researchCandidate'

const words = {
  zh: {
    eyebrow: 'AGENT 工作台', title: '任务中心', subtitle: '从机会发现到模拟运行，查看任务状态并决定下一步。', refresh: '刷新', loadError: '部分任务数据未能加载，请刷新后核对。', statusTitle: '任务状态', activeResearch: '运行中的定时研究', pausedResearch: '已暂停的定时研究', runningStrategies: '运行中的策略', safetySummary: '研究任务不会下单；交易权限在账户与策略运行中独立控制。', startTitle: '开始一项工作', startHint: '选择目标，Agent 的产物会引导你进入下一阶段。', discover: '挖掘机会', discoverDesc: '从观察范围筛选值得进一步研究的标的', research: '研究标的', researchDesc: '追问行情、事件、风险与数据依据', build: '开发策略', buildDesc: '把想法写成可回测的策略草稿', review: '运行与复盘', reviewDesc: '检查策略状态、订单和交易记录', openResearch: '打开 AI 投研', openRuntime: '打开策略运行', developmentTitle: '策略开发进度', developmentHint: '草稿校验、回测与运行各有独立记录。', noDrafts: '暂无策略草稿或回测记录。', sourceDraft: '已保存的策略源码', researchSource: '来自定时研究记录', edit: '编辑', backtest: '回测', backtestRecord: '历史回测', reviewBacktest: '查看', monitorTitle: '定时研究任务', monitorHint: '按固定间隔分析观察名单中的标的；事件触发暂未接入。', createMonitor: '新建定时研究', monitorBoundary: '这里只进行 AI 分析与通知，不会产生交易订单。', noMonitors: '暂无定时研究任务。', active: '运行中', paused: '已暂停', every: '每', runs: '已运行', lastRun: '上次运行', nextRun: '下次计划', pause: '暂停', enable: '启用', enableConfirm: '启用后系统将按计划自动分析，可能消耗 AI 额度；确认启用？', cancel: '取消', never: '尚未运行', noResult: '暂无结果', success: '完成', skipped: '跳过', failed: '失败', runHistory: '运行记录', runsBoundary: '这些记录只表示研究分析，不代表交易指令或成交。', noRuns: '暂无运行记录', analyzed: '已分析', generateCandidate: '生成策略候选', candidateConfirm: '将使用本次历史研究结果调用 AI 生成并校验策略，可能消耗额度；只进入回测准备，不会下单。继续？', candidateFailed: '策略候选生成失败', universeTitle: '观察范围', universeHint: '作为机会筛选和定时研究的输入。', noWatchlist: '观察名单为空。先到 AI 投研添加标的。', manageUniverse: '管理观察名单', executionTitle: '策略运行', executionHint: '与定时研究分开管理。', noStrategies: '暂无策略运行记录。', details: '详情', allStrategies: '查看全部策略', manageAccounts: '管理模拟账户与授权', executionBoundary: '模拟账户选择、交易授权、风控和暂停操作均在账户及策略运行页面完成。', createPaused: '创建为暂停', target: '观察标的', chooseTarget: '从观察名单选择', interval: '分析间隔', hour: '小时', hours: '小时', day: '天', createBoundary: '新任务默认暂停。这里只支持固定间隔研究，不支持事件触发或自动下单。', created: '定时研究任务已创建（暂停）', updated: '任务状态已更新', actionError: '操作失败，请重试。'
  },
  en: {
    eyebrow: 'AGENT WORKSPACE', title: 'Task Center', subtitle: 'Track work from opportunity discovery to paper execution and choose the next step.', refresh: 'Refresh', loadError: 'Some task data could not be loaded. Refresh to verify.', statusTitle: 'Task status', activeResearch: 'Active research schedules', pausedResearch: 'Paused research schedules', runningStrategies: 'Running strategies', safetySummary: 'Research schedules never place orders. Trading authorization is managed separately.', startTitle: 'Start work', startHint: 'Choose an outcome and continue through the resulting workflow.', discover: 'Discover opportunities', discoverDesc: 'Screen your watchlist for research candidates', research: 'Research a symbol', researchDesc: 'Examine market data, events, risks and evidence', build: 'Develop a strategy', buildDesc: 'Turn an idea into a backtestable draft', review: 'Run and review', reviewDesc: 'Inspect strategy status, orders and fills', openResearch: 'Open AI Research', openRuntime: 'Open Strategy Run', developmentTitle: 'Strategy development', developmentHint: 'Draft validation, backtests and runs have separate records.', noDrafts: 'No saved drafts or backtests yet.', sourceDraft: 'Saved strategy source', researchSource: 'From research run', edit: 'Edit', backtest: 'Backtest', backtestRecord: 'Past backtest', reviewBacktest: 'Open', monitorTitle: 'Scheduled research', monitorHint: 'Analyze watchlist symbols at fixed intervals; event triggers are not yet available.', createMonitor: 'New research schedule', monitorBoundary: 'These tasks only analyze and notify; they never place orders.', noMonitors: 'No scheduled research tasks yet.', active: 'Active', paused: 'Paused', every: 'Every', runs: 'Runs', lastRun: 'Last run', nextRun: 'Next planned', pause: 'Pause', enable: 'Enable', enableConfirm: 'This task may consume AI credits when scheduled. Enable it?', cancel: 'Cancel', never: 'Never', noResult: 'No result', success: 'Completed', skipped: 'Skipped', failed: 'Failed', runHistory: 'Run history', runsBoundary: 'Research records are not trading instructions or fills.', noRuns: 'No runs yet', analyzed: 'Analyzed', generateCandidate: 'Generate strategy candidate', candidateConfirm: 'This uses a historical research result to generate and validate code and may consume AI credits. It only prepares a backtest; no orders will be placed. Continue?', candidateFailed: 'Failed to generate strategy candidate', universeTitle: 'Observation universe', universeHint: 'Input for discovery and scheduled research.', noWatchlist: 'Your watchlist is empty. Add a symbol in AI Research.', manageUniverse: 'Manage watchlist', executionTitle: 'Strategy run', executionHint: 'Managed separately from research schedules.', noStrategies: 'No strategy runs yet.', details: 'Details', allStrategies: 'View all strategies', manageAccounts: 'Manage paper accounts and authorization', executionBoundary: 'Paper account selection, authorization, risk limits and pausing are managed in Accounts and Strategy Run.', createPaused: 'Create paused', target: 'Watchlist symbol', chooseTarget: 'Select from watchlist', interval: 'Analysis interval', hour: 'hour', hours: 'hours', day: 'day', createBoundary: 'New tasks start paused. Only fixed-interval research is supported here; no event trigger or order execution.', created: 'Research schedule created (paused)', updated: 'Task status updated', actionError: 'Action failed. Please retry.'
  }
}

Object.assign(words.zh, {
  monitorHint: '按间隔检查时段与价格条件；条件满足后让 Agent 按研究目标重新分析。',
  createBoundary: '研究任务默认暂停，可单次测试。时段与价格条件不满足时不调用模型，不会下单。',
  runOnce: '运行一次',
runOnceConfirm: '单次研究会遵守时段/价格条件，满足后调用 AI，可能产生费用；不会下单。',
save: '保存',
  opportunityTitle: '研究线索待审',
  opportunityHint: '来自定时研究的买入 / 减仓线索；SELL 表示退出风险，不是做空指令。',
  opportunityNew: '待审',
  opportunityReviewed: '已阅',
  opportunityDismissed: '已忽略',
  opportunityBoundary: '研究线索是历史 AI 观点，不是实时信号、投资建议或交易授权。',
  noOpportunities: '当前没有此状态的研究线索。',
  markReviewed: '标记已阅',
  dismissOpportunity: '忽略',
  reopenOpportunity: '重新待审'
})
Object.assign(words.en, {
  monitorHint: 'Check session and price conditions at each interval; the agent re-evaluates your research brief when met.',
  createBoundary: 'New tasks start paused. Run once to test; unmet gates skip AI. These tasks never place orders.',
  runOnce: 'Run once',
runOnceConfirm: 'Run once respecting session/price gates. AI may incur costs; no orders will be placed.',
save: 'Save',
  opportunityTitle: 'Research leads',
  opportunityHint: 'Buy / exit leads from scheduled research. SELL is an exit warning, not a short-sale instruction.',
  opportunityNew: 'New',
  opportunityReviewed: 'Reviewed',
  opportunityDismissed: 'Dismissed',
  opportunityBoundary: 'A research lead is a historical AI opinion, not a live signal, investment advice, or trading authorization.',
  noOpportunities: 'No research leads in this state.',
  markReviewed: 'Mark reviewed',
  dismissOpportunity: 'Dismiss',
  reopenOpportunity: 'Reopen'
})

export default {
  name: 'AgentTaskCenter',
  components: { ResearchTaskFields },
  props: { workspaceMode: { type: String, default: 'overview' } },
  data () {
    return { researchForm: researchTaskForm(), editingMonitor: null, runningMonitorId: null, loading: false, loadError: false, monitors: [], watchlist: [], strategies: [], scriptSources: [], backtests: [], updatingId: null, createVisible: false, creating: false, selectedWatchKey: undefined, intervalMinutes: 240, runsVisible: false, loadingRuns: false, selectedMonitor: null, monitorRuns: [], candidateLoadingKey: '', candidateDraft: '', candidatePhase: '', candidateController: null, candidateRequestId: '', opportunityFilter: 'new', opportunities: [], loadingOpportunities: false, opportunityRequestId: 0, updatingOpportunityId: null }
  },
  computed: {
    monitorMode () { return this.workspaceMode === 'monitor' },
    wordsZh () { return words.zh },
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () { return this.navTheme === 'dark' || this.navTheme === 'realdark' },
    runsPanelStyle () {
      return this.isDarkTheme
        ? { background: '#141a1e', color: '#edf3f0', '--task-muted': '#b6c3be', '--task-border': '#2d3835' }
        : { background: '#fff', color: '#17222a', '--task-muted': '#53636e', '--task-border': '#dce4e9' }
    },
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
      const results = await Promise.allSettled([getMonitors(), getWatchlist(), getStrategyList(), getScriptSourceList(), getStrategyBacktestHistory({ limit: 3 }), getResearchOpportunities(this.opportunityFilter)])
      const value = index => {
        const result = results[index]
        if (result.status !== 'fulfilled' || !result.value || result.value.code !== 1) {
          this.loadError = true
          return []
        }
        const data = result.value.data
        if (Array.isArray(data)) return data
        if (index === 1 && data && Array.isArray(data.watchlist)) return data.watchlist
        if (index === 3 && data && Array.isArray(data.items)) return data.items
        return []
      }
      this.monitors = value(0)
      this.watchlist = value(1).filter(item => item && item.market && item.symbol)
      this.strategies = value(2)
      this.scriptSources = value(3)
      this.backtests = value(4)
      this.opportunities = value(5)
      this.loading = false
    },
    async loadOpportunities () {
      const requestId = ++this.opportunityRequestId
      this.loadingOpportunities = true
      try {
        const result = await getResearchOpportunities(this.opportunityFilter)
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        if (requestId === this.opportunityRequestId) this.opportunities = Array.isArray(result.data) ? result.data : []
      } catch (error) {
        if (requestId === this.opportunityRequestId) this.$message.error((error && error.message) || this.copy.actionError)
      } finally { if (requestId === this.opportunityRequestId) this.loadingOpportunities = false }
    },
    opportunityRun (lead) { return { id: lead.run_id, status: 'completed', created_at: lead.run_created_at, result: { success: true } } },
    async setOpportunityStatus (lead, status) {
      if (this.updatingOpportunityId) return
      this.updatingOpportunityId = lead.id
      try {
        const result = await updateResearchOpportunity(lead.id, status)
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        await this.loadOpportunities()
      } catch (error) {
        this.$message.error((error && error.message) || this.copy.actionError)
      } finally { this.updatingOpportunityId = null }
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
    runStatus (run) { return this.copy[run.status === 'completed' ? 'success' : run.status] || run.status || this.copy.noResult },
    sourceOrigin (source) {
      try {
        const metadata = typeof source.metadata === 'string' ? JSON.parse(source.metadata) : source.metadata
        const origin = metadata && metadata.research_origin
        return origin && Number(origin.run_id) > 0 ? origin : null
      } catch (_) { return null }
    },
    candidateFor (run, item) { return researchCandidateFromRun(run, item) },
    async stopCandidateGeneration () {
      const requestId = this.candidateRequestId
      if (this.candidateController) this.candidateController.abort()
      this.candidateLoadingKey = ''
      this.candidateDraft = ''
      await cancelStrategyDraft(requestId)
    },
    async generateCandidate (run, item, originMonitorId = 0) {
      const candidate = this.candidateFor(run, item)
      if (!candidate || this.candidateLoadingKey) return
      this.candidateLoadingKey = `${run.id}:${item.market}:${item.symbol}`
      const controller = new AbortController()
      this.candidateController = controller
      this.candidateDraft = ''
      this.candidatePhase = 'generation'
      try {
        const data = await streamStrategyDraft({
          prompt: buildResearchStrategyPrompt(candidate, this.copy === words.zh ? 'zh' : 'en'),
          assetType: 'script',
          generationMode: 'authoring',
          existingCode: '',
          context: { source: 'scheduled_research', instrument: `${candidate.market}:${candidate.symbol}`, timeframe: '1D' }
        }, {
          signal: controller.signal,
          onRequestId: id => { this.candidateRequestId = id },
          onDelta: (text, phase) => { this.candidatePhase = phase; this.candidateDraft += text },
          onProgress: phase => { this.candidatePhase = phase; if (phase === 'full_fallback') this.candidateDraft = '' }
        })
        if (controller.signal.aborted) return
        sessionStorage.setItem('qd_strategy_source', data.code)
        sessionStorage.setItem('qd_copilot_script_strategy_meta', JSON.stringify({
          market: candidate.market,
          symbol: candidate.symbol,
          research_origin: {
            monitor_id: Number(originMonitorId || (this.selectedMonitor && this.selectedMonitor.id)),
            run_id: Number(run.id),
            observed_at: candidate.observedAt,
            decision: candidate.decision,
            confidence: candidate.confidence
          }
        }))
        this.runsVisible = false
        await this.$router.push({ path: '/strategy-ide', query: { tab: 'script', draft: '1', copilotBacktest: '1' } })
      } catch (error) {
        if (error && (error.name === 'AbortError' || controller.signal.aborted)) return
        this.$message.error((error && (error.backendMessage || error.message)) || this.copy.candidateFailed)
      } finally {
        if (this.candidateController === controller) {
          this.candidateLoadingKey = ''
          this.candidateDraft = ''
          this.candidatePhase = ''
          this.candidateRequestId = ''
          this.candidateController = null
        }
      }
    },
    async openMonitorRuns (monitor) {
      this.selectedMonitor = monitor
      this.monitorRuns = []
      this.runsVisible = true
      this.loadingRuns = true
      try {
        const [result, summary] = await Promise.all([getMonitorRuns(monitor.id), getMonitors().catch(() => null)])
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        if (this.selectedMonitor && this.selectedMonitor.id === monitor.id) this.monitorRuns = Array.isArray(result.data) ? result.data : []
        if (summary && summary.code === 1 && Array.isArray(summary.data)) this.monitors = summary.data
      } catch (error) { this.$message.error((error && error.message) || this.copy.actionError) } finally { this.loadingRuns = false }
    },
    displayTime (value) { return value ? String(value).replace('T', ' ').slice(0, 19) : this.copy.never },
    strategyStatus (strategy) { return String(strategy.status || '—') },
    openResearch () { this.$router.push('/ai-asset-analysis') },
    openDiscovery () { this.$router.push({ path: '/ai-asset-analysis', query: { scope: 'watchlist', copilotPrompt: this.copy === words.zh ? '请从我的观察名单中筛选值得进一步研究的机会，说明所用数据及其时效、筛选依据和风险；不要下单。' : 'Screen my watchlist for research opportunities. Explain data sources, freshness, selection criteria, and risks. Do not place orders.' } }) },
    openStrategyDraft () { this.$router.push({ path: '/ai-asset-analysis', query: { scope: 'unbound', copilotPrompt: this.copy === words.zh ? '请帮我把交易想法整理成可回测的 QuantDinger Strategy API V2 策略。先确认市场、标的、周期、入场、退出与风控条件；不要启动交易。' : 'Help turn my idea into a backtestable QuantDinger Strategy API V2 draft. First clarify market, symbol, timeframe, entry, exit, and risk rules. Do not start trading.' } }) },
    openRuntime (id) { this.$router.push({ path: '/strategy-center', query: id ? { strategyId: id } : {} }) },
    openSource (id) { this.$router.push({ path: '/strategy-ide', query: { tab: 'script', sourceId: id } }) },
    openBacktest (id) { this.$router.push({ path: '/backtest-center', query: id ? { sourceId: id } : {} }) },
    openAccounts () { this.$router.push('/broker-accounts') },
    researchWatch (item) { this.$router.push({ path: '/ai-asset-analysis', query: { market: item.market, symbol: item.symbol, copilotPrompt: this.copy === words.zh ? `研究 ${item.market}:${item.symbol} 的近期机会与风险，请注明数据时效和依据，不要下单。` : `Research opportunities and risks for ${item.market}:${item.symbol}. Cite data freshness and evidence. Do not place orders.` } }) },
    openCreateMonitor () { this.editingMonitor = null; this.researchForm = researchTaskForm(); this.selectedWatchKey = undefined; this.intervalMinutes = 240; this.createVisible = true },
    editResearchMonitor (monitor) {
      this.editingMonitor = monitor
      this.selectedWatchKey = `${monitor.config.market}:${monitor.config.symbol}`
      this.intervalMinutes = monitor.config.run_interval_minutes || 60
      this.researchForm = researchTaskForm(monitor.config)
      this.createVisible = true
    },
    monitorCondition (monitor) {
      const config = monitor.config || {}
      const zh = this.copy === words.zh
      const window = { always: zh ? '不限时段' : 'Any time', regular: zh ? '常规交易时段' : 'Regular session', after_close: zh ? '收盘后 1 小时' : 'First hour after close' }[config.session_window || 'always']
      const trigger = config.trigger || { type: 'scheduled' }
      return window + ' · ' + (trigger.type === 'scheduled' ? (zh ? '按间隔分析' : 'Scheduled') : `${trigger.type === 'price_above' ? '≥' : '≤'} ${trigger.price}`)
    },
    async runResearchMonitor (monitor) {
      if (this.runningMonitorId) return
      this.runningMonitorId = monitor.id
      try {
        const result = await runMonitor(monitor.id)
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        this.$message.success(this.copy === words.zh ? '已提交单次研究，请在运行记录中查看结果；定时启用状态不变。' : 'Run submitted. Check run history; the schedule state is unchanged.')
        await this.loadAll()
        await this.openMonitorRuns(monitor)
      } catch (error) { this.$message.error(error.message || this.copy.actionError) } finally { this.runningMonitorId = null }
    },
    async createMonitor () {
      const item = this.watchlist.find(watch => `${watch.market}:${watch.symbol}` === this.selectedWatchKey)
      if (!item || this.creating) return
      this.creating = true
      try {
        const payload = {
          name: `AI-${item.symbol}-${this.intervalMinutes}m`,
          position_ids: [],
          monitor_type: 'ai',
          config: { ...((this.editingMonitor && this.editingMonitor.config) || {}), ...researchTaskConfig(this.researchForm), market: item.market, symbol: item.symbol, run_interval_minutes: this.intervalMinutes, language: this.$i18n.locale },
          notification_config: { channels: ['browser'] },
          is_active: false
        }
        if (this.editingMonitor) {
          delete payload.is_active
          delete payload.notification_config
        }
        const result = this.editingMonitor ? await updateMonitor(this.editingMonitor.id, payload) : await addMonitor(payload)
        if (!result || result.code !== 1) throw new Error((result && result.msg) || this.copy.actionError)
        this.createVisible = false
        this.$message.success(this.editingMonitor ? this.copy.updated : this.copy.created)
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
.workflow-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.workflow-steps > div { display: flex; flex-direction: column; gap: 7px; padding: 15px; border: 1px solid var(--task-border); border-radius: 9px; background: var(--task-bg); }
.workflow-steps strong { color: var(--task-text); }
.workflow-steps span, .workflow-note { color: var(--task-muted); }
.workflow-steps .workflow-disabled { border-style: dashed; }
.workflow-note { margin: 14px 0 0; line-height: 1.6; }
.task-columns { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); align-items: start; gap: 16px; }
.task-empty { padding: 24px 8px; color: var(--task-muted); }
.task-row, .strategy-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 0; border-top: 1px solid var(--task-border); }
.opportunity-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 0; border-top: 1px solid var(--task-border); }
.opportunity-row small { display: block; margin-top: 4px; color: var(--task-muted); }
.opportunity-row p { max-width: 850px; margin: 7px 0 0; color: var(--task-muted); line-height: 1.5; overflow-wrap: anywhere; }
.task-row-main { min-width: 0; }
.task-row-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.task-run { padding: 15px 0; border-bottom: 1px solid var(--task-border); }
.task-run-heading { display: flex; justify-content: space-between; gap: 10px; }
.task-run-heading span, .task-run p { color: var(--task-muted); }
.task-run-symbol { display: flex; flex-direction: column; gap: 10px; padding: 12px 0; min-width: 0; }
.task-run-symbol p { margin: 0; font-size: 14px; line-height: 1.75; overflow-wrap: anywhere; white-space: pre-wrap; }
.task-run-risks { padding: 12px; border: 1px solid var(--task-border); border-radius: 8px; }
.task-run-risks strong { display: block; margin-bottom: 8px; }
.candidate-stream-preview { max-height: 280px; overflow: auto; padding: 12px; white-space: pre-wrap; background: #111820; color: #d8e4ef; font-size: 12px; }
.task-run-symbol small { display: block; color: var(--task-muted); }
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
@media (max-width: 1050px) { .task-summary { grid-template-columns: repeat(3, 1fr); } .summary-safety { grid-column: 1 / -1; } .entry-grid, .workflow-steps { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 760px) { .agent-task-center { padding: 18px 14px 34px; } .task-columns { grid-template-columns: 1fr; } .task-summary { grid-template-columns: repeat(2, 1fr); } .task-header { align-items: flex-start; } .opportunity-row { align-items: flex-start; flex-direction: column; } }
@media (max-width: 480px) { .entry-grid, .task-summary { grid-template-columns: 1fr; } .section-heading { flex-wrap: wrap; } .entry-grid button { min-height: 120px; } }
</style>
