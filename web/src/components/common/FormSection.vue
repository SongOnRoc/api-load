<script setup lang="ts">
interface Props {
  title?: string;
  description?: string;
  bordered?: boolean;
}

withDefaults(defineProps<Props>(), {
  bordered: true,
});
</script>

<template>
  <div class="form-section" :class="{ 'form-section--bordered': bordered }">
    <div v-if="title || description || $slots.header" class="form-section__header">
      <slot name="header">
        <h4 v-if="title" class="form-section__title">{{ title }}</h4>
        <p v-if="description" class="form-section__description">{{ description }}</p>
      </slot>
    </div>
    <div class="form-section__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.form-section {
  margin-bottom: 20px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.form-section--bordered {
  padding: 16px 20px;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  background: var(--bg-secondary);
}

:root.dark .form-section--bordered {
  background: var(--bg-tertiary);
}

.form-section__header {
  margin-bottom: 12px;
}

.form-section__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.form-section__description {
  font-size: 0.8125rem;
  color: var(--text-secondary);
  margin: 0;
}

.form-section__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
