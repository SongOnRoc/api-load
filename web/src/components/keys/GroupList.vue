<script setup lang="ts">
import { keysApi } from "@/api/keys";
import type { Group } from "@/types/models";
import { getGroupDisplayName } from "@/utils/display";
import { Add, AddCircleOutline, Copy, LinkOutline, Search } from "@vicons/ionicons5";
import { NButton, NCard, NEmpty, NInput, NSpin, NTabPane, NTabs, NTag, NTooltip } from "naive-ui";
import { computed, onBeforeUpdate, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AggregateGroupModal from "./AggregateGroupModal.vue";
import CopyAggregateGroupModal from "./CopyAggregateGroupModal.vue";
import CreateSubGroupModal from "./CreateSubGroupModal.vue";
import GroupFormModal from "./GroupFormModal.vue";
import ParentAggregateDrawer from "./ParentAggregateDrawer.vue";

const { t } = useI18n();

interface Props {
  groups: Group[];
  selectedGroup: Group | null;
  loading?: boolean;
}

interface Emits {
  (e: "group-select", group: Group): void;
  (e: "refresh"): void;
  (e: "refresh-and-select", groupId: number): void;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<Emits>();

const searchText = ref("");

// 父聚合分组抽屉状态
const parentDrawerShow = ref(false);
const parentDrawerGroupId = ref<number | null>(null);

// Tab 切换：聚合分组 / 标准分组
type GroupTab = "aggregate" | "standard";
const activeTab = ref<GroupTab>("aggregate");

const aggregateTabLabel = computed(
  () =>
    t("keys.aggregateGroup") +
    (aggregateGroups.value.length > 0 ? ` (${aggregateGroups.value.length})` : "")
);

const standardTabLabel = computed(
  () =>
    t("keys.standardGroup") +
    (standardGroups.value.length > 0 ? ` (${standardGroups.value.length})` : "")
);

// 选中分组变化时，自动切换到对应 tab
watch(
  () => props.selectedGroup,
  group => {
    if (!group) {
      return;
    }
    const expected: GroupTab = group.group_type === "aggregate" ? "aggregate" : "standard";
    if (activeTab.value !== expected) {
      activeTab.value = expected;
    }
  }
);

function openParentDrawer(group: Group) {
  if (!group.id) {
    return;
  }
  parentDrawerGroupId.value = group.id;
  parentDrawerShow.value = true;
}

function handleParentDrawerSelect(parentGroupId: number) {
  const target = displayGroups.value.find(g => g.id === parentGroupId);
  if (target) {
    handleGroupClick(target);
  }
}

// 复制聚合分组弹窗状态
const copyAggregateModalShow = ref(false);
const copyAggregateTarget = ref<Group | null>(null);

function openCopyAggregateModal(group: Group) {
  copyAggregateTarget.value = group;
  copyAggregateModalShow.value = true;
}

function handleCopyAggregateCreated(newGroup: Group) {
  copyAggregateModalShow.value = false;
  copyAggregateTarget.value = null;
  // 复制成功后刷新列表并选中新分组
  if (newGroup.id) {
    emit("refresh-and-select", newGroup.id);
    handleGroupClick(newGroup);
  } else {
    emit("refresh");
  }
}
const showGroupModal = ref(false);
// 存储分组项 DOM 元素的引用
const groupItemRefs = ref<Map<number, HTMLElement>>(new Map());
const showAggregateGroupModal = ref(false);
const createSubGroupModalShow = ref(false);
const createSubGroupTarget = ref<Group | null>(null);
const displayGroups = ref<Group[]>([]);
const draggingGroupId = ref<number | null>(null);
const dropTarget = ref<{ groupId: number; position: "before" | "after" } | null>(null);
const savingOrder = ref(false);
const suspendAutoScroll = ref(false);

const isTouchDevice = computed(() => {
  if (typeof window === "undefined") {
    return false;
  }
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
});

const hasSearchFilter = computed(() => Boolean(searchText.value.trim()));

const canDrag = computed(
  () =>
    !props.loading &&
    !savingOrder.value &&
    !hasSearchFilter.value &&
    !isTouchDevice.value &&
    displayGroups.value.length > 1
);

const dragDisabledHint = computed(() => {
  if (hasSearchFilter.value) {
    return t("keys.dragSortHint");
  }
  if (isTouchDevice.value) {
    return t("keys.dragSortTouchDisabled");
  }
  return "";
});

watch(
  () => props.groups,
  groups => {
    if (savingOrder.value) {
      return;
    }
    displayGroups.value = groups.map(group => ({ ...group }));
    if (suspendAutoScroll.value) {
      suspendAutoScroll.value = false;
    }
  },
  {
    immediate: true,
    deep: true,
  }
);

onBeforeUpdate(() => {
  groupItemRefs.value.clear();
});

const filteredGroups = computed(() => {
  if (!searchText.value.trim()) {
    return displayGroups.value;
  }
  const search = searchText.value.toLowerCase().trim();
  return displayGroups.value.filter(
    group =>
      group.name.toLowerCase().includes(search) ||
      group.display_name?.toLowerCase().includes(search)
  );
});

// 按类型分两组：聚合分组 / 标准分组
const aggregateGroups = computed(() =>
  filteredGroups.value.filter(g => g.group_type === "aggregate")
);

const standardGroups = computed(() =>
  filteredGroups.value.filter(g => g.group_type !== "aggregate")
);

// 监听选中项 ID 的变化，并自动滚动到该项
watch(
  () => props.selectedGroup?.id,
  id => {
    if (!id || displayGroups.value.length === 0 || suspendAutoScroll.value) {
      return;
    }

    const element = groupItemRefs.value.get(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth", // 平滑滚动
        block: "nearest", // 将元素滚动到最近的边缘
      });
    }
  },
  {
    flush: "post", // 确保在 DOM 更新后执行回调
    immediate: true, // 立即执行一次以处理初始加载
  }
);

