<template>
  <div class="polymarket-lab qd-page-frame" :class="{ 'theme-dark': dark }">
    <header class="lab-header">
      <div><h1>{{ $t('polymarket.title') }}</h1><p>{{ $t('polymarket.subtitle') }}</p></div>
      <a-tag color="blue">{{ $t('polymarket.scope') }}</a-tag>
    </header>
    <a-alert type="info" show-icon :message="$t('polymarket.scopeHint')" />
    <section class="lab-card lab-onboarding">
      <h3>{{ $t('polymarket.fundsTitle') }}</h3>
      <div class="account-grid">
        <div class="account-fact">
          <span>{{ $t('polymarket.executionMode') }}</span>
          <strong><a-icon type="experiment" /> {{ $t('polymarket.paperOnly') }}</strong>
          <p>{{ $t('polymarket.paperModeHint') }}</p>
        </div>
        <div class="account-fact">
          <span>{{ $t('polymarket.tradingWallet') }}</span>
          <strong><a-icon type="wallet" /> {{ $t('polymarket.walletUnavailable') }}</strong>
          <p>{{ $t('polymarket.walletHint') }}</p>
        </div>
        <div class="account-fact">
          <span>{{ $t('polymarket.runBudget') }}</span>
          <strong>{{ formatNumber(settings.budget) }} {{ $t('polymarket.virtualPusd') }}</strong>
          <p>{{ $t('polymarket.budgetHint') }}</p>
        </div>
      </div>
      <p class="currency-note">{{ $t('polymarket.currencyHint') }} <a href="https://docs.polymarket.com/concepts/pusd" target="_blank" rel="noopener noreferrer">{{ $t('polymarket.currencyDocs') }} <a-icon type="export" /></a></p>
      <a-collapse :bordered="false" class="lab-guide">
        <a-collapse-panel key="guide" :header="$t('polymarket.guideTitle')">
          <h4>{{ $t('polymarket.logicTitle') }}</h4>
          <p>{{ $t('polymarket.logicHint') }}</p>
          <div class="arbitrage-formula">{{ $t('polymarket.formula') }}</div>
          <p>{{ $t('polymarket.example') }}</p>
          <ol class="guide-steps">
            <li><strong>{{ $t('polymarket.stepScan') }}</strong><p>{{ $t('polymarket.stepScanHint') }}</p></li>
            <li><strong>{{ $t('polymarket.stepPaper') }}</strong><p>{{ $t('polymarket.stepPaperHint') }}</p></li>
            <li><strong>{{ $t('polymarket.stepReview') }}</strong><p>{{ $t('polymarket.stepReviewHint') }}</p></li>
          </ol>
          <p class="hint">{{ $t('polymarket.noOpportunityHint') }}</p>
          <p class="hint">{{ $t('polymarket.liveRequirements') }}</p>
          <a href="https://docs.polymarket.com/trading/positions/manage" target="_blank" rel="noopener noreferrer">{{ $t('polymarket.mergeDocs') }} <a-icon type="export" /></a>
        </a-collapse-panel>
      </a-collapse>
    </section>
    <a-alert
      v-if="error"
      type="error"
      show-icon
      :message="label(error)"
      closable
      @close="error = ''" />
    <a-alert v-if="pending" type="warning" show-icon :message="$t('polymarket.pendingHint')">
      <a-button slot="description" :loading="submitting" @click="retryPending">{{ $t('polymarket.retry') }}</a-button>
    </a-alert>

    <section class="lab-card">
      <h3>{{ $t('polymarket.settings') }}</h3>
      <div class="settings-grid">
        <label v-for="key in basicSettings" :key="key">{{ $t('polymarket.' + key) }}<a-input-number v-model="settings[key]" :min="0" :disabled="controlsDisabled" /></label>
        <label>{{ $t('polymarket.durationSeconds') }}<a-input-number v-model="durationSeconds" :min="2" :max="30" :disabled="controlsDisabled" /></label>
        <label>{{ $t('polymarket.sampleIntervalMs') }}<a-input-number v-model="sampleIntervalMs" :min="500" :max="5000" :step="500" :disabled="controlsDisabled" /></label>
      </div>
      <label class="market-input">{{ $t('polymarket.marketIds') }}<a-input v-model="marketIds" :placeholder="$t('polymarket.marketIdsHint')" :disabled="controlsDisabled" /></label>
      <a-collapse class="assumptions" :bordered="false">
        <a-collapse-panel key="costs" :header="$t('polymarket.advanced')">
          <div class="settings-grid">
            <label v-for="key in advancedSettings" :key="key">{{ $t('polymarket.' + key) }}<a-input-number v-model="settings[key]" :min="0" :disabled="controlsDisabled" /></label>
            <label>{{ $t('polymarket.orderType') }}<a-select v-model="settings.orderType" :disabled="controlsDisabled"><a-select-option value="FOK">FOK</a-select-option><a-select-option value="FAK">FAK</a-select-option></a-select></label>
          </div>
        </a-collapse-panel>
      </a-collapse>
      <p class="hint">{{ $t('polymarket.costHint') }}</p>
      <div class="toolbar">
        <a-button type="primary" icon="radar-chart" :disabled="controlsDisabled" @click="startScan">{{ $t('polymarket.scan') }}</a-button>
        <a-button icon="reload" :loading="loading" @click="loadHistory">{{ $t('polymarket.refresh') }}</a-button>
        <a-button v-if="activeJob(scanJob)" @click="cancel(scanJob)">{{ $t('polymarket.cancel') }}</a-button>
        <span v-if="scanJob">{{ label(scanJob.status) }} · {{ label((scanJob.progress || {}).phase) }} · {{ $t('polymarket.samples') }}: {{ (scanJob.result || scanJob.progress || {}).sampleCount || 0 }}</span>
      </div>
      <p class="hint">{{ $t('polymarket.scanLimit') }}</p>
    </section>

    <section class="lab-card">
      <div class="section-header"><h3>{{ $t('polymarket.opportunities') }}</h3><a-button v-if="scanJob && scanJob.status === 'succeeded'" icon="download" @click="download(scanJob)">{{ $t('polymarket.evidence') }}</a-button></div>
      <a-table
        :columns="quoteColumns"
        :data-source="rows"
        row-key="marketId"
        :pagination="false"
        :scroll="{ x: 1050 }"
        size="small">
        <template slot="market" slot-scope="value, row"><strong>{{ row.question }}</strong><small>#{{ row.marketId }}</small></template>
        <template slot="numeric" slot-scope="value">{{ formatNumber(value) }}</template>
        <template slot="observed" slot-scope="value">{{ time(value) }}</template>
        <template slot="verdict" slot-scope="value, row"><a-tag :color="row.eligible ? 'green' : 'default'">{{ row.eligible ? $t('polymarket.eligible') : label(row.reason) }}</a-tag><small v-if="isStale(row)">{{ $t('polymarket.stale') }}</small></template>
        <template slot="actions" slot-scope="value, row"><a-button size="small" :disabled="controlsDisabled || !scanJob || scanJob.status !== 'succeeded'" @click="startPaper(row)">{{ $t('polymarket.simulate') }}</a-button></template>
        <span slot="emptyText">{{ $t('polymarket.empty') }}</span>
      </a-table>
    </section>

    <section class="lab-card">
      <h3>{{ $t('polymarket.history') }}</h3>
      <div class="metrics">
        <div><span>{{ $t('polymarket.experiments') }}</span><b>{{ summary.observed }}</b></div>
        <div><span>{{ $t('polymarket.mergedCount') }}</span><b>{{ summary.merged }}</b></div>
        <div><span>{{ $t('polymarket.residualCount') }}</span><b :class="{ loss: summary.residual > 0 }">{{ summary.residual }}</b></div>
        <div><span>{{ $t('polymarket.closedPnl') }}</span><b :class="{ loss: summary.closedPnl < 0 }">{{ formatNumber(summary.closedPnl) }}</b></div>
      </div>
      <p class="hint">{{ $t('polymarket.statisticsHint') }}</p>
      <a-table
        :columns="historyColumns"
        :data-source="paperJobs"
        row-key="job_id"
        :pagination="{ pageSize: 5 }"
        :scroll="{ x: 850 }"
        size="small">
        <template slot="created" slot-scope="value">{{ time(value) }}</template>
        <template slot="status" slot-scope="value, row"><a-tag :color="(row.result || {}).status === 'needs_review' ? 'orange' : 'blue'">{{ label((row.result || {}).status || row.status) }}</a-tag></template>
        <template slot="profit" slot-scope="value, row">{{ formatNumber((row.result || {}).realizedPnl) }}</template>
        <template slot="actions" slot-scope="value, row"><a-button size="small" @click="selectRun(row)">{{ $t('polymarket.details') }}</a-button><a-button v-if="activeJob(row)" size="small" @click="cancel(row)">{{ $t('polymarket.cancel') }}</a-button></template>
      </a-table>
    </section>

    <section v-if="selectedRun" class="lab-card">
      <div class="section-header"><h3>{{ $t('polymarket.result') }}</h3><span>{{ label(selectedRun.status) }}</span></div>
      <p><code>{{ selectedRun.job_id }}</code> · {{ label((selectedRun.progress || {}).phase) }}</p>
      <a-alert v-if="selectedRun.error" type="error" :message="label(selectedRun.error)" />
      <template v-if="selectedRun.result">
        <h4>{{ (selectedRun.result.market || {}).question }}</h4>
        <a-alert v-if="selectedRun.result.reason" type="warning" :message="label(selectedRun.result.reason)" />
        <a-alert v-if="selectedRun.result.replayMatches !== undefined" :type="selectedRun.result.replayMatches ? 'success' : 'error'" :message="$t('polymarket.' + (selectedRun.result.replayMatches ? 'replayMatches' : 'replayMismatch'))" />
        <a-descriptions bordered size="small" :column="2">
          <a-descriptions-item v-for="key in resultMetrics" :key="key" :label="$t('polymarket.' + key)">{{ formatNumber(selectedRun.result[key]) }}</a-descriptions-item>
        </a-descriptions>
        <a-alert v-if="selectedRun.result.residuals.length" type="warning" show-icon :message="$t('polymarket.residuals')">
          <div slot="description"><p v-for="residual in selectedRun.result.residuals" :key="residual.assetId">{{ residual.outcome }} · {{ formatNumber(residual.quantity) }} · {{ $t('polymarket.residualCost') }} {{ formatNumber(residual.costBasis) }}</p></div>
        </a-alert>
        <h4>{{ $t('polymarket.fills') }}</h4>
        <a-table
          :columns="fillColumns"
          :data-source="selectedRun.result.fills"
          row-key="role"
          :pagination="false"
          :scroll="{ x: 600 }"
          size="small">
          <template slot="label" slot-scope="value">{{ label(value) }}</template>
          <template slot="numeric" slot-scope="value">{{ formatNumber(value) }}</template>
        </a-table>
        <p class="evidence-hash">{{ $t('polymarket.evidenceHash') }}: <code>{{ selectedRun.result.bundleHash }}</code></p>
        <div class="toolbar">
          <a-button v-if="selectedRun.kind === 'polymarket_paper'" :disabled="controlsDisabled" @click="replay(selectedRun)">{{ $t('polymarket.replay') }}</a-button>
          <a-button icon="download" @click="download(selectedRun)">{{ $t('polymarket.evidence') }}</a-button>
        </div>
      </template>
    </section>
  </div>
