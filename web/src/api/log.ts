import { buildAuthQuery, downloadViaAnchor } from "@/utils/download";
import type { ApiResponse, Group, LogFilter, LogsResponse } from "@/types/models";
import http from "@/utils/http";

export const logApi = {
  // 获取日志列表
  getLogs: (params: LogFilter): Promise<ApiResponse<LogsResponse>> => {
    return http.get("/logs", { params });
  },

  // 获取分组列表（用于筛选）
  getGroups: (): Promise<ApiResponse<Group[]>> => {
    return http.get("/groups");
  },

  // 导出日志
  exportLogs: (params: Omit<LogFilter, "page" | "page_size">) => {
    const url = buildAuthQuery(
      params as Record<string, string | number | undefined | null>,
      `${http.defaults.baseURL}/logs/export`
    );
    downloadViaAnchor(url, `logs-${Date.now()}.csv`);
  },
};
