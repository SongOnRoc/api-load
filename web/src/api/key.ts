import { buildAuthQuery, downloadViaAnchor } from "@/utils/download";
import type { APIKey, KeyStatus, TaskInfo } from "@/types/models";
import http from "@/utils/http";

/**
 * 密钥相关 API
 */
export const keyApi = {
  async getGroupKeys(params: {
    group_id: number;
    page: number;
    page_size: number;
    key_value?: string;
    status?: KeyStatus;
  }): Promise<{
    items: APIKey[];
    pagination: {
      total_items: number;
      total_pages: number;
    };
  }> {
    const res = await http.get("/keys", { params });
    return res.data;
  },

  async addMultipleKeys(
    group_id: number,
    keys_text: string
  ): Promise<{
    added_count: number;
    ignored_count: number;
    total_in_group: number;
  }> {
    const res = await http.post("/keys/add-multiple", {
      group_id,
      keys_text,
    });
    return res.data;
  },

  async addKeysAsync(group_id: number, keys_text?: string, file?: File): Promise<TaskInfo> {
    let requestData: FormData | { group_id: number; keys_text: string };
    const config: { hideMessage: boolean; headers?: { "Content-Type": string } } = {
      hideMessage: true,
    };

    if (file) {
      const formData = new FormData();
      formData.append("group_id", group_id.toString());
      formData.append("file", file);
      requestData = formData;
      config.headers = { "Content-Type": "multipart/form-data" };
    } else {
      requestData = { group_id, keys_text: keys_text || "" };
    }

    const res = await http.post("/keys/add-async", requestData, config);
    return res.data;
  },

  async updateKeyNotes(keyId: number, notes: string): Promise<void> {
    await http.put(`/keys/${keyId}/notes`, { notes }, { hideMessage: true });
  },

  async testKeys(
    group_id: number,
    keys_text: string
  ): Promise<{
    results: {
      key_value: string;
      is_valid: boolean;
      error: string;
    }[];
    total_duration: number;
  }> {
    const res = await http.post(
      "/keys/test-multiple",
      {
        group_id,
        keys_text,
      },
      {
        hideMessage: true,
      }
    );
    return res.data;
  },

  async deleteKeys(
    group_id: number,
    keys_text: string
  ): Promise<{ deleted_count: number; ignored_count: number; total_in_group: number }> {
    const res = await http.post("/keys/delete-multiple", {
      group_id,
      keys_text,
    });
    return res.data;
  },

  async deleteKeysAsync(group_id: number, keys_text: string): Promise<TaskInfo> {
    const res = await http.post(
      "/keys/delete-async",
      {
        group_id,
        keys_text,
      },
      {
        hideMessage: true,
      }
    );
    return res.data;
  },

  restoreKeys(group_id: number, keys_text: string): Promise<null> {
    return http.post("/keys/restore-multiple", {
      group_id,
      keys_text,
    });
  },

  restoreAllInvalidKeys(group_id: number): Promise<void> {
    return http.post("/keys/restore-all-invalid", { group_id });
  },

  clearAllInvalidKeys(group_id: number): Promise<{ data: { message: string } }> {
    return http.post(
      "/keys/clear-all-invalid",
      { group_id },
      {
        hideMessage: true,
      }
    );
  },

  clearAllKeys(group_id: number): Promise<{ data: { message: string } }> {
    return http.post(
      "/keys/clear-all",
      { group_id },
      {
        hideMessage: true,
      }
    );
  },

  exportKeys(groupId: number, status: "all" | "active" | "invalid" = "all"): void {
    const params: Record<string, string> = {
      group_id: groupId.toString(),
    };
    if (status !== "all") {
      params.status = status;
    }
    const url = buildAuthQuery(params, `${http.defaults.baseURL}/keys/export`);
    downloadViaAnchor(url, `keys-group_${groupId}-${status}-${Date.now()}.txt`);
  },

  /**
   * 批量获取密钥文本内容，用于复制到剪贴板。
   * 复用后端的导出接口，仅取文本而不触发文件下载。
   */
  async fetchKeysText(
    groupId: number,
    status: "all" | "active" | "invalid" = "all"
  ): Promise<string> {
    const params: Record<string, string> = {
      group_id: groupId.toString(),
    };
    if (status !== "all") {
      params.status = status;
    }
    const url = buildAuthQuery(params, `${http.defaults.baseURL}/keys/export`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`导出失败: ${res.status}`);
    }
    return res.text();
  },

  async validateGroupKeys(
    groupId: number,
    status?: "active" | "invalid"
  ): Promise<{
    is_running: boolean;
    group_name: string;
    processed: number;
    total: number;
    started_at: string;
  }> {
    const payload: { group_id: number; status?: string } = { group_id: groupId };
    if (status) {
      payload.status = status;
    }
    const res = await http.post("/keys/validate-group", payload);
    return res.data;
  },
};
