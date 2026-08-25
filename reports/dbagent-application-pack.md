# DB-Agent 投递材料总包

面向岗位：AI 应用开发 / Agent 开发 / 大模型应用后端开发

## 1. 简历项目最终版

### 基于deepagents的 Text2SQL Agent

面向内部业务数据库手动实现 Text2SQL Agent，支持自然语言查库、Agent 工具调用、Schema 语义检索、SQL 生成校验和 SSE 流式响应。基于项目内 28 条真实业务库评测用例，通过工具调整、多层 Schema 上下文 + SQL Memory 将通过用例从 `20/28` 提升到 `28/28`，平均延迟降低约 `72.7%`（`106727ms -> 29103ms`），平均工具调用减少约 `82.5%`（`5.7 -> 1.0`），总 Token 使用减少约 `46.9%`（`34603 -> 18363`）。

主要工作：

- 设计数据库查询 Agent 流程，串联 FastAPI 会话恢复、上下文构建、工具调用、NL2SQL、SQL 校验和 SSE 式结果返回。
- 基于 OneDBA API 抽象数据库工具能力，覆盖数据库发现、表搜索、表结构查询、SQL 生成和危险 SQL 拦截。
- 设计列级、表级、库级三层 Schema 语义索引，基于 OpenViking 存储和检索数据库语义上下文，并注入 Agent 推理过程。
- 接入基于 SQLite 的 SQL Memory、查询偏好和会话存储，复用历史成功查询模式并保留多轮查询上下文。
- 补齐 Admin 管理、Docker Compose 部署、Langfuse 观测和评测脚本，支撑服务部署、问题追踪和效果评估。

## 2. 技术栈

Python、FastAPI、deepagents、LangGraph、OpenAI-compatible API、OneDBA API、OpenViking、SQLite、SSE、WebSocket、Docker Compose、Gunicorn、Langfuse、SQL Validator、Text2SQL / NL2SQL、Tool Calling、HDC、SQL Memory。

## 3. 项目亮点

- **真实 Agent 链路**：不是单次调用 LLM 生成 SQL，而是把会话恢复、Schema 召回、Agent 工具决策、SQL 生成校验、只读执行和结果返回串成受控 Workflow。
- **Schema 上下文设计**：用列级、表级、库级三层 Schema 语义索引降低陌生业务库下的找表和字段理解成本，并通过运行时 Schema 工具保证最终 SQL 基于真实结构。
- **查询模式复用**：SQL Memory 记录历史成功问题、SQL、表名、数据库和执行摘要，给相似问题提供 few-shot 查询模式参考，但不缓存答案、不跳过当前执行。
- **工程交付闭环**：补齐 FastAPI/SSE 接口、Admin 管理、Docker Compose 部署、Langfuse 观测和评测脚本，能支持内部部署、问题追踪和迭代评估。
- **安全边界清楚**：SQL 执行前做只读、DDL 拦截、单语句、表字段和 LIMIT 校验，避免把数据库执行安全完全交给 prompt。

## 4. JD 匹配说明

| JD 高频方向 | 项目匹配点 | 投递表达 |
|---|---|---|
| Agent / Tool Calling | deepagents/LangGraph 承接 Agent 循环；OneDBA 能力封装为找库、找表、查结构、查询和执行工具。 | 手动实现数据库查询 Agent 工具链，支持上下文注入、工具调用、SQL 生成校验和流式响应。 |
| AI 应用开发 | 使用 LLM 接入真实业务数据库查询场景，完成自然语言查库端到端链路。 | 构建面向业务数据库的 LLM 应用后端，将模型能力落到可执行工具和数据库结果上。 |
| Text2SQL / NL2SQL | 支持 Schema 获取、SQL 生成、validator 校验、repair 修复和 OneDBA 只读执行。 | 设计 NL2SQL 工程链路，覆盖用户问题到可执行 SQL 再到查询结果返回。 |
| RAG / Context Engineering | HDC 将 Schema 语义存入 OpenViking，在线召回后注入 Agent；SQL Memory 召回历史成功查询模式。 | 通过 Schema 语义检索和 SQL Memory 改善业务库表字段理解和查询模式复用。 |
| 后端服务 | FastAPI 提供 SSE、WebSocket、同步接口、Session、HDC、Admin API。 | 基于 FastAPI 构建 Agent 后端服务，支持流式输出、会话管理和管理端能力。 |
| Docker / 工程化 | Dockerfile、docker-compose、Gunicorn、部署文档、验收脚本。 | 提供 Docker Compose 部署和交付检查，支撑内部部署与验收。 |
| 评测 / 可观测 | Langfuse trace、tool timing、token、延迟、评测报告。 | 建立 Agent 评测和观测闭环，用通过用例、延迟、工具调用、Token 观察迭代效果。 |
| 业务场景抽象 | 围绕陌生业务库找表、字段理解、SQL 安全、空结果和多轮查询抽象任务链路。 | 把真实业务数据库查询拆成找库、找表、理解字段、生成 SQL、安全执行和结果解释的 Agent Workflow。 |

