import type {
  Group,
  GroupConfigOption,
  GroupStatsResponse,
  ParentAggregateGroup,
} from "@/types/models";
import http from "@/utils/http";

/**
 * 分组相关 API
 */
export const groupApi = {
  async getGroups(): Promise<Group[]> {
    const res = await http.get("/groups");
    return res.data || [];
  },

  async createGroup(group: Partial<Group>): Promise<Group> {
    const res = await http.post("/groups", group);
    return res.data;
  },

  async updateGroup(groupId: number, group: Partial<Group>): Promise<Group> {
    const res = await http.put(`/groups/${groupId}`, group);
    return res.data;
  },

  async reorderGroups(items: { id: number; sort: number }[]): Promise<void> {
    await http.put(
      "/groups/reorder",
      { items },
      {
        hideMessage: true,
      }
    );
  },

  deleteGroup(groupId: number): Promise<void> {
    return http.delete(`/groups/${groupId}`);
  },

  async getGroupStats(groupId: number): Promise<GroupStatsResponse> {
    const res = await http.get(`/groups/${groupId}/stats`);
    return res.data;
  },

  async getGroupConfigOptions(): Promise<GroupConfigOption[]> {
    const res = await http.get("/groups/config-options");
    return res.data || [];
  },

  async copyGroup(
    groupId: number,
    copyData: {
      copy_keys: "none" | "valid_only" | "all";
      name?: string;
      display_name?: string;
      description?: string;
    }
  ): Promise<{ group: Group }> {
    const res = await http.post(`/groups/${groupId}/copy`, copyData, {});
    return res.data;
  },

  async listGroups(): Promise<Pick<Group, "id" | "name" | "display_name">[]> {
    const res = await http.get("/groups/list");
    return res.data || [];
  },

  async getParentAggregateGroups(groupId: number): Promise<ParentAggregateGroup[]> {
    const res = await http.get(`/groups/${groupId}/parent-aggregate-groups`);
    return res.data || [];
  },
};
