import fs, { createReadStream } from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const docsRoot = path.join(repositoryRoot, "docs");
const outputRoot = path.join(projectRoot, "generated-studio");
const referenceRoot = path.join(docsRoot, "demos", "story-to-handdrawn-video", "assets", "sky-blue-demo");
const mockAudioRoot = path.join(projectRoot, "generated-audio", "sky-blue");

function parseEnv(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    values[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
  }
  return values;
}

async function loadLocalEnv() {
  const envFile = process.env.MINIMAX_ENV_FILE ? path.resolve(process.env.MINIMAX_ENV_FILE) : path.join(projectRoot, ".env");
  try {
    const local = parseEnv(await fsp.readFile(envFile, "utf8"));
    for (const [name, value] of Object.entries(local)) {
      if (process.env[name] === undefined) process.env[name] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

await loadLocalEnv();
await fsp.mkdir(outputRoot, { recursive: true });

const config = {
  host: process.env.STUDIO_HOST || "127.0.0.1",
  port: Number(process.env.STUDIO_PORT || 8789),
  mock: process.env.STUDIO_MOCK === "1",
  apiBase: new URL(process.env.MINIMAX_API_BASE || "https://api.minimaxi.com"),
  apiKey: process.env.MINIMAX_API_KEY || process.env.MINIMAX_TOKEN_PLAN_KEY || "",
  textModel: process.env.MINIMAX_TEXT_MODEL || "MiniMax-M3",
  imageModel: process.env.MINIMAX_IMAGE_MODEL || "image-01",
  ttsModel: process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd",
  ffmpeg: process.env.FFMPEG_PATH || "ffmpeg",
  ffprobe: process.env.FFPROBE_PATH || "ffprobe",
};

if (!Number.isInteger(config.port) || config.port < 1024 || config.port > 65535) throw new Error("STUDIO_PORT must be between 1024 and 65535.");
if (config.host !== "127.0.0.1" && config.host !== "localhost") throw new Error("STUDIO_HOST must remain loopback-only (127.0.0.1 or localhost).");
if (config.apiBase.protocol !== "https:") throw new Error("MINIMAX_API_BASE must use HTTPS.");

const mimeTypes = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".ass": "text/plain; charset=utf-8", ".srt": "text/plain; charset=utf-8", ".md": "text/markdown; charset=utf-8",
};

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = Buffer.from(`${JSON.stringify(payload)}\n`);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": body.length, "Cache-Control": "no-store", ...extraHeaders });
  res.end(body);
}

function cleanText(value, maximum = 2000) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, maximum);
}

function validateBrief(input) {
  const brief = {
    topic: cleanText(input?.topic, 100), audience: cleanText(input?.audience, 40) || "普通公众", duration: Number(input?.duration || 90),
    objective: cleanText(input?.objective, 400), misconception: cleanText(input?.misconception, 240), entry: cleanText(input?.entry, 240), evidence: cleanText(input?.evidence, 1500),
  };
  if (!brief.topic || !brief.objective || !brief.evidence) throw new Error("知识主题、学习目标和事实依据不能为空。");
  if (![60, 90, 180].includes(brief.duration)) brief.duration = 90;
  return brief;
}

const productionProfiles = {
  knowledge: { label: "知识解释", styleId: "whiteboard-explainer", styleLabel: "白板讲解动画", palette: ["#f8f8f4", "#222222", "#2d6cdf"], paletteLabel: "暖白纸面 + 黑线 + 概念蓝", camera: "正视结构，局部缩放只服务概念层级", presentation: "handdrawn" },
  technology: { label: "技术系统", styleId: "minimal-line-explainer", styleLabel: "极简黑白线条讲解", palette: ["#eef2ed", "#24313a", "#f3b447"], paletteLabel: "工程纸白 + 炭黑 + 能量黄", camera: "从日常物件沿系统路径逐层展开", presentation: "handdrawn" },
  classical: { label: "古典诗词", styleId: "ink-wash", styleLabel: "水墨写意", palette: ["#ece7da", "#242424", "#4d8068"], paletteLabel: "宣纸暖白 + 墨灰 + 青绿", camera: "长卷式空间推进，视点随意象移动", presentation: "poetic" },
  children: { label: "儿童成长", styleId: "sunlit-storybook", styleLabel: "暖光童画绘本", palette: ["#f4dfb2", "#e7aa45", "#70956d"], paletteLabel: "暖阳金 + 草木绿 + 纸张米白", camera: "儿童视线高度，动作结果清楚可读", presentation: "handdrawn" },
  memory: { label: "家庭记忆", styleId: "colored-pencil-diary", styleLabel: "彩铅日记漫画", palette: ["#e7d6b8", "#596d81", "#bb8c66"], paletteLabel: "纸张米色 + 雨夜蓝灰 + 灯光暖棕", camera: "物件特写缓慢推进人物关系", presentation: "handdrawn" },
  mystery: { label: "悬疑档案", styleId: "linocut-editorial", styleLabel: "粗粝木刻社论插画", palette: ["#d7c49e", "#22262b", "#8f3e36"], paletteLabel: "旧纸 + 炭黑 + 线索红", camera: "证据特写与空间纵深交替", presentation: "standard" },
  brand: { label: "品牌价值", styleId: "organic-contour-doodle", styleLabel: "有机轮廓品牌涂鸦", palette: ["#f3e4c8", "#2b4c3f", "#e68463"], paletteLabel: "纸张米白 + 深绿 + 珊瑚橙", camera: "从具体选择扩展到群体关系", presentation: "standard" },
  poetic: { label: "意境散文", styleId: "emotional-watercolor-sketch", styleLabel: "情绪叙事淡彩速写", palette: ["#e8dcca", "#758cac", "#d49a91"], paletteLabel: "雾灰蓝 + 暖粉 + 纸张米色", camera: "留白构图与慢速呼吸式推进", presentation: "poetic" },
};

