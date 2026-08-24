# 发布镜像来源

`engine/` 是以下上游固定提交的静态发布镜像：

- Repository: https://github.com/matsuoka-601/Particles4All
- Commit: `f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f`
- License: MIT，见 `engine/LICENSE`

镜像用途是让 GitHub Pages 在 `docs/` 构建源下直接运行原始 ES Modules 与 WGSL。研究实验台自己的场景数据、中文说明、自动顺序 A/B 和冻结探针位于同级 `index.html`、`styles.css`、`app.js`。自动协议只临时包装当前 iframe 实例的 `sim.step()` 以封顶整数 solver steps，并在采样时通过上游已经暴露的 `__sim` / `__readBuf` 读取状态；没有修改 `engine/` 内的求解器、WGSL 或渲染链。

更新流程：

1. 明确新的上游固定提交。
2. 更新 `projects/particles4all/upstream`。
3. 机械同步 `index.html`、`LICENSE`、`README.md`、`netlify.toml`、`src/`、`presets/`、`env/`、`docs/`。
4. 对镜像和上游逐文件计算 SHA-256，确认无意外差异。
5. 重新执行 WebGPU、场景切换、交互、移动视口和性能验证。
