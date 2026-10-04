<template>
  <div class="agent-model-controls" :class="{ 'agent-model-controls--compact': compact }">
    <div class="agent-model-row">
      <label>{{ isZh ? '本次模型' : 'Model' }}</label>
      <a-select
        class="agent-model"
        :value="selectedKey || undefined"
        :loading="loading"
        :disabled="disabled || loading"
        :title="selectedLabel"
        :dropdown-match-select-width="false"
        :dropdown-style="{ width: 'min(520px, calc(100vw - 24px))' }"
        dropdown-class-name="agent-model-dropdown"
        :placeholder="isZh ? '选择已配置的模型' : 'Select a configured model'"
        :aria-label="isZh ? 'Agent 模型' : 'Agent model'"
        @change="selectModel">
        <a-select-option v-for="item in items" :key="keyOf(item)" :value="keyOf(item)">{{ providerName(item.provider) }} · {{ item.model }}</a-select-option>
      </a-select>
      <label>{{ isZh ? '思考深度' : 'Reasoning' }}</label>
      <a-select class="agent-reasoning" :value="value.reasoning_effort || 'default'" :disabled="disabled || !selected || efforts.length < 2" :aria-label="isZh ? '思考深度' : 'Reasoning effort'" @change="selectEffort">
        <a-select-option v-for="effort in efforts" :key="effort" :value="effort">{{ effortName(effort) }}</a-select-option>
      </a-select>
      <a-button
        class="agent-model-refresh"
        size="small"
        :disabled="disabled"
        :loading="loading"
        :title="isZh ? '刷新模型列表' : 'Refresh models'"
        icon="reload"
        @click="load" />
      <router-link class="agent-model-settings" :to="{ path: '/settings', query: { section: 'ai-llm' } }" :aria-label="isZh ? '配置模型' : 'Configure models'" :title="isZh ? '配置模型' : 'Configure models'">
        <a-icon v-if="compact" type="setting" /><template v-else>{{ isZh ? '配置模型' : 'Configure models' }}</template>
      </router-link>
    </div>
    <small v-if="!compact || error || !items.length || (selectedKey && !selected)" :class="{ 'model-error': error }">{{ note }}</small>
  </div>
</template>
<script>
import { getAgentModels } from '@/api/market'
import { modelKey, selectionFor, reasoningLabel, providerLabel } from '@/utils/agentModelSelection.mjs'
export default {
  name: 'AgentModelSelect',
  props: { value: { type: Object, default: () => ({}) }, disabled: Boolean, remember: Boolean, compact: Boolean },
  data: () => ({ items: [], loading: false, error: '' }),
  computed: {
    isZh () { return String(this.$i18n.locale).startsWith('zh') },
    selectedKey () { return modelKey(this.value) },
    selected () { return this.items.find(item => modelKey(item) === this.selectedKey) },
    selectedLabel () { return this.selected ? `${this.providerName(this.selected.provider)} · ${this.selected.model}` : '' },
    efforts () { return this.selected ? this.selected.reasoning_options : ['default'] },
    note () {
      if (this.error) return this.error
      if (this.loading) return this.isZh ? '正在读取服务端配置…' : 'Loading configured models…'
      if (!this.items.length) return this.isZh ? '尚未配置可用模型，请先配置服务商和 API Key。' : 'Configure a provider and API key first.'
      if (this.selectedKey && !this.selected) return this.isZh ? '原模型已移除，请重新选择；不会自动换模型。' : 'Previous model was removed. Select a model; no automatic fallback.'
      if (this.efforts.length < 2) return this.isZh ? '此模型尚无已验证的深度参数，使用厂商默认；不会发送不支持的参数。' : 'No verified effort control for this model; provider default applies.'
      return this.isZh ? '适用于问答、报告和策略生成。深度越高通常越慢、费用越高；不会自动切换服务商。' : 'Applies to chat, reports and strategy generation. Higher effort can increase latency and cost; no provider fallback.'
    }
  },
  watch: { value: { deep: true, handler () { this.reportReady() } } },
  mounted () { this.load() },
  methods: {
    keyOf: modelKey,
    providerName (p) { return providerLabel(p, this.isZh) },
    effortName (e) { return reasoningLabel(e, this.isZh) },
    reportReady () { this.$emit('ready', !this.loading && !this.error && Boolean(this.selected) && this.efforts.includes(this.value.reasoning_effort || 'default')) },
    update (value) {
      this.$emit('input', value)
      if (this.remember) { try { localStorage.setItem('qd_agent_model_selection', JSON.stringify(value)) } catch (_) {} }
    },
    selectModel (key) { this.update(selectionFor(this.items.find(item => modelKey(item) === key), this.value.reasoning_effort)) },
    selectEffort (effort) { this.update(selectionFor(this.selected, effort)) },
    async load () {
      this.loading = true
      this.error = ''
      this.reportReady()
      try {
        const res = await getAgentModels()
        if (!res || res.code !== 1) throw new Error('model catalog unavailable')
        this.items = res.data.items || []
        if (!this.selectedKey) {
          let saved = null
          if (this.remember) { try { saved = JSON.parse(localStorage.getItem('qd_agent_model_selection') || 'null') } catch (_) {} }
          const preferred = saved || res.data.default
          // Retain stale choices visibly; never silently route to another biller.
          if (modelKey(preferred)) this.update(preferred)
        }
      } catch (_) { this.error = this.isZh ? '模型列表加载失败，请重试。' : 'Could not load models. Retry.' } finally {
        this.loading = false
        this.$nextTick(this.reportReady)
      }
    }
  }
}
</script>
<style scoped>
.agent-model-controls { padding: 8px 0; }
.agent-model-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 12px; }
.agent-model { width: 340px; max-width: 100%; }
.agent-reasoning { width: 150px; }
small { display: block; color: #9299a4; line-height: 1.5; margin-top: 6px; }
.model-error { color: #e6a23c; }
.agent-model-controls--compact { flex: 1 1 auto; min-width: 0; padding: 0; }
.agent-model-controls--compact .agent-model-row { flex-wrap: nowrap; gap: 5px; }
.agent-model-controls--compact label { display: none; }
.agent-model-controls--compact .agent-model { width: auto; min-width: 0; flex: 1 1 155px; }
.agent-model-controls--compact .agent-reasoning { width: 96px; flex: 0 0 96px; }
.agent-model-controls--compact a { flex: 0 0 auto; }
.agent-model-controls--compact small { font-size: 11px; }
.agent-model-controls--compact .agent-model-refresh,
.agent-model-controls--compact .agent-model-settings {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  line-height: 1;
  vertical-align: middle;
}
.agent-model-controls--compact .agent-model-settings { border-radius: 4px; }
.agent-model-controls--compact .agent-model-settings:hover { background: rgba(127, 127, 127, 0.1); }
</style>
<style>
.agent-model-dropdown .ant-select-dropdown-menu-item {
  overflow: visible;
  white-space: normal;
  overflow-wrap: anywhere;
  text-overflow: clip;
  line-height: 1.4;
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
