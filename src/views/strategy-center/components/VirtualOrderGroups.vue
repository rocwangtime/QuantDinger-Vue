<template>
  <section class="virtual-order-groups">
    <h3>{{ $t('researchExecution.groupTitle') }}</h3>
    <a-alert type="info" show-icon :message="$t('researchExecution.groupHint')" />
    <a-alert v-if="!stoppedVirtual" type="warning" :message="$t('researchExecution.groupUnavailable')" />
    <div class="group-recovery">
      <a-input v-model="lookupId" :placeholder="$t('researchExecution.groupId')" :disabled="loading" />
      <a-button :loading="loading" :disabled="!lookupId" @click="recover">{{ $t('researchExecution.recover') }}</a-button>
    </div>
    <a-alert v-if="error" type="error" show-icon :message="error" />
    <template v-if="group">
      <p><code>{{ group.group_id }}</code> · <a-tag>{{ statusLabel(state.status) }}</a-tag></p>
      <p v-if="state.reason">{{ state.reason }}</p>
      <div class="group-table-wrap"><table class="group-table">
        <thead><tr><th>{{ $t('researchExecution.symbol') }}</th><th>{{ $t('researchExecution.action') }}</th><th>{{ $t('researchExecution.quantity') }}</th><th>{{ $t('researchExecution.fill') }}</th><th>{{ $t('researchExecution.status') }}</th></tr></thead>
        <tbody><tr v-for="leg in state.legs" :key="leg.pendingId"><td>{{ leg.symbol }}</td><td>{{ $t('researchExecution.' + (leg.action === 'open_short' ? 'short' : 'long')) }}</td><td>{{ leg.quantity }}</td><td>{{ leg.filled }}</td><td>{{ statusLabel(leg.status) }}</td></tr></tbody>
        <tbody v-if="state.compensations && state.compensations.length"><tr v-for="leg in state.compensations" :key="'unwind-' + leg.pendingId"><td>{{ leg.symbol }}</td><td>{{ $t('researchExecution.compensation') }} · {{ $t('researchExecution.' + (leg.action === 'reduce_short' ? 'short' : 'long')) }}</td><td>{{ leg.quantity }}</td><td>{{ leg.filled }}</td><td>{{ statusLabel(leg.status) }}</td></tr></tbody>
      </table></div>
      <h4>{{ $t('researchExecution.residuals') }}</h4>
      <div v-for="residual in state.residuals" :key="residual.entryIndex" class="residual-row">
        <span>{{ residual.symbol }} · {{ $t('researchExecution.' + residual.side) }} · {{ residual.quantity }}</span>
        <label>{{ $t('researchExecution.price') }} <a-input-number v-model="marks[residual.symbol]" :min="0.00000001" :disabled="loading" /></label>
      </div>
      <p>{{ $t('researchExecution.grossNotional') }}: {{ state.grossResidualNotional || 0 }} · {{ $t('researchExecution.netNotional') }}: {{ state.netResidualNotional || 0 }}</p>
      <div class="group-actions">
        <a-button :loading="loading" @click="refresh()">{{ $t('researchExecution.refresh') }}</a-button>
        <a-button v-if="!terminal" :disabled="loading" @click="act('cancel')">{{ $t('researchExecution.cancel') }}</a-button>
        <a-button v-if="state.residuals && state.residuals.length && state.status !== 'unwinding'" :disabled="loading || !stoppedVirtual" @click="act('unwind')">{{ $t('researchExecution.unwind') }}</a-button>
        <a-button v-if="terminal" :disabled="loading" @click="clearGroup">{{ $t('researchExecution.newGroup') }}</a-button>
      </div>
      <template v-if="!terminal">
        <a-input v-model="resolution" :placeholder="$t('researchExecution.reason')" :disabled="loading" />
        <a-button :disabled="loading || !stoppedVirtual || !resolution.trim()" @click="act('resolve')">{{ $t('researchExecution.resolve') }}</a-button>
      </template>
    </template>
    <template v-else>
      <div v-for="(leg, index) in legs" :key="index" class="leg-editor">
        <label>{{ $t('researchExecution.symbol') }} <a-input v-model="leg.symbol" :disabled="loading" /></label>
        <label>{{ $t('researchExecution.action') }} <a-select v-model="leg.action" :disabled="loading"><a-select-option value="open_long">{{ $t('researchExecution.long') }}</a-select-option><a-select-option value="open_short" :disabled="marketType === 'spot'">{{ $t('researchExecution.short') }}</a-select-option></a-select></label>
        <label>{{ $t('researchExecution.quantity') }} <a-input-number v-model="leg.quantity" :min="0.00000001" :disabled="loading" /></label>
        <label>{{ $t('researchExecution.price') }} <a-input-number v-model="leg.referencePrice" :min="0.00000001" :disabled="loading" /></label>
        <a-button :disabled="loading || legs.length <= 2" @click="legs.splice(index, 1)">{{ $t('researchExecution.remove') }}</a-button>
      </div>
      <div class="group-actions">
        <a-button :disabled="loading || legs.length >= 8" @click="legs.push(blankLeg())">{{ $t('researchExecution.addLeg') }}</a-button>
        <label>{{ $t('researchExecution.budget') }} <a-input-number v-model="budget" :min="0.01" :disabled="loading" /></label>
        <label>{{ $t('researchExecution.deadline') }} <a-input-number v-model="deadline" :min="5" :max="3600" :disabled="loading" /></label>
        <a-button type="primary" :loading="loading" :disabled="!stoppedVirtual" @click="create">{{ $t('researchExecution.create') }}</a-button>
      </div>
    </template>
  </section>
