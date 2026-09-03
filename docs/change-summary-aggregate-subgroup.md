# 分组管理交互优化：聚合分组中直接创建子分组

## 一、需求背景

### 1.1 现有问题

当前项目的分组管理存在以下交互痛点：

1. **操作流程割裂**：创建聚合分组与添加子分组是两个独立步骤，用户必须先在"创建标准分组"中创建好分组，再回到聚合分组的"添加子分组"中将其关联，来回切换繁琐。
2. **分组管理不直观**：无法从聚合分组内部直接"派生"出子分组，缺乏层级化的管理逻辑。
3. **子分组创建入口单一**：只能在子分组表格的"添加子分组"中通过下拉选择已存在的标准分组，当标准分组很多时操作不便。

### 1.2 期望目标

优化分组管理使其更合理、操作更便捷：

- **先有聚合分组，再在其中创建子分组**，符合"先有容器再装内容"的逻辑。
- 提供**多入口**的子分组创建方式，降低操作成本。
- **保留**原有"添加已有标准分组为子分组"的功能，两种方式灵活配合。

---

## 二、改动方案

### 2.1 核心思路

新增一个 **"创建子分组"** 能力：在聚合分组中直接创建一个新的标准分组，并自动将其关联为该聚合分组的子分组，整个过程在后端一次事务完成，前端通过一个统一的弹窗完成所有字段填写。

### 2.2 操作流程对比

**优化前（两步走）**：

```
创建标准分组（填写名称/渠道/上游...）
        ↓
创建聚合分组
        ↓
在聚合分组中"添加子分组" → 下拉选择已有标准分组 → 设置权重
```

**优化后（一步到位，且保留原方式）**：

```
创建聚合分组
        ↓
方式一（新增）：在聚合分组中"创建子分组" → 弹窗填写标准分组所有字段 + 权重 → 一次性完成
方式二（保留）：在聚合分组中"添加子分组" → 下拉选择已有标准分组 → 设置权重
```

### 2.3 后端设计

#### 新增 API

```
POST /api/groups/:id/sub-groups/create
```

- **路径参数** `:id` — 聚合分组 ID
- **请求体** — 标准分组的全部字段 + 子分组权重 `weight`
- **逻辑**：
  1. 校验目标分组存在且为 `aggregate` 类型
  2. 校验权重合法（0–1000）
  3. **强制继承**聚合分组的 `channel_type` 创建标准分组（避免类型不匹配）
  4. 将新分组关联为子分组
  5. 若关联失败，自动删除已创建的分组（回滚清理）
  6. 刷新分组缓存

#### 关键约束

- 子分组的 `channel_type` **必须**与聚合分组一致，前端渠道类型字段设为只读。
- 复用现有的 `CreateGroup` 和 `AddSubGroups` 逻辑，保证校验规则一致。

### 2.4 前端设计

#### 新增组件 `CreateSubGroupModal.vue`

整合了 `GroupFormModal`（标准分组字段）与 `AddSubGroupModal`（权重字段），一个弹窗完成所有配置：

- 基础信息：分组名、显示名、渠道类型（只读继承）、排序、测试模型、测试路径
- **子分组权重**（新增字段）
- 代理密钥、描述
- 上游地址配置
- 高级配置（折叠）：分组配置、自定义请求头、模型重定向规则、参数覆盖

#### 多入口触发

1. **侧边栏聚合分组项**：hover 时显示 `+` 按钮，点击直接弹出创建子分组弹窗。
2. **子分组表格工具栏**：新增绿色"创建子分组"按钮，与原有"添加子分组"并列。

---

## 三、改动范围

本次改动涉及 **12 个修改文件 + 1 个新增文件**，共新增约 255 行代码。

### 3.1 后端（Go）

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `internal/services/group_service.go` | 修改 | 新增 `CreateSubGroupParams`、`CreateSubGroupResult` 结构体与 `CreateSubGroup()` 方法，封装"创建标准分组 + 关联为子分组"的事务逻辑 |
| `internal/handler/group_handler.go` | 修改 | 新增 `CreateSubGroupRequest` 请求体与 `CreateSubGroup()` HTTP handler |
| `internal/router/router.go` | 修改 | 注册路由 `POST /groups/:id/sub-groups/create` |
| `internal/i18n/locales/zh-CN.go` | 修改 | 新增 `success.sub_group_created`（"子分组创建成功"） |
| `internal/i18n/locales/en-US.go` | 修改 | 新增 `success.sub_group_created`（"Sub group created successfully"） |
| `internal/i18n/locales/ja-JP.go` | 修改 | 新增 `success.sub_group_created`（"サブグループが正常に作成されました"） |

### 3.2 前端（Vue 3 + TypeScript）

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `web/src/components/keys/CreateSubGroupModal.vue` | **新增** | 创建子分组弹窗组件，整合标准分组表单与权重配置 |
| `web/src/api/keys.ts` | 修改 | 新增 `createSubGroup()` API 方法，调用 `POST /groups/:id/sub-groups/create` |
| `web/src/components/keys/SubGroupTable.vue` | 修改 | 工具栏新增"创建子分组"按钮（绿色），集成 `CreateSubGroupModal` |
| `web/src/components/keys/GroupList.vue` | 修改 | 聚合分组项 hover 显示 `+` 快捷按钮，集成 `CreateSubGroupModal` |
| `web/src/locales/zh-CN.ts` | 修改 | 新增 `subGroups.createSubGroup`（"创建子分组"） |
| `web/src/locales/en-US.ts` | 修改 | 新增 `subGroups.createSubGroup`（"Create Sub Group"） |
| `web/src/locales/ja-JP.ts` | 修改 | 新增 `subGroups.createSubGroup`（"サブグループを作成"） |

### 3.3 开发配置（VS Code）

> 此部分为附带开发体验优化，非功能需求改动。

| 文件 | 改动类型 | 说明 |
|---|---|---|
| `.vscode/launch.json` | **新增** | 提供 `Backend (Go)`、`Frontend (Vite)`、`Full Stack` 三种调试启动配置 |
| `.vscode/tasks.json` | **新增** | 配合 Full Stack 启动，并行运行前后端任务 |

---

## 四、数据模型

本次改动 **未修改数据库结构**，完全复用现有表：

- `groups` 表 — 标准分组（`group_type = 'standard'`）
- `groups` 表 — 聚合分组（`group_type = 'aggregate'`）
- `group_sub_groups` 关联表 — 聚合分组与子分组的关联（含权重）

无需数据库迁移。

---

## 五、验证情况

### 5.1 编译验证

- ✅ 后端 Go 编译通过（`go build ./internal/...`）
- ✅ 前端 TypeScript 类型检查通过（`vue-tsc -b`）
- ✅ 前端生产构建通过（`vite build`）

### 5.2 运行验证

- ✅ 后端服务可正常启动（`AUTH_KEY` 已在 launch.json 配置默认值）
- ✅ 前端 Vite 开发服务器可正常启动

---

## 六、后续可选优化建议

1. **批量创建子分组**：支持在弹窗中一次填写多个子分组（参考 `AddSubGroupModal` 的多行模式）。
2. **子分组重排序**：在子分组表格中支持拖拽排序。
3. **聚合分组嵌套**：当前聚合分组的子分组只能是标准分组（后端有 `validation.sub_group_cannot_be_aggregate` 校验），如需支持聚合分组嵌套聚合分组，需调整后端校验逻辑。
