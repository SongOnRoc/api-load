import { h, ref } from "vue";
import { NInput, useDialog } from "naive-ui";

interface ConfirmInputOptions {
  title: string;
  description?: string;
  expectedValue: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

/**
 * 键入名称确认对话框 composable
 * 用于删除等危险操作前的二次确认
 */
export function useConfirmInputDialog() {
  const dialog = useDialog();
  const confirmInput = ref("");

  function open(options: ConfirmInputOptions) {
    confirmInput.value = "";
    dialog.warning({
      title: options.title,
      content: () =>
        h("div", { style: "display: flex; flex-direction: column; gap: 12px;" }, [
          options.description
            ? h(
                "div",
                { style: "color: var(--text-secondary); font-size: 14px;" },
                options.description
              )
            : null,
          h("div", { style: "font-size: 14px;" }, `请输入 "${options.expectedValue}" 以确认`),
          h(NInput, {
            value: confirmInput.value,
            placeholder: options.placeholder || `请输入 ${options.expectedValue}`,
            onUpdateValue: (v: string) => {
              confirmInput.value = v;
            },
          }),
        ]),
      positiveText: options.confirmText || "确认删除",
      negativeText: options.cancelText || "取消",
      showIcon: false,
      maskClosable: false,
      onPositiveClick: async () => {
        if (confirmInput.value !== options.expectedValue) {
          return false;
        }
        await options.onConfirm();
      },
    });
  }

  return { open };
}
