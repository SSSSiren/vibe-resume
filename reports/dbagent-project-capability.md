# DBAgent 项目能力清单

## 审计范围

本报告基于对 `../DB-Agent` 的非破坏性阅读整理，未修改项目代码。重点阅读材料包括：

- `01-Origin-DBAgent/README.md`
- `02-SDK-DBAgent/README.md`
- `03-Infra-DB-Agent/DBAgent/README.md`
- `03-Infra-DB-Agent/DBAgent/docs/hdc-datavault.md`
- `04-deepagents-DBAgent/README.md`
- `04-deepagents-DBAgent/docs/api-guide.md`
- `04-deepagents-DBAgent/docs/admin-api-guide.md`
- `04-deepagents-DBAgent/docs/delivery-checklist.md`
- `04-deepagents-DBAgent/acceptance-output/acceptance-summary.md`
- `evaluation/04-deepagents-DBAgent/baseline_vs_fullstack_20260817_133513.md`
- `DBAgent-Text2Sql实践-发布版.md`
- `DBAgent-Text2Sql实践-博客配图版.md`
- `artifacts/` 下四阶段演进图、HDC 链路图、阶段 03 到 04 演进图、前端截图、Admin 截图

备注：未发现 `../DB-Agent/README.md` 根目录 README，项目说明主要分散在四个阶段目录及发布版/博客版文档中。

## 1. 项目背景和目标

DBAgent 是面向 OneDBA 真实业务数据库平台的 NL2SQL / Text2SQL Agent 项目。它要解决的问题不是“让模型生成一条 SQL”这么窄，而是让用户在不熟悉业务库表结构、字段含义、枚举口径的情况下，用自然语言完成数据库探索和只读查询。

项目目标可以概括为：

- 将自然语言问题转化为可执行 SQL，并在 OneDBA 上完成只读查询。
- 支持找库、找表、查 schema、生成 SQL、校验 SQL、失败修复、执行查询、返回结果的端到端链路。
- 通过会话上下文、HDC 数据底座和 SQL Memory，减少面对陌生 schema 时的盲搜、错表和重复探索。
- 通过 FastAPI、SSE、WebSocket、Admin API、Docker Compose、验收脚本和评测框架，把原型推进到可演示、可评测、可交付的工程形态。

项目的核心主线是：

```text
原型跑通
-> SDK/MCP 规范化
-> ReAct 可控化 + HDC
-> deepagents 工程化 + SQL Memory + 评测闭环
```

## 2. 四个阶段分别做了什么

### 阶段 01：`01-Origin-DBAgent`

定位：端到端原型验证版。

主要工作：

- 使用 LangGraph + FastAPI 搭建智能数据库分析助手原型。
- 支持数据库探索、自然语言转 SQL、多步骤查询分析、SSE 流式输出和 WebSocket 双向通信。
- 建立 NL2SQL 查询路径：定位数据库、解析表名、获取真实表结构、基于 schema 生成 SQL、校验后执行。
- 建立基本 SQL 安全策略：`SELECT` / `SHOW` / `DESCRIBE` 自动执行，写操作需要确认，DDL 操作拒绝并提示走 OneDBA 工单。
- 前端支持会话 ID、新建会话、快捷问题、工具步骤展示、生成 SQL 展示和写操作确认。

阶段价值：

- 证明“自然语言输入 -> Agent 调工具 -> SQL 生成/校验/执行 -> 流式返回”这条链路可行。
- 初步沉淀 `app/api/`、`app/tools/`、`app/nl2sql/` 等模块边界。

阶段问题：

- 运行时 schema 探查较多。
- 工具契约、事件契约、上下文管理和评测体系仍偏原型。
- 传统 Spider/BIRD 类评测不足以评价完整 Agent 查询任务。

### 阶段 02：`02-SDK-DBAgent`

定位：SDK/MCP 规范版。

主要工作：

- 基于 `claude-agent-sdk` 构建 NL2SQL 智能数据库助手。
- 将数据库工具注册为进程内 MCP Server，用 SDK 管理 Agent 生命周期、消息循环和工具调用。
- 保留 FastAPI + SSE 对话接口、OneDBA 工具集、NL2SQL 生成/验证/修复管道。
- 引入更清晰的项目结构：`agent`、`tools`、`nl2sql`、`client`、`api`、`memory`、`observation`。
- 接入 Langfuse 可观测性。

阶段价值：

- 工具 schema 和调用边界更规范。
- Agent runner 将 SDK 消息转成内部 SSE 事件，前端和评测可以沿用统一事件格式。
- 评测从临时脚本逐步走向可重复运行。

