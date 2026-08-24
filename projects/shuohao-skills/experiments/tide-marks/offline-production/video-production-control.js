(() => {
  "use strict";

  const STORE_KEY = "tide-marks.video-production-progress.v1";
  const rows = [...document.querySelectorAll("tbody tr[data-segment]")];
  const rowById = new Map(rows.map((row) => [row.dataset.segment, row]));
  const q = document.querySelector("#q");
  const ep = document.querySelector("#ep");
  const priority = document.querySelector("#priority");
  const statusFilter = document.querySelector("#status-filter");
  const count = document.querySelector("#count");
  const dialog = document.querySelector("#record-dialog");
  const form = document.querySelector("#record-form");
  const videoPicker = document.querySelector("#video-picker");
  const progressPicker = document.querySelector("#progress-picker");
  const toast = document.querySelector("#toast");
  let activeSegment = "";
  let toastTimer = 0;

  function defaultsFor(row) {
    return {
      status: row.dataset.baseStatus || "待生成",
      qc: row.dataset.baseQc || "未开始",
      rework: Number(row.dataset.baseRework || 0),
      video: row.dataset.baseVideo || "",
      updated: row.dataset.baseUpdated || "",
      notes: row.dataset.baseNotes || "",
      fileSize: 0,
      fileLastModified: 0,
    };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  let progress = loadProgress();

  function recordFor(id) {
    const row = rowById.get(id);
    return { ...defaultsFor(row), ...(progress[id] || {}) };
  }

  function saveRecord(id, values) {
    progress[id] = { ...recordFor(id), ...values };
    localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    renderAll();
  }

  function toneFor(value) {
    if (["QC通过", "通过"].includes(value)) return "pass";
    if (["生成中", "待质检", "待检查", "已有H3演示"].includes(value)) return "active";
    if (["需返工"].includes(value)) return "fail";
    if (["不采用"].includes(value)) return "warn";
    return "neutral";
  }

  function setPill(element, value) {
    element.textContent = value;
    element.dataset.tone = toneFor(value);
  }

  function renderRow(row) {
    const item = recordFor(row.dataset.segment);
    row.dataset.status = item.status;
    row.dataset.qc = item.qc;
    setPill(row.querySelector("[data-field='status']"), item.status);
    setPill(row.querySelector("[data-field='qc']"), item.qc);
    const file = row.querySelector("[data-field='video']");
    file.replaceChildren();
    if (item.video && item.video.includes("/")) {
      const link = document.createElement("a");
      link.href = `../${item.video}`;
      link.textContent = item.video.split("/").at(-1);
      link.title = `播放 ${item.video}`;
      file.append(link);
    } else {
      file.textContent = item.video || "尚未登记";
      file.title = item.video || "";
    }
    row.querySelector("[data-field='updated']").textContent = item.updated ? `更新：${item.updated}` : "";
  }

  function applyFilters() {
    const query = q.value.trim().toLowerCase();
    let visible = 0;
    for (const row of rows) {
      const item = recordFor(row.dataset.segment);
      const searchable = `${row.textContent} ${item.video} ${item.notes}`.toLowerCase();
      const ok = (!query || searchable.includes(query))
        && (ep.value === "all" || row.dataset.episode === ep.value)
        && (priority.value === "all" || row.dataset.priority === priority.value)
        && (statusFilter.value === "all" || item.status === statusFilter.value);
      row.hidden = !ok;
      if (ok) visible += 1;
    }
    count.textContent = `${visible} 段`;
  }

  function updateSummary() {
    const records = rows.map((row) => ({ id: row.dataset.segment, continuity: row.dataset.continuity || "待验证", ...recordFor(row.dataset.segment) }));
    const hasVideo = records.filter((item) => item.video || !["待生成", "生成中"].includes(item.status)).length;
    const passed = records.filter((item) => item.qc === "通过" || item.status === "QC通过").length;
    const rework = records.filter((item) => item.qc === "需返工" || item.status === "需返工").length;
    const next = records.find((item) => item.status === "需返工" && item.id !== "E02-01")
      || records.find((item) => item.status === "待生成" && item.continuity !== "阻断" && item.id !== "E02-01");
    document.querySelector("#generated-count").textContent = `${hasVideo}/${rows.length}`;
    document.querySelector("#qc-count").textContent = `${passed}/${rows.length}`;
    document.querySelector("#rework-count").textContent = String(rework);
    const nextElement = document.querySelector("#next-segment");
    nextElement.textContent = next ? next.id : records.some((item) => item.continuity === "阻断") ? "先修衔接" : "已完成";
    nextElement.dataset.segment = next?.id || "";
  }

  function renderAll() {
    rows.forEach(renderRow);
    updateSummary();
    applyFilters();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 5200);
  }

  function openDialog(id) {
    activeSegment = id;
    const item = recordFor(id);
    document.querySelector("#dialog-title").textContent = `${id} · 登记生成结果`;
    form.elements.status.value = item.status;
    form.elements.qc.value = item.qc;
    form.elements.rework.value = item.rework;
    form.elements.video.value = item.video;
    form.elements.notes.value = item.notes;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function todayStamp() {
    return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).replaceAll("/", "-");
  }

  function normalizeSegment(fileName) {
    const match = fileName.match(/E\d{2}[-_]\d{2}/i);
    return match ? match[0].toUpperCase().replace("_", "-") : "";
  }

  function importVideos(files) {
    const newest = new Map();
    const unmatched = [];
    for (const file of files) {
      const id = normalizeSegment(file.name);
      if (!id || !rowById.has(id)) { unmatched.push(file.name); continue; }
      const prior = newest.get(id);
      if (!prior || file.lastModified >= prior.lastModified) newest.set(id, file);
    }
    for (const [id, file] of newest) {
      const current = recordFor(id);
      saveRecord(id, {
        status: current.status === "QC通过" ? "QC通过" : "待质检",
        qc: current.qc === "通过" ? "通过" : "待检查",
        video: file.name,
        updated: todayStamp(),
        fileSize: file.size,
        fileLastModified: file.lastModified,
      });
    }
    const parts = [`已匹配并登记 ${newest.size} 段`];
    if (unmatched.length) parts.push(`${unmatched.length} 个文件未找到 E01-01 形式的段号`);
    if (!files.length) parts[0] = "没有选择视频文件";
    showToast(parts.join("；"));
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportProgress() {
    const payload = {
      schemaVersion: 1,
      project: "tide-marks",
      exportedAt: new Date().toISOString(),
      records: Object.fromEntries(rows.map((row) => [row.dataset.segment, recordFor(row.dataset.segment)])),
    };
    download("tide-marks-video-progress.json", `${JSON.stringify(payload, null, 2)}\n`, "application/json");
    showToast("进度 JSON 已导出。请保留它，清理浏览器数据后可重新导入恢复。");
  }

  async function importProgressFile(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.project !== "tide-marks" || !payload.records || typeof payload.records !== "object") throw new Error("格式不符");
      const imported = {};
      for (const [id, values] of Object.entries(payload.records)) {
        if (rowById.has(id) && values && typeof values === "object") imported[id] = values;
      }
      progress = { ...progress, ...imported };
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
      renderAll();
      showToast(`已恢复 ${Object.keys(imported).length} 段进度。`);
    } catch {
      showToast("导入失败：请选择由本页面导出的 tide-marks-video-progress.json。 ");
    }
  }

  q.addEventListener("input", applyFilters);
  ep.addEventListener("change", applyFilters);
  priority.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
  document.querySelector("#pick-videos").addEventListener("click", () => videoPicker.click());
  document.querySelector("#export-progress").addEventListener("click", exportProgress);
  document.querySelector("#import-progress").addEventListener("click", () => progressPicker.click());
  videoPicker.addEventListener("change", () => { importVideos([...videoPicker.files]); videoPicker.value = ""; });
  progressPicker.addEventListener("change", () => { if (progressPicker.files[0]) importProgressFile(progressPicker.files[0]); progressPicker.value = ""; });
  document.querySelector("#next-segment").addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.segment;
    if (!id) return;
    rowById.get(id).scrollIntoView({ behavior: "smooth", block: "center" });
    openDialog(id);
  });
  document.querySelector("tbody").addEventListener("click", (event) => {
    const button = event.target.closest("button[data-edit]");
    if (button) openDialog(button.dataset.edit);
  });
  document.querySelector("#dialog-close").addEventListener("click", closeDialog);
  document.querySelector("#dialog-cancel").addEventListener("click", closeDialog);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const current = recordFor(activeSegment);
    if ((values.qc === "通过" || values.status === "QC通过") && !values.video.trim()) {
      showToast("请先登记采用视频文件名，再标记 QC 通过。");
      form.elements.video.focus();
      return;
    }
    if (values.qc === "通过") values.status = "QC通过";
    if (values.qc === "需返工") values.status = "需返工";
    if (values.video.trim() && values.status === "待生成") values.status = "待质检";
    saveRecord(activeSegment, {
      ...current,
      status: values.status,
      qc: values.qc,
      rework: Math.max(0, Number(values.rework || 0)),
      video: values.video.trim(),
      notes: values.notes.trim(),
      updated: todayStamp(),
    });
    closeDialog();
    showToast(`${activeSegment} 已更新并保存在当前浏览器。`);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });

  renderAll();
})();
