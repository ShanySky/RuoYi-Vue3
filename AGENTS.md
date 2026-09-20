# RuoYi AI 项目代理约定

## 1. 仓库角色

本仓库是 RuoYi AI 助手项目的前端仓库：`ShanySky/RuoYi-Vue3`。

配套后端仓库是 `ShanySky/RuoYi-Vue`。跨前后端的 AI 总体架构、项目级设计决策和阶段文档以后端 `doc/ai/` 为准；本仓库维护前端实现事实和必要的通用开发约束。

项目长期产品目标分三层：

1. AI 理解真实业务并帮助人类用户完成业务。
2. 数字员工在授权范围内自主承担业务。
3. 在成熟治理机制下形成受控、可审计的持续自我改进能力。

每个阶段只做当前真实需要的能力，不为了框架形式提前建设无需求的平台。

## 2. 前端通用原则

- 从真实产品诉求出发，不为技术形式增加复杂度。
- 项目交流、方案、计划、验收记录和面向用户的说明默认使用中文；代码标识、路径、类名、接口名、命令和专有名称可保持英文。
- 已确认架构结论不要无故推翻；真实矛盾出现时明确提出并重新讨论。
- Page Capability 不是浏览器自动化；不要用 DOM Selector、坐标、任意 JavaScript 注入或函数猜测替代明确业务契约。
- 页面操作继续复用真实页面 handler、RuoYi API、权限和后端校验。
- 页面、字段、按钮、权限和 Action 等业务事实尽量保持单一来源；AI 只补充风险、描述、确认要求等 AI 专属语义。
- 新页面能力优先通过明确、受控、可审计的注册机制实现。
- 前后端联动改动应检查后端协议、权限和当前实现。
- UI / Agent 交互不能只以 `npm build` 成功作为完成依据；能自动验证的尽量实际运行。
- 不提交真实 AI Token、密码、密钥或其他敏感凭据。
- 仓库规则和文档服务开发，不为了形式完整持续堆积上下文。

## 3. 分支与资料

分支基本职责：

- `master`：RuoYi Vue3 干净基线。
- `chatgpt/ai-agent-assistant`：已经成熟、验收后的稳定 AI 开发主线。
- 较大的架构讨论、专项实现、迁移或高风险改造：从最新 AI 主线建立独立工作分支。

前端主要实现入口：

- `src/components/AiAssistant`
- `src/store/modules/ai.js`
- `src/ai`
- `src/api/ai`
- 当前涉及的业务页面 / 组件
- `tests/ai-agent-e2e.mjs`

通用 Git 规则见 `.agents/rules/git-workflow.md`。跨仓库长期架构与关键决策见后端 `doc/ai/`。

## 4. 五套运行环境

前端统一使用 `local`、`dev`、`ci`、`test`、`prod` 五套 Vite 模式，并与后端同名 Spring Profile 配套；具体配置和命令以 `package.json` 与对应环境文件为准，GitHub Actions 固定使用 `ci`。

## 5. Page Capability / Tool Registry

新增或修改页面能力时应检查：

- `src/ai` 的统一能力 / Registry 实现。
- 当前业务页面真实 handler 和字段定义。
- 后端 Capability / Tool Policy 的当前契约。

不要为了 AI 再维护第二套页面业务事实。

## 6. 当前前端主干

当前 AI 前端主要包括：

- `src/components/AiAssistant`：应用级 AI Assistant Shell。
- 全局 AI Store、模型选择、历史会话和用户偏好。
- `src/ai`：Page Capability、Tool Registry 和页面语义能力。
- `src/api/ai`：与后端 AI 模块的接口。
- 当前页面受控操作、跨页面导航、Tool Result 和 WRITE 确认。

仓库真实代码始终优先于历史文档快照；如果实现与已确认架构冲突，应明确指出并处理。

## 7. Rule / Skill 的门槛

只有稳定、重复、对本仓开发长期有价值的场景才新增 Rule 或 Skill。

不要为了目录对称复制项目级资料，也不要在仓库里维护特定 AI 产品或特定工具环境的操作路由。
