#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const out = path.join(root, "offline-production");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const script = JSON.parse(fs.readFileSync(path.join(root, "script", "潮痕-script.json"), "utf8"));
const cast = JSON.parse(fs.readFileSync(path.join(root, "characters", "潮痕-cast.json"), "utf8"));
const scriptByEp = new Map(script.episodes.map((episode) => [episode.ep, episode]));
const castById = new Map(cast.characters.map((item) => [item.id, item.name]));
const provenancePath = path.join(root, "frame-generation-provenance.json");
const provenance = fs.existsSync(provenancePath) ? JSON.parse(fs.readFileSync(provenancePath, "utf8")) : [];
const provenanceByFrame = new Map(provenance.map((item) => [`${item.segment}/f${item.frame}`, item]));
const qcOverridesPath = path.join(root, "frame-qc-overrides.json");
const qcOverrides = fs.existsSync(qcOverridesPath) ? JSON.parse(fs.readFileSync(qcOverridesPath, "utf8")) : { segments: [] };
const storyboardSegments = storyboard.episodes.flatMap((episode) => episode.segments);
const storyboardSegmentById = new Map(storyboardSegments.map((segment) => [segment.id, segment]));
const qcOverrideByFrame = new Map();
for (const segmentOverride of qcOverrides.segments || []) {
  const segment = storyboardSegmentById.get(segmentOverride.id);
  if (!segment) throw new Error(`QC 覆盖项引用了不存在的段：${segmentOverride.id}`);
  for (let frame = 1; frame <= segment.cuts.length; frame += 1) {
    const frameOverride = segmentOverride.frames?.[String(frame)] || {};
    qcOverrideByFrame.set(`${segmentOverride.id}/f${frame}`, {
      referenceBinding: segmentOverride.referenceBinding,
      ...(segmentOverride.default || {}),
      ...frameOverride,
    });
  }
}
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""').replaceAll("\r", " ").replaceAll("\n", " ")}"`;
const fmt = (seconds) => Number(seconds.toFixed(3));
const srtTime = (seconds) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const rest = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(rest).padStart(3, "0")}`;
};
const duration = (segment) => segment.cuts.reduce((sum, cut) => sum + cut.seconds, 0);
const dialogueFor = (flow) => flow.filter((item) => item.line);

fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.join(out, "subtitles"), { recursive: true });
fs.mkdirSync(path.join(out, "timelines"), { recursive: true });

const dialogueRows = [["集", "段", "镜", "集内开始秒", "集内结束秒", "角色", "表演提示", "台词", "状态"]];
const soundRows = [["集", "段", "开始秒", "结束秒", "场景", "环境声/拟音中文建议", "音乐中文建议", "状态"]];
const frameRows = [["段", "镜", "文件", "状态", "已知生成方式", "参考图绑定", "人物/道具一致性", "后续动作"]];
const reviewedFrameRows = [];
let totalShotPrompts = 0;

for (const episode of storyboard.episodes) {
  const scriptEpisode = scriptByEp.get(episode.ep);
  let episodeCursor = 0;
  let subtitleIndex = 1;
  const srt = [];
  const timelineRows = [["集", "段", "镜", "集内开始秒", "集内结束秒", "设计时长", "H3兜底生成时长", "首帧", "可选尾帧", "中文内容", "剪辑备注"]];

  for (const segment of episode.segments) {
    const segmentStart = episodeCursor;
    const segmentDuration = duration(segment);
    const scriptScene = scriptEpisode.scenes[segment.sceneIndex - 1];
    const soundscape = `按画面动作同步拟音：${segment.cuts.map((cut) => cut.descriptionZh).join("；")}`;
    const music = `以克制的悬疑氛围为主，保持对白清晰；在 ${segment.id} 结尾根据下一段转折做弱收束或悬停。`;
    soundRows.push([episode.ep, segment.id, fmt(segmentStart), fmt(segmentStart + segmentDuration), segment.sceneZh || scriptScene.sceneId, soundscape, music, "待配音剪辑阶段确认"]);
    const shotGuide = [
      `# ${segment.id} · 逐镜视频兜底生成说明`, "",
      "本目录用于段级多图生成失败时的兜底方案。优先仍使用本段 `chatart-prompt.txt` 一次生成整段；只有人物漂移、切点失控或道具错误时，才逐镜生成。", "",
      "## 使用规则", "",
      "1. 每镜以对应的 `fN.png` 作为首帧。",
      "2. 首尾帧模式与尾裁模式二选一：需要精确衔接时，可把下一张 `f(N+1).png` 设为尾帧；若准备从生成视频尾部直接裁短，则不要上传下一张图作为精确尾帧。",
      "3. H3 按整数秒生成。生成时长长于设计时长且使用了精确尾帧时，必须把整段均匀变速到设计时长，保留最后一帧，禁止从尾部裁掉它；工具无法整段变速时，改用仅首帧生成。",
      "4. 仅首帧模式可以在动作完成点尾裁到设计时长；裁完后再用下一张关键帧检查人物、道具和构图衔接。",
      "5. 每镜提示词在 `shot-video-prompts/fN.txt`；文件顺序与镜号严格一致。", "",
      "| 镜号 | 首帧 | 可选尾帧 | 设计时长 | 生成时长 | 时长处理 | 中文内容 |", "| ---: | --- | --- | ---: | ---: | --- | --- |",
    ];
    const shotDir = path.join(pack, segment.id, "shot-video-prompts");
    fs.mkdirSync(shotDir, { recursive: true });
    let cutCursor = 0;
    segment.cuts.forEach((cut, cutIndex) => {
      const absoluteStart = segmentStart + cutCursor;
      const absoluteEnd = absoluteStart + cut.seconds;
      const flow = scriptScene.flow.slice(cut.beats[0] - 1, cut.beats[1]);
      const dialogues = dialogueFor(flow);
      const generationSeconds = Math.max(4, Math.ceil(cut.seconds));
      const firstFrame = path.join(pack, segment.id, `f${cutIndex + 1}.png`);
      const lastFrame = cutIndex < segment.cuts.length - 1 ? path.join(pack, segment.id, `f${cutIndex + 2}.png`) : "";
      const lines = dialogues.map((item) => `<d>[Chinese] ${item.line}</d>`).join(" ");
      const prompt = [
        `Use f${cutIndex + 1}.png as the exact first frame and identity/style reference.`,
        `Create one continuous ${generationSeconds}-second cinematic shot with no internal cuts.`,
        `Visual target: ${cut.frame}`,
        `Animate this story action naturally: ${cut.descriptionZh}`,
        `Camera: ${cut.camera}; preserve the original 16:9 composition, faces, clothing, environment anchors and prop geometry.`,
        `Motion must be restrained and physically plausible; no extra people, no face morphing, no object redesign, no subtitles, no visible text, no watermark.`,
        lines ? `Spoken dialogue: ${lines}` : "No spoken dialogue; use only scene-appropriate ambience and synchronized foley.",
        lastFrame ? `Optional continuity mode: if the platform supports a last-frame image, use f${cutIndex + 2}.png only as the exact end-frame target. If used, preserve that generated final frame in post by keeping the full duration or uniformly retiming the whole clip; never remove it with a tail trim.` : "End on a stable composition suitable for the end of this segment.",
      ].join("\n");
      fs.writeFileSync(path.join(shotDir, `f${cutIndex + 1}.txt`), `${prompt}\n`, "utf8");
      totalShotPrompts += 1;
      const durationStrategy = generationSeconds > cut.seconds
        ? (lastFrame
          ? `使用尾帧：整段匀速变速到 ${cut.seconds}s，禁止尾裁；仅首帧：可在动作完成点尾裁`
          : `在动作完成点尾裁到 ${cut.seconds}s`)
        : (lastFrame ? "可保留精确尾帧，无需裁切" : "按设计时长输出");
      shotGuide.push(`| ${cutIndex + 1} | f${cutIndex + 1}.png | ${lastFrame ? `f${cutIndex + 2}.png` : "无"} | ${cut.seconds}s | ${generationSeconds}s | ${durationStrategy} | ${cut.descriptionZh} |`);
      timelineRows.push([episode.ep, segment.id, cutIndex + 1, fmt(absoluteStart), fmt(absoluteEnd), cut.seconds, generationSeconds, firstFrame, lastFrame, cut.descriptionZh, durationStrategy]);

      if (dialogues.length) {
        const slot = cut.seconds / dialogues.length;
        dialogues.forEach((item, dialogueIndex) => {
          const start = absoluteStart + dialogueIndex * slot + Math.min(0.2, slot * 0.1);
          const end = Math.max(start + 0.6, absoluteStart + (dialogueIndex + 1) * slot - Math.min(0.2, slot * 0.1));
          const speaker = castById.get(item.speaker) || (item.speaker === "VO" ? "画外音" : item.speaker);
          srt.push(String(subtitleIndex++), `${srtTime(start)} --> ${srtTime(Math.min(end, absoluteEnd))}`, item.line, "");
          dialogueRows.push([episode.ep, segment.id, cutIndex + 1, fmt(start), fmt(Math.min(end, absoluteEnd)), speaker, item.delivery || "按剧情自然表达", item.line, "时间为分镜自动草稿，待真人/模型配音后回校"]);
        });
      }

      const exists = fs.existsSync(firstFrame);
      const pureTextBatch = episode.ep === 2 && Number(segment.id.split("-")[1]) >= 4;
      const provenanceEntry = provenanceByFrame.get(`${segment.id}/f${cutIndex + 1}`);
      const qcOverride = qcOverrideByFrame.get(`${segment.id}/f${cutIndex + 1}`);
      const fallbackReferenceBinding = provenanceEntry ? `已挂载 ${provenanceEntry.references.length} 张参考图` : (pureTextBatch ? "未真正挂载参考图；文字复述设定" : (exists ? "待核验" : "生成时必须按 frame-prompts 顺序挂载"));
      const fallbackConsistency = provenanceEntry?.qc || (exists ? "待统一复核" : "生成后复核");
      const fallbackAction = provenanceEntry ? `实际提示词：${provenanceEntry.promptFile}` : (exists ? "检查脸型/服装/场景锚点/关键道具后标记通过" : "按 frame-prompts 生成并保存实际提示词与来源");
      frameRows.push([
        segment.id, cutIndex + 1, firstFrame, exists ? "已存在" : "待生成",
        exists ? (provenanceEntry?.mode || (pureTextBatch ? "Codex 内置图像生成·纯文本模式" : "历史素材，精确来源待补录")) : "尚未生成",
        qcOverride?.referenceBinding || fallbackReferenceBinding,
        qcOverride?.consistency || fallbackConsistency,
        qcOverride?.action || fallbackAction,
      ]);
      const reviewConsistency = qcOverride?.consistency || provenanceEntry?.qc;
      if (/^(通过|需返工)/.test(String(reviewConsistency || ""))) {
        reviewedFrameRows.push({
          episode: episode.ep,
          segment: segment.id,
          frame: cutIndex + 1,
          passed: String(reviewConsistency).startsWith("通过"),
          consistency: reviewConsistency,
          action: qcOverride?.action || fallbackAction,
        });
      }
      cutCursor += cut.seconds;
    });
    fs.writeFileSync(path.join(pack, segment.id, "SHOT-VIDEO-FALLBACK.zh-CN.md"), `${shotGuide.join("\n")}\n`, "utf8");
    episodeCursor += segmentDuration;
  }
  fs.writeFileSync(path.join(out, "subtitles", `E${String(episode.ep).padStart(2, "0")}-draft.zh-CN.srt`), `${srt.join("\n")}\n`, "utf8");
  fs.writeFileSync(path.join(out, "timelines", `E${String(episode.ep).padStart(2, "0")}-edit-timeline.csv`), `${timelineRows.map((row) => row.map(csv).join(",")).join("\n")}\n`, "utf8");
}

