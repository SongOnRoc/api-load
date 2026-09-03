<script setup lang="ts">
import StatCard from "@/components/common/StatCard.vue";
import type { DashboardStatsResponse } from "@/types/models";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  AlertCircleOutline,
  ServerOutline,
  StatsChartOutline,
  TimeOutline,
} from "@vicons/ionicons5";

const { t } = useI18n();

interface Props {
  stats: DashboardStatsResponse | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const stats = computed(() => props.stats);
const animatedValues = ref<Record<string, number>>({});

const formatValue = (value: number, type: "count" | "rate" = "count"): string => {
  if (type === "rate") {
    return `${value.toFixed(1)}%`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};

const formatTrend = (trend: number): string => {
  const sign = trend >= 0 ? "+" : "";
  return `${sign}${trend.toFixed(1)}%`;
};

const updateAnimatedValues = () => {
  if (stats.value) {
    setTimeout(() => {
      animatedValues.value = {
        key_count:
          (stats.value?.key_count?.value ?? 0) /
          ((stats.value?.key_count?.value ?? 1) + (stats.value?.key_count?.sub_value ?? 1)),
        rpm: Math.min(100 + (stats.value?.rpm?.trend ?? 0), 100) / 100,
        request_count: Math.min(100 + (stats.value?.request_count?.trend ?? 0), 100) / 100,
        error_rate: (100 - (stats.value?.error_rate?.value ?? 0)) / 100,
      };
    }, 0);
  }
};

onMounted(() => {
  updateAnimatedValues();
});

watch(stats, updateAnimatedValues);
</script>

<template>
  <div class="stats-grid">
    <stat-card
      :title="t('dashboard.totalKeys')"
      :value="stats?.key_count?.value ?? 0"
      :icon="ServerOutline"
      icon-color="#10b981"
      :loading="loading"
    >
      <template #header-extra>
        <span v-if="stats?.key_count?.sub_value" class="stat-extra">
          {{ stats.key_count.sub_value }} {{ stats.key_count.sub_value_tip }}
        </span>
      </template>
    </stat-card>

    <stat-card
      :title="t('dashboard.rpm10Min')"
      :value="stats?.rpm?.value?.toFixed(1) ?? '0'"
      :icon="TimeOutline"
      icon-color="#14b8a6"
      :trend="
        stats?.rpm && stats.rpm.trend !== undefined
          ? {
            type: stats.rpm.trend_is_growth ? 'success' : 'error',
            text: formatTrend(stats.rpm.trend),
          }
          : undefined
      "
      :loading="loading"
    />

    <stat-card
      :title="t('dashboard.requests24h')"
      :value="stats ? formatValue(stats.request_count.value) : '--'"
      :icon="StatsChartOutline"
      icon-color="#6366f1"
      :trend="
        stats?.request_count && stats.request_count.trend !== undefined
          ? {
            type: stats.request_count.trend_is_growth ? 'success' : 'error',
            text: formatTrend(stats.request_count.trend),
          }
          : undefined
      "
      :loading="loading"
    />

    <stat-card
      :title="t('dashboard.errorRate24h')"
      :value="stats ? formatValue(stats.error_rate.value ?? 0, 'rate') : '--'"
      :icon="AlertCircleOutline"
      icon-color="#f43f5e"
      :trend="
        stats?.error_rate && stats.error_rate.trend !== 0
          ? {
            type: stats.error_rate.trend_is_growth ? 'success' : 'error',
            text: formatTrend(stats.error_rate.trend),
          }
          : undefined
      "
      :loading="loading"
    />
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-extra {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-weight: 500;
}
</style>
