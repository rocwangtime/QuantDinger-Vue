<template>
  <section class="portfolio-risk-analysis">
    <h3>{{ $t('researchExecution.riskTitle') }}</h3><p>{{ $t('researchExecution.riskHint') }}</p>
    <label>{{ $t('researchExecution.importReturns') }} <input type="file" accept=".json,application/json" :disabled="loading" @change="importReturns" /></label>
    <div v-for="symbol in symbols" :key="symbol" class="weight-row"><code>{{ symbol }}</code><label>{{ $t('researchExecution.weight') }} <a-input-number v-model="weights[symbol]" :min="-10" :max="10" :step="0.1" :disabled="loading" /></label></div>
    <a-button type="primary" :loading="loading" :disabled="!symbols.length" @click="analyze">{{ $t('researchExecution.analyze') }}</a-button>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <template v-if="report">
      <a-alert v-if="!report.available" type="warning" show-icon :message="$t('researchExecution.insufficient')" :description="String(report.observations || 0)" />
      <template v-else>
        <p>{{ $t('researchExecution.observations') }}: {{ report.observations }} · {{ report.as_of }}</p>
        <a-descriptions size="small" :column="2" bordered>
          <a-descriptions-item v-for="metric in metrics" :key="metric[0]" :label="$t('researchExecution.' + metric[1])">{{ percentage(report[metric[0]]) }}</a-descriptions-item>
        </a-descriptions>
        <a-button icon="download" @click="downloadModel">{{ $t('researchExecution.exportModel') }}</a-button>
      </template>
    </template>
  </section>
</template>
<script>
import { analyzePortfolioRisk } from '@/api/researchExecution'
import { parseReturnFile, percentage } from '@/utils/researchExecution'
export default {
  name: 'PortfolioRiskAnalysis',
  data () { return { returns: {}, weights: {}, report: null, error: '', loading: false, epoch: 0 } },
  computed: {
    symbols () { return Object.keys(this.returns) },
    metrics () { return [['daily_volatility', 'dailyVol'], ['annualized_volatility', 'annualVol'], ['empirical_var_95', 'var'], ['empirical_expected_shortfall_95', 'es'], ['stress_return', 'stress'], ['gross_weight', 'gross'], ['net_weight', 'net']] }
  },
  watch: { weights: { deep: true, handler () { this.report = null } } },
  beforeDestroy () { this.epoch++ },
  methods: {
    percentage,
    async importReturns (event) {
      const file = event.target.files[0]
      if (!file) return
      try {
        if (file.size > 10 * 1024 * 1024) throw new Error('invalid')
        const parsed = parseReturnFile(await file.text())
        this.returns = parsed.returns; this.weights = parsed.weights; this.report = null; this.error = ''
      } catch (error) { this.error = this.$t('researchExecution.invalidReturnFile') } finally { event.target.value = '' }
    },
    async analyze () {
      if (this.loading) return
      const epoch = this.epoch
      this.loading = true; this.error = ''; this.report = null
      try {
        const response = await analyzePortfolioRisk({ returns: this.returns, weights: this.weights, shrinkage: 0.2, annualPeriods: 252 })
        if (epoch === this.epoch) this.report = response.data
      } catch (error) { if (epoch === this.epoch) this.error = error.backendMessage || error.message || this.$t('researchExecution.failed') } finally { if (epoch === this.epoch) this.loading = false }
    },
    downloadModel () {
      if (!this.report || !this.report.available) return
      const url = URL.createObjectURL(new Blob([JSON.stringify(this.report.model, null, 2)], { type: 'application/json' }))
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'portfolio-risk-model.json'; anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
  }
}
</script>
<style scoped>
.portfolio-risk-analysis { padding: 18px; }
.portfolio-risk-analysis p { opacity: .75; }
.weight-row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; }
.portfolio-risk-analysis .ant-btn, .portfolio-risk-analysis .ant-alert { margin-top: 12px; }
</style>
