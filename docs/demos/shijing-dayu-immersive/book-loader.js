(function (root) {
  "use strict";

  const DB_NAME = "shijing-local-library";
  const DB_VERSION = 1;
  const STORE_NAME = "books";
  const MAX_FILE_BYTES = 5 * 1024 * 1024;
  const BUILTIN_PATHS = ["./books/dayu.json", "./books/silk-road.json"];
  const ORIGINAL_MODE = {
    original: { label: "原文阅读", shortLabel: "原文", icon: "book-open", description: "保留导入文件的原始文字。" },
  };

  function fail(message) { throw new Error(message); }
  function asText(value, fallback) { return typeof value === "string" && value.trim() ? value.trim() : (fallback || ""); }
  function safeId(value, fallback) {
    const ascii = asText(value).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
    return ascii.length >= 2 ? ascii : fallback;
  }
  function chineseNumber(value) {
    const numerals = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
    return numerals[value - 1] || String(value);
  }
  function stripMarkdown(value) {
    return value.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>#~-]/g, "").replace(/\s+/g, " ").trim();
  }

  function validateBook(input, options) {
    const settings = Object.assign({ origin: "imported", existingIds: [] }, options);
    const raw = input?.books?.length === 1 ? input.books[0] : input;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("文件不是有效的书籍对象。");
    if (raw.version && String(raw.version) !== "1.0") fail(`暂不支持书籍格式版本 ${raw.version}，当前版本为 1.0。`);
    const title = asText(raw.title);
    if (!title) fail("缺少书名 title。");
    if (!Array.isArray(raw.chapters) || !raw.chapters.length) fail("书籍至少需要一个章节 chapters。");
    if (raw.chapters.length > 2000) fail("章节数量超过 2000，建议拆分后再导入。");

    const modes = {};
    const declaredModes = raw.modes && typeof raw.modes === "object" ? raw.modes : {};
    Object.entries(declaredModes).forEach(([key, value]) => {
      const modeKey = safeId(key, "");
      if (!modeKey || !value || typeof value !== "object") return;
      modes[modeKey] = {
        label: asText(value.label, key), shortLabel: asText(value.shortLabel, value.label || key).slice(0, 12),
        icon: asText(value.icon, "book-open"), description: asText(value.description, "阅读这一版本的正文。"),
      };
    });

    const chapterIds = new Set();
    const segmentIds = new Set();
    const chapters = raw.chapters.map((chapter, chapterIndex) => {
      if (!chapter || typeof chapter !== "object") fail(`第 ${chapterIndex + 1} 章格式不正确。`);
      const chapterTitle = asText(chapter.title, `第${chineseNumber(chapterIndex + 1)}章`);
      let chapterId = safeId(chapter.id, `chapter-${chapterIndex + 1}`);
      while (chapterIds.has(chapterId)) chapterId = `${chapterId}-${chapterIndex + 1}`;
      chapterIds.add(chapterId);
      if (!Array.isArray(chapter.segments) || !chapter.segments.length) fail(`“${chapterTitle}”没有可阅读段落。`);
      if (chapter.segments.length > 500) fail(`“${chapterTitle}”超过 500 个段落，请先拆分章节。`);
      const segments = chapter.segments.map((segment, segmentIndex) => {
        if (!segment || typeof segment !== "object") fail(`“${chapterTitle}”第 ${segmentIndex + 1} 段格式不正确。`);
        const segmentTitle = asText(segment.title, `第${chineseNumber(segmentIndex + 1)}段`);
        let segmentId = safeId(segment.id, `${chapterId}-segment-${segmentIndex + 1}`);
        while (segmentIds.has(segmentId)) segmentId = `${segmentId}-${segmentIndex + 1}`;
        segmentIds.add(segmentId);
        const segmentModes = {};
        const rawModes = segment.modes && typeof segment.modes === "object" ? segment.modes : {};
        Object.entries(rawModes).forEach(([key, value]) => {
          const modeKey = safeId(key, "");
          const text = typeof value === "string" ? value.trim() : asText(value?.text);
          if (!modeKey || !text) return;
          segmentModes[modeKey] = { text, audio: asText(value?.audio) };
          if (!modes[modeKey]) modes[modeKey] = { label: key, shortLabel: key.slice(0, 12), icon: "book-open", description: "阅读这一版本的正文。" };
        });
        if (!Object.keys(segmentModes).length) fail(`“${segmentTitle}”没有有效正文 modes.*.text。`);
        return {
          id: segmentId, eyebrow: asText(segment.eyebrow, `第${chineseNumber(segmentIndex + 1)}段`), title: segmentTitle,
          image: asText(segment.image), alt: asText(segment.alt), summary: asText(segment.summary, segmentTitle), modes: segmentModes,
        };
      });
      return {
        id: chapterId, number: asText(chapter.number, `第${chineseNumber(chapterIndex + 1)}章`), numeral: asText(chapter.numeral, chineseNumber(chapterIndex + 1)),
        title: chapterTitle, image: asText(chapter.image), summary: asText(chapter.summary, chapterTitle),
        takeaway: asText(chapter.takeaway, "这一章已经读完。"), segments,
      };
    });
    if (!Object.keys(modes).length) fail("书籍没有声明任何可阅读模式。");
    const baseId = safeId(raw.id, `book-${Date.now().toString(36)}`);
    let id = baseId;
    let suffix = 2;
    const existing = new Set(settings.existingIds || []);
    while (existing.has(id)) { id = `${baseId}-${suffix}`; suffix += 1; }
    const segmentCount = chapters.reduce((sum, chapter) => sum + chapter.segments.length, 0);
    return {
      version: "1.0", id, title: title.slice(0, 120), subtitle: asText(raw.subtitle, `${chapters.length}章 · ${segmentCount}段`),
      author: asText(raw.author, "本地导入"), duration: asText(raw.duration, `约 ${Math.max(1, Math.ceil(segmentCount * 1.4))} 分钟`),
      cover: asText(raw.cover), source: asText(raw.source, "用户本地导入"), sourceNote: asText(raw.sourceNote, "内容仅保存在当前浏览器。"),
      modes, chapters, _origin: settings.origin,
    };
  }

  function paragraphsToSegments(paragraphs, chapterId) {
    return paragraphs.map((paragraph, index) => {
      const clean = stripMarkdown(paragraph);
      const title = clean.length > 20 ? `${clean.slice(0, 20)}…` : clean || `第${chineseNumber(index + 1)}段`;
      return {
        id: `${chapterId}-segment-${index + 1}`, eyebrow: `第${chineseNumber(index + 1)}段`, title,
        image: "", alt: "", summary: title, modes: { original: { text: clean, audio: "" } },
      };
    }).filter(segment => segment.modes.original.text);
  }

  function parseText(text, filename, markdown) {
    const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
    if (!normalized) fail("文件没有可阅读文字。");
    const fallbackTitle = filename.replace(/\.[^.]+$/, "").trim() || "导入书籍";
    let title = fallbackTitle;
    const chapters = [];
    let current = { title: "正文", blocks: [] };
    let segmentHeading = "";
    const flushBlock = (buffer) => {
      const value = buffer.join("\n").trim();
      if (value) current.blocks.push(segmentHeading ? `${segmentHeading}\n${value}` : value);
      segmentHeading = "";
      buffer.length = 0;
    };
    const flushChapter = () => {
      const index = chapters.length + 1;
      const id = `chapter-${index}`;
      const segments = paragraphsToSegments(current.blocks, id);
      if (segments.length) chapters.push({ id, number: `第${chineseNumber(index)}章`, numeral: chineseNumber(index), title: current.title, image: "", summary: current.title, takeaway: "这一章已经读完。", segments });
    };
    const buffer = [];
    for (const rawLine of normalized.split("\n")) {
      const line = rawLine.trim();
      const h1 = markdown && line.match(/^#\s+(.+)$/);
      const h2 = markdown && line.match(/^##\s+(.+)$/);
      const h3 = markdown && line.match(/^###\s+(.+)$/);
      const plainChapter = !markdown && line.match(/^(第[一二三四五六七八九十百千万0-9]+[章节回卷篇部]\s*.*)$/);
      if (h1 && !chapters.length && !current.blocks.length && !buffer.length) { title = stripMarkdown(h1[1]) || title; continue; }
      if (h2 || plainChapter) { flushBlock(buffer); flushChapter(); current = { title: stripMarkdown((h2 || plainChapter)[1]), blocks: [] }; continue; }
      if (h3) { flushBlock(buffer); segmentHeading = stripMarkdown(h3[1]); continue; }
      if (!line) { flushBlock(buffer); continue; }
      buffer.push(line);
    }
    flushBlock(buffer); flushChapter();
    if (!chapters.length) fail("没有识别到可阅读段落。");
    const characters = normalized.replace(/\s/g, "").length;
    return validateBook({
      version: "1.0", id: safeId(fallbackTitle, `book-${Date.now().toString(36)}`), title, author: "本地导入",
      subtitle: `${chapters.length}章 · 原文阅读`, duration: `约 ${Math.max(1, Math.ceil(characters / 260))} 分钟`, cover: "",
      source: `从 ${filename} 导入`, sourceNote: "当前只包含原文；配音与场景可在后续内容加工中补充。",
      modes: ORIGINAL_MODE, chapters,
    }, { origin: "imported" });
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in root)) { reject(new Error("当前浏览器不支持本地书库。")); return; }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("本地书库无法打开，请检查浏览器存储权限。"));
    });
  }
  async function withStore(mode, action) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("本地书库操作失败。"));
      transaction.oncomplete = () => database.close();
      transaction.onabort = () => { database.close(); reject(new Error("本地书库操作被取消。")); };
    });
  }
  async function getImportedRecords() { return withStore("readonly", store => store.getAll()); }
  async function getImportedBooks() {
    const records = await getImportedRecords();
    return records.sort((a, b) => b.importedAt - a.importedAt).map(record => ({ ...record.book, _origin: "imported", _fileName: record.fileName, _importedAt: record.importedAt }));
  }
  async function getBuiltins() {
    if (location.protocol !== "file:") {
      try {
        const responses = await Promise.all(BUILTIN_PATHS.map(path => fetch(path, { cache: "no-cache" })));
        if (responses.every(response => response.ok)) {
          const rawBooks = await Promise.all(responses.map(response => response.json()));
          return rawBooks.map(raw => validateBook(raw, { origin: "builtin" }));
        }
      } catch (_error) { /* compatibility bundle below */ }
    }
    const fallback = root.HISTORY_STORY?.books || (root.HISTORY_STORY?.chapters ? [root.HISTORY_STORY] : []);
    return fallback.map(raw => validateBook({ ...raw, version: "1.0" }, { origin: "builtin" }));
  }
  async function loadAll() {
    const builtins = await getBuiltins();
    let imported = [];
    try { imported = await getImportedBooks(); } catch (_error) { /* reading remains available without local import */ }
    return [...builtins, ...imported.filter(item => !builtins.some(book => book.id === item.id))];
  }
  async function importFile(file, existingIds) {
    if (!file) fail("请选择一个文件。");
    if (file.size > MAX_FILE_BYTES) fail("文件超过 5MB。请先拆分正文，媒体资源应使用URL或后续加工流程接入。");
    const extension = (file.name.split(".").pop() || "").toLowerCase();
    if (!["json", "txt", "md", "markdown"].includes(extension)) fail("当前支持 JSON、TXT 和 Markdown 文件。");
    const text = await file.text();
    let book;
    if (extension === "json") {
      let parsed;
      try { parsed = JSON.parse(text); } catch (_error) { fail("JSON语法错误，请检查逗号、引号和括号。"); }
      book = validateBook(parsed, { origin: "imported", existingIds });
    } else book = parseText(text, file.name, extension !== "txt");
    if ((existingIds || []).includes(book.id)) book = validateBook(book, { origin: "imported", existingIds });
    const storedBook = JSON.parse(JSON.stringify(book)); delete storedBook._origin;
    await withStore("readwrite", store => store.put({ id: storedBook.id, book: storedBook, fileName: file.name, importedAt: Date.now() }));
    return { ...storedBook, _origin: "imported", _fileName: file.name, _importedAt: Date.now() };
  }
  async function removeBook(id) { await withStore("readwrite", store => store.delete(id)); }

  root.BookLibrary = { loadAll, getBuiltins, getImportedBooks, importFile, removeBook, validateBook, parseText, MAX_FILE_BYTES };
})(window);
