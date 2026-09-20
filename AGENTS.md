# RuoYi AI 项目代理约定

## 1. 仓库角色

本仓库是 RuoYi AI 助手项目的前端仓库：`ShanySky/RuoYi-Vue3`。

配套后端仓库是 `ShanySky/RuoYi-Vue`。跨前后端的 AI 总体架构、项目级设计决策、阶段状态和项目级协作规则以后端仓库为 canonical source；本仓库只维护前端入口、前端实现事实和必要的本地规则 mirror。

项目长期产品目标分三层：

1. AI 理解真实业务并帮助人类用户完成业务。
2. 虚拟员工在授权范围内自主承担业务。
3. 在成熟治理机制下形成受控、可审计的持续自我改进能力。

每个阶段只做当前真实需要的能力，不为了框架形式提前建设无需求的平台。

## 2. 开始工作前

每次实际工作前先确认 GitHub 当前状态，不依赖历史会话或静态快照：

- 目标分支和最新前端代码。
- `chatgpt/ai-agent-assistant` 与 `master` 的当前关系。
- `package.json`、Vite 配置、AI API、`src/ai`、相关页面和测试的当前实现。
- 跨前后端任务对应的后端分支 / SHA。

分支基本职责：

- `master`：RuoYi Vue3 干净基线。
- `chatgpt/ai-agent-assistant`：已经成熟、验收后的稳定 AI 开发主线。
- 架构讨论、专项实现、迁移或高风险改造：默认从最新 AI 主线创建独立工作分支。

涉及 Git 历史、分支、合并、Squash、Rebase 时继续读取：

- `.agents/rules/git-workflow.md`

该文件是项目级规则的本地 mirror；canonical source 位于后端同路径。

## 3. 前端核心原则

- 从真实产品诉求出发，不为技术形式增加复杂度。
- 项目交流、方案、计划、验收记录和面向用户的说明默认使用中文。必须使用英文专业术语时，先写中文，再在括号中补充英文，例如“服务提供方（Provider）”；代码标识、文件路径、类名、接口名、命令和无法合理翻译的专有名称可保持原样，避免为了形式强行翻译。
- 已确认架构结论不要无故推翻；真实矛盾出现时明确提出并重新讨论。
- Page Capability 不是浏览器自动化；不要用 DOM Selector、坐标、任意 JavaScript 注入或函数猜测替代明确业务契约。
- 页面操作继续复用真实页面 handler、RuoYi API、权限和后端校验。
- 页面、字段、按钮、权限和 Action 等业务事实尽量保持单一来源；AI 只补充风险、描述、确认要求等 AI 专属语义。
- 新页面能力优先通过明确、受控、可审计的注册机制实现。
- 前后端联动改动必须检查 `ShanySky/RuoYi-Vue` 的协议、权限和当前实现。
- UI / Agent 交互不能只以 `npm build` 成功作为完成依据；能自动验证的尽量实际运行。
- 不提交真实 AI Token、密码、密钥或其他敏感凭据。
- 规则和文档服务开发，不为了形式完整持续堆积上下文。

## 4. 默认 Reading Order

不要默认读取所有项目资料。根据任务按以下顺序：

1. **当前事实**：目标分支、相关前端代码、配置、测试。
2. **本文件**：确认前端边界和任务路由。
3. **本仓任务相关 Rule**：只读当前需要的规则。
4. **需要跨仓库 / 架构依据时**：到后端 canonical source 读取相关 Rule / Skill / `doc/ai`。
5. **实施事实**：回到前后端真实代码和运行结果完成判断。

## 5. 任务路由

### Git / 分支 / 合并 / 历史整理

读取本仓：

- `.agents/rules/git-workflow.md`

如果需要修改项目级 Git 规则本身，改后端 canonical source，再同步本仓 mirror；不要让两份规则独立演进。

### 普通前端修改

优先直接读取：

- `src/components/AiAssistant`
- `src/store/modules/ai.js`
- `src/ai`
- `src/api/ai`
- 当前涉及的业务页面 / 组件
- `tests/ai-agent-e2e.mjs`

只有触及长期架构边界时才加载后端总体设计或阶段文档。

### Page Capability / Tool Registry

检查：

- `src/ai` 的统一能力 / Registry 实现。
- 当前业务页面真实 handler 和字段定义。
- 后端 Capability / Tool Policy 的当前契约。

不要为了 AI 再维护第二套页面业务事实。

### AI 总体架构 / Phase 3.5 / 跨仓库设计

读取后端目标工作分支的：

- `AGENTS.md`
- `doc/ai/00-全局设计/00-AI助手总体设计.md`
- `doc/ai/00-全局设计/02-AI助手关键设计决策.md`
- `doc/ai/04-架构复盘与演进/14-AI助手三阶段架构复盘与后续优化建议.md`

以这些 canonical 文档的当前状态为准，不在前端 `AGENTS.md` 中写死某个架构议题当前是“待讨论”还是“已完成”。

前端不复制这些项目级设计文档。

### 编写“推进目标”

项目级 canonical Rule 位于后端：

- `.agents/rules/progress-goal.md`

如果当前环境只能读取本前端仓库，至少遵守本原则：推进目标只写目标、用户核心诉求、工作依据、阶段关系、关键边界和完成标准，不把已有方案重新抄成第二份方案。

### 全栈 / Agent / Tool Loop 验收

项目级 canonical Skill 位于后端：

- `.agents/skills/fullstack-validation/SKILL.md`

跨仓库验收必须记录实际使用的前后端 branch / SHA。不要因为后端 workflow 变绿就默认当前前端工作分支也被测试；先检查 workflow 实际 checkout 的 frontend ref。

前端独立改动按范围至少考虑：

```bash
npm install
npm run build:prod
```

涉及 UI / 交互 / API 时继续实际启动 Vite 和联调，而不是停在 build。

## 6. 当前前端主干

当前 AI 前端主要包括：

- `src/components/AiAssistant`：应用级 AI Assistant Shell。
- 全局 AI Store、模型选择、历史会话和用户偏好。
- `src/ai`：Page Capability、Tool Registry 和页面语义能力。
- `src/api/ai`：与后端 AI 模块的接口。
- 当前页面受控操作、跨页面导航、Tool Result 和 WRITE 确认。

仓库真实代码始终优先于历史文档快照；如果实现与已确认架构冲突，应明确指出并处理。

## 7. 新增 Rule / Skill 的门槛

只有稳定、重复的真实前端开发场景才新增本仓 Rule / Skill。

项目级规则 / Skill 优先维护在后端 canonical source；只有“单独打开前端仓库也必须可执行”的内容才保留必要 mirror 或本地摘要。

不要为了目录对称复制项目级资料。
