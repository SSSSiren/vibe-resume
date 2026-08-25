# 手动实现面向业务数据库的 Text2SQL Agent

## 简介

基于 Python、FastAPI、deepagents/LangGraph，面向内部业务数据库手动实现 Text2SQL Agent，支持自然语言查库、Agent 工具调用、Schema 语义检索、SQL 生成校验、只读执行和 SSE 流式响应。基于项目内 28 条真实业务库评测用例，通过工具调整、多层 Schema 上下文 + SQL Memory 将通过用例从 `20/28` 提升到 `28/28`，平均延迟降低约 `72.7%`（`106727ms -> 29103ms`），平均工具调用减少约 `82.5%`（`5.7 -> 1.0`），总 Token 使用减少约 `46.9%`（`34603 -> 18363`）。

## 主要工作

- 设计数据库查询 Agent 流程，串联 FastAPI 会话恢复、上下文构建、工具调用、NL2SQL、SQL校验和 SSE式结果返回。
- 基于 OneDBA API 抽象数据库工具能力，覆盖数据库发现、表搜索、表结构查询、SQL 生成和危险SQL拦截。
- 设计列级、表级、库级三层 Schema 语义索引，基于 OpenViking 存储和检索数据库语义上下文，并注入 Agent 推理过程。
- 接入基于 SQLite 的 SQL Memory、查询偏好和会话存储，复用历史成功查询模式并保留多轮查询上下文。
- 补齐 Admin 管理、Docker Compose 部署、Langfuse 观测和评测脚本，支撑服务部署、问题追踪和效果评估。
