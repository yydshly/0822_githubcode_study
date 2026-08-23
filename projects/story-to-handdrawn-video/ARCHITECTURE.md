# 架构与扩展点

## 模块边界

| 模块 | 当前职责 | 最自然的扩展方式 |
| --- | --- | --- |
| `skill-package/.../SKILL.md` | Agent 行为、默认值、工作流、风险和输出契约 | 增加交互式审片规则、成本预算、供应商选择策略 |
| `scripts/run_story_video.py` | 跨模式 CLI 包装 | 修复跨平台命令解析，改为稳定的主 CLI/API |
| `scripts/story-to-video.mjs` | 文本分镜、prompt、job manifest、API 图片生成 | 拆为 planner、prompt compiler、generator adapter、asset processor |
| `scripts/import-codex-images.mjs` | 导入 Agent 生成的母版并派生图层 | 统一为 generator result importer，加入校验与失败恢复 |
| `scripts/import-uploaded-pages.mjs` | 上传图片去重、版式检测、裁切、分镜生成 | OCR/版面模型、PDF/漫画页输入、人工裁切 UI |
| `references/handdrawn-style-library.json` | 风格配方、别名、示例、负面约束 | 版本化 style pack、许可检查、风格能力声明 |
| `storyboard*.json` | 生成端到渲染端的数据契约 | Schema、迁移版本、音轨、镜头和分层语义 |
| `src/Scene.tsx` | 单场景的图层时间安排 | 数据驱动 keyframe、音频对齐、风格特定动画 |
| `src/StoryVideo.tsx` | 场景串联和卷页转场 | transition registry、更多转场、镜头语言 |
| Remotion CLI | 浏览器逐帧渲染和 H.264 编码 | 云渲染、队列、进度/成本观测、多格式输出 |

## 当前数据契约

```text
Storyboard
├─ project
│  ├─ width / height / fps / ratio
│  ├─ transition / transition_sec
│  ├─ style_lock / character_lock
│  └─ audio（当前只声明 post-production）
└─ scenes[]
   ├─ id / duration_sec
   ├─ text / narration / visual / shot
   ├─ layers[]
   └─ assets
      ├─ text_image
      ├─ bw
      ├─ detail
      └─ color
```

这个结构已经能支撑基础扩展，但缺少：schema version、源素材血缘、prompt/model 元数据、生成状态、审核状态、音频片段、动画参数和安全区模板。

## 推荐的下一版分层

```text
Input adapters
  text | images | PDF | transcript | slides
          │
          ▼
Narrative planner
  beats | cast bible | location bible | shot list
          │
          ▼
Prompt compiler ─────► versioned style packs
          │
          ▼
Generator adapters
  Codex | OpenAI API | other provider | uploaded assets
          │
          ▼
Asset pipeline
  normalize | crop | layer | validate | cache | provenance
          │
          ▼
Storyboard v2 + audio timeline
          │
          ▼
Renderer
  layout template | transition registry | Remotion
          │
          ▼
Quality gate + exports
```

## 关键设计建议

### 1. 把单体脚本拆成可替换服务

`story-to-video.mjs` 同时承担参数解析、中文分句、prompt 生成、hash、文件系统写入、API 调用、FFmpeg 和 storyboard 输出。下一版应保留 CLI 作为壳，把核心逻辑拆成纯函数与接口，才能单测和接入 Web 服务。

### 2. storyboard 必须先版本化

建议加入 `schema_version`，并把当前隐含在 React 组件中的固定时机显式化：

```json
{
  "schema_version": 2,
  "scene": {
    "duration_sec": 5.2,
    "tracks": [
      {"type": "caption", "asset": null, "from": 0, "to": 1.1},
      {"type": "image", "role": "bw", "from": 0.9, "to": 3.0},
      {"type": "image", "role": "color", "from": 2.7, "to": 4.7}
    ]
  }
}
```

这会让音频对齐、局部重生成、不同风格动画和可视化时间轴更容易实现。

### 3. 风格不只是一段 prompt

style pack 应包含：

- 视觉 prompt 与负面约束；
- 参考图及许可证；
- 字体和字幕排版；
- 推荐画布与安全区；
- 支持的动画动作；
- QC 阈值；
- 版本、作者和来源。

### 4. 生成任务需要状态机

当前 Codex manifest 是静态 job 列表。产品化后至少需要 `planned → queued → generating → validating → approved/retry → rendered`，并记录每次尝试的模型、seed/参数、成本、错误和输出 hash。

### 5. 音频应成为一等公民

当前项目刻意输出静音轨，这对后期友好，但产品化后应把 narration 文本、TTS 音频、字级时间戳和场景时长统一到 timeline。默认仍可导出静音版，同时输出独立人声、BGM 和字幕文件。

## 按功能定位源码扩展点

- **新增风格**：编辑 style library、增加示例图与许可信息，不应修改场景代码。
- **新增生成供应商**：在 planner 之后实现 generator adapter，不应继续往 `story-to-video.mjs` 添加条件分支。
- **新增输入类型**：输出同一 Storyboard，而不是复制渲染器。
- **新增转场**：在 `StoryVideo.tsx` 建 registry，根据 storyboard 参数选择实现。
- **新增比例**：先抽象 layout template，再改 Composition；不能只改 width/height，因为字幕和插画区域是固定像素。
- **新增音频**：扩展 schema，并在 Remotion 中加入 Audio/Sequence；场景时长由音频时间戳驱动。
- **新增真实逐笔动画**：需要 SVG/path 或线稿骨架资产，现有整图 clip-path 无法还原笔顺。
