<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NDrawer, NDrawerContent, NInput, NIcon, NSpin, NEmpty, NTag } from "naive-ui";
import { LinkOutline, SearchOutline, ChevronForwardOutline } from "@vicons/ionicons5";
import { useI18n } from "vue-i18n";
import { keysApi } from "@/api/keys";
import type { ParentAggregateGroup } from "@/types/models";

const props = defineProps<{
  show: boolean;
  groupId: number | null;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "select", groupId: number): void;
}>();

const { t } = useI18n();

const loading = ref(false);
const parents = ref<ParentAggregateGroup[]>([]);
const searchText = ref("");

const filteredParents = computed(() => {
  if (!searchText.value.trim()) {
    return parents.value;
  }
  const search = searchText.value.toLowerCase().trim();
  return parents.value.filter(
    p => p.name.toLowerCase().includes(search) || p.display_name?.toLowerCase().includes(search)
  );
});

async function loadParents(groupId: number) {
  loading.value = true;
  try {
    const list = await keysApi.getParentAggregateGroups(groupId);
    parents.value = list || [];
  } catch (error) {
    console.error("Failed to load parent aggregate groups:", error);
    parents.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  () => [props.show, props.groupId],
  ([show, groupId]) => {
    if (show && groupId) {
      parents.value = [];
      searchText.value = "";
      loadParents(groupId as number);
    }
  },
  { immediate: true }
);

function handleClickParent(parent: ParentAggregateGroup) {
  emit("select", parent.group_id);
  emit("update:show", false);
}
</script>

<template>
  <n-drawer
    :show="show"
    @update:show="(v: boolean) => emit('update:show', v)"
    :width="420"
    placement="right"
  >
    <n-drawer-content :title="t('subGroups.parentAggregateDrawerTitle')" closable>
      <div class="pad-header">
        <div class="pad-summary">
          <n-icon :component="LinkOutline" size="18" />
          <span class="pad-summary-text">
            {{ t("subGroups.parentAggregateSummary", { count: filteredParents.length }) }}
          </span>
        </div>
        <n-input
          v-model:value="searchText"
          :placeholder="t('subGroups.searchParentAggregate')"
          clearable
          size="small"
        >
          <template #prefix>
            <n-icon :component="SearchOutline" />
          </template>
        </n-input>
      </div>

      <div class="pad-body">
        <n-spin :show="loading" size="small">
          <div v-if="!loading && filteredParents.length === 0" class="pad-empty">
            <n-empty
              size="small"
              :description="
                searchText
                  ? t('subGroups.noMatchingParentAggregate')
                  : t('subGroups.noParentAggregate')
              "
            />
          </div>
          <div v-else class="pad-list">
            <div
              v-for="parent in filteredParents"
              :key="parent.group_id"
              class="pad-item"
              @click="handleClickParent(parent)"
            >
              <div class="pad-item-main">
                <div class="pad-item-name">
                  {{ parent.display_name || parent.name }}
                </div>
                <div class="pad-item-sub">#{{ parent.name }}</div>
              </div>
              <div class="pad-item-meta">
                <n-tag size="tiny" type="warning" round>
                  {{ t("subGroups.weight") }} {{ parent.weight }}
                </n-tag>
                <n-icon :component="ChevronForwardOutline" size="14" class="pad-item-arrow" />
              </div>
            </div>
          </div>
        </n-spin>
      </div>
    </n-drawer-content>
  </n-drawer>
</template>

<style scoped>
.pad-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.pad-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-secondary);
}

.pad-summary-text {
  font-weight: 500;
}

.pad-body {
  min-height: 200px;
}

.pad-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.pad-empty {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 0;
}

.pad-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.pad-item:hover {
  border-color: #2080f0;
  background: #f0f7ff;
}

:root.dark .pad-item:hover {
  background: rgba(64, 152, 252, 0.08);
}

.pad-item-main {
  flex: 1;
  min-width: 0;
}

.pad-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pad-item-sub {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  margin-top: 2px;
}

.pad-item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.pad-item-arrow {
  color: var(--text-tertiary);
}
</style>
