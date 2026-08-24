# GitHub 能力研究实验室

这里用于持续研究 GitHub、X 等渠道发现的有趣开源项目：拆解核心能力、复现关键路径、记录判断依据，并把可运行成果发布为在线演示。

[在线研究展厅](https://yydshly.github.io/0822_githubcode_study/) · [研究项目目录](projects/README.md) · [参与约定](CONTRIBUTING.md)

## 研究索引

| 项目 | 能力方向 | 状态 | 原项目 | 研究记录 | 在线演示 |
| --- | --- | --- | --- | --- | --- |
| Sub2API | AI 订阅额度分发网关 | `researching` | [Wei-Shaw/sub2api](https://github.com/Wei-Shaw/sub2api) | [详细研究](projects/sub2api/README.md) | [研究摘要](https://yydshly.github.io/0822_githubcode_study/demos/sub2api/) |
| story-to-handdrawn-video | Agent 驱动的手绘故事视频流水线 | `researching` | [gnipbao/story-to-handdrawn-video](https://github.com/gnipbao/story-to-handdrawn-video) | [详细研究](projects/story-to-handdrawn-video/README.md) | [交互演示](https://yydshly.github.io/0822_githubcode_study/demos/story-to-handdrawn-video/) |
| shuohao-skills | 已有小说到结构化短剧资料的五阶段工作流 | `archived` | [eternityspring/shuohao-skills](https://github.com/eternityspring/shuohao-skills) | [研究总结](projects/shuohao-skills/RESEARCH-SUMMARY.zh-CN.md) | [《潮痕》失败复盘](https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/tide-marks/) · [《渡口》夹具](https://yydshly.github.io/0822_githubcode_study/demos/shuohao-skills/) |

状态统一使用：

- `planned`：已登记，尚未开始；
- `researching`：正在拆解、复现或验证；
- `validated`：关键结论已有可复现证据；
- `archived`：阶段研究结束，已记录结论与重启条件。

## 仓库结构

```text
.
├─ README.md                  # 对外总入口与研究索引
├─ CONTRIBUTING.md            # 新增和更新研究项目的约定
├─ projects/
│  ├─ README.md               # 子项目导航
│  └─ _template/              # 新研究项目模板
├─ docs/                      # GitHub Pages 展示站点
│  ├─ index.html
│  └─ styles.css
└─ .github/
   ├─ ISSUE_TEMPLATE/         # 研究选题提案
   ├─ PULL_REQUEST_TEMPLATE.md
   └─ workflows/pages.yml     # Pages 自动部署
```

每个研究对象放在 `projects/<project-slug>/`，让源码、实验记录、证据与结论尽可能自包含。可公开运行的静态展示放在 `docs/demos/<project-slug>/`。

## 开始一个研究项目

1. 复制 `projects/_template/` 为 `projects/<project-slug>/`。
2. 在项目 README 中登记来源、研究问题、许可边界和运行方法。
3. 在 `NOTES.md` 按时间追加实验过程、证据与失败记录。
4. 有可运行网页时，将静态发布内容放入 `docs/demos/<project-slug>/`。
5. 更新本页研究索引、`projects/README.md` 和展厅入口。

## 展示方式

合并到 `main` 后，`.github/workflows/pages.yml` 会将 `docs/` 发布到 GitHub Pages。仓库首次初始化时需要把 Pages 的构建源设置为 **GitHub Actions**。

## 基本原则

- 尊重原项目许可证和署名要求，不将第三方源码标记为本仓库原创成果。
- 结论必须有代码、测试、日志、截图或可复现实验支撑。
- 子项目优先保持独立，避免一个实验的依赖污染其他研究。
- 不提交密钥、令牌、账号数据、付费素材或不必要的大体积生成文件。
