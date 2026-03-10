<script setup lang="ts">
import { computed } from 'vue'
import { Radar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js'
import type { StatsData } from '../types'

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip)

const props = defineProps<{
  data: StatsData
}>()

const chartData = computed(() => ({
  labels: ['冷知识', '微行动', '轻探索', '短新闻'],
  datasets: [
    {
      label: '完成数',
      data: [
        props.data.knowledge,
        props.data.action,
        props.data.explore,
        props.data.news,
      ],
      backgroundColor: 'rgba(108, 99, 255, 0.15)',
      borderColor: '#6C63FF',
      borderWidth: 2.5,
      pointBackgroundColor: '#6C63FF',
      pointBorderColor: '#FFFFFF',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 7,
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    tooltip: {
      backgroundColor: 'rgba(45, 52, 54, 0.9)',
      titleFont: { size: 13 },
      bodyFont: { size: 12 },
      padding: 10,
      cornerRadius: 12,
    },
  },
  scales: {
    r: {
      beginAtZero: true,
      ticks: {
        display: false,
        stepSize: 1,
      },
      grid: {
        color: 'rgba(108, 99, 255, 0.08)',
        circular: true,
      },
      angleLines: {
        color: 'rgba(108, 99, 255, 0.08)',
      },
      pointLabels: {
        font: {
          size: 13,
          weight: 600 as number,
          family: 'PingFang SC, sans-serif',
        },
        color: '#636E72',
      },
    },
  },
} as const
</script>

<template>
  <div class="w-full max-w-xs mx-auto">
    <Radar :data="chartData" :options="chartOptions as any" />
  </div>
</template>
