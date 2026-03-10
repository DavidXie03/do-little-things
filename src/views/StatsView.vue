<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { TaskTypeLabel, TaskTypeColor } from '../types'
import RadarChart from '../components/RadarChart.vue'
import IconKnowledge from '../components/icons/IconKnowledge.vue'
import IconAction from '../components/icons/IconAction.vue'
import IconExplore from '../components/icons/IconExplore.vue'
import IconNews from '../components/icons/IconNews.vue'
import IconArrowLeft from '../components/icons/IconArrowLeft.vue'
import IconArrowRight from '../components/icons/IconArrowRight.vue'
import IconTarget from '../components/icons/IconTarget.vue'

const { getMonthStats, getMonthTotal, getMostActiveType, getStreakDays } = useStorage()

const typeIconMap: Record<string, any> = {
  knowledge: IconKnowledge,
  action: IconAction,
  explore: IconExplore,
  news: IconNews,
}

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

const monthLabel = computed(() => {
  return `${currentYear.value}年${currentMonth.value}月`
})

const stats = computed(() => {
  return getMonthStats(currentYear.value, currentMonth.value)
})

const totalCount = computed(() => {
  return getMonthTotal(currentYear.value, currentMonth.value)
})

const mostActive = computed(() => {
  const type = getMostActiveType(currentYear.value, currentMonth.value)
  if (!type) return null
  return {
    type,
    label: TaskTypeLabel[type],
    iconComponent: typeIconMap[type],
  }
})

const streakDays = computed(() => getStreakDays())

const hasData = computed(() => totalCount.value > 0)

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  const n = new Date()
  const maxYear = n.getFullYear()
  const maxMonth = n.getMonth() + 1

  if (currentYear.value === maxYear && currentMonth.value >= maxMonth) {
    return // 不能超过当前月
  }

  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

const isCurrentMonth = computed(() => {
  const n = new Date()
  return currentYear.value === n.getFullYear() && currentMonth.value === n.getMonth() + 1
})
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto" style="-webkit-overflow-scrolling: touch;">
    <!-- 顶部 -->
    <header class="px-6 pb-2" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        我的探索
      </h1>
      <p class="text-xs mt-1" style="color: var(--text-muted);">
        看看你这个月的探索轨迹
      </p>
    </header>

    <!-- 月份切换 -->
    <div class="flex items-center justify-center gap-6 py-4">
      <button
        @click="prevMonth"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
        style="
          background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(78,205,196,0.08));
          color: var(--primary);
        "
      >
        <IconArrowLeft :size="18" color="var(--primary)" />
      </button>
      <span class="text-base font-semibold" style="color: var(--text-primary); min-width: 100px; text-align: center;">
        {{ monthLabel }}
      </span>
      <button
        @click="nextMonth"
        class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
        :class="isCurrentMonth ? 'opacity-30 pointer-events-none' : ''"
        style="
          background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(78,205,196,0.08));
          color: var(--primary);
        "
      >
        <IconArrowRight :size="18" color="var(--primary)" />
      </button>
    </div>

    <!-- 雷达图 -->
    <div class="px-6 py-2">
      <div
        class="rounded-3xl p-6 relative overflow-hidden"
        style="
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          box-shadow: 0 8px 32px -8px rgba(108, 99, 255, 0.1),
                      0 4px 12px -4px rgba(0, 0, 0, 0.04);
        "
      >
        <template v-if="hasData">
          <RadarChart :data="stats" />
          <!-- 数据标签 -->
          <div class="grid grid-cols-2 gap-3 mt-4">
            <div
              v-for="(count, type) in stats"
              :key="type"
              class="flex items-center gap-2 px-3 py-2 rounded-xl"
              style="background: rgba(108, 99, 255, 0.04);"
            >
              <component :is="typeIconMap[type as string]" :size="16" :color="TaskTypeColor[type as keyof typeof TaskTypeColor]" />
              <span class="text-xs font-medium" style="color: var(--text-secondary);">
                {{ TaskTypeLabel[type as keyof typeof TaskTypeLabel] }}
              </span>
              <span class="ml-auto text-sm font-bold" style="color: var(--primary);">
                {{ count }}
              </span>
            </div>
          </div>
        </template>

        <!-- 无数据状态 -->
        <div v-else class="flex flex-col items-center justify-center py-12">
          <IconTarget :size="48" color="var(--text-muted)" />
          <p class="text-sm mt-4" style="color: var(--text-muted);">
            这个月还没有完成记录
          </p>
          <p class="text-xs mt-1" style="color: var(--text-muted);">
            去首页完成一些小事吧
          </p>
        </div>
      </div>
    </div>

    <!-- 月度总结卡片 -->
    <div class="px-6 py-4 pb-8">
      <div
        class="rounded-2xl p-5 relative overflow-hidden"
        style="
          background: linear-gradient(135deg, #6C63FF, #4ECDC4);
          box-shadow: 0 12px 32px -8px rgba(108, 99, 255, 0.3);
        "
      >
        <!-- 装饰 -->
        <div class="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-20" style="background: white;"></div>
        <div class="absolute -bottom-8 -left-8 w-24 h-24 rounded-full opacity-10" style="background: white;"></div>

        <h3 class="relative text-white font-bold text-base mb-4 flex items-center gap-2">
          <IconTarget :size="18" color="white" />
          月度小结
        </h3>

        <div class="relative grid grid-cols-3 gap-3">
          <div class="text-center">
            <div class="text-2xl font-bold text-white">
              {{ totalCount }}
            </div>
            <div class="text-xs text-white/70 mt-1">
              总完成数
            </div>
          </div>
          <div class="text-center">
            <div class="flex items-center justify-center h-8">
              <component
                v-if="mostActive"
                :is="mostActive.iconComponent"
                :size="28"
                color="white"
              />
              <span v-else class="text-2xl font-bold text-white">—</span>
            </div>
            <div class="text-xs text-white/70 mt-1">
              {{ mostActive ? mostActive.label : '最活跃' }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-white">
              {{ streakDays }}
            </div>
            <div class="text-xs text-white/70 mt-1">
              连续天数
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
