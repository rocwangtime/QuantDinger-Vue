<template>
  <section class="research-controls">
    <a-form-item v-if="aiEnabled" :label="$t('researchExecution.aiMode')">
      <a-select :value="value.aiDecisionMode || 'advisory'" @change="set('aiDecisionMode', $event)">
        <a-select-option v-for="mode in ['advisory', 'shadow', 'required']" :key="mode" :value="mode">{{ $t('researchExecution.' + mode) }}</a-select-option>
      </a-select>
      <p>{{ $t('researchExecution.modeHint') }}</p>
    </a-form-item>
    <a-form-item :label="$t('researchExecution.jobId')"><a-input :value="value.researchEvidenceJobId" @input="set('researchEvidenceJobId', $event.target.value)" /></a-form-item>
    <a-collapse :bordered="false">
      <a-collapse-panel key="risk" :header="$t('researchExecution.riskTitle')">
        <a-checkbox :checked="value.riskEnabled" @change="set('riskEnabled', $event.target.checked)">{{ $t('researchExecution.riskEnabled') }}</a-checkbox>
        <p>{{ $t('researchExecution.riskGuardHint') }}</p>
        <template v-if="value.riskEnabled">
          <label class="model-import"><span>{{ $t('researchExecution.importModel') }}</span><input type="file" accept=".json,application/json" @change="importModel" /></label>
          <p v-if="model.symbols">{{ model.symbols.join(', ') }} · {{ model.as_of }}</p>
          <a-form-item :label="$t('researchExecution.maximumVolatility')"><a-input-number :value="value.maximumVolatility" :min="0.001" :step="0.1" @change="set('maximumVolatility', $event)" /></a-form-item>
          <a-form-item :label="$t('researchExecution.maximumAge')"><a-input-number :value="value.maximumAge" :min="1" @change="set('maximumAge', $event)" /></a-form-item>
        </template>
      </a-collapse-panel>
    </a-collapse>
  </section>
</template>
<script>
import { objectValue } from '@/utils/researchExecution'
export default {
  name: 'ResearchDeploymentControls',
  props: { value: { type: Object, required: true }, aiEnabled: { type: Boolean, default: false } },
  computed: { model () { return objectValue(this.value.riskModel) } },
  methods: {
    set (key, value) { this.$emit('input', { ...this.value, [key]: value }) },
    async importModel (event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        if (file.size > 1024 * 1024) throw new Error('invalid')
        const document = JSON.parse(await file.text())
        const model = objectValue(document.model || document)
        if (!Array.isArray(model.symbols) || model.period !== 'daily' || !model.as_of || !Array.isArray(model.covariance)) throw new Error('invalid')
        this.set('riskModel', model)
      } catch (error) { this.$message.error(this.$t('researchExecution.invalidRiskModel')) } finally { event.target.value = '' }
    }
  }
}
</script>
<style scoped>
.research-controls { margin-top: 18px; }
.research-controls p { font-size: 12px; opacity: .75; margin-top: 8px; }
.model-import { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
</style>
