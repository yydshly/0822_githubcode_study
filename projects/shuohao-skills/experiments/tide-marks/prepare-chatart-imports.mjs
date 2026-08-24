#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const script = JSON.parse(fs.readFileSync(path.join(root, "script", "潮痕-script.json"), "utf8"));
const cast = JSON.parse(fs.readFileSync(path.join(root, "characters", "潮痕-cast.json"), "utf8"));
const art = JSON.parse(fs.readFileSync(path.join(root, "art", "潮痕-art.json"), "utf8"));
const continuityPolicy = JSON.parse(fs.readFileSync(path.join(root, "continuity-audit-policy.json"), "utf8"));

const castById = new Map(cast.characters.map((item) => [item.id, item]));
const sceneById = new Map(art.scenes.map((item) => [item.id, item]));
const propById = new Map(art.props.map((item) => [item.id, item]));
const scriptByEp = new Map(script.episodes.map((item) => [item.ep, item]));
const abs = (value) => path.resolve(value);
const MAX_FRAME_REFERENCES = 5;
const allSegments = storyboard.episodes.flatMap((episode) => episode.segments);
const segmentIndexById = new Map(allSegments.map((segment, index) => [segment.id, index]));
const blockedBoundaryIds = new Set(continuityPolicy.blocked || []);
const verifyBoundaryIds = new Set(continuityPolicy.verify || []);
const cleanAction = (value) => String(value || "").replace(/^动作：/, "").replaceAll("；动作：", "；");

function boundaryInfo(previous, next) {
  if (!previous || !next) return null;
  const id = `${previous.id}→${next.id}`;
  const risk = blockedBoundaryIds.has(id) ? "高" : verifyBoundaryIds.has(id) ? "中" : "低";
  const repair = continuityPolicy.repairs?.[id];
  return {
    id,
    risk,
    status: risk === "高" ? "阻断投产" : risk === "中" ? "待链路验证" : "可按现有切点",
    previousEndState: cleanAction(previous.cuts.at(-1).descriptionZh),
    nextStartState: cleanAction(next.cuts[0].descriptionZh),
    contract: repair?.action || (previous.sceneZh === next.sceneZh
      ? "保持人物位置、朝向、手中物品、运动轴和物体开合状态；生成后连播接点两侧各 2 秒。"
      : "用明确离场/到达或建立镜交代场景变化，不把时空跳转伪装成同一秒连续动作。"),
  };
}

function sceneSheet(sceneId, lighting) {
  const scene = sceneById.get(sceneId);
  const candidates = [
    path.join(root, "art", "images", `${scene.name}-${lighting}-sheet.png`),
    path.join(root, "art", "images", `${scene.name}-sheet.png`),
  ];
  return candidates.find((item) => fs.existsSync(item)) || candidates.at(-1);
}
const characterSheet = (id) => path.join(root, "characters", "images", `${castById.get(id)?.name || id}-sheet.png`);
const propSheet = (id) => path.join(root, "art", "images", `${propById.get(id)?.name || id}-sheet.png`);
const segmentSeconds = (segment) => segment.cuts.reduce((sum, cut) => sum + cut.seconds, 0);

