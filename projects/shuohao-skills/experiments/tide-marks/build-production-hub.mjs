#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const upstream = path.join(root, "..", "..", "upstream", "skills");
const characterTool = path.join(upstream, "novel-characters", "scripts", "novel-characters.mjs");
const artTool = path.join(upstream, "novel-art", "scripts", "novel-art.mjs");

function renderReferenceReport(tool, cwd, args, destination) {
  const result = spawnSync(process.execPath, [tool, ...args], { cwd, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `failed to render ${destination}`);
  fs.writeFileSync(path.join(cwd, destination), result.stdout, "utf8");
}

renderReferenceReport(characterTool, path.join(root, "characters"), ["render", "潮痕-cast.json", "--html", "--source", "潮痕", "--images", "images"], "report.html");
renderReferenceReport(artTool, path.join(root, "art"), ["render", "潮痕-art.json", "--html", "--lang", "zh"], "art-report.html");

const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const cast = JSON.parse(fs.readFileSync(path.join(root, "characters", "潮痕-cast.json"), "utf8"));
const art = JSON.parse(fs.readFileSync(path.join(root, "art", "潮痕-art.json"), "utf8"));
const importManifest = JSON.parse(fs.readFileSync(path.join(pack, "chatart-import-manifest.json"), "utf8"));
const importById = new Map(importManifest.map((item) => [item.segment, item]));
const continuityPath = path.join(root, "offline-production", "continuity-boundary-audit.json");
if (!fs.existsSync(continuityPath)) throw new Error("缺少段间衔接审计；请先运行 build-continuity-audit.mjs");
const continuityAudit = JSON.parse(fs.readFileSync(continuityPath, "utf8"));
const storyLogicPath = path.join(root, "offline-production", "story-logic-audit.json");
if (!fs.existsSync(storyLogicPath)) throw new Error("缺少故事逻辑审计；请先运行 build-story-logic-audit.mjs");
const storyLogicAudit = JSON.parse(fs.readFileSync(storyLogicPath, "utf8"));
const incomingBoundaryBySegment = new Map(continuityAudit.boundaries.map((item) => [item.nextSegment, item]));
const outgoingBoundaryBySegment = new Map(continuityAudit.boundaries.map((item) => [item.previousSegment, item]));
const qcRegistryPath = path.join(root, "offline-production", "frame-qc-registry.csv");
const qcByFrame = new Map();
let qcReworkFrames = 0;
let qcPendingFrames = 0;
let qcHistoricalReviewedFrames = 0;
let qcHistoricalPassedFrames = 0;
if (fs.existsSync(qcRegistryPath)) {
  const rows = fs.readFileSync(qcRegistryPath, "utf8").trim().split(/\r?\n/).slice(1);
  for (const line of rows) {
    const fields = line.startsWith('"') && line.endsWith('"') ? line.slice(1, -1).split('\",\"').map((value) => value.replaceAll('""', '"')) : line.split(",");
    const [segmentId, frameNumber, , fileState, , , consistency] = fields;
    const consistencyText = String(consistency || "");
    const passed = consistencyText.startsWith("通过");
    const rework = consistencyText.startsWith("需返工");
    const pending = fileState === "已存在" && !passed && !rework;
    qcByFrame.set(`${segmentId}/f${frameNumber}`, passed ? "pass" : rework ? "rework" : pending ? "pending" : "missing");
    if (rework) qcReworkFrames += 1;
    if (pending) qcPendingFrames += 1;
    if (/^E0[12]-/.test(segmentId) && (passed || rework)) {
      qcHistoricalReviewedFrames += 1;
      if (passed) qcHistoricalPassedFrames += 1;
    }
  }
}

const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const isFile = (file) => fs.existsSync(file) && fs.statSync(file).isFile();
const realH3Files = [
  path.join(root, "generated-videos", "E01-01", "E01-01-v01.mp4"),
  path.join(root, "generated-videos", "E01-02", "E01-02-v01.mp4"),
  path.join(root, "storyboard-ep2-pack", "E02-01", "e02-01-generated-chatart-h3-768p.mp4"),
];
const imageFiles = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => /\.(png|jpe?g|webp)$/i.test(file)) : [];
const hasNamedSheet = (dir, name) => imageFiles(dir).some((file) => file === `${name}-sheet.png` || file.startsWith(`${name}-sheet.`) || file.startsWith(`${name}-`) && file.includes("-sheet"));

const characterImageDir = path.join(root, "characters", "images");
const artImageDir = path.join(root, "art", "images");
const references = [
  ...cast.characters.map((item) => ({ type: "角色", name: item.name, ready: hasNamedSheet(characterImageDir, item.name), report: "characters/report.html" })),
  ...art.scenes.map((item) => ({ type: "场景", name: item.name, ready: hasNamedSheet(artImageDir, item.name), report: "art/art-report.html" })),
  ...art.props.map((item) => ({ type: "道具", name: item.name, ready: hasNamedSheet(artImageDir, item.name), report: "art/art-report.html" })),
];

