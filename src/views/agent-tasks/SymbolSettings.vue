<template>
  <section class="task-panel">
    <h3>HK SIMULATE · Symbol parameters / 标的参数</h3>
    <a-button :loading="loading" @click="load">Refresh / 刷新</a-button>
    <a-alert v-if="error" type="error" :message="error" show-icon />
    <template v-if="settings">
      <p>{{ settings.symbol }} · revision {{ settings.revision }} · {{ settings.applied ? 'Effective / 已应用' : 'Defaults pending save / 保存后应用默认值' }}</p>
      <p>HKD amounts; percentages use 2 = 2%. Pause before saving. PAPER_AUTO requires separate authorization. Drawdown requires manual risk reset. Lot size is checked against Futu before each order.</p>
      <a-form layout="vertical" @submit.prevent="save">
        <div class="form-grid">
          <a-form-item v-for="(value, key) in params" :key="key" :label="labels[key] || key">
            <a-switch v-if="typeof value === 'boolean'" v-model="params[key]" :disabled="settings.active" />
            <a-select v-else-if="key === 'mode'" v-model="params[key]" :disabled="settings.active">
              <a-select-option value="plan_only">plan_only</a-select-option><a-select-option value="paper_auto">paper_auto</a-select-option>
            </a-select>
            <a-input v-else-if="key === 'model'" v-model="params[key]" :max-length="200" :disabled="settings.active" />
            <a-input-number v-else v-model="params[key]" :min="0" :disabled="settings.active" />
          </a-form-item>
        </div>
        <a-button html-type="submit" type="primary" :disabled="settings.active" :loading="loading">Save / 保存</a-button>
      </a-form>
      <details><summary>Live effective runtime parameters / 生效参数</summary><pre>{{ settings.effective_config }}</pre></details>
      <h4>Audit history / 修改历史</h4>
      <a-table :data-source="audit" :columns="columns" row-key="id" :pagination="false" :scroll="{ x: 650 }" />
      <a-button v-if="audit.length && audit.length % 100 === 0" @click="more">Older / 更早记录</a-button>
    </template>
  </section>
</template>
<script>
import { getSymbolConfig, putSymbolConfig, getSymbolAudit } from '@/api/automations'
export default {
  props: { taskId: { type: Number, required: true } },
  data: () => ({
    settings: null,
    params: {},
    audit: [],
    error: '',
    loading: false,
    labels: { budget: 'Task budget / 任务本金 HKD', per_order_cap: 'Per order / 单笔 HKD', daily_buy_cap: 'Daily buy cap / 每日买入 HKD', cash_reserve_pct: 'Cash reserve / 储备 %', max_position: 'Max position / 持仓上限 HKD', prev_close_pct: '± Previous close / 昨收 %', short_move_pct: '± Short move / 短窗 %', window_minutes: 'Window / 窗口 分钟', cooldown_minutes: 'Same direction cooldown / 同向冷却 分钟', max_triggers_day: 'Max triggers/day / 每日触发上限', blackout_auction: 'Opening auction blackout / 开盘竞价禁入', blackout_lunch: 'Lunch blackout / 午休禁入', blackout_close_minutes: 'Before close blackout / 收盘前 分钟', stop_loss_pct: 'Stop loss / 止损 %', daily_loss_pct: 'Daily budget loss / 每日本金亏损 %', max_drawdown_pct: 'Drawdown / 回撤 %', lot_size: 'Lot size / 每手股数' },
    columns: [{ title: 'Who / 用户', dataIndex: 'user_id' }, { title: 'When / 时间', dataIndex: 'changed_at' }, { title: 'Field / 字段', dataIndex: 'field' }, { title: 'Old / 原值', dataIndex: 'old_value', customRender: v => JSON.stringify(v) }, { title: 'New / 新值', dataIndex: 'new_value', customRender: v => JSON.stringify(v) }]
  }),
  watch: { taskId: { immediate: true, handler: 'load' } },
  methods: {
    async load () {
      const id = this.taskId
      this.loading = true
      this.error = ''
      try {
        const [settings, audit] = await Promise.all([getSymbolConfig(id), getSymbolAudit(id)])
        if (id !== this.taskId) return
        this.settings = settings
        this.params = { ...settings.params }
        this.audit = audit
      } catch (e) { this.error = e.message } finally { this.loading = false }
    },
    async save () {
      this.error = ''
      const p = this.params
      const integerKeys = ['window_minutes', 'cooldown_minutes', 'max_triggers_day', 'blackout_close_minutes', 'lot_size']
      if (Object.values(p).some(v => typeof v === 'number' && (!Number.isFinite(v) || v < 0)) || integerKeys.some(k => !Number.isInteger(p[k])) || p.lot_size < 1 || p.per_order_cap > p.daily_buy_cap || p.daily_buy_cap > p.budget || p.max_position > p.budget * (1 - p.cash_reserve_pct / 100)) {
        this.error = 'Invalid limits, budget, reserve or integer values / 参数不合法'
        return
      }
      this.loading = true
      try { await putSymbolConfig(this.taskId, p); await this.load(); this.$emit('saved') } catch (e) { this.error = e.message } finally { this.loading = false }
    },
    async more () {
      try { this.audit.push(...await getSymbolAudit(this.taskId, this.audit[this.audit.length - 1].id)) } catch (e) { this.error = e.message }
    }
  }
}
</script>
