<script setup lang="ts">
import { keysApi } from "@/api/keys";
import type {
  Group,
  GroupConfigOption,
  GroupStatsResponse,
  ParentAggregateGroup,
  SubGroupInfo,
} from "@/types/models";
import { useTaskStore } from "@/stores/task";
import { copy } from "@/utils/clipboard";
import { getGroupDisplayName, maskProxyKeys } from "@/utils/display";
import { CopyOutline, EyeOffOutline, EyeOutline, Pencil, Trash } from "@vicons/ionicons5";
import {
  NButton,
  NButtonGroup,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NGrid,
  NGridItem,
  NIcon,
  NInput,
  NModal,
  NSpin,
  NTag,
  NTooltip,
  useDialog,
} from "naive-ui";
import { computed, h, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AggregateGroupModal from "./AggregateGroupModal.vue";
import CopyAggregateGroupModal from "./CopyAggregateGroupModal.vue";
import GroupCopyModal from "./GroupCopyModal.vue";
import GroupFormModal from "./GroupFormModal.vue";

const { t } = useI18n();

interface Props {
  group: Group | null;
  groups?: Group[];
  subGroups?: SubGroupInfo[];
}

interface Emits {
  (e: "refresh", value: Group): void;
  (e: "delete", value: Group): void;
  (e: "copy-success", group: Group): void;
  (e: "navigate-to-group", groupId: number): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();
const taskStore = useTaskStore();

const stats = ref<GroupStatsResponse | null>(null);
const loading = ref(false);
const dialog = useDialog();
const showEditModal = ref(false);
const showCopyModal = ref(false);
const showCopyAggregateModal = ref(false);
const showAggregateEditModal = ref(false);
const delLoading = ref(false);
const confirmInput = ref("");
const showDetailModal = ref(false);
const configOptions = ref<GroupConfigOption[]>([]);
const showProxyKeys = ref(false);
const parentAggregateGroups = ref<ParentAggregateGroup[]>([]);

const proxyKeysDisplay = computed(() => {
  if (!props.group?.proxy_keys) {
    return "-";
  }
  if (showProxyKeys.value) {
    return props.group.proxy_keys.replace(/,/g, "\n");
  }
  return maskProxyKeys(props.group.proxy_keys);
});

const hasAdvancedConfig = computed(() => {
  return (
    (props.group?.config && Object.keys(props.group.config).length > 0) ||
    props.group?.param_overrides ||
    (props.group?.header_rules && props.group.header_rules.length > 0)
  );
});

// 判断是否为聚合分组
const isAggregateGroup = computed(() => {
  return props.group?.group_type === "aggregate";
});

// 渠道类型对应的标签颜色
const channelTagType = computed<"default" | "success" | "info" | "warning" | "error">(() => {
  const map: Record<string, "default" | "success" | "info" | "warning" | "error"> = {
    openai: "success",
    "openai-response": "success",
    gemini: "info",
    anthropic: "warning",
  };
  return map[props.group?.channel_type ?? ""] ?? "default";
});

// 计算有效子分组数（weight > 0 且有可用密钥）
const activeSubGroupsCount = computed(() => {
  return props.subGroups?.filter(sg => sg.weight > 0 && sg.active_keys > 0).length || 0;
});

// 计算禁用子分组数（weight = 0）
const disabledSubGroupsCount = computed(() => {
  return props.subGroups?.filter(sg => sg.weight === 0).length || 0;
});

// 计算无效子分组数（weight > 0 但无可用密钥）
const unavailableSubGroupsCount = computed(() => {
  return props.subGroups?.filter(sg => sg.weight > 0 && sg.active_keys === 0).length || 0;
});

async function copyProxyKeys() {
  if (!props.group?.proxy_keys) {
    return;
  }
  const keysToCopy = props.group.proxy_keys.replace(/,/g, "\n");
  const success = await copy(keysToCopy);
  if (success) {
    window.$message.success(t("keys.proxyKeysCopied"));
  } else {
    window.$message.error(t("keys.copyFailed"));
  }
}

onMounted(() => {
  loadStats();
  loadConfigOptions();
  loadParentAggregateGroups();
});

watch(
  () => props.group,
  () => {
    resetPage();
    loadStats();
    loadParentAggregateGroups();
  }
);

// 监听任务完成事件，自动刷新当前分组数据
watch(
  () => [taskStore.groupDataRefreshTrigger, taskStore.syncOperationTrigger],
  () => {
    if (!props.group) {
      return;
    }

    // 检查是否需要刷新当前分组的数据
    const isCurrentGroupTask =
      taskStore.lastCompletedTask && taskStore.lastCompletedTask.groupName === props.group.name;
    const isCurrentGroupSync =
      taskStore.lastSyncOperation && taskStore.lastSyncOperation.groupName === props.group.name;

    const shouldRefresh =
      (isCurrentGroupTask &&
        ["KEY_VALIDATION", "KEY_IMPORT", "KEY_DELETE"].includes(
          taskStore.lastCompletedTask?.taskType || ""
        )) ||
      isCurrentGroupSync;

    if (shouldRefresh) {
      loadStats();
    }
  }
);

async function loadStats() {
  if (!props.group?.id) {
    stats.value = null;
    return;
  }

  try {
    loading.value = true;
    if (props.group?.id) {
      stats.value = await keysApi.getGroupStats(props.group.id);
    }
  } finally {
    loading.value = false;
  }
}

async function loadConfigOptions() {
  try {
    const options = await keysApi.getGroupConfigOptions();
    configOptions.value = options || [];
  } catch (error) {
    console.error("Failed to load config options:", error);
  }
}

async function loadParentAggregateGroups() {
  if (!props.group?.id || props.group.group_type === "aggregate") {
    parentAggregateGroups.value = [];
    return;
  }

  try {
    const parentGroups = await keysApi.getParentAggregateGroups(props.group.id);
    parentAggregateGroups.value = parentGroups || [];
  } catch (error) {
    console.error("Failed to load parent aggregate groups:", error);
    parentAggregateGroups.value = [];
  }
}

function getConfigDisplayName(key: string): string {
  const option = configOptions.value.find(opt => opt.key === key);
  return option?.name || key;
}

function getConfigDescription(key: string): string {
  const option = configOptions.value.find(opt => opt.key === key);
  return option?.description || t("keys.noDescription");
}

function handleEdit() {
  if (!props.group) {
    return;
  }
  if (props.group.group_type === "aggregate") {
    showAggregateEditModal.value = true;
    return;
  }
  showEditModal.value = true;
}

function handleCopy() {
  if (isAggregateGroup.value) {
    showCopyAggregateModal.value = true;
  } else {
    showCopyModal.value = true;
  }
}

function handleNavigateToGroup(groupId: number) {
  emit("navigate-to-group", groupId);
}

function handleGroupEdited(newGroup: Group) {
  showEditModal.value = false;
  if (newGroup) {
    emit("refresh", newGroup);
  }
}

function handleAggregateGroupEdited(newGroup: Group) {
  showAggregateEditModal.value = false;
  if (newGroup) {
    emit("refresh", newGroup);
  }
}

function handleGroupCopied(newGroup: Group) {
  showCopyModal.value = false;
  if (newGroup) {
    emit("copy-success", newGroup);
  }
}

function handleAggregateGroupCopied(newGroup: Group) {
  showCopyAggregateModal.value = false;
  if (newGroup) {
    emit("copy-success", newGroup);
  }
}

async function handleDelete() {
  if (!props.group || delLoading.value) {
    return;
  }

  dialog.warning({
    title: t("keys.deleteGroup"),
    content: t("keys.confirmDeleteGroup", { name: getGroupDisplayName(props.group) }),
    positiveText: t("common.confirm"),
    negativeText: t("common.cancel"),
    onPositiveClick: () => {
      confirmInput.value = ""; // Reset before opening second dialog
      dialog.create({
        title: t("keys.enterGroupNameToConfirm"),
        content: () =>
          h("div", null, [
            h("p", null, [
              t("keys.dangerousOperation"),
              h(
                "code",
                {
                  style: {
                    margin: "0 6px",
                    padding: "2px 8px",
                    color: "#d03050",
                    background: "rgba(208, 48, 80, 0.08)",
                    border: "1px solid rgba(208, 48, 80, 0.2)",
                    borderRadius: "4px",
                    fontFamily: "SFMono-Regular, Consolas, Menlo, monospace",
                    userSelect: "all",
                    cursor: "text",
                  },
                },
                props.group?.name
              ),
              t("keys.toConfirmDeletion"),
            ]),
            h(NInput, {
              value: confirmInput.value,
              "onUpdate:value": v => {
                confirmInput.value = v;
              },
              placeholder: t("keys.enterGroupName"),
            }),
          ]),
        positiveText: t("keys.confirmDelete"),
        negativeText: t("common.cancel"),
        onPositiveClick: async () => {
          if (confirmInput.value !== props.group?.name) {
            window.$message.error(t("keys.incorrectGroupName"));
            return false; // Prevent dialog from closing
          }

          delLoading.value = true;
          try {
            if (props.group?.id) {
              await keysApi.deleteGroup(props.group.id);
              emit("delete", props.group);
            }
          } finally {
            delLoading.value = false;
          }
        },
      });
    },
  });
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatPercentage(num: number): string {
  if (num <= 0) {
    return "0";
  }
  return `${(num * 100).toFixed(1)}%`;
}

async function copyUrl(url: string) {
  if (!url) {
    return;
  }
  const success = await copy(url);
  if (success) {
    window.$message.success(t("keys.urlCopied"));
  } else {
    window.$message.error(t("keys.copyFailed"));
  }
}

function resetPage() {
  showEditModal.value = false;
  showCopyModal.value = false;
  showDetailModal.value = false;
}
</script>

<template>
  <div class="group-info-container">
    <n-card :bordered="false" class="group-info-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <h3 class="group-title">
              {{ group ? getGroupDisplayName(group) : t("keys.selectGroup") }}
              <n-tooltip trigger="hover" v-if="group && group.endpoint">
                <template #trigger>
                  <code class="group-url" @click="copyUrl(group.endpoint)">
                    {{ group.endpoint }}
                  </code>
                </template>
                {{ t("keys.clickToCopy") }}
              </n-tooltip>
            </h3>
          </div>
          <div class="header-actions">
            <n-button
              quaternary
              circle
              size="small"
              @click="handleCopy"
              :title="isAggregateGroup ? t('subGroups.copyAggregateGroup') : t('keys.copyGroup')"
              :disabled="!group"
            >
              <template #icon>
                <n-icon :component="CopyOutline" />
              </template>
            </n-button>
            <n-button
              quaternary
              circle
              size="small"
              @click="handleEdit"
              :title="t('keys.editGroup')"
            >
              <template #icon>
                <n-icon :component="Pencil" />
              </template>
            </n-button>
            <n-button
              quaternary
              circle
              size="small"
              @click="handleDelete"
              :title="t('keys.deleteGroup')"
              type="error"
              :disabled="!group"
            >
              <template #icon>
                <n-icon :component="Trash" />
              </template>
            </n-button>
          </div>
        </div>
      </template>

      <n-divider style="margin: 0; margin-bottom: 12px" />
      <!-- 统计摘要区 -->
      <div class="stats-summary">
        <n-spin :show="loading" size="small">
          <n-grid cols="2 s:4" :x-gap="12" :y-gap="12" responsive="screen">
            <n-grid-item span="1">
              <!-- 聚合分组：子分组统计 -->
              <n-statistic
                v-if="isAggregateGroup"
                :label="`${t('keys.subGroups')}：${props.subGroups?.length || 0}`"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="success" size="20">
                      {{ activeSubGroupsCount }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.activeSubGroups") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="warning" size="20">
                      {{ disabledSubGroupsCount }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.disabledSubGroups") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ unavailableSubGroupsCount }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.unavailableSubGroups") }}
                </n-tooltip>
              </n-statistic>

              <!-- 标准分组：密钥统计 -->
              <n-statistic
                v-else
                :label="`${t('keys.keyCount')}：${stats?.key_stats?.total_keys ?? 0}`"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="success" size="20">
                      {{ stats?.key_stats?.active_keys ?? 0 }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.activeKeyCount") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ stats?.key_stats?.invalid_keys ?? 0 }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.invalidKeyCount") }}
                </n-tooltip>
              </n-statistic>
            </n-grid-item>
            <n-grid-item span="1">
              <n-statistic
                :label="`${t('keys.stats24Hour')}：${formatNumber(stats?.stats_24_hour?.total_requests ?? 0)}`"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatNumber(stats?.stats_24_hour?.failed_requests ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats24HourFailed") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatPercentage(stats?.stats_24_hour?.failure_rate ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats24HourFailureRate") }}
                </n-tooltip>
              </n-statistic>
            </n-grid-item>
            <n-grid-item span="1">
              <n-statistic
                :label="`${t('keys.stats7Day')}：${formatNumber(stats?.stats_7_day?.total_requests ?? 0)}`"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatNumber(stats?.stats_7_day?.failed_requests ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats7DayFailed") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatPercentage(stats?.stats_7_day?.failure_rate ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats7DayFailureRate") }}
                </n-tooltip>
              </n-statistic>
            </n-grid-item>
            <n-grid-item span="1">
              <n-statistic
                :label="`${t('keys.stats30Day')}：${formatNumber(stats?.stats_30_day?.total_requests ?? 0)}`"
              >
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatNumber(stats?.stats_30_day?.failed_requests ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats30DayFailed") }}
                </n-tooltip>
                <n-divider vertical />
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-gradient-text type="error" size="20">
                      {{ formatPercentage(stats?.stats_30_day?.failure_rate ?? 0) }}
                    </n-gradient-text>
                  </template>
                  {{ t("keys.stats30DayFailureRate") }}
                </n-tooltip>
              </n-statistic>
            </n-grid-item>
          </n-grid>
        </n-spin>
      </div>
      <n-divider style="margin: 0" />

      <!-- 详细信息按钮（点击打开对话框） -->
      <div class="details-section">
        <n-button block secondary size="small" :disabled="!group" @click="showDetailModal = true">
          <template #icon>
            <n-icon :component="EyeOutline" />
          </template>
          {{ t("keys.detailInfo") }}
        </n-button>
      </div>
    </n-card>

    <!-- 详细信息对话框 -->
    <n-modal
      v-model:show="showDetailModal"
      preset="card"
      :title="t('keys.detailInfo')"
      :style="{ width: '760px', maxWidth: '92vw' }"
      :bordered="false"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <div class="details-content">
        <!-- 基础信息 -->
        <div class="detail-section">
          <h4 class="section-title">{{ t("keys.basicInfo") }}</h4>
          <n-descriptions
            label-placement="left"
            bordered
            :column="2"
            size="small"
            label-align="right"
          >
            <n-descriptions-item :label="t('keys.groupName')">
              {{ group?.name || "-" }}
            </n-descriptions-item>
            <n-descriptions-item :label="t('keys.displayName')">
              {{ group?.display_name || "-" }}
            </n-descriptions-item>
            <n-descriptions-item :label="t('keys.channelType')">
              <n-tag size="small" :type="channelTagType">{{ group?.channel_type }}</n-tag>
            </n-descriptions-item>
            <n-descriptions-item :label="t('keys.sortOrder')">
              {{ group?.sort ?? 0 }}
            </n-descriptions-item>
            <n-descriptions-item v-if="!isAggregateGroup" :label="t('keys.testModel')">
              {{ group?.test_model || "-" }}
            </n-descriptions-item>
            <n-descriptions-item
              v-if="!isAggregateGroup && group?.channel_type !== 'gemini'"
              :label="t('keys.testPath')"
            >
              <span class="mono-text">{{ group?.validation_endpoint || "-" }}</span>
            </n-descriptions-item>
            <n-descriptions-item :label="t('keys.proxyKeys')" :span="2">
              <div class="proxy-keys-content">
                <span class="key-text">{{ proxyKeysDisplay }}</span>
                <n-button-group size="small" class="key-actions" v-if="group?.proxy_keys">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button quaternary circle @click="showProxyKeys = !showProxyKeys">
                        <template #icon>
                          <n-icon :component="showProxyKeys ? EyeOffOutline : EyeOutline" />
                        </template>
                      </n-button>
                    </template>
                    {{ showProxyKeys ? t("keys.hideKeys") : t("keys.showKeys") }}
                  </n-tooltip>
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <n-button quaternary circle @click="copyProxyKeys">
                        <template #icon>
                          <n-icon :component="CopyOutline" />
                        </template>
                      </n-button>
                    </template>
                    {{ t("keys.copyKeys") }}
                  </n-tooltip>
                </n-button-group>
              </div>
            </n-descriptions-item>
            <n-descriptions-item :label="t('common.description')" :span="2">
              <span class="description-text">{{ group?.description || "-" }}</span>
            </n-descriptions-item>
          </n-descriptions>
        </div>

        <!-- 聚合引用区（仅普通分组且存在被引用关系时显示） -->
        <div class="detail-section" v-if="!isAggregateGroup && parentAggregateGroups.length > 0">
          <h4 class="section-title">{{ t("keys.aggregateReferences") }}</h4>
          <div class="ref-list">
            <div
              v-for="(parent, index) in parentAggregateGroups"
              :key="parent.group_id"
              class="ref-item"
            >
              <span class="item-index">#{{ index + 1 }}</span>
              <n-tag size="small" type="info" class="item-weight">
                {{ t("keys.weight") }}: {{ parent.weight }}
              </n-tag>
              <span class="ref-name">{{ parent.display_name || parent.name }}</span>
              <n-button
                tertiary
                type="primary"
                size="small"
                @click="handleNavigateToGroup(parent.group_id)"
                :title="t('keys.viewGroupInfo')"
              >
                <template #icon>
                  <n-icon :component="EyeOutline" />
                </template>
                {{ t("common.view") }}
              </n-button>
            </div>
          </div>
        </div>

        <!-- 标准分组才显示上游地址 -->
        <div class="detail-section" v-if="!isAggregateGroup">
          <h4 class="section-title">{{ t("keys.upstreamAddresses") }}</h4>
          <div class="upstream-list">
            <div
              v-for="(upstream, index) in group?.upstreams ?? []"
              :key="index"
              class="upstream-item"
            >
              <span class="item-index">#{{ index + 1 }}</span>
              <n-tag size="small" type="info" class="item-weight">
                {{ t("keys.weight") }}: {{ upstream.weight }}
              </n-tag>
              <span class="upstream-url mono-text">{{ upstream.url }}</span>
            </div>
            <div v-if="!group?.upstreams?.length" class="empty-hint">-</div>
          </div>
        </div>

        <!-- 标准分组才显示高级配置 -->
        <div class="detail-section" v-if="!isAggregateGroup && hasAdvancedConfig">
          <h4 class="section-title">{{ t("keys.advancedConfig") }}</h4>

          <!-- 通用配置项 -->
          <n-descriptions
            v-if="Object.keys(group?.config || {}).length > 0"
            label-placement="left"
            bordered
            :column="1"
            size="small"
            label-align="right"
          >
            <n-descriptions-item v-for="(value, key) in group?.config || {}" :key="key">
              <template #label>
                <n-tooltip trigger="hover" :delay="300" placement="top">
                  <template #trigger>
                    <span class="config-label">
                      {{ getConfigDisplayName(key) }}
                      <n-icon size="13" class="config-help-icon">
                        <svg viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,17A1.5,1.5 0 0,1 10.5,15.5A1.5,1.5 0 0,1 12,14A1.5,1.5 0 0,1 13.5,15.5A1.5,1.5 0 0,1 12,17M12,10.5C10.07,10.5 8.5,8.93 8.5,7A3.5,3.5 0 0,1 12,3.5A3.5,3.5 0 0,1 15.5,7C15.5,8.93 13.93,10.5 12,10.5Z"
                          />
                        </svg>
                      </n-icon>
                    </span>
                  </template>
                  <div class="config-tooltip">
                    <div class="tooltip-title">{{ getConfigDisplayName(key) }}</div>
                    <div class="tooltip-description">{{ getConfigDescription(key) }}</div>
                    <div class="tooltip-key">{{ t("keys.configKey") }}: {{ key }}</div>
                  </div>
                </n-tooltip>
              </template>
              <span class="config-value">{{ value || "-" }}</span>
            </n-descriptions-item>
          </n-descriptions>

          <!-- 自定义 Header -->
          <div class="sub-section" v-if="group?.header_rules && group.header_rules.length > 0">
            <div class="sub-section-title">{{ t("keys.customHeaders") }}</div>
            <div class="header-rules-display">
              <div
                v-for="(rule, index) in group.header_rules"
                :key="index"
                class="header-rule-item"
              >
                <n-tag :type="rule.action === 'remove' ? 'error' : 'default'" size="small">
                  {{ rule.key }}
                </n-tag>
                <span class="header-separator">=</span>
                <span class="header-value" v-if="rule.action === 'set'">
                  {{ rule.value || t("keys.emptyValue") }}
                </span>
                <n-tag v-else size="small" type="error" :bordered="false">
                  {{ t("common.delete") }}
                </n-tag>
              </div>
            </div>
          </div>

          <!-- 模型重定向 -->
          <div class="sub-section" v-if="group?.model_redirect_rules">
            <div class="sub-section-title">{{ t("keys.modelRedirectPolicy") }}</div>
            <div class="sub-section-row">
              <n-tag :type="group?.model_redirect_strict ? 'warning' : 'success'" size="small">
                {{
                  group?.model_redirect_strict
                    ? t("keys.modelRedirectStrictMode")
                    : t("keys.modelRedirectLooseMode")
                }}
              </n-tag>
            </div>
            <div class="sub-section-title sub-section-title-sm">
              {{ t("keys.modelRedirectRules") }}
            </div>
            <pre class="config-json">{{
              JSON.stringify(group?.model_redirect_rules || {}, null, 2)
            }}</pre>
          </div>

          <!-- 参数覆盖 -->
          <div class="sub-section" v-if="group?.param_overrides">
            <div class="sub-section-title">{{ t("keys.paramOverrides") }}</div>
            <pre class="config-json">{{
              JSON.stringify(group?.param_overrides || "", null, 2)
            }}</pre>
          </div>
        </div>
      </div>
    </n-modal>

    <group-form-modal v-model:show="showEditModal" :group="group" @success="handleGroupEdited" />
    <aggregate-group-modal
      v-model:show="showAggregateEditModal"
      :group="group"
      :groups="props.groups"
      @success="handleAggregateGroupEdited"
    />
    <group-copy-modal
      v-model:show="showCopyModal"
      :source-group="group"
      @success="handleGroupCopied"
    />
    <copy-aggregate-group-modal
      v-model:show="showCopyAggregateModal"
      :group="group"
      @success="handleAggregateGroupCopied"
    />
  </div>
</template>

<style scoped>
.group-info-container {
  width: 100%;
}

:deep(.n-card-header) {
  padding: 12px 24px;
}

.group-info-card {
  background: var(--card-bg-solid);
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
  animation: fadeInUp 0.2s ease-out;
  box-shadow: var(--shadow-sm);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-left {
  flex: 1;
}

.group-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-url {
  font-size: 0.8rem;
  color: var(--primary-color);
  margin-left: 8px;
  font-family: monospace;
  background: var(--bg-secondary);
  border-radius: 4px;
  padding: 2px 6px;
  margin-right: 4px;
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.2s ease;
}

.group-id {
  font-size: 0.75rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.stats-summary {
  margin-bottom: 12px;
  text-align: center;
}

.status-cards-container:deep(.n-card) {
  max-width: 160px;
}

:deep(.status-card-failure .n-card-header__main) {
  color: var(--error-color, #d03050);
}

.status-title {
  color: var(--text-secondary);
  font-size: 12px;
}

.details-section {
  margin-top: 12px;
}

.details-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 6px;
}

.detail-section {
  margin-bottom: 22px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px 0;
  padding-left: 8px;
  border-left: 3px solid var(--primary-color);
  line-height: 1.4;
}

/* 通用等宽文本（URL、路径等） */
.mono-text {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  word-break: break-all;
  line-height: 1.5;
  color: var(--text-primary);
}

/* 基础信息 descriptions 微调 */
.details-content :deep(.n-descriptions-item-label) {
  font-weight: 500;
  color: var(--text-secondary);
  width: 120px;
  white-space: nowrap;
}

.details-content :deep(.n-descriptions-item-content) {
  color: var(--text-primary);
  vertical-align: top;
}

/* 描述文本 */
.description-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  color: var(--text-primary);
}

/* 聚合引用列表 */
.ref-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color-light);
}