const segments = storyboard.episodes.flatMap((episode) => episode.segments.map((segment) => {
  const dir = path.join(pack, segment.id);
  const frameCount = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => /^f\d+\.png$/i.test(file)).length : 0;
  const expectedFrames = segment.cuts.length;
  const qcPassedFrames = segment.cuts.filter((_, index) => qcByFrame.get(`${segment.id}/f${index + 1}`) === "pass").length;
  const qcReworkCount = segment.cuts.filter((_, index) => qcByFrame.get(`${segment.id}/f${index + 1}`) === "rework").length;
  const qcPendingCount = segment.cuts.filter((_, index) => qcByFrame.get(`${segment.id}/f${index + 1}`) === "pending").length;
  const item = importById.get(segment.id);
  const adjacentBoundaries = [incomingBoundaryBySegment.get(segment.id), outgoingBoundaryBySegment.get(segment.id)].filter(Boolean);
  const continuityState = adjacentBoundaries.some((boundary) => boundary.risk === "高")
    ? "blocked"
    : adjacentBoundaries.some((boundary) => boundary.risk === "中") ? "verify" : "direct";
  const materialReady = frameCount === expectedFrames && qcPassedFrames === expectedFrames && segment.semanticReviewed === true;
  const files = {
    readme: isFile(path.join(dir, "README.zh-CN.md")),
    prompt: isFile(path.join(dir, "prompt.md")),
    chatart: isFile(path.join(dir, "chatart-prompt.txt")),
    upload: isFile(path.join(dir, "UPLOAD-ORDER.md")),
    import: isFile(path.join(dir, "import.json")),
    framePrompts: segment.cuts.filter((_, index) => isFile(path.join(dir, "frame-prompts", `f${index + 1}.md`))).length,
    shotVideoPrompts: segment.cuts.filter((_, index) => isFile(path.join(dir, "shot-video-prompts", `f${index + 1}.txt`))).length,
  };
  return {
    id: segment.id,
    episode: episode.ep,
    scene: segment.sceneZh || item?.scene?.name || segment.scene || "未标注场景",
    lighting: segment.lightingZh || item?.scene?.lighting || "",
    seconds: segment.durationSeconds || item?.designSeconds || segment.cuts.reduce((sum, cut) => sum + cut.seconds, 0),
    cuts: expectedFrames,
    frameCount,
    missing: expectedFrames - frameCount,
    ready: frameCount === expectedFrames,
    semanticReviewed: segment.semanticReviewed === true,
    semanticReviewedAt: segment.semanticReviewedAt || "",
    qcPassedFrames,
    qcReworkCount,
    qcPendingCount,
    frameQcPassed: qcPassedFrames === expectedFrames,
    materialReady,
    continuityState,
    productionReady: false,
    cost: item?.estimatedDiamonds || Math.ceil(segment.durationSeconds || 0) * 15,
    summary: segment.summaryZh || segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；") || "中文逐镜说明已写入本段制作文件。",
    files,
  };
}));

const totals = {
  episodes: storyboard.episodes.length,
  segments: segments.length,
  cuts: segments.reduce((sum, item) => sum + item.cuts, 0),
  readySegments: segments.filter((item) => item.ready).length,
  semanticReviewedSegments: segments.filter((item) => item.semanticReviewed).length,
  productionReadySegments: segments.filter((item) => item.productionReady).length,
  materialReadySegments: segments.filter((item) => item.materialReady).length,
  continuityReviewed: continuityAudit.summary.reviewed,
  continuityDirect: continuityAudit.summary.direct,
  continuityVerify: continuityAudit.summary.verify,
  continuityBlocked: continuityAudit.summary.blocked,
  logicReviewed: storyLogicAudit.summary.reviewed,
  logicFixed: storyLogicAudit.summary.fixed,
  logicOpen: storyLogicAudit.summary.open,
  frameImages: segments.reduce((sum, item) => sum + item.frameCount, 0),
  qcPassedFrames: segments.reduce((sum, item) => sum + item.qcPassedFrames, 0),
  qcReworkFrames,
  qcPendingFrames,
  qcHistoricalReviewedFrames,
  qcHistoricalPassedFrames,
  frameQcPassedSegments: segments.filter((item) => item.frameQcPassed).length,
  framePrompts: segments.reduce((sum, item) => sum + item.files.framePrompts, 0),
  shotVideoPrompts: segments.reduce((sum, item) => sum + item.files.shotVideoPrompts, 0),
  references: references.length,
  readyReferences: references.filter((item) => item.ready).length,
  realH3: realH3Files.filter(isFile).length,
};
const missingReferences = references.filter((item) => !item.ready);
const missingFrames = totals.cuts - totals.frameImages;
const unreviewedSegments = totals.segments - totals.semanticReviewedSegments;
const nextActionTitle = unreviewedSegments
  ? `继续审核 ${unreviewedSegments} 段提示词语义`
  : missingReferences.length
    ? `补 ${missingReferences.length} 张统一参考图`
    : qcReworkFrames > 0
      ? `重做 ${qcReworkFrames} 张偏离图片并补齐 ${missingFrames} 张缺图`
      : qcPendingFrames > 0
        ? `人工复核 ${qcPendingFrames} 张已有图片`
        : missingFrames > 0
          ? `补齐剩余 ${missingFrames} 张关键帧`
          : totals.logicOpen > 0
            ? `先修复 ${totals.logicOpen} 个故事逻辑阻断`
            : totals.continuityBlocked > 0
            ? `先修复 ${totals.continuityBlocked} 个段间衔接阻断`
            : "使用全片视频生产控制台按批次执行";
const nextActionText = unreviewedSegments
  ? "模板文件齐全不等于内容可靠。逐段核对动作、出镜人物、画外音/口型、道具位置和衔接；通过审核后才允许进入图片或视频生产。"
  : missingReferences.length
    ? `缺少${missingReferences.map((item) => item.name).join("、")}。先锁定这些视觉基准，再生成剩余 ${missingFrames} 张逐镜图。`
    : qcReworkFrames > 0
      ? `统一参考图与提示词语义审核已经齐全。现在先按 QC 报告重做 ${qcReworkFrames} 张偏离图片，再按段生成剩余 ${missingFrames} 张缺图。`
      : qcPendingFrames > 0
        ? `有 ${qcPendingFrames} 张图片文件已经存在，但尚未获得明确放行。先逐张核对人物、口型、道具、空间与衔接，再写入 QC/来源记录。`
        : missingFrames > 0
          ? `统一参考图、提示词语义审核和现有图片 QC 已经通过。现在按段补齐剩余 ${missingFrames} 张缺图，并逐张记录参考图、实际提示词与 QC 结论。`
          : totals.logicOpen > 0
            ? `仍有 ${totals.logicOpen} 个故事因果或证物时序问题未修复。先回到剧本、分镜和提示词源头修复，不能依靠转场掩盖。`
            : totals.continuityBlocked > 0
            ? `单段素材已齐，但 58 个相邻接点中仍有 ${totals.continuityBlocked} 个阻断、${totals.continuityVerify} 个待链路验证。先修共享物体状态、运动轴和时空转场，不继续批量生成。`
            : "段内素材与段间衔接质量门均已通过。进入控制台按集生成，并对每个相邻接点连播 QC。";
const nextActionHref = missingFrames > 0 || qcReworkFrames > 0 || qcPendingFrames > 0
  ? "offline-production/IMAGE-QC-REPORT.zh-CN.md"
  : totals.logicOpen > 0 ? "offline-production/story-logic-audit.html" : totals.continuityBlocked > 0 ? "offline-production/continuity-audit.html" : "offline-production/video-production-control.html";