## 5. 1 分钟面试介绍

我这个项目是一个面向内部业务数据库的 Text2SQL Agent。背景是研发、DBA 或数据工具使用者接手陌生业务库时，经常不知道数据在哪张表、字段是什么意思、枚举值怎么取，也担心模型生成的 SQL 不安全。所以我手动实现了一套自然语言查库链路：用户输入问题后，系统会恢复会话上下文，检索相关 Schema 语义和历史 SQL 模式，再由 Agent 调用数据库工具完成找表、查结构、SQL 生成、SQL 校验、只读执行和 SSE 流式返回。

技术上主要用了 Python、FastAPI、deepagents/LangGraph、OpenAI-compatible API、OneDBA API、OpenViking、SQLite、Docker Compose 和 Langfuse。项目从 01 原型、02 SDK 化、03 可控 ReAct + HDC，到 04 deepagents + SQL Memory 做了四阶段演进。基于项目内 28 条真实业务库评测用例，相比 02-SDK-DBAgent 阶段，通过工具调整、多层 Schema 上下文和 SQL Memory，把通过用例从 `20/28` 提升到 `28/28`，平均延迟从 `106727ms` 降到 `29103ms`，平均工具调用从 `5.7` 降到 `1.0`，总 Token 从 `34603` 降到 `18363`。

## 6. 高频追问速查

| 高频问题 | 现场回答要点 |
|---|---|
| 为什么算 Agent，不是简单调 API？ | LLM 不只生成文本，还在受控 Workflow 中参与工具选择；工具结果会影响后续推理；系统有上下文、工具、校验、执行、记忆和流式事件。 |
| Text2SQL 完整链路是什么？ | 用户问题 -> 会话/数据库上下文恢复 -> HDC/SQL Memory 检索 -> Agent 工具决策 -> Schema 获取 -> SQL 生成 -> validator -> OneDBA 只读执行 -> SSE/JSON 返回 -> 记忆沉淀。 |
| Schema 怎么进上下文？ | 两条路径：运行时工具查真实 Schema；离线 HDC 生成列级、表级、库级语义，存入 OpenViking，在线召回注入。 |
| Tool Calling 解决什么？ | 让模型通过工具访问真实数据库能力，避免凭空编表和字段；同时把 SQL 生成、校验、修复、执行收在工具边界内。 |
| 如何防危险 SQL？ | 不只靠 prompt，执行前做只读白名单、DDL 拦截、单语句、表名字段和 LIMIT 校验。 |
| SQL 执行失败怎么办？ | 执行前失败不进入数据库；执行时失败把错误信息交给 repair，再重新校验执行；不能修复时返回错误原因。 |
| 多轮上下文怎么管？ | session 维护会话和当前数据库；Context Builder 注入最近历史、HDC、查询偏好和 SQL Memory；SQL Memory 只复用查询模式。 |
| 和普通 RAG 区别？ | 普通 RAG 召回文档回答；DB-Agent 召回 Schema/SQL 模式后还要生成、校验、执行 SQL，用真实数据库结果回答。 |
| 表很多 Schema 太长怎么办？ | 不塞全量 DDL；用 HDC 分层召回候选库表字段，必要时再查真实表结构，并通过 token budget 控制上下文。 |
| 如何评估 SQL 正确性？ | 不只看 SQL 文本，重点看通过用例、执行结果、表/列引用、过滤条件、延迟、工具调用和 Token。 |
| Docker 部署怎么做？ | 最终版本有 Dockerfile、docker-compose、Gunicorn、`.env`、部署文档、健康检查和验收脚本；定位为 Docker Compose 单机部署。 |
| 哪些是手动实现？ | Agent 应用工程链路：API/SSE、工具适配、上下文构建、OneDBA 工具、NL2SQL、validator/repair、HDC、OpenViking 集成、SQL Memory、Admin、部署和评测。 |
| 最大难点是什么？ | 不是 SQL 语法，而是业务 Schema 语义、工具决策和执行安全的组合；核心是选对表字段并安全执行。 |
| 当前不足是什么？ | 评测不是公开 benchmark；HDC/SQL Memory 增加 TTFB；SQL Memory 需要治理；权限、脱敏、审计、K8s、CI/CD 还可继续补。 |
| 匹配大厂 AI 应用岗吗？ | 匹配点是 Agent 工具调用、Text2SQL、Context/RAG、后端 API、数据库、安全、Docker、观测和评测；边界是它不是模型训练或通用 Agent 平台。 |