</template>

<script>
import { listPolymarketJobs, getPolymarketJob, submitPolymarketJob, cancelPolymarketJob, getPolymarketEvidence } from '@/api/polymarket'
import { activeJob, paperDefaults, formatNumber, pendingStorageKey, validatePending, scanRows, paperSummary, mergeJob } from '@/utils/polymarket'

export default {
  name: 'PolymarketLab',
  data () {
    return {
      settings: paperDefaults(),
      marketIds: '',
      durationSeconds: 15,
      sampleIntervalMs: 1000,
      scanJob: null,
      paperJobs: [],
      selectedRun: null,
      error: '',
      pending: null,
      loading: false,
      submitting: false,
      epoch: 0,
      revision: 0,
      timer: null,
      clock: null,
      now: Date.now()
    }
  },
  computed: {
    dark () { return ['dark', 'realdark'].includes(this.$store.state.app.theme) },
    owner () { return (this.$store.state.user.info || {}).id || 'unknown' },
    storageKey () { return pendingStorageKey(this.owner) },
    rows () { return scanRows(this.scanJob) },
    summary () { return paperSummary(this.paperJobs) },
    controlsDisabled () { return this.submitting || Boolean(this.pending) || activeJob(this.scanJob) || this.paperJobs.some(activeJob) },
    basicSettings () { return ['quantity', 'budget', 'minNetEdgeBps'] },
    advancedSettings () { return ['slippageBps', 'settlementCost', 'riskReserve', 'latencyMs', 'legDelayMs', 'maxBookAgeMs', 'maxUnhedgedMs', 'maxUnwindLoss'] },
    resultMetrics () { return ['realizedPnl', 'cashChange', 'mergedQuantity', 'residualCostBasis'] },
    quoteColumns () { return [this.column('market', 'question', 'market', 290), this.column('quantity', 'quantity', 'numeric'), this.column('acquisition', 'acquisitionCost', 'numeric'), this.column('fees', 'takerFees', 'numeric'), this.column('net', 'netProfit', 'numeric'), this.column('edge', 'netEdgeBps', 'numeric'), this.column('observed', 'observedMs', 'observed', 100), this.column('verdict', 'eligible', 'verdict', 200), this.column('actions', 'marketId', 'actions', 130)] },
    historyColumns () { return [this.column('jobId', 'job_id', null, 290), this.column('created', 'created_at', 'created', 160), this.column('status', 'status', 'status'), this.column('realizedPnl', 'result', 'profit'), this.column('actions', 'job_id', 'actions', 160)] },
    fillColumns () { return [this.column('role', 'role', 'label'), this.column('side', 'side', 'label'), this.column('filled', 'filled', 'numeric'), this.column('price', 'averagePrice', 'numeric'), this.column('fees', 'fee', 'numeric')] }
  },
  watch: {
    owner () { this.reset() }
  },
  mounted () { this.reset(); this.clock = setInterval(() => { this.now = Date.now() }, 1000) },
  beforeDestroy () { this.epoch++; clearTimeout(this.timer); clearInterval(this.clock) },
  methods: {
    activeJob,
    formatNumber,
    column (title, dataIndex, slot, width) { return { title: this.$t('polymarket.' + title), dataIndex, key: title, width, scopedSlots: slot ? { customRender: slot } : undefined } },
    label (value) { const text = String(value || ''); const key = text.startsWith('polymarket.') ? text : 'polymarket.' + text; return this.$te(key) ? this.$t(key) : text },
    time (value) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString() },
    isStale (row) { return this.now - Number(row.observedMs) > Number(this.settings.maxBookAgeMs) },
    reset () {
      this.epoch++; clearTimeout(this.timer); this.scanJob = null; this.paperJobs = []; this.selectedRun = null; this.pending = null; this.error = ''; this.submitting = false; this.loading = false
      try { this.pending = validatePending(JSON.parse(sessionStorage.getItem(this.storageKey))) } catch (error) { /* Optional recovery storage. */ }
      this.loadHistory()
    },
    fail (error) { this.error = error.backendMessage || error.message || 'polymarket.apiError' },
    async loadHistory () {
      if (this.loading) return
      const epoch = this.epoch
      const revision = this.revision
      this.loading = true
      try {
        const [scans, papers] = await Promise.all([listPolymarketJobs('polymarket_scan'), listPolymarketJobs('polymarket_paper')])
        if (epoch !== this.epoch) return
        if (revision === this.revision) this.scanJob = scans.data[0] ? mergeJob(this.scanJob, scans.data[0]) : this.scanJob
        const current = new Map(this.paperJobs.map(job => [job.job_id, job]))
        const received = papers.data || []
        this.paperJobs = [...this.paperJobs.filter(job => !received.some(row => row.job_id === job.job_id)), ...received.map(job => mergeJob(current.get(job.job_id), job))].slice(0, 20)
        if (this.selectedRun) this.selectedRun = mergeJob(this.selectedRun, this.paperJobs.find(job => job.job_id === this.selectedRun.job_id) || this.selectedRun)
        this.schedulePoll()
      } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.loading = false }
    },
    schedulePoll () {
      clearTimeout(this.timer)
      if (activeJob(this.scanJob) || this.paperJobs.some(activeJob) || activeJob(this.selectedRun)) this.timer = setTimeout(() => this.poll(), 2000)
    },
    async poll () {
      const epoch = this.epoch
      const jobs = [this.scanJob, ...this.paperJobs, this.selectedRun].filter(activeJob)
      const ids = [...new Set(jobs.map(job => job.job_id))]
      const results = await Promise.allSettled(ids.map(id => getPolymarketJob(id)))
      if (epoch !== this.epoch) return
      results.forEach((response, index) => {
        if (response.status !== 'fulfilled') { this.fail(response.reason); return }
        const job = response.value.data
        if (this.scanJob && this.scanJob.job_id === ids[index]) this.scanJob = mergeJob(this.scanJob, job)
        this.paperJobs = this.paperJobs.map(row => row.job_id === ids[index] ? mergeJob(row, job) : row)
        if (this.selectedRun && this.selectedRun.job_id === ids[index]) this.selectedRun = mergeJob(this.selectedRun, job)
      })
      this.schedulePoll()
    },
    async submit (kind, payload, sourceJobId) {
      if (this.controlsDisabled) return
      this.pending = { kind, payload: JSON.parse(JSON.stringify(payload)), sourceJobId, key: window.crypto.randomUUID() }
      try { sessionStorage.setItem(this.storageKey, JSON.stringify(this.pending)) } catch (error) { /* The server still enforces idempotency. */ }
      await this.retryPending()
    },
    async retryPending () {
      if (!this.pending || this.submitting) return
      const epoch = this.epoch
      const saved = this.pending
      this.submitting = true; this.error = ''
      try {
        const response = await submitPolymarketJob(saved)
        if (epoch !== this.epoch) return
        const job = response.data
        this.revision++
        if (saved.kind === 'scan') this.scanJob = job
        else { this.selectedRun = job; if (saved.kind === 'paper') this.paperJobs = [job, ...this.paperJobs.filter(row => row.job_id !== job.job_id)].slice(0, 20) }
        this.pending = null
        try { sessionStorage.removeItem(this.storageKey) } catch (error) { /* Optional recovery storage. */ }
        this.schedulePoll()
      } catch (error) {
        if (epoch === this.epoch) {
          this.fail(error)
          const status = error.response && error.response.status
          if (status >= 400 && status < 500 && ![408, 429].includes(status)) {
            this.pending = null
            try { sessionStorage.removeItem(this.storageKey) } catch (error) { /* Optional recovery storage. */ }
          }
        }
      } finally { if (epoch === this.epoch) this.submitting = false }
    },
    startScan () {
      const ids = this.marketIds.trim() ? this.marketIds.split(/[,，\s]+/).filter(Boolean) : []
      if (ids.length > 8 || ids.some(id => !/^\d{1,20}$/.test(id)) || Object.entries(this.settings).some(([key, value]) => key !== 'orderType' && (value === null || !Number.isFinite(Number(value)) || Number(value) < 0))) { this.error = 'polymarket.invalidInput'; return }
      this.submit('scan', { marketIds: [...new Set(ids)], marketLimit: 8, durationSeconds: this.durationSeconds, sampleIntervalMs: this.sampleIntervalMs, settings: { ...this.settings } })
    },
    startPaper (row) { this.submit('paper', { scanJobId: this.scanJob.job_id, marketId: row.marketId, settings: { ...this.settings } }) },
    replay (job) { this.submit('replay', {}, job.job_id) },
    selectRun (job) { this.selectedRun = job; this.schedulePoll() },
    async cancel (job) {
      const epoch = this.epoch
      try {
        const response = await cancelPolymarketJob(job.job_id)
        if (epoch !== this.epoch) return
        this.revision++
        if (this.scanJob && this.scanJob.job_id === job.job_id) this.scanJob = response.data
        this.paperJobs = this.paperJobs.map(row => row.job_id === job.job_id ? response.data : row)
        if (this.selectedRun && this.selectedRun.job_id === job.job_id) this.selectedRun = response.data
        this.schedulePoll()
      } catch (error) { if (epoch === this.epoch) this.fail(error) }
    },
    async download (job) {
      const epoch = this.epoch
      try {
        const response = await getPolymarketEvidence(job.job_id)
        if (epoch !== this.epoch) return
        const url = URL.createObjectURL(new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' }))
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `polymarket-${job.job_id}.json`; anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } catch (error) { if (epoch === this.epoch) this.fail(error) }
    }
  }
}
</script>