function handleGroupClick(group: Group) {
  if (draggingGroupId.value || savingOrder.value) {
    return;
  }
  emit("group-select", group);
}

// 获取渠道类型的标签颜色
function getChannelTagType(channelType: string) {
  switch (channelType) {
    case "openai":
    case "openai-response":
      return "success";
    case "gemini":
      return "info";
    case "anthropic":
      return "warning";
    default:
      return "default";
  }
}

function openCreateGroupModal() {
  showGroupModal.value = true;
}

function openCreateAggregateGroupModal() {
  showAggregateGroupModal.value = true;
}

function openCreateSubGroupModal(group: Group) {
  createSubGroupTarget.value = group;
  createSubGroupModalShow.value = true;
}

function handleSubGroupCreated(newGroup: Group) {
  createSubGroupModalShow.value = false;
  // 立即把新建的子分组插入到 displayGroups 头部，UI 即时显示，无需等待 watch 重新拉取
  if (newGroup?.id) {
    const exists = displayGroups.value.some(g => g.id === newGroup.id);
    if (!exists) {
      displayGroups.value = [newGroup, ...displayGroups.value];
    }
  }
  const targetId = createSubGroupTarget.value?.id;
  // 先 emit，再清空 target，避免 emit 之前 v-if 失效影响事件链
  if (targetId) {
    emit("refresh-and-select", targetId);
  } else {
    emit("refresh");
  }
  createSubGroupTarget.value = null;
}

function handleGroupCreated(group: Group) {
  showGroupModal.value = false;
  showAggregateGroupModal.value = false;
  if (group?.id) {
    emit("refresh-and-select", group.id);
  }
}

function setGroupItemRef(el: Element | null, groupId?: number) {
  if (el instanceof HTMLElement && groupId) {
    groupItemRefs.value.set(groupId, el);
  }
}