const presentationProfiles = {
  standard: { label: "基础镜头合成", transition: "平移 / 缩放与淡入淡出", subtitles: "narration-safe-area" },
  handdrawn: { label: "手绘显色", transition: "纸感降饱和起笔，逐幕显色与缓慢推进", subtitles: "narration-safe-area" },
  poetic: { label: "诗性长卷", transition: "留白画幅、横向游观与克制叠化", subtitles: "poetic-safe-area" },
};

function validateProductionContract(input) {
  const storyKey = Object.hasOwn(productionProfiles, cleanText(input?.story?.recipe, 24)) ? cleanText(input.story.recipe, 24) : "knowledge";
  const profile = productionProfiles[storyKey];
  const presentationKey = Object.hasOwn(presentationProfiles, cleanText(input?.presentation?.recipe, 24)) ? cleanText(input.presentation.recipe, 24) : profile.presentation;
  const presentation = presentationProfiles[presentationKey];
  const palette = Array.isArray(input?.visual?.palette)
    ? input.visual.palette.slice(0, 5).map((value) => cleanText(value, 20)).filter((value) => /^#[0-9a-f]{6}$/i.test(value))
    : [];
  return {
    schema: "knowledge-video-production-contract/v1",
    id: cleanText(input?.id, 100) || `pc-${storyKey}-${presentationKey}-${Date.now().toString(36)}`,
    source: cleanText(input?.source, 40) || "studio",
    story: { recipe: storyKey, label: cleanText(input?.story?.label, 80) || profile.label, structure: "five-act-learning-arc", rhythm: cleanText(input?.story?.rhythm, 200) || "问题—检验—模型—证据—迁移" },
    visual: {
      style_id: cleanText(input?.visual?.style_id, 80) || profile.styleId,
      style_label: cleanText(input?.visual?.style_label, 80) || profile.styleLabel,
      palette: palette.length ? palette : profile.palette,
      palette_label: cleanText(input?.visual?.palette_label, 140) || profile.paletteLabel,
      camera: cleanText(input?.visual?.camera, 220) || profile.camera,
      continuity: cleanText(input?.visual?.continuity, 300) || "五幕复用同一主体、空间规则、色盘、画材和线条语言；只改变教学所需关系。",
      prompt_prefix: cleanText(input?.visual?.prompt_prefix, 600) || `${profile.label}；${profile.styleLabel}；${profile.paletteLabel}；${profile.camera}；统一主体与画材；画面内不得出现文字、水印、标志或伪文字。`,
    },
    presentation: { recipe: presentationKey, label: cleanText(input?.presentation?.label, 80) || presentation.label, transition: cleanText(input?.presentation?.transition, 220) || presentation.transition, subtitles: presentation.subtitles },
    routing: { quality_tier: "automatic", story_provider: "MiniMax text", image_provider: "MiniMax Image", tts_provider: "MiniMax Speech", renderer: "story-to-handdrawn-video + FFmpeg", curated_upgrade: "Codex agent-assisted final visual" },
    quality: { consistency_policy: "single-visual-bible", review_gates: ["story", "visual-continuity", "pseudo-text", "facts", "playback"] },
  };
}

function makeProjectId() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return `kv-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertProjectId(value) {
  const id = cleanText(value, 80);
  if (!/^kv-[0-9]{14}-[a-z0-9]{6}$/.test(id)) throw new Error("无效的项目 ID。");
  return id;
}

function projectDir(id) { return path.join(outputRoot, assertProjectId(id)); }
function projectFile(id) { return path.join(projectDir(id), "project.json"); }

async function saveProject(project) {
  await fsp.mkdir(projectDir(project.id), { recursive: true });
  project.updated_at = new Date().toISOString();
  await fsp.writeFile(projectFile(project.id), `${JSON.stringify(project, null, 2)}\n`, "utf8");
}

async function loadProject(id) {
  const project = JSON.parse(await fsp.readFile(projectFile(id), "utf8"));
  if (!project.production_contract) {
    project.production_contract = validateProductionContract({ source: "legacy-project", story: { recipe: "knowledge" }, presentation: { recipe: "standard" } });
  }
  return project;
}

function event(project, stage, message, status = "ok") {
  project.events ||= [];
  project.events.push({ at: new Date().toISOString(), stage, status, message: cleanText(message, 300) });
}

function projectUrl(projectId, filename) {
  return `/generated-studio/${encodeURIComponent(projectId)}/${encodeURIComponent(filename)}`;
}

function stripCodeFence(text) {
  return text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
}

function parseFirstJsonObject(content) {
  const text = stripCodeFence(String(content ?? "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim());
  try { return JSON.parse(text); } catch { /* scan for the first balanced object below */ }
  const start = text.indexOf("{");
  if (start < 0) throw new Error("响应中没有 JSON 对象。");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(text.slice(start, index + 1));
    }
  }
  throw new Error("响应中的 JSON 对象不完整。");
}

function normalizePlan(raw, brief, productionContract) {
  const roles = ["问题进入", "拆开误解", "建立模型", "证据解释", "迁移收束"];
  if (!raw || !Array.isArray(raw.acts) || raw.acts.length !== 5) throw new Error("MiniMax 返回的方案不是五幕结构。");
  const acts = raw.acts.map((item, index) => ({
    index: index + 1,
    role: cleanText(item.role, 24) || roles[index],
    title: cleanText(item.title, 100),
    purpose: cleanText(item.purpose, 360),
    visual: cleanText(item.visual, 500),
    narration: cleanText(item.narration, 800),
    trust: cleanText(item.trust, 300),
    seconds: Math.min(60, Math.max(8, Number(item.seconds) || Math.round(brief.duration / 5))),
  }));
  for (const act of acts) {
    if (!act.title || !act.purpose || !act.visual || !act.narration || !act.trust) throw new Error(`第 ${act.index} 幕字段不完整。`);
  }
  const lockedVisualBible = [
    `执行效果契约 ${productionContract.id}。`,
    `视觉处方：${productionContract.visual.style_label}（${productionContract.visual.style_id}）。`,
    `色盘：${productionContract.visual.palette_label}。镜头：${productionContract.visual.camera}。`,
    productionContract.visual.continuity,
    productionContract.visual.prompt_prefix,
    cleanText(raw.visual_bible, 700),
  ].filter(Boolean).join(" ");
  return {
    schema: "knowledge-video-plan/v1",
    title: cleanText(raw.title, 120) || brief.topic,
    learning_promise: cleanText(raw.learning_promise, 500) || brief.objective,
    visual_bible: lockedVisualBible.slice(0, 1800),
    facts_boundary: cleanText(raw.facts_boundary, 700) || brief.evidence,
    production_contract_id: productionContract.id,
    acts,
  };
}

function mockPlan(brief, productionContract) {
  const source = brief.evidence.slice(0, 110);
  return normalizePlan({
    title: brief.topic,
    learning_promise: brief.objective,
    visual_bible: "16:9 当代手绘知识插画，统一人物与环境，深色线稿逐步显色；视觉关系清楚，不生成任何文字、公式、水印或标志。",
    facts_boundary: `事实只来自用户材料：${source}。所有比例、路径和结构图均为解释性示意。`,
    acts: [
      { role: "问题进入", title: brief.entry || `从日常经验追问${brief.topic}`, purpose: "激活已有经验并建立必须解释的问题。", visual: "同一场景中并置两个可比较现象，人物先观察，不提前出现答案。", narration: `我们从一个看得见的反差开始：${brief.entry || brief.topic}。`, trust: "生活观察用于提出问题，不作为因果证据。", seconds: 16 },
      { role: "拆开误解", title: `检验“${brief.misconception || "常见直觉"}”`, purpose: "用它无法解释的现象暴露推理缺口。", visual: "保留第一幕主体和构图，引入一个清晰反例。", narration: `很多人会认为：${brief.misconception || "表面现象就是原因"}。但这个解释遗漏了关键关系。`, trust: "反例只能排除旧解释，不能单独证明新模型。", seconds: 17 },
      { role: "建立模型", title: "建立能够容纳证据的最小模型", purpose: brief.objective, visual: "用三到四个实体和方向关系呈现机制，色彩只追踪当前因果链。", narration: `更准确的解释需要回到这些事实：${source}。`, trust: "画面中的尺寸、距离和运动为示意，不按真实比例。", seconds: 22 },
      { role: "证据解释", title: "把事实放回模型中的正确位置", purpose: "让输入材料逐条支持关系，而不是以动画替代证据。", visual: "用变量变化前后的对照构图展示关系。", narration: `现在把材料与模型对齐：${source}。这支持的是关系，而不是一切情境下的绝对结论。`, trust: "保留材料来源、适用条件和不确定性。", seconds: 20 },
      { role: "迁移收束", title: "回到开头，用新模型重新观看", purpose: "让观众解释新情境并完成知识迁移。", visual: "回到第一幕场景，同一人物用新的观察关系完成解释。", narration: `现在我们可以完成最初的学习目标：${brief.objective}。`, trust: "结论不超出已提供材料与本片展示范围。", seconds: 15 },
    ],
  }, brief, productionContract);
}

async function minimaxJsonPlan(brief, productionContract) {
  if (config.mock) return { plan: mockPlan(brief, productionContract), usage: { mode: "mock" } };
  if (!config.apiKey) throw new Error("MiniMax API Key 未配置。");
  const prompt = `你是知识视频教学导演。只基于用户提供的材料构建五幕方案，不补造数据、来源、人物或历史事实。效果契约是已经批准的执行约束，不得重新选择画风、色盘、镜头语言或叙事结构。不要逐字计数，不要复述任务；保持推理极短并尽快给出最终 JSON。\n\n用户简报：\n${JSON.stringify(brief, null, 2)}\n\n已批准效果契约：\n${JSON.stringify(productionContract, null, 2)}\n\n只输出一个 JSON 对象，不要 Markdown，不要解释。结构必须为：\n{"title":"","learning_promise":"","visual_bible":"在效果契约内补充五幕统一主体、环境与禁止生成文字的约束","facts_boundary":"事实、解释、艺术示意的边界","acts":[{"role":"问题进入","title":"","purpose":"","visual":"服从效果契约且可直接转为生图提示的画面任务，不含画中文字","narration":"40到110字中文旁白","trust":"本幕可信边界","seconds":18}]}\nacts 必须恰好 5 项，顺序为问题进入、拆开误解、建立模型、证据解释、迁移收束；每幕旁白控制在 40 到 80 个汉字，总时长接近 ${brief.duration} 秒。`;
  const response = await fetch(new URL("/v1/chat/completions", config.apiBase), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.textModel, stream: false, temperature: 0.2, max_tokens: 5200, messages: [{ role: "user", content: prompt }] }),
    signal: AbortSignal.timeout(180_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`MiniMax 文本请求失败 (${response.status})：${cleanText(result.error?.message || result.base_resp?.status_msg || response.statusText, 300)}`);
  const rawContent = result.choices?.[0]?.message?.content;
  const content = Array.isArray(rawContent) ? rawContent.map((block) => block?.text || block?.content || "").join("\n") : rawContent;
  if (!content) throw new Error("MiniMax 文本响应中没有方案内容。");
  let parsed;
  try {
    parsed = parseFirstJsonObject(content);
  } catch (error) {
    console.error("[studio] MiniMax plan parse failed", JSON.stringify({
      reason: error.message,
      length: String(content).length,
    }));
    throw new Error("MiniMax 方案不是有效 JSON，请重新生成。");
  }
  return { plan: normalizePlan(parsed, brief, productionContract), usage: result.usage || null };
}

async function generateImage(prompt) {
  const response = await fetch(new URL("/v1/image_generation", config.apiBase), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.imageModel, prompt, aspect_ratio: "16:9", response_format: "base64" }),
    signal: AbortSignal.timeout(300_000),
  });
  const result = await response.json();
  if (!response.ok || result.base_resp?.status_code) throw new Error(`MiniMax 图片请求失败 (${result.base_resp?.status_code || response.status})：${cleanText(result.base_resp?.status_msg || response.statusText, 300)}`);
  const base64 = result.data?.image_base64?.[0];
  if (!base64) throw new Error("MiniMax 图片响应中没有图像。");
  return { bytes: Buffer.from(base64, "base64"), traceId: result.trace_id || null };
}

async function generateStoryboard(project, requestedIndices = project.plan.acts.map((_, index) => index)) {
  const sceneFiles = [...(project.storyboard?.scenes || [])];
  for (const index of requestedIndices) {
    if (!Number.isInteger(index) || index < 0 || index >= project.plan.acts.length) continue;
    const act = project.plan.acts[index];
    const filename = `scene-${String(index + 1).padStart(2, "0")}.${config.mock ? "png" : "jpg"}`;
    const destination = path.join(projectDir(project.id), filename);
    if (config.mock) {
      await fsp.copyFile(path.join(referenceRoot, `scene-${String(index + 1).padStart(2, "0")}.png`), destination);
    } else {
      if (!config.apiKey) throw new Error("MiniMax API Key 未配置。");
      const prompt = `执行效果契约 ${project.production_contract.id}。\n${project.production_contract.visual.prompt_prefix}\n${project.plan.visual_bible}\n这是同一知识视频的第 ${index + 1} 幕。一致性锚点具有最高优先级：严格复用视觉圣经声明的主体、场景结构、色盘和画材；不得自行增加或改变人物。如果视觉圣经明确无人物，所有镜头都必须保持无人物。\n教学主题：${project.brief.topic}\n本幕：${act.title}\n画面任务：${act.visual}\n只生成一个清晰的 16:9 场景画面。最高优先级禁令：画面任何位置都不能出现文字、字母、数字、公式、字幕、标签、图例、标志、水印或类似文字的笔画；不要箭头、坐标轴、标注线或信息图边框；若画面任务暗示标签或解释文字，改用纯色光点、光束与空间关系表达。`;
      const image = await generateImage(prompt);
      await fsp.writeFile(destination, image.bytes);
    }
    sceneFiles[index] = { index: index + 1, file: filename, url: projectUrl(project.id, filename), title: act.title, status: "generated", production_contract_id: project.production_contract.id, visual_style: project.production_contract.visual.style_id };
    event(project, "IMAGE", `第 ${index + 1} 幕图像已生成`);
    await saveProject(project);
  }
  return sceneFiles.filter(Boolean);
}

function numberSetting(value, fallback, minimum, maximum) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number) || number < minimum || number > maximum) return fallback;
  return number;
}

async function synthesize(text, voice, speed) {
  const response = await fetch(new URL("/v1/t2a_v2", config.apiBase), {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ttsModel, text, stream: false, language_boost: "Chinese", output_format: "hex", subtitle_enable: true, subtitle_type: "sentence",
      voice_setting: { voice_id: voice, speed, vol: numberSetting(process.env.MINIMAX_TTS_VOLUME, 1, 0.1, 10), pitch: numberSetting(process.env.MINIMAX_TTS_PITCH, -1, -12, 12), emotion: process.env.MINIMAX_TTS_EMOTION || "calm" },
      audio_setting: { sample_rate: 32000, bitrate: 128000, format: "wav", channel: 1 },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const result = await response.json();
  if (!response.ok || result.base_resp?.status_code !== 0) throw new Error(`MiniMax TTS 请求失败 (${result.base_resp?.status_code || response.status})：${cleanText(result.base_resp?.status_msg || response.statusText, 300)}`);
  if (!result.data?.audio) throw new Error("MiniMax TTS 响应中没有音频。");
  return { bytes: Buffer.from(result.data.audio, "hex"), info: result.extra_info || {} };
}

async function mediaDuration(file) {
  const { stdout } = await execFileAsync(config.ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "json", file], { windowsHide: true, maxBuffer: 2_000_000 });
  return Number(JSON.parse(stdout).format.duration);
}

async function runFfmpeg(args) {
  await execFileAsync(config.ffmpeg, args, { cwd: repositoryRoot, windowsHide: true, maxBuffer: 16_000_000 });
}

async function generateVoice(project, options) {
  const voice = cleanText(options?.voice, 80) || process.env.MINIMAX_TTS_VOICE || "female-chengshu";
  const speed = numberSetting(options?.speed, 0.92, 0.5, 2);
  const segments = [];
  for (let index = 0; index < project.plan.acts.length; index += 1) {
    const narration = project.plan.acts[index].narration;
    const expressive = narration.replace(/。/g, "。<#0.22#>").replace(/？/g, "？<#0.30#>").replace(/<#0\.(22|30)#>$/, "");
    const filename = `beat-${String(index + 1).padStart(2, "0")}.wav`;
    const destination = path.join(projectDir(project.id), filename);
    let usageCharacters = 0;
    if (config.mock) {
      await fsp.copyFile(path.join(mockAudioRoot, filename), destination);
    } else {
      if (!config.apiKey) throw new Error("MiniMax API Key 未配置。");
      const audio = await synthesize(expressive, voice, speed);
      usageCharacters = Number(audio.info.usage_characters || 0);
      await fsp.writeFile(destination, audio.bytes);
    }
    const duration = await mediaDuration(destination);
    segments.push({ index: index + 1, file: filename, url: projectUrl(project.id, filename), duration: Number(duration.toFixed(3)), usageCharacters });
    event(project, "AUDIO", `第 ${index + 1} 幕旁白已生成`);
    await saveProject(project);
  }
  const sceneDurations = segments.map((segment) => Number((segment.duration + 0.8).toFixed(3)));
  const filters = sceneDurations.map((value, index) => `[${index}:a]apad=whole_dur=${value},atrim=duration=${value},asetpts=PTS-STARTPTS[a${index}]`);
  const combined = path.join(projectDir(project.id), "narration.wav");
  await runFfmpeg(["-y", "-hide_banner", "-loglevel", "error", ...segments.flatMap((segment) => ["-i", path.join(projectDir(project.id), segment.file)]), "-filter_complex", `${filters.join(";")};${segments.map((_, index) => `[a${index}]`).join("")}concat=n=${segments.length}:v=0:a=1[out]`, "-map", "[out]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1", combined]);
  return { provider: config.mock ? "mock-reference" : "MiniMax China HTTP T2A", model: config.ttsModel, voice, speed, segments, sceneDurations, file: "narration.wav", url: projectUrl(project.id, "narration.wav") };
}

function assTime(seconds) {
  const value = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(value / 360000)}:${String(Math.floor((value % 360000) / 6000)).padStart(2, "0")}:${String(Math.floor((value % 6000) / 100)).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
}

function escapeAss(text) { return text.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N"); }

function wrapSubtitle(text, maximum = 24) {
  if (text.length <= maximum) return text;
  const phrases = text.match(/[^，；：、]+[，；：、]?/g) || [text];
  const lines = [];
  let line = "";
  for (const phrase of phrases) {
    if (line && line.length + phrase.length > maximum) { lines.push(line); line = phrase; } else line += phrase;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

async function composeVideo(project, options) {
  if (!project.storyboard?.scenes?.length || !project.voice?.segments?.length) throw new Error("必须先生成分镜和旁白。");
  const productionContract = project.production_contract;
  if (!productionContract) throw new Error("项目缺少可执行效果契约，请重新生成方案。");
  if (options?.production_contract_id && options.production_contract_id !== productionContract.id) throw new Error("成片请求与项目效果契约不一致，请刷新后重试。");
  const recipe = productionContract.presentation.recipe;
  if (options?.recipe && options.recipe !== recipe) throw new Error("成片配方与已批准效果契约不一致，请回到第一步修改并重新生成。");
  const ratio = ["16:9", "9:16", "1:1"].includes(options?.ratio) ? options.ratio : "16:9";
  const dimensions = { "16:9": [1280, 720], "9:16": [720, 1280], "1:1": [1080, 1080] }[ratio];
  const [width, height] = dimensions;
  const starts = [];
  let cursor = 0;
  for (const value of project.voice.sceneDurations) { starts.push(cursor); cursor += value; }
  const totalDuration = cursor;
  const subtitleEvents = project.plan.acts.flatMap((act, index) => {
    const sentences = act.narration.match(/[^。！？]+[。！？]?/g)?.map((item) => item.trim()).filter(Boolean) || [act.narration];
    const chars = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    const available = Math.max(1, project.voice.segments[index].duration - 0.2);
    let sentenceCursor = starts[index] + 0.08;
    return sentences.map((sentence, sentenceIndex) => {
      const share = available * sentence.length / chars;
      const end = sentenceIndex === sentences.length - 1 ? starts[index] + project.voice.segments[index].duration + 0.15 : sentenceCursor + share - 0.03;
      const line = `Dialogue: 0,${assTime(sentenceCursor)},${assTime(end)},Narration,,0,0,0,,${escapeAss(wrapSubtitle(sentence))}`;
      sentenceCursor += share;
      return line;
    });
  });
  const cardEvents = project.plan.acts.flatMap((act, index) => {
    const start = starts[index] + 0.25;
    const end = starts[index] + Math.min(project.voice.sceneDurations[index] - 0.25, 5.8);
    return [
      `Dialogue: 1,${assTime(start)},${assTime(end)},Kicker,,0,0,0,,${escapeAss(`0${index + 1} · ${act.role}`)}`,
      `Dialogue: 1,${assTime(start + 0.14)},${assTime(end)},Title,,0,0,0,,${escapeAss(wrapSubtitle(act.title, 20))}`,
    ];
  });
  const poetic = recipe === "poetic";
  const accentColour = poetic ? "&H006CCCE8" : recipe === "handdrawn" ? "&H006DF4B9" : "&H0033D9FF";
  const titleAlignment = poetic ? 8 : 7;
  const narrationMargin = Math.round(height * (poetic ? 0.075 : 0.05));
  const ass = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${width}\nPlayResY: ${height}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Narration,Microsoft YaHei,${ratio === "9:16" ? 34 : poetic ? 26 : 28},&H00FFFFFF,&H00FFFFFF,&HB020252D,&HC0000000,0,${poetic ? 1 : 0},0,0,100,100,1,0,1,2,0,2,${Math.round(width * 0.09)},${Math.round(width * 0.09)},${narrationMargin},1\nStyle: Kicker,Microsoft YaHei,${ratio === "9:16" ? 23 : 19},${accentColour},&H00FFFFFF,&HAA123A4D,&H90000000,1,0,0,0,100,100,2,0,1,1.5,0,${titleAlignment},${Math.round(width * 0.05)},${Math.round(width * 0.05)},${Math.round(height * 0.055)},1\nStyle: Title,Microsoft YaHei,${ratio === "9:16" ? 42 : poetic ? 34 : 36},&H00FFFFFF,&H00FFFFFF,&HAA123A4D,&H90000000,1,0,0,0,100,100,1,0,1,2,0,${titleAlignment},${Math.round(width * 0.06)},${Math.round(width * 0.06)},${Math.round(height * 0.085)},1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${cardEvents.concat(subtitleEvents).join("\n")}\n`;
  const subtitleFile = path.join(projectDir(project.id), "subtitles.ass");
  await fsp.writeFile(subtitleFile, ass, "utf8");
  const imageFiles = project.storyboard.scenes.map((scene) => path.join(projectDir(project.id), scene.file));
  const inputArgs = imageFiles.flatMap((file, index) => ["-loop", "1", "-framerate", "30", "-t", String(project.voice.sceneDurations[index]), "-i", file]);
  const imageFilters = project.voice.sceneDurations.map((duration, index) => {
    const scaledWidth = Math.ceil(width * 1.08 / 2) * 2;
    const scaledHeight = Math.ceil(height * 1.08 / 2) * 2;
    const fadeEnd = Math.max(0, duration - 0.45).toFixed(2);
    const x = index % 2 === 0 ? `(iw-ow)*t/${duration}` : `(iw-ow)*(1-t/${duration})`;
    if (recipe === "poetic") {
      const insetWidth = Math.ceil(width * 0.9 / 2) * 2;
      const insetHeight = Math.ceil(height * 0.82 / 2) * 2;
      return `[${index}:v]fps=30,scale=${insetWidth}:${insetHeight}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x101614,setsar=1,fade=t=in:st=0:d=0.8,fade=t=out:st=${Math.max(0, duration - 0.8).toFixed(2)}:d=0.8,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
    }
    const materialFilter = recipe === "handdrawn" ? ",eq=saturation=0.78:contrast=1.08:brightness=0.015,unsharp=5:5:0.45:5:5:0" : "";
    return `[${index}:v]fps=30,scale=${scaledWidth}:${scaledHeight}:force_original_aspect_ratio=increase,crop=${width}:${height}:x='${x}':y='(ih-oh)/2'${materialFilter},setsar=1,fade=t=in:st=0:d=0.45,fade=t=out:st=${fadeEnd}:d=0.45,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
  });
  const relativeAss = path.relative(repositoryRoot, subtitleFile).replaceAll("\\", "/").replaceAll(":", "\\:");
  const composeFilter = [
    ...imageFilters,
    `${imageFiles.map((_, index) => `[v${index}]`).join("")}concat=n=${imageFiles.length}:v=1:a=0,ass='${relativeAss}',format=yuv420p[vout]`,
    `[5:a]volume=1.5dB[narration]`,
    `[6:a]highpass=f=90,lowpass=f=900,volume=0.004[ambient]`,
    `[narration][ambient]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-18:LRA=6:TP=-2[aout]`,
  ].join(";");
  const output = path.join(projectDir(project.id), "final.mp4");
  await runFfmpeg(["-y", "-hide_banner", "-loglevel", "error", ...inputArgs, "-i", path.join(projectDir(project.id), project.voice.file), "-f", "lavfi", "-t", String(totalDuration), "-i", "anoisesrc=color=pink:amplitude=0.15:sample_rate=32000", "-filter_complex", composeFilter, "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", "30", "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "32000", "-movflags", "+faststart", "-shortest", output]);
  const duration = await mediaDuration(output);
  return { file: "final.mp4", url: projectUrl(project.id, "final.mp4"), subtitles: "subtitles.ass", ratio, width, height, duration: Number(duration.toFixed(3)), bytes: (await fsp.stat(output)).size, renderer: `deterministic FFmpeg · ${productionContract.presentation.label}`, recipe, production_contract_id: productionContract.id };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("请求体超过 1 MB 限制。");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); } catch { throw new Error("请求体不是有效 JSON。"); }
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return origin === `http://127.0.0.1:${config.port}` || origin === `http://localhost:${config.port}`;
}

async function handleApi(req, res, url) {
  if (!isAllowedOrigin(req)) return sendJson(res, 403, { error: "Only the same local studio origin may call generation APIs." });
  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true, name: config.mock ? "本地生成服务 · MOCK" : "本地生成服务",
      mode: config.mock ? "mock" : "live", apiKeyConfigured: Boolean(config.apiKey),
      models: { text: config.textModel, image: config.imageModel, speech: config.ttsModel },
      productionContract: { schema: "knowledge-video-production-contract/v1", renderRecipes: Object.keys(presentationProfiles), qualityRoutes: { automatic: "executable", curated: "agent-assisted" } },
      security: { bind: `${config.host}:${config.port}`, keyExposedToBrowser: false, fileOriginAllowed: false },
    });
  }
  if (req.method === "GET" && /^\/api\/projects\/[^/]+$/.test(url.pathname)) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    return sendJson(res, 200, await loadProject(id));
  }
  if (req.method !== "POST" || !url.pathname.startsWith("/api/actions/")) return sendJson(res, 404, { error: "API route not found." });
  const action = url.pathname.slice("/api/actions/".length);
  const body = await readBody(req);
  if (action === "plan") {
    const brief = validateBrief(body.project);
    const productionContract = validateProductionContract(body.production_contract);
    const id = makeProjectId();
    const project = { schema: "knowledge-video-project/v1", id, mode: config.mock ? "mock" : "live", status: "planning", created_at: new Date().toISOString(), brief, production_contract: productionContract, events: [] };
    event(project, "CONTRACT", `锁定效果契约 ${productionContract.id}：${productionContract.visual.style_label} + ${productionContract.presentation.label}`);
    event(project, "PLAN", "开始按效果契约生成知识方案", "running");
    await saveProject(project);
    const result = await minimaxJsonPlan(brief, productionContract);
    project.plan = result.plan;
    project.usage = { text: result.usage };
    project.status = "plan_ready";
    event(project, "PLAN", "五幕知识方案已生成");
    await saveProject(project);
    return sendJson(res, 200, { ok: true, mode: project.mode, project_id: id, production_contract: project.production_contract, plan: project.plan, usage: result.usage });
  }
  const id = assertProjectId(body.project_id);
  const project = await loadProject(id);
  if (action === "storyboard") {
    project.status = "generating_images";
    event(project, "IMAGE", "开始生成五幕分镜", "running");
    await saveProject(project);
    const requestedIndices = Array.isArray(body.scene_indices) ? [...new Set(body.scene_indices.map(Number))] : undefined;
    project.storyboard = { provider: config.mock ? "mock-reference" : "MiniMax Image", model: config.imageModel, production_contract_id: project.production_contract.id, visual_style: project.production_contract.visual.style_id, scenes: await generateStoryboard(project, requestedIndices) };
    project.status = "storyboard_ready";
    event(project, "IMAGE", "五幕分镜生成完成");
    await saveProject(project);
    return sendJson(res, 200, { ok: true, mode: project.mode, project_id: id, production_contract: project.production_contract, storyboard: project.storyboard });
  }
  if (action === "voice") {
    project.status = "generating_audio";
    event(project, "AUDIO", "开始生成旁白", "running");
    await saveProject(project);
    project.voice = await generateVoice(project, body.options);
    project.status = "audio_ready";
    event(project, "AUDIO", "旁白与真实时长已生成");
    await saveProject(project);
    return sendJson(res, 200, { ok: true, mode: project.mode, project_id: id, voice: project.voice });
  }
  if (action === "render") {
    project.status = "rendering";
    event(project, "RENDER", "开始确定性合成", "running");
    await saveProject(project);
    project.render = await composeVideo(project, body.options);
    project.status = "complete";
    event(project, "RENDER", "H.264/AAC 成片与字幕已生成");
    await saveProject(project);
    return sendJson(res, 200, { ok: true, mode: project.mode, project_id: id, production_contract: project.production_contract, render: project.render, events: project.events });
  }
  return sendJson(res, 404, { error: "Unknown action." });
}

