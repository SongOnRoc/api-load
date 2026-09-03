import { defineStore } from "pinia";
import { ref } from "vue";

export interface CompletedTask {
  groupName: string;
  taskType: string;
  finishedAt: string;
}

export interface SyncOperation {
  groupName: string;
  operationType: string;
  finishedAt: string;
}

/**
 * 任务与数据刷新事件 store
 * 取代 utils/app-state.ts 中的 taskPollingTrigger / groupDataRefreshTrigger /
 * syncOperationTrigger / lastCompletedTask / lastSyncOperation
 *
 * 使用 trigger 计数器作为隐式事件总线：消费方 watch 计数器变化即可
 */
export const useTaskStore = defineStore("task", () => {
  const taskPollingTrigger = ref(0);
  const groupDataRefreshTrigger = ref(0);
  const syncOperationTrigger = ref(0);
  const lastCompletedTask = ref<CompletedTask | undefined>(undefined);
  const lastSyncOperation = ref<SyncOperation | undefined>(undefined);

  function triggerTaskPolling() {
    taskPollingTrigger.value++;
  }

  function triggerGroupDataRefresh() {
    groupDataRefreshTrigger.value++;
  }

  function triggerSyncOperationRefresh(groupName: string, operationType: string) {
    lastSyncOperation.value = {
      groupName,
      operationType,
      finishedAt: new Date().toISOString(),
    };
    syncOperationTrigger.value++;
  }

  function setLastCompletedTask(task: CompletedTask) {
    lastCompletedTask.value = task;
  }

  return {
    taskPollingTrigger,
    groupDataRefreshTrigger,
    syncOperationTrigger,
    lastCompletedTask,
    lastSyncOperation,
    triggerTaskPolling,
    triggerGroupDataRefresh,
    triggerSyncOperationRefresh,
    setLastCompletedTask,
  };
});