阶段问题：

- 服务化、多用户并发后，SDK 封装导致资源释放、运行状态、取消控制、异常处理不够可控。
- 接入 OpenAI 兼容 API / DeepSeek 等模型时有额外适配成本。
- 文档和复盘中记录了 SDK 路线存在运行时黑盒、产品体系绑定、版本兼容和并发内存增长等风险。

### 阶段 03：`03-Infra-DB-Agent/DBAgent`

定位：ReAct 可控工程版 + HDC 数据底座。

主要工作：

- 从 SDK 主引擎切回 OpenAI 兼容 API + 手写 ReAct 循环。
- 将 LLM 调用、工具执行、SSE 事件、取消控制、token/timing/tool count 统计重新放回业务代码可控范围。
- 引入 HDC（Hierarchical Data Context）数据底座，前置 schema 语义理解。
- HDC 离线链路：OneDBA schema 采集 -> 列级语义生成 -> 表级描述 -> 关系/库级摘要 -> 写入 OpenViking 可检索知识存储。
- HDC 在线链路：按用户问题召回库/表/列语义上下文 -> 注入 Agent 上下文 -> 辅助后续找表、查结构和 NL2SQL。
- 引入 OpenViking 长期记忆和 HDC 存储集成。
- 补充 HDC 相关单元测试、集成测试和评测框架。

阶段价值：

- 解决 SDK 黑盒导致的运行时可控性问题。
- 将真实 Text2SQL 的核心难点从“SQL 语法”推进到“schema 语义和业务口径”。
- HDC 通过离线语义沉淀减少在线 `find_table -> describe_table` 盲搜。

阶段问题：

- 手写 ReAct 循环、事件翻译、工具推进、异常分支、观测埋点和取消控制维护成本上升。
- HDC 的上下文准备和检索会带来额外 TTFB 成本。
- HDC 在当前工程实现中对关系级数据做过裁剪，这应被解释为当前场景下的成本收益取舍，而不是通用结论。

### 阶段 04：`04-deepagents-DBAgent`

定位：deepagents 工程化交付版。

主要工作：

- 使用 deepagents / LangGraph 接管通用 Agent 循环、消息状态、工具调度和基础流式能力。
- 保留 DBAgent 业务侧边界：工具适配、事件适配、上下文构建、NL2SQL 管道、HDC、SQL Memory、安全校验和评测契约。
- 引入 Tool Adapter，将内部 `ToolRegistry` 工具适配给 deepagents / LangChain。
- 引入 Event Adapter，将框架事件翻译成 DBAgent 既有 SSE / 评测事件契约。
- 引入 SQL Memory：记录成功执行过的问题、SQL、表名、数据库、执行结果摘要和 embedding；新问题按语义相似度召回历史 SQL 模式作为 few-shot 上下文。
- 支持会话存储、查询偏好记忆、SQL Memory 历史 SQL 检索、HDC namespace 注入。
- 提供用户端 REST/SSE/WebSocket/session/HDC API。
- 提供 Admin API：系统概览、HDC namespace 映射、SQL Memory 灌入/查询/清理/重建 embedding、用户数据清理等。
- 提供静态前端页面和 Admin 管理页面。
- 提供 Dockerfile、docker-compose、Gunicorn 配置、部署文档、交付检查清单和验收脚本。

阶段价值：

- 降低手写 Agent 循环维护成本，同时保留业务工具、SQL 安全、HDC、SQL Memory 和评测边界。
- 从实验验证推进到可演示、可评测、可部署、可交付的工程形态。
- 评测报告显示 HDC-SM（HDC + SQL Memory）相对 baseline 在准确率、工具调用、turns、token 和平均延迟上有改善。

阶段问题：

- deepagents 的价值主要在运行层和工程维护，不应表述为它单独提升 SQL 正确性。
- HDC-SM 的收益来自 HDC、SQL Memory、工具边界、上下文构建和评测闭环共同作用，不能只归因于某个单点。
- 评测报告显示 TTFB 上升，说明上下文准备和检索不是免费的。

## 3. 核心技术链路

DBAgent 的核心链路可以概括为：

