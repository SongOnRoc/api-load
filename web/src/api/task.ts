import type { TaskInfo } from "@/types/models";
import http from "@/utils/http";

/**
 * 任务状态 API
 */
export const taskApi = {
  async getTaskStatus(): Promise<TaskInfo> {
    const res = await http.get("/tasks/status");
    return res.data;
  },
};