function reorderInMemory(
  sourceGroupId: number,
  targetGroupId: number,
  position: "before" | "after"
): boolean {
  const sourceIndex = displayGroups.value.findIndex(group => group.id === sourceGroupId);
  const targetIndex = displayGroups.value.findIndex(group => group.id === targetGroupId);

  if (sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  const reordered = [...displayGroups.value];
  const [moved] = reordered.splice(sourceIndex, 1);

  let insertIndex = targetIndex;
  if (sourceIndex < targetIndex) {
    insertIndex -= 1;
  }
  if (position === "after") {
    insertIndex += 1;
  }

  if (insertIndex < 0) {
    insertIndex = 0;
  }
  if (insertIndex > reordered.length) {
    insertIndex = reordered.length;
  }

  if (insertIndex === sourceIndex) {
    return false;
  }

  reordered.splice(insertIndex, 0, moved);
  displayGroups.value = reordered;
  return true;
}

async function persistGroupOrder(previousOrder: Group[]) {
  const previousSortMap = new Map<number, number>();
  previousOrder.forEach(group => {
    if (group.id) {
      previousSortMap.set(group.id, group.sort);
    }
  });

  const items: { id: number; sort: number }[] = [];
  displayGroups.value.forEach((group, index) => {
    if (!group.id) {
      return;
    }
    const targetSort = (index + 1) * 10;
    if (previousSortMap.get(group.id) !== targetSort) {
      items.push({ id: group.id, sort: targetSort });
    }
    group.sort = targetSort;
  });

  if (items.length === 0) {
    suspendAutoScroll.value = false;
    return;
  }

  try {
    savingOrder.value = true;
    await keysApi.reorderGroups(items);
    window.$message?.success(t("keys.dragSortSaved"));
    emit("refresh");
  } catch (error) {
    console.error("Failed to reorder groups:", error);
    displayGroups.value = previousOrder.map(group => ({ ...group }));
    window.$message?.error(t("keys.dragSortSaveFailed"));
    emit("refresh");
  } finally {
    savingOrder.value = false;
    suspendAutoScroll.value = false;
  }
}

function handleDragStart(event: DragEvent, groupId?: number) {
  if (!canDrag.value || !groupId) {
    return;
  }

  event.stopPropagation();
  draggingGroupId.value = groupId;
  dropTarget.value = null;
  suspendAutoScroll.value = true;

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(groupId));
  }
}

function resolveDropPosition(event: DragEvent, targetGroupId: number): "before" | "after" {
  const element = groupItemRefs.value.get(targetGroupId);
  if (!element) {
    return "after";
  }
  const rect = element.getBoundingClientRect();
  return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
}

