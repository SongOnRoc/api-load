<script setup lang="ts">
import { keysApi } from "@/api/keys";
import type { APIKey, Group, KeyStatus } from "@/types/models";
import { useTaskStore } from "@/stores/task";
import { copy } from "@/utils/clipboard";
import { getGroupDisplayName, maskKey } from "@/utils/display";
import {
  AddCircleOutline,
  AlertCircleOutline,
  CheckmarkCircle,
  CloudDownloadOutline,
  CopyOutline,
  EllipsisHorizontalOutline,
  EyeOffOutline,
  EyeOutline,
  Pencil,
  RemoveCircleOutline,
  Search,
  ShieldCheckmarkOutline,
  WarningOutline,
} from "@vicons/ionicons5";
import {
  NButton,
  NEmpty,
  NIcon,
  NInput,
  NModal,
  NPopover,
  NSelect,
  NSpace,
  NSpin,
  NTag,
  useDialog,
  type MessageReactive,
} from "naive-ui";
import { h, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import KeyCreateDialog from "./KeyCreateDialog.vue";
import KeyDeleteDialog from "./KeyDeleteDialog.vue";

const { t } = useI18n();

interface KeyRow extends APIKey {
  is_visible: boolean;
}

interface Props {
  selectedGroup: Group | null;
}

const props = defineProps<Props>();
const taskStore = useTaskStore();

const keys = ref<KeyRow[]>([]);
const loading = ref(false);
const searchText = ref("");
const statusFilter = ref<"all" | "active" | "invalid">("all");
const currentPage = ref(1);
const pageSize = ref(12);
const total = ref(0);
const totalPages = ref(0);
const dialog = useDialog();
const confirmInput = ref("");
const showBatchPanel = ref(false);

/** 执行批量操作并关闭面板，避免操作后浮层滞留 */
async function runBatch(action: () => void | Promise<void>) {
  showBatchPanel.value = false;
  await action();
}

// 搜索防抖 - 与分组/子分组搜索一致的实时过滤体验
let searchTimer: number | null = null;
watch(searchText, () => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  searchTimer = window.setTimeout(() => {
    if (currentPage.value !== 1) {
      currentPage.value = 1;
    } else {
      loadKeys();
    }
  }, 300);
});

// 状态过滤选项
const statusOptions = [
  { label: t("common.all"), value: "all" },
  { label: t("keys.valid"), value: "active" },
  { label: t("keys.invalid"), value: "invalid" },
];

let testingMsg: MessageReactive | null = null;
const isDeling = ref(false);
const isRestoring = ref(false);

const createDialogShow = ref(false);
const deleteDialogShow = ref(false);

// 备注编辑相关
const notesDialogShow = ref(false);
const editingKey = ref<KeyRow | null>(null);
const editingNotes = ref("");

watch(
  () => props.selectedGroup,
  async newGroup => {
    if (newGroup) {
      // 检查重置页面是否会触发分页观察者。
      const willWatcherTrigger = currentPage.value !== 1 || statusFilter.value !== "all";
      resetPage();
      // 如果分页观察者不触发，则手动加载。
      if (!willWatcherTrigger) {
        await loadKeys();
      }
    }
  },
  { immediate: true }
);

watch([currentPage, pageSize], async () => {
  await loadKeys();
});

watch(statusFilter, async () => {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  } else {
    await loadKeys();
  }
});

// 监听任务完成事件，自动刷新密钥列表
watch(
  () => taskStore.groupDataRefreshTrigger,
  () => {
    // 检查是否需要刷新当前分组的密钥列表
    if (taskStore.lastCompletedTask && props.selectedGroup) {
      // 通过分组名称匹配
      const isCurrentGroup = taskStore.lastCompletedTask.groupName === props.selectedGroup.name;

      const shouldRefresh =
        taskStore.lastCompletedTask.taskType === "KEY_VALIDATION" ||
        taskStore.lastCompletedTask.taskType === "KEY_IMPORT" ||
        taskStore.lastCompletedTask.taskType === "KEY_DELETE";

      if (isCurrentGroup && shouldRefresh) {
        // 刷新当前分组的密钥列表
        loadKeys();
      }
    }
  }
);

// 处理搜索输入的防抖
function handleSearchInput() {
  if (currentPage.value !== 1) {
    currentPage.value = 1;
  } else {
    loadKeys();
  }
}

