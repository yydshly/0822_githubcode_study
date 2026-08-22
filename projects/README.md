# 研究项目目录

`projects/` 保存各研究对象的源码、实验、证据与结论。每个项目应尽可能自包含，并通过自己的 README 让后来者能够复现实验。

## 当前项目

| 项目 | 状态 | 固定版本 | 研究入口 | 当前重点 |
| --- | --- | --- | --- | --- |
| Sub2API | `researching` | `67380eaf` | [项目报告](sub2api/README.md) · [产品简报](sub2api/PRODUCT_BRIEF.md) | 能力、原理、场景、产品目标与扩展路线 |

Sub2API 第一阶段已经完成固定版本的源码静态审计和证据脚本。尚未执行需要 Go 1.26.6、Docker、PostgreSQL/Redis 或真实上游凭据的端到端验证，因此暂不标记为 `validated`。

## 推荐布局

```text
projects/<project-slug>/
├─ README.md       # 来源、研究目标、许可边界、运行方式与结论
├─ NOTES.md        # 按时间追加的实验日志
├─ src/            # 最小复现或实现代码（按需）
├─ tests/          # 验证代码（按需）
└─ assets/         # 小型截图、图表或其他证据（按需）
```

从 [`_template/`](_template/) 复制起步模板，删除不适用的段落即可。
