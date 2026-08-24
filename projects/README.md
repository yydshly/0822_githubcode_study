# 研究项目目录

`projects/` 保存各研究对象的源码、实验、证据与结论。每个项目应尽可能自包含，并通过自己的 README 让后来者能够复现实验。

## 当前项目

| 项目 | 状态 | 固定版本 | 研究入口 | 当前重点 |
| --- | --- | --- | --- | --- |
| Sub2API | `researching` | `67380eaf` | [项目报告](sub2api/README.md) · [产品简报](sub2api/PRODUCT_BRIEF.md) | 能力、原理、场景、产品目标与扩展路线 |
| story-to-handdrawn-video | `researching` | `fbab5b27` | [项目报告](story-to-handdrawn-video/README.md) · [固定上游](story-to-handdrawn-video/upstream/) · [架构](story-to-handdrawn-video/ARCHITECTURE.md) · [证据](story-to-handdrawn-video/EVIDENCE.md) · [路线图](story-to-handdrawn-video/ROADMAP.md) | 文本/图片到手绘静音视频的实现、边界与产品化方向 |
| shuohao-skills | `archived` | `0e5eb688` | [研究总结](shuohao-skills/RESEARCH-SUMMARY.zh-CN.md) · [固定上游](shuohao-skills/upstream/) · [证据](shuohao-skills/EVIDENCE.md) | 库探索完成；《潮痕》投产失败，研究重心前移到小说原型、因果与改编 |

Sub2API 第一阶段已经完成固定版本的源码静态审计和证据脚本。尚未执行需要 Go 1.26.6、Docker、PostgreSQL/Redis 或真实上游凭据的端到端验证，因此暂不标记为 `validated`。

story-to-handdrawn-video 已完成固定版本源码审计、文本 plan-only、上传图片处理和 Remotion 预览渲染。实际图片生成、20 风格视觉质量与多页卷页效果仍待验证，因此暂不标记为 `validated`。

shuohao-skills 已完成 1,262 项自测、《渡口》夹具复现，以及原创《潮痕》6 集、59 段、193 镜的结构化实验。两个连续视频暴露人物目标、空间位置和动作因果回退，证明格式与图片齐全不能替代小说和改编质量门；现停止继续生成并归档为 `archived`。

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
