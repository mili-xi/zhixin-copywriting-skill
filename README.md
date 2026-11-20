# 智心 AI 中文文案 Skill

从客户简报、商品规格和授权素材出发，写一篇有据可查的中文产品文案。交付包含 Markdown 正文 `article.md` 和记录来源、待确认项及质检结论的 `review.md`。写稿使用当前客户端的模型，稿件默认保存在当前工作区。

## 安装

下载或克隆本仓库，把完整的 [`zhixin-copywriting/`](zhixin-copywriting/) 目录复制到工作区的技能路径，并随附仓库根目录的 [`LICENSE`](LICENSE)。

| 客户端 | 工作区安装路径 | 手动调用 |
| --- | --- | --- |
| Codex | `.agents/skills/zhixin-copywriting/SKILL.md` | `$zhixin-copywriting` |
| Claude Code | `.claude/skills/zhixin-copywriting/SKILL.md` | `/zhixin-copywriting` |

两端均配置为手动调用。若要在本机多个项目使用，可把技能目录放到用户主目录的 `.agents/skills/`（Codex）或 `.claude/skills/`（Claude Code）。安装后在目标工作区打开会话。 [Codex Skills 文档](https://developers.openai.com/codex/skills/) · [Claude Code Skills 文档](https://code.claude.com/docs/en/skills)

## 快速体验

在对应客户端发送一条演练请求。

```text
$zhixin-copywriting 用 Skill 自带的虚构简报写一篇演示稿，只在当前工作区交付。
/zhixin-copywriting 用 Skill 自带的虚构简报写一篇演示稿，只在当前工作区交付。
```

正式使用时可直接提供简报，也可复制 [JSON 简报样例](zhixin-copywriting/templates/brief.example.json) 到客户工作区，换成已核对的资料并移除示例的 `demo: true`。参考 [正文样例](zhixin-copywriting/templates/article.example.md) 查看交付格式。有可写工作区时，稿件保存在 `deliverables/<jobId>/`。客户资料与稿件留在各自的工作区。用 Git 管理工作区时，将私有简报和 `deliverables/` 加入该工作区的忽略规则。

## 可选检查与接入

写稿只需 Codex 或 Claude Code。要额外检查 JSON 简报、标题、正文长度和配图格式，可用 Node.js 22 或更新的 LTS 版本从仓库根目录运行以下命令。检查器只读传入的两个本地文件，事实来源、素材授权和平台要求仍按审稿记录逐条核对。

```sh
node zhixin-copywriting/scripts/check-draft.mjs zhixin-copywriting/templates/brief.example.json zhixin-copywriting/templates/article.example.md
```

需要向智心 AI 导入定稿、发布或查状态时，按 [MCP 接入与授权](zhixin-copywriting/references/zhixin-mcp.md) 配置客户端。导入与真实发布分别授权。计划复用 Windows 批处理流程时，可参考 [阶段与交接约定](zhixin-copywriting/references/windows-pipeline.md)。

## 开发验证

在仓库根目录运行 `node --test`。测试使用虚构资料，覆盖样例、必填字段、Unicode 字符上限、图片引用和 HTML 标签。

本仓库采用 [MIT 许可证](LICENSE)。
