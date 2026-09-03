import { defineStore } from "pinia";
import { ref } from "vue";

/**
 * 全局加载状态 store
 * 取代 utils/app-state.ts 中的 loading 字段
 */
export const useLoadingStore = defineStore("loading", () => {
  const loading = ref(false);

  function start() {
    loading.value = true;
  }

  function finish() {
    loading.value = false;
  }

  return { loading, start, finish };
});
