<template>
  <section class="research-evidence">
    <a-alert :type="eligible ? 'success' : 'warning'" show-icon :message="$t('researchExecution.' + (known ? (eligible ? 'eligible' : 'insufficient') : 'legacy'))" :description="$t('researchExecution.evidenceHint')" />
    <p>{{ $t('researchExecution.fixedValidation') }}</p>
    <a-descriptions size="small" :column="2">
      <a-descriptions-item :label="$t('researchExecution.trials')">{{ trials == null ? '—' : trials }}</a-descriptions-item>
      <a-descriptions-item :label="$t('researchExecution.holdouts')">{{ exposures == null ? '—' : exposures }}</a-descriptions-item>
      <a-descriptions-item :label="$t('researchExecution.jobId')"><code>{{ jobId || '—' }}</code></a-descriptions-item>
    </a-descriptions>
    <ul v-if="reasons.length"><li v-for="reason in reasons" :key="reason">{{ reasonLabel(reason) }}</li></ul>
    <details v-if="bundle"><summary>{{ $t('researchExecution.bundle') }}</summary><code class="bundle-id">{{ bundle }}</code></details>
    <a-button v-if="bundle && jobId" icon="reload" :loading="replaying" @click="$emit('replay')">{{ $t('researchExecution.replay') }}</a-button>
  </section>
</template>
<script>
export default {
  name: 'ResearchEvidence',
  props: { result: { type: Object, required: true }, jobId: { type: String, default: '' }, replaying: { type: Boolean, default: false } },
  computed: {
    known () { return Boolean(this.result.promotion) },
    eligible () { return this.known && this.result.promotion.eligible === true },
    reasons () { return (this.result.promotion || {}).reasons || [] },
    bundle () { return (this.result.reproducibility || {}).bundleId || '' },
    trials () { return ((this.result.validation || {}).deflatedSharpe || {}).effectiveTrials },
    exposures () { return (this.result.plan || {}).holdoutPriorExposures }
  },
  methods: {
    reasonLabel (reason) { const key = `researchExecution.${reason}`; return this.$te(key) ? this.$t(key) : reason }
  }
}
</script>
<style scoped>
.research-evidence { padding: 16px; margin-bottom: 16px; border: 1px solid var(--evo-border, #d9d9d9); border-radius: 10px; background: var(--evo-card, transparent); }
.research-evidence p { margin-top: 12px; }
.bundle-id { display: block; overflow-wrap: anywhere; margin: 8px 0; }
.research-evidence .ant-btn { margin-top: 12px; }
</style>
