# DB-Agent 面试讲解稿

## 1. 1 分钟项目介绍

我这个项目是一个面向内部业务数据库的 Text2SQL Agent。背景是研发、DBA 或数据工具使用者接手陌生业务库时，经常不知道数据在哪张表、字段是什么意思、枚举值怎么取，也担心模型生成的 SQL 不安全。所以我手动实现了一套自然语言查库链路：用户输入问题后，系统会恢复会话上下文，检索相关 Schema 语义和历史 SQL 模式，再由 Agent 调用数据库工具完成找表、查结构、SQL 生成、SQL 校验、只读执行和 SSE 流式返回。

技术上我主要用了 Python、FastAPI、deepagents/LangGraph、OpenAI-compatible API、OneDBA API、OpenViking、SQLite、Docker Compose 和 Langfuse。项目从 01 原型、02 SDK 化、03 可控 ReAct + HDC，到 04 deepagents + SQL Memory 做了四阶段演进。基于项目内 28 条真实业务库评测用例，相比 02-SDK-DBAgent 阶段，通过工具调整、多层 Schema 上下文和 SQL Memory，把通过用例从 `20/28` 提升到 `28/28`，平均延迟从 `106727ms` 降到 `29103ms`，平均工具调用从 `5.7` 降到 `1.0`，总 Token 从 `34603` 降到 `18363`。

## 2. 3 分钟技术展开

这个项目我主要解决三个问题。

第一是 Agent 工具链怎么设计。数据库查询不是简单让模型写 SQL，而是要先确定库、找表、看 Schema、生成 SQL、校验 SQL，再执行查询。所以我把 OneDBA 能力抽象成工具，包括数据库发现、表搜索、表结构查询、自然语言查询和 SQL 执行。Agent 不直接拼底层 API，而是在一个受控流程里选择工具。

第二是 Schema 语义怎么给模型。真实业务库里用户说的是“工单”“告警”“状态”，数据库里可能是英文表名和字段名，仅靠运行时 `find_table` 和 `describe_table` 容易盲搜。我做了列级、表级、库级三层 Schema 语义索引：离线采集 OneDBA Schema、字段注释和少量样例，生成不同粒度的语义描述，写入 OpenViking；在线时按用户问题召回相关表和字段上下文，再注入 Agent 和 NL2SQL 流程。

第三是工程可控性。SQL 不能只靠 prompt 约束，所以我在 SQL 执行前做只读校验、DDL 拦截、表字段校验、LIMIT 控制和失败修复。服务层使用 FastAPI 提供 `/api/chat`、WebSocket、session 和 Admin 管理接口，用 SSE 返回 `step/sql/final` 事件。SQL Memory 用 SQLite 存历史成功 SQL、表名、数据库和执行摘要，新问题会召回相似 SQL 模式作为参考，但不会直接复用旧答案。评测侧则按通过用例、延迟、工具调用、Token 等指标观察效果，而不是只看一条 SQL 文本像不像。

## 3. 核心链路讲解

可以按一次用户查询来讲：

1. 用户问题进入 FastAPI 后端，比如“统计每种工单状态的数量”。
2. API 层恢复 `user_id`、`session_id`、`schema_id`、`database_name` 等上下文，并读取会话历史、查询偏好和 SQL Memory。
3. 系统根据当前问题检索 Schema 语义上下文：如果配置了 HDC namespace，就从 OpenViking 召回相关库、表、列描述。
4. Context Builder 把会话历史、当前数据库、HDC、SQL Memory 等内容组织成 Agent 输入。
5. Agent 开始决策：如果不知道表，调用表搜索工具；如果已经有 HDC 命中的表，可以直接进入查询工具。
6. `query_database` 这类高层工具会拿真实 Schema，进入 NL2SQL 生成 SQL。
7. SQL 生成后进入校验：只允许 SELECT / SHOW / DESCRIBE，拦截 DDL，检查单语句、表名、字段和 LIMIT。
8. 校验通过后通过 OneDBA API 执行只读 SQL；失败时进入 repair 流程尝试修复。
9. 后端通过 SSE 返回工具步骤、生成 SQL、查询结果摘要和最终回复。
10. 查询完成后保存会话状态，并按条件记录 SQL Memory 和查询偏好，供后续多轮查询使用。

一句话总结：这个链路的核心不是“模型直接写 SQL”，而是把 Schema 检索、工具调用、SQL 校验、只读执行和记忆沉淀放进一个可控 Agent Workflow。

## 4. 四阶段演进讲解

### Origin：先跑通端到端链路

第一阶段是 `01-Origin-DBAgent`。我先用 LangGraph + FastAPI 跑通原型，支持自然语言查询、数据库探索、NL2SQL、SSE 流式输出和 WebSocket。这个阶段验证了方向：自然语言输入可以通过 Agent 工具链变成真实 OneDBA 查询结果。

它的问题也很明显：工具、事件、上下文和评测都偏原型；面对陌生业务库时，运行时探查多，Agent 容易多轮找表和重试。

### SDK：规范工具调用

