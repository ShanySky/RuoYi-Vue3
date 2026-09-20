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

前端环境与后端同名环境一一对应，不要跨环境混用。环境文件、用途和命令如下：

| 环境 | 配置文件 | 用途 | 启动命令 | 构建命令 |
| --- | --- | --- | --- | --- |
| `local` | `.env.localhost` | 开发者本机联调，默认访问 `http://127.0.0.1:8080` 后端 | `npm run dev:local` | `npm run build:local` |
| `dev` | `.env.dev` | 共享开发环境 | `npm run dev` | `npm run build:dev` |
| `ci` | `.env.ci` | GitHub Actions、自动化测试和临时预览 | `npm run dev:ci` | `npm run build:ci` |
| `test` | `.env.test` | 测试环境 | `npm run dev:test` | `npm run build:test` |
| `prod` | `.env.prod` | 正式环境 | `npm run dev:prod` | `npm run build:prod` |

使用和维护时遵守以下约束：

- `npm run dev` 等价于选择 `dev`，不是本机环境；本机联调应明确执行 `npm run dev:local`，默认前端地址为 `http://127.0.0.1:5173`。
- `.env.localhost` 是本机私有配置并被 `.gitignore` 精确忽略；不要改名为 Vite 会对所有模式额外加载的 `.env.local`，也不要提交本机地址或凭据变化。
- `.env.dev`、`.env.ci`、`.env.test`、`.env.prod` 进入版本控制。部署或流水线需要不同地址时，修改对应环境文件，不要恢复已经移除的 `.env.development`、`.env.staging`、`.env.production`。
- 代理目标、接口前缀、端口和是否自动打开浏览器以对应环境文件中的 `VITE_APP_BACKEND_URL`、`VITE_APP_BASE_API`、`VITE_APP_PORT`、`VITE_APP_OPEN` 为准，不在代码中另写一套环境判断。
- 启动或构建前先确认配套后端使用同名 Spring Profile；GitHub Actions 固定使用 `ci`，本机前后端联调固定使用 `local`。

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