function handleDragOver(event: DragEvent, targetGroupId?: number) {
  if (!canDrag.value || !draggingGroupId.value || !targetGroupId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const nextPosition = resolveDropPosition(event, targetGroupId);
  if (
    !dropTarget.value ||
    dropTarget.value.groupId !== targetGroupId ||
    dropTarget.value.position !== nextPosition
  ) {
    dropTarget.value = { groupId: targetGroupId, position: nextPosition };
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

async function handleDrop(event: DragEvent, targetGroupId?: number) {
  event.preventDefault();
  event.stopPropagation();

  const sourceGroupId = draggingGroupId.value;
  const target = dropTarget.value;
  draggingGroupId.value = null;
  dropTarget.value = null;

  if (
    !canDrag.value ||
    !sourceGroupId ||
    !targetGroupId ||
    !target ||
    sourceGroupId === targetGroupId
  ) {
    if (!savingOrder.value) {
      suspendAutoScroll.value = false;
    }
    return;
  }

  const previousOrder = displayGroups.value.map(group => ({ ...group }));
  const changed = reorderInMemory(sourceGroupId, targetGroupId, target.position);
  if (!changed) {
    suspendAutoScroll.value = false;
    return;
  }

  await persistGroupOrder(previousOrder);
}

function handleDragEnd() {
  draggingGroupId.value = null;
  dropTarget.value = null;
  if (!savingOrder.value) {
    suspendAutoScroll.value = false;
  }
}
</script>

<template>
  <div class="group-list-container">
    <n-card class="group-list-card modern-card" :bordered="false" size="small">
      <!-- 分组类型切换 -->
      <n-tabs
        v-model:value="activeTab"
        type="segment"
        size="small"
        class="group-tabs"
        :tabs-padding="8"
      >
        <n-tab-pane name="aggregate" :tab="aggregateTabLabel">
          <div class="search-section">
            <n-input
              v-model:value="searchText"
              :placeholder="t('keys.searchGroupPlaceholder')"
              size="small"
              clearable
            >
              <template #prefix>
                <n-icon :component="Search" />
              </template>
            </n-input>
          </div>
          <div class="groups-section">
            <n-spin :show="loading" size="small">
              <div v-if="aggregateGroups.length === 0 && !loading" class="empty-container">
                <n-empty
                  size="small"
                  :description="
                    searchText ? t('keys.noMatchingGroups') : t('keys.noAggregateGroups')
                  "
                />
              </div>
              <div v-else class="groups-list">
                <div
                  v-for="group in aggregateGroups"
                  :key="group.id"
                  class="group-item"
                  :class="{
                    active: selectedGroup?.id === group.id,
                    aggregate: group.group_type === 'aggregate',
                    dragging: draggingGroupId === group.id,
                    'drop-before':
                      dropTarget?.groupId === group.id &&
                      dropTarget?.position === 'before' &&
                      draggingGroupId !== group.id,
                    'drop-after':
                      dropTarget?.groupId === group.id &&
                      dropTarget?.position === 'after' &&
                      draggingGroupId !== group.id,
                  }"
                  @click="handleGroupClick(group)"
                  @dragover="handleDragOver($event, group.id)"
                  @drop="handleDrop($event, group.id)"
                  :ref="
                    el => {
                      setGroupItemRef(el as Element | null, group.id);
                    }
                  "
                >
                  <div
                    class="group-icon"
                    :class="{ 'drag-disabled': !canDrag }"
                    :draggable="canDrag"
                    :role="'button'"
                    :aria-label="t('keys.dragHandle')"
                    :aria-describedby="dragDisabledHint ? `drag-hint-${group.id}` : undefined"
                    @dragstart="handleDragStart($event, group.id)"
                    @dragend="handleDragEnd"
                  >
                    <span>🔗</span>
                  </div>
                  <div class="group-content">
                    <div class="group-name">{{ getGroupDisplayName(group) }}</div>
                    <div class="group-meta">
                      <n-tag size="tiny" :type="getChannelTagType(group.channel_type)">
                        {{ group.channel_type }}
                      </n-tag>
                    </div>
                  </div>
                  <n-tooltip trigger="hover" placement="right">
                    <template #trigger>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        class="action-btn"
                        @click.stop="openCreateSubGroupModal(group)"
                      >
                        <template #icon>
                          <n-icon :component="AddCircleOutline" />
                        </template>
                      </n-button>
                    </template>
                    {{ t("subGroups.createSubGroup") }}
                  </n-tooltip>
                  <n-tooltip trigger="hover" placement="right">
                    <template #trigger>
                      <n-button
                        quaternary
                        circle
                        size="tiny"
                        class="action-btn"
                        @click.stop="openCopyAggregateModal(group)"
                      >
                        <template #icon>
                          <n-icon :component="Copy" />
                        </template>
                      </n-button>
                    </template>
                    {{ t("common.copy") }}
                  </n-tooltip>
                  <span v-if="dragDisabledHint" :id="`drag-hint-${group.id}`" class="sr-only">
                    {{ dragDisabledHint }}
                  </span>
                </div>
              </div>
            </n-spin>
          </div>
        </n-tab-pane>
        <n-tab-pane name="standard" :tab="standardTabLabel">
          <div class="search-section">
            <n-input
              v-model:value="searchText"
              :placeholder="t('keys.searchGroupPlaceholder')"
              size="small"
              clearable
            >
              <template #prefix>
                <n-icon :component="Search" />
              </template>
            </n-input>
          </div>
          <div class="groups-section">
            <n-spin :show="loading" size="small">
              <div v-if="standardGroups.length === 0 && !loading" class="empty-container">
                <n-empty
                  size="small"
                  :description="
                    searchText ? t('keys.noMatchingGroups') : t('keys.noStandardGroups')
                  "
                />
              </div>
              <div v-else class="groups-list">
                <div
                  v-for="group in standardGroups"
                  :key="group.id"
                  class="group-item"
                  :class="{
                    active: selectedGroup?.id === group.id,
                    dragging: draggingGroupId === group.id,
                    'drop-before':
                      dropTarget?.groupId === group.id &&
                      dropTarget?.position === 'before' &&
                      draggingGroupId !== group.id,
                    'drop-after':
                      dropTarget?.groupId === group.id &&
                      dropTarget?.position === 'after' &&
                      draggingGroupId !== group.id,
                  }"
                  @click="handleGroupClick(group)"
                  @dragover="handleDragOver($event, group.id)"
                  @drop="handleDrop($event, group.id)"
                  :ref="
                    el => {
                      setGroupItemRef(el as Element | null, group.id);
                    }
                  "
                >
                  <div
                    class="group-icon"
                    :class="{ 'drag-disabled': !canDrag }"
                    :draggable="canDrag"
                    :role="'button'"
                    :aria-label="t('keys.dragHandle')"
                    :aria-describedby="dragDisabledHint ? `drag-hint-${group.id}` : undefined"
                    @dragstart="handleDragStart($event, group.id)"
                    @dragend="handleDragEnd"
                  >
                    <span v-if="group.channel_type === 'openai'">🤖</span>
                    <span v-else-if="group.channel_type === 'openai-response'">🔁</span>
                    <span v-else-if="group.channel_type === 'gemini'">💎</span>
                    <span v-else-if="group.channel_type === 'anthropic'">🧠</span>
                    <span v-else>🔧</span>
                  </div>
                  <div class="group-content">
                    <div class="group-name">{{ getGroupDisplayName(group) }}</div>
                    <div class="group-meta">
                      <n-tag size="tiny" :type="getChannelTagType(group.channel_type)">
                        {{ group.channel_type }}
                      </n-tag>
                      <span class="group-id">#{{ group.name }}</span>
                    </div>
                  </div>
                  <n-tooltip
                    v-if="(group.parent_aggregate_count ?? 0) > 0"
                    trigger="hover"
                    placement="top"
                  >
                    <template #trigger>
                      <button
                        type="button"
                        class="parent-count-badge"
                        :class="{ 'is-many': (group.parent_aggregate_count ?? 0) >= 100 }"
                        @click.stop="openParentDrawer(group)"
                      >
                        <n-icon :component="LinkOutline" size="11" />
                        <span class="badge-text">
                          {{
                            (group.parent_aggregate_count ?? 0) >= 100
                              ? "99+"
                              : group.parent_aggregate_count
                          }}
                        </span>
                      </button>
                    </template>
                    {{
                      t("subGroups.parentAggregateCount", { count: group.parent_aggregate_count })
                    }}
                  </n-tooltip>
                  <span v-if="dragDisabledHint" :id="`drag-hint-${group.id}`" class="sr-only">
                    {{ dragDisabledHint }}
                  </span>
                </div>
              </div>
            </n-spin>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 添加分组按钮：固定在卡片底部，根据当前 tab 切换 -->
      <div class="add-section">
        <n-button
          v-if="activeTab === 'aggregate'"
          type="info"
          size="small"
          block
          @click="openCreateAggregateGroupModal"
        >
          <template #icon>
            <n-icon :component="LinkOutline" />
          </template>
          {{ t("keys.createAggregateGroup") }}
        </n-button>
        <n-button v-else type="success" size="small" block @click="openCreateGroupModal">
          <template #icon>
            <n-icon :component="Add" />
          </template>
          {{ t("keys.createGroup") }}
        </n-button>
      </div>
    </n-card>
    <group-form-modal v-model:show="showGroupModal" @success="handleGroupCreated" />
    <aggregate-group-modal
      v-model:show="showAggregateGroupModal"
      :groups="groups"
      @success="handleGroupCreated"
    />
    <create-sub-group-modal
      v-if="createSubGroupTarget?.id"
      v-model:show="createSubGroupModalShow"
      :aggregate-group="createSubGroupTarget"
      @success="handleSubGroupCreated"
    />
    <parent-aggregate-drawer
      v-model:show="parentDrawerShow"
      :group-id="parentDrawerGroupId"
      @select="handleParentDrawerSelect"
    />
    <copy-aggregate-group-modal
      v-if="copyAggregateTarget?.id"
      v-model:show="copyAggregateModalShow"
      :group="copyAggregateTarget"
      @success="handleCopyAggregateCreated"
    />
  </div>
</template>

<style scoped>
:deep(.n-card__content) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.groups-section::-webkit-scrollbar {
  width: 1px;
  height: 1px;
}

.group-list-container {
  height: 100%;
}

.group-list-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--card-bg-solid);
}