fs.writeFileSync(path.join(out, "dialogue-cues.csv"), `${dialogueRows.map((row) => row.map(csv).join(",")).join("\n")}\n`, "utf8");
fs.writeFileSync(path.join(out, "sound-music-cues.csv"), `${soundRows.map((row) => row.map(csv).join(",")).join("\n")}\n`, "utf8");
fs.writeFileSync(path.join(out, "frame-qc-registry.csv"), `${frameRows.map((row) => row.map(csv).join(",")).join("\n")}\n`, "utf8");

if (reviewedFrameRows.length) {
  const passed = reviewedFrameRows.filter((item) => item.passed);
  const failed = reviewedFrameRows.filter((item) => !item.passed);
  const allFrameRows = frameRows.slice(1);
  const existingFrameRows = allFrameRows.filter((row) => row[3] === "已存在");
  const allPassedFrameRows = existingFrameRows.filter((row) => String(row[6] || "").startsWith("通过"));
  const allReworkFrameRows = existingFrameRows.filter((row) => String(row[6] || "").startsWith("需返工"));
  const allPendingReviewFrameRows = existingFrameRows.filter((row) => !/^(通过|需返工)/.test(String(row[6] || "")));
  const rowsBySegment = new Map();
  for (const row of allFrameRows) {
    if (!rowsBySegment.has(row[0])) rowsBySegment.set(row[0], []);
    rowsBySegment.get(row[0]).push(row);
  }
  const readyAllSegments = [...rowsBySegment.values()].filter((rows) =>
    rows.every((row) => row[3] === "已存在" && String(row[6] || "").startsWith("通过")),
  ).length;
  const segmentSummaries = [...new Set(reviewedFrameRows.map((item) => item.segment))].sort().map((segmentId) => {
    const rows = rowsBySegment.get(segmentId) || [];
    const passedCount = rows.filter((row) => String(row[6] || "").startsWith("通过")).length;
    const reworkCount = rows.filter((row) => String(row[6] || "").startsWith("需返工")).length;
    const pendingReviewCount = rows.filter((row) => row[3] === "已存在" && !/^(通过|需返工)/.test(String(row[6] || ""))).length;
    const missingCount = rows.filter((row) => row[3] !== "已存在").length;
    const ready = rows.length > 0 && passedCount === rows.length;
    const conclusion = ready ? "整段通过" : reworkCount ? `返工 ${reworkCount} 张` : pendingReviewCount ? `待复核 ${pendingReviewCount} 张` : `缺图 ${missingCount} 张`;
    return { segmentId, passedCount, total: rows.length, ready, conclusion };
  });
  const overviewEpisodes = [...new Set(segmentSummaries.map((item) => item.segmentId.slice(1, 3)))];
  const overviewLinks = overviewEpisodes.map((episode) => `\`qc-contact-sheets/E${episode}-overview.jpg\``).join("、");
  const report = [
    "# 《潮痕》全局关键帧人工 QC 报告", "",
    `复核日期：${qcOverrides.reviewedAt || "未记录"}  `,
    `范围：${qcOverrides.reviewScope || "历史关键帧"}  `,
    `结论：${reviewedFrameRows.length} 张已复核，${passed.length} 张通过，${failed.length} 张需返工；已纳入的 ${segmentSummaries.filter((item) => item.ready).length}/${segmentSummaries.length} 段可直接进入视频生成。`, "",
    `全剧当前状态：${allPassedFrameRows.length}/${allFrameRows.length} 张 QC 通过，${allReworkFrameRows.length} 张需返工，${allPendingReviewFrameRows.length} 张已有图片但待复核，${allFrameRows.length - existingFrameRows.length} 张未生成；${readyAllSegments}/${rowsBySegment.size} 段图片齐全且通过。`, "",
    "## 判定口径", "",
    ...(qcOverrides.criteria || []).map((item) => `- ${item}`), "",
    "“通过”表示当前图可作为视频首帧或多图参考；“需返工”表示图虽存在，但会把错误人物、空间、道具或口型带进视频，不计入投产就绪。", "",
    "## 分段结果", "",
    "| 段 | 通过图片 | 结论 | 联系表 |", "| --- | ---: | --- | --- |",
    ...segmentSummaries.map((item) => `| ${item.segmentId} | ${item.passedCount}/${item.total} | ${item.conclusion} | [打开](qc-contact-sheets/${item.segmentId}.jpg) |`), "",
    "## 必须返工的图片", "",
    ...(failed.length
      ? failed.map((item) => `- **${item.segment}/f${item.frame}**：${item.consistency.replace(/^需返工：/, "")}  \n  建议：${item.action}`)
      : [`- 无。本报告已纳入的 ${reviewedFrameRows.length} 张关键帧全部通过。`]), "",
    "## 使用说明", "",
    "1. 后期批量生成视频时，只投产本报告标记为“整段通过”的段。",
    failed.length
      ? "2. 对存在返工镜头的段，先按建议重做对应图片，再运行完整构建更新 QC 数字。"
      : `2. 当前没有返工镜头；下一步按主入口顺序补齐剩余 ${allFrameRows.length - existingFrameRows.length} 张未生成关键帧，并逐张记录参考图与实际提示词。`,
    "3. E02-04 至 E02-10 的旧纯文本批次已经参考图条件修复并归档；后续只使用当前正式 fN.png，不要把 rejected-originals 中的旧图重新导入视频工具。",
    `4. 逐张机器可读状态见 \`frame-qc-registry.csv\`；当前已审集数总览见 ${overviewLinks}；返工前后对照见 \`qc-contact-sheets/E01-repair-candidates.jpg\` 与 \`qc-contact-sheets/E02-repair-candidates.jpg\`。`, "",
  ];
  fs.writeFileSync(path.join(out, "IMAGE-QC-REPORT.zh-CN.md"), `${report.join("\n")}\n`, "utf8");
}

