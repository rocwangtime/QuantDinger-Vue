<template>
  <section class="shadow-evaluation">
    <h3>{{ $t('researchExecution.shadowReport') }}</h3>
    <p>{{ $t('researchExecution.shadowHint') }}</p>
    <div class="shadow-actions">
      <label>{{ $t('researchExecution.horizon') }} <a-input-number v-model="horizon" :min="1" :max="168" :disabled="running" /></label>
      <label>{{ $t('researchExecution.sampleLimit') }} <a-input-number v-model="limit" :min="1" :max="200" :disabled="running" /></label>
      <a-button type="primary" :loading="submitting" :disabled="running || !strategyId" @click="submit">{{ $t('researchExecution.generate') }}</a-button>
      <a-button v-if="running" :loading="submitting" @click="cancel">{{ $t('researchExecution.cancel') }}</a-button>
      <a-button v-if="job" :disabled="submitting" @click="poll">{{ $t('researchExecution.refresh') }}</a-button>
    </div>
    <a-alert v-if="error" type="error" :message="error" show-icon />
    <p v-if="job">{{ $t('researchExecution.status') }}: {{ statusLabel(job.status) }} · {{ job.jobId }}</p>
    <template v-if="report">
      <a-alert v-if="report.evidence_status !== 'observational'" type="warning" show-icon :message="$t('researchExecution.insufficient')" />
      <a-descriptions :column="2" size="small" bordered>
        <a-descriptions-item v-for="metric in metrics" :key="metric[0]" :label="$t('researchExecution.' + metric[1])">{{ metric[2] ? percentage(report[metric[0]]) : (report[metric[0]] == null ? '—' : report[metric[0]]) }}</a-descriptions-item>
      </a-descriptions>
    </template>
  </section>
</template>
<script>
import { submitShadowEvaluation, getShadowEvaluation, cancelShadowEvaluation } from '@/api/researchExecution'
import { busyJob, percentage } from '@/utils/researchExecution'
export default {
  name: 'ShadowEvaluation',
  props: { strategyId: { type: [Number, String], required: true } },
  data () { return { horizon: 24, limit: 100, submitting: false, job: null, error: '', timer: null, epoch: 0, pollSequence: 0 } },
  computed: {
    running () { return busyJob(this.job) },
    report () { return this.job && this.job.status === 'succeeded' ? this.job.result : null },
    metrics () { return [['observed', 'observed'], ['missing', 'missing'], ['mean_baseline_return', 'baseline', true], ['mean_filtered_return', 'filtered', true], ['mean_paired_delta', 'delta', true], ['blocked_losses', 'blocked'], ['missed_winners', 'missed'], ['mean_latency_ms', 'latency'], ['model_credits', 'credits']] }
  },
  watch: { strategyId () { this.reset() } },
  beforeDestroy () { this.reset() },
  methods: {
    percentage,
    statusLabel (status) { return this.$t('researchExecution.' + (status === 'failed' ? 'failedStatus' : status)) },
    reset () { this.epoch++; this.pollSequence++; clearTimeout(this.timer); this.timer = null; this.job = null; this.error = ''; this.submitting = false },
    fail (error) { this.error = error.backendMessage || error.message || this.$t('researchExecution.failed') },
    async submit () {
      if (this.submitting || this.running) return
      const epoch = this.epoch
      this.submitting = true; this.error = ''
      try {
        const response = await submitShadowEvaluation(this.strategyId, { horizonHours: this.horizon, limit: this.limit })
        if (epoch !== this.epoch) return
        this.job = response.data
        await this.poll()
      } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.submitting = false }
    },
    async poll () {
      clearTimeout(this.timer)
      if (!this.job || !this.job.jobId) return
      const epoch = this.epoch; const id = this.job.jobId
      const sequence = ++this.pollSequence
      try {
        const response = await getShadowEvaluation(id)
        if (epoch !== this.epoch || sequence !== this.pollSequence || !this.job || id !== this.job.jobId) return
        this.job = response.data
        this.error = this.job.error || ''
        if (this.running) this.timer = setTimeout(() => this.poll(), 2500)
      } catch (error) { if (epoch === this.epoch && sequence === this.pollSequence) this.fail(error) }
    },
    async cancel () {
      if (this.submitting || !this.job) return
      const epoch = this.epoch; const id = this.job.jobId
      this.submitting = true
      try { await cancelShadowEvaluation(id); if (epoch === this.epoch) await this.poll() } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.submitting = false }
    }
  }
}
</script>
<style scoped>
.shadow-evaluation { margin: 16px 0; padding: 16px; border: 1px solid rgba(128,128,128,.25); border-radius: 10px; }
.shadow-evaluation p { opacity: .75; }
.shadow-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin-bottom: 14px; }
.shadow-actions label { display: flex; flex-direction: column; gap: 6px; }
.shadow-evaluation .ant-alert { margin: 12px 0; }
</style>