.group-list-card:hover {
  transform: none;
  box-shadow: var(--shadow-lg);
}

.search-section {
  height: 41px;
}

/* Tab 容器：让 tabs 填满剩余空间，tab-pane 内部滚动 */
.group-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.group-tabs :deep(.n-tabs-tab-wrapper) {
  flex: 1;
}

.group-tabs :deep(.n-tabs-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
}

.groups-section {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.empty-container {
  padding: 20px 0;
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 100%;
  overflow-y: auto;
  width: 100%;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-primary);
  background: transparent;
  box-sizing: border-box;
  position: relative;
}

.group-item.dragging {
  opacity: 0.6;
}

.group-item.drop-before::before,
.group-item.drop-after::after {
  content: "";
  position: absolute;
  left: 8px;
  right: 8px;
  height: 3px;
  border-radius: 3px;
  background: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.15);
  pointer-events: none;
}

.group-item.drop-before::before {
  top: -4px;
}

.group-item.drop-after::after {
  bottom: -4px;
}

:root.dark .group-item.drop-before::before,
:root.dark .group-item.drop-after::after {
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3);
}

/* 聚合分组样式 */
.group-item.aggregate {
  border-style: dashed;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(102, 126, 234, 0.05) 100%);
}

:root.dark .group-item.aggregate {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(102, 126, 234, 0.1) 100%);
  border-color: rgba(102, 126, 234, 0.2);
}