第二阶段是 `02-SDK-DBAgent`。我尝试用 `claude-agent-sdk` 和进程内 MCP Server 规范工具注册和 Agent 消息循环。好处是工具 schema 和调用边界更清楚，runner 可以把 SDK 消息转成内部 SSE 事件，评测也开始可重复运行。

但服务化后暴露了问题：SDK 封装让资源释放、取消控制、异常处理和事件输出不够可控。对于数据库 Agent，用户断开、工具失败、SQL 执行结果、token 和 timing 都需要业务代码能看见、能干预。

### Infra：拿回控制权并加入 HDC

第三阶段是 `03-Infra-DB-Agent`。我切回 OpenAI-compatible API + 手写 ReAct，让业务代码重新掌握 LLM 调用、工具执行、SSE 事件、取消控制和观测数据。

同时引入 HDC，也就是把 Schema 语义理解前置。离线生成列级、表级、库级语义，写入 OpenViking；在线按问题召回。这样 Agent 不必每次从零找表、查字段，可以先拿到业务语义线索。

### DeepAgents：降低手写循环维护成本

第四阶段是 `04-deepagents-DBAgent`。手写 ReAct 可控，但维护成本高，所以我用 deepagents/LangGraph 接管通用 Agent 循环和工具调度，同时保留业务侧边界：工具适配、事件适配、上下文构建、NL2SQL、安全校验、HDC、SQL Memory 和评测。

这个阶段补齐了 SQL Memory、Admin 管理、Docker Compose 部署、Langfuse 观测和评测脚本。我的理解是：框架负责通用 Agent 运行，业务代码负责数据库语义、安全和评测边界。

## 5. 我为什么这么设计

第一，真实 Text2SQL 的难点不是 SQL 语法，而是 Schema 语义和业务口径。模型会写 `GROUP BY` 不难，难的是选对事实表、理解字段含义、处理状态枚举和时间窗口。所以我没有只堆 prompt，而是加入 Schema 语义索引和 SQL Memory。

第二，工具粒度要贴近业务任务。如果把所有底层 API 都直接暴露给模型，模型会频繁试错。所以我保留了 `query_database` 这种高层工具，把 Schema 获取、SQL 生成、校验、修复和执行收在工具内部，减少无意义的 Agent turn。

第三，数据库执行必须有硬约束。SQL 安全不能只靠提示词，所以我在工具层和 NL2SQL 层做只读校验、DDL 拦截、表字段校验和 LIMIT 控制。

第四，框架和业务边界要分清。SDK 或 deepagents 可以帮助管理 Agent 循环，但数据库工具、上下文、SQL 安全、评测这些必须留在业务代码里，否则一旦线上出现慢、错、空结果或取消失败，很难定位。

## 6. 项目边界和不足

这个项目不是模型训练或微调项目，主要是 LLM 应用工程和 Agent 后端工程。

它也不是通用 Agent 平台，场景主要聚焦在 OneDBA 业务数据库查询。迁移到其他数据库，需要重新适配 Schema 采集、工具接口、权限和评测用例。

HDC 和 SQL Memory 不是万能的。HDC 是前置语义线索，不替代实时 Schema 校验；SQL Memory 复用的是历史查询模式，不缓存最终答案。如果历史 SQL 本身有问题，后续需要治理和清理机制。

评测也不是公开 benchmark，而是项目内真实业务库用例。指标可以说明在这个场景下的工程改进，但不能包装成行业 SOTA。

目前仍有几个不足：HDC/SQL Memory 检索会增加前置准备成本；SQL 规范维度提升有限；复杂 JOIN、跨库查询、权限精细化、敏感字段治理和线上成本看板还有继续优化空间。

## 7. 如果继续做，下一步怎么优化

第一，补强评测体系。现在已经有通过用例、延迟、工具调用、Token 等指标，后续我会增加失败类型归因，比如选错表、字段错、过滤条件错、SQL 规范差、空结果误判等，方便针对性优化。

第二，治理 HDC 和 SQL Memory。HDC 需要记录召回命中情况、命中的表是否真的被用到、用错时如何回退；SQL Memory 需要增加质量标记、过期清理、错误记录隔离和按用户/数据库的作用域控制。

第三，优化上下文成本。对 HDC 和 SQL Memory 做更严格的 token budget、摘要压缩和按需注入，目标是在不降低通过率的情况下减少 TTFB 和 Token。

第四，加强 SQL 安全和权限。后续可以接入更细粒度的 RBAC、敏感字段脱敏、审计日志和按用户授权的 schema/table 白名单。

第五，完善工程交付。当前是 Docker Compose 单机部署形态，后续可以迁移到 K8s、统一 Secret 管理、CI/CD、监控告警和灰度发布，但这些要在有真实生产要求时再做，不提前包装。

## 面试收束话术

如果面试官让我总结这个项目，我会说：这个项目的价值不是“让大模型写 SQL”，而是把真实业务库查询拆成可控的 Agent 工具链，并围绕 Schema 语义、SQL 安全、记忆复用、可观测和评测把它做成一个能部署、能追踪、能迭代的后端工程。