```text
用户自然语言问题
-> FastAPI 接收请求，恢复 user/session/schema/database 上下文
-> 检索会话记忆、偏好记忆、SQL Memory、HDC 数据底座
-> Context Builder 组装 Agent 输入
-> Agent 通过工具进行数据库发现、找表、查表结构或直接查询
-> NL2SQL 管道生成 SQL
-> validator 做安全校验、字段校验、表名校验、只读约束、LIMIT 约束
-> repair 在失败时尝试修复 SQL
-> OneDBA API 执行只读查询
-> 提取 SQL、结果摘要、工具调用记录和统计信息
-> SSE / WebSocket / JSON 返回步骤、SQL、结果和最终回答
-> 保存会话状态，记录查询偏好和 SQL Memory
```

更细的模块职责：

- API 层：`/api/chat`、`/api/chat/sync`、`/api/ws`、`/api/sessions`、`/api/hdc`、`/api/admin`。
- Agent 层：runner、prompt、上下文构建、取消控制、事件适配、工具适配。
- 工具层：`list_databases`、`find_table`、`describe_table`、`query_database`、`execute_sql` 等。
- NL2SQL 层：SQL 生成、schema 富化、SQL 校验、失败修复。
- 数据底座层：HDC 生成、上传、检索、增量更新。
- 记忆层：会话状态、查询偏好、SQL Memory、Admin 映射。
- 可观测层：Langfuse trace、tool timing、token、TTFB、上下文 token 估算。
- 评测层：测试用例加载、Agent 执行、SQL correctness judge、回答质量 judge、效率评分、对比报告。

## 4. 涉及的 Agent 能力

### Tool Calling

项目不是只调用 LLM 生成文本，而是将数据库能力封装成 Agent 工具：

- 数据库列表查询。
- 表搜索。
- 表结构描述。
- NL2SQL 查询。
- SQL 执行。
- HDC 生成/更新/状态查询。

阶段 02 用 SDK/MCP 规范工具注册；阶段 03 用手写 ReAct 管理工具执行；阶段 04 用 Tool Adapter 将内部工具适配给 deepagents/LangChain。

### Workflow

项目有明确的任务工作流：

- 用户输入解析。
- 会话和数据库上下文恢复。
- 相关记忆与 HDC 检索。
- Agent 选择工具。
- SQL 生成、校验、修复、执行。
- 结果返回和状态持久化。
- 查询偏好和 SQL Memory 记录。

这种 Workflow 贴近真实业务任务，而不是把所有底层 API 直接暴露给模型。

### 上下文管理

最终版本的 Context Builder 会组织多类上下文：

- 对话摘要。
- 最近多轮对话历史。
- 当前选择的数据库。
- OpenViking 长期记忆。
- SQL 参考知识库。
- 查询偏好。
- HDC 数据底座。
- SQL 历史记忆。

项目还对部分上下文做 token 估算和预算控制，避免无节制注入。

### Text2SQL

项目围绕真实数据库查询做了完整 NL2SQL 管道：

- 基于用户问题和 schema 生成 SQL。
- 从 OneDBA 获取真实 schema。
- 对字段、表名、SQL 类型做校验。
- 对失败 SQL 尝试修复。
- 支持只读查询执行和结果摘要返回。

项目文档明确强调，真实 Text2SQL 的难点不只是 SQL 语法，而是 schema linking、字段语义、枚举口径、业务条件和安全执行。

### 数据库交互

数据库交互不是模拟字符串生成，而是面向 OneDBA 平台：

- 通过 OneDBA API 查询数据库列表、表结构和执行 SQL。
- 支持 `schema_id`、`database_name`、`user_id`、`session_id` 等上下文隔离。
- 对只读查询自动执行，对写操作/DDL 进行限制或拒绝。
- 通过 HDC 和 SQL Memory 降低陌生库探索成本。

## 5. 涉及的工程能力

### 后端服务

- FastAPI 服务。
- SSE 流式对话接口。
- 同步 JSON 对话接口。
- WebSocket 对话接口。
- 会话 CRUD API。
- HDC 生成、更新、状态和任务查询 API。
- Admin API。
- 健康检查与 OpenAPI 文档入口。

### Docker 和部署

- 各阶段均包含 Dockerfile 或 docker-compose 支持。
- 最终版本提供 docker-compose 单机部署。
- `DEPLOY.md` 和 `docs/delivery-checklist.md` 覆盖配置、启动、验收、日志、重启、回滚和备份。
- `gunicorn_conf.py` 提供生产运行配置入口。

### 配置管理

- `.env.example` 是标准配置入口。
- 关键配置包括 `LLM_API_KEY`、`ONEDBA_ACCESS_TOKEN`、`ONEDBA_ENV`、`ADMIN_API_TOKEN`、`STORAGE_BACKEND`、`SQL_MEMORY_ENABLED`、`HDC_ENABLED`、`KB_ENABLED`、`LANGFUSE_ENABLED`。
- docker-compose 模式要求关键密钥和环境变量非空，否则容器拒绝启动。
- Admin API token 为空时管理端点返回 503，不暴露管理能力。

