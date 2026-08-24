# 研究项目目录

`projects/` 保存各研究对象的源码、实验、证据与结论。每个项目应尽可能自包含，并通过自己的 README 让后来者能够复现实验。

## 当前项目

| 项目 | 状态 | 固定版本 | 研究入口 | 当前重点 |
| --- | --- | --- | --- | --- |
| Sub2API | `researching` | `67380eaf` | [项目报告](sub2api/README.md) · [产品简报](sub2api/PRODUCT_BRIEF.md) | 能力、原理、场景、产品目标与扩展路线 |
| story-to-handdrawn-video | `researching` | `fbab5b27` | [项目报告](story-to-handdrawn-video/README.md) · [固定上游](story-to-handdrawn-video/upstream/) · [架构](story-to-handdrawn-video/ARCHITECTURE.md) · [证据](story-to-handdrawn-video/EVIDENCE.md) · [路线图](story-to-handdrawn-video/ROADMAP.md) | 文本/图片到手绘静音视频的实现、边界与产品化方向 |
| 史境·沉浸式历史阅读 | `validated` | 产品模式参考 `33407bad` | [项目报告](shijing-dayu-immersive/README.md) · [实现原理](shijing-dayu-immersive/ARCHITECTURE.md) · [书籍格式](shijing-dayu-immersive/BOOK_FORMAT.md) · [路线图](shijing-dayu-immersive/ROADMAP.md) | 标准书籍格式、多章听读、MiniMax、随文换景、本地导入与产品化边界 |
| lanshu-create-ai-presenter-video | `researching` | `04f6bcea` | [项目报告](lanshu-create-ai-presenter-video/README.md) · [架构](lanshu-create-ai-presenter-video/ARCHITECTURE.md) · [实验记录](lanshu-create-ai-presenter-video/NOTES.md) | 数字人视频的组件编排、失败恢复、成本审计与交付质检 |
| shuohao-skills | `archived` | `0e5eb688` | [研究总结](shuohao-skills/RESEARCH-SUMMARY.zh-CN.md) · [固定上游](shuohao-skills/upstream/) · [证据](shuohao-skills/EVIDENCE.md) | 库探索完成；《潮痕》投产失败，研究重心前移到小说原型、因果与改编 |
| Particles4All | `archived` | `f0ab7c2d` | [阶段归档总结](particles4all/ARCHIVE_SUMMARY.md) · [项目报告](particles4all/README.md) · [固定上游](particles4all/upstream/) · [证据](particles4all/EVIDENCE.md) | 局部液体—刚体研究完成；等待容器、喷流、冲击、浮沉或障碍互动等明确场景后重启 |
| Water Scene Lab | `archived` | historical scene prototypes | [归档说明](water-scene-lab/README.md) · [历史页面证据](water-scene-lab/EVIDENCE.md) | 保留宏观水场景与近场接入探索；不把完整河海、瀑布或流域计入源库能力 |

Sub2API 第一阶段已经完成固定版本的源码静态审计和证据脚本。尚未执行需要 Go 1.26.6、Docker、PostgreSQL/Redis 或真实上游凭据的端到端验证，因此暂不标记为 `validated`。

story-to-handdrawn-video 已完成固定版本源码审计、文本 plan-only、上传图片处理和 Remotion 预览渲染。实际图片生成、20 风格视觉质量与多页卷页效果仍待验证，因此暂不标记为 `validated`。

史境已完成两本书、七章十四段、三种讲述模式和42条MiniMax音频的静态产品样例；桌面、平板、390px手机、HTTP/`file://`、本地导入、阅读恢复、定时与计划均有浏览器证据，因此标记为 `validated`。

lanshu-create-ai-presenter-video 已完成 D-ID 与 HeyGen 的首轮效果验证。结论是：该仓库不是一个新的数字人生成模型，而是一套把文案、TTS、数字人服务、字幕、合成、状态恢复和交付质检组织起来的生产协议。

shuohao-skills 已完成 1,262 项自测、《渡口》夹具复现，以及原创《潮痕》6 集、59 段、193 镜的结构化实验。两个连续视频暴露人物目标、空间位置和动作因果回退，证明格式与图片齐全不能替代小说和改编质量门；现停止继续生成并归档为 `archived`。

Particles4All 已固定上游源码并完成源库核验、九场景参数化实验台、局部扩展和性能边界研究。直接适用于有限容器、喷流、冲击、浮沉和障碍互动；宏观河海只能作为近场混合模块，现暂时归档。

Water Scene Lab 的页面和测试保留为历史证据。独立 Ocean、River、Waterfall 与 Watershed 表现不能算作 Particles4All 原生能力；只有明确使用场景出现时，才从 source-first 实验台重新启动。

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