async function loadKeys() {
  if (!props.selectedGroup?.id) {
    return;
  }

  try {
    loading.value = true;
    const result = await keysApi.getGroupKeys({
      group_id: props.selectedGroup.id,
      page: currentPage.value,
      page_size: pageSize.value,
      status: statusFilter.value === "all" ? undefined : (statusFilter.value as KeyStatus),
      key_value: searchText.value.trim() || undefined,
    });
    keys.value = result.items as KeyRow[];
    total.value = result.pagination.total_items;
    totalPages.value = result.pagination.total_pages;
  } finally {
    loading.value = false;
  }
}

// 处理批量删除成功后的刷新
async function handleBatchDeleteSuccess() {
  await loadKeys();
  // 触发同步操作刷新
  if (props.selectedGroup) {
    taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "BATCH_DELETE");
  }
}

async function copyKey(key: KeyRow) {
  const success = await copy(key.key_value);
  if (success) {
    window.$message.success(t("keys.keyCopied"));
  } else {
    window.$message.error(t("keys.copyFailed"));
  }
}

async function testKey(_key: KeyRow) {
  if (!props.selectedGroup?.id || !_key.key_value || testingMsg) {
    return;
  }

  testingMsg = window.$message.info(t("keys.testingKey"), {
    duration: 0,
  });

  try {
    const response = await keysApi.testKeys(props.selectedGroup.id, _key.key_value);
    const curValid = response.results?.[0] || {};
    if (curValid.is_valid) {
      window.$message.success(
        t("keys.testSuccess", { duration: formatDuration(response.total_duration) })
      );
    } else {
      window.$message.error(curValid.error || t("keys.testFailed"), {
        keepAliveOnHover: true,
        duration: 5000,
        closable: true,
      });
    }
    await loadKeys();
    // 触发同步操作刷新
    taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "TEST_SINGLE");
  } catch (_error) {
    console.error("Test failed");
  } finally {
    testingMsg?.destroy();
    testingMsg = null;
  }
}

function formatDuration(ms: number): string {
  if (ms < 0) {
    return "0ms";
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  let result = "";
  if (minutes > 0) {
    result += `${minutes}m`;
  }
  if (seconds > 0) {
    result += `${seconds}s`;
  }
  if (milliseconds > 0 || result === "") {
    result += `${milliseconds}ms`;
  }

  return result;
}

function toggleKeyVisibility(key: KeyRow) {
  key.is_visible = !key.is_visible;
}

// 获取要显示的值（备注优先，否则显示密钥）
function getDisplayValue(key: KeyRow): string {
  if (key.notes && !key.is_visible) {
    return key.notes;
  }
  return key.is_visible ? key.key_value : maskKey(key.key_value);
}

// 编辑密钥备注
function editKeyNotes(key: KeyRow) {
  editingKey.value = key;
  editingNotes.value = key.notes || "";
  notesDialogShow.value = true;
}

// 保存备注
async function saveKeyNotes() {
  if (!editingKey.value) {
    return;
  }

  try {
    const trimmed = editingNotes.value.trim();
    await keysApi.updateKeyNotes(editingKey.value.id, trimmed);
    editingKey.value.notes = trimmed;
    window.$message.success(t("keys.notesUpdated"));
    notesDialogShow.value = false;
  } catch (error) {
    console.error("Update notes failed", error);
  }
}

async function restoreKey(key: KeyRow) {
  if (!props.selectedGroup?.id || !key.key_value || isRestoring.value) {
    return;
  }

  const d = dialog.warning({
    title: t("keys.restoreKey"),
    content: t("keys.confirmRestoreKey", { key: maskKey(key.key_value) }),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: async () => {
      if (!props.selectedGroup?.id) {
        return;
      }

      isRestoring.value = true;
      d.loading = true;

      try {
        await keysApi.restoreKeys(props.selectedGroup.id, key.key_value);
        await loadKeys();
        // 触发同步操作刷新
        taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "RESTORE_SINGLE");
      } catch (_error) {
        console.error("Restore failed");
      } finally {
        d.loading = false;
        isRestoring.value = false;
      }
    },
  });
}

