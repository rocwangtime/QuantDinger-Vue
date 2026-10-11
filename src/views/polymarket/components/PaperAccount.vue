<template>
  <section class="paper-account">
    <div class="account-toolbar">
      <h3>{{ $t('polymarket.accountTitle') }}</h3>
      <a-tag color="blue">{{ $t('polymarket.accountSimulated') }}</a-tag>
      <a-button size="small" :loading="loading" @click="refresh">{{ $t('polymarket.manualRefresh') }}</a-button>
      <a-button size="small" @click="download('csv')">CSV</a-button>
      <a-button size="small" @click="download('json')">JSON</a-button>
    </div>
    <p>{{ $t('polymarket.accountHint') }}</p>
    <a-alert v-if="!status.enabled" type="info" show-icon :message="$t('polymarket.accountDisabled')" />
    <a-alert v-if="status.loss_stop" type="warning" show-icon :message="$t('polymarket.accountLossStop')" />
    <a-alert v-if="error" type="error" :message="error" />
    <div class="account-metrics">
      <div v-for="key in metrics" :key="key"><span>{{ $t('polymarket.account_' + key) }}</span><b>{{ number(status[key]) }}</b></div>
    </div>
    <p>{{ $t('polymarket.accountLatency') }}: {{ number(latency.median_rtt_ms) }} / {{ number(latency.p90_rtt_ms) }} ms · {{ $t('polymarket.accountDelay') }}: {{ number(latency.one_way_ms) }} ms <a-tag v-if="latency.fallback">{{ $t('polymarket.accountFallback') }}</a-tag></p>
    <div class="account-toolbar">
      <h4>{{ $t('polymarket.accountReport') }}</h4>
      <a-select v-model="days" size="small" @change="refresh"><a-select-option :value="7">7d</a-select-option><a-select-option :value="30">30d</a-select-option><a-select-option :value="90">90d</a-select-option></a-select>
    </div>
    <a-table
      size="small"
      :data-source="reports"
      row-key="day"
      :columns="reportColumns"
      :pagination="{ pageSize: 7 }"
      :scroll="{ x: 1200 }">
      <template slot="pnl" slot-scope="value"><span :class="{ loss: Number(value) < 0 }">{{ number(value) }}</span></template>
      <template slot="percent" slot-scope="value">{{ number(Number(value) * 100) }}%</template>
      <template slot="groups" slot-scope="value"><span v-for="(group, kind) in value" :key="kind">{{ $t('polymarket.' + kind) }}: {{ group.filled }}/{{ group.attempted }} · {{ number(group.net_pnl) }} </span></template>
    </a-table>
    <h4>{{ $t('polymarket.accountTrades') }}</h4>
    <div class="account-toolbar">
      <a-select v-model="tradeStatus" allow-clear :placeholder="$t('polymarket.status')" style="width: 200px" @change="filterTrades"><a-select-option v-for="item in statuses" :key="item" :value="item">{{ $t('polymarket.accountStatus_' + item) }}</a-select-option></a-select>
      <a-select v-model="marketType" allow-clear :placeholder="$t('polymarket.market_type')" style="width: 140px" @change="filterTrades"><a-select-option value="yes_no">YES / NO</a-select-option><a-select-option value="up_down">{{ $t('polymarket.up_down') }}</a-select-option></a-select>
    </div>
    <a-table
      size="small"
      :data-source="trades"
      row-key="id"
      :columns="tradeColumns"
      :pagination="pagination"
      @change="pageChanged">
      <template slot="status" slot-scope="value">{{ $t('polymarket.accountStatus_' + value) }}</template>
      <template slot="actions" slot-scope="value, row"><a-button size="small" @click="inspect(row.id)">{{ $t('polymarket.details') }}</a-button></template>
    </a-table>
    <a-modal :visible="!!selected" :title="$t('polymarket.accountEvidence')" :footer="null" :width="850" @cancel="selected = null">
      <template v-if="selected">
        <p>{{ selected.market_id }} · {{ $t('polymarket.accountStatus_' + selected.status) }}</p>
        <p>{{ $t('polymarket.evidenceHash') }}: {{ selected.evidence_hash }}</p>
        <p>{{ $t('polymarket.accountDelay') }}: {{ selected.evidence.latency.one_way_ms }} ms · {{ $t('polymarket.accountCompetitors') }}: {{ number(Number(selected.evidence.config.competitor_top) * 100) }}%</p>
        <p>{{ $t('polymarket.accountDecision') }}: {{ selected.evidence.decision.reason || selected.evidence.decision.binding }}</p>
        <a-button :disabled="selected.status === 'pending'" :loading="replaying" @click="replay">{{ $t('polymarket.replay') }}</a-button>
        <a-alert v-if="replayResult" :type="replayResult.replayMatches ? 'success' : 'error'" :message="$t('polymarket.' + (replayResult.replayMatches ? 'replayMatches' : 'replayMismatch'))" />
        <h4>{{ $t('polymarket.fills') }}</h4>
        <pre>{{ JSON.stringify(selected.result, null, 2) }}</pre>
        <a-collapse><a-collapse-panel key="evidence" :header="$t('polymarket.accountEvidence')"><pre>{{ JSON.stringify(selected.evidence, null, 2) }}</pre></a-collapse-panel></a-collapse>
      </template>
    </a-modal>
  </section>
