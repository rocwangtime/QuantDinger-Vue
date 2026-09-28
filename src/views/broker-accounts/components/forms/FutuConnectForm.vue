<template>
  <a-form layout="vertical" class="futu-connect-form">
    <a-alert type="info" show-icon :message="$t('futuPaper.simulateOnly')" class="futu-note" />
    <a-row :gutter="12">
      <a-col :xs="24" :md="12">
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
      <a-select v-model="accountId" :disabled="disabled || loading || !accounts.length" :placeholder="$t('futuPaper.selectAfterProbe')" @change="savedCredentialId = null">
        <a-select-option v-for="account in accounts" :key="account.acc_id" :value="Number(account.acc_id)">
          {{ account.acc_id }} · US · SIMULATE
        </a-select-option>
      </a-select>
    </a-form-item>
    <a-alert v-if="probed && !accounts.length" type="warning" show-icon :message="$t('futuPaper.noUsSimAccount')" class="futu-note" />
    <a-form-item :label="$t('futuPaper.credentialName')">
      <a-input v-model.trim="credentialName" :disabled="disabled || loading" />
    </a-form-item>
    <div class="futu-actions">
      <a-button :loading="saving" :disabled="disabled || !accountId || !!savedCredentialId" @click="saveCredential">
        {{ $t('futuPaper.saveCredential') }}
      </a-button>
      <a-button type="primary" :loading="loading" :disabled="disabled || !accountId" @click="submit">
        {{ $t('brokerAccounts.connect') }}
      </a-button>
    </div>
    <a-alert v-if="savedCredentialId" type="success" show-icon :message="$t('futuPaper.savedCredential', { id: savedCredentialId })" />
  </a-form>
</template>

<script>
import { broker } from '@/api/broker'
import { createExchangeCredential } from '@/api/credentials'

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
      securityFirm: 'FUTUSECURITIES',
      accountId: null,
      accounts: [],
      probing: false,
      probed: false,
      credentialName: 'Futu US SIMULATE',
      saving: false,
      savedCredentialId: null
    }
  },
  watch: {
    host () { this.resetProbe() },
    port () { this.resetProbe() },
    securityFirm () { this.resetProbe() }
  },
  methods: {
    resetProbe () {
      this.accounts = []
      this.accountId = null
      this.probed = false
      this.savedCredentialId = null
    },
    payload (accountId = 0) {
      return {
        host: this.host,
        port: Number(this.port),
        security_firm: this.securityFirm,
        trade_env: 'demo',
        trade_market: 'US',
        acc_id: Number(accountId)
      }
    },
    async probe () {
      this.probing = true
      this.probed = false
      this.accountId = null
      this.savedCredentialId = null
      try {
        const response = await broker.futu.probe(this.payload())
        const body = response && (response.data || response)
        const result = body && (body.data || body)
        const probe = result && result.probe
        const listed = probe && Array.isArray(probe.accounts) ? probe.accounts : []
        this.accounts = listed.filter(account => {
          const environment = String(account.trd_env || '').toUpperCase()
          const auth = String(account.trdmarket_auth || '').toUpperCase()
          return environment.includes('SIMULATE') && (!auth || auth.includes('US'))
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
      if (!this.accountId) return
      this.$emit('submit', this.payload(this.accountId))
    },
    async saveCredential () {
      if (!this.accountId || this.savedCredentialId) return
      this.saving = true
      try {
        const response = await createExchangeCredential({
          ...this.payload(this.accountId),
          exchange_id: 'futu',
          market_category: 'USStock',
          name: this.credentialName || 'Futu US SIMULATE'
        })
        if (!response || response.code !== 1 || !response.data || !response.data.id) {
          throw new Error((response && response.msg) || this.$t('futuPaper.saveFailed'))
        }
        this.savedCredentialId = response.data.id
        this.$emit('saved', this.savedCredentialId)
      } catch (error) {
        this.$message.error((error && error.message) || this.$t('futuPaper.saveFailed'))
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.futu-note { margin-bottom: 16px; }
.futu-actions { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 12px; }
</style>
