# Book Schema 1.0 使用说明

## 为什么不是 ZIP

产品真正需要稳定的是“书、章、段、模式、媒体之间的关系”，而不是压缩包。ZIP 只是一种运输方式，不能定义内容语义。

史境因此使用一个版本化 JSON 对象作为标准格式。图片和音频可以使用相对路径或 URL；未来即使采用 ZIP、对象存储、CMS 或数据库，解包/读取后仍然先转换成这一格式。

- JSON Schema：`docs/demos/shijing-dayu-immersive/books/book-schema.json`
- 下载模板：`docs/demos/shijing-dayu-immersive/books/book-template.json`
- 完整内置示例：`dayu.json`、`silk-road.json`

## 最小结构

```json
{
  "version": "1.0",
  "id": "my-book",
  "title": "我的书",
  "modes": {
    "original": { "label": "原文阅读" }
  },
  "chapters": [{
    "id": "chapter-1",
    "title": "第一章",
    "segments": [{
      "id": "chapter-1-segment-1",
      "title": "第一段",
      "modes": {
        "original": { "text": "这里填写正文。", "audio": "" }
      }
    }]
  }]
}
```

## 字段原则

- `id` 使用稳定的小写字母、数字和连字符；已发布后不要随标题变化。
- `chapter` 是装载、目录、完成和自动续读边界。
- `segment` 是用户选择、声音和画面同步的最小边界。
- `modes` 用于表达同一段内容的不同讲述方式，而不是复制整本书。
- `audio`、`image` 都是可选增强；没有媒体的书仍然必须可读。
- `source` 与 `sourceNote` 应说明资料来源、改写和版权边界。

## TXT 与 Markdown 约定

### Markdown

- 第一个 `#` 作为书名；
- `##` 作为章节；
- `###` 可作为段落小标题；
- 空行分隔正文段落。

### TXT

- `第一章`、`第二回`、`第三节` 等行会被识别为章节；
- 空行分隔段落；
- 文件名作为默认书名。

文本导入只负责让内容立即可读，不自动声称已经完成讲解改写、专业配音或场景制作。

## 新适配器接口

扩展 EPUB、DOCX 或 CMS 时，适配器只需要输出能通过 Book Schema 校验的普通对象：

```text
EPUB / DOCX / CMS / AI生成结果
             ↓
        Adapter.parse()
             ↓
         Book JSON 1.0
             ↓
      现有阅读器直接运行
```

建议把解析、内容加工和媒体生成拆开：解析先保证可读；讲解/故事改写、MiniMax 音频和场景生成作为可观察、可重试的后续任务。

## 兼容性演进

- 1.0：书/章/段、多叙事模式、图片与音频。
- 1.1 候选：段落 `media[]`，统一表达图片、视频、字幕时间轴和多关键帧。
- 2.0 只用于不可向后兼容的结构变化；加载器应保留旧版本迁移函数。

