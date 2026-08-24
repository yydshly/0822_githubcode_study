# shuohao-skills /《潮痕》远端完整归档说明

归档日期：2026-08-24  
研究状态：`archived`  
在线总入口：<https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/tide-marks/>  
完整过程入口：<https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/research/experiments/tide-marks/>  
完整工作区下载：<https://github.com/yydshly/0822_githubcode_study/releases/tag/shuohao-skills-research-archive-2026-08-24>

## 一、为什么重新归档

第一版远端归档优先保存了结论、结构化数据、脚本和少量代表性媒体，但大量页面依赖仍留在本地。结果是：研究结论可以阅读，过程网页的源文件也能在仓库中找到，但部分页面缺少图片、视频、提示词或上传顺序，无法作为后期继续研究的完整依据。

本次归档把目标修正为：**不只保存结论，还要保存能够解释结论、复盘过程和继续开发的网页及其内部元素。**

## 二、远端采用三层保存

| 层级 | 保存位置 | 内容 | 用途 |
| --- | --- | --- | --- |
| 研究源码层 | Git `main` 的 `projects/shuohao-skills/` | 20 个过程网页、脚本、Markdown、JSON、CSV、提示词、上传顺序及网页引用媒体 | 克隆、审计、修改和再次构建 |
| 在线浏览层 | GitHub Pages 的 `/demos/shuohao-skills/research/` | 按原目录结构发布研究源码层；页面相对链接保持有效 | 无需本地环境直接查看研究过程 |
| 完整工作区层 | GitHub Release `shuohao-skills-research-archive-2026-08-24` | 本地研究目录和公开演示目录的完整快照，包括未被网页直接引用的候选图、QC 联系表、静态预演和重复生产包 | 灾难恢复、追溯原始候选、重新生成清单 |

这样既避免把约 1 GB 的重复二进制历史全部写进 Git 提交，又不会丢失本地原始工作区。

## 三、可在线网页归档范围

- HTML 研究页面：20 个。
- 网页直接引用的唯一内部文件：824 个，共 446.56 MB。
- 研究目录文件清单：971 个，共 452.75 MB；清单生成文件本身不计入自身统计。
- 失效本地相对引用：0 个。
- 最大网页媒体文件：15.19 MB，低于普通 Git 单文件限制。
- 上游源码：使用 Git submodule 固定为 `0e5eb688ebf1b45e45c9bec31543aaa59e67c7bc`，构建 Pages 时递归检出。

详细逐页检查见：[WEB-ARCHIVE-REPORT.zh-CN.md](WEB-ARCHIVE-REPORT.zh-CN.md)。  
机器可读依赖见：[WEB-ARCHIVE-MANIFEST.json](WEB-ARCHIVE-MANIFEST.json)。  
逐文件 SHA-256 见：[WEB-ARCHIVE-INVENTORY.csv](WEB-ARCHIVE-INVENTORY.csv)。

## 四、目录与后期用途

| 路径 | 保存内容 | 后期用途 |
| --- | --- | --- |
| `experiments/tide-marks/index.html` | 中文研究总控入口 | 从结论进入全部过程页面、59 段资料和质量审计 |
| `outline/`、`script/`、`characters/`、`art/` | 大纲、剧本、角色、场景和道具 | 重新评估小说原型、人物动机和改编素材 |
| `storyboard/` | 中文/技术分镜报告 | 核对段落、镜头、台词和静态画面 |
| `storyboard-full-pack/` | 59 段的帧图、提示词、导入 JSON、上传顺序 | 后期按段重新生成图片或视频 |
| `offline-production/` | 视频控制台、连续性/逻辑审计、字幕、声音和时间线 | 重启生产前重新执行质量门 |
| `animatic/`、`storyboard-ep2-pack/` | 静态预演和已生成样片 | 对比“静态顺序正确”与“动态逻辑失败” |
| `archive/2026-08-24-capability-exploration-failure-review/` | 冻结的失败复盘快照 | 防止后续修改覆盖当时的判断依据 |

## 五、完整性与恢复方法

### 在线页面检查

```powershell
node projects/shuohao-skills/scripts/build-web-archive-manifest.mjs --verify
```

命令会扫描所有 HTML 的相对 `href`/`src`，重新生成依赖清单，并在发现缺失文件时返回失败。

### 文件校验

下载 Release 完整包后，使用发布页附带的 SHA-256 文件校验压缩包；解压后可用 `WEB-ARCHIVE-INVENTORY.csv` 核对 Git 中的网页档案文件。

当前完整包：`shuohao-skills-research-workspace-2026-08-24.zip`，1,131,463,673 字节。  
SHA-256：`01f726d6b934d1d91812759f07fb8d4cf482a0f8a4fb8a3a2a32faf1ebc48f4a`。  
机器可读发布信息见：[FULL-ARCHIVE-RELEASE.json](FULL-ARCHIVE-RELEASE.json)。

### 恢复上游源码

```powershell
git submodule update --init --recursive projects/shuohao-skills/upstream
```

Release 完整包也保留归档时的上游工作树，但 Git 中仍以 submodule 固定提交作为版本权威。

## 六、哪些结论不能被“完整归档”改变

完整归档只解决“证据和过程能否保存、查看和恢复”，不会把失败实验变成成功产品：

- 59 段和 193 镜仍然是实验资料，不是可直接投产的视频方案；
- E01-01 与 E01-02 的连续视频仍暴露人物目标、空间位置和动作因果回退；
- 原库仍不具备小说质量评审、全剧因果保证和自动成片能力；
- 如果后期重启，应先重写或重新评审小说原型，再建立因果图与状态时间线，最后只做少量连续视频验证。

这份归档的价值，是让以后能够看清当时做了什么、为什么失败、哪些资产可以复用，以及应该从哪一层重新开始。
