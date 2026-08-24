# shuohao-skills 研究归档

## 项目卡片

| 字段 | 内容 |
| --- | --- |
| 上游项目 | [eternityspring/shuohao-skills](https://github.com/eternityspring/shuohao-skills) |
| 固定版本 | [`0e5eb688`](https://github.com/eternityspring/shuohao-skills/commit/0e5eb688ebf1b45e45c9bec31543aaa59e67c7bc) |
| 本地上游 | [`upstream/`](upstream/)（Git submodule） |
| 研究状态 | `archived` |
| 许可证 | Apache-2.0 |
| 研究时间 | 2026-08-23 ～ 2026-08-24 |

## 最终结论

shuohao-skills 不是小说创作器或视频生成器，而是一套基于**已有小说**的短剧结构化工作流。它把改编过程拆成大纲、角色、美术、剧本和分镜，并用 Node.js 脚本校验字段、ID、引用、时长和切点。

本研究成功验证了库的运行能力和结构化价值，但《潮痕》的短剧投产尝试失败：两个连续视频已经暴露人物目标、空间位置和动作因果回退。根本缺口位于视频生成之前——小说原型质量、全剧因果关系和小说到短剧的改编连续性没有被可靠解决。

因此停止继续生成视频。59 段、193 镜、193 张图片和提示词保留为实验资料与失败证据，不再称为可投产资产。

完整总结：[RESEARCH-SUMMARY.zh-CN.md](RESEARCH-SUMMARY.zh-CN.md)

## 研究结果

- 上游与合成报告自测：1,262/1,262 通过。
- 自带《渡口》夹具：五阶段复现成功。
- 原创《潮痕》：6 集、59 段、193 镜、682 秒结构化资料。
- 原库五层 validate：全部通过。
- 图片资料：193/193 张文件齐全；只代表图片层完成。
- 事后审计：11 项故事逻辑修复、58 个相邻边界检查。
- 真实视频：3/59 个文件，其中 E01-01 与 E01-02 连播暴露流程级叙事问题。
- 正式采用：0/59。
- 最终决策：叙事前置质量门失败，停止扩大视频生成。

## 能力边界

| 能力 | 原库是否覆盖 |
| --- | --- |
| 长文本分块、五阶段结构、ID 与引用校验 | 是 |
| 大纲、角色、美术、剧本和分镜的输出契约 | 是 |
| 时长、切点和提示词格式校验 | 是 |
| 小说原型质量评审 | 否 |
| 人物欲望、冲突升级和人物弧保证 | 否 |
| 全剧因果图与状态时间线 | 否 |
| 高质量小说到短剧改编保证 | 否 |
| 图片和视频生成 | 否 |
| 跨段动态连续性、返工闭环和最终剪辑 | 否 |

## 样例入口

- [GitHub Pages 样例源文件](../../docs/demos/shuohao-skills/tide-marks/)
- [完整远端归档说明](REMOTE-ARCHIVE.zh-CN.md)
- [网页依赖与文件校验清单](WEB-ARCHIVE-REPORT.zh-CN.md)
- [失败复盘](experiments/tide-marks/offline-production/library-exploration-conclusion.html)
- [修正版冻结归档](experiments/tide-marks/archive/2026-08-24-capability-exploration-failure-review/index.html)
- [原库《渡口》复现页](../../docs/demos/shuohao-skills/index.html)

## 复现原库验证

环境：Windows、Node.js `v22.15.0`。

```powershell
git submodule update --init --recursive projects/shuohao-skills/upstream
Set-Location projects/shuohao-skills/upstream
$testFiles = Get-ChildItem -LiteralPath skills -Recurse -Filter selftest.mjs
foreach ($testFile in $testFiles) { node $testFile.FullName }
node scripts/report-selftest.mjs
```

重新验证《潮痕》结构化资料：

```powershell
Set-Location projects/shuohao-skills/experiments/tide-marks
node build-full-story-package.mjs
```

这里的“验证通过”只表示规格、引用和文件状态一致；机器验证不代表故事质量通过。

## 归档与重启条件

本研究停止继续深入。只有先补齐以下能力，才值得重启视频实验：

1. 小说原型评审；
2. 全剧因果图；
3. 人物、道具与空间状态时间线；
4. 允许删线、合人、改序、补桥和重写的短剧改编；
5. 投产前连续场景走查；
6. 2～3 个连续视频小样连播通过。

上游代码按 Apache-2.0 许可保留来源和固定提交；本研究未修改 submodule 内的上游源码。