const nextActionButton = missingFrames > 0 || qcReworkFrames > 0 || qcPendingFrames > 0
  ? "查看图片 QC 报告"
  : totals.logicOpen > 0 ? "打开故事逻辑审计" : totals.continuityBlocked > 0 ? "打开段间衔接审计" : "打开视频生产控制台";
const nextActionLinkLabel = qcReworkFrames > 0 ? "定位返工段" : qcPendingFrames > 0 ? "定位待复核段" : missingFrames > 0 ? "定位缺图段" : "查看全部段落";
const imageQcStepText = qcReworkFrames > 0
  ? `已通过 ${totals.qcPassedFrames} 张；先重做 ${qcReworkFrames} 张偏离图，再补齐 ${missingFrames} 张缺图。`
  : qcPendingFrames > 0
    ? `已通过 ${totals.qcPassedFrames} 张；${qcPendingFrames} 张已有图片仍待人工复核，不能视为可投产。`
    : missingFrames > 0
      ? `已通过 ${totals.qcPassedFrames} 张，当前无返工图；继续补齐 ${missingFrames} 张缺图。`
      : `${totals.qcPassedFrames} 张逐镜图片已经全部通过 QC。`;
const referenceStepText = missingReferences.length
  ? `补齐${["角色", "场景", "道具"].map((type) => `${missingReferences.filter((item) => item.type === type).length} 个${type}`).join("、")}。`
  : "角色、场景和道具参考图已经齐全。";

