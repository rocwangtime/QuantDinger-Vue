<template>
  <div class="agent-trade-intents">
    <a-alert type="warning" show-icon :message="$t('agentTrade.notice')" />
    <a-card :title="$t('agentTrade.tab')" :bordered="false" class="policy-card">
      <label class="account-picker">
        {{ $t('agentTrade.account') }}
        <a-select v-model="selectedAccount" @change="refresh" style="min-width: 290px">
          <a-select-option value="platform">{{ $t('agentTrade.internalPaper') }}</a-select-option>
          <a-select-option v-for="item in futuCredentials" :key="item.id" :value="`futu:${item.id}`">
            {{ $t('agentTrade.futuSimulate') }} · {{ item.name || `#${item.id}` }} (#{{ item.id }})
          </a-select-option>
        </a-select>
      </label>
      <div class="status-line">
        <span>{{ $t('agentTrade.mode') }}:</span>
        <a-tag :color="policy.mode === 'EMERGENCY_STOP' ? 'red' : (policy.mode === 'PAPER_AUTO' ? 'orange' : 'blue')">
          {{ policy.mode || 'PLAN_ONLY' }}
        </a-tag>
        <span v-if="policy.enabled_until">{{ $t('agentTrade.expires') }}: {{ formatTime(policy.enabled_until) }}</span>
      </div>
      <p class="policy-note">{{ selectedBroker === 'futu' ? $t('agentTrade.futuPaperOnly') : $t('agentTrade.paperOnly') }}</p>
      <router-link v-if="selectedBroker === 'futu'" to="/broker-accounts">{{ $t('agentTrade.openAccountCenter') }}</router-link>
      <div class="policy-grid">
        <label>{{ $t('agentTrade.markets') }}<a-input v-model="form.markets" :disabled="selectedBroker === 'futu'" :placeholder="selectedBroker === 'futu' ? selectedMarketCategory : 'Crypto'" /></label>
        <label>{{ $t('agentTrade.symbols') }}<a-input v-model="form.symbols" :placeholder="selectedBroker === 'futu' ? (selectedFutuMarket === 'HK' ? '00700.HK' : 'AAPL') : 'BTC/USDT'" /></label>
        <label>{{ $t('agentTrade.maxOrder') }}{{ quoteCurrency ? ` (${quoteCurrency})` : '' }}<a-input-number v-model="form.maxOrder" :min="1" :max="100000" :precision="2" /></label>
        <label>{{ $t('agentTrade.maxDaily') }}{{ quoteCurrency ? ` (${quoteCurrency})` : '' }}<a-input-number v-model="form.maxDaily" :min="1" :max="1000000" :precision="2" /></label>
        <label>{{ $t('agentTrade.maxCount') }}<a-input-number v-model="form.maxCount" :min="1" :max="100" /></label>
        <label>{{ $t('agentTrade.enableText') }}<a-input v-model="enableText" placeholder="PAPER_AUTO" autocomplete="off" /></label>
      </div>
      <div class="policy-actions">
        <a-button type="primary" :loading="saving" @click="changeMode('PAPER_AUTO')">{{ $t(selectedBroker === 'futu' ? 'agentTrade.enableFutu' : 'agentTrade.enable') }}</a-button>
        <a-button :loading="saving" @click="changeMode('PLAN_ONLY')">{{ $t('agentTrade.plan') }}</a-button>
        <a-popconfirm :title="$t('agentTrade.stop') + '?'" @confirm="changeGlobalMode('EMERGENCY_STOP')">
          <a-button type="danger" :loading="saving">{{ $t('agentTrade.stop') }}</a-button>
        </a-popconfirm>
        <a-popconfirm :title="$t('agentTrade.cancelOrders') + '?'" @confirm="cancelOrders">
          <a-button :loading="saving">{{ $t('agentTrade.cancelOrders') }}</a-button>
        </a-popconfirm>
        <a-button v-if="globalPolicy.configured_mode === 'EMERGENCY_STOP'" :loading="saving" @click="changeGlobalMode('PLAN_ONLY')">
          {{ $t('agentTrade.resetStop') }}
        </a-button>
        <a-button :loading="loading" @click="refresh">{{ $t('agentTrade.refresh') }}</a-button>
      </div>
    </a-card>

    <a-card :title="$t('agentTrade.intents')" :bordered="false">
      <a-table
        :columns="columns"
        :dataSource="intents"
        :loading="loading"
        :rowKey="row => row.id"
        :pagination="{ pageSize: 15 }"
        size="small">
        <template slot="created" slot-scope="text">{{ formatTime(text) }}</template>
        <template slot="broker" slot-scope="text"><a-tag :color="text === 'futu' ? 'cyan' : 'blue'">{{ text }}</a-tag></template>
        <template slot="symbol" slot-scope="text, row">{{ row.order_spec && row.order_spec.symbol }}</template>
        <template slot="side" slot-scope="text, row">{{ row.order_spec && row.order_spec.side }}</template>
        <template slot="quantity" slot-scope="text, row">{{ row.order_spec && row.order_spec.qty }}</template>
        <template slot="status" slot-scope="text"><a-tag :color="statusColor(text)">{{ text }}</a-tag></template>
        <template slot="quote" slot-scope="text, row">{{ row.quote_snapshot && row.quote_snapshot.provider || '-' }}</template>
        <template slot="brokerOrder" slot-scope="text">{{ text || '-' }}</template>
        <template slot="filledQty" slot-scope="text">{{ text || 0 }}</template>
      </a-table>
    </a-card>
  </div>
</template>

<script>
import { getAgentTradingPolicy, setAgentTradingPolicy, listAgentTradeIntents, cancelAgentOrders } from '@/api/agent'
import { listExchangeCredentials } from '@/api/credentials'

const emptyPolicy = () => ({ mode: 'PLAN_ONLY', configured_mode: 'PLAN_ONLY', enabled_until: null })

export default {
  name: 'AgentTradeIntents',
  data () {
    return {
      policy: emptyPolicy(),
      globalPolicy: emptyPolicy(),
      selectedAccount: 'platform',
      futuCredentials: [],
      intents: [],
      loading: false,
      saving: false,
      enableText: '',
      form: { markets: '', symbols: '', maxOrder: 1000, maxDaily: 5000, maxCount: 10 }
    }
  },
  computed: {
    selectedBroker () { return this.selectedAccount.startsWith('futu:') ? 'futu' : 'platform' },
    selectedAccountRef () { return this.selectedBroker === 'futu' ? `credential:${this.selectedAccount.split(':')[1]}` : 'default' },
    selectedFutuMarket () {
      if (this.selectedBroker !== 'futu') return ''
      const id = Number(this.selectedAccount.split(':')[1])
      const item = this.futuCredentials.find(row => Number(row.id) === id)
      const explicit = String(item && item.trade_market || '').toUpperCase()
      const hinted = String(item && item.api_key_hint || '').match(/\(demo\/(US|HK)\)/i)
      const market = explicit || (hinted && hinted[1] || '').toUpperCase()
      return ['US', 'HK'].includes(market) ? market : ''
    },
    selectedMarketCategory () { return this.selectedFutuMarket === 'HK' ? 'HKStock' : this.selectedFutuMarket === 'US' ? 'USStock' : '' },
    quoteCurrency () { return this.selectedFutuMarket === 'HK' ? 'HKD' : this.selectedFutuMarket === 'US' ? 'USD' : '' },
    columns () {
      return [
        { title: 'ID', dataIndex: 'id', width: 65 },
        { title: this.$t('agentTrade.time'), dataIndex: 'created_at', scopedSlots: { customRender: 'created' } },
        { title: this.$t('agentTrade.broker'), dataIndex: 'broker', scopedSlots: { customRender: 'broker' } },
        { title: this.$t('agentTrade.symbol'), scopedSlots: { customRender: 'symbol' } },
        { title: this.$t('agentTrade.side'), scopedSlots: { customRender: 'side' } },
        { title: this.$t('agentTrade.quantity'), scopedSlots: { customRender: 'quantity' } },
        { title: this.$t('agentTrade.status'), dataIndex: 'status', scopedSlots: { customRender: 'status' } },
        { title: this.$t('agentTrade.quote'), scopedSlots: { customRender: 'quote' } },
        { title: this.$t('agentTrade.brokerOrder'), dataIndex: 'broker_order_id', scopedSlots: { customRender: 'brokerOrder' } },
        { title: this.$t('agentTrade.filledQty'), dataIndex: 'filled_qty', scopedSlots: { customRender: 'filledQty' } }
      ]
    }
  },
  mounted () { this.loadCredentials(); this.refresh() },
  methods: {
    async loadCredentials () {
      try {
        const response = await listExchangeCredentials()
        const items = response && response.data && response.data.items || []
        this.futuCredentials = items.filter(item => String(item.exchange_id).toLowerCase() === 'futu' && item.environment === 'demo')
      } catch (_) {
        this.futuCredentials = []
      }
    },
    formatTime (value) {
      if (!value) return '-'
      const date = new Date(value)
      return isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    },
    statusColor (status) {
      return ({ FILLED: 'green', REJECTED: 'red', FAILED: 'red', EXPIRED: 'orange', CANCELLED: 'default', SUBMITTED: 'blue', UNCERTAIN: 'orange', PARTIALLY_FILLED: 'cyan', EXECUTING: 'cyan' })[status] || 'cyan'
    },
    csv (value) {
      return String(value || '').split(',').map(item => item.trim()).filter(Boolean)
    },
    failure (error) {
      this.$message.error(this.$t('agentTrade.failed', { message: error.message || String(error) }))
    },
    async refresh () {
      this.loading = true
      const broker = this.selectedBroker
      const accountRef = this.selectedAccountRef
      try {
        const [policy, globalPolicy, intents] = await Promise.all([
          getAgentTradingPolicy({ broker, account_ref: accountRef }),
          getAgentTradingPolicy({ broker: '*', account_ref: '*' }),
          listAgentTradeIntents()
        ])
        if (broker !== this.selectedBroker || accountRef !== this.selectedAccountRef) return
        this.policy = (policy && policy.data) || emptyPolicy()
        this.globalPolicy = (globalPolicy && globalPolicy.data) || emptyPolicy()
        this.intents = (intents && intents.data) || []
        this.form = {
          markets: broker === 'futu' ? this.selectedMarketCategory : (this.policy.allowed_markets || []).join(','),
          symbols: (this.policy.allowed_symbols || []).join(','),
          maxOrder: Number(this.policy.max_order_notional || 1000),
          maxDaily: Number(this.policy.max_daily_notional || 5000),
          maxCount: Number(this.policy.max_orders_per_day || 10)
        }
      } catch (error) {
        this.failure(error)
      } finally {
        this.loading = false
      }
    },
    async changeMode (mode) {
      if (mode === 'PAPER_AUTO' && this.selectedBroker === 'futu' && !this.selectedMarketCategory) {
        this.$message.warning(this.$t('agentTrade.marketUnknown'))
        return
      }
      if (mode === 'PAPER_AUTO' && this.enableText !== 'PAPER_AUTO') {
        this.$message.warning(this.$t('agentTrade.confirmRequired'))
        return
      }
      this.saving = true
      try {
        await setAgentTradingPolicy({
          broker: this.selectedBroker,
          account_ref: this.selectedAccountRef,
          mode,
          confirm_mode: mode,
          allowed_markets: this.selectedBroker === 'futu' ? [this.selectedMarketCategory].filter(Boolean) : this.csv(this.form.markets),
          allowed_symbols: this.csv(this.form.symbols),
          max_order_notional: this.form.maxOrder,
          max_daily_notional: this.form.maxDaily,
          max_orders_per_day: this.form.maxCount,
          allow_market_order: false,
          allow_short: false,
          enabled_until: mode === 'PAPER_AUTO' ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : null
        })
        this.enableText = ''
        this.$message.success(this.$t('agentTrade.updated'))
        await this.refresh()
      } catch (error) {
        this.failure(error)
      } finally {
        this.saving = false
      }
    },
    async changeGlobalMode (mode) {
      this.saving = true
      try {
        await setAgentTradingPolicy({ broker: '*', account_ref: '*', mode, confirm_mode: mode })
        this.$message.success(this.$t('agentTrade.updated'))
        await this.refresh()
      } catch (error) {
        this.failure(error)
      } finally {
        this.saving = false
      }
    },
    async cancelOrders () {
      this.saving = true
      try {
        const response = await cancelAgentOrders()
        const result = (response && response.data) || {}
        if (result.manual_review_required || result.futu_manual_review_required) {
          this.$message.warning(this.$t('agentTrade.manualReview'))
        } else {
          this.$message.success(this.$t('agentTrade.updated'))
        }
        await this.refresh()
      } catch (error) {
        this.failure(error)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.agent-trade-intents { display: grid; gap: 16px; }
.policy-card { margin-top: 4px; }
.account-picker { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.status-line, .policy-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.policy-note { margin: 12px 0; color: #ad6800; }
.policy-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
.policy-grid label { display: grid; gap: 5px; }
.policy-grid .ant-input-number { width: 100%; }
</style>
