<script setup lang="ts">
import { Add as AddIcon, Close as CloseIcon } from "@vicons/ionicons5";
import { NButton, NIcon, NSpace } from "naive-ui";

interface Props {
  modelValue: string[];
  addLabel?: string;
  addPlaceholder?: string;
  min?: number;
  max?: number;
  itemWidth?: string;
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 50,
  itemWidth: "100%",
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
  (e: "change", value: string[]): void;
}>();

function addItem() {
  if (props.modelValue.length >= props.max) {
    return;
  }
  const next = [...props.modelValue, ""];
  emit("update:modelValue", next);
  emit("change", next);
}

function removeItem(index: number) {
  if (props.modelValue.length <= props.min) {
    return;
  }
  const next = props.modelValue.filter((_, i) => i !== index);
  emit("update:modelValue", next);
  emit("change", next);
}

function updateItem(index: number, value: string) {
  const next = [...props.modelValue];
  next[index] = value;
  emit("update:modelValue", next);
  emit("change", next);
}
</script>

<template>
  <div class="dynamic-list-editor">
    <n-space vertical :size="8" class="dynamic-list-editor__list">
      <div v-for="(item, index) in modelValue" :key="index" class="dynamic-list-editor__row">
        <n-input
          :value="item"
          @update:value="(v: string) => updateItem(index, v)"
          :placeholder="addPlaceholder"
          :style="{ width: itemWidth }"
        />
        <n-button
          quaternary
          :disabled="modelValue.length <= min"
          @click="removeItem(index)"
          class="dynamic-list-editor__remove"
        >
          <n-icon :component="CloseIcon" />
        </n-button>
      </div>
    </n-space>
    <n-button
      dashed
      block
      size="small"
      :disabled="modelValue.length >= max"
      @click="addItem"
      class="dynamic-list-editor__add"
    >
      <template #icon>
        <n-icon :component="AddIcon" />
      </template>
      {{ addLabel }}
    </n-button>
  </div>
</template>

<style scoped>
.dynamic-list-editor__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dynamic-list-editor__remove {
  flex-shrink: 0;
  color: var(--text-tertiary);
}

.dynamic-list-editor__remove:hover {
  color: var(--error-color);
}

.dynamic-list-editor__add {
  margin-top: 8px;
}
</style>
