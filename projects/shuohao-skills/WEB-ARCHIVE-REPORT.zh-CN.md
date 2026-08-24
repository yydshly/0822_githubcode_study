# 《潮痕》远端网页档案校验报告

归档日期：2026-08-24  
在线入口：<https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/research/experiments/tide-marks/>

## 完整性摘要

- 研究网页：20 个。
- 网页直接引用的唯一文件：824 个，共 446.56 MB。
- 远端研究目录清单：971 个文件，共 452.75 MB（不重复打包上游 submodule）。
- 失效的本地相对引用：0 个。
- 对紧凑历史快照执行的链接修复组：0 组；只调整路径，不改变研究结论。

## 页面逐项检查

| 页面 | 内部引用 | 失效引用 |
| --- | ---: | ---: |
| `experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/index.html` | 6 | 0 |
| `experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/snapshot/offline-production/capability-evaluation.html` | 6 | 0 |
| `experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/snapshot/offline-production/continuity-audit.html` | 120 | 0 |
| `experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/snapshot/offline-production/library-exploration-conclusion.html` | 3 | 0 |
| `experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/snapshot/offline-production/story-logic-audit.html` | 16 | 0 |
| `experiments/tide-marks/art/art-report.html` | 23 | 0 |
| `experiments/tide-marks/characters/report.html` | 11 | 0 |
| `experiments/tide-marks/index.html` | 961 | 0 |
| `experiments/tide-marks/offline-production/capability-evaluation.html` | 6 | 0 |
| `experiments/tide-marks/offline-production/continuity-audit.html` | 120 | 0 |
| `experiments/tide-marks/offline-production/foundational-capability-architecture.html` | 4 | 0 |
| `experiments/tide-marks/offline-production/library-exploration-conclusion.html` | 3 | 0 |
| `experiments/tide-marks/offline-production/media-demo.html` | 12 | 0 |
| `experiments/tide-marks/offline-production/story-logic-audit.html` | 16 | 0 |
| `experiments/tide-marks/offline-production/video-production-control.html` | 130 | 0 |
| `experiments/tide-marks/outline/outline-report.html` | 1 | 0 |
| `experiments/tide-marks/script/script-report.html` | 1 | 0 |
| `experiments/tide-marks/storyboard/storyboard-ep2-report.html` | 6 | 0 |
| `experiments/tide-marks/storyboard/storyboard-report-zh.html` | 320 | 0 |
| `experiments/tide-marks/storyboard/storyboard-report.html` | 202 | 0 |

## 校验与恢复

1. 使用 `WEB-ARCHIVE-INVENTORY.csv` 核对每个文件的字节数与 SHA-256。
2. 使用 `WEB-ARCHIVE-MANIFEST.json` 查看每个网页引用的具体资源及解析状态。
3. 执行 `node scripts/build-web-archive-manifest.mjs --verify` 重新检查网页依赖；存在失效引用时命令以非零状态退出。
4. 上游源码通过 Git submodule 固定在提交 `0e5eb688`，不在清单中重复复制。

## 解释边界

本报告证明“网页与其内部元素已经远端化、可以复核”，不代表《潮痕》已经达到视频投产标准。研究的最终结论仍是：结构化流程验证成功，短剧投产尝试失败，问题需要前移到小说原型、因果关系和改编连续性。