### 测试和评测

- 项目包含单元测试、集成测试、SSE/WebSocket/session/API/cancel/SQL memory/HDC/context 等测试。
- HDC 文档记录了 datavault 相关 32 个无外部依赖测试用例。
- 评测框架支持加载测试用例、执行 Agent、SQL correctness judge、回答质量 judge、效率评分、HDC 注入审计、JSON/Markdown 报告生成。
- 最终版本 `acceptance-output/acceptance-summary.md` 显示本地验收 `PASS: 5`、`FAIL: 0`、`SKIP: 8`，跳过项主要依赖运行中服务、外部依赖或评测开关。
- 阶段 04 主对比实验显示 HDC-SM 相对 baseline：
  - 通过率：`26/28 -> 28/28`
  - 平均分：`92.92% -> 97.49%`
  - 平均延迟：`48189ms -> 29103ms`
  - 工具调用：`2.6 -> 1.0`
  - Turns：`3.3 -> 2.0`
  - 总 Token：`28289 -> 18363`
  - TTFB：`4568ms -> 6621ms`

### 前端和管理界面

从 artifacts 截图可确认：

- 用户端页面包含左侧用户/数据库/会话选择，中间对话区，右侧快捷问题、运行状态、SQL 展示和复制 SQL 能力。
- 对话截图展示了自然语言查询 `db_alert_history` 总数、返回 SQL 和表结构说明。
- Admin 页面包含概览、用户、HDC 管理、SQL Memory 等 tab。
- Admin 概览展示用户数、会话数、SQL 记忆数、映射数据库数和 HDC namespace 映射。

## 6. 可在简历中安全表达的事实

以下说法有本地材料支撑，适合写入简历：

- 手动实现面向 OneDBA 业务数据库的 Text2SQL Agent，支持自然语言查库、数据库探索、多轮会话和流式响应。
- 设计并实现从用户问题、schema 检索、SQL 生成、SQL 校验、失败修复到 OneDBA 只读执行的 NL2SQL 工程链路。
- 封装数据库工具集，包括数据库发现、表搜索、表结构查询、SQL 生成/执行等能力，并通过 Agent 进行多步调用。
- 支持 FastAPI 后端、SSE 流式输出、WebSocket 对话、同步 JSON API 和会话管理 API。
- 实现 SQL 安全护栏，包括只读约束、DDL 拦截、单语句检查、表名/字段校验和默认 LIMIT 控制。
- 引入 HDC 数据底座，将数据库 schema 离线生成列级、表级、库级语义描述，在线检索后注入 Agent 上下文。
- 实现 SQL Memory，记录历史成功查询的问题、SQL、表名、数据库和执行摘要，通过 embedding 召回相似 SQL 模式辅助新查询。
- 通过 Tool Adapter / Event Adapter 保持 deepagents/LangChain 运行层与既有业务工具、SSE 事件和评测契约解耦。
- 接入 Langfuse 或同类观测链路，记录 LLM 调用、工具调用、token、latency、TTFB 等过程指标。
- 构建自动化评测框架，覆盖 SQL 正确性、表/列引用、过滤条件、结果正确性、SQL 规范、工具调用、turns、token 和延迟。
- 提供 Admin API 和管理界面，用于 HDC namespace 映射、SQL Memory 管理、用户数据清理和系统概览。
- 提供 Docker Compose、本地启动脚本、部署文档、交付检查清单和验收脚本。
- 在 28 条真实业务库评测用例上，HDC-SM 方案相对 baseline 达到平均分 `92.92% -> 97.49%`、平均工具调用 `2.6 -> 1.0`、总 Token `28289 -> 18363` 的对比结果。

推荐项目标题：

```text
DBAgent：面向业务数据库的 Text2SQL Agent 后端系统
```

推荐一句话简介：

```text
面向 OneDBA 业务库手动实现 Text2SQL Agent，打通自然语言问题、Agent 工具调用、schema/HDC 上下文、SQL 生成校验、只读执行、流式响应和评测闭环。
```

## 7. 面试中需要谨慎表达或提前准备解释的部分

### 不要把项目说成模型训练项目

当前材料显示项目主要通过 OpenAI 兼容 API 调用 DeepSeek/LLM，不是训练或微调大模型。可以说“LLM 应用工程”“Agent 工程化”“Text2SQL 管道”，不要说“训练了 Text2SQL 模型”。