async function deleteKey(key: KeyRow) {
  if (!props.selectedGroup?.id || !key.key_value || isDeling.value) {
    return;
  }

  const d = dialog.warning({
    title: t("keys.deleteKey"),
    content: t("keys.confirmDeleteKey", { key: maskKey(key.key_value) }),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: async () => {
      if (!props.selectedGroup?.id) {
        return;
      }

      d.loading = true;
      isDeling.value = true;

      try {
        await keysApi.deleteKeys(props.selectedGroup.id, key.key_value);
        await loadKeys();
        // 触发同步操作刷新
        taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "DELETE_SINGLE");
      } catch (_error) {
        console.error("Delete failed");
      } finally {
        d.loading = false;
        isDeling.value = false;
      }
    },
  });
}

function formatRelativeTime(date: string) {
  if (!date) {
    return t("keys.never");
  }
  const now = new Date();
  const target = new Date(date);
  const diffSeconds = Math.floor((now.getTime() - target.getTime()) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return t("keys.daysAgo", { days: diffDays });
  }
  if (diffHours > 0) {
    return t("keys.hoursAgo", { hours: diffHours });
  }
  if (diffMinutes > 0) {
    return t("keys.minutesAgo", { minutes: diffMinutes });
  }
  if (diffSeconds > 0) {
    return t("keys.secondsAgo", { seconds: diffSeconds });
  }
  return t("keys.justNow");
}

function getStatusClass(status: KeyStatus): string {
  switch (status) {
    case "active":
      return "status-valid";
    case "invalid":
      return "status-invalid";
    default:
      return "status-unknown";
  }
}

/** 批量复制密钥到剪贴板：拉取导出的文本内容后写入剪贴板 */
async function copyKeysToClipboard(status: "all" | "active" | "invalid") {
  if (!props.selectedGroup?.id) {
    return;
  }

  try {
    const text = await keysApi.fetchKeysText(props.selectedGroup.id, status);
    const keysList = text
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean);

    if (keysList.length === 0) {
      window.$message.warning(t("keys.noKeysToCopy"));
      return;
    }

    await copy(keysList.join("\n"));
    window.$message.success(t("keys.keysCopiedToClipboard"));
  } catch (_error) {
    window.$message.error(t("keys.copyFailedManual"));
  }
}

async function copyAllKeys() {
  await copyKeysToClipboard("all");
}

async function copyValidKeys() {
  await copyKeysToClipboard("active");
}

async function copyInvalidKeys() {
  await copyKeysToClipboard("invalid");
}

/** 导出密钥为文件 */
function exportAllKeys() {
  if (!props.selectedGroup?.id) {
    return;
  }
  keysApi.exportKeys(props.selectedGroup.id, "all");
}

function exportValidKeys() {
  if (!props.selectedGroup?.id) {
    return;
  }
  keysApi.exportKeys(props.selectedGroup.id, "active");
}

function exportInvalidKeys() {
  if (!props.selectedGroup?.id) {
    return;
  }
  keysApi.exportKeys(props.selectedGroup.id, "invalid");
}

async function restoreAllInvalid() {
  if (!props.selectedGroup?.id || isRestoring.value) {
    return;
  }

  const d = dialog.warning({
    title: t("keys.restoreKeys"),
    content: t("keys.confirmRestoreAllInvalid"),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: async () => {
      if (!props.selectedGroup?.id) {
        return;
      }

      isRestoring.value = true;
      d.loading = true;
      try {
        await keysApi.restoreAllInvalidKeys(props.selectedGroup.id);
        await loadKeys();
        // 触发同步操作刷新
        taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "RESTORE_ALL_INVALID");
      } catch (_error) {
        console.error("Restore failed");
      } finally {
        d.loading = false;
        isRestoring.value = false;
      }
    },
  });
}

async function validateKeys(status: "all" | "active" | "invalid") {
  if (!props.selectedGroup?.id || testingMsg) {
    return;
  }

  let statusText = t("common.all");
  if (status === "active") {
    statusText = t("keys.valid");
  } else if (status === "invalid") {
    statusText = t("keys.invalid");
  }

  testingMsg = window.$message.info(t("keys.validatingKeysMsg", { type: statusText }), {
    duration: 0,
  });

  try {
    await keysApi.validateGroupKeys(props.selectedGroup.id, status === "all" ? undefined : status);
    localStorage.removeItem("last_closed_task");
    taskStore.triggerTaskPolling();
  } catch (_error) {
    console.error("Test failed");
  } finally {
    testingMsg?.destroy();
    testingMsg = null;
  }
}

