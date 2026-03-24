# TravelMind AI（聊天界面 + Node.js 后端接入）

## 运行方式

1. 安装依赖

```bash
npm install
```

2. 配置环境变量（后端）

```bash
cp .env.example .env
```

编辑 `.env`：
- `AI_API_KEY`: 你的 AI Key
- `AI_BASE_URL`: OpenAI 兼容接口（默认 `https://api.openai.com/v1`）
- `AI_MODEL`: 模型名（默认 `gpt-4o-mini`）

3. 启动（前端 + 后端）

```bash
npm run dev
```

前端：`http://localhost:5173/`  
后端健康检查：`http://localhost:8787/health`

## 接口

### POST /api/chat/stream
将 OpenAI Chat Completions 的流式输出转成简化 SSE：

每个增量：
```text
data: {"delta":"..."}
```

结束：
```text
event: done
data: {}
```