### 不要把 deepagents 说成准确率提升的唯一原因

阶段 04 中 deepagents 主要接管通用 Agent 循环、消息状态、工具调度和流式基础能力。准确率、成本和稳定性的改善来自 HDC、SQL Memory、上下文构建、工具边界、SQL 安全和评测闭环共同作用。

### 不要把 HDC-SM 指标单独归因于 HDC 或 SQL Memory

评测报告中的 HDC-SM 是 HDC + SQL Memory 的组合方案。可以解释 HDC 主要改善 schema linking 和表/列选择，SQL Memory 主要复用历史 SQL 查询模式，但不要把总指标提升完全归因给其中一个模块。

### 不要说 SQL Memory 是答案缓存

SQL Memory 记录的是历史成功查询模式，不是直接缓存并复用答案。新问题仍然需要重新生成 SQL、校验并执行。面试中应主动说明这一点，否则容易被追问数据时效性、权限和污染问题。

### 不要说 HDC 替代了实时工具搜索

HDC 是前置语义线索，提供库、表、列的业务描述，帮助减少盲搜。它不替代 `find_table`、`describe_table` 或真实 schema 校验。更稳妥的说法是“HDC 与实时工具互补”。

### 不要过度包装为生产级分布式系统

最终 README 明确写到当前交付形态是 FastAPI 后端 + 静态前端 + docker-compose 单机部署，生产部署可以迁移到 K8s、镜像仓库和统一 Secret 管理。因此简历里可以写“具备交付部署文档和 Docker Compose 部署”，不要写“已完成大规模 K8s 生产化部署”。

### 不要写 Graph RAG / Multi-Agent / A2A 已落地

JD 高频词里有 Graph RAG、Multi-Agent、A2A、MCP 等，但当前 DBAgent 的稳定事实是 Tool Calling、ReAct/deepagents、HDC、SQL Memory、FastAPI、评测和交付。除非面试展示对应代码和文档，否则不要把这些热门词塞进简历。

### 需要准备解释阶段 02 到阶段 03 的取舍

面试官可能会问：“为什么用了 SDK 又切回手写 ReAct？”建议回答：

- SDK/MCP 规范化提高了工具调用和消息循环开发效率。
- 服务化和多用户并发后，资源释放、取消控制、事件输出和异常处理需要更强业务控制权。
- 阶段 03 不是否定 SDK，而是在当时约束下重新拿回运行控制权。
- 阶段 04 又把通用 Agent 循环交给 deepagents，同时保留业务工具、上下文、NL2SQL、安全和评测边界。

### 需要准备解释 TTFB 上升

评测中 HDC-SM 的 TTFB 从 `4568ms` 上升到 `6621ms`。这不是 bug，而是 HDC/SQL Memory 检索和上下文准备带来的固定成本。它换来的是后续工具调用、turns、token 和平均总延迟下降。面试中应主动说明这个 tradeoff。

### 需要准备解释 SQL 规范提升有限

阶段 04 对比中 SQL 规范维度只从 `74.29%` 到 `75.36%`。这说明项目主要改善 schema linking、过滤条件和结果正确性，SQL 风格规范仍需继续通过 validator、prompt、SQL formatter 和规则库优化。

### 需要准备解释评测口径

评测不是公开 benchmark，而是项目内针对 OneDBA 真实业务库设计的用例集。可以说“内部真实业务库评测用例”或“项目评测集”，不要说“在行业公开 benchmark 上 SOTA”。

### 需要准备解释权限和安全边界

项目有 Admin API、用户数据清理、HDC 删除、SQL Memory 管理等能力。面试中需要说明：

- Admin API 通过 Bearer token 控制。
- 未配置 token 时管理端点返回 503。
- 生产环境仍需要更强的访问控制、网络隔离、日志脱敏和权限治理。

## 总结

DBAgent 最适合被定位为“面向真实业务数据库的 AI Agent 应用后端 / Text2SQL 工程化项目”。它的强项不是模型训练，而是围绕数据库 Agent 落地所需的工具调用、上下文工程、SQL 安全、记忆、评测、可观测和交付能力。

简历表达应突出“真实业务场景 + Agent 工具链 + HDC/SQL Memory 上下文增强 + NL2SQL 安全执行 + 自动化评测 + 工程交付”，同时避免把项目包装成大模型训练、通用 Agent 平台、大规模分布式系统或公开 benchmark 领先成果。
