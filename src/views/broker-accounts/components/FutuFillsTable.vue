<template>
  <div>
    <a-alert type="info" show-icon :message="$t('futuPaper.inferredFills')" style="margin-bottom: 12px" />
    <a-button size="small" :loading="loading" style="margin-bottom: 12px" @click="load">
      <a-icon type="reload" /> {{ $t('brokerAccounts.refresh') }}
    </a-button>
    <a-table
      :columns="columns"
      :data-source="rows"
      :loading="loading"
      :row-key="row => row.id"
      size="small"
      :scroll="{ x: 880 }"
    />
  </div>
</template>

<script>
import { broker } from '@/api/broker'

export default {
  name: 'FutuFillsTable',
  data () {
    return { rows: [], loading: false }
  },
  computed: {
    columns () {
      return [
        { title: this.$t('brokerAccounts.col.submittedAt'), dataIndex: 'created_at', key: 'created_at', width: 190 },
        { title: this.$t('brokerAccounts.col.orderId'), dataIndex: 'exchange_order_id', key: 'exchange_order_id', width: 200 },
        { title: this.$t('brokerAccounts.col.symbol'), dataIndex: 'symbol', key: 'symbol', width: 100 },
        { title: this.$t('brokerAccounts.col.side'), dataIndex: 'side', key: 'side', width: 90 },
        { title: this.$t('brokerAccounts.col.qty'), dataIndex: 'quantity', key: 'quantity', width: 90 },
        { title: this.$t('brokerAccounts.col.fillPrice'), dataIndex: 'price', key: 'price', width: 100 },
        { title: this.$t('futuPaper.strategyId'), dataIndex: 'strategy_id', key: 'strategy_id', width: 100 }
      ]
    }
  },
  mounted () { this.load() },
  methods: {
    async load () {
      this.loading = true
      try {
        const response = await broker.futu.fills()
        const body = response && (response.data || response)
        const result = body && (body.data || body)
        this.rows = Array.isArray(result) ? result : []
      } catch (error) {
        this.rows = []
        this.$message.error((error && error.message) || this.$t('futuPaper.fillsFailed'))
      } finally {
        this.loading = false
      }
    }
  }
}
</script>