const readme = [
  "# 《潮痕》离线预生产资料包", "",
  "这个目录不需要视频生成工具。它把后期统一生成与拼接所需的信息先固定下来。", "",
  "## 已生成内容", "",
  "- `timelines/`：6 集逐镜剪辑时间线，包含设计时长、H3 兜底时长、首尾帧和裁切备注。",
  "- `subtitles/`：6 集中文字幕草稿 SRT；时间来自分镜自动分配，配音后必须回校。",
  "- `dialogue-cues.csv`：全剧配音台账，含人物、情绪和建议时间。",
  "- `sound-music-cues.csv`：59 段环境声、拟音和音乐中文建议。",
  "- `frame-qc-registry.csv`：193 张关键帧的存在状态、已知来源和逐张一致性结论。",
  "- `IMAGE-QC-REPORT.zh-CN.md`：全部已生成图片的中文人工复核结论、返工清单与联系表入口。",
  "- `continuity-audit.html`：58 个上一段尾帧与下一段首帧的并排审计、风险等级和修复契约。",
  "- `video-production-control.html`：59 段视频批次、成本、状态和直达文件的中文控制页。",
  "- `video-production-tracker.csv`：可持续填写且重建时保留状态的 59 段生成/QC/返工台账。",
  "- `MASTER-EDIT-TIMELINE.csv`：跨 6 集的 193 镜统一剪辑时间线。",
  "- `POST-PRODUCTION-OVERLAYS.csv` 与 `overlays/`：精确文字、屏幕跟踪和可选回执边界。",
  "- 每段 `shot-video-prompts/`：逐镜视频生成兜底提示词。",
  "- 每段 `SHOT-VIDEO-FALLBACK.zh-CN.md`：中文导入与裁切说明。", "",
  "## 后期使用顺序", "",
  "1. 先打开 `continuity-audit.html`，处理所有“阻断投产”的相邻接点；E01-01 v01 保留为失败证据。",
  "2. 衔接修复后，按段使用 `storyboard-full-pack/E??-??/chatart-prompt.txt` 和严格上传顺序生成。",
  "3. 每段生成后立即填写 `video-production-tracker.csv`，并连播上一段尾 2 秒与下一段首 2 秒；段内和接点都通过后才采用。",
  "4. 只有失败段才改用 `shot-video-prompts/fN.txt` 逐镜生成；返工版本使用 v02、v03，禁止覆盖旧文件。",
  "5. 按 `MASTER-EDIT-TIMELINE.csv` 回切到设计时长；不能直接把 H3 整数时长顺序拼接。",
  "6. 导入 `subtitles/`，再根据最终配音波形校正字幕点；依据声音表和后期叠加表完成声音、文字跟踪与最终验收。", "",
  "## 重要说明", "",
  `字幕时间、声音建议和逐镜兜底提示词属于可执行初稿，不等于最终艺术审定。当前 ${reviewedFrameRows.length} 张已生成图片已纳入统一人工 QC；通过与返工结果见 \`IMAGE-QC-REPORT.zh-CN.md\`。`, "",
];
fs.writeFileSync(path.join(out, "README.zh-CN.md"), `${readme.join("\n")}\n`, "utf8");
console.log(`✓ 离线预生产资料：6 集时间线、6 份 SRT、${dialogueRows.length - 1} 条对白、59 段声音表、${totalShotPrompts} 份逐镜视频兜底提示词`);
