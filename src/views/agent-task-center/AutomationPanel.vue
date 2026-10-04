<template>
  <section class="automation-panel">
    <div class="automation-heading"><div><h2>账户交易任务</h2><p>围绕模拟账户持续分析、管理计划并跟踪成交。</p></div><a-button icon="reload" :loading="loading" @click="load">刷新</a-button></div>
    <div class="automation-templates">
      <button type="button" @click="openCreate('daily_portfolio')"><a-icon type="calendar" /><strong>每日组合计划</strong><span>开盘前分析股票池与已有持仓，开盘后复核执行条件。</span></button>
      <button type="button" @click="openCreate('price_trigger')"><a-icon type="thunderbolt" /><strong>条件触发交易</strong><span>实时行情触发后调用 AI；决策 15 秒有效，超时跳过。</span></button>
    </div>
    <a-alert v-if="error" type="warning" :message="error" show-icon />
    <div v-if="!tasks.length && !loading" class="automation-empty">选择上方模板创建任务。可以先运行预览，查看实际账户数据和 AI 决策。</div>
    <article v-for="task in tasks" :key="task.id" class="automation-task">
      <div class="automation-heading"><strong>{{ task.name }}</strong><a-tag :color="task.active ? 'green' : 'default'">{{ task.active ? '已启用' : '已暂停' }}</a-tag></div>
      <p>{{ templateName(task.config.kind) }} · {{ task.config.market === 'USStock' ? '美股' : '港股' }} · {{ task.config.symbols.join('、') }}</p>
      <small>{{ accountName(task.config.credential_id) }} · {{ task.config.execution_mode === 'paper_auto' ? '模拟盘自动执行' : '仅生成计划' }} · 预算 {{ task.config.budget }} {{ task.config.market === 'USStock' ? 'USD' : 'HKD' }}</small>
      <p v-if="task.schedule">交易日计划时间：{{ formatTime(task.schedule.run_at) }} · 开盘后 {{ task.config.execute_after_open_minutes }} 分钟复核</p>
      <p v-else>{{ task.config.trigger.type === 'price_above' ? '价格达到或高于' : '价格达到或低于' }} {{ task.config.trigger.price }} · 冷却 {{ task.config.cooldown_seconds }} 秒</p>
      <p v-if="task.latest_run">最近运行：{{ statusName(task.latest_run.status) }} · {{ task.latest_run.phase }}</p>
      <p>{{ task.monitor_status }}</p>
      <div class="automation-actions">
        <a-button :loading="busy === task.id" icon="experiment" @click="preview(task)">运行预览</a-button>
        <a-button :loading="busy === task.id" :type="task.active ? 'default' : 'primary'" @click="toggle(task)">{{ task.active ? '暂停任务' : '启用任务' }}</a-button>
        <a-button icon="history" @click="openRuns(task)">计划与成交</a-button>
        <a-button @click="showAccount(task)">账户持仓</a-button>
        <a-button :disabled="task.active" @click="openEdit(task)">修改配置</a-button>
      </div>
    </article>
    <p class="automation-note">预览仅生成计划。自动执行沿用账户页的模拟盘授权与限额；暂停会停止后续分析和提交，已提交订单请在账户页处理。</p>

    <a-modal
      v-model="creating"
      :title="templateName(form.kind)"
      :width="760"
      :ok-text="editingId ? '保存并保持暂停' : '创建并保持暂停'"
      :confirm-loading="saving"
      @ok="save">
      <a-form layout="vertical">
        <a-form-item label="任务名称"><a-input v-model="name" :max-length="120" /></a-form-item>
        <div class="automation-form-grid">
          <a-form-item label="市场"><a-select v-model="form.market" @change="form.symbols = []"><a-select-option value="USStock">美股</a-select-option><a-select-option value="HKStock">港股</a-select-option></a-select></a-form-item>
          <a-form-item label="富途模拟账户"><a-select v-model="form.credential_id" placeholder="选择已连接并保存的账户"><a-select-option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</a-select-option></a-select></a-form-item>
        </div>
        <a-form-item :label="form.kind === 'daily_portfolio' ? '候选股票池（最多 20 只，可输入代码）' : '触发标的（仅一只）'">
          <a-select v-model="form.symbols" mode="tags" :token-separators="[',', '，', ' ']" placeholder="例如 AAPL、TSLA，或港股 01810.HK">
            <a-select-option v-for="item in watchlist.filter(w => w.market === form.market)" :key="item.symbol" :value="item.symbol">{{ item.symbol }} {{ item.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <div v-if="form.kind === 'daily_portfolio'" class="automation-form-grid">
          <a-form-item label="开盘前多少分钟分析"><a-input-number v-model="form.before_open_minutes" :min="5" :max="180" /></a-form-item>
          <a-form-item label="开盘后多少分钟复核"><a-input-number v-model="form.execute_after_open_minutes" :min="1" :max="30" /></a-form-item>
        </div>
        <div v-else class="automation-form-grid">
          <a-form-item label="触发条件"><a-select v-model="form.trigger.type"><a-select-option value="price_above">上穿目标价</a-select-option><a-select-option value="price_below">下穿目标价</a-select-option></a-select></a-form-item>
          <a-form-item label="目标价"><a-input-number v-model="form.trigger.price" :min="0.001" :step="0.01" /></a-form-item>
          <a-form-item label="重复事件冷却（秒）"><a-input-number v-model="form.cooldown_seconds" :min="30" :max="86400" /></a-form-item>
        </div>
        <a-form-item label="分析目标与交易偏好"><a-textarea v-model="form.brief" :rows="3" placeholder="例如：先复核已有持仓的退出条件，再选择值得新增的机会。证据不足时观望。" /></a-form-item>
        <AgentModelSelect v-model="form.llm_selection" />
        <p v-if="form.kind === 'price_trigger'" class="automation-note">建议选择低思考或关闭思考；上下文提前准备。超过有效期的判断不会下单。</p>
        <div class="automation-form-grid">
          <a-form-item :label="`任务资金预算（${form.market === 'USStock' ? 'USD' : 'HKD'}）`"><a-input-number v-model="form.budget" :min="1" /></a-form-item>
          <a-form-item label="单只股票仓位上限（比例）"><a-input-number v-model="form.max_weight" :min="0.01" :max="1" :step="0.05" /></a-form-item>
          <a-form-item label="保留现金比例"><a-input-number v-model="form.reserve_ratio" :min="0" :max="0.95" :step="0.05" /></a-form-item>
          <a-form-item label="单笔金额上限"><a-input-number v-model="form.max_order_notional" :min="1" /></a-form-item>
          <a-form-item label="每日成交意图金额上限"><a-input-number v-model="form.max_daily_notional" :min="1" /></a-form-item>
          <a-form-item label="执行方式"><a-select v-model="form.execution_mode"><a-select-option value="plan_only">仅生成计划</a-select-option><a-select-option value="paper_auto">模拟盘自动执行</a-select-option></a-select></a-form-item>
        </div>
        <a-checkbox v-model="form.manage_existing">允许此任务管理首次启用时、股票池内已有的模拟持仓（包括减仓和卖出）</a-checkbox>
        <p class="automation-note">所有已有持仓都会参与分析；未勾选时，只能卖出此任务自己建立的仓位。股票池外不会新增买入。</p>
      </a-form>
    </a-modal>

    <a-drawer :visible="!!selected" :width="'min(960px, 100vw)'" :title="selected ? selected.name + ' · 计划与成交' : ''" @close="closeRuns">
      <a-button icon="reload" @click="refreshRuns">刷新记录</a-button>
      <div v-if="!runs.length" class="automation-empty">尚无运行记录</div>
      <article v-for="run in runs" :key="run.id" class="automation-run">
        <div class="automation-heading"><strong>{{ statusName(run.status) }} <a-tag v-if="run.preview">预览</a-tag></strong><small>{{ formatTime(run.created_at) }}</small></div>
        <p>{{ run.phase }}</p>
        <div class="automation-actions" v-if="['queued', 'researching', 'executing', 'planned'].includes(run.status)">
          <a-button v-if="['queued', 'researching', 'executing'].includes(run.status)" size="small" @click="watch(run.id)">查看实时进度</a-button>
          <a-button size="small" icon="stop" @click="cancel(run.id)">停止本次运行</a-button>
        </div>
        <p v-if="run.draft && (!run.result || !run.result.summary)" class="automation-stream">{{ run.draft }}</p>
        <template v-if="run.result">
          <p>{{ run.result.summary }}</p>
          <div v-for="item in (run.result.items || [])" :key="item.symbol" class="automation-decision">
            <strong>{{ item.symbol }} · {{ actionName(item.action) }} · 目标仓位 {{ (item.target_weight * 100).toFixed(1) }}%</strong>
            <p>{{ item.reason }}</p><small>失效条件：{{ item.invalidation }}</small>
            <small v-if="item.min_price">可执行价格：{{ item.min_price }} – {{ item.max_price }}</small>
          </div>
          <small v-if="run.result.usage" class="automation-note">{{ run.result.usage.model }} · {{ run.result.usage.total_tokens }} tokens · 预估 {{ run.result.usage.currency || '' }} {{ run.result.usage.estimated_cost == null ? '价格未知' : run.result.usage.estimated_cost }} · 分析耗时 {{ ((run.result.latency_ms || 0) / 1000).toFixed(1) }} 秒</small>
          <p v-for="check in (run.result.execution_checks || [])" :key="check.symbol">{{ check.symbol }} · {{ check.status }} {{ check.reason }}</p>
        </template>
        <div v-for="order in (run.orders || [])" :key="order.id" class="automation-order">{{ order.order_spec.symbol }} · {{ order.order_spec.side === 'buy' ? '买入' : '卖出' }} {{ order.order_spec.qty }} 股 · {{ order.status }} · 已成交 {{ order.filled_qty }} 股</div>
      </article>
    </a-drawer>
    <a-modal v-model="accountVisible" title="券商实际账户快照" :footer="null" :width="700">
      <template v-if="snapshot">
        <p>币种 {{ snapshot.currency }} · 现金 {{ snapshot.funds.cash }} · 购买力 {{ snapshot.funds.power }}</p>
        <p v-for="position in snapshot.positions" :key="position.symbol">{{ position.symbol }} · {{ position.quantity }} 股 · 成本 {{ position.avg_cost }} · 浮动盈亏 {{ position.unrealized_pl }}</p>
        <p v-if="!snapshot.positions.length">当前无持仓</p><p>当前挂单 {{ snapshot.open_orders.length }} 笔</p>
      </template>
    </a-modal>
  </section>
</template>
<script>
import AgentModelSelect from '@/components/AgentModelSelect.vue'
import { listExchangeCredentials } from '@/api/credentials'
import { listAutomations, createAutomation, editAutomation, setAutomationState, previewAutomation, automationRuns, automationSnapshot, cancelAutomationRun, streamAutomationRun } from '@/api/agentAutomations'

const defaults = kind => ({ kind, market: kind === 'price_trigger' ? 'HKStock' : 'USStock', symbols: kind === 'price_trigger' ? ['01810.HK'] : [], credential_id: undefined, budget: kind === 'price_trigger' ? 50000 : 10000, max_weight: 0.25, reserve_ratio: 0.1, max_order_notional: 1000, max_daily_notional: 5000, execution_mode: 'plan_only', manage_existing: false, before_open_minutes: 60, execute_after_open_minutes: 5, cooldown_seconds: 300, trigger: { type: 'price_above', price: undefined }, brief: '', llm_selection: {} })
export default {
  name: 'AutomationPanel',
  components: { AgentModelSelect },
  props: { watchlist: { type: Array, default: () => [] } },
  data: () => ({ tasks: [], accounts: [], loading: false, error: '', creating: false, saving: false, editingId: null, name: '', form: defaults('daily_portfolio'), busy: null, selected: null, runs: [], controller: null, timer: null, accountVisible: false, snapshot: null }),
  mounted () { this.load(); this.timer = setInterval(() => { if (!document.hidden && !this.creating) this.load(true) }, 10000) },
  beforeDestroy () { clearInterval(this.timer); if (this.controller) this.controller.abort() },
  methods: {
    checked (res) { if (!res || res.code !== 1) throw new Error((res && res.msg) || '操作失败'); return res.data },
    failure (error) { this.$message.error((error.response && error.response.data && error.response.data.msg) || error.message || '操作失败') },
    templateName (kind) { return kind === 'daily_portfolio' ? '每日组合计划' : '条件触发交易' },
    accountName (id) { return (this.accounts.find(a => a.id === id) || {}).name || '模拟账户' },
    formatTime (value) { return value ? new Date(value).toLocaleString() : '—' },
    statusName (status) { return ({ queued: '等待分析', researching: '分析中', planned: '等待执行窗口', executing: '执行复核中', completed: '已完成', cancelled: '已停止', expired: '已过期', blocked: '执行未放行', failed: '失败' })[status] || status },
    actionName (action) { return ({ BUY: '买入 / 加仓', REDUCE: '减仓', EXIT: '退出', HOLD: '持有', WAIT: '观望' })[action] || action },
    async load (quiet = false) {
      if (this.loading) return
      this.loading = true
      try {
        this.tasks = this.checked(await listAutomations()) || []
        if (!this.accounts.length) {
          const data = this.checked(await listExchangeCredentials())
          this.accounts = (data.items || []).filter(a => a.exchange_id === 'futu')
        }
        this.error = ''
      } catch (error) { if (!quiet) this.error = error.message } finally { this.loading = false }
    },
    openCreate (kind) { this.editingId = null; this.form = defaults(kind); this.name = kind === 'daily_portfolio' ? '美股每日组合计划' : '小米条件触发交易'; this.creating = true },
    openEdit (task) { this.editingId = task.id; this.form = JSON.parse(JSON.stringify(task.config)); this.name = task.name; this.creating = true },
    async save () {
      this.saving = true
      try { const payload = { name: this.name, config: this.form }; this.checked(await (this.editingId ? editAutomation(this.editingId, payload) : createAutomation(payload))); this.creating = false; await this.load() } catch (error) { this.failure(error) } finally { this.saving = false }
    },
    async toggle (task) {
      this.busy = task.id
      try { this.checked(await setAutomationState(task.id, !task.active)); await this.load() } catch (error) { this.failure(error) } finally { this.busy = null }
    },
    async preview (task) {
      this.busy = task.id
      try { const run = this.checked(await previewAutomation(task.id)); await this.openRuns(task); this.watch(run.id) } catch (error) { this.failure(error) } finally { this.busy = null }
    },
    async openRuns (task) { this.closeRuns(); this.selected = task; await this.refreshRuns() },
    closeRuns () { if (this.controller) this.controller.abort(); this.controller = null; this.selected = null },
    async refreshRuns () { if (!this.selected) return; try { this.runs = this.checked(await automationRuns(this.selected.id)) || [] } catch (error) { this.failure(error) } },
    async watch (id) {
      if (this.controller) this.controller.abort()
      const controller = new AbortController(); this.controller = controller
      try {
        await streamAutomationRun(id, controller.signal, run => { const index = this.runs.findIndex(r => r.id === run.id); if (index >= 0) this.$set(this.runs, index, { ...this.runs[index], ...run }) })
        if (!controller.signal.aborted) await this.refreshRuns()
      } catch (error) { if (!controller.signal.aborted) this.failure(error) }
    },
    async cancel (id) { try { this.checked(await cancelAutomationRun(id)); await this.refreshRuns() } catch (error) { this.failure(error) } },
    async showAccount (task) { try { this.snapshot = this.checked(await automationSnapshot(task.id)); this.accountVisible = true } catch (error) { this.failure(error) } }
  }
}
</script>
<style scoped>
.automation-panel { margin: 20px 0; padding: 22px; border: 1px solid var(--task-border, #dce4e9); border-radius: 16px; }
.automation-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.automation-heading h2 { margin: 0; color: inherit; }
.automation-heading p, .automation-note, small { color: var(--task-muted, #697984); line-height: 1.65; }
.automation-templates, .automation-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 18px 0; }
.automation-templates button { text-align: left; padding: 20px; border: 1px solid var(--task-border, #dce4e9); border-radius: 12px; background: transparent; color: inherit; cursor: pointer; }
.automation-templates strong { display: inline-block; margin: 0 10px 8px; font-size: 16px; }
.automation-templates span { display: block; color: var(--task-muted, #697984); }
.automation-task, .automation-run { border-top: 1px solid var(--task-border, #dce4e9); margin-top: 18px; padding-top: 18px; }
.automation-actions { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0; }
.automation-empty { padding: 24px 0; color: #89969e; }
.automation-decision { padding: 14px; margin: 12px 0; border: 1px solid #dce4e9; border-radius: 10px; }
.automation-decision small { display: block; }
.automation-stream { white-space: pre-wrap; line-height: 1.8; }
.automation-order { padding: 8px 0; }
@media (max-width: 700px) { .automation-templates, .automation-form-grid { grid-template-columns: 1fr; } }
</style>
