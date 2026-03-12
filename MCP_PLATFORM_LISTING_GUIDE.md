# RollingGo 海外 MCP 平台上架指导手册

本文档给商务、运营或平台对接同学使用，目标是把 `RollingGo Hotel MCP` 上架到海外 MCP 平台、目录站或应用市场。

这类平台通常会要求填写以下几类信息：

- 产品名称
- 英文简介
- GitHub 源码地址
- 安装 / 启动方式
- 运行命令
- 环境变量
- 工具说明
- Logo、截图、分类、标签

本手册按“可直接复制填写”的方式整理。

## 1. 基本信息

### 推荐展示名称

- `RollingGo Hotel MCP`

### 推荐短标题

- `Global hotel search and live rate MCP server`

### 推荐一句话简介

- `Search hotels worldwide, compare candidates, and fetch live room-rate details through MCP.`

### 推荐英文长描述

```text
RollingGo Hotel MCP is a hotel-search MCP server for AI assistants and MCP clients. It helps users search hotels by destination, dates, rating, distance, tags, and budget, then fetch live room-rate details for selected hotels. It also exposes tag metadata to support structured hotel filtering.
```

### 推荐中文描述

```text
RollingGo Hotel MCP 是一个面向 AI 助手和 MCP 客户端的酒店搜索服务，可按地点、日期、星级、距离、标签和预算搜索全球酒店，并进一步查询指定酒店的实时房型与价格详情。
```

## 2. 官方链接

### GitHub 源码地址

平台如果要求填写 Source Code / Repository / GitHub URL，请填写：

```text
https://github.com/longcreat/rollinggo-hotel
```

### npm 包地址

```text
https://www.npmjs.com/package/rollinggo-mcp
```

### PyPI 包地址

```text
https://pypi.org/project/rollinggo-mcp/
```

### 文档地址

如果平台允许填写文档链接，优先填 GitHub README：

```text
https://github.com/longcreat/rollinggo-hotel
```

也可以补充说明：

- npm 接入说明：仓库内 `rollinggo-hotel-npm/README.md`
- uvx 接入说明：仓库内 `rollinggo-hotel-uv/README.md`

## 3. 推荐分类与标签

### 推荐分类

- `Travel`
- `Hospitality`
- `Search`
- `Productivity`

### 推荐标签

- `hotel`
- `travel`
- `booking`
- `hospitality`
- `search`
- `mcp`
- `travel-planning`
- `live-pricing`

## 4. 工具能力说明

当前 MCP 工具如下：

1. `searchHotels`
2. `getHotelDetail`
3. `getHotelSearchTags`

### 推荐工具说明

- `searchHotels`: Search hotels by destination, dates, star range, distance, tags, brand, and budget.
- `getHotelDetail`: Fetch live room plans, prices, cancellation policies, and rate details for a selected hotel.
- `getHotelSearchTags`: Fetch tag metadata for structured hotel filtering.

## 5. 平台填写时优先推荐哪种接入方式

海外 MCP 平台通常支持两种典型 `stdio` 运行方式：

1. `npx`
2. `uvx`

如果平台支持 Node 运行环境，优先可填 `npx`。

如果平台支持 Python / uv 生态，优先可填 `uvx`。

如果平台允许填写多种安装方式，建议把 `npx` 和 `uvx` 两套都给出。

## 6. npx 上架填写模板

适用于平台表单里支持填写：

- `command`
- `args`
- `env`

的场景。

### 运行方式

- Runtime: `stdio`
- Command: `npx`

### Args

```json
["-y", "rollinggo-mcp"]
```

### Environment Variables

```json
{
  "ROLLINGGO_API_KEY": "mcp_your_key"
}
```

### 可直接复制的完整配置

```json
{
  "command": "npx",
  "args": ["-y", "rollinggo-mcp"],
  "env": {
    "ROLLINGGO_API_KEY": "mcp_your_key"
  }
}
```

### 说明

