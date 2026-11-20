# 智心 AI MCP 接入与发布

智心 AI 的文章工具接收已经写好的标题和 Markdown。先在当前会话完成写稿与审稿。按用户授权选用导入、发布或状态查询，带 `demo: true` 的示例仅用于本地演练。

## 连接客户端

从服务提供者取得 HTTPS MCP 地址和可撤销的受限令牌。将令牌本身放在客户端进程可读的 `ZHIXIN_MCP_TOKEN` 环境变量中。凭证留在运行环境，分享安装包、简报和稿件时仅附示例配置。

### Codex

将下列条目加入用户的 Codex `config.toml`，替换示例 URL。已有同名服务时核对并使用已登记的配置。 [Codex MCP 文档](https://developers.openai.com/codex/mcp/)

```toml
[mcp_servers.zhixin-ai]
url = "https://mcp.example.com/mcp"
bearer_token_env_var = "ZHIXIN_MCP_TOKEN"
```

### Claude Code

同时设置 `ZHIXIN_MCP_URL`。将 [HTTP 配置样例](../templates/mcp.http.example.json) 中的 `zhixin-ai` 条目合入工作区的 `.mcp.json`。从继承这两个环境变量的新会话打开工作区，核对服务器地址并按客户端提示批准连接。 [Claude Code MCP 文档](https://code.claude.com/docs/en/mcp#environment-variable-expansion-in-mcp-json)

### 服务端权限

以当前连接发现的工具和 schema 为准。能力、稿件、素材与状态查询使用 `publish:read`。导入、发布和触发状态回查共用 `article:write`。为客户配置独立所有者账号或等效的服务端数据隔离，确认其访问范围与可用方法，并为各客户签发可撤销凭证。同一所有者名下的不同令牌仍可能读到该所有者的相同数据。无法隔离时，由获授权的运营人员在受控工作区审核并代操作。

## 导入定稿

1. 核对定稿版本与目标工作区，取得上传授权。正文和封面只引用本账号已有且授权使用的素材，可用 `list_article_assets` 核查。文章素材的 URL 可公开访问，使用前核对素材的公开授权。
2. 将 `article.md` 的首行标题和其后的正文分别传入 `import_article` 的 `title`（1–200 字符）和 `contentMarkdown`（1–20,000 字符）。发送前将正文换行统一为 LF，去掉首尾空白。必填 `idempotencyKey` 为 1–128 字符。可选字段为 `summary`（最多 2,000 字符）、`tags`（最多 20 个，每个最多 80 字符）和 `coverAssetId`。正文最多 5 处 `![替代文字](asset:资产ID)`，文本链接使用标准 Markdown 写法。只发送定稿及其选定的元数据。
3. 记录返回的 `article.id`，比对返回的稿件与获准上传的版本。服务端会把正文里的资产引用转成素材 URL，可按返回的资产 ID 对照。确认内容后报告「已导入稿件」，发现差异时先向用户报告。导入回执丢失时，对同一版本的重试复用原输入和原幂等键。标题、正文或资产等输入变化后，为新版本生成新键。

## 发布与回查

1. 用 `get_article` 核对远端标题、正文、封面和正文图与审阅版本一致，图片可按资产 ID 对照。用 `get_article_publish_capabilities` 核对平台、授权媒体账号及桌面执行器。把稿件版本、标题、`articleId`、平台、账号与对应的 `mediaAccountId` 列给用户作发布确认。
2. 收到确认后，在向每个账号提交前重新读取远端稿件。发布工具按调用时的 `articleId` 读取内容，请在确认到提交期间保持稿件和素材版本稳定。若内容有变化或无法核对，先停下并确认新的定稿。
3. 对每个确认的账号调用一次 `publish_article`，传入 `articleId`、`mediaAccountId`、为该版本和账号保留的 `idempotencyKey`，以及 `confirmPublish: true`。记录返回的 `publication.id` 和 `publication.status`。按实际回执报告状态，例如 `queued` 为已排队，`submitted_for_review` 为审核中，`reconciliation_required` 为待对账。
4. 用 `get_article_publication({publicationId})` 查询既有任务。只有该任务确认 `published` 并返回经验证的 `publicUrl` 时才报告「已公开」并提供链接。缺少发布 ID 时，可用 `list_article_publications` 按文章、账号和时间对账，或请运营人员核查。对账未确认结果时暂停后续提交。只有用户授权触发回查时才调用 `recheck_article_publication`。

在客户工作区保留必要回执，例如 `deliverables/<jobId>/mcp-receipts.json`。发送写请求前记下阶段、稿件版本、幂等键和已知 ID，收到回执后更新状态。已有待确认的发布请求时沿用原记录对账，直到能确认其结果。回执仅记录相关 ID、时间和结果。
