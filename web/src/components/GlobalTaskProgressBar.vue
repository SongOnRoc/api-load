<script setup lang="ts">
import { useLoadingStore } from "@/stores/loading";
import { actualTheme } from "@/utils/theme";
import { getLocale } from "@/locales";
import {
  darkTheme,
  NConfigProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NMessageProvider,
  useLoadingBar,
  useMessage,
  type GlobalTheme,
  type GlobalThemeOverrides,
  zhCN,
  enUS,
  jaJP,
  dateZhCN,
  dateEnUS,
  dateJaJP,
} from "naive-ui";
import { computed, defineComponent, watch } from "vue";

// Emerald 主题色
const PRIMARY = "#10b981";
const PRIMARY_HOVER = "#059669";
const PRIMARY_PRESSED = "#047857";
const PRIMARY_SUPPL = "#34d399";

// 自定义主题配置 - 根据主题动态调整
const themeOverrides = computed<GlobalThemeOverrides>(() => {
  const baseOverrides: GlobalThemeOverrides = {
    common: {
      primaryColor: PRIMARY,
      primaryColorHover: PRIMARY_HOVER,
      primaryColorPressed: PRIMARY_PRESSED,
      primaryColorSuppl: PRIMARY_SUPPL,
      borderRadius: "8px",
      borderRadiusSmall: "6px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    Card: {
      paddingMedium: "20px",
      paddingSmall: "16px",
    },
    Button: {
      fontWeight: "600",
      heightMedium: "36px",
      heightLarge: "44px",
      borderRadius: "8px",
      borderRadiusLarge: "10px",
    },
    Input: {
      heightMedium: "36px",
      heightLarge: "44px",
      borderRadius: "8px",
    },
    Menu: {
      itemHeight: "38px",
      borderRadius: "8px",
    },
    Tag: {
      borderRadius: "6px",
    },
    DataTable: {
      borderRadius: "10px",
      fontSizeMedium: "14px",
    },
    LoadingBar: {
      colorLoading: PRIMARY,
      colorError: "#ef4444",
      height: "2px",
    },
  };

  // 浅色模式额外覆盖
  if (actualTheme.value === "light") {
    return {
      ...baseOverrides,
      common: {
        ...baseOverrides.common,
        bodyColor: "#fafbfc",
        cardColor: "#ffffff",
        modalColor: "#ffffff",
        popoverColor: "#ffffff",
        tableColor: "#ffffff",
        inputColor: "#ffffff",
        actionColor: "#fafbfc",
        tableHeaderColor: "#fafbfc",
        textColorBase: "#111827",
        textColor1: "#111827",
        textColor2: "#4b5563",
        textColor3: "#9ca3af",
        borderColor: "#e5e7eb",
        dividerColor: "#f3f4f6",
        hoverColor: "rgba(16, 185, 129, 0.06)",
      },
      Card: {
        ...baseOverrides.Card,
        color: "#ffffff",
        textColor: "#111827",
        borderColor: "#e5e7eb",
      },
      Input: {
        ...baseOverrides.Input,
        color: "#ffffff",
        textColor: "#111827",
        colorFocus: "#ffffff",
        borderHover: PRIMARY,
        borderFocus: PRIMARY,
        placeholderColor: "#9ca3af",
      },
      DataTable: {
        ...baseOverrides.DataTable,
        tdColor: "#ffffff",
        thColor: "#fafbfc",
        thTextColor: "#4b5563",
        tdTextColor: "#111827",
        borderColor: "#e5e7eb",
      },
    };
  }

  // 暗黑模式覆盖
  return {
    ...baseOverrides,
    common: {
      ...baseOverrides.common,
      bodyColor: "#0f1115",
      cardColor: "#1a1d23",
      modalColor: "#1a1d23",
      popoverColor: "#1a1d23",
      tableColor: "#1a1d23",
      inputColor: "#15181d",
      actionColor: "#15181d",
      tableHeaderColor: "#15181d",
      textColorBase: "#f3f4f6",
      textColor1: "#f3f4f6",
      textColor2: "#b4b8bf",
      textColor3: "#6b7280",
      borderColor: "#2a2e36",
      dividerColor: "#1f232a",
      hoverColor: "rgba(16, 185, 129, 0.1)",
    },
    Card: {
      ...baseOverrides.Card,
      color: "#1a1d23",
      textColor: "#f3f4f6",
      borderColor: "#2a2e36",
    },
    Input: {
      ...baseOverrides.Input,
      color: "#15181d",
      textColor: "#f3f4f6",
      colorFocus: "#15181d",
      borderHover: PRIMARY,
      borderFocus: PRIMARY,
      placeholderColor: "#6b7280",
    },
    Select: {
      peers: {
        InternalSelection: {
          textColor: "#f3f4f6",
          color: "#15181d",
          placeholderColor: "#6b7280",
        },
      },
    },
    DataTable: {
      ...baseOverrides.DataTable,
      tdColor: "#1a1d23",
      thColor: "#15181d",
      thTextColor: "#b4b8bf",
      tdTextColor: "#f3f4f6",
      borderColor: "#2a2e36",
    },
    Tag: {
      textColor: "#f3f4f6",
    },
    Pagination: {
      itemTextColor: "#b4b8bf",
      itemTextColorActive: PRIMARY,
      itemColor: "#15181d",
      itemColorActive: "rgba(16, 185, 129, 0.12)",
    },
    DatePicker: {
      itemTextColor: "#f3f4f6",
      itemColorActive: "#15181d",
      panelColor: "#1a1d23",
    },
    Message: {
      color: "#1c1f26",
      textColor: "#f3f4f6",
      iconColor: PRIMARY,
      borderRadius: "8px",
    },
    Notification: {
      color: "#1c1f26",
      textColor: "#f3f4f6",
      titleTextColor: "#f3f4f6",
      descriptionTextColor: "#b4b8bf",
      borderRadius: "10px",
    },
  };
});

// 根据当前主题动态返回主题对象
const theme = computed<GlobalTheme | undefined>(() => {
  return actualTheme.value === "dark" ? darkTheme : undefined;
});

// 根据当前语言返回对应的 locale 配置
const locale = computed(() => {
  const currentLocale = getLocale();
  switch (currentLocale) {
    case "zh-CN":
      return zhCN;
    case "en-US":
      return enUS;
    case "ja-JP":
      return jaJP;
    default:
      return zhCN;
  }
});

// 根据当前语言返回对应的日期 locale 配置
const dateLocale = computed(() => {
  const currentLocale = getLocale();
  switch (currentLocale) {
    case "zh-CN":
      return dateZhCN;
    case "en-US":
      return dateEnUS;
    case "ja-JP":
      return dateJaJP;
    default:
      return dateZhCN;
  }
});

function useGlobalMessage() {
  window.$message = useMessage();
}

const LoadingBar = defineComponent({
  setup() {
    const loadingBar = useLoadingBar();
    const loadingStore = useLoadingStore();
    watch(
      () => loadingStore.loading,
      loading => {
        if (loading) {
          loadingBar.start();
        } else {
          loadingBar.finish();
        }
      }
    );
    return () => null;
  },
});

const Message = defineComponent({
  setup() {
    useGlobalMessage();
    return () => null;
  },
});
</script>

<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="locale"
    :date-locale="dateLocale"
  >
    <n-loading-bar-provider>
      <n-message-provider placement="top-right">
        <n-dialog-provider>
          <slot />
          <loading-bar />
          <message />
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