async function clearAllInvalid() {
  if (!props.selectedGroup?.id || isDeling.value) {
    return;
  }

  const d = dialog.warning({
    title: t("keys.clearKeys"),
    content: t("keys.confirmClearInvalidKeys"),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: async () => {
      if (!props.selectedGroup?.id) {
        return;
      }

      isDeling.value = true;
      d.loading = true;
      try {
        const { data } = await keysApi.clearAllInvalidKeys(props.selectedGroup.id);
        window.$message.success(data?.message || t("keys.clearSuccess"));
        await loadKeys();
        // 触发同步操作刷新
        taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "CLEAR_ALL_INVALID");
      } catch (_error) {
        console.error("Delete failed");
      } finally {
        d.loading = false;
        isDeling.value = false;
      }
    },
  });
}

async function clearAll() {
  if (!props.selectedGroup?.id || isDeling.value) {
    return;
  }

  dialog.warning({
    title: t("keys.clearAllKeys"),
    content: t("keys.confirmClearAllKeys"),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: () => {
      confirmInput.value = ""; // Reset before opening second dialog
      dialog.create({
        title: t("keys.enterGroupNameToConfirm"),
        content: () =>
          h("div", null, [
            h("p", null, [
              t("keys.dangerousOperationWarning1"),
              h("strong", null, t("common.all")),
              t("keys.dangerousOperationWarning2"),
              h("strong", { style: { color: "#d03050" } }, props.selectedGroup?.name),
              t("keys.toConfirm"),
            ]),
            h(NInput, {
              value: confirmInput.value,
              "onUpdate:value": v => {
                confirmInput.value = v;
              },
              placeholder: t("keys.enterGroupName"),
            }),
          ]),
        positiveText: t("keys.confirmClear"),
        negativeText: t("common.cancel"),
        onPositiveClick: async () => {
          if (confirmInput.value !== props.selectedGroup?.name) {
            window.$message.error(t("keys.incorrectGroupName"));
            return false; // Prevent dialog from closing
          }

          if (!props.selectedGroup?.id) {
            return;
          }

          isDeling.value = true;
          try {
            await keysApi.clearAllKeys(props.selectedGroup.id);
            window.$message.success(t("keys.clearAllKeysSuccess"));
            await loadKeys();
            // Trigger sync operation refresh
            taskStore.triggerSyncOperationRefresh(props.selectedGroup.name, "CLEAR_ALL");
          } catch (_error) {
            console.error("Clear all failed", _error);
          } finally {
            isDeling.value = false;
          }
        },
      });
    },
  });
}

function changePage(page: number) {
  currentPage.value = page;
}

function changePageSize(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
}

function resetPage() {
  currentPage.value = 1;
  searchText.value = "";
  statusFilter.value = "all";
}
</script>

