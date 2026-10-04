<template>
  <div>
    <a-form-item :label="isZh ? '此任务的 Agent 模型（随任务保存）' : 'Agent model (saved with this task)'">
      <AgentModelSelect :value="value.llm_selection || {}" @input="set('llm_selection', $event)" />
    </a-form-item>
    <a-form-item :label="isZh ? '持续分析目标 / 入场与退出条件' : 'Research brief / entry and exit criteria'">
      <a-textarea :value="value.prompt" :rows="5" :max-length="12000" :placeholder="isZh ? '每次检查哪些条件？什么情况下买入、减仓或继续观望？这段内容会传给 Agent。' : 'What should the agent evaluate on every run?'" @input="set('prompt', $event.target.value)" />
    </a-form-item>
    <a-form-item :label="isZh ? '分析时间窗口' : 'Research window'">
      <a-select :value="value.session_window || 'always'" @change="set('session_window', $event)">
        <a-select-option value="always">{{ isZh ? '不限（可在休市时准备下一交易日计划）' : 'Any time (includes next-session planning)' }}</a-select-option>
        <a-select-option v-if="isStock" value="regular">{{ isZh ? '仅交易所常规交易时段' : 'Regular exchange session only' }}</a-select-option>
        <a-select-option v-if="isStock" value="after_close">{{ isZh ? '收盘后 1 小时内' : 'First hour after close' }}</a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item :label="isZh ? '调用 Agent 的触发条件' : 'When to call the agent'">
      <a-select :value="value.trigger_type || 'scheduled'" @change="set('trigger_type', $event)">
        <a-select-option value="scheduled">{{ isZh ? '按间隔分析' : 'Every scheduled interval' }}</a-select-option>
        <a-select-option value="price_above">{{ isZh ? '价格大于等于阈值' : 'Price at or above threshold' }}</a-select-option>
        <a-select-option value="price_below">{{ isZh ? '价格小于等于阈值' : 'Price at or below threshold' }}</a-select-option>
        <a-select-option v-if="isStock" value="news_event">{{ isZh ? '出现新的相关新闻事件' : 'New relevant news event' }}</a-select-option>
      </a-select>
      <a-input-number v-if="['price_above', 'price_below'].includes(value.trigger_type)" :value="value.trigger_price" :min="0.000001" :placeholder="isZh ? '触发价格' : 'Trigger price'" @change="set('trigger_price', $event)" />
    </a-form-item>
    <p class="research-task-note">{{ isZh ? '按所选间隔检查；条件不满足时不调用 Agent。价格条件要求 5 分钟内的已收盘 1 分钟 K 线；新闻条件仅接受 24 小时内、带时间和链接且匹配标的的新事件。检索来源和新闻内容可能不可靠，结果仅供研究，不会自动下单。' : 'Checked at the selected interval; unmet conditions skip the agent. Price gates require a recent closed 1-minute bar. News gates require a new matching link with a timestamp within 24 hours. Search/news can be unreliable; research only, no orders.' }}</p>
  </div>
</template>
<script>
import AgentModelSelect from '@/components/AgentModelSelect.vue'
export default {
  name: 'ResearchTaskFields',
  components: { AgentModelSelect },
  props: { value: { type: Object, required: true }, market: { type: String, default: '' }, isZh: Boolean },
  computed: { isStock () { return ['USStock', 'HKStock'].includes(this.market) } },
  methods: { set (key, value) { this.$emit('input', { ...this.value, [key]: value }) } }
}
</script>
<style scoped>
.research-task-note { font-size: 12px; color: #888; line-height: 1.6; }
</style>
