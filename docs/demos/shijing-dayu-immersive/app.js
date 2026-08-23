(async function () {
  "use strict";

  const fallbackData = window.HISTORY_STORY;
  let books = fallbackData?.books || (Array.isArray(fallbackData?.chapters) ? [fallbackData] : []);
  if (window.BookLibrary?.loadAll) {
    try { books = await window.BookLibrary.loadAll(); }
    catch (error) { console.warn("标准书库加载失败，继续使用内置数据。", error); }
  }
  if (!books.length) return;
  const libraryData = { ...fallbackData, books };
  let book = books[0];

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const pad = (value) => String(value).padStart(2, "0");
  const chineseNumbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const STORAGE_KEY = "shijing-reader-state-v2";
  const HINT_KEY = "shijing-reader-hint-seen";
  const PLAN_KEY = "shijing-reading-plan-v1";
  let modeKeys = Object.keys(book.modes);

  const elements = {
    libraryView: $("#libraryView"), readerView: $("#readerView"), libraryContent: $("#primaryContent"),
    libraryEyebrow: $("#libraryEyebrow"), libraryDeck: $("#libraryDeck"), libraryTheme: $("#libraryThemeButton"),
    importButton: $("#importButton"), importOverlay: $("#importOverlay"), importClose: $("#importCloseButton"),
    importDone: $("#importDoneButton"), importFile: $("#importFileInput"), importDropZone: $("#importDropZone"),
    importStatus: $("#importStatus"), localBooksList: $("#localBooksList"), localBooksCount: $("#localBooksCount"),
    planButton: $("#planButton"), dailyPlan: $("#dailyPlan"), dailyPlanEyebrow: $("#dailyPlanEyebrow"),
    dailyPlanTitle: $("#dailyPlanTitle"), dailyPlanStatus: $("#dailyPlanStatus"), dailyPlanProgress: $("#dailyPlanProgress"),
    dailyPlanProgressFill: $("#dailyPlanProgressFill"), planSettings: $("#planSettingsButton"), planContinue: $("#planContinueButton"),
    planOverlay: $("#planOverlay"), planForm: $("#planForm"), planClose: $("#planCloseButton"), planCancel: $("#planCancelButton"),
    planTime: $("#planTimeInput"), planDays: $("#planDaysInput"), planGoal: $("#planGoalInput"), disablePlan: $("#disablePlanButton"),
    notificationButton: $("#notificationButton"), notificationStatus: $("#notificationStatus"),
    continueCard: $("#continueCard"), continueCover: $("#continueCover"), continueLabel: $("#continueLabel"),
    continueTitle: $("#continueTitle"), continueMeta: $("#continueMeta"), continueButton: $("#continueButton"),
    continueProgress: $("#continueProgress"), continueProgressFill: $("#continueProgressFill"), bookGrid: $("#bookGrid"), shelfCount: $("#shelfCount"),
    historySection: $("#historySection"), historyList: $("#historyList"), shell: $("#readerShell"),
    readingPane: $(".reading-pane"), readingScroll: $("#readingScroll"), story: $("#story"), storyKicker: $("#storyKicker"), storySegments: $("#storySegments"),
    chapterSeal: $("#chapterSeal"), chapterOverline: $("#chapterOverline"), chapterTitle: $("#chapterTitle"), chapterDeck: $("#chapterDeck"),
    modeTabs: $("#modeTabs"), modeDescription: $("#modeDescription"), firstUseHint: $("#firstUseHint"), sourceText: $("#sourceText"),
    sourceBoundary: $("#sourceBoundary"), visualStack: $("#visualStack"), sectionCount: $("#sectionCount"),
    visualIndex: $("#visualIndex"), visualTitle: $("#visualTitle"), visualSummary: $("#visualSummary"),
    listenAll: $("#listenAllButton"), audio: $("#narrationAudio"), playbackStatus: $("#playbackStatus"),
    playbackRailFill: $("#playbackRailFill"), jumpTop: $("#jumpTopButton"), jumpCurrent: $("#jumpCurrentButton"),
    jumpBottom: $("#jumpBottomButton"), previous: $("#previousButton"), next: $("#nextButton"), theme: $("#themeButton"),
    timerButton: $("#timerButton"), timerIndicator: $("#timerIndicator"), timerPanel: $("#timerPanel"),
    timerPanelStatus: $("#timerPanelStatus"), timerClose: $("#timerCloseButton"), timerCancel: $("#timerCancelButton"),
    libraryButton: $("#libraryButton"), tocButton: $("#tocButton"), tocPanel: $("#tocPanel"), tocClose: $("#tocCloseButton"), tocBookTitle: $("#tocBookTitle"),
    tocList: $("#tocList"), ambient: $("#ambientButton"), focus: $("#focusButton"), focusExit: $("#focusExitButton"),
    fullscreen: $("#fullscreenButton"), visualPane: $("#visualPane"), fallback: $("#mediaFallback"), fallbackText: $("#mediaFallbackText"), toast: $("#toast"),
    chapterEnd: $("#chapterEnd"), chapterEndEyebrow: $("#chapterEndEyebrow"), chapterEndTitle: $("#chapterEndTitle"),
    chapterEndTakeaway: $("#chapterEndTakeaway"), nextChapterPreview: $("#nextChapterPreview"), nextChapterTitle: $("#nextChapterTitle"),
    countdownCopy: $("#countdownCopy"), stayButton: $("#stayButton"), continueChapter: $("#continueChapterButton"),
  };

  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;
  const state = {
    view: "library", chapterIndex: 0, segmentIndex: 0, narrativeMode: "explain", playback: "idle", engine: "minimax",
    progress: 0, pendingResumeTime: 0, audioToken: 0, speechToken: 0, suppressPause: false, userStartedNarration: false,
    ambientOn: false, audioContext: null, ambientGain: null, toastTimer: 0, saveTimer: 0, countdownTimer: 0,
    countdown: 0, endTriggeredByAudio: false, returnFocus: null, sleepTimer: null, sleepTimerTick: 0,
    planTracker: 0, planLastTick: 0, planReminderTick: 0, planReturnFocus: null,
    importReturnFocus: null, importBusy: false, removeConfirmId: "", removeConfirmTimer: 0,
  };

  function icon(name) { return `<i data-lucide="${name}"></i>`; }
  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }
  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") window.lucide.createIcons({ attrs: { "aria-hidden": "true" } });
  }
  function safeRead() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (value?.version === 3) return value;
      if (value?.version === 2) {
        const legacy = { ...value }; delete legacy.version; delete legacy.bookId; delete legacy.theme; delete legacy.history;
        const migrated = {
          version: 3, theme: value.theme || "day", activeBookId: "dayu",
          books: { dayu: { ...legacy, history: value.history || [] } },
          history: (value.history?.length ? value.history.slice(0, 1) : [{ chapterId: value.chapterId, segmentId: value.segmentId, mode: value.mode, updatedAt: value.updatedAt }]).map((item) => ({ ...item, bookId: "dayu" })),
        };
        safeWrite(migrated);
        return migrated;
      }
      return null;
    } catch (_error) { return null; }
  }
  function safeWrite(value) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (_error) { /* file preview can restrict storage */ } }
  function emptyReaderState() { return { version: 3, theme: "day", activeBookId: books[0].id, books: {}, history: [] }; }
  function progressFor(root, bookId) { return root?.books?.[bookId] || null; }
  function selectBook(bookId) {
    book = books.find((item) => item.id === bookId) || books[0];
    modeKeys = Object.keys(book.modes);
    return book;
  }
  function localDateKey(date) {
    const value = date || new Date();
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  function defaultPlan() {
    return { version: 1, enabled: false, time: "20:30", days: "daily", goalMinutes: 15, todayDate: localDateKey(), todaySeconds: 0, lastRemindedDate: "", completedNotifiedDate: "" };
  }
  function readPlan() {
    try {
      const stored = JSON.parse(localStorage.getItem(PLAN_KEY) || "null");
      const plan = stored?.version === 1 ? { ...defaultPlan(), ...stored } : defaultPlan();
      if (plan.todayDate !== localDateKey()) {
        plan.todayDate = localDateKey(); plan.todaySeconds = 0; plan.completedNotifiedDate = "";
        localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      }
      return plan;
    } catch (_error) { return defaultPlan(); }
  }
  function writePlan(plan) { try { localStorage.setItem(PLAN_KEY, JSON.stringify({ ...plan, version: 1 })); } catch (_error) { /* storage may be restricted */ } }
  function planAppliesToday(plan, date) {
    const day = (date || new Date()).getDay();
    if (plan.days === "weekdays") return day >= 1 && day <= 5;
    if (plan.days === "weekends") return day === 0 || day === 6;
    return true;
  }
  function planDaysLabel(days) { return days === "weekdays" ? "工作日" : days === "weekends" ? "周末" : "每天"; }
  function segmentMode(segment, mode) { return segment.modes[mode] || segment.modes[Object.keys(segment.modes)[0]]; }
  function globalPosition(chapterIndex, segmentIndex) {
    let index = 0;
    for (let i = 0; i < chapterIndex; i += 1) index += book.chapters[i].segments.length;
    return index + segmentIndex;
  }
  function totalSegments() { return book.chapters.reduce((sum, chapter) => sum + chapter.segments.length, 0); }
  function currentChapter() { return book.chapters[state.chapterIndex]; }
  function currentSegment() { return currentChapter().segments[state.segmentIndex]; }
  function findSegment(id) {
    return findSegmentInBook(book, id);
  }
  function findSegmentInBook(targetBook, id) {
    for (let chapterIndex = 0; chapterIndex < targetBook.chapters.length; chapterIndex += 1) {
      const segmentIndex = targetBook.chapters[chapterIndex].segments.findIndex((segment) => segment.id === id);
      if (segmentIndex >= 0) return { chapterIndex, segmentIndex };
    }
    return null;
  }
  function getSavedTarget(saved, targetBook) {
    const selectedBook = targetBook || book;
    const defaultMode = Object.keys(selectedBook.modes)[0];
    if (!saved) return { chapterIndex: 0, segmentIndex: 0, mode: defaultMode, audioTime: 0 };
    const chapterIndex = Math.max(0, selectedBook.chapters.findIndex((chapter) => chapter.id === saved.chapterId));
    const chapter = selectedBook.chapters[chapterIndex];
    const segmentIndex = Math.max(0, chapter.segments.findIndex((segment) => segment.id === saved.segmentId));
    return { chapterIndex, segmentIndex, mode: Object.keys(selectedBook.modes).includes(saved.mode) ? saved.mode : defaultMode, audioTime: Number(saved.audioTime) || 0 };
  }

  function saveProgress(immediate) {
    if (state.view !== "reader") return;
    window.clearTimeout(state.saveTimer);
    const commit = () => {
      const previous = safeRead() || emptyReaderState();
      const previousBook = progressFor(previous, book.id) || {};
      const chapter = currentChapter();
      const segment = currentSegment();
      const duration = Number.isFinite(elements.audio.duration) ? elements.audio.duration : 0;
      const audioTime = state.engine === "minimax" && Number.isFinite(elements.audio.currentTime) ? elements.audio.currentTime : 0;
      const entry = { chapterId: chapter.id, segmentId: segment.id, mode: state.narrativeMode, updatedAt: Date.now() };
      const historyItems = [entry, ...(previousBook.history || []).filter((item) => item.chapterId !== entry.chapterId || item.segmentId !== entry.segmentId)].slice(0, 6);
      const updatedAt = Date.now();
      const nextBook = { chapterId: chapter.id, segmentId: segment.id, mode: state.narrativeMode, audioTime, audioDuration: duration,
        updatedAt, completedChapters: previousBook.completedChapters || [], history: historyItems };
      safeWrite({ ...previous, version: 3, activeBookId: book.id, theme: document.body.classList.contains("night-mode") ? "night" : "day",
        books: { ...(previous.books || {}), [book.id]: nextBook },
        history: [{ ...entry, bookId: book.id, updatedAt }, ...(previous.history || []).filter((item) => item.bookId !== book.id)].slice(0, 6) });
    };
    if (immediate) commit(); else state.saveTimer = window.setTimeout(commit, 450);
  }

  function markChapterComplete() {
    const previous = safeRead() || emptyReaderState();
    const previousBook = progressFor(previous, book.id) || {};
    const completed = Array.from(new Set([...(previousBook.completedChapters || []), currentChapter().id]));
    safeWrite({ ...previous, version: 3, activeBookId: book.id,
      books: { ...(previous.books || {}), [book.id]: { ...previousBook, chapterId: currentChapter().id, segmentId: currentSegment().id,
        mode: state.narrativeMode, audioTime: 0, updatedAt: Date.now(), completedChapters: completed } } });
  }

  function formatHistoryTime(timestamp) {
    const days = Math.floor((Date.now() - timestamp) / 86400000);
    if (days <= 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;
    return new Date(timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  }

  function renderDailyPlan() {
    const plan = readPlan();
    const targetSeconds = plan.goalMinutes * 60;
    const progress = Math.min(1, plan.todaySeconds / targetSeconds);
    const completed = plan.todaySeconds >= targetSeconds;
    const todayApplies = planAppliesToday(plan);
    elements.planButton.classList.toggle("is-active", plan.enabled);
    elements.dailyPlanProgress.hidden = !plan.enabled;
    elements.dailyPlanProgressFill.style.width = `${progress * 100}%`;
    elements.planContinue.hidden = !plan.enabled || completed || !todayApplies;
    elements.planSettings.textContent = plan.enabled ? "调整计划" : "设置计划";
    if (!plan.enabled) {
      elements.dailyPlanEyebrow.textContent = "每日阅读计划";
      elements.dailyPlanTitle.textContent = "给今天留一刻钟";
      elements.dailyPlanStatus.textContent = "设置固定时间，让阅读更容易开始。";
    } else if (!todayApplies) {
      elements.dailyPlanEyebrow.textContent = `${planDaysLabel(plan.days)} · ${plan.time} 提醒`;
      elements.dailyPlanTitle.textContent = "今天是休息日";
      elements.dailyPlanStatus.textContent = `下一个${planDaysLabel(plan.days)}阅读日再继续。`;
    } else if (completed) {
      elements.dailyPlanEyebrow.textContent = `${planDaysLabel(plan.days)} · 今日完成`;
      elements.dailyPlanTitle.textContent = "今天的阅读已经完成";
      elements.dailyPlanStatus.textContent = `已读 ${Math.floor(plan.todaySeconds / 60)} 分钟，明天再见。`;
    } else {
      const readMinutes = Math.floor(plan.todaySeconds / 60);
      const remainingMinutes = Math.max(1, Math.ceil((targetSeconds - plan.todaySeconds) / 60));
      elements.dailyPlanEyebrow.textContent = `${planDaysLabel(plan.days)} · ${plan.time} 提醒`;
      elements.dailyPlanTitle.textContent = `今日目标 ${plan.goalMinutes} 分钟`;
      elements.dailyPlanStatus.textContent = readMinutes > 0 ? `已读 ${readMinutes} 分钟，还差 ${remainingMinutes} 分钟。` : `今天还差 ${remainingMinutes} 分钟。`;
    }
  }

  function updateNotificationUI() {
    const supported = "Notification" in window;
    const permission = supported ? Notification.permission : "unsupported";
    elements.notificationButton.disabled = permission === "denied" || permission === "unsupported";
    if (permission === "granted") {
      elements.notificationButton.textContent = "已允许";
      elements.notificationStatus.textContent = "页面保持打开时可发送浏览器提醒";
    } else if (permission === "denied") {
      elements.notificationButton.textContent = "已被关闭";
      elements.notificationStatus.textContent = "可在浏览器站点设置中重新开启";
    } else if (permission === "unsupported") {
      elements.notificationButton.textContent = "不支持";
      elements.notificationStatus.textContent = "当前浏览器不支持网页通知";
    } else {
      elements.notificationButton.textContent = "允许提醒";
      elements.notificationStatus.textContent = "仅在你明确允许后启用";
    }
  }

  function setPlanDialog(open, returnFocus) {
    elements.planOverlay.hidden = !open;
    if (open) {
      const plan = readPlan();
      state.planReturnFocus = document.activeElement;
      elements.planTime.value = plan.time;
      elements.planDays.value = plan.days;
      elements.planGoal.value = String(plan.goalMinutes);
      elements.disablePlan.hidden = !plan.enabled;
      updateNotificationUI();
      refreshIcons();
      window.setTimeout(() => elements.planTime.focus(), 30);
    } else if (returnFocus !== false && state.planReturnFocus?.focus) state.planReturnFocus.focus();
  }

  function setImportStatus(message, type) {
    elements.importStatus.textContent = message;
    elements.importStatus.classList.toggle("is-error", type === "error");
    elements.importStatus.classList.toggle("is-success", type === "success");
  }

  async function renderLocalBooks() {
    if (!window.BookLibrary?.getImportedBooks) return;
    let imported = [];
    try { imported = await window.BookLibrary.getImportedBooks(); }
    catch (error) { setImportStatus(error.message, "error"); }
    elements.localBooksCount.textContent = `${imported.length} 本`;
    elements.localBooksList.innerHTML = imported.length ? imported.map((item) => {
      const chapters = item.chapters.length;
      const segments = item.chapters.reduce((total, chapter) => total + chapter.segments.length, 0);
      const confirming = state.removeConfirmId === item.id;
      return `<div class="local-book-item"><span class="local-book-mark" aria-hidden="true">${escapeHTML(String(item.title).slice(0, 1))}</span><span class="local-book-copy"><strong>${escapeHTML(item.title)}</strong><span>${chapters} 章 · ${segments} 段 · ${escapeHTML(item._fileName || "标准书籍文件")}</span></span><button class="local-book-remove${confirming ? " is-confirming" : ""}" type="button" data-remove-book="${escapeHTML(item.id)}">${confirming ? "确认移除" : "移除"}</button></div>`;
    }).join("") : `<p>还没有本地导入的书。</p>`;
  }

  function setImportDialog(open, returnFocus) {
    elements.importOverlay.hidden = !open;
    if (open) {
      state.importReturnFocus = document.activeElement;
      state.removeConfirmId = "";
      setImportStatus("文件只在当前浏览器中处理和保存，不会自动上传。");
      renderLocalBooks();
      refreshIcons();
      window.setTimeout(() => elements.importDropZone.focus(), 30);
    } else if (returnFocus !== false && state.importReturnFocus?.focus) state.importReturnFocus.focus();
  }

  async function reloadBooks(preferredBookId) {
    if (!window.BookLibrary?.loadAll) return;
    const refreshed = await window.BookLibrary.loadAll();
    if (!refreshed.length) throw new Error("书库中没有可阅读内容。");
    books = refreshed;
    libraryData.books = books;
    selectBook(preferredBookId || book?.id || books[0].id);
  }

  async function handleImportFile(file) {
    if (!file || state.importBusy) return;
    state.importBusy = true;
    elements.importDropZone.classList.add("is-busy");
    elements.importFile.disabled = true;
    setImportStatus(`正在解析“${file.name}”…`);
    try {
      const imported = await window.BookLibrary.importFile(file, books.map((item) => item.id));
      await reloadBooks(imported.id);
      await renderLocalBooks();
      renderLibrary();
      setImportStatus(`《${imported.title}》已加入展厅，共 ${imported.chapters.length} 章。`, "success");
    } catch (error) {
      setImportStatus(error?.message || "文件导入失败，请检查格式。", "error");
    } finally {
      state.importBusy = false;
      elements.importDropZone.classList.remove("is-busy", "is-dragging");
      elements.importFile.disabled = false;
      elements.importFile.value = "";
    }
  }

  function forgetRemovedBook(bookId) {
    const rootState = safeRead();
    if (!rootState) return;
    const nextBooks = { ...(rootState.books || {}) };
    delete nextBooks[bookId];
    safeWrite({ ...rootState, activeBookId: rootState.activeBookId === bookId ? books[0]?.id : rootState.activeBookId,
      books: nextBooks, history: (rootState.history || []).filter((item) => item.bookId !== bookId) });
  }

  async function handleRemoveBook(bookId) {
    if (state.removeConfirmId !== bookId) {
      state.removeConfirmId = bookId;
      window.clearTimeout(state.removeConfirmTimer);
      $$('[data-remove-book]', elements.localBooksList).forEach((button) => {
        const confirming = button.dataset.removeBook === bookId;
        button.classList.toggle("is-confirming", confirming);
        button.textContent = confirming ? "确认移除" : "移除";
      });
      state.removeConfirmTimer = window.setTimeout(() => { state.removeConfirmId = ""; renderLocalBooks(); }, 3200);
      return;
    }
    const removed = books.find((item) => item.id === bookId);
    try {
      await window.BookLibrary.removeBook(bookId);
      window.clearTimeout(state.removeConfirmTimer);
      state.removeConfirmId = "";
      forgetRemovedBook(bookId);
      await reloadBooks(books[0]?.id);
      await renderLocalBooks();
      renderLibrary();
      setImportStatus(`《${removed?.title || "这本书"}》已从当前设备移除。`, "success");
    } catch (error) { setImportStatus(error?.message || "移除失败，请稍后重试。", "error"); }
  }

  async function requestPlanNotification() {
    if (!("Notification" in window) || Notification.permission !== "default") { updateNotificationUI(); return; }
    try { await Notification.requestPermission(); } catch (_error) { showToast("浏览器没有开放通知权限设置。"); }
    updateNotificationUI();
  }

  function planReminderDue(plan, now) {
    if (!plan.enabled || !planAppliesToday(plan, now) || plan.todaySeconds >= plan.goalMinutes * 60 || plan.lastRemindedDate === localDateKey(now)) return false;
    const [hour, minute] = plan.time.split(":").map(Number);
    return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
  }

  function checkPlanReminder() {
    const plan = readPlan();
    const now = new Date();
    if (!planReminderDue(plan, now)) return;
    plan.lastRemindedDate = localDateKey(now);
    writePlan(plan);
    const message = `今天的 ${plan.goalMinutes} 分钟阅读计划还没有完成。`;
    if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
      try { new Notification("史境 · 到阅读时间了", { body: message, ...(book.cover ? { icon: book.cover } : {}) }); } catch (_error) { /* visible fallback below */ }
    } else showToast(`到阅读时间了：${message}`, 4800);
  }

  function schedulePlanReminder() {
    window.clearInterval(state.planReminderTick);
    state.planReminderTick = 0;
    const plan = readPlan();
    if (!plan.enabled) return;
    checkPlanReminder();
    state.planReminderTick = window.setInterval(checkPlanReminder, 30000);
  }

  function planTrackingTick(force) {
    const now = Date.now();
    const elapsed = state.planLastTick ? Math.min(3, Math.max(0, (now - state.planLastTick) / 1000)) : 0;
    state.planLastTick = now;
    if (state.view !== "reader" || (!force && document.hidden) || elapsed <= 0) return;
    const plan = readPlan();
    if (!plan.enabled || !planAppliesToday(plan)) return;
    const wasComplete = plan.todaySeconds >= plan.goalMinutes * 60;
    plan.todaySeconds += elapsed;
    const isComplete = plan.todaySeconds >= plan.goalMinutes * 60;
    if (!wasComplete && isComplete && plan.completedNotifiedDate !== localDateKey()) {
      plan.completedNotifiedDate = localDateKey();
      showToast(`今天的 ${plan.goalMinutes} 分钟阅读目标完成了。`, 4200);
    }
    writePlan(plan);
  }

  function startPlanTracking() {
    window.clearInterval(state.planTracker);
    state.planLastTick = Date.now();
    if (state.view === "reader" && !document.hidden && readPlan().enabled) state.planTracker = window.setInterval(planTrackingTick, 2000);
  }

  function stopPlanTracking(flush) {
    if (flush) planTrackingTick(true);
    window.clearInterval(state.planTracker);
    state.planTracker = 0;
    state.planLastTick = 0;
  }

  function coverMarkup(item, className) {
    const title = escapeHTML(item.title);
    if (item.cover) return `<img${className ? ` class="${className}"` : ""} src="${escapeHTML(item.cover)}" alt="${title}封面" />`;
    return `<span class="book-cover-placeholder${className ? ` ${className}` : ""}" aria-label="${title}暂无封面"><span>${escapeHTML(String(item.title).slice(0, 1))}</span></span>`;
  }

  function setContinueVisual(image, title) {
    let placeholder = $(".continue-placeholder", elements.continueCard);
    if (!placeholder) {
      placeholder = document.createElement("span");
      placeholder.className = "continue-placeholder";
      elements.continueCover.insertAdjacentElement("afterend", placeholder);
    }
    elements.continueCover.hidden = !image;
    placeholder.hidden = Boolean(image);
    if (image) { elements.continueCover.src = image; elements.continueCover.alt = `${title}场景图`; }
    else { placeholder.textContent = String(title).slice(0, 1); placeholder.setAttribute("aria-label", `${title}暂无场景图`); }
  }

  function renderLibrary() {
    const saved = safeRead() || emptyReaderState();
    const latestHistory = saved.history?.[0];
    const dayStart = new Date(new Date().getFullYear(), 0, 0);
    const recommendationIndex = Math.floor((Date.now() - dayStart.getTime()) / 86400000) % books.length;
    const heroBook = selectBook(latestHistory?.bookId || books[recommendationIndex].id);
    const heroProgress = progressFor(saved, heroBook.id);
    const target = getSavedTarget(heroProgress, heroBook);
    const chapter = heroBook.chapters[target.chapterIndex];
    const segment = chapter.segments[target.segmentIndex];
    const hasProgress = Boolean(heroProgress?.updatedAt);
    const fraction = Math.min(1, (globalPosition(target.chapterIndex, target.segmentIndex) + (heroProgress?.audioDuration ? heroProgress.audioTime / heroProgress.audioDuration : 0)) / totalSegments());
    elements.libraryEyebrow.textContent = libraryData.library.eyebrow;
    elements.libraryDeck.textContent = libraryData.library.deck;
    setContinueVisual(chapter.image || heroBook.cover, heroBook.title);
    elements.continueLabel.textContent = hasProgress ? "继续阅读" : "今日推荐";
    elements.continueTitle.textContent = heroBook.title;
    const heroMode = heroBook.modes[target.mode] || heroBook.modes[Object.keys(heroBook.modes)[0]];
    elements.continueMeta.textContent = `${chapter.number} · ${chapter.title} · ${heroMode.shortLabel || heroMode.label}`;
    elements.continueButton.innerHTML = `${icon(hasProgress ? "play" : "book-open")}<span>${hasProgress ? "从这里继续" : "开始阅读"}</span>`;
    elements.continueProgress.hidden = !hasProgress;
    elements.continueProgressFill.style.width = `${Math.max(3, fraction * 100)}%`;
    elements.continueButton.dataset.chapter = String(target.chapterIndex);
    elements.continueButton.dataset.segment = String(target.segmentIndex);
    elements.continueButton.dataset.mode = target.mode;
    elements.continueButton.dataset.book = heroBook.id;

    const liveCards = books.map((item) => {
      const progress = progressFor(saved, item.id);
      const itemTarget = getSavedTarget(progress, item);
      const completed = progress?.completedChapters?.length || 0;
      const percentage = Math.min(100, Math.round(((itemTarget.chapterIndex + (itemTarget.segmentIndex / Math.max(1, item.chapters[itemTarget.chapterIndex].segments.length))) / item.chapters.length) * 100));
      const status = progress?.updatedAt ? `${completed}/${item.chapters.length} 章完成 · ${percentage}%` : `${item.chapters.length} 章 · ${item.duration}`;
      const origin = item._origin === "imported" ? "本地导入" : item.author;
      return `<button class="book-card is-live" type="button" data-open-book="${escapeHTML(item.id)}"><span class="book-cover">${coverMarkup(item)}</span><span class="book-copy"><small>${escapeHTML(origin)} · 可阅读</small><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.subtitle)}</p><span class="book-status">${escapeHTML(status)} →</span>${progress?.updatedAt ? `<span class="book-progress" aria-label="阅读进度 ${percentage}%"><span style="width:${Math.max(3, percentage)}%"></span></span>` : ""}</span></button>`;
    }).join("");
    const upcoming = (libraryData.library.upcoming || []).map((item) => `<button class="book-card" type="button" disabled><span class="book-cover"><img src="${escapeHTML(item.cover)}" alt="" /></span><span class="book-copy"><small>${escapeHTML(item.eyebrow)}</small><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.description)}</p><span class="book-status">正在策划</span></span></button>`).join("");
    elements.bookGrid.innerHTML = liveCards + upcoming;
    elements.shelfCount.textContent = `${books.length} 本可读 · ${(libraryData.library.upcoming || []).length} 本策划中`;

    const historyItems = (saved?.history || []).filter((item) => books.some((candidate) => candidate.id === item.bookId));
    elements.historyList.innerHTML = historyItems.length ? historyItems.map((item) => {
      const itemBook = books.find((candidate) => candidate.id === item.bookId);
      const itemTarget = getSavedTarget(item, itemBook);
      const itemChapter = itemBook.chapters[itemTarget.chapterIndex];
      const itemSegment = itemChapter.segments[itemTarget.segmentIndex];
      const thumb = itemChapter.image ? `<img class="history-thumb" src="${escapeHTML(itemChapter.image)}" alt="" />` : `<span class="history-thumb book-cover-placeholder" aria-hidden="true"><span>${escapeHTML(String(itemBook.title).slice(0, 1))}</span></span>`;
      return `<button class="history-item" type="button" data-history-book="${escapeHTML(itemBook.id)}" data-history-chapter="${itemTarget.chapterIndex}" data-history-segment="${itemTarget.segmentIndex}" data-history-mode="${escapeHTML(itemTarget.mode)}">${thumb}<span class="history-copy"><strong>${escapeHTML(itemBook.title)} · ${escapeHTML(itemSegment.title)}</strong><span>${escapeHTML(itemBook.modes[itemTarget.mode].label)} · ${formatHistoryTime(item.updatedAt)}</span></span>${icon("arrow-up-right")}</button>`;
    }).join("") : `<p class="history-empty">开始第一章后，这里会保留你最近读过的段落。</p>`;
    selectBook(saved.activeBookId || heroBook.id);
    renderDailyPlan();
    refreshIcons();
  }

  function showLibrary(updateRoute) {
    stopPlanTracking(true);
    clearSleepTimer();
    stopPlayback(false);
    closeChapterEnd();
    state.view = "library";
    elements.readerView.hidden = true;
    elements.libraryView.hidden = false;
    renderLibrary();
    document.title = "史境 · 沉浸式历史阅读";
    if (updateRoute) history.pushState(null, "", "#library");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function renderToc() {
    elements.tocBookTitle.textContent = `${book.title} · 目录`;
    elements.tocList.innerHTML = book.chapters.map((chapter, chapterIndex) => `<div class="toc-chapter${chapterIndex === state.chapterIndex ? " is-active" : ""}" data-toc-chapter="${chapterIndex}"><button class="toc-chapter-button" type="button" data-chapter-index="${chapterIndex}"><span>${pad(chapterIndex + 1)}</span><span>${escapeHTML(chapter.title)}</span></button><div class="toc-segments">${chapter.segments.map((segment, segmentIndex) => `<button class="toc-segment-button${chapterIndex === state.chapterIndex && segmentIndex === state.segmentIndex ? " is-active" : ""}" type="button" data-toc-chapter-index="${chapterIndex}" data-toc-segment-index="${segmentIndex}"><span>${pad(segmentIndex + 1)}</span><span>${escapeHTML(segment.title)}</span></button>`).join("")}</div></div>`).join("");
  }

  function renderModes() {
    elements.modeTabs.innerHTML = modeKeys.map((key) => `<button class="mode-tab" type="button" role="radio" aria-checked="${key === state.narrativeMode}" data-mode="${escapeHTML(key)}" title="${escapeHTML(book.modes[key].description)}">${escapeHTML(book.modes[key].label)}</button>`).join("");
    elements.modeDescription.textContent = book.modes[state.narrativeMode].description;
  }

  function renderChapter() {
    const chapter = currentChapter();
    elements.storyKicker.textContent = book.author;
    elements.chapterSeal.textContent = chapter.numeral || chineseNumbers[state.chapterIndex];
    elements.chapterOverline.textContent = `${chapter.number} · ${book.title}`;
    elements.chapterTitle.textContent = chapter.title;
    elements.chapterDeck.textContent = chapter.summary;
    elements.sectionCount.textContent = `${pad(state.chapterIndex + 1)} / ${pad(book.chapters.length)}`;
    elements.previous.disabled = state.chapterIndex === 0;
    elements.next.disabled = state.chapterIndex === book.chapters.length - 1;
    elements.sourceText.textContent = book.source;
    elements.sourceBoundary.textContent = book.sourceNote;
    renderModes();

    elements.storySegments.innerHTML = chapter.segments.map((segment, index) => {
      const mode = segmentMode(segment, state.narrativeMode);
      return `<section class="story-segment" id="segment-${escapeHTML(segment.id)}" data-index="${index}" tabindex="0" aria-label="选择第${index + 1}段：${escapeHTML(segment.title)}"><div class="segment-meta"><span class="segment-number">${pad(index + 1)}</span><span class="segment-eyebrow">${escapeHTML(segment.eyebrow)}</span></div><div class="segment-title-row"><h2 class="segment-title">${escapeHTML(segment.title)}</h2><button class="segment-listen" type="button" data-listen-index="${index}" aria-label="朗读${escapeHTML(segment.title)}" title="从此段朗读">${icon("play")}</button></div><p class="segment-text">${escapeHTML(mode.text)}</p></section>`;
    }).join("");

    elements.fallback.hidden = true;
    elements.visualStack.innerHTML = chapter.segments.map((segment, index) => {
      const image = segment.image || chapter.image;
      if (image) return `<figure class="visual-frame" data-index="${index}"><img class="visual-image" src="${escapeHTML(image)}" alt="${escapeHTML(segment.alt)}" ${index === 0 ? "fetchpriority=\"high\"" : "loading=\"lazy\""} /></figure>`;
      return `<figure class="visual-frame" data-index="${index}"><div class="visual-placeholder" role="img" aria-label="${escapeHTML(segment.title)}暂无配图"><div><span>文字场景</span><strong>${escapeHTML(segment.title)}</strong><small>图片或视频可在标准书籍文件中后续补充</small></div></div></figure>`;
    }).join("");
    $$(".visual-image", elements.visualStack).forEach((image) => image.addEventListener("error", () => {
      elements.fallback.hidden = false;
      elements.fallbackText.textContent = `“${currentSegment().title}”画面暂未载入，正文和语音仍可继续。`;
      refreshIcons();
    }));
    renderToc();
    refreshIcons();
  }

  function routeFor(chapterIndex, segmentIndex, mode) {
    return `#read/${book.id}/${book.chapters[chapterIndex].id}/${book.chapters[chapterIndex].segments[segmentIndex].id}?mode=${mode}`;
  }

  function updateRoute(replace) {
    const route = routeFor(state.chapterIndex, state.segmentIndex, state.narrativeMode);
    if (window.location.hash === route) return;
    history[replace ? "replaceState" : "pushState"](null, "", route);
  }

  function showReader(chapterIndex, segmentIndex, mode, options) {
    const settings = Object.assign({ updateRoute: true, replaceRoute: false, resumeTime: 0, autoplay: false, bookId: book.id }, options);
    stopPlanTracking(true);
    stopPlayback(true);
    closeChapterEnd();
    selectBook(settings.bookId);
    state.view = "reader";
    state.chapterIndex = Math.max(0, Math.min(book.chapters.length - 1, chapterIndex));
    state.segmentIndex = Math.max(0, Math.min(currentChapter().segments.length - 1, segmentIndex));
    state.narrativeMode = modeKeys.includes(mode) ? mode : modeKeys[0];
    state.pendingResumeTime = Math.max(0, Number(settings.resumeTime) || 0);
    elements.libraryView.hidden = true;
    elements.readerView.hidden = false;
    renderChapter();
    selectSegment(state.segmentIndex, { updateRoute: false, scroll: false, resetProgress: false });
    if (settings.updateRoute) updateRoute(settings.replaceRoute);
    document.title = `${currentChapter().title} · ${book.title}`;
    if (window.matchMedia("(max-width:760px)").matches) window.scrollTo({ top: 0, behavior: "auto" });
    else elements.readingScroll.scrollTop = 0;
    saveProgress(true);
    startPlanTracking();
    if (settings.autoplay) window.setTimeout(() => playCurrent(), 180);
  }

  function parseRoute() {
    const raw = decodeURIComponent(window.location.hash.replace(/^#/, ""));
    if (!raw || raw === "library") return { view: "library" };
    const [path, query = ""] = raw.split("?");
    const params = new URLSearchParams(query);
    const parts = path.split("/");
    if (parts[0] === "read") {
      const routeBook = books.find((item) => item.id === parts[1]) || books[0];
      const chapterIndex = routeBook.chapters.findIndex((chapter) => chapter.id === parts[2]);
      const found = findSegmentInBook(routeBook, parts[3]);
      const routeModes = Object.keys(routeBook.modes);
      return { view: "reader", bookId: routeBook.id, chapterIndex: chapterIndex >= 0 ? chapterIndex : found?.chapterIndex || 0,
        segmentIndex: found?.segmentIndex || 0, mode: routeModes.includes(params.get("mode")) ? params.get("mode") : routeModes[0] };
    }
    const legacyBook = books.find((item) => item.id === "dayu") || books[0];
    const legacySegment = findSegmentInBook(legacyBook, path);
    if (legacySegment) return { view: "reader", bookId: legacyBook.id, ...legacySegment, mode: Object.keys(legacyBook.modes)[0], legacy: true };
    const chapterIndex = legacyBook.chapters.findIndex((chapter) => chapter.id === path);
    if (chapterIndex >= 0) return { view: "reader", bookId: legacyBook.id, chapterIndex, segmentIndex: 0, mode: Object.keys(legacyBook.modes)[0], legacy: true };
    return { view: "library" };
  }

  function applyRoute(initial) {
    const route = parseRoute();
    if (route.view === "library") showLibrary(false);
    else {
      const routeBook = books.find((item) => item.id === route.bookId) || books[0];
      const saved = progressFor(safeRead(), routeBook.id);
      const exactSaved = saved && saved.chapterId === routeBook.chapters[route.chapterIndex].id && saved.segmentId === routeBook.chapters[route.chapterIndex].segments[route.segmentIndex].id && saved.mode === route.mode;
      showReader(route.chapterIndex, route.segmentIndex, route.mode, { bookId: routeBook.id, updateRoute: true, replaceRoute: Boolean(route.legacy || initial), resumeTime: exactSaved ? saved.audioTime : 0 });
    }
  }

  function segmentIsUsefulVisible(node) {
    const rect = node.getBoundingClientRect();
    const topInset = window.matchMedia("(max-width:760px)").matches && state.playback !== "idle" ? 178 : 72;
    return rect.top >= topInset && rect.bottom <= window.innerHeight - 30;
  }

  function scrollToSegmentIfNeeded(node) {
    if (!node || segmentIsUsefulVisible(node)) return;
    node.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "center" });
  }

  function selectSegment(index, options) {
    const settings = Object.assign({ updateRoute: true, scroll: false, resetProgress: true }, options);
    state.segmentIndex = Math.max(0, Math.min(currentChapter().segments.length - 1, index));
    if (settings.resetProgress) state.progress = 0;
    const segment = currentSegment();
    $$(".story-segment", elements.storySegments).forEach((node, itemIndex) => {
      const active = itemIndex === state.segmentIndex;
      node.classList.toggle("is-active", active); node.classList.toggle("is-speaking", active && state.playback !== "idle");
      if (active) node.setAttribute("aria-current", "true"); else node.removeAttribute("aria-current");
    });
    $$(".visual-frame", elements.visualStack).forEach((node, itemIndex) => node.classList.toggle("is-active", itemIndex === state.segmentIndex));
    $$(".toc-segment-button", elements.tocList).forEach((node) => node.classList.toggle("is-active", Number(node.dataset.tocChapterIndex) === state.chapterIndex && Number(node.dataset.tocSegmentIndex) === state.segmentIndex));
    elements.visualIndex.textContent = `${chineseNumbers[state.chapterIndex] || pad(state.chapterIndex + 1)} · ${pad(state.segmentIndex + 1)}`;
    elements.visualTitle.textContent = segment.title;
    elements.visualSummary.textContent = segment.summary;
    if (settings.updateRoute) updateRoute(true);
    if (settings.scroll) scrollToSegmentIfNeeded($$(".story-segment", elements.storySegments)[state.segmentIndex]);
    updatePlayer();
    saveProgress(false);
  }

  function setPlayback(mode) {
    state.playback = mode;
    $$(".story-segment", elements.storySegments).forEach((node, index) => node.classList.toggle("is-speaking", index === state.segmentIndex && mode !== "idle"));
    updatePlayer();
  }

  function updatePlayer() {
    if (state.view !== "reader") return;
    const segment = currentSegment();
    const isPlaying = state.playback === "playing";
    const label = isPlaying ? "暂停朗读" : state.playback === "paused" ? "继续朗读" : "播放当前段落";
    elements.listenAll.innerHTML = `${icon(isPlaying ? "pause" : "play")}<span>${label}</span>`;
    elements.listenAll.setAttribute("aria-label", `${label}：${segment.title}，${book.modes[state.narrativeMode].label}`);
    const hasGeneratedAudio = Boolean(segmentMode(segment, state.narrativeMode).audio);
    const engineLabel = state.engine === "system" || !hasGeneratedAudio ? "系统语音" : "MiniMax HD";
    elements.playbackStatus.textContent = state.playback === "playing" ? `${engineLabel} · ${book.modes[state.narrativeMode].label} · ${segment.title}` : state.playback === "paused" ? `已暂停 · ${segment.title}` : `${engineLabel} · ${book.modes[state.narrativeMode].label}准备就绪`;
    elements.readingPane.dataset.playback = state.playback;
    elements.jumpCurrent.classList.toggle("is-active", state.playback !== "idle");
    const overall = ((globalPosition(state.chapterIndex, state.segmentIndex) + state.progress) / totalSegments()) * 100;
    elements.playbackRailFill.style.height = `${Math.max(0, Math.min(100, overall))}%`;
    $$('[data-listen-index]', elements.storySegments).forEach((button) => {
      const current = Number(button.dataset.listenIndex) === state.segmentIndex;
      button.innerHTML = icon(current && isPlaying ? "pause" : "play");
      button.setAttribute("aria-label", `${current && isPlaying ? "暂停" : "朗读"}${currentChapter().segments[Number(button.dataset.listenIndex)].title}`);
    });
    refreshIcons();
  }

  function formatTimerRemaining(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${pad(minutes)}:${pad(seconds % 60)}`;
  }

  function activeTimerOption() {
    if (!state.sleepTimer) return "";
    return state.sleepTimer.type === "minutes" ? String(state.sleepTimer.minutes) : state.sleepTimer.type;
  }

  function restorePlaybackVolume() {
    elements.audio.volume = 1;
    elements.timerButton.classList.remove("is-fading");
    elements.readingPane.dataset.timerPhase = state.sleepTimer ? "active" : "idle";
    if (state.ambientOn && state.ambientGain && state.audioContext) {
      const now = state.audioContext.currentTime;
      state.ambientGain.gain.cancelScheduledValues(now);
      state.ambientGain.gain.setValueAtTime(state.ambientGain.gain.value, now);
      state.ambientGain.gain.linearRampToValueAtTime(.055, now + .2);
    }
  }

  function applyTimerFade(remaining) {
    const factor = Math.max(0, Math.min(1, remaining / 8000));
    if (state.engine === "minimax") elements.audio.volume = factor;
    elements.timerButton.classList.add("is-fading");
    elements.readingPane.dataset.timerPhase = "fading";
    if (state.ambientOn && state.ambientGain && state.audioContext) {
      const now = state.audioContext.currentTime;
      state.ambientGain.gain.cancelScheduledValues(now);
      state.ambientGain.gain.setValueAtTime(state.ambientGain.gain.value, now);
      state.ambientGain.gain.linearRampToValueAtTime(.055 * factor, now + .2);
    }
  }

  function expireMinuteTimer() {
    if (!state.sleepTimer || state.sleepTimer.type !== "minutes") return;
    const resumeTime = state.engine === "minimax" && Number.isFinite(elements.audio.currentTime) ? elements.audio.currentTime : 0;
    saveProgress(true);
    clearSleepTimer(null, true);
    stopPlayback(false);
    state.pendingResumeTime = resumeTime;
    restorePlaybackVolume();
    showToast("定时时间已到，朗读已停止。继续播放会从这里接上。", 3600);
  }

  function updateTimerUI() {
    const timer = state.sleepTimer;
    const remaining = timer?.type === "minutes" ? timer.endsAt - Date.now() : Infinity;
    if (timer && timer.type === "minutes" && remaining <= 0) {
      expireMinuteTimer();
      return;
    }
    let indicator = "";
    let status = "选择停止朗读的时间";
    if (timer?.type === "minutes") {
      indicator = formatTimerRemaining(remaining);
      if (remaining <= 8000) {
        applyTimerFade(remaining);
        status = state.engine === "system" ? `系统语音将在 ${indicator} 后停止` : `柔和收尾 · ${indicator}`;
      } else {
        if (elements.readingPane.dataset.timerPhase === "fading" || elements.audio.volume !== 1) restorePlaybackVolume();
        else elements.readingPane.dataset.timerPhase = "active";
        status = `还剩 ${indicator} 自动停止`;
      }
    } else if (timer?.type === "segment") {
      indicator = "本段";
      status = "当前段落读完后停止";
    } else if (timer?.type === "chapter") {
      indicator = "本章";
      status = "当前章节读完后停止";
    }
    elements.timerButton.classList.toggle("is-active", Boolean(timer));
    elements.timerIndicator.hidden = !timer;
    elements.timerIndicator.textContent = indicator;
    elements.timerPanelStatus.textContent = status;
    elements.timerCancel.hidden = !timer;
    elements.timerButton.setAttribute("aria-label", timer ? `朗读定时已开启：${status}` : "设置朗读定时");
    elements.timerButton.title = timer ? status : "朗读定时";
    $$('[data-timer-option]', elements.timerPanel).forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.timerOption === activeTimerOption())));
  }

  function clearSleepTimer(message, preserveVolume) {
    window.clearInterval(state.sleepTimerTick);
    state.sleepTimerTick = 0;
    state.sleepTimer = null;
    if (!preserveVolume) restorePlaybackVolume();
    if (elements.timerButton) updateTimerUI();
    if (message) showToast(message);
  }

  function setSleepTimer(option) {
    window.clearInterval(state.sleepTimerTick);
    restorePlaybackVolume();
    if (option === "segment" || option === "chapter") state.sleepTimer = { type: option };
    else {
      const minutes = Number(option);
      state.sleepTimer = { type: "minutes", minutes, endsAt: Date.now() + minutes * 60 * 1000 };
      state.sleepTimerTick = window.setInterval(updateTimerUI, 250);
    }
    updateTimerUI();
    setTimerPanel(false);
    const label = option === "segment" ? "本段读完" : option === "chapter" ? "本章读完" : `${option} 分钟后`;
    showToast(`已设置：${label}停止朗读`);
  }

  function setTimerPanel(open, returnFocus) {
    elements.timerPanel.hidden = !open;
    elements.timerButton.setAttribute("aria-expanded", String(open));
    if (open) {
      updateTimerUI();
      window.setTimeout(() => ($(`[data-timer-option="${activeTimerOption()}"]`, elements.timerPanel) || $("[data-timer-option]", elements.timerPanel))?.focus(), 20);
    } else if (returnFocus !== false) elements.timerButton.focus();
  }

  function cancelSystemSpeech() { state.speechToken += 1; if (synth) synth.cancel(); }
  function pauseAudio(reset) {
    state.suppressPause = true;
    elements.audio.pause();
    if (reset) { try { elements.audio.currentTime = 0; } catch (_error) { /* metadata may be pending */ } }
    state.suppressPause = false;
  }
  function stopPlayback(resetProgress) {
    state.audioToken += 1; pauseAudio(true); cancelSystemSpeech();
    if (resetProgress) state.progress = 0;
    state.userStartedNarration = false;
    if (state.view === "reader") setPlayback("idle"); else state.playback = "idle";
  }
  function chooseChineseVoice() {
    if (!synth) return null;
    return synth.getVoices().find((voice) => /^zh-CN/i.test(voice.lang)) || synth.getVoices().find((voice) => /^zh/i.test(voice.lang)) || null;
  }
  function fallbackSpeakCurrent(reason) {
    if (state.engine === "system" && state.playback !== "idle") return;
    if (!synth) { setPlayback("idle"); showToast(reason === "missing" ? "这本书没有配音，当前浏览器也不支持系统朗读。" : "MiniMax 音频无法载入，当前浏览器也没有系统语音回退。"); return; }
    const segment = currentSegment();
    const token = ++state.speechToken;
    state.engine = "system";
    const utterance = new SpeechSynthesisUtterance(`${segment.title}。${segmentMode(segment, state.narrativeMode).text}`);
    utterance.lang = "zh-CN"; utterance.rate = 0.88;
    const voice = chooseChineseVoice(); if (voice) utterance.voice = voice;
    utterance.onstart = () => token === state.speechToken && setPlayback("playing");
    utterance.onboundary = (event) => { if (token !== state.speechToken) return; state.progress = Math.min(.97, event.charIndex / Math.max(1, utterance.text.length)); updatePlayer(); };
    utterance.onend = () => { if (token === state.speechToken && state.playback !== "idle") advanceAfterEnd(); };
    utterance.onerror = () => { if (token === state.speechToken) setPlayback("idle"); };
    showToast(reason === "missing" ? "这本书暂未生成配音，已使用系统语音朗读。" : "MiniMax 音频未载入，已临时切换到系统语音。", 3200); synth.speak(utterance);
  }
  async function playCurrent() {
    const segment = currentSegment();
    const content = segmentMode(segment, state.narrativeMode);
    const token = ++state.audioToken;
    cancelSystemSpeech(); pauseAudio(false); restorePlaybackVolume();
    state.engine = "minimax"; state.userStartedNarration = true;
    const resumeTime = state.pendingResumeTime; state.pendingResumeTime = 0;
    if (!content.audio) {
      selectSegment(state.segmentIndex, { updateRoute: true, scroll: true, resetProgress: true });
      fallbackSpeakCurrent("missing");
      return;
    }
    elements.audio.src = new URL(content.audio, document.baseURI).href;
    elements.audio.load();
    if (state.sleepTimer?.type === "minutes") updateTimerUI();
    setPlayback("playing"); selectSegment(state.segmentIndex, { updateRoute: true, scroll: true, resetProgress: !resumeTime });
    if (resumeTime > 1) elements.audio.addEventListener("loadedmetadata", () => { if (token === state.audioToken && resumeTime < elements.audio.duration - 1) elements.audio.currentTime = resumeTime; }, { once: true });
    try { await elements.audio.play(); if (token !== state.audioToken) pauseAudio(true); }
    catch (error) { if (token !== state.audioToken || error.name === "AbortError") return; fallbackSpeakCurrent(); }
  }
  function toggleNarration() {
    if (state.playback === "playing") {
      if (state.engine === "minimax") elements.audio.pause(); else if (synth) synth.pause();
      setPlayback("paused"); saveProgress(true); return;
    }
    if (state.playback === "paused") {
      state.userStartedNarration = true;
      if (state.sleepTimer?.type === "minutes") updateTimerUI();
      if (state.engine === "minimax") elements.audio.play().then(() => setPlayback("playing")).catch(fallbackSpeakCurrent);
      else if (synth) { synth.resume(); setPlayback("playing"); }
      return;
    }
    playCurrent();
  }

  function switchSegment(index, autoplay, scroll) {
    const shouldPlay = autoplay || state.playback !== "idle";
    stopPlayback(true); selectSegment(index, { scroll: Boolean(scroll) });
    if (shouldPlay) playCurrent();
  }
  function advanceAfterEnd() {
    state.progress = 1;
    if (state.sleepTimer?.type === "segment") {
      saveProgress(true);
      setPlayback("idle");
      clearSleepTimer("本段已读完，朗读按定时停止。");
      return;
    }
    if (state.segmentIndex < currentChapter().segments.length - 1) {
      selectSegment(state.segmentIndex + 1, { scroll: true }); window.setTimeout(playCurrent, 220);
    } else {
      const stopAtChapterEnd = state.sleepTimer?.type === "chapter";
      setPlayback("idle"); markChapterComplete();
      if (stopAtChapterEnd) clearSleepTimer("本章已读完，朗读按定时停止。");
      openChapterEnd(!stopAtChapterEnd);
    }
  }

  function clearCountdown() { window.clearInterval(state.countdownTimer); state.countdownTimer = 0; state.countdown = 0; }
  function updateCountdown() {
    elements.countdownCopy.textContent = state.countdown > 0 ? `${state.countdown} 秒后自动进入下一章，任意操作都可停下。` : "";
  }
  function openChapterEnd(triggeredByAudio) {
    clearCountdown();
    state.endTriggeredByAudio = triggeredByAudio;
    state.returnFocus = document.activeElement;
    const chapter = currentChapter();
    const hasNext = state.chapterIndex < book.chapters.length - 1;
    elements.chapterEndEyebrow.textContent = hasNext ? "本章读完" : "全书读完";
    elements.chapterEndTitle.textContent = chapter.title;
    elements.chapterEndTakeaway.textContent = chapter.takeaway;
    elements.nextChapterPreview.hidden = !hasNext;
    if (hasNext) elements.nextChapterTitle.textContent = book.chapters[state.chapterIndex + 1].title;
    elements.continueChapter.innerHTML = hasNext ? `<span>继续下一章</span>${icon("arrow-right")}` : `<span>返回书籍展厅</span>${icon("library")}`;
    elements.chapterEnd.hidden = false;
    elements.stayButton.textContent = hasNext ? "停在这里" : "留在末章";
    if (hasNext && triggeredByAudio) {
      state.countdown = 5; updateCountdown();
      state.countdownTimer = window.setInterval(() => {
        state.countdown -= 1; updateCountdown();
        if (state.countdown <= 0) { clearCountdown(); continueFromEnd(true); }
      }, 1000);
    } else elements.countdownCopy.textContent = hasNext ? "准备好时，再继续下一章。" : "这段旅程已完整保存在阅读历史中。";
    refreshIcons(); window.setTimeout(() => elements.stayButton.focus(), 30);
  }
  function closeChapterEnd() {
    clearCountdown();
    if (!elements.chapterEnd.hidden) { elements.chapterEnd.hidden = true; if (state.returnFocus?.focus) state.returnFocus.focus(); }
  }
  function continueFromEnd(autoplay) {
    const hasNext = state.chapterIndex < book.chapters.length - 1;
    closeChapterEnd();
    if (!hasNext) { showLibrary(true); return; }
    showReader(state.chapterIndex + 1, 0, state.narrativeMode, { updateRoute: true, autoplay: Boolean(autoplay) });
  }
  function moveChapter(delta) {
    const target = Math.max(0, Math.min(book.chapters.length - 1, state.chapterIndex + delta));
    if (target !== state.chapterIndex) showReader(target, 0, state.narrativeMode, { updateRoute: true });
  }
  function changeNarrativeMode(mode) {
    if (!modeKeys.includes(mode) || mode === state.narrativeMode) return;
    const wasPlaying = state.playback === "playing";
    stopPlayback(true); state.narrativeMode = mode; state.pendingResumeTime = 0;
    renderChapter(); selectSegment(state.segmentIndex, { updateRoute: true, scroll: false });
    showToast(`已切换为${book.modes[mode].label}`);
    if (wasPlaying) playCurrent();
  }

  function setToc(open) {
    elements.tocPanel.hidden = !open; elements.tocButton.setAttribute("aria-expanded", String(open));
    if (open) $(".toc-chapter-button", elements.tocPanel)?.focus(); else elements.tocButton.focus();
  }
  function showToast(message, duration) {
    window.clearTimeout(state.toastTimer); elements.toast.textContent = message; elements.toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), duration || 2600);
  }
  function setNightMode(on) {
    document.body.classList.toggle("night-mode", on);
    [elements.theme, elements.libraryTheme].forEach((button) => {
      button.innerHTML = `${icon(on ? "sun" : "moon")}${button === elements.libraryTheme ? `<span>${on ? "日间" : "夜读"}</span>` : ""}`;
      button.setAttribute("aria-label", on ? "切换日间阅读" : "切换夜间阅读");
    });
    const previous = safeRead() || emptyReaderState(); safeWrite({ ...previous, version: 3, theme: on ? "night" : "day" }); refreshIcons();
  }
  function setVisualFocus(on) {
    elements.shell.classList.toggle("visual-focus", on); elements.focusExit.hidden = !on;
    elements.focus.setAttribute("aria-label", on ? "返回阅读" : "只看画面"); if (on) elements.focusExit.focus();
  }
  function startAmbient() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) { showToast("当前浏览器不支持环境声。"); return; }
    if (!state.audioContext) {
      const context = new AudioContext(); const buffer = context.createBuffer(1, context.sampleRate * 3, context.sampleRate); const data = buffer.getChannelData(0); let previous = 0;
      for (let i = 0; i < data.length; i += 1) { previous = previous * .985 + (Math.random() * 2 - 1) * .015; data[i] = previous; }
      const source = context.createBufferSource(); const filter = context.createBiquadFilter(); const gain = context.createGain();
      source.buffer = buffer; source.loop = true; filter.type = "lowpass"; filter.frequency.value = 720; gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(context.destination); source.start(); state.audioContext = context; state.ambientGain = gain;
    }
    state.audioContext.resume(); state.ambientOn = true; state.ambientGain.gain.linearRampToValueAtTime(.055, state.audioContext.currentTime + .6);
    if (state.sleepTimer?.type === "minutes") updateTimerUI();
    elements.ambient.classList.add("is-active"); elements.ambient.setAttribute("aria-label", "关闭环境声"); refreshIcons();
  }
  function stopAmbient() {
    if (state.ambientGain && state.audioContext) state.ambientGain.gain.linearRampToValueAtTime(0, state.audioContext.currentTime + .3);
    state.ambientOn = false; elements.ambient.classList.remove("is-active"); elements.ambient.setAttribute("aria-label", "开启环境声"); refreshIcons();
  }
  function jumpToTop() { if (window.matchMedia("(max-width:760px)").matches) elements.story.scrollIntoView({ block: "start" }); else elements.readingScroll.scrollTo({ top: 0, behavior: "smooth" }); }
  function jumpToCurrent() { scrollToSegmentIfNeeded($$(".story-segment", elements.storySegments)[state.segmentIndex]); }
  function jumpToBottom() { if (window.matchMedia("(max-width:760px)").matches) elements.sourceBoundary.scrollIntoView({ block: "end" }); else elements.readingScroll.scrollTo({ top: elements.readingScroll.scrollHeight, behavior: "smooth" }); }

  function bindEvents() {
    elements.continueButton.addEventListener("click", () => {
      const bookId = elements.continueButton.dataset.book;
      const saved = progressFor(safeRead(), bookId);
      showReader(Number(elements.continueButton.dataset.chapter), Number(elements.continueButton.dataset.segment), elements.continueButton.dataset.mode, { bookId, updateRoute: true, resumeTime: saved?.audioTime || 0 });
    });
    elements.bookGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-open-book]");
      if (!card) return;
      const saved = progressFor(safeRead(), card.dataset.openBook);
      const selected = books.find((item) => item.id === card.dataset.openBook) || books[0];
      const target = getSavedTarget(saved, selected);
      showReader(target.chapterIndex, target.segmentIndex, target.mode, { bookId: selected.id, updateRoute: true, resumeTime: saved?.audioTime || 0 });
    });
    elements.historyList.addEventListener("click", (event) => { const item = event.target.closest("[data-history-chapter]"); if (item) showReader(Number(item.dataset.historyChapter), Number(item.dataset.historySegment), item.dataset.historyMode, { bookId: item.dataset.historyBook, updateRoute: true }); });
    elements.libraryButton.addEventListener("click", () => { saveProgress(true); showLibrary(true); });
    elements.libraryTheme.addEventListener("click", () => setNightMode(!document.body.classList.contains("night-mode")));
    elements.importButton.addEventListener("click", () => setImportDialog(true));
    elements.importClose.addEventListener("click", () => setImportDialog(false));
    elements.importDone.addEventListener("click", () => setImportDialog(false));
    elements.importFile.addEventListener("change", () => handleImportFile(elements.importFile.files?.[0]));
    elements.importDropZone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); elements.importFile.click(); }
    });
    ["dragenter", "dragover"].forEach((type) => elements.importDropZone.addEventListener(type, (event) => {
      event.preventDefault(); if (!state.importBusy) elements.importDropZone.classList.add("is-dragging");
    }));
    ["dragleave", "dragend"].forEach((type) => elements.importDropZone.addEventListener(type, () => elements.importDropZone.classList.remove("is-dragging")));
    elements.importDropZone.addEventListener("drop", (event) => {
      event.preventDefault(); elements.importDropZone.classList.remove("is-dragging"); handleImportFile(event.dataTransfer?.files?.[0]);
    });
    elements.localBooksList.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-book]");
      if (removeButton) handleRemoveBook(removeButton.dataset.removeBook);
    });
    elements.planButton.addEventListener("click", () => setPlanDialog(true));
    elements.planSettings.addEventListener("click", () => setPlanDialog(true));
    elements.planContinue.addEventListener("click", () => {
      const root = safeRead() || emptyReaderState();
      const selected = books.find((item) => item.id === root.activeBookId) || books[0];
      const saved = progressFor(root, selected.id); const target = getSavedTarget(saved, selected);
      showReader(target.chapterIndex, target.segmentIndex, target.mode, { bookId: selected.id, updateRoute: true, resumeTime: saved?.audioTime || 0 });
    });
    elements.planClose.addEventListener("click", () => setPlanDialog(false));
    elements.planCancel.addEventListener("click", () => setPlanDialog(false));
    elements.notificationButton.addEventListener("click", requestPlanNotification);
    elements.planForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const plan = readPlan();
      plan.enabled = true; plan.time = elements.planTime.value || "20:30"; plan.days = elements.planDays.value;
      plan.goalMinutes = Number(elements.planGoal.value) || 15;
      writePlan(plan); setPlanDialog(false); renderLibrary();
      showToast(`阅读计划已保存：${planDaysLabel(plan.days)} ${plan.time}，${plan.goalMinutes} 分钟。`, 3600);
      window.setTimeout(schedulePlanReminder, 250);
    });
    elements.disablePlan.addEventListener("click", () => {
      const plan = readPlan(); plan.enabled = false; writePlan(plan);
      window.clearInterval(state.planReminderTick); state.planReminderTick = 0;
      setPlanDialog(false); renderLibrary(); showToast("每日阅读计划已关闭");
    });

    elements.storySegments.addEventListener("click", (event) => {
      const listen = event.target.closest("[data-listen-index]");
      if (listen) { event.stopPropagation(); const index = Number(listen.dataset.listenIndex); if (index === state.segmentIndex && state.playback !== "idle") toggleNarration(); else switchSegment(index, true, false); return; }
      const segment = event.target.closest(".story-segment"); if (segment) switchSegment(Number(segment.dataset.index), false, false);
    });
    elements.storySegments.addEventListener("keydown", (event) => { if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("story-segment")) { event.preventDefault(); switchSegment(Number(event.target.dataset.index), false, false); } });
    elements.modeTabs.addEventListener("click", (event) => { const tab = event.target.closest("[data-mode]"); if (tab) changeNarrativeMode(tab.dataset.mode); });
    elements.modeTabs.addEventListener("keydown", (event) => { if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); const delta = event.key === "ArrowRight" ? 1 : -1; const index = (modeKeys.indexOf(state.narrativeMode) + delta + modeKeys.length) % modeKeys.length; changeNarrativeMode(modeKeys[index]); $(`[data-mode="${modeKeys[index]}"]`, elements.modeTabs)?.focus(); });
    elements.firstUseHint.querySelector("button").addEventListener("click", () => { elements.firstUseHint.hidden = true; try { localStorage.setItem(HINT_KEY, "1"); } catch (_error) {} });
    elements.listenAll.addEventListener("click", toggleNarration);
    elements.timerButton.addEventListener("click", () => setTimerPanel(elements.timerPanel.hidden));
    elements.timerClose.addEventListener("click", () => setTimerPanel(false));
    elements.timerPanel.addEventListener("click", (event) => { const option = event.target.closest("[data-timer-option]"); if (option) setSleepTimer(option.dataset.timerOption); });
    elements.timerCancel.addEventListener("click", () => { clearSleepTimer("朗读定时已取消"); setTimerPanel(false); });
    elements.jumpTop.addEventListener("click", jumpToTop); elements.jumpCurrent.addEventListener("click", jumpToCurrent); elements.jumpBottom.addEventListener("click", jumpToBottom);
    elements.previous.addEventListener("click", () => moveChapter(-1)); elements.next.addEventListener("click", () => moveChapter(1));
    elements.theme.addEventListener("click", () => setNightMode(!document.body.classList.contains("night-mode")));
    elements.tocButton.addEventListener("click", () => setToc(elements.tocPanel.hidden)); elements.tocClose.addEventListener("click", () => setToc(false));
    elements.tocList.addEventListener("click", (event) => {
      const segment = event.target.closest("[data-toc-segment-index]");
      if (segment) { setToc(false); showReader(Number(segment.dataset.tocChapterIndex), Number(segment.dataset.tocSegmentIndex), state.narrativeMode, { updateRoute: true }); return; }
      const chapter = event.target.closest("[data-chapter-index]"); if (chapter) { setToc(false); showReader(Number(chapter.dataset.chapterIndex), 0, state.narrativeMode, { updateRoute: true }); }
    });
    elements.ambient.addEventListener("click", () => state.ambientOn ? stopAmbient() : startAmbient());
    elements.focus.addEventListener("click", () => setVisualFocus(!elements.shell.classList.contains("visual-focus"))); elements.focusExit.addEventListener("click", () => setVisualFocus(false));
    elements.fullscreen.addEventListener("click", async () => { try { if (!document.fullscreenElement) await elements.visualPane.requestFullscreen(); else await document.exitFullscreen(); } catch (_error) { showToast("浏览器未允许全屏显示。"); } });
    elements.stayButton.addEventListener("click", closeChapterEnd); elements.continueChapter.addEventListener("click", () => continueFromEnd(state.endTriggeredByAudio));

    elements.audio.addEventListener("timeupdate", () => { if (!Number.isFinite(elements.audio.duration) || elements.audio.duration <= 0) return; state.progress = elements.audio.currentTime / elements.audio.duration; updatePlayer(); saveProgress(false); });
    elements.audio.addEventListener("ended", () => { if (state.engine === "minimax" && state.playback !== "idle") advanceAfterEnd(); });
    elements.audio.addEventListener("error", () => { if (state.playback === "playing" && state.engine === "minimax") fallbackSpeakCurrent(); });
    window.addEventListener("hashchange", () => applyRoute(false));
    window.addEventListener("beforeunload", () => { planTrackingTick(true); saveProgress(true); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) stopPlanTracking(true); else { startPlanTracking(); checkPlanReminder(); } });
    document.addEventListener("keydown", (event) => {
      if (!elements.importOverlay.hidden) {
        if (event.key === "Escape") { event.preventDefault(); setImportDialog(false); return; }
        if (event.key === "Tab") {
          const focusable = $$('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]', elements.importOverlay);
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        return;
      }
      if (!elements.planOverlay.hidden) {
        if (event.key === "Escape") { event.preventDefault(); setPlanDialog(false); return; }
        if (event.key === "Tab") {
          const focusable = $$("button:not([disabled]),input:not([disabled]),select:not([disabled])", elements.planOverlay);
          const first = focusable[0]; const last = focusable[focusable.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
        return;
      }
      if (state.view !== "reader") return;
      if (event.key === "Escape") { if (!elements.chapterEnd.hidden) closeChapterEnd(); else if (!elements.timerPanel.hidden) setTimerPanel(false); else if (!elements.tocPanel.hidden) setToc(false); else if (elements.shell.classList.contains("visual-focus")) setVisualFocus(false); }
      if (event.ctrlKey && event.code === "Space") { event.preventDefault(); toggleNarration(); }
    });
    document.addEventListener("pointerdown", (event) => {
      if (!elements.chapterEnd.hidden && !event.target.closest(".chapter-end-card")) { clearCountdown(); updateCountdown(); }
      if (!elements.timerPanel.hidden && !event.target.closest("#timerPanel") && !event.target.closest("#timerButton")) setTimerPanel(false, false);
      if (!elements.importOverlay.hidden && event.target === elements.importOverlay) setImportDialog(false);
      if (!elements.planOverlay.hidden && event.target === elements.planOverlay) setPlanDialog(false);
    }, true);
  }

  function init() {
    const saved = safeRead();
    selectBook(saved?.activeBookId || books[0].id);
    elements.firstUseHint.hidden = (() => { try { return localStorage.getItem(HINT_KEY) === "1"; } catch (_error) { return false; } })();
    setNightMode(saved?.theme === "night");
    bindEvents(); updateTimerUI(); renderLibrary(); applyRoute(true); schedulePlanReminder(); refreshIcons();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
