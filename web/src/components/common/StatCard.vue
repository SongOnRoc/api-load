<script setup lang="ts">
import { NIcon, NTag } from "naive-ui";
import { computed, type Component } from "vue";

interface Props {
  title: string;
  value: string | number;
  icon?: Component;
  iconColor?: string;
  trend?: {
    type: "success" | "error" | "warning" | "info";
    text: string;
  };
  bar?: {
    color: string;
    percent: number;
  };
  loading?: boolean;
}

const props = defineProps<Props>();

const displayValue = computed(() => {
  if (props.loading) {
    return "-";
  }
  return props.value;
});
</script>

<template>
  <div class="stat-card hover-lift">
    <div class="stat-card__header">
      <div v-if="icon" class="stat-card__icon" :style="{ background: iconColor }">
        <n-icon :component="icon" :size="20" color="#fff" />
      </div>
      <div class="stat-card__header-extra">
        <slot name="header-extra" />
        <n-tag v-if="trend" :type="trend.type" size="small" round class="stat-card__trend">
          {{ trend.text }}
        </n-tag>
      </div>
    </div>
    <div class="stat-card__value">{{ displayValue }}</div>
    <div class="stat-card__title">{{ title }}</div>
    <div v-if="bar" class="stat-card__bar-track">
      <div
        class="stat-card__bar-fill"
        :style="{ background: bar.color, width: `${Math.min(100, Math.max(0, bar.percent))}%` }"
      />
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-lg);
  padding: 18px 20px;
  box-shadow: var(--shadow-sm);
  transition: var(--transition-base);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-strong);
}

.stat-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.stat-card__header-extra {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--border-radius-md);
}

.stat-card__value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  letter-spacing: -0.5px;
}

.stat-card__title {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-weight: 500;
}

.stat-card__bar-track {
  margin-top: 12px;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  overflow: hidden;
}

.stat-card__bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.6s var(--ease-out);
}
</style>
