<template>
  <section class="us-screener" :class="{ dark: dark }">
    <div class="heading"><div><h2>{{ t('title') }}</h2><p>{{ t('research') }}</p></div><a-button :loading="loading" @click="refresh">{{ t('refresh') }}</a-button></div>
    <a-alert v-if="error" type="error" :message="t('error')" show-icon />
    <p v-if="!run && !loading">{{ t('empty') }}</p>
    <template v-if="run">
      <p>{{ t('asOf') }}: {{ run.as_of }} · {{ t('regime') }}: {{ t('regime_' + (run.regime.flag || 'unknown')) }} · {{ t('status') }}: {{ t('status_' + run.status) }}</p>
      <a-alert v-if="warning" type="warning" :message="t('universeWarning')" show-icon />
      <p v-if="run.error">{{ t('runError') }}: {{ run.error }}</p>
      <details><summary>{{ t('params') }}</summary><pre>{{ JSON.stringify(run.params, null, 2) }}</pre></details>
      <p>{{ t('scoreFormula') }}</p>
      <div class="table-scroll"><table><thead><tr><th>{{ t('symbol') }}</th><th>{{ t('rank') }}</th><th>{{ t('score') }}</th><th v-for="key in metrics" :key="key">{{ t(key) }}</th><th>{{ t('flags') }}</th></tr></thead>
        <tbody><tr v-for="row in groups.included" :key="row.symbol"><td>{{ row.symbol }}</td><td>{{ row.rank }}</td><td>{{ metric('score', row.score) }}</td><td v-for="key in metrics" :key="key">{{ metric(key, row.features[key]) }}</td><td>{{ reasons(row.flags) }}</td></tr></tbody></table></div>
      <details><summary>{{ t('excluded') }} ({{ groups.excluded.length }})</summary><div class="table-scroll"><table><thead><tr><th>{{ t('symbol') }}</th><th>{{ t('reasons') }}</th><th>{{ t('flags') }}</th></tr></thead><tbody><tr v-for="row in groups.excluded" :key="row.symbol"><td>{{ row.symbol }}</td><td>{{ reasons(row.exclusion_reasons) }}</td><td>{{ reasons(row.flags) }}</td></tr></tbody></table></div></details>
    </template>
  </section>
</template>
<script>
import { latestScreener } from '@/api/usScreener'
import { isDarkTheme, splitSymbols, formatMetric } from './model.mjs'
export default {
  name: 'UsScreener',
  data: () => ({ run: null, loading: false, error: false, metrics: ['price', 'avg_dollar_volume20', 'spread_bps', 'momentum20', 'momentum60', 'volatility20', 'atr14_pct', 'distance_ma50'] }),
  computed: {
    dark () { return isDarkTheme(this.$store.getters.theme) },
    groups () { return splitSymbols(this.run) },
    warning () { return this.run && this.run.regime && this.run.regime.universe_metadata && this.run.regime.universe_metadata.verification }
  },
  mounted () { this.refresh() },
  methods: {
    t (key) { return this.$t('usScreener.' + key) },
    metric: formatMetric,
    reasons (values) { return (values || []).map(v => this.t('reason_' + v)).join(', ') || '—' },
    async refresh () {
      this.loading = true
      this.error = false
      try { this.run = await latestScreener() } catch (_) { this.error = true } finally { this.loading = false }
    }
  }
}
</script>
<style scoped>
.us-screener { --screen-bg: #fff; --screen-text: #263445; --screen-border: #dce3eb; background: var(--screen-bg); color: var(--screen-text); border: 1px solid var(--screen-border); border-radius: 8px; padding: 20px; margin-bottom: 20px; }
.us-screener.dark { --screen-bg: #182233; --screen-text: #e3eaf4; --screen-border: #2a3649; }
.heading { display: flex; justify-content: space-between; gap: 16px; }
h2 { color: inherit; }
.table-scroll { overflow-x: auto; margin: 12px 0; }
table { width: 100%; border-collapse: collapse; white-space: nowrap; }
th, td { padding: 10px; border-bottom: 1px solid var(--screen-border); text-align: right; }
th:first-child, td:first-child { text-align: left; }
pre { color: inherit; white-space: pre-wrap; }
summary { cursor: pointer; margin: 10px 0; }
</style>
