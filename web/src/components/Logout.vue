<script setup lang="ts">
import { useAuthService } from "@/services/auth";
import { LogOutOutline } from "@vicons/ionicons5";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const router = useRouter();
const { logout } = useAuthService();

const handleLogout = () => {
  logout();
  router.replace("/login");
};
</script>

<template>
  <n-button quaternary round class="logout-button" @click="handleLogout">
    <template #icon>
      <n-icon :component="LogOutOutline" />
    </template>
    {{ t("nav.logout") }}
  </n-button>
</template>

<style scoped>
.logout-button {
  color: var(--text-secondary);
  transition: var(--transition-base);
  font-weight: 500;
}

.logout-button:hover {
  color: var(--error-color);
  background: var(--error-bg);
}

:deep(.n-button__content) {
  gap: 6px;
}
</style>
