<script setup lang="ts">
import { getDashboardStats } from "@/api/dashboard";
import BaseInfoCard from "@/components/BaseInfoCard.vue";
import EncryptionMismatchAlert from "@/components/EncryptionMismatchAlert.vue";
import LineChart from "@/components/LineChart.vue";
import SecurityAlert from "@/components/SecurityAlert.vue";
import type { DashboardStatsResponse } from "@/types/models";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const dashboardStats = ref<DashboardStatsResponse | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const response = await getDashboardStats();
    dashboardStats.value = response.data;
  } catch (error) {
    console.error("Failed to load dashboard stats:", error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="dashboard-page fade-in-up">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t("nav.dashboard") }}</h1>
        <p class="page-subtitle">{{ t("dashboard.overview") }}</p>
      </div>
    </header>

    <div class="page-body">
      <!-- 加密配置错误警告（优先级最高） -->
      <encryption-mismatch-alert />

      <!-- 安全警告横幅 -->
      <security-alert
        v-if="dashboardStats?.security_warnings"
        :warnings="dashboardStats.security_warnings"
      />

      <base-info-card :stats="dashboardStats" :loading="loading" />
      <line-chart class="dashboard-chart" />
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  width: 100%;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.page-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-chart {
  animation: fadeInUp 0.3s var(--ease-out) 0.1s both;
}
</style>