const imports = [];
for (const episode of storyboard.episodes) {
  const scriptEpisode = scriptByEp.get(episode.ep);
  for (const segment of episode.segments) {
    const dir = path.join(pack, segment.id);
    fs.mkdirSync(dir, { recursive: true });
    const scriptScene = scriptEpisode.scenes[segment.sceneIndex - 1];
    const scene = sceneById.get(scriptScene.sceneId);
    const globalIndex = segmentIndexById.get(segment.id);
    const incomingBoundary = boundaryInfo(allSegments[globalIndex - 1], segment);
    const outgoingBoundary = boundaryInfo(segment, allSegments[globalIndex + 1]);
    const adjacentBoundaries = [incomingBoundary, outgoingBoundary].filter(Boolean);
    const continuityState = adjacentBoundaries.some((item) => item.risk === "高") ? "阻断" : adjacentBoundaries.some((item) => item.risk === "中") ? "待验证" : "可直连";
    const seconds = segmentSeconds(segment);
    const images = segment.cuts.map((cut, index) => ({
      token: `@Image${index + 1}`,
      file: `f${index + 1}.png`,
      absolutePath: abs(path.join(dir, `f${index + 1}.png`)),
      startSeconds: cut.startSeconds ?? segment.cutStarts?.[index] ?? 0,
      exists: fs.existsSync(path.join(dir, `f${index + 1}.png`)),
      chineseDescription: cut.descriptionZh || "",
      postProductionZh: cut.postProductionZh || "",
    }));

    const markdownPrompt = fs.readFileSync(path.join(dir, "prompt.md"), "utf8");
    const body = markdownPrompt.includes("\n---\n") ? markdownPrompt.split("\n---\n").slice(1).join("\n---\n").trim() : markdownPrompt.trim();
    let chatartPrompt = body;
    for (let index = images.length; index >= 1; index--) {
      chatartPrompt = chatartPrompt.replaceAll(`<Picture ${index}>`, `@Image${index}`).replaceAll(`Picture ${index}`, `@Image${index}`);
    }
    const continuityPrompt = [
      "CROSS-SEGMENT CONTINUITY GATES:",
      incomingBoundary ? `IN ${incomingBoundary.id} (${incomingBoundary.status}): The previous segment has already ended with: ${incomingBoundary.previousEndState} Start only from this segment's declared opening action: ${incomingBoundary.nextStartState} Do not repeat, reverse or contradict the completed prior action. Contract: ${incomingBoundary.contract}` : "IN: This is the opening segment; no previous segment state.",
      outgoingBoundary ? `OUT ${outgoingBoundary.id} (${outgoingBoundary.status}): Complete this segment's declared end state: ${outgoingBoundary.previousEndState} Do not prematurely perform the next segment action: ${outgoingBoundary.nextStartState} Contract: ${outgoingBoundary.contract}` : "OUT: This is the final segment; hold the declared closing composition.",
    ].join("\n");
    chatartPrompt = `${chatartPrompt}\n\n${continuityPrompt}`;
    fs.writeFileSync(path.join(dir, "chatart-prompt.txt"), `${chatartPrompt}\n`, "utf8");

    const postNotes = images.filter((item) => item.postProductionZh);
    const upload = [
      `# ${segment.id} · ChatArt 导入顺序`, "",
      "必须逐张上传，不能依赖文件选择窗口的排序。上传完成后，核对缩略图顺序与下面完全一致。", "",
      "| 序号 | 提示词引用 | 文件 | 切点 | 状态 | 中文内容 | 后期处理 |", "| ---: | --- | --- | ---: | --- | --- | --- |",
      ...images.map((item, index) => `| ${index + 1} | ${item.token} | \`${item.absolutePath}\` | ${Number(item.startSeconds).toFixed(2)}s | ${item.exists ? "已存在" : "待生成"} | ${item.chineseDescription} | ${item.postProductionZh || "无"} |`),
      "", "## 参数", "",
      `- 模型：MiniMax H3`, `- 模式：全能模式`, `- 清晰度：768P`, `- 画幅：16:9`,
      `- 设计时长：${seconds}s`, `- ChatArt 建议时长：${Math.ceil(seconds)}s`, `- 预计成本：${Math.ceil(seconds) * 15} 钻`,
      "", "## 粘贴提示词", "",
      "复制同目录 `chatart-prompt.txt`。其中 @Image1、@Image2……必须与上表的上传顺序一致。", "",
      "## 段间衔接质量门", "",
      `- 本段状态：**${continuityState}**。这与“图片齐全”是两个不同结论。`,
      ...(incomingBoundary ? [`- 入段 ${incomingBoundary.id}（${incomingBoundary.status}）：上一段终态“${incomingBoundary.previousEndState}”；本段起态“${incomingBoundary.nextStartState}”。`, `- 入段契约：${incomingBoundary.contract}`] : ["- 入段：全片第一段，无上一段。"]),
      ...(outgoingBoundary ? [`- 出段 ${outgoingBoundary.id}（${outgoingBoundary.status}）：本段必须完成“${outgoingBoundary.previousEndState}”；不得提前执行下一段“${outgoingBoundary.nextStartState}”。`, `- 出段契约：${outgoingBoundary.contract}`] : ["- 出段：全片结尾，保持既定结束构图。"]),
      "- 生成后至少连播上一段尾 2 秒与下一段首 2 秒；阻断状态未修复前不得批量投产。", "",
      ...(postNotes.length ? ["## 后期叠加与剪辑说明", "", ...postNotes.map((item) => `- ${item.file}：${item.postProductionZh}`), ""] : []),
    ].join("\n");
    fs.writeFileSync(path.join(dir, "UPLOAD-ORDER.md"), upload, "utf8");

    const continuityGuide = [
      `# ${segment.id} · 段间衔接契约`, "",
      `当前状态：**${continuityState}**`, "",
      ...(incomingBoundary ? ["## 入段", "", `- 接点：${incomingBoundary.id}`, `- 风险：${incomingBoundary.risk} · ${incomingBoundary.status}`, `- 上一段终态：${incomingBoundary.previousEndState}`, `- 本段起态：${incomingBoundary.nextStartState}`, `- 契约：${incomingBoundary.contract}`, `- 对照图：上一段最后一帧 ${abs(path.join(pack, allSegments[globalIndex - 1].id, `f${allSegments[globalIndex - 1].cuts.length}.png`))} → 本段第一帧 ${images[0].absolutePath}`, ""] : ["## 入段", "", "全片第一段，无上一段。", ""]),
      ...(outgoingBoundary ? ["## 出段", "", `- 接点：${outgoingBoundary.id}`, `- 风险：${outgoingBoundary.risk} · ${outgoingBoundary.status}`, `- 本段终态：${outgoingBoundary.previousEndState}`, `- 下一段起态：${outgoingBoundary.nextStartState}`, `- 契约：${outgoingBoundary.contract}`, `- 对照图：本段最后一帧 ${images.at(-1).absolutePath} → 下一段第一帧 ${abs(path.join(pack, allSegments[globalIndex + 1].id, "f1.png"))}`, ""] : ["## 出段", "", "全片最后一段，保持既定结束构图。", ""]),
      "## 验收", "", "生成后连播接点两侧各 2 秒，逐项检查人物位置/朝向、手中物品、门或容器状态、运动方向、视线、对白因果与时间地点交代。", "",
    ].join("\n");
    fs.writeFileSync(path.join(dir, "SEGMENT-CONTINUITY.zh-CN.md"), continuityGuide, "utf8");

    const framePromptDir = path.join(dir, "frame-prompts");
    fs.mkdirSync(framePromptDir, { recursive: true });
    segment.cuts.forEach((cut, index) => {
      const refs = [sceneSheet(scriptScene.sceneId, scriptScene.lighting)];
      for (const id of cut.characters || []) refs.push(characterSheet(id));
      const referencePropIds = cut.referenceProps || cut.props || [];
      for (const id of referencePropIds) refs.push(propSheet(id));
      const continuityRefs = (cut.continuityRefs || []).map((ref) => path.isAbsolute(ref) ? ref : path.join(root, ref));
      refs.push(...continuityRefs);
      if (index > 0) refs.push(path.join(dir, "f1.png"));
      const uniqueRefs = [...new Set(refs)];
      if (uniqueRefs.length > MAX_FRAME_REFERENCES) {
        throw new Error(`${segment.id}/f${index + 1}: 生图参考图 ${uniqueRefs.length} 张，超过内置图像生成上限 ${MAX_FRAME_REFERENCES}；请用 referenceProps 精简，并由连续性帧承接既有资产。`);
      }
      const refLines = uniqueRefs.map((ref, refIndex) => `${refIndex + 1}. ${abs(ref)} — ${fs.existsSync(ref) ? "可用" : "基础参考图待补"}`);
      const roles = [`Image 1 is the exact ${scene?.name || scriptScene.sceneId} environment and ${scriptScene.lighting} lighting reference.`];
      let cursor = 2;
      for (const id of cut.characters || []) roles.push(`Image ${cursor++} is the exact identity, face, clothing and proportions reference for ${castById.get(id)?.name || id}.`);
      for (const id of referencePropIds) roles.push(`Image ${cursor++} is the exact prop-design reference for ${propById.get(id)?.name || id}.`);
      for (const ref of continuityRefs) roles.push(`Image ${cursor++} is the exact previous-storyboard continuity frame ${path.basename(path.dirname(ref))}/${path.basename(ref)}; use it to lock the already established object state, damage and spatial continuity.`);
      if (index > 0) roles.push(`The final image is f1.png from this segment and locks continuity with the segment's opening world.`);
      if (roles.length !== uniqueRefs.length) throw new Error(`${segment.id}/f${index + 1}: 参考图去重后与角色说明数量不一致`);
      const framePrompt = [
        `# ${segment.id} / f${index + 1}.png 分镜图生成说明`, "",
        "## 参考图（按下列顺序挂载）", "", ...refLines, "",
        "## 内置图像生成提示词", "", "```text",
        "Use case: illustration-story",
        `Asset type: cinematic 16:9 AI-video storyboard keyframe for ${segment.id} Shot ${index + 1}`,
        `Input images: ${roles.join(" ")}`,
        `Primary request: ${cut.frame}`,
        `Chinese story intent: ${cut.descriptionZh || "按剧本节拍构图。"}`,
        "Composition/framing: one 16:9 landscape cinematic frame matching the requested shot size; preserve spatial continuity and keep the action readable.",
        "Constraints: preserve all referenced faces, clothing, environment anchors and prop geometry; natural anatomy and hands; no extra people; no face fusion; no readable text; no subtitles; no watermark; no borders; no collage — one clean full-bleed frame.",
        "```", "",
        ...(cut.postProductionZh ? ["## 后期处理（不要交给生图模型）", "", cut.postProductionZh, ""] : []),
        `生成后保存为：\`${abs(path.join(dir, `f${index + 1}.png`))}\``, "",
      ].join("\n");
      fs.writeFileSync(path.join(framePromptDir, `f${index + 1}.md`), framePrompt, "utf8");
    });

    const record = {
      segment: segment.id,
      episode: episode.ep,
      scene: { id: scriptScene.sceneId, name: scene?.name || scriptScene.sceneId, lighting: scriptScene.lighting },
      model: "MiniMax H3", mode: "全能模式", quality: "768P", ratio: "16:9",
      designSeconds: seconds, chatartSeconds: Math.ceil(seconds), estimatedDiamonds: Math.ceil(seconds) * 15,
      uploadOrder: images,
      promptFile: abs(path.join(dir, "chatart-prompt.txt")),
      uploadGuide: abs(path.join(dir, "UPLOAD-ORDER.md")),
      promptCharacters: chatartPrompt.length,
      withinChatArtPromptLimit: chatartPrompt.length <= 5000,
      continuity: { state: continuityState, incoming: incomingBoundary, outgoing: outgoingBoundary },
      ready: images.every((item) => item.exists),
    };
    fs.writeFileSync(path.join(dir, "import.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8");
    imports.push(record);
  }
}

fs.writeFileSync(path.join(pack, "chatart-import-manifest.json"), `${JSON.stringify(imports, null, 2)}\n`, "utf8");
const ready = imports.filter((item) => item.ready).length;
const overLimit = imports.filter((item) => !item.withinChatArtPromptLimit);
console.log(`✓ ${imports.length} 段导入包：${ready} 段图片齐全，${imports.length - ready} 段待补图`);
console.log(`✓ 生成 chatart-prompt.txt / UPLOAD-ORDER.md / import.json / 193 份分镜图生成说明`);
console.log(overLimit.length ? `⚠ ${overLimit.length} 段提示词超过 5000 字符：${overLimit.map((item) => item.segment).join(", ")}` : "✓ 所有 ChatArt 提示词均不超过 5000 字符");