function safeStaticPath(root, requestPath) {
  const decoded = decodeURIComponent(requestPath).replaceAll("\\", "/");
  const relative = decoded.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  const normalizedRoot = `${path.resolve(root)}${path.sep}`.toLowerCase();
  if (!`${resolved}${path.sep}`.toLowerCase().startsWith(normalizedRoot)) throw new Error("Invalid path.");
  return resolved;
}

async function serveFile(req, res, file) {
  const stat = await fsp.stat(file);
  if (!stat.isFile()) throw Object.assign(new Error("Not found"), { code: "ENOENT" });
  const contentType = mimeTypes[path.extname(file).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const match = range.match(/^bytes=(\d*)-(\d*)$/);
    if (!match) return res.writeHead(416).end();
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
    if (start > end || start >= stat.size) return res.writeHead(416, { "Content-Range": `bytes */${stat.size}` }).end();
    res.writeHead(206, { "Content-Type": contentType, "Content-Length": end - start + 1, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Accept-Ranges": "bytes", "Cache-Control": "no-store" });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { "Content-Type": contentType, "Content-Length": stat.size, "Accept-Ranges": "bytes", "Cache-Control": file.includes("generated-studio") ? "no-store" : "public, max-age=60" });
  createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || `${config.host}:${config.port}`}`);
  try {
    if (requestUrl.pathname.startsWith("/api/")) return await handleApi(req, res, requestUrl);
    if (requestUrl.pathname === "/") {
      res.writeHead(302, { Location: "/demos/story-to-handdrawn-video/studio.html" });
      return res.end();
    }
    if (requestUrl.pathname.startsWith("/generated-studio/")) {
      const relative = requestUrl.pathname.slice("/generated-studio/".length);
      return await serveFile(req, res, safeStaticPath(outputRoot, relative));
    }
    return await serveFile(req, res, safeStaticPath(docsRoot, requestUrl.pathname));
  } catch (error) {
    const status = error.code === "ENOENT" ? 404 : 500;
    if (requestUrl.pathname.startsWith("/api/")) sendJson(res, status, { error: cleanText(error.message, 500) || "Internal error" });
    else sendJson(res, status, { error: status === 404 ? "Not found" : "Server error" });
  }
});

server.listen(config.port, config.host, () => {
  console.log(JSON.stringify({
    name: "Knowledge Video Studio local service",
    url: `http://${config.host}:${config.port}/demos/story-to-handdrawn-video/studio.html`,
    mode: config.mock ? "mock" : "live",
    apiKeyConfigured: Boolean(config.apiKey),
    models: { text: config.textModel, image: config.imageModel, speech: config.ttsModel },
    generatedFiles: outputRoot,
  }, null, 2));
});

function shutdown() { server.close(() => process.exit(0)); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
