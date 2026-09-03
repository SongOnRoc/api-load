import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

interface ChannelDefaults {
  testModel: string;
  upstream: string;
  validationEndpoint: string;
}

/**
 * 渠道类型默认值映射
 * 集中管理所有渠道的默认 test_model / upstream / validation_endpoint
 */
const CHANNEL_DEFAULTS: Record<string, ChannelDefaults> = {
  openai: {
    testModel: "gpt-4.1-nano",
    upstream: "https://api.openai.com",
    validationEndpoint: "/v1/chat/completions",
  },
  "openai-response": {
    testModel: "gpt-4.1-nano",
    upstream: "https://api.openai.com",
    validationEndpoint: "/v1/responses",
  },
  gemini: {
    testModel: "gemini-2.0-flash-lite",
    upstream: "https://generativelanguage.googleapis.com",
    validationEndpoint: "",
  },
  anthropic: {
    testModel: "claude-3-haiku-20240307",
    upstream: "https://api.anthropic.com",
    validationEndpoint: "/v1/messages",
  },
};

const DEFAULT_CHANNEL = "openai";

/**
 * 根据当前 channel_type 计算占位符与默认值的 composable
 *
 * @param channelType 当前表单的 channel_type，需是 Ref
 */
export function useChannelTypeDefaults(channelType: Ref<string>) {
  const { t } = useI18n();

  const currentDefaults = computed<ChannelDefaults>(() => {
    return CHANNEL_DEFAULTS[channelType.value] || CHANNEL_DEFAULTS[DEFAULT_CHANNEL];
  });

  const testModelPlaceholder = computed(() => {
    return currentDefaults.value.testModel || t("keys.enterModelName");
  });

  const upstreamPlaceholder = computed(() => {
    return currentDefaults.value.upstream || t("keys.enterUpstreamUrl");
  });

  const validationEndpointPlaceholder = computed(() => {
    const v = currentDefaults.value.validationEndpoint;
    if (channelType.value === "gemini") {
      return "";
    }
    return v || t("keys.enterValidationPath");
  });

  /**
   * 获取指定渠道的默认 test_model（用于切换渠道时检测旧值是否需要回填）
   */
  function getChannelDefaultTestModel(type: string): string {
    return CHANNEL_DEFAULTS[type]?.testModel || "";
  }

  /**
   * 获取指定渠道的默认 upstream
   */
  function getChannelDefaultUpstream(type: string): string {
    return CHANNEL_DEFAULTS[type]?.upstream || "";
  }

  return {
    testModelPlaceholder,
    upstreamPlaceholder,
    validationEndpointPlaceholder,
    getChannelDefaultTestModel,
    getChannelDefaultUpstream,
  };
}
