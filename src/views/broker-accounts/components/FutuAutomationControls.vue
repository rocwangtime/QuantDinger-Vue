<template>
  <div class="futu-automation-controls">
    <a-alert
      :type="state === 'armed' ? 'success' : state === 'unconfirmed' || state === 'stopping' ? 'error' : 'warning'"
      show-icon
      :message="$t('futuPaper.automationState') + ': ' + $t('futuPaper.state.' + state)"
      :description="state === 'unconfirmed' ? $t('futuPaper.stopUnconfirmed') : $t('futuPaper.connectionIsReadOnly')"
    />
    <div v-if="connected && raw.credential_id" class="futu-automation-credential">
      {{ $t('futuPaper.strategyCredential', { id: raw.credential_id }) }}
    </div>
    <div v-if="state === 'armed' && stateRow && stateRow.credential_id" class="futu-automation-credential">
      {{ $t('futuPaper.automationCredential', { id: stateRow.credential_id }) }}
    </div>
    <div v-if="stateRow && stateRow.last_error" class="futu-automation-error">{{ stateRow.last_error }}</div>
    <a-alert v-if="!hardSwitch" type="info" show-icon :message="$t('futuPaper.hardSwitchDisabled')" />
    <div v-if="connected && state !== 'armed' && state !== 'stopping' && state !== 'unconfirmed'" class="futu-automation-actions">
      <a-input
        v-model.trim="confirmation"
        :disabled="disabled || !hardSwitch"
        :placeholder="$t('futuPaper.armConfirmHint', { id: accountId })"
      />
      <a-button type="primary" :loading="loading" :disabled="disabled || !hardSwitch || confirmation !== String(accountId)" @click="arm">
        {{ $t('futuPaper.armAutomation') }}
      </a-button>
    </div>
    <div v-if="accountId && state !== 'paused'" class="futu-automation-actions">
      <a-button type="danger" :loading="loading" :disabled="disabled" @click="$emit('pause', { acc_id: accountId })">
        {{ $t(state === 'armed' ? 'futuPaper.pauseAutomation' : 'futuPaper.retryStop') }}
      </a-button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'FutuAutomationControls',
  props: {
    status: { type: Object, default: () => null },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false }
  },
  data () {
    return { confirmation: '' }
  },
  computed: {
    connected () { return !!(this.status && this.status.connected) },
    raw () { return (this.status && this.status.raw) || {} },
    accountId () {
      const selected = this.status && this.status.accountId
      const rows = this.raw.automation || []
      return Number(selected || (rows.length && rows[0].acc_id) || 0)
    },
    stateRow () {
      return (this.raw.automation || []).find(row => Number(row.acc_id) === this.accountId) || null
    },
    state () { return (this.stateRow && this.stateRow.state) || 'paused' },
    hardSwitch () { return !!this.raw.automation_hard_switch }
  },
  watch: {
    accountId () { this.confirmation = '' }
  },
  methods: {
    arm () {
      if (this.confirmation === String(this.accountId)) {
        this.$emit('arm', { confirm_acc_id: this.confirmation })
        this.confirmation = ''
      }
    }
  }
}
</script>

<style scoped>
.futu-automation-controls { display: grid; gap: 12px; margin: 16px 0; }
.futu-automation-actions { display: flex; gap: 12px; align-items: center; }
.futu-automation-actions .ant-input { max-width: 280px; }
.futu-automation-credential { color: #64748b; }
.futu-automation-error { color: #b91c1c; word-break: break-word; }
</style>
