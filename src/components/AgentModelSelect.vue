<template>
  <div class="agent-model-controls">
    <div class="agent-model-row">
      <label>{{ isZh ? '本次模型' : 'Model' }}</label>
      <a-select
        class="agent-model"
        :value="selectedKey || undefined"
        :loading="loading"
        :disabled="disabled || loading"
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
        size="small"
        :disabled="disabled"
        :loading="loading"
        :title="isZh ? '刷新模型列表' : 'Refresh models'"
        icon="reload"
        @click="load" />
      <router-link :to="{ path: '/settings', query: { section: 'ai-llm' } }">{{ isZh ? '配置模型' : 'Configure models' }}</router-link>
    </div>
    <small :class="{ 'model-error': error }">{{ note }}</small>
  </div>
</template>
<script>
import { getAgentModels } from '@/api/market'
import { modelKey, selectionFor, reasoningLabel, providerLabel } from '@/utils/agentModelSelection.mjs'
export default {
  name: 'AgentModelSelect',
  props: { value: { type: Object, default: () => ({}) }, disabled: Boolean, remember: Boolean },
  data: () => ({ items: [], loading: false, error: '' }),
  computed: {
    isZh () { return String(this.$i18n.locale).startsWith('zh') },
    selectedKey () { return modelKey(this.value) },
    selected () { return this.items.find(item => modelKey(item) === this.selectedKey) },
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
</style>
