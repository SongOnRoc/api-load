<script setup lang="ts">
import LogTable from "@/components/logs/LogTable.vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<template>
  <div class="logs-page fade-in-up">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ t("nav.logs") }}</h1>
        <p class="page-subtitle">{{ t("logs.subtitle") }}</p>
      </div>
    </header>

    <log-table />
  </div>
</template>

<style scoped>
.logs-page {
  width: 100%;
}

.page-header {
  margin-bottom: 20px;
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
</style>
