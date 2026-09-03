import type { Group, SubGroupInfo } from "@/types/models";
import http from "@/utils/http";

/**
 * 子分组相关 API
 */
export const subGroupApi = {
  async getSubGroups(aggregateGroupId: number): Promise<SubGroupInfo[]> {
    const res = await http.get(`/groups/${aggregateGroupId}/sub-groups`);
    return res.data || [];
  },

  async addSubGroups(
    aggregateGroupId: number,
    subGroups: { group_id: number; weight: number }[]
  ): Promise<void> {
    await http.post(`/groups/${aggregateGroupId}/sub-groups`, {
      sub_groups: subGroups,
    });
  },

  async updateSubGroupWeight(
    aggregateGroupId: number,
    subGroupId: number,
    weight: number
  ): Promise<void> {
    await http.put(`/groups/${aggregateGroupId}/sub-groups/${subGroupId}/weight`, {
      weight,
    });
  },

  async updateSubGroupEnabled(
    aggregateGroupId: number,
    subGroupId: number,
    enabled: boolean
  ): Promise<void> {
    await http.put(`/groups/${aggregateGroupId}/sub-groups/${subGroupId}/enabled`, {
      enabled,
    });
  },

  async deleteSubGroup(aggregateGroupId: number, subGroupId: number): Promise<void> {
    await http.delete(`/groups/${aggregateGroupId}/sub-groups/${subGroupId}`);
  },

  async createSubGroup(
    aggregateGroupId: number,
    data: {
      name: string;
      display_name: string;
      description: string;
      upstreams: { url: string; weight: number }[];
      sort: number;
      test_model: string;
      validation_endpoint: string;
      param_overrides: Record<string, unknown>;
      model_redirect_rules: Record<string, string>;
      model_redirect_strict: boolean;
      config: Record<string, unknown>;
      header_rules: { key: string; value: string; action: "set" | "remove" }[];
      proxy_keys: string;
      weight: number;
    }
  ): Promise<{ group: Group; weight: number }> {
    const res = await http.post(`/groups/${aggregateGroupId}/sub-groups/create`, data);
    return res.data;
  },
};
