<template>
  <section v-if="days.length">
    <h3>{{ zh ? '选股计划前瞻评分（只读）' : 'Selection plan forward scores (read only)' }}</h3>
    <article v-for="day in days" :key="day.day">
      <p>{{ day.day }} · {{ zh ? '筛选批次' : 'Screener runs' }}: {{ day.forward_scoring.screener_run_ids.join(', ') || '—' }} · {{ zh ? '计划换手' : 'Plan turnover' }}: {{ pct(day.forward_scoring.turnover, true) }}</p>
      <a-table
        :columns="columns"
        :data-source="rows(day)"
        row-key="key"
        :pagination="false"
        size="small"
        :scroll="{ x: 600 }" />
    </article>
    <p>{{ zh ? '毛收益；基于决策前最近收盘价，按交易日计。换手为相对前一计划的标的或权重变化比例。缺失或未到期数据保持待评分。' : 'Gross returns from the last close before the decision, in trading days. Turnover is the fraction of names with changed membership or weight versus the previous plan. Missing or immature data remains pending.' }}</p>
  </section>
</template>

<script>
export default {
  name: 'ForwardScoring',
  props: { days: { type: Array, default: () => [] }, zh: Boolean },
  computed: {
    columns () {
      return [
        { title: this.zh ? '周期' : 'Horizon', dataIndex: 'horizon' },
        { title: this.zh ? '基准' : 'Baseline', dataIndex: 'baseline' },
        { title: this.zh ? '胜率' : 'Hit rate', dataIndex: 'hit' },
        { title: this.zh ? '平均超额收益' : 'Mean excess', dataIndex: 'excess' },
        { title: this.zh ? '已评分 / 待评分' : 'Scored / pending', dataIndex: 'coverage' }
      ]
    }
  },
  methods: {
    pct (value, fraction = false) { return value == null ? '—' : `${(value * (fraction ? 100 : 1)).toFixed(2)}%` },
    rows (day) {
      return Object.entries(day.forward_scoring.horizons).flatMap(([horizon, data]) =>
        Object.entries(data.baselines).map(([baseline, metrics]) => ({
          key: `${horizon}:${baseline}`,
horizon,
baseline,
          hit: this.pct(metrics.hit_rate, true),
excess: this.pct(metrics.mean_excess_return_pct),
          coverage: `${data.scored} / ${data.pending}`
        })))
    }
  }
}
</script>
