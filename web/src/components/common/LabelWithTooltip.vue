<script setup lang="ts">
import { HelpCircleOutline } from "@vicons/ionicons5";
import { NIcon, NTooltip } from "naive-ui";

interface Props {
  text: string;
  tooltip?: string;
  required?: boolean;
}

defineProps<Props>();
</script>

<template>
  <div class="label-with-tooltip">
    <span class="label-with-tooltip__text">{{ text }}</span>
    <span v-if="required" class="label-with-tooltip__required">*</span>
    <n-tooltip v-if="tooltip" trigger="hover" placement="top">
      <template #trigger>
        <n-icon :component="HelpCircleOutline" :size="14" class="label-with-tooltip__icon" />
      </template>
      {{ tooltip }}
    </n-tooltip>
  </div>
</template>

<style scoped>
.label-with-tooltip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-primary);
}

.label-with-tooltip__required {
  color: var(--error-color);
}

.label-with-tooltip__icon {
  color: var(--text-tertiary);
  cursor: help;
  transition: var(--transition-base);
}

.label-with-tooltip__icon:hover {
  color: var(--primary-color);
}
</style>
