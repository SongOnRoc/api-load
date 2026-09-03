<script setup lang="ts">
import { NEmpty } from "naive-ui";

interface Props {
  description?: string;
  size?: "small" | "medium" | "large";
}

withDefaults(defineProps<Props>(), {
  description: "",
  size: "medium",
});
</script>

<template>
  <div class="empty-state" :class="`empty-state--${size}`">
    <n-empty :description="description" />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--text-tertiary);
}

.empty-state--small {
  padding: 16px 8px;
}

.empty-state--large {
  padding: 48px 16px;
}
</style>