<template>
  <div class="key-table-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <n-button type="success" size="small" @click="createDialogShow = true">
          <template #icon>
            <n-icon :component="AddCircleOutline" />
          </template>
          {{ t("keys.addKey") }}
        </n-button>
        <n-button type="error" size="small" @click="deleteDialogShow = true">
          <template #icon>
            <n-icon :component="RemoveCircleOutline" />
          </template>
          {{ t("keys.deleteKey") }}
        </n-button>
      </div>
      <div class="toolbar-right">
        <n-space :size="12" align="center">
          <n-select
            v-model:value="statusFilter"
            :options="statusOptions"
            size="small"
            style="width: 120px"
            :placeholder="t('keys.allStatus')"
          />
          <n-input-group>
            <n-input
              v-model:value="searchText"
              :placeholder="t('keys.keyExactMatch')"
              size="small"
              style="width: 200px"
              clearable
              @keyup.enter="handleSearchInput"
            >
              <template #prefix>
                <n-icon :component="Search" />
              </template>
            </n-input>
            <n-button
              type="primary"
              ghost
              size="small"
              :disabled="loading"
              @click="handleSearchInput"
            >
              {{ t("common.search") }}
            </n-button>
          </n-input-group>

          <!-- 批量操作入口 -->
          <n-popover
            v-model:show="showBatchPanel"
            trigger="click"
            placement="bottom-end"
            :show-arrow="false"
            raw
            :disabled="!selectedGroup?.id"
          >
            <template #trigger>
              <n-button size="small" tertiary :disabled="!selectedGroup?.id">
                <template #icon>
                  <n-icon :component="EllipsisHorizontalOutline" />
                </template>
                {{ t("keys.batchActions") }}
              </n-button>
            </template>

            <div class="batch-panel">
              <!-- 复制 -->
              <div class="batch-group">
                <div class="batch-group-header">
                  <n-icon :component="CopyOutline" class="batch-group-icon" />
                  <span class="batch-group-title">{{ t("keys.copy") }}</span>
                </div>
                <div class="batch-group-actions">
                  <button class="batch-chip" @click="runBatch(copyAllKeys)">
                    {{ t("keys.allKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(copyValidKeys)">
                    {{ t("keys.validKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(copyInvalidKeys)">
                    {{ t("keys.invalidKeys") }}
                  </button>
                </div>
              </div>

              <!-- 导出 -->
              <div class="batch-group">
                <div class="batch-group-header">
                  <n-icon :component="CloudDownloadOutline" class="batch-group-icon" />
                  <span class="batch-group-title">{{ t("keys.export") }}</span>
                  <span class="batch-group-hint">{{ t("keys.exportFileHint") }}</span>
                </div>
                <div class="batch-group-actions">
                  <button class="batch-chip" @click="runBatch(exportAllKeys)">
                    {{ t("keys.allKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(exportValidKeys)">
                    {{ t("keys.validKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(exportInvalidKeys)">
                    {{ t("keys.invalidKeys") }}
                  </button>
                </div>
              </div>

              <!-- 校验 -->
              <div class="batch-group">
                <div class="batch-group-header">
                  <n-icon :component="ShieldCheckmarkOutline" class="batch-group-icon" />
                  <span class="batch-group-title">{{ t("keys.validate") }}</span>
                </div>
                <div class="batch-group-actions">
                  <button class="batch-chip" @click="runBatch(() => validateKeys('all'))">
                    {{ t("keys.allKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(() => validateKeys('active'))">
                    {{ t("keys.validKeys") }}
                  </button>
                  <button class="batch-chip" @click="runBatch(() => validateKeys('invalid'))">
                    {{ t("keys.invalidKeys") }}
                  </button>
                </div>
              </div>

              <!-- 危险操作 -->
              <div class="batch-group batch-group-danger">
                <div class="batch-group-header">
                  <n-icon
                    :component="WarningOutline"
                    class="batch-group-icon batch-group-icon-danger"
                  />
                  <span class="batch-group-title batch-group-title-danger">
                    {{ t("keys.dangerousActions") }}
                  </span>
                </div>
                <div class="batch-group-actions">
                  <button class="batch-chip" @click="runBatch(restoreAllInvalid)">
                    {{ t("keys.restoreInvalid") }}
                  </button>
                  <button class="batch-chip batch-chip-danger" @click="runBatch(clearAllInvalid)">
                    {{ t("keys.clearInvalid") }}
                  </button>
                  <button class="batch-chip batch-chip-danger" @click="runBatch(clearAll)">
                    {{ t("keys.clearAll") }}
                  </button>
                </div>
              </div>
            </div>
          </n-popover>
        </n-space>
      </div>
    </div>

    <!-- 密钥卡片网格 -->
    <div class="keys-grid-container">
      <n-spin :show="loading">
        <div v-if="keys.length === 0 && !loading" class="empty-container">
          <n-empty :description="t('keys.noMatchingKeys')" />
        </div>
        <div v-else class="keys-grid">
          <div
            v-for="key in keys"
            :key="key.id"
            class="key-card"
            :class="getStatusClass(key.status)"
          >
            <!-- 主要信息行：Key + 快速操作 -->
            <div class="key-main">
              <div class="key-section">
                <n-tag v-if="key.status === 'active'" type="success" :bordered="false" round>
                  <template #icon>
                    <n-icon :component="CheckmarkCircle" />
                  </template>
                  {{ t("keys.validShort") }}
                </n-tag>
                <n-tag v-else :bordered="false" round>
                  <template #icon>
                    <n-icon :component="AlertCircleOutline" />
                  </template>
                  {{ t("keys.invalidShort") }}
                </n-tag>
                <n-input class="key-text" :value="getDisplayValue(key)" readonly size="small" />
                <div class="quick-actions">
                  <n-button
                    size="tiny"
                    text
                    @click="editKeyNotes(key)"
                    :title="t('keys.editNotes')"
                  >
                    <template #icon>
                      <n-icon :component="Pencil" />
                    </template>
                  </n-button>
                  <n-button
                    size="tiny"
                    text
                    @click="toggleKeyVisibility(key)"
                    :title="t('keys.showHide')"
                  >
                    <template #icon>
                      <n-icon :component="key.is_visible ? EyeOffOutline : EyeOutline" />
                    </template>
                  </n-button>
                  <n-button size="tiny" text @click="copyKey(key)" :title="t('common.copy')">
                    <template #icon>
                      <n-icon :component="CopyOutline" />
                    </template>
                  </n-button>
                </div>
              </div>
            </div>

            <!-- 统计信息 + 操作按钮行 -->
            <div class="key-bottom">
              <div class="key-stats">
                <span class="stat-item">
                  {{ t("keys.requestsShort") }}
                  <strong>{{ key.request_count }}</strong>
                </span>
                <span class="stat-item">
                  {{ t("keys.failuresShort") }}
                  <strong>{{ key.failure_count }}</strong>
                </span>
                <span class="stat-item">
                  {{ key.last_used_at ? formatRelativeTime(key.last_used_at) : t("keys.unused") }}
                </span>
              </div>
              <n-button-group class="key-actions">
                <n-button
                  round
                  tertiary
                  type="info"
                  size="tiny"
                  @click="testKey(key)"
                  :title="t('keys.testKey')"
                >
                  {{ t("keys.testShort") }}
                </n-button>
                <n-button
                  v-if="key.status !== 'active'"
                  tertiary
                  size="tiny"
                  @click="restoreKey(key)"
                  :title="t('keys.restoreKey')"
                  type="warning"
                >
                  {{ t("keys.restoreShort") }}
                </n-button>
                <n-button
                  round
                  tertiary
                  size="tiny"
                  type="error"
                  @click="deleteKey(key)"
                  :title="t('keys.deleteKey')"
                >
                  {{ t("common.deleteShort") }}
                </n-button>
              </n-button-group>
            </div>
          </div>
        </div>
      </n-spin>
    </div>

    <!-- 分页 -->
    <div class="pagination-container">
      <div class="pagination-info">
        <span>{{ t("keys.totalRecords", { total }) }}</span>
        <n-select
          v-model:value="pageSize"
          :options="[
            { label: t('keys.recordsPerPage', { count: 12 }), value: 12 },
            { label: t('keys.recordsPerPage', { count: 24 }), value: 24 },
            { label: t('keys.recordsPerPage', { count: 60 }), value: 60 },
            { label: t('keys.recordsPerPage', { count: 120 }), value: 120 },
          ]"
          size="small"
          style="width: 100px; margin-left: 12px"
          @update:value="changePageSize"
        />
      </div>
      <div class="pagination-controls">
        <n-button size="small" :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">
          {{ t("common.previousPage") }}
        </n-button>
        <span class="page-info">
          {{ t("keys.pageInfo", { current: currentPage, total: totalPages }) }}
        </span>
        <n-button
          size="small"
          :disabled="currentPage >= totalPages"
          @click="changePage(currentPage + 1)"
        >
          {{ t("common.nextPage") }}
        </n-button>
      </div>
    </div>

    <key-create-dialog
      v-if="selectedGroup?.id"
      v-model:show="createDialogShow"
      :group-id="selectedGroup.id"
      :group-name="getGroupDisplayName(selectedGroup!)"
      @success="loadKeys"
    />

    <key-delete-dialog
      v-if="selectedGroup?.id"
      v-model:show="deleteDialogShow"
      :group-id="selectedGroup.id"
      :group-name="getGroupDisplayName(selectedGroup!)"
      @success="handleBatchDeleteSuccess"
    />
  </div>

  <!-- 备注编辑对话框 -->
  <n-modal v-model:show="notesDialogShow" preset="dialog" :title="t('keys.editKeyNotes')">
    <n-input
      v-model:value="editingNotes"
      type="textarea"
      :placeholder="t('keys.enterNotes')"
      :rows="3"
      maxlength="255"
      show-count
    />
    <template #action>
      <n-button @click="notesDialogShow = false">{{ t("common.cancel") }}</n-button>
      <n-button type="primary" @click="saveKeyNotes">{{ t("common.save") }}</n-button>
    </template>
  </n-modal>
</template>

<style scoped>
.key-table-container {
  background: var(--card-bg-solid);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--card-bg-solid);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  gap: 16px;
  min-height: 64px;
}

.toolbar :deep(.n-button) {
  font-weight: 500;
}

.toolbar-left {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  min-width: 0;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 批量操作面板 */
.batch-panel {
  width: 260px;
  padding: 8px;
  background: var(--card-bg-solid);
  border-radius: 10px;
}

.batch-group {
  padding: 6px 2px 8px;
}

.batch-group + .batch-group {
  border-top: 1px solid var(--border-color-light);
}

.batch-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 7px;
}

.batch-group-icon {
  font-size: 14px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.batch-group-icon-danger {
  color: var(--error-color, #d03050);
}

.batch-group-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.batch-group-title-danger {
  color: var(--error-color, #d03050);
}

.batch-group-hint {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-left: auto;
}

.batch-group-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.batch-group-danger {
  background: rgba(208, 48, 80, 0.04);
  border-radius: 0 0 8px 8px;
}

.batch-chip {
  padding: 3px 10px;
  border: 1px solid var(--border-color);
  background: var(--card-bg-solid);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.batch-chip:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: color-mix(in srgb, var(--primary-color) 8%, transparent);
}

.batch-chip-danger {
  color: var(--error-color, #d03050);
}

.batch-chip-danger:hover {
  border-color: var(--error-color, #d03050);
  color: var(--error-color, #d03050);
  background: rgba(208, 48, 80, 0.08);
}

.filter-select,
.search-input,
.page-size-select {
  padding: 4px 8px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 12px;
}

.search-input {
  width: 180px;
}

.filter-select:focus,
.search-input:focus,
.page-size-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px var(--focus-ring);
}

/* 密钥卡片网格 */
.keys-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.keys-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.key-card {
  background: var(--card-bg-solid);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 14px;
  transition: var(--transition-base);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.key-card:hover {
  border-color: var(--border-color-strong);
  box-shadow: var(--shadow-sm);
}

/* 状态相关样式 */
.key-card.status-valid {
  border-color: var(--success-border);
  background: var(--success-bg);
}

.key-card.status-invalid {
  border-color: var(--invalid-border);
  background: var(--card-bg-solid);
  opacity: 0.85;
}

.key-card.status-error {
  border-color: var(--error-border);
  background: var(--error-bg);
}

/* 主要信息行 */
.key-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.key-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

/* 底部统计和按钮行 */
.key-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.key-stats {
  display: flex;
  gap: 8px;
  font-size: 12px;
  overflow: hidden;
  color: var(--text-secondary);
  flex: 1;
  min-width: 0;
}

.stat-item {
  white-space: nowrap;
  color: var(--text-secondary);
}

.stat-item strong {
  color: var(--text-primary);
  font-weight: 600;
}

.key-actions {
  flex-shrink: 0;
  &:deep(.n-button) {
    padding: 0 4px;
  }
}

.key-text {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

/* 浅色主题 */
:root:not(.dark) .key-text {
  color: #495057;
  background: #f8f9fa;
}

/* 暗黑主题 */
:root.dark .key-text {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

:deep(.n-input__input-el) {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 13px;
}

.quick-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.quick-btn {
  padding: 4px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: 3px;
  font-size: 12px;
  transition: background-color 0.2s;
}

/* 浅色主题 */
:root:not(.dark) .quick-btn:hover {
  background: #e9ecef;
}

/* 暗黑主题 */
:root.dark .quick-btn:hover {
  background: var(--bg-tertiary);
}

/* 统计信息行 */

.action-btn {
  padding: 2px 6px;
  border: 1px solid var(--border-color);
  background: var(--card-bg-solid);
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
  color: var(--text-primary);
}

.action-btn:hover {
  background: var(--bg-secondary);
}

.action-btn.primary {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn.primary:hover {
  background: var(--primary-color);
  color: white;
}

.action-btn.secondary {
  border-color: #6c757d;
  color: #6c757d;
}

.action-btn.secondary:hover {
  background: #6c757d;
  color: white;
}

.action-btn.danger {
  border-color: #dc3545;
  color: #dc3545;
}

.action-btn.danger:hover {
  background: #dc3545;
  color: white;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #6c757d;
}

.loading-spinner {
  font-size: 14px;
}

.empty-text {
  font-size: 14px;
}

/* 分页 */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg-solid);
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  border-radius: 0 0 8px 8px;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: space-between;
  }

  .toolbar-right .n-space {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