- `rollinggo-mcp` 是 npm 包名
- `stdio` 为默认传输方式
- 平台如果支持 Secret / Environment Variables，建议把 API Key 配成平台密钥，而不是写死在公开配置里

## 7. uvx 上架填写模板

适用于平台支持 `uvx` 的场景。

### 运行方式

- Runtime: `stdio`
- Command: `uvx`

### Args

```json
["--from", "rollinggo-mcp", "rollinggo-mcp"]
```

### Environment Variables

```json
{
  "ROLLINGGO_API_KEY": "mcp_your_key"
}
```

### 可直接复制的完整配置

```json
{
  "command": "uvx",
  "args": ["--from", "rollinggo-mcp", "rollinggo-mcp"],
  "env": {
    "ROLLINGGO_API_KEY": "mcp_your_key"
  }
}
```

### 为什么 `rollinggo-mcp` 会出现两次

这是正常的：

- 第一个 `rollinggo-mcp` 表示“从哪个 PyPI 包安装”
- 第二个 `rollinggo-mcp` 表示“安装后执行哪个命令”

## 8. 环境变量说明

平台如果支持配置环境变量，建议填写以下内容。

### 必填

- `ROLLINGGO_API_KEY`

### 兼容备用

- `AIGOHOTEL_API_KEY`

### 可选覆盖

- `ROLLINGGO_BASE_URL`

### 推荐填写策略

- 正常情况下只填 `ROLLINGGO_API_KEY`
- 如果平台已有固定变量命名习惯，可在必要时使用 `AIGOHOTEL_API_KEY`
- `ROLLINGGO_BASE_URL` 只有在私有网关、代理或测试环境下才需要填写

## 9. 海外平台英文表单可直接复制内容

### Name

```text
RollingGo Hotel MCP
```

### Short Description

```text
Global hotel search and live room-rate MCP server.
```

### Full Description

```text
RollingGo Hotel MCP is an MCP server for hotel discovery and live pricing workflows. It supports hotel search by destination, check-in dates, star range, distance, tags, brand, and budget. It also provides detailed room-rate plans, cancellation policies, and hotel-search tag metadata for structured filtering.
```

### Category

```text
Travel
```

### Tags

```text
hotel, travel, hospitality, booking, search, mcp, live-pricing
```

### Source Code

```text
https://github.com/longcreat/rollinggo-hotel
```

## 10. 上架前检查清单

提交前请核对：

- GitHub URL 是否填写为仓库根地址，而不是某个子目录
- 运行方式是否选择 `stdio`
- `command` / `args` 是否原样填写
- API Key 是否配置在平台的 Secret / Env 配置里
- 简介是否使用英文
- 名称是否统一为 `RollingGo Hotel MCP`
- 如平台支持测试按钮，是否至少测试 `searchHotels`

## 11. 常见问题

### 1. 平台要求填 GitHub Source Code URL，填哪个？

填写仓库根地址：

```text
https://github.com/longcreat/rollinggo-hotel
```

不要填：

- 某个 README 文件地址
- 某个子目录地址
- 本地文件路径

### 2. 平台只支持一种方式，选 npx 还是 uvx？

优先顺序建议：

1. 平台偏 Node 生态：选 `npx`
2. 平台偏 Python / uv 生态：选 `uvx`
3. 平台允许两种方式都展示：两种都提供

### 3. 平台问“安装命令”和“运行命令”是否要分开？

通常不需要单独写安装步骤，直接填写平台要求的：

- `command`
- `args`
- `env`

由平台在运行时自动处理安装。

### 4. API Key 应该写在哪里？

不要写在公开描述里，也不要写死在命令参数中。

应写在平台的：

- Secrets
- Environment Variables
- Encrypted Config

## 12. 推荐对外统一口径

对外介绍时，建议统一使用下面这句：

```text
RollingGo Hotel MCP is a global hotel search MCP server that helps AI clients search hotels, compare candidates, and retrieve live room-rate details through standard MCP tools.
```
