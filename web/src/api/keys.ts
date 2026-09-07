/**
 * keysApi 聚合导出 - 保持向后兼容
 *
 * 实际实现已按域拆分到：
 * - api/group.ts    分组相关
 * - api/key.ts      密钥相关
 * - api/subgroup.ts 子分组相关
 * - api/task.ts     任务状态
 *
 * 新代码建议直接从对应域文件导入。
 * 此文件保留是为了避免破坏现有消费者。
 */

import { groupApi } from "@/api/group";
import { keyApi } from "@/api/key";
import { subGroupApi } from "@/api/subgroup";
import { taskApi } from "@/api/task";

export const keysApi = {
  // 分组
  getGroups: groupApi.getGroups,
  createGroup: groupApi.createGroup,
  updateGroup: groupApi.updateGroup,
  reorderGroups: groupApi.reorderGroups,
  deleteGroup: groupApi.deleteGroup,
  getGroupStats: groupApi.getGroupStats,
  getGroupConfigOptions: groupApi.getGroupConfigOptions,
  copyGroup: groupApi.copyGroup,
  listGroups: groupApi.listGroups,
  getParentAggregateGroups: groupApi.getParentAggregateGroups,

  // 密钥
  getGroupKeys: keyApi.getGroupKeys,
  addMultipleKeys: keyApi.addMultipleKeys,
  addKeysAsync: keyApi.addKeysAsync,
  updateKeyNotes: keyApi.updateKeyNotes,
  testKeys: keyApi.testKeys,
  deleteKeys: keyApi.deleteKeys,
  deleteKeysAsync: keyApi.deleteKeysAsync,
  restoreKeys: keyApi.restoreKeys,
  restoreAllInvalidKeys: keyApi.restoreAllInvalidKeys,
  clearAllInvalidKeys: keyApi.clearAllInvalidKeys,
  clearAllKeys: keyApi.clearAllKeys,
  exportKeys: keyApi.exportKeys,
  fetchKeysText: keyApi.fetchKeysText,
  validateGroupKeys: keyApi.validateGroupKeys,

  // 子分组
  getSubGroups: subGroupApi.getSubGroups,
  addSubGroups: subGroupApi.addSubGroups,
  updateSubGroupWeight: subGroupApi.updateSubGroupWeight,
  updateSubGroupEnabled: subGroupApi.updateSubGroupEnabled,
  deleteSubGroup: subGroupApi.deleteSubGroup,
  createSubGroup: subGroupApi.createSubGroup,

  // 任务
  getTaskStatus: taskApi.getTaskStatus,
};