.item-index {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
  min-width: 24px;
}

.item-weight {
  flex-shrink: 0;
}

.ref-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-primary);
  word-break: break-all;
}

/* 上游地址列表 */
.upstream-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upstream-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--border-radius-sm);
  border: 1px solid var(--border-color-light);
}

.upstream-url {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  word-break: break-all;
  line-height: 1.5;
  color: var(--text-primary);
}

.empty-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 12px;
  font-size: 0.85rem;
}

/* 高级配置子区块 */
.sub-section {
  margin-top: 14px;
}

.sub-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.sub-section-title-sm {
  margin-top: 12px;
}

.sub-section-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.85rem;
  word-break: break-all;
  color: var(--text-primary);
}

.config-json {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color-light);
  border-radius: var(--border-radius-sm);
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  color: var(--text-primary);
  margin: 6px 0 0 0;
  overflow-x: auto;
  white-space: pre;
  line-height: 1.5;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:deep(.n-form-item-feedback-wrapper) {
  min-height: 0;
}

/* 描述内容样式 */
.proxy-keys-content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.key-text {
  flex-grow: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.5;
  padding-top: 2px;
  color: var(--text-primary);
  font-size: 0.85rem;
}

.key-actions {
  flex-shrink: 0;
}

/* 配置项tooltip样式 */
.config-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: help;
}

.config-help-icon {
  color: var(--text-tertiary);
  transition: color 0.2s ease;
}

.config-label:hover .config-help-icon {
  color: var(--primary-color);
}

.config-tooltip {
  max-width: 300px;
  padding: 8px 0;
}

.tooltip-title {
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.tooltip-description {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 6px;
  line-height: 1.4;
  font-size: 0.85rem;
}

.tooltip-key {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-family: monospace;
  background: rgba(255, 255, 255, 0.15);
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

/* Header rules display styles */
.header-rules-display {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color-light);
  border-radius: var(--border-radius-sm);
  padding: 8px 10px;
}

.header-rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  flex-wrap: wrap;
}

.header-separator {
  color: var(--text-secondary);
  font-weight: 500;
}

.header-value {
  color: var(--text-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
  word-break: break-all;
}

.header-removed {
  color: var(--error-color, #dc2626);
  font-style: italic;
  font-size: 0.8rem;
}
</style>