.group-item:hover,
.group-item.aggregate:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.group-item.aggregate:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(102, 126, 234, 0.1) 100%);
  border-style: dashed;
}

:root.dark .group-item:hover {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.3);
}

:root.dark .group-item.aggregate:hover {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(102, 126, 234, 0.15) 100%);
  border-color: rgba(102, 126, 234, 0.4);
}

.group-item.aggregate.active {
  background: var(--primary-gradient);
  border-style: solid;
}

.group-item.active,
:root.dark .group-item.active,
:root.dark .group-item.aggregate.active {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
  box-shadow: var(--shadow-md);
  border-style: solid;
}

.group-icon {
  font-size: 16px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 6px;
  flex-shrink: 0;
  box-sizing: border-box;
  cursor: grab;
  user-select: none;
}

.group-item.active .group-icon {
  background: rgba(255, 255, 255, 0.2);
}

.group-item.dragging .group-icon {
  cursor: grabbing;
}

.group-icon.drag-disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.group-content {
  flex: 1;
  min-width: 0;
}

.group-name {
  font-weight: 600;
  font-size: 14px;
  line-height: 1.2;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  flex-wrap: wrap;
}

.group-id {
  opacity: 0.8;
  color: var(--text-secondary);
}

.group-item.active .group-id {
  opacity: 0.9;
  color: white;
}

.add-sub-group-btn {
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.group-item:hover .add-sub-group-btn {
  opacity: 1;
}

.group-item.active .add-sub-group-btn :deep(.n-icon) {
  color: white;
}

/* 父聚合分组引用徽章 */
.parent-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #2080f0;
  background: #e6f4ff;
  border: 1px solid rgba(32, 128, 240, 0.3);
  border-radius: 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    border-color 0.15s;
  font-family: inherit;
}

.parent-count-badge:hover {
  background: #2080f0;
  color: #fff;
  border-color: #2080f0;
}

.parent-count-badge.is-many {
  color: #f0a020;
  background: #fff7e6;
  border-color: rgba(240, 160, 32, 0.4);
}

.parent-count-badge.is-many:hover {
  background: #f0a020;
  color: #fff;
  border-color: #f0a020;
}

:root.dark .parent-count-badge {
  color: #4098fc;
  background: rgba(64, 152, 252, 0.12);
  border-color: rgba(64, 152, 252, 0.35);
}

:root.dark .parent-count-badge.is-many {
  color: #ffb02e;
  background: rgba(240, 160, 32, 0.12);
  border-color: rgba(240, 160, 32, 0.4);
}

.badge-text {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.add-section {
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
  padding-top: 12px;
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 滚动条样式 */
.groups-list::-webkit-scrollbar {
  width: 4px;
}

.groups-list::-webkit-scrollbar-track {
  background: transparent;
}

.groups-list::-webkit-scrollbar-thumb {
  background: var(--scrollbar-bg);
  border-radius: 2px;
}

.groups-list::-webkit-scrollbar-thumb:hover {
  background: var(--border-color);
}

/* 暗黑模式特殊样式 */
:root.dark .group-item {
  border-color: rgba(255, 255, 255, 0.05);
}

:root.dark .group-icon {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:root.dark .search-section :deep(.n-input) {
  --n-border: 1px solid rgba(255, 255, 255, 0.08);
  --n-border-hover: 1px solid rgba(102, 126, 234, 0.4);
  --n-border-focus: 1px solid var(--primary-color);
  background: rgba(255, 255, 255, 0.03);
}

/* 标签样式优化 */
:root.dark .group-meta :deep(.n-tag) {
  background: rgba(102, 126, 234, 0.15);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

:root.dark .group-item.active .group-meta :deep(.n-tag) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}
</style>
