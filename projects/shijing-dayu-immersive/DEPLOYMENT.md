# GitHub Pages 部署说明

## 在线地址

- 展厅：`https://yydshly.github.io/0822_githubcode_study/`
- 史境：`https://yydshly.github.io/0822_githubcode_study/demos/shijing-dayu-immersive/`

## 发布机制

仓库的 `.github/workflows/pages.yml` 监听 `main` 分支的 `docs/**` 变化：

1. Checkout 当前提交；
2. 配置 GitHub Pages；
3. 把整个 `docs/` 作为静态站点上传；
4. 部署保存后的 Pages artifact。

史境没有构建步骤。所有 HTML、CSS、JavaScript、JSON、WebP、MP3 和图标文件都必须位于：

```text
docs/demos/shijing-dayu-immersive/
```

页面资源使用相对路径，因此既支持仓库子路径 Pages，也支持本地 HTTP 服务器。

## 本地预检

```powershell
python -m http.server 8107 --directory docs
```

访问：

```text
http://127.0.0.1:8107/demos/shijing-dayu-immersive/
```

发布前至少验证：

- 展厅和两本内置书可打开；
- JSON/TXT/Markdown 导入及刷新恢复；
- MiniMax MP3 和图片请求为 200；
- 390×844 无横向溢出；
- `book-schema.json`、模板和内置书通过 Schema 校验；
- 页面和控制台没有错误。

详细证据见 `VALIDATION.md`。

## 发布后检查

推送到 `main` 后，在 GitHub Actions 中确认 `Deploy research gallery to Pages` 成功，再访问线上地址并检查：

- 响应状态与最终 URL；
- Pages 子路径下的 JSON、MP3、WebP 和 Lucide 图标；
- 阅读、播放、模式切换、定时和移动端布局；
- 导入数据只保存在访问者自己的浏览器。

## 密钥边界

MiniMax API 只用于离线生成音频。密钥从本机环境变量读取，不进入 `docs/`、提交历史或 GitHub Pages。网页运行不需要 MiniMax 密钥。

