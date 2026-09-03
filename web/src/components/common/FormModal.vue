<script setup lang="ts">
import { Close as CloseIcon } from "@vicons/ionicons5";
import { NButton, NIcon, NModal } from "naive-ui";

interface Props {
  show: boolean;
  title: string;
  loading?: boolean;
  width?: number | string;
  positiveText?: string;
  negativeText?: string;
  positiveDisabled?: boolean;
  positiveLoading?: boolean;
  closeOnPositive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  width: 600,
  positiveDisabled: false,
  positiveLoading: false,
  closeOnPositive: true,
});

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "close"): void;
  (e: "positive"): void;
  (e: "negative"): void;
}>();

function handleClose() {
  emit("update:show", false);
  emit("close");
}

function handlePositive() {
  emit("positive");
  if (props.closeOnPositive && !props.positiveLoading) {
    handleClose();
  }
}

function handleNegative() {
  emit("negative");
  handleClose();
}
</script>

<template>
  <n-modal
    :show="show"
    @update:show="handleClose"
    :mask-closable="false"
    :close-on-esc="true"
    :auto-focus="false"
    preset="card"
    :title="title"
    :style="{ width: typeof width === 'number' ? `${width}px` : width, maxWidth: '92vw' }"
    :bordered="false"
    role="dialog"
    size="huge"
    class="form-modal"
  >
    <template #header-extra>
      <n-button text @click="handleClose" class="form-modal__close">
        <n-icon :component="CloseIcon" :size="20" />
      </n-button>
    </template>

    <div class="form-modal__body" v-loading="loading">
      <slot />
    </div>

    <template #footer v-if="$slots.footer || positiveText || negativeText">
      <slot name="footer">
        <div class="form-modal__footer">
          <n-button v-if="negativeText" @click="handleNegative">
            {{ negativeText }}
          </n-button>
          <n-button
            v-if="positiveText"
            type="primary"
            :loading="positiveLoading"
            :disabled="positiveDisabled"
            @click="handlePositive"
          >
            {{ positiveText }}
          </n-button>
        </div>
      </slot>
    </template>
  </n-modal>
</template>

<style scoped>
.form-modal__close {
  color: var(--text-tertiary);
  transition: var(--transition-base);
}

.form-modal__close:hover {
  color: var(--text-primary);
}

.form-modal__body {
  min-height: 80px;
}

.form-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
