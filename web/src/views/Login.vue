<script setup lang="ts">
import AppFooter from "@/components/AppFooter.vue";
import LanguageSelector from "@/components/LanguageSelector.vue";
import { useAuthService } from "@/services/auth";
import { LockClosedSharp } from "@vicons/ionicons5";
import { NButton, NCard, NInput, NSpace, NIcon, useMessage } from "naive-ui";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";

const authKey = ref("");
const loading = ref(false);
const router = useRouter();
const message = useMessage();
const { login } = useAuthService();
const { t } = useI18n();

const handleLogin = async () => {
  if (!authKey.value) {
    message.error(t("login.authKeyRequired"));
    return;
  }
  loading.value = true;
  const success = await login(authKey.value);
  loading.value = false;
  if (success) {
    router.push("/");
  }
};
</script>

<template>
  <div class="login-container">
    <!-- 语言切换器 -->
    <div class="language-selector-wrapper">
      <language-selector />
    </div>

    <div class="login-content">
      <div class="login-header">
        <div class="login-logo">
          <img src="@/assets/logo.png" alt="GPT Load" />
        </div>
        <h1 class="login-title">{{ t("login.title") }}</h1>
        <p class="login-subtitle">{{ t("login.subtitle") }}</p>
      </div>

      <n-card class="login-card" :bordered="false">
        <div class="card-header">
          <h2 class="card-title">{{ t("login.welcome") }}</h2>
          <p class="card-subtitle">{{ t("login.welcomeDesc") }}</p>
        </div>

        <n-space vertical size="large">
          <n-input
            v-model:value="authKey"
            type="password"
            size="large"
            :placeholder="t('login.authKeyPlaceholder')"
            class="modern-input"
            @keyup.enter="handleLogin"
          >
            <template #prefix>
              <n-icon :component="LockClosedSharp" />
            </template>
          </n-input>

          <n-button
            class="login-btn"
            type="primary"
            size="large"
            block
            @click="handleLogin"
            :loading="loading"
            :disabled="loading"
          >
            <template v-if="!loading">
              <span>{{ t("login.loginButton") }}</span>
            </template>
          </n-button>
        </n-space>
      </n-card>
    </div>
  </div>
  <app-footer />
</template>

<style scoped>
.language-selector-wrapper {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.login-container {
  min-height: calc(100vh - 52px);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 24px;
}

.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  animation: fadeInUp 0.4s var(--ease-out) both;
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
}

.login-logo img {
  width: 100%;
  height: 100%;
}

.login-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

.login-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary);
  margin: 0;
  font-weight: 400;
}

.login-card {
  border-radius: var(--border-radius-lg);
}

.card-header {
  text-align: center;
  margin-bottom: 20px;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0;
}

.login-btn {
  height: 44px;
  font-size: 0.95rem;
  font-weight: 600;
}

:deep(.n-input) {
  --n-border-radius: 8px;
  --n-height: 44px;
}

:deep(.n-input__input-el) {
  font-size: 0.95rem;
}

:deep(.n-input__prefix) {
  color: var(--text-tertiary);
}

:deep(.n-card__content) {
  padding-top: 0;
}
</style>
