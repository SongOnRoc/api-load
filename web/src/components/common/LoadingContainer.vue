<script setup lang="ts">
import { NSpin } from "naive-ui";

interface Props {
  loading: boolean;
  size?: "small" | "medium" | "large";
  minHeight?: string;
}

withDefaults(defineProps<Props>(), {
  size: "medium",
  minHeight: "120px",
});
</script>

<template>
  <n-spin :show="loading" :size="size">
    <div class="loading-container" :style="{ minHeight }">
      <slot />
    </div>
  </n-spin>
</template>

<style scoped>
.loading-container {
  width: 100%;
}
</style>