</template>

<script>
import { getPaperAccountStatus, getPaperAccountTrades, getPaperAccountTrade, replayPaperAccountTrade, getPaperAccountReport, exportPaperAccountReport } from '@/api/polymarket'
import { formatNumber } from '@/utils/polymarket'

export default {
  name: 'PaperAccount',
  data () {
    return { status: {}, reports: [], trades: [], total: 0, page: 1, days: 30, tradeStatus: undefined, marketType: undefined, selected: null, replayResult: null, loading: false, replaying: false, error: '', timer: null }
  },
  computed: {
    latency () { return this.status.latency || {} },
    metrics () { return ['equity', 'free_capital', 'locked_capital', 'open_positions', 'today_pnl'] },
    statuses () { return ['pending', 'not_filled', 'filled_merged', 'single_leg_unwound', 'single_leg_residual', 'cancelled_by_limit'] },
    pagination () { return { current: this.page, pageSize: 20, total: this.total } },
    reportColumns () {
      return ['day', 'attempted', 'filled', 'fill_rate', 'single_leg_failures', 'unwinds', 'net_pnl', 'fees', 'max_drawdown', 'capital_utilization_avg', 'capital_utilization_max', 'opportunities', 'by_market_type'].map(key => ({ title: this.$t('polymarket.account_' + key), dataIndex: key, key, scopedSlots: { customRender: key === 'net_pnl' ? 'pnl' : ['fill_rate', 'capital_utilization_avg', 'capital_utilization_max'].includes(key) ? 'percent' : key === 'by_market_type' ? 'groups' : undefined } }))
    },
    tradeColumns () {
      return [{ title: this.$t('polymarket.market'), dataIndex: 'market_id' }, { title: this.$t('polymarket.market_type'), dataIndex: 'market_type' }, { title: this.$t('polymarket.observed'), dataIndex: 'signal_at' }, { title: this.$t('polymarket.status'), dataIndex: 'status', scopedSlots: { customRender: 'status' } }, { title: this.$t('polymarket.actions'), key: 'actions', scopedSlots: { customRender: 'actions' } }]
    }
  },
  mounted () { this.refresh(); this.timer = setInterval(this.refresh, 15000) },
  beforeDestroy () { clearInterval(this.timer) },
  methods: {
    number: formatNumber,
    async refresh () {
      if (this.loading) return
      this.loading = true
      try {
        const [status, report, trades] = await Promise.all([getPaperAccountStatus(), getPaperAccountReport({ days: this.days }), getPaperAccountTrades({ limit: 20, offset: (this.page - 1) * 20, status: this.tradeStatus, market_type: this.marketType })])
        this.status = status.data || {}; this.reports = report.data || []; this.trades = trades.data.items || []; this.total = trades.data.total || 0; this.error = ''
      } catch (error) { this.error = this.$t('polymarket.apiError') } finally { this.loading = false }
    },
    filterTrades () { this.page = 1; this.refresh() },
    pageChanged (pagination) { this.page = pagination.current; this.refresh() },
    async inspect (id) { try { this.selected = (await getPaperAccountTrade(id)).data; this.replayResult = null } catch (error) { this.error = this.$t('polymarket.apiError') } },
    async replay () { this.replaying = true; try { this.replayResult = (await replayPaperAccountTrade(this.selected.id)).data } catch (error) { this.error = this.$t('polymarket.apiError') } finally { this.replaying = false } },
    async download (format) {
      try {
        const blob = await exportPaperAccountReport({ format, days: this.days })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a'); link.href = url; link.download = `polymarket-paper-report.${format}`; link.click(); URL.revokeObjectURL(url)
      } catch (error) { this.error = this.$t('polymarket.apiError') }
    }
  }
}
</script>

<style scoped>
.paper-account { padding: 22px; margin: 18px 0; border: 1px solid #dce3ed; border-radius: 12px; }
.account-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 12px 0; }
.account-toolbar h3, .account-toolbar h4 { margin: 0; }
.account-metrics { display: flex; flex-wrap: wrap; gap: 24px; margin: 20px 0; }
.account-metrics span, .account-metrics b { display: block; }
.account-metrics b { font-size: 22px; }
pre { max-height: 360px; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; }
.loss { color: #dc4444; }
</style>