## 7. 风险表达清单：哪些话不要说，应该怎么说

| 不要说 | 应该怎么说 |
|---|---|
| 我自研了一个通用 Agent 框架。 | 我手动实现了面向业务数据库查询的受控 Text2SQL Agent 工程链路，deepagents/LangGraph 负责通用 Agent 循环。 |
| 这个项目训练了 Text2SQL 大模型。 | 这是 LLM 应用工程项目，重点在工具调用、Schema 上下文、SQL 校验、执行和评测，不涉及模型训练或微调。 |
| HDC / OpenViking 保证 SQL 正确。 | HDC / OpenViking 提供 Schema 语义召回，SQL 正确性还依赖真实 Schema、NL2SQL、validator、执行结果和评测闭环。 |
| SQL Memory 缓存答案，能直接复用结果。 | SQL Memory 复用历史成功查询模式，不缓存最终答案；新问题仍要重新生成、校验和执行 SQL。 |
| 已经达到公开 benchmark SOTA。 | 指标来自项目内 28 条真实业务库评测用例，只说明该场景下相比 02 阶段测试数据有改进。 |
| 已经是大规模高并发生产系统。 | 当前具备 Docker Compose 单机部署、Admin、观测和验收能力；大规模生产还需要 K8s、Secret、CI/CD、监控告警和权限治理。 |
| 完全解决了 SQL 安全问题。 | 已做只读白名单、DDL 拦截、单语句、表字段和 LIMIT 校验；生产还要补 RBAC、审计、脱敏和网络访问控制。 |
| deepagents 提升了 SQL 准确率。 | deepagents 主要降低通用 Agent 循环维护成本；效果改善来自 HDC、SQL Memory、工具边界、SQL 校验和评测闭环共同作用。 |
| 这是 Graph RAG / Multi-Agent / A2A 项目。 | 这是 Text2SQL Agent 项目，包含 Schema 语义检索和 SQL Memory，不包装成当前代码没有充分证据的概念。 |
| 所有数据库都能直接接入。 | 当前主要面向 OneDBA 业务数据库平台；迁移其他数据库需要适配 Schema 采集、工具接口、权限和评测用例。 |

## 8. 投递岗位建议

### 优先投递

- AI 应用开发工程师
- Agent 应用开发工程师
- 大模型应用后端开发工程师
- LLM 工程化 / LLMOps 应用开发
- Text2SQL / 数据智能 / 数据问答工程师
- 后端开发工程师（AI 应用方向）

### 次优投递

- 数据平台后端开发：重点讲 OneDBA 集成、SQL 安全、Schema 管理、评测和部署。
- 智能运维 / DBA 工具开发：重点讲自然语言查库、陌生库探索、只读执行和 Admin 管理。
- 企业知识库 / RAG 应用开发：可以投，但要强调这是结构化数据 RAG + SQL 执行，不是普通文档问答。

### 不建议作为主项目投递

- 基础模型训练 / 算法研究岗：项目不涉及训练、微调和模型结构改造。
- 纯前端岗位：前端只是演示和管理配套，不是主要技术贡献。
- 云原生平台 / SRE 岗：有 Docker Compose 交付，但没有充分证据支撑大规模 K8s、高可用、压测和 SLA。
- 数据库内核 / SQL 优化器岗位：项目使用数据库和 SQL 校验，不是数据库内核或查询优化器实现。

### 投递时的项目定位

最稳妥的定位是：**面向真实业务数据库的 Text2SQL Agent 后端工程项目**。

投递 AI 应用 / Agent 岗时，简历标题用“手动实现面向业务数据库的 Text2SQL Agent”；面试展开时围绕四条线讲：Agent 工具链、Schema 上下文、SQL 安全、工程化评测与部署。