const pages = [
  { group: "最终结论", title: "库能力探索与《潮痕》失败复盘", note: "库能力探索完成；短剧投产尝试未通过叙事前置质量门；停止扩大视频生成", href: "offline-production/library-exploration-conclusion.html", state: "先看这里" },
  { group: "架构", title: "从好故事到好视频：基础能力架构", note: "10 层能力、6 道质量门和 5 阶段开发路线；明确原库前后必须补齐的能力", href: "offline-production/foundational-capability-architecture.html", state: "结论已固定" },
  { group: "归档", title: "2026-08-24 能力探索失败复盘归档", note: "冻结库边界、失败结论、创作源、审计和视频证据；旧乐观归档保留但已被本版取代", href: "archive/2026-08-24-capability-exploration-failure-review/index.html", state: "修正版" },
  { group: "总结", title: "原库能力 × 大模型扩展 × 视频实测评估", note: `区分原库、模型与外部生成器；真实视频 ${totals.realH3}/${totals.segments} 段，正式成片仍未完成`, href: "offline-production/capability-evaluation.html", state: "最终总结" },
  { group: "创作源", title: "故事大纲", note: "六集结构文件已生成，但小说原型和改编因果未通过前置验收", href: "outline/outline-report.html", state: "实验稿" },
  { group: "创作源", title: "中文剧本", note: "逐场动作、台词和节拍已生成；连续视频暴露动作因果回退", href: "script/script-report.html", state: "实验稿" },
  { group: "统一性", title: "角色参考表", note: `角色图 ${references.filter((x) => x.type === "角色" && x.ready).length}/${references.filter((x) => x.type === "角色").length}`, href: "characters/report.html", state: references.some((x) => x.type === "角色" && !x.ready) ? "待补" : "完整" },
  { group: "统一性", title: "场景与道具表", note: `场景/道具图 ${references.filter((x) => x.type !== "角色" && x.ready).length}/${references.filter((x) => x.type !== "角色").length}`, href: "art/art-report.html", state: references.some((x) => x.type !== "角色" && !x.ready) ? "待补" : "完整" },
  { group: "质检", title: "新增关键道具放行记录", note: "P04～P07 共 4 件通过；含文件筒、责任书、残录手机、三份备份盘的阶段门与使用顺序", href: "art/ASSET-QC-APPROVAL-2026-08-24.zh-CN.md", state: "4/4 通过" },
  { group: "实验资料", title: "中文制作报告", note: "逐段中文说明、图片状态和切点；仅供复盘，不代表可投产", href: "storyboard/storyboard-report-zh.html", state: "未放行" },
  { group: "实验资料", title: "离线预生产资料包", note: "剪辑时间线、字幕、配音、声音表、逐镜视频兜底词；停止继续生产", href: "offline-production/README.zh-CN.md", state: "已归档" },
  { group: "演示", title: "现有图片与视频演示", note: "独立查看第 1 集动态分镜、E02-01～03 静态预演和唯一真实 H3 含声样片", href: "offline-production/media-demo.html", state: "直接播放" },
  { group: "事后审计", title: "58 个段间衔接审计", note: `${totals.continuityDirect} 个静态可直连、${totals.continuityVerify} 个待验证；这是问题暴露后的审计，不能证明前置叙事合格`, href: "offline-production/continuity-audit.html", state: "失败证据" },
  { group: "事后审计", title: "全剧故事逻辑与因果链审计", note: `${totals.logicReviewed} 项已检查并回写 ${totals.logicFixed} 项；事后修复不能替代小说原型和改编前置验收`, href: "offline-production/story-logic-audit.html", state: "失败证据" },
  { group: "暂停生产", title: "全片视频生产控制台", note: "保留 59 段台账、193 镜总表和已有视频记录，只作实验档案；当前停止继续提交 H3", href: "offline-production/video-production-control.html", state: "已停止" },
  { group: "实验资料", title: "关键帧生成顺序归档", note: `六集关键帧文件已齐；保留跨段依赖、候选/QC 和上传边界作为失败样本`, href: "offline-production/REMAINING-IMAGE-GENERATION-ORDER.zh-CN.md", state: "193/193 文件" },
  { group: "质检", title: "全局图片 QC 报告", note: `${totals.qcPassedFrames}/${totals.cuts} 张通过、${qcReworkFrames} 张需返工、${qcPendingFrames} 张待复核、${missingFrames} 张待生成；含逐段联系表`, href: "offline-production/IMAGE-QC-REPORT.zh-CN.md", state: "先看这里" },
  { group: "质检", title: "E04 新图放行记录", note: "30/30 张通过；含候选选择、修订原因、连续性结论与视频阶段风险", href: "offline-production/E04-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05 前三段放行记录", note: "8/8 张通过；含潜水装备、单灯方位、安全绳与金属筒阶段约束", href: "offline-production/E05-01-03-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05-04～05 放行记录", note: "6/6 张通过；含文件筒开合链、摔裂电台、画外旧录音与联单展开阶段", href: "offline-production/E05-04-05-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05-06～07 放行记录", note: "8/8 张通过；含六行联单、暗紫缺角私章、录音人物不实体化、耳机终态与双人闭口", href: "offline-production/E05-06-07-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05-08 放行记录", note: "4/4 张通过；含联单未封袋阶段、P06 双锚点、画外高嵩不实体化、说话人与闭口约束", href: "offline-production/E05-08-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05-09 放行记录", note: "3/3 张通过；含 P03/P05 裸放、P01 四损伤锚点、责任书签名区、固定窗裂与法律边界", href: "offline-production/E05-09-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E05-10 放行记录", note: "3/3 张通过；含三盘角色分工、P03 完全入袋并封闭、P01 损伤终态与 P06/P07 离场边界", href: "offline-production/E05-10-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-01 放行记录", note: "3/3 张通过；含抢线/护袋职责、P03 封闭终态、场外三备份、P01 损伤与单人口型边界", href: "offline-production/E06-01-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-02 放行记录", note: "3/3 张通过；含 P03 六行与缺角章、高嵩不触证、两名匿名背影、两张空白板与单人口型", href: "offline-production/E06-02-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-03 放行记录", note: "3/3 张通过；含画外少年录音不实体化、日期/时间/地点无 UI、双人闭口与机械继续怠速", href: "offline-production/E06-03-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-04 放行记录", note: "3/3 张通过；含 P01 摔裂终态、无时间 UI、录音指控待核验、高嵩监听闭口与少年不实体化", href: "offline-production/E06-04-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-05 放行记录", note: "3/3 张通过；含封闭 P03 六行/缺角章、私章待鉴定、独立 P05、高嵩不触证与两名手机背影", href: "offline-production/E06-05-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-06 放行记录", note: "3/3 张通过；含 P05 进入鉴定、高嵩不触 P03、封闭袋防抢、普通手机/P06 区分与非司法运营指令", href: "offline-production/E06-06-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-07 放行记录", note: "3/3 张通过；含摔裂 P06 单波形、封闭 P03、普通手机区分、机械首次停机与非司法结果边界", href: "offline-production/E06-07-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-08 放行记录", note: "3/3 张通过；含摔裂 P01/封闭 P03、受理非判决、双人闭口、单对手套与回执编号后期边界", href: "offline-production/E06-08-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-09 放行记录", note: "2/2 张通过；含公开透明托架、两级石阶台词归属、P01 损伤保持、单张空白标签与文字后期边界", href: "offline-production/E06-09-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "E06-10 放行记录", note: "2/2 张通过；含公开托架/双潮线结尾、P01 损伤、许知遥个人完整手机、空白通知卡与受理非司法结论边界", href: "offline-production/E06-10-IMAGE-QC-APPROVAL.zh-CN.md", state: "本轮完成" },
  { group: "质检", title: "第六集生图前风险审计", note: "28 镜已修复保护袋、P05/P06/P07、手机连续性、法律边界、依赖顺序与后期受理编号", href: "offline-production/E06-PREGEN-RISK-AUDIT.zh-CN.md", state: "生成前必读" },
  { group: "质检", title: "提示词语义审核账", note: `${totals.semanticReviewedSegments}/${totals.segments} 段已通过；未审核段只作为模板草稿`, href: "prompt-semantic-audit.json", state: "质量门" },
  { group: "记录", title: "实时生产台账", note: "当前完成度、工作顺序和完成定义", href: "PRODUCTION.md", state: "自动同步" },
  { group: "实验资料", title: "技术分镜报告", note: "完整 H3 骨架、质量门和高级检查；规格合法不等于故事成立", href: "storyboard/storyboard-report.html", state: "未放行" },
  { group: "验证", title: "第二集验证报告", note: "E02 已有样例和 H3 实测记录", href: "storyboard/storyboard-ep2-report.html", state: "样例" },
  { group: "记录", title: "逐镜图生成记录", note: "E02-04～E02-10 共 25 张的中文生成与质检记录", href: "storyboard-frame-generation-log.md", state: "新增" },
  { group: "验证", title: "原始能力演示", note: "仓库自带流程和总结演示", href: "../../../../docs/demos/shuohao-skills/tide-marks/index.html", state: "演示" },
];

const referenceRows = references.map((item) => `<li class="reference-item ${item.ready ? "is-ready" : "is-missing"}"><span class="status-dot" aria-hidden="true"></span><span><b>${esc(item.name)}</b><small>${item.type}参考图</small></span><strong>${item.ready ? "已完成" : "待生成"}</strong></li>`).join("");
const pageCards = pages.map((item) => `<a class="resource-card" href="${item.href}"><span class="eyebrow">${item.group}</span><h3>${item.title}</h3><p>${item.note}</p><span class="resource-state">${item.state}<span aria-hidden="true"> →</span></span></a>`).join("");

const segmentCards = segments.map((item) => {
  const frameLinks = Array.from({ length: item.cuts }, (_, index) => {
    const n = index + 1;
    const frameQcState = qcByFrame.get(`${item.id}/f${n}`);
    const frameQcLabel = frameQcState === "pass" ? "QC通过" : frameQcState === "rework" ? "需返工" : "待复核";
    const image = item.frameCount >= n ? `<a href="storyboard-full-pack/${item.id}/f${n}.png">查看图片 · ${frameQcLabel}</a>` : `<span class="unavailable">图片待生成</span>`;
    return `<li><b>f${n}</b><a href="storyboard-full-pack/${item.id}/frame-prompts/f${n}.md">生图提示词</a>${image}</li>`;
  }).join("");
  const cardState = "narrative-gate-failed";
  const statusClass = "missing";
  const statusText = "实验资料 · 未放行";
  return `<article class="segment-card" data-episode="${item.episode}" data-state="${cardState}" data-search="${esc(`${item.id} ${item.scene} ${item.lighting} ${item.summary}`.toLowerCase())}">
    <header><div><span class="segment-id">${item.id}</span><h3>${esc(item.scene)}</h3><p>${esc(item.lighting)}</p></div><span class="status ${statusClass}">${statusText}</span></header>
    ${item.frameCount ? `<a class="segment-preview" href="storyboard-full-pack/${item.id}/f1.png"><img loading="lazy" src="storyboard-full-pack/${item.id}/f1.png" alt="${item.id} 首帧"><span>查看首帧</span></a>` : `<div class="segment-placeholder"><span>${item.id}</span><b>尚无逐镜图片</b><small>${item.semanticReviewed ? "提示词已通过语义审核" : "模板已生成，语义仍待审核"}</small></div>`}
    <p class="segment-summary">${esc(item.summary)}</p>
    <div class="segment-meta"><span>${item.seconds}s</span><span>${item.cuts} 镜</span><span>${item.frameCount}/${item.cuts} 图</span><span>图片 QC ${item.qcPassedFrames}/${item.cuts}</span><span>${item.semanticReviewed ? `段内语义已审 ${esc(item.semanticReviewedAt)}` : "段内语义待审"}</span><span>段间静态审计：${item.continuityState === "blocked" ? "阻断" : item.continuityState === "verify" ? "待验证" : "可直连"}</span><span>全局叙事门失败，不投产</span><span>原估 ${item.cost} 钻</span></div>
    <div class="segment-actions"><a class="primary" href="storyboard/storyboard-report-zh.html#${item.id}">中文段落总览</a><a href="storyboard-full-pack/${item.id}/README.zh-CN.md">中文说明</a><a href="storyboard-full-pack/${item.id}/UPLOAD-ORDER.md">上传顺序</a><a href="storyboard-full-pack/${item.id}/chatart-prompt.txt">ChatArt 提示词</a><a href="storyboard-full-pack/${item.id}/import.json">导入 JSON</a></div>
    <details><summary>逐帧文件与高级提示词</summary><ul class="frame-links">${frameLinks}</ul><p class="advanced-links"><a href="storyboard-full-pack/${item.id}/prompt.md">H3 段级提示词</a> <a href="storyboard-full-pack/${item.id}/SHOT-VIDEO-FALLBACK.zh-CN.md">逐镜视频兜底说明</a></p></details>
  </article>`;
}).join("");

const data = { generatedAt: new Date().toISOString(), narrativeGate: { passed: false, decision: "停止扩大视频生成", reason: "小说原型、因果推进和小说到短剧的改编连续性不足" }, totals, references, pages, segments };
fs.writeFileSync(path.join(root, "production-hub-data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>《潮痕》小说视频生产总控</title><style>
:root{color-scheme:dark;--bg:#0a0e13;--surface:#111821;--surface-2:#151e28;--line:#273441;--text:#edf3f7;--muted:#9aabb8;--cyan:#55d9df;--orange:#f19a55;--green:#65d58a;--yellow:#ffc66d;--red:#ff887f;--shadow:0 18px 60px #0005}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:82px}body{margin:0;background:radial-gradient(circle at 88% -10%,#17313a 0,transparent 28rem),var(--bg);color:var(--text);font:15px/1.65 system-ui,"Microsoft YaHei",sans-serif}a{color:inherit}.skip{position:fixed;left:12px;top:-80px;z-index:100;background:var(--cyan);color:#041014;padding:8px 12px;border-radius:8px}.skip:focus{top:12px}.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:18px;padding:12px max(24px,calc((100vw - 1440px)/2));background:#0a0e13ed;border-bottom:1px solid var(--line);backdrop-filter:blur(14px)}.brand{font-weight:800;white-space:nowrap}.brand span{color:var(--cyan)}.topbar nav{display:flex;gap:6px;margin-left:auto}.topbar nav a{text-decoration:none;color:var(--muted);padding:6px 9px;border-radius:7px}.topbar nav a:hover,.topbar nav a:focus-visible{color:var(--text);background:var(--surface-2)}main{width:min(1440px,calc(100% - 48px));margin:0 auto 90px}.hero{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(330px,.65fr);gap:18px;padding:52px 0 24px}.hero-copy,.next-action,.panel,.resource-card,.segment-card{border:1px solid var(--line);background:#111821e8;border-radius:16px}.hero-copy{padding:34px;background:linear-gradient(135deg,#14232c,#191713);box-shadow:var(--shadow)}.eyebrow{display:block;color:var(--cyan);font-size:12px;font-weight:750;letter-spacing:.12em}.hero h1{max-width:760px;margin:8px 0 12px;font-size:clamp(30px,5vw,58px);line-height:1.08;letter-spacing:-.04em}.hero-copy>p{max-width:760px;margin:0;color:#bac6cf;font-size:17px}.next-action{padding:26px;border-color:#5a4635;background:#1a1714}.next-action h2{margin:7px 0 8px;font-size:22px}.next-action p{margin:0 0 18px;color:#c9b7a8}.button{display:inline-flex;align-items:center;justify-content:center;text-decoration:none;border-radius:9px;padding:10px 14px;font-weight:760;background:var(--orange);color:#170d06}.button.secondary{background:transparent;color:var(--cyan);border:1px solid #31515a}.kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:0 0 22px}.kpi{padding:18px;border:1px solid var(--line);border-radius:13px;background:var(--surface)}.kpi small{display:block;color:var(--muted)}.kpi strong{display:block;margin:4px 0;font-size:28px;font-variant-numeric:tabular-nums}.kpi p{margin:0;color:var(--muted);font-size:13px}.bar{height:5px;margin-top:12px;background:#27313a;border-radius:9px;overflow:hidden}.bar i{display:block;height:100%;background:var(--cyan);border-radius:inherit}.section{margin-top:30px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:18px;margin:0 0 14px}.section-head h2{margin:0;font-size:25px}.section-head p{margin:0;color:var(--muted)}.workflow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;counter-reset:steps}.workflow article{position:relative;padding:18px;border:1px solid var(--line);border-radius:12px;background:var(--surface);counter-increment:steps}.workflow article::before{content:counter(steps);display:grid;place-items:center;width:28px;height:28px;margin-bottom:13px;border-radius:50%;background:#20313a;color:var(--cyan);font-weight:800}.workflow h3{margin:0 0 5px;font-size:16px}.workflow p{margin:0;color:var(--muted);font-size:13px}.workflow .done{border-color:#26573a}.workflow .current{border-color:#6a4b30;background:#1a1714}.reference-layout{display:grid;grid-template-columns:.72fr 1.28fr;gap:14px}.panel{padding:22px}.panel h3{margin:0 0 12px}.reference-list{display:grid;gap:8px;margin:0;padding:0;list-style:none}.reference-item{display:grid;grid-template-columns:10px 1fr auto;gap:10px;align-items:center;padding:9px 10px;border-radius:9px;background:#0d131a}.reference-item small{display:block;color:var(--muted)}.reference-item strong{font-size:12px}.status-dot{width:8px;height:8px;border-radius:50%}.is-ready .status-dot{background:var(--green)}.is-ready strong{color:var(--green)}.is-missing .status-dot{background:var(--yellow)}.is-missing strong{color:var(--yellow)}.resource-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.resource-card{display:flex;flex-direction:column;min-height:180px;padding:20px;text-decoration:none;transition:border-color .15s ease,transform .15s ease}.resource-card:hover,.resource-card:focus-visible{border-color:#4a7380;transform:translateY(-2px)}.resource-card h3{margin:6px 0;font-size:19px}.resource-card p{margin:0;color:var(--muted)}.resource-state{margin-top:auto;color:var(--cyan);font-weight:750}.filters{position:sticky;top:61px;z-index:20;display:grid;grid-template-columns:minmax(220px,1fr) auto auto;gap:10px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:12px;background:#0a0e13ee;backdrop-filter:blur(12px)}.search{display:flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface)}.search input{width:100%;height:40px;border:0;outline:0;background:transparent;color:var(--text);font:inherit}.filter-buttons{display:flex;gap:6px}.filter-buttons button,.filters select{height:42px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--text);padding:0 12px;font:inherit}.filter-buttons button[aria-pressed="true"]{border-color:var(--cyan);color:var(--cyan);background:#10252b}.result-count{color:var(--muted);white-space:nowrap}.segment-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px;margin-top:13px}.segment-card{display:flex;flex-direction:column;min-width:0;padding:18px}.segment-card[hidden]{display:none}.segment-card header{display:flex;justify-content:space-between;gap:12px}.segment-card h3{margin:3px 0 0;font-size:17px}.segment-card header p{margin:0;color:var(--muted)}.segment-id{color:var(--cyan);font-weight:850}.status{height:max-content;padding:3px 8px;border:1px solid;border-radius:999px;font-size:12px;white-space:nowrap}.status.ready{color:var(--green);border-color:#275e3b}.status.missing{color:var(--yellow);border-color:#674c25}.segment-preview,.segment-placeholder{position:relative;display:block;margin:13px 0 0;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#0b1117;text-decoration:none}.segment-preview img{width:100%;height:100%;object-fit:cover}.segment-preview span{position:absolute;right:8px;bottom:8px;padding:3px 7px;border-radius:6px;background:#05090dcc;font-size:12px}.segment-placeholder{display:grid;place-content:center;text-align:center;border:1px dashed #34434f;color:var(--muted)}.segment-placeholder span{color:#52616d;font-size:24px;font-weight:900}.segment-placeholder b{color:#c4ced6}.segment-placeholder small{display:block}.segment-summary{display:-webkit-box;min-height:4.95em;margin:13px 0;color:#c4ced6;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:3}.segment-meta{display:flex;gap:6px;flex-wrap:wrap}.segment-meta span{padding:3px 7px;border-radius:6px;background:#0b1117;color:var(--muted);font-size:12px}.segment-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:13px}.segment-actions a,.advanced-links a,.frame-links a{padding:5px 8px;border:1px solid var(--line);border-radius:7px;color:var(--cyan);text-decoration:none;font-size:12px}.segment-actions .primary{background:#153039;border-color:#30616a;color:#eafcff}.segment-card details{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}.segment-card summary{cursor:pointer;color:var(--muted)}.frame-links{display:grid;gap:7px;margin:10px 0;padding:0;list-style:none}.frame-links li{display:grid;grid-template-columns:34px auto auto;gap:8px;align-items:center}.unavailable{color:#6f7a82;font-size:12px}.advanced-links{margin-bottom:0}.empty{display:none;margin:16px 0;padding:22px;text-align:center;border:1px dashed var(--line);border-radius:12px;color:var(--muted)}.empty.is-visible{display:block}.footnote{margin-top:34px;padding:18px;border-top:1px solid var(--line);color:var(--muted)}:focus-visible{outline:3px solid #59dce5;outline-offset:3px}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.resource-card{transition:none}}@media(max-width:1080px){.hero{grid-template-columns:1fr}.kpis{grid-template-columns:repeat(3,1fr)}.workflow{grid-template-columns:repeat(3,1fr)}.resource-grid{grid-template-columns:repeat(2,1fr)}.segment-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:720px){html{scroll-padding-top:126px}.topbar{align-items:flex-start;flex-wrap:wrap;padding:10px 16px}.topbar nav{order:2;width:100%;overflow-x:auto;margin:0}.topbar nav a{white-space:nowrap}.topbar nav a:first-child{padding-left:0}main{width:min(100% - 24px,1440px)}.hero{padding-top:20px}.hero-copy,.next-action{padding:22px}.hero h1{font-size:36px}.kpis{grid-template-columns:repeat(2,1fr)}.kpi:last-child{grid-column:1/-1}.workflow{grid-template-columns:1fr}.reference-layout{grid-template-columns:1fr}.resource-grid,.segment-grid{grid-template-columns:1fr}.section-head{display:block}.section-head p{margin-top:4px}.filters{top:104px;grid-template-columns:1fr;padding:9px}.filter-buttons{overflow-x:auto}.filter-buttons button{white-space:nowrap}.result-count{text-align:right}.segment-card{padding:15px}.frame-links li{grid-template-columns:28px 1fr 1fr}.footnote{padding-inline:0}}@media(max-width:420px){.kpis{grid-template-columns:1fr}.kpi:last-child{grid-column:auto}.hero h1{font-size:31px}}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}</style></head><body><a class="skip" href="#main">跳到主要内容</a><header class="topbar"><div class="brand"><span>潮痕</span> · 小说视频生产总控</div><nav aria-label="页面导航"><a href="#progress">完成度</a><a href="#references">参考图</a><a href="#resources">具体页面</a><a href="#segments">段落生产</a></nav></header><main id="main">
<section class="hero"><div class="hero-copy"><span class="eyebrow">本地主入口 · 中文工作台</span><h1>先看缺口，再进入具体制作页面</h1><p>故事结构和 ${totals.segments} 段生产文件已经准备完成，但自动模板只代表“格式完整”，不代表“语义可靠”。这里同时追踪语义审核、统一参考图、逐镜图片、上传顺序、导入文件和验证视频。</p></div><aside class="next-action"><span class="eyebrow">建议下一步</span><h2>${nextActionTitle}</h2><p>${nextActionText}</p><a class="button" href="${nextActionHref}">${nextActionButton}</a> <a class="button secondary" href="#segments">${nextActionLinkLabel}</a></aside></section>
<section id="progress" class="kpis" aria-label="制作完成度"><article class="kpi"><small>故事结构</small><strong>${totals.segments}/${totals.segments} 段</strong><p>${totals.episodes} 集 · ${totals.cuts} 镜完整</p><div class="bar"><i style="width:100%"></i></div></article><article class="kpi"><small>提示词语义审核</small><strong>${totals.semanticReviewedSegments}/${totals.segments}</strong><p>这里只代表段内内容已审核</p><div class="bar"><i style="width:${totals.semanticReviewedSegments / totals.segments * 100}%"></i></div></article><article class="kpi"><small>统一参考图</small><strong>${totals.readyReferences}/${totals.references}</strong><p>缺 ${totals.references - totals.readyReferences} 张</p><div class="bar"><i style="width:${totals.readyReferences / totals.references * 100}%"></i></div></article><article class="kpi"><small>逐镜图片 / QC</small><strong>${totals.frameImages}/${totals.cuts}</strong><p>${totals.qcPassedFrames} 张通过 · ${qcReworkFrames} 张需返工 · ${missingFrames} 张缺图</p><div class="bar"><i style="width:${totals.qcPassedFrames / totals.cuts * 100}%"></i></div></article><article class="kpi"><small>段间衔接审计</small><strong>${totals.continuityReviewed}/58</strong><p>${totals.continuityBlocked} 阻断 · ${totals.continuityVerify} 待验证 · ${totals.continuityDirect} 可直连</p><div class="bar"><i style="width:${totals.continuityDirect / 58 * 100}%"></i></div></article><article class="kpi"><small>视频受控投产</small><strong>${totals.productionReadySegments}/${totals.segments} 段</strong><p>段内素材通过且不邻接阻断点</p><div class="bar"><i style="width:${totals.productionReadySegments / totals.segments * 100}%"></i></div></article></section>
<section class="section" aria-labelledby="workflow-title"><div class="section-head"><div><span class="eyebrow">推荐顺序</span><h2 id="workflow-title">${totals.continuityBlocked ? "先修复段间衔接，再恢复视频生成" : "衔接契约已补齐，进入受控视频生成"}</h2></div><p>绿色为已准备，橙色为当前应处理。</p></div><div class="workflow"><article class="done"><h3>故事与分镜</h3><p>${totals.episodes} 集、${totals.segments} 段、${totals.cuts} 镜已经完成。</p></article><article class="done"><h3>统一参考图</h3><p>${referenceStepText}</p></article><article class="done"><h3>段内提示词审核</h3><p>${totals.semanticReviewedSegments}/${totals.segments} 段已核对真实动作、人物、口型和道具，但不再等同于全片衔接通过。</p></article><article class="done"><h3>逐镜图片与 QC</h3><p>${imageQcStepText}</p></article><article class="${totals.continuityBlocked ? "current" : "done"}"><h3>58 个段间接点</h3><p>${totals.continuityBlocked} 个阻断、${totals.continuityVerify} 个待链路验证；上一段终态到下一段起态的契约已写入提示词。</p></article><article class="${totals.continuityBlocked ? "" : "current"}"><h3>视频与拼接</h3><p>仅投产不邻接阻断点的段；当前 ${totals.productionReadySegments}/${totals.segments} 段可受控试产。</p></article></div></section>
<section id="references" class="section"><div class="section-head"><div><span class="eyebrow">一致性基础</span><h2>角色、场景与道具参考图</h2></div><p>必须优先于批量逐镜生图。</p></div><div class="reference-layout"><article class="panel"><h3>统一参考清单</h3><ul class="reference-list">${referenceRows}</ul></article><article class="panel"><h3>为什么先补这些</h3><p>逐镜提示词已经写好，但缺少统一参考图时，同一人物的年龄、发型、服装以及场景结构会在不同镜头间漂移。先进入角色表和场景道具表确认现有设计，再补齐黄色“待生成”项目。</p><p><a class="button secondary" href="characters/report.html">打开角色表</a> <a class="button secondary" href="art/art-report.html">打开场景道具表</a> <a class="button secondary" href="art/ASSET-QC-APPROVAL-2026-08-24.zh-CN.md">查看关键道具放行记录</a></p></article></div></section>
<section id="resources" class="section"><div class="section-head"><div><span class="eyebrow">页面地图</span><h2>关联的具体页面</h2></div><p>中文制作报告是日常入口，技术报告只用于高级检查。</p></div><div class="resource-grid">${pageCards}</div></section>
<section id="segments" class="section"><div class="section-head"><div><span class="eyebrow">59 段生产工作台</span><h2>按集数和生产状态定位</h2></div><p>每段都直接关联具体生产文件。</p></div><div class="filters"><label class="search"><span aria-hidden="true">⌕</span><span class="sr-only">搜索段号或场景</span><input id="search" type="search" placeholder="搜索 E02-04、场景或中文内容"></label><div class="filter-buttons" role="group" aria-label="生产状态"><button type="button" data-filter="all" aria-pressed="true">全部</button><button type="button" data-filter="production-ready" aria-pressed="false">可投产</button><button type="button" data-filter="qc-rework" aria-pressed="false">需返工</button><button type="button" data-filter="qc-pending" aria-pressed="false">待复核</button><button type="button" data-filter="missing" aria-pressed="false">缺图</button></div><label><span class="sr-only">选择集数</span><select id="episode"><option value="all">全部集数</option>${storyboard.episodes.map((episode) => `<option value="${episode.ep}">第 ${episode.ep} 集</option>`).join("")}</select></label><span class="result-count" id="result-count">${totals.segments} 段</span></div><div class="segment-grid" id="segment-grid">${segmentCards}</div><p class="empty" id="empty">没有符合条件的段落，请清空搜索或切换筛选。</p></section>
<footer class="footnote"><b>完成度口径：</b>“59/59 单段素材齐备”不等于“全片衔接就绪”。当前真实状态为 ${totals.materialReadySegments}/${totals.segments} 段单段素材通过，58/58 个接点已首轮审计，其中 ${totals.continuityBlocked} 个阻断、${totals.continuityVerify} 个待视频链路验证、${totals.continuityDirect} 个可按现有切点；${totals.productionReadySegments}/${totals.segments} 段不邻接阻断点、可受控试产。数据由本地 JSON、QC 台账、衔接策略与文件系统共同生成。</footer></main><script>
const cards=[...document.querySelectorAll('.segment-card')],search=document.querySelector('#search'),episode=document.querySelector('#episode'),count=document.querySelector('#result-count'),empty=document.querySelector('#empty');let state='all';function apply(){const q=search.value.trim().toLowerCase();let visible=0;for(const card of cards){const okState=state==='all'||card.dataset.state===state,okEpisode=episode.value==='all'||card.dataset.episode===episode.value,okSearch=!q||card.dataset.search.includes(q);card.hidden=!(okState&&okEpisode&&okSearch);if(!card.hidden)visible++}count.textContent=visible+' 段';empty.classList.toggle('is-visible',visible===0)}document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));apply()}));search.addEventListener('input',apply);episode.addEventListener('change',apply);
</script></body></html>`;

const correctedHtml = html
  .replace("《潮痕》小说视频生产总控", "《潮痕》库能力探索与失败复盘")
  .replace("先看缺口，再进入具体制作页面", "库能力探索完成，短剧投产尝试失败")
  .replace(`故事结构和 ${totals.segments} 段生产文件已经准备完成，但自动模板只代表“格式完整”，不代表“语义可靠”。这里同时追踪语义审核、统一参考图、逐镜图片、上传顺序、导入文件和验证视频。`, `shuohao-skills 成功把已有故事拆成 ${totals.segments} 段、${totals.cuts} 镜的结构化资料；但两个连续视频已经暴露小说原型、因果推进和改编连续性不足。现有资料归档为实验样本，不再继续扩大视频生成。`)
  .replace(nextActionTitle, "停止视频生产，回到小说与改编")
  .replace(nextActionText, "先重新评审小说原型，再建立全剧因果图、状态时间线和短剧改编方案。只有低成本连续走查与 2～3 段新视频小样通过后，才重新考虑批量生产。")
  .replace(`<a class="button" href="${nextActionHref}">${nextActionButton}</a>`, `<a class="button" href="offline-production/library-exploration-conclusion.html">查看失败复盘</a>`)
  .replace("故事结构</small>", "结构化资料</small>")
  .replace("视频受控投产</small>", "叙事门放行</small>")
  .replace(/<h2 id="workflow-title">[\s\S]*?<\/h2>/, `<h2 id="workflow-title">研究重心前移：小说原型与改编因果</h2>`)
  .replace(`<article class="done"><h3>故事与分镜</h3><p>${totals.episodes} 集、${totals.segments} 段、${totals.cuts} 镜已经完成。</p></article>`, `<article class="current"><h3>小说原型与改编</h3><p>结构文件已生成，但叙事前置质量门失败；回到人物欲望、冲突、选择、因果图和状态时间线。</p></article>`)
  .replace(/<article class="[^"]*"><h3>视频与拼接<\/h3><p>[\s\S]*?<\/p><\/article>/, `<article><h3>视频与拼接</h3><p>已停止扩大生成；已有视频仅作为失败证据。</p></article>`)
  .replace("59 段生产工作台", "59 段实验资料台账")
  .replace("按集数和生产状态定位", "按集数查看失败尝试的资料")
  .replace("每段都直接关联具体生产文件。", "每段保留图片、提示词和导入文件作为研究样本，不代表可投产。")
  .replace(`<button type="button" data-filter="production-ready" aria-pressed="false">可投产</button>`, `<button type="button" data-filter="narrative-gate-failed" aria-pressed="false">叙事门失败</button>`)
  .replace(/<footer class="footnote">[\s\S]*?<\/footer>/, `<footer class="footnote"><b>最终口径：</b>库能力探索完成；本次短剧投产尝试失败。59/59 段和 193/193 张图片只表示资料文件齐全，不表示小说、因果或改编合格。两个连续视频已触发停止条件，现有材料全部作为实验资料与失败证据归档。</footer>`);
fs.writeFileSync(path.join(root, "index.html"), correctedHtml, "utf8");

const reportPages = ["outline/outline-report.html", "script/script-report.html", "characters/report.html", "art/art-report.html", "storyboard/storyboard-ep2-report.html", "storyboard/storyboard-report-zh.html", "storyboard/storyboard-report.html"];
const returnCss = `<!-- production-hub-return-css:start --><style>.production-hub-return{position:fixed;right:16px;bottom:16px;z-index:99999;padding:9px 12px;border:1px solid #3b6670;border-radius:9px;background:#0b151bea;color:#67e0e6!important;font:700 13px/1.2 system-ui,"Microsoft YaHei",sans-serif;text-decoration:none!important;box-shadow:0 8px 30px #0007;backdrop-filter:blur(10px)}.production-hub-return:focus-visible{outline:3px solid #67e0e6;outline-offset:3px}@media(max-width:560px){.production-hub-return{display:grid;place-items:center;right:10px;bottom:10px;width:44px;height:44px;padding:0;overflow:hidden;font-size:0}.production-hub-return::before{content:"⌂";font-size:22px}}</style><!-- production-hub-return-css:end -->`;
const returnLink = `<!-- production-hub-return:start --><a class="production-hub-return" href="../index.html" aria-label="返回潮痕小说视频生产总控">⌂ 返回生产总控</a><!-- production-hub-return:end -->`;
for (const rel of reportPages) {
  const file = path.join(root, rel);
  if (!isFile(file)) continue;
  let source = fs.readFileSync(file, "utf8");
  source = source.replace(/<!-- production-hub-return-css:start -->[\s\S]*?<!-- production-hub-return-css:end -->/g, "");
  source = source.replace(/<!-- production-hub-return:start -->[\s\S]*?<!-- production-hub-return:end -->/g, "");
  source = source.replace("</head>", `${returnCss}</head>`).replace(/<body([^>]*)>/i, (match) => `${match}${returnLink}`);
  fs.writeFileSync(file, source, "utf8");
}

console.log(`✓ production hub: ${path.join(root, "index.html")}`);
console.log(`✓ progress: ${totals.readyReferences}/${totals.references} refs, ${totals.frameImages}/${totals.cuts} frames, ${totals.realH3}/${totals.segments} H3`);
console.log(`✓ linked report pages: ${reportPages.length}`);
