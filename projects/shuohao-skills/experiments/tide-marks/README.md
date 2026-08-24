# 《潮痕》原创盲测

这是一篇为验证 `shuohao-skills` 而新写的现实情感悬疑短故事，不使用上游《渡口》夹具。目标是把原文实际走完“分集大纲 → 角色 → 美术 → 剧本 → 第 1 集分镜 → 全集关键帧”的生产链。

## 结果

| 阶段 | 产出 | 确定性校验 |
| --- | --- | --- |
| 大纲 | 6 集、5 个角色、4 个场景、3 件叙事道具 | 14/14 通过 |
| 角色 | 5 张角色卡；1 张主角设定图 | 全部通过，含原文逐字证据 |
| 美术 | 4 场景、3 道具、28 个锚点、10 个光照状态、7 个道具状态；4 张设定图 | 11/11 通过 |
| 剧本 | 6 集、12 场、138 句台词 | 697.5s / 720s，10/10 通过 |
| 分镜 | 全 6 集 59 段、193 镜、10 批次 | 682s / 720s，全部适用门通过；shot-recipe 未挂载 |
| 关键帧 | 已有 46/193 张：第 1 集 35 张；第 2 集前三段 11 张 | 其余 147 张由全剧 manifest 明确标记缺失，按需生成 |
| 动态分镜 | 35 镜静帧按切点定时组装 | 104.500s、1920×1080、24fps、H.264、无音轨 |
| H3 实拍 | 第 2 集第一段 1 条 | ChatArt / MiniMax H3，1344×768、24fps、13.67s、含 AAC 音轨；转场 3.00s / 6.00s / 10.08s |

## 重要观察

- skill 的核心价值不是单纯“把小说改写成视频提示词”，而是用五层 JSON 和质量门把创作结果变成可对账、可返工、可投产的数据。
- 校验器能有效拦截时长、ID、台词、钩子、切点和提示词结构错误，但不能替代视觉与语义审查。
- 实验中人工发现：S02 末拍写了黄铜钥匙，剧本场次和美术关联却未登记 P02。分镜文本仍能写到钥匙，而 refs 门不会扫描自由文本语义。补齐三层引用后重新校验全部通过。
- 第一次电台设定图的透明通道异常，JSON 质量门无法发现；视觉检查后用同一内置图像通道修成不透明纯白背景。

## 查看与复现

- [五阶段合并报告](../../../../docs/demos/shuohao-skills/tide-marks/index.html)
- [全 6 集分镜评审报告](storyboard/storyboard-report.html) · [全剧按需生成包](storyboard-full-pack/)
- [全 6 集中文制作说明](storyboard/storyboard-report-zh.html) · [中文生成索引](storyboard-full-pack/README.zh-CN.md)
- [ChatArt 全剧导入清单](storyboard-full-pack/chatart-import-manifest.json)（每段另有 `UPLOAD-ORDER.md` 与 `chatart-prompt.txt`）
- [第 2 集单集分镜报告](storyboard/storyboard-ep2-report.html) · [多人分镜验收截图](../../../../docs/demos/shuohao-skills/tide-marks/assets/ep2-multichar-report.png)
- 原文：[`source.txt`](source.txt)
- 各阶段最终 JSON：[`outline/`](outline/) · [`characters/`](characters/) · [`art/`](art/) · [`script/`](script/) · [`storyboard/`](storyboard/)
- 动态分镜：[`animatic/tide-marks-episode-01-silent-animatic.mp4`](animatic/tide-marks-episode-01-silent-animatic.mp4) · [`时间轴 JSON`](animatic/tide-marks-episode-01-timeline.json) · [`生成脚本`](build-animatic-manifest.mjs)
- 第 2 集：[`storyboard/潮痕-storyboard-ep2.json`](storyboard/潮痕-storyboard-ep2.json) · [`双集合并 JSON`](storyboard/潮痕-storyboard-ep1-2.json) · [`独立投产包`](storyboard-ep2-pack/) · [`可复现编写脚本`](author-episode-02-storyboard.mjs)

报告、JSON、全 6 集分镜与 59 段 H3 提示词现已完成；关键帧采用按需生成策略。animatic 是本实验为审片额外组装的预演片，不属于上游生成能力。现已完成第 2 集第一段的真实 H3 图生视频验证；其余 H3 视频、独立 TTS、音效和最终剪辑按用户需要再生产。
