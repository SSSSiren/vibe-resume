# DB-Agent 简历项目描述

## 后端开发版

项目标题：面向 OneDBA 的 Text2SQL Agent 后端服务

- 设计 FastAPI 后端 API，支持 SSE 流式对话、WebSocket、同步 JSON、会话管理和 Admin 管理接口。
- 封装 OneDBA 数据库工具链，实现找库、找表、查 Schema、SQL 生成和只读 SQL 执行的后端闭环。
- 实现 SQL 安全校验模块，产出 DDL 拦截、单语句检查、表/字段校验、默认 LIMIT 和失败修复能力。
- 接入会话存储、查询偏好、SQL Memory 和 HDC namespace 映射，沉淀可持久化的数据库查询上下文。
- 部署 Docker Compose 版本到公司内部线上环境，形成可访问、可演示、可回滚的数据库问答 Agent 服务。

## AI 应用开发版

项目标题：手动实现面向业务数据库的 Text2SQL Agent

- 拆解真实业务库查询流程，构建自然语言问题到数据库探索、SQL 生成、SQL 执行和结果响应的 AI 应用链路。
- 接入 OpenAI 兼容 LLM API，结合 Prompt / Context Engineering 实现面向 OneDBA 场景的 Text2SQL 能力。
- 引入 HDC 数据底座，将数据库 Schema 离线生成语义上下文并在线召回注入 Agent，辅助表/字段理解。
- 实现 SQL Memory 机制，召回历史成功 SQL 模式作为上下文，辅助相似数据库查询任务生成。
- 部署系统到公司内部线上环境，支撑内部业务库自然语言查询和项目演示验证。

## Agent 开发版

项目标题：基于工具调用的数据库问答 Agent 工程实践

- 设计数据库 Agent Workflow，串联上下文恢复、Tool Calling、Schema 检索、NL2SQL、SQL 校验和结果返回。
- 封装 `list_databases`、`find_table`、`describe_table`、`query_database`、`execute_sql` 等工具，形成可编排的数据库工具集。
- 实现 Tool Adapter 和 Event Adapter，将 deepagents/LangGraph 运行层与内部工具、SSE 事件和评测契约解耦。
- 管理多轮会话、取消控制、工具执行状态和 Agent 过程事件，输出可追踪的 `step/sql/final` 流式响应。
- 部署 Agent 服务到公司内部线上环境，完成从原型验证到内部可用服务的工程化落地。

## 大模型应用工程版

项目标题：HDC 增强的业务库 Text2SQL Agent

- 构建大模型应用后端链路，将 LLM API、Agent Workflow、数据库工具、RAG 上下文和 SQL 执行整合为服务接口。
- 实现 HDC 数据底座生成与检索，将列级、表级、库级 Schema 语义注入 Agent 上下文，减少陌生库盲搜。
- 设计 SQL Memory 和查询偏好上下文，将历史成功查询模式作为 few-shot 参考注入 Text2SQL 生成流程。
- 接入 Langfuse/观测指标采集，记录 LLM 调用、工具调用、token、延迟、TTFB 和上下文准备耗时。
- 使用 Docker Compose 在公司内部线上环境部署服务，配套 API 文档、交付检查清单和验收脚本。

## 保守真实版

项目标题：面向真实业务库的 NL2SQL 工程链路实现

- 手动实现 OneDBA 数据库查询助手，支持自然语言查库、表结构探索、多轮会话和流式 SQL 响应。
- 搭建 NL2SQL 管道，完成用户问题、Schema 获取、SQL 生成、validator 校验、repair 修复和只读执行链路。
- 补充 HDC、SQL Memory、会话存储和 Admin 管理能力，形成可维护的上下文与查询记录管理模块。
- 构建项目评测流程，覆盖 SQL 正确性、表/列引用、过滤条件、结果正确性、工具调用、token 和延迟。
- 将 Docker Compose 版本部署到公司内部线上环境，沉淀部署文档、配置样例、健康检查和回滚说明。

## 使用建议

- 投 AI 应用开发：优先使用“AI 应用开发版”。
- 投 Agent 开发：优先使用“Agent 开发版”。
- 投大模型应用后端：优先使用“后端开发版”或“大模型应用工程版”。
- 面试风险较高或背调口径需要更稳：使用“保守真实版”。
