<template>
  <a-form layout="vertical" class="futu-connect-form">
    <a-alert type="info" show-icon :message="$t('futuPaper.simulateOnly')" class="futu-note" />
    <a-row :gutter="12">
      <a-col :xs="24" :md="6">
        <a-form-item :label="$t('futuPaper.market')">
          <a-select v-model="tradeMarket" :disabled="disabled || loading">
            <a-select-option value="US">{{ $t('futuPaper.marketUS') }}</a-select-option>
            <a-select-option value="HK">{{ $t('futuPaper.marketHK') }}</a-select-option>
          </a-select>
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="6">
        <a-form-item :label="$t('futuPaper.host')">
          <a-input v-model.trim="host" :disabled="disabled || loading" placeholder="host.docker.internal" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="6">
        <a-form-item :label="$t('futuPaper.port')">
          <a-input-number v-model="port" :min="1" :max="65535" :disabled="disabled || loading" style="width: 100%" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="6">
        <a-form-item :label="$t('futuPaper.firm')">
          <a-select v-model="securityFirm" :disabled="disabled || loading">
            <a-select-option value="FUTUSECURITIES">Futu Securities HK</a-select-option>
            <a-select-option value="FUTUINC">Futu Inc.</a-select-option>
          </a-select>
        </a-form-item>
      </a-col>
    </a-row>
    <div class="futu-actions">
      <a-button :loading="probing" :disabled="disabled || loading || !host || !port" @click="probe">
        {{ $t('futuPaper.probe') }}
      </a-button>
    </div>
    <a-form-item :label="$t('futuPaper.accountId')">
      <a-select v-model="accountId" :disabled="disabled || loading || !accounts.length" :placeholder="$t('futuPaper.selectAfterProbe')" @change="onAccountChange">
        <a-select-option v-for="account in accounts" :key="account.acc_id" :value="Number(account.acc_id)">
          {{ account.acc_id }} · {{ tradeMarket }} · SIMULATE
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-form-item :label="$t('futuPaper.confirmAccountId')">
      <a-input v-model.trim="confirmedAccountId" :disabled="disabled || loading || !accountId" :placeholder="$t('futuPaper.confirmAccountIdHint')" />
    </a-form-item>
    <a-alert v-if="probed && !accounts.length" type="warning" show-icon :message="$t('futuPaper.noUsSimAccount')" class="futu-note" />
    <a-alert type="info" show-icon :message="$t('futuPaper.autoSaveHint')" class="futu-note" />
    <div class="futu-actions">
      <a-button type="primary" :loading="loading" :disabled="disabled || !accountConfirmed" @click="submit">
        {{ $t('brokerAccounts.connect') }}
      </a-button>
    </div>
  </a-form>
</template>

<script>
import { broker } from '@/api/broker'

export default {
  name: 'FutuConnectForm',
  props: {
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  data () {
    return {
      host: 'host.docker.internal',
      port: 11112,
      tradeMarket: 'US',
      securityFirm: 'FUTUSECURITIES',
      accountId: null,
      confirmedAccountId: '',
      accounts: [],
      probing: false,
      probed: false
    }
  },
  computed: {
    accountConfirmed () {
      return !!this.accountId && this.confirmedAccountId === String(this.accountId)
    }
  },
  watch: {
    host () { this.resetProbe() },
    port () { this.resetProbe() },
    tradeMarket () { this.resetProbe() },
    securityFirm () { this.resetProbe() }
  },
  methods: {
    onAccountChange () {
      this.confirmedAccountId = ''
    },
    resetProbe () {
      this.accounts = []
      this.accountId = null
      this.confirmedAccountId = ''
      this.probed = false
    },
    payload (accountId = 0) {
      return {
        host: this.host,
        port: Number(this.port),
        security_firm: this.securityFirm,
        trade_env: 'demo',
        trade_market: this.tradeMarket,
        market_category: this.tradeMarket === 'US' ? 'USStock' : 'HKStock',
        acc_id: Number(accountId)
      }
    },
    async probe () {
      this.probing = true
      this.probed = false
      this.accountId = null
      this.confirmedAccountId = ''
      try {
        const response = await broker.futu.probe(this.payload())
        const body = response && (response.data || response)
        const result = body && (body.data || body)
        const probe = result && result.probe
        const listed = probe && Array.isArray(probe.accounts) ? probe.accounts : []
        this.accounts = listed.filter(account => {
          const environment = String(account.trd_env || '').toUpperCase()
          const auth = String(account.trdmarket_auth || '').toUpperCase()
          const type = String(account.sim_acc_type || '').toUpperCase()
          const stockAccount = this.tradeMarket === 'HK' ? type === 'STOCK' : ['STOCK', 'STOCK_AND_OPTION'].includes(type)
          return environment.includes('SIMULATE') && auth.includes(this.tradeMarket) && stockAccount
        })
        this.probed = true
      } catch (error) {
        this.accounts = []
        this.$message.error((error && error.message) || this.$t('futuPaper.probeFailed'))
      } finally {
        this.probing = false
      }
    },
    submit () {
      if (!this.accountConfirmed) return
      this.$emit('submit', { ...this.payload(this.accountId), confirm_acc_id: this.confirmedAccountId })
    }
  }
}
</script>

<style scoped>
.futu-note { margin-bottom: 16px; }
.futu-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
</style>
