<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NInput, NSpace, NText, useMessage } from "naive-ui";
import FormModal from "@/components/common/FormModal.vue";

interface Props {
  show: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  expectedValue?: string;
  expectedHint?: string;
  loading?: boolean;
  positiveText?: string;
  negativeText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  expectedValue: "",
  positiveText: "确认",
  negativeText: "取消",
});

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm"): void;
}>();

const inputValue = ref("");
const message = useMessage();

watch(
  () => props.show,
  v => {
    if (v) {
      inputValue.value = "";
    }
  }
);

const canConfirm = computed(() => {
  if (!props.expectedValue) {
    return true;
  }
  return inputValue.value === props.expectedValue;
});

function handleConfirm() {
  if (!canConfirm.value) {
    message.error(props.expectedHint || `请输入 "${props.expectedValue}" 以确认`);
    return;
  }
  emit("confirm");
}

function handleClose() {
  emit("update:show", false);
}
</script>

<template>
  <form-modal
    :show="show"
    :title="title"
    :positive-text="positiveText"
    :negative-text="negativeText"
    :positive-disabled="!canConfirm"
    :positive-loading="loading"
    :close-on-positive="false"
    @update:show="handleClose"
    @positive="handleConfirm"
    @negative="handleClose"
    width="480"
  >
    <n-space vertical :size="16">
      <n-text v-if="description" depth="2">{{ description }}</n-text>
      <div v-if="expectedValue">
        <n-input
          v-model:value="inputValue"
          :placeholder="expectedHint || `请输入 ${expectedValue} 以确认`"
        />
      </div>
      <slot />
    </n-space>
  </form-modal>
</template>