</template>
<script>
import { createOrderGroup, getOrderGroup, cancelOrderGroup, unwindOrderGroup, resolveOrderGroup } from '@/api/researchExecution'
import { groupStorageKey, objectValue } from '@/utils/researchExecution'
export default {
  name: 'VirtualOrderGroups',
  props: { strategy: { type: Object, required: true } },
  data () { return { group: null, lookupId: '', legs: [], budget: 500, deadline: 300, marks: {}, resolution: '', key: '', requestSignature: '', loading: false, error: '', timer: null, epoch: 0 } },
  computed: {
    config () { return objectValue(this.strategy.trading_config) },
    marketType () { return this.strategy.market_type || this.config.market_type || 'spot' },
    stoppedVirtual () { return this.strategy.execution_mode === 'signal' && this.strategy.status === 'stopped' },
    state () { return (this.group || {}).state || {} },
    terminal () { return ['cancelled', 'unwound', 'resolved'].includes(this.state.status) },
    storageKey () { return groupStorageKey((this.$store.state.user.info || {}).id || 'unknown', this.strategy.id) }
  },
  watch: {
    'strategy.id': { immediate: true, handler () { this.initialize() } }
  },
  beforeDestroy () { this.epoch++; clearTimeout(this.timer) },
  methods: {
    blankLeg () { return { symbol: '', action: 'open_long', quantity: 1, referencePrice: null } },
    statusLabel (status) { const key = `researchExecution.${status}`; return this.$te(key) ? this.$t(key) : status },
    initialize () {
      this.epoch++; clearTimeout(this.timer); this.group = null; this.error = ''; this.loading = false; this.marks = {}; this.key = ''; this.requestSignature = ''; this.resolution = ''
      const instruments = ((this.config.strategy_manifest || {}).universe || {}).instruments || []
      this.legs = [0, 1].map(index => ({ ...this.blankLeg(), symbol: (instruments[index] || {}).symbol || '' }))
      this.lookupId = ''
      try {
        const stored = objectValue(sessionStorage.getItem(this.storageKey))
        this.lookupId = stored.groupId || ''
        if (stored.key && stored.request && Number(stored.request.strategyId) === Number(this.strategy.id)) {
          this.key = stored.key; this.requestSignature = JSON.stringify(stored.request)
          this.legs = stored.request.legs; this.budget = stored.request.maxGrossNotional; this.deadline = stored.request.timeoutSeconds
        }
      } catch (error) { /* Browser recovery storage is optional. */ }
      if (this.lookupId) this.recover()
    },
    clearGroup () {
      try { sessionStorage.removeItem(this.storageKey) } catch (error) { /* Optional browser recovery storage. */ }
      this.lookupId = ''; this.group = null; this.marks = {}; this.key = ''; this.resolution = ''
    },
    accept (group) {
      if (!group || Number((group.config || {}).strategyId) !== Number(this.strategy.id)) throw new Error(this.$t('researchExecution.groupUnavailable'))
      this.group = group; this.lookupId = group.group_id
      try { sessionStorage.setItem(this.storageKey, JSON.stringify({ groupId: group.group_id })) } catch (error) { /* The group remains durable on the server. */ }
      clearTimeout(this.timer)
      if (['executing', 'unwinding'].includes(group.state.status)) this.timer = setTimeout(() => this.refresh(), 2500)
    },
    fail (error) { this.error = error.backendMessage || error.message || this.$t('researchExecution.failed') },
    async create () {
      if (this.loading || !this.stoppedVirtual) return
      const legs = this.legs.map(leg => ({ symbol: leg.symbol.trim(), action: leg.action, quantity: Number(leg.quantity), referencePrice: Number(leg.referencePrice) }))
      if (legs.length < 2 || legs.length > 8 || legs.some(leg => !leg.symbol || !Number.isFinite(leg.quantity) || leg.quantity <= 0 || !Number.isFinite(leg.referencePrice) || leg.referencePrice <= 0) || !Number.isFinite(Number(this.budget)) || Number(this.budget) <= 0 || legs.reduce((sum, leg) => sum + leg.quantity * leg.referencePrice, 0) > Number(this.budget)) {
        this.error = this.$t('researchExecution.invalidLegs'); return
      }
      const payload = { strategyId: this.strategy.id, legs, maxGrossNotional: Number(this.budget), timeoutSeconds: Number(this.deadline) }
      const signature = JSON.stringify(payload)
      if (!this.key || signature !== this.requestSignature) {
        const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes)
        this.key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
      }
      this.requestSignature = signature
      try { sessionStorage.setItem(this.storageKey, JSON.stringify({ key: this.key, request: payload })) } catch (error) { /* Retain the in-memory key for retry. */ }
      const epoch = this.epoch
      this.loading = true; this.error = ''
      try { const response = await createOrderGroup(payload, this.key); if (epoch === this.epoch) this.accept(response.data) } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.loading = false }
    },
    async recover () { if (!this.loading && this.lookupId) await this.refresh(this.lookupId.trim()) },
    async refresh (id = this.group && this.group.group_id) {
      if (!id || this.loading) return
      const epoch = this.epoch
      this.loading = true; this.error = ''; clearTimeout(this.timer)
      try { const response = await getOrderGroup(id); if (epoch === this.epoch) this.accept(response.data) } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.loading = false }
    },
    async act (action) {
      if (this.loading || !this.group) return
      const id = this.group.group_id; const epoch = this.epoch
      const marks = Object.fromEntries((this.state.residuals || []).map(row => [row.symbol, Number(this.marks[row.symbol])]))
      if (action === 'unwind' && Object.values(marks).some(price => !Number.isFinite(price) || price <= 0)) { this.error = this.$t('researchExecution.invalidMarks'); return }
      if (action === 'resolve' && !this.resolution.trim()) { this.error = this.$t('researchExecution.resolutionRequired'); return }
      this.loading = true; this.error = ''; clearTimeout(this.timer)
      try {
        const response = action === 'cancel' ? await cancelOrderGroup(id) : action === 'unwind' ? await unwindOrderGroup(id, marks) : await resolveOrderGroup(id, this.resolution.trim())
        if (epoch === this.epoch) this.accept(response.data)
      } catch (error) { if (epoch === this.epoch) this.fail(error) } finally { if (epoch === this.epoch) this.loading = false }
    }
  }
}
</script>
<style scoped>
.virtual-order-groups { padding: 18px; }
.virtual-order-groups .ant-alert { margin-bottom: 12px; }
.group-recovery, .group-actions, .residual-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 14px 0; }
.group-recovery .ant-input { width: min(400px, 100%); }
.leg-editor { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; padding: 12px 0; border-bottom: 1px solid rgba(128,128,128,.25); }
.leg-editor label, .group-actions label { display: flex; flex-direction: column; gap: 6px; }
.leg-editor .ant-input, .leg-editor .ant-select { width: 160px; }
.group-table-wrap { overflow-x: auto; }
.group-table { width: 100%; text-align: left; }
.group-table th, .group-table td { padding: 8px; border-bottom: 1px solid rgba(128,128,128,.25); }
.virtual-order-groups code { overflow-wrap: anywhere; }
</style>