<style scoped>
.polymarket-lab { padding: 24px; color: #25324a; }
.lab-header, .section-header, .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.lab-header h1 { font-size: 24px; margin: 0 0 6px; }
.lab-header p, .hint { color: #748198; font-size: 13px; }
.lab-card { background: #fff; border: 1px solid #e4e9f0; border-radius: 12px; padding: 20px; margin-top: 18px; }
.settings-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.settings-grid label, .market-input { display: flex; flex-direction: column; gap: 7px; font-size: 13px; }
.settings-grid .ant-input-number, .settings-grid .ant-select { width: 100%; }
.account-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.account-fact { padding: 14px; border-radius: 8px; background: #f5f8fc; }
.account-fact > span { display: block; color: #748198; font-size: 12px; }
.account-fact strong { display: block; font-size: 17px; margin: 7px 0; }
.account-fact p { margin: 0; font-size: 12px; line-height: 1.7; }
.currency-note { font-size: 13px; line-height: 1.8; margin: 14px 0 8px; }
.lab-guide p { line-height: 1.8; }
.arbitrage-formula { padding: 12px; border-radius: 8px; background: #f0f8ee; font-weight: 600; margin: 12px 0; }
.guide-steps { padding-left: 20px; }
.guide-steps li { padding-left: 4px; margin-top: 12px; }
.guide-steps p { margin: 5px 0 0; }
.market-input, .assumptions, .hint { margin-top: 16px; }
.toolbar { justify-content: flex-start; }
.metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; }
.metrics div { background: #f5f8fc; border-radius: 8px; padding: 16px; }
.metrics span, small { display: block; color: #748198; font-size: 12px; }
.metrics b { display: block; font-size: 25px; margin-top: 6px; }
.loss { color: #d46b08; }
.evidence-hash { overflow-wrap: anywhere; font-size: 12px; margin-top: 16px; }
.lab-card h4, .lab-card .ant-alert { margin-top: 16px; }
.lab-card .ant-table .ant-btn { margin: 2px 4px 2px 0; }
.polymarket-lab > .ant-alert { margin-top: 12px; }
.theme-dark { color: #dbe4f2; }
.theme-dark .lab-card { background: #182132; border-color: #2b374c; }
.theme-dark .metrics div { background: #202d42; }
.theme-dark .account-fact { background: #202d42; }
.theme-dark .arbitrage-formula { background: #20352d; }
.theme-dark ::v-deep .ant-collapse { background: #202d42; }
.theme-dark ::v-deep .ant-collapse-header { color: #dbe4f2 !important; }
.theme-dark ::v-deep .ant-collapse-content { background: #182132; color: #dbe4f2; border-color: #2b374c; }
.theme-dark h1, .theme-dark h3, .theme-dark h4 { color: #edf3ff; }
.theme-dark ::v-deep .ant-descriptions-item-content { color: #dbe4f2; background: #182132; }
.theme-dark ::v-deep .ant-descriptions-item-label { color: #dbe4f2; background: #202d42; }
@media (max-width: 900px) { .account-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .polymarket-lab { padding: 12px; } .lab-card { padding: 14px; } }
</style>
