<script setup lang="ts">
import { ref, watch } from "vue";
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NTag,
  useMessage,
  type FormInst,
  type FormRules,
} from "naive-ui";
import { useI18n } from "vue-i18n";
import { keysApi } from "@/api/keys";
import type { Group } from "@/types/models";

const props = defineProps<{
  show: boolean;
  group: Group | null;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "success", newGroup: Group): void;
}>();

const { t } = useI18n();
const message = useMessage();

const loading = ref(false);
const formRef = ref<FormInst | null>(null);

const formData = ref({
  name: "",
  display_name: "",
  description: "",
  channel_type: "",
});

const rules: FormRules = {
  name: [
    { required: true, message: t("keys.enterGroupName"), trigger: ["blur", "input"] },
    {
      pattern: /^[a-z0-9_-]{1,100}$/,
      message: t("keys.groupNamePattern"),
      trigger: ["blur", "input"],
    },
  ],
};

watch(
  () => props.group,
  group => {
    if (group) {
      formData.value = {
        name: "",
        display_name: group.display_name || "",
        description: group.description || "",
        channel_type: group.channel_type || "",
      };
    }
  },
  { immediate: true }
);

async function handleSubmit() {
  if (!props.group?.id || loading.value) {
    return;
  }
  try {
    await formRef.value?.validate();
    loading.value = true;
    const res = await keysApi.copyGroup(props.group.id, {
      copy_keys: "none",
      name: formData.value.name || undefined,
      display_name: formData.value.display_name || undefined,
      description: formData.value.description || undefined,
    });
    message.success(t("subGroups.copyGroupSuccess"));
    emit("success", res.group);
    emit("update:show", false);
  } catch (error) {
    // error message shown by http interceptor
    console.error("Failed to copy aggregate group:", error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <n-modal
    :show="show"
    :mask-closable="false"
    preset="card"
    class="copy-aggregate-modal"
    :title="t('subGroups.copyAggregateGroup')"
    :style="{ width: '520px' }"
    @update:show="(v: boolean) => emit('update:show', v)"
  >
    <n-form ref="formRef" :model="formData" :rules="rules">
      <n-form-item :label="t('keys.groupName')" path="name">
        <n-input v-model:value="formData.name" placeholder="glm-copy" />
      </n-form-item>
      <n-form-item :label="t('keys.displayName')" path="display_name">
        <n-input v-model:value="formData.display_name" placeholder="GLM Copy" />
      </n-form-item>
      <n-form-item :label="t('common.description')" path="description">
        <n-input v-model:value="formData.description" type="textarea" :rows="2" placeholder="" />
      </n-form-item>
      <n-form-item :label="t('keys.channelType')">
        <n-tag type="info" size="small" round>{{ formData.channel_type }}</n-tag>
      </n-form-item>
    </n-form>

    <template #footer>
      <div class="modal-actions">
        <n-button @click="emit('update:show', false)" :loading="loading">
          {{ t("common.cancel") }}
        </n-button>
        <n-button type="primary" @click="handleSubmit" :loading="loading">
          {{ t("subGroups.copyGroup") }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
