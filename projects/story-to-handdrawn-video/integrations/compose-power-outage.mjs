import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const assetDir = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "power-outage-demo");
const audioDir = path.join(projectRoot, "generated-audio", "power-outage");
const outputVideo = path.join(assetDir, "after-the-power-went-out-i-saw-electricity.mp4");

function run(command, args) {
  execFileSync(command, args, { cwd: repositoryRoot, stdio: "inherit", windowsHide: true });
}

function duration(file) {
  const raw = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", file], { encoding: "utf8", windowsHide: true });
  return Number(JSON.parse(raw).format.duration);
}

function assTime(seconds) {
  const value = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(value / 360000)}:${String(Math.floor((value % 360000) / 6000)).padStart(2, "0")}:${String(Math.floor((value % 6000) / 100)).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
}

function escapeAss(text) {
  return text.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N");
}

function wrapSubtitle(text, maximum = 26) {
  if (text.length <= maximum) return text;
  const phrases = text.match(/[^，；：、]+[，；：、]?/g) || [text];
  const lines = [];
  let line = "";
  for (const phrase of phrases) {
    if (line && line.length + phrase.length > maximum) {
      lines.push(line);
      line = phrase;
    } else line += phrase;
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

const narration = await fs.readFile(path.join(assetDir, "narration.txt"), "utf8");
const beats = narration.trim().split(/\r?\n\s*\r?\n/).map((text) => text.trim()).filter(Boolean);
if (beats.length !== 5) throw new Error(`Expected five narration beats, found ${beats.length}.`);

const beatFiles = beats.map((_, index) => path.join(audioDir, `beat-${String(index + 1).padStart(2, "0")}.wav`));
await Promise.all(beatFiles.map((file) => fs.access(file)));
const speechDurations = beatFiles.map(duration);
const sceneDurations = speechDurations.map((value) => Number((value + 1.15).toFixed(2)));
const starts = [];
let cursor = 0;
for (const value of sceneDurations) {
  starts.push(Number(cursor.toFixed(2)));
  cursor += value;
}
const totalDuration = Number(cursor.toFixed(2));

const narrationFilters = sceneDurations.map((value, index) => `[${index}:a]apad=whole_dur=${value},atrim=duration=${value},asetpts=PTS-STARTPTS[a${index}]`);
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...beatFiles.flatMap((file) => ["-i", file]),
  "-filter_complex", `${narrationFilters.join(";")};${sceneDurations.map((_, index) => `[a${index}]`).join("")}concat=n=5:v=0:a=1[narration]`,
  "-map", "[narration]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1", path.join(assetDir, "narration.wav"),
]);

const humDelay = Math.round(starts[3] * 1000);
const restoreDelay = Math.round(starts[4] * 1000 + 120);
const fanDelay = Math.round(starts[4] * 1000 + 300);
const ambientFilter = [
  `[0:a]lowpass=f=480,highpass=f=70,volume=0.008[room]`,
  `[1:a]afade=t=in:st=0:d=1.6,volume=0.008,adelay=${humDelay}|${humDelay}[grid]`,
  `[2:a]afade=t=out:st=0.05:d=0.15,volume=0.022,adelay=${restoreDelay}|${restoreDelay}[relay]`,
  `[3:a]lowpass=f=760,highpass=f=90,afade=t=in:st=0:d=1.1,volume=0.014,adelay=${fanDelay}|${fanDelay}[fan]`,
  `[room][grid][relay][fan]amix=inputs=4:duration=first:normalize=0,alimiter=limit=0.7[ambient]`,
].join(";");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "anoisesrc=color=brown:amplitude=0.4:sample_rate=32000",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "sine=frequency=60:sample_rate=32000",
  "-f", "lavfi", "-t", "0.22", "-i", "sine=frequency=240:sample_rate=32000",
  "-f", "lavfi", "-t", String(Math.max(1, totalDuration - starts[4])), "-i", "anoisesrc=color=pink:amplitude=0.35:sample_rate=32000",
  "-filter_complex", ambientFilter, "-map", "[ambient]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1", path.join(assetDir, "ambient.wav"),
]);

const subtitleEvents = beats.flatMap((text, beatIndex) => {
  const sentences = text.match(/[^。！？]+[。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const available = speechDurations[beatIndex] - 0.28;
  let sentenceCursor = starts[beatIndex] + 0.14;
  return sentences.map((sentence, sentenceIndex) => {
    const share = available * sentence.length / totalCharacters;
    const end = sentenceIndex === sentences.length - 1 ? starts[beatIndex] + speechDurations[beatIndex] + 0.25 : sentenceCursor + share - 0.04;
    const event = `Dialogue: 0,${assTime(sentenceCursor)},${assTime(end)},Narration,,0,0,0,,${escapeAss(wrapSubtitle(sentence))}`;
    sentenceCursor += share;
    return event;
  });
});

const cards = [
  { kicker: "01 · 凌晨两点多", title: "电的缺席", fact: "空调 / 风扇 / 路由器同时沉默" },
  { kicker: "02 · 今天", title: "依赖显影", fact: "制冷 / 通信 / 冷藏 / 泵与电梯" },
  { kicker: "03 · 1800 / 1831", title: "从现象到电流", fact: "伏打电堆 → 法拉第电磁感应" },
  { kicker: "04 · 1880s", title: "电不只是一只灯泡", fact: "发电 → 配电 → 输电 → 使用" },
  { kicker: "05 · 此刻", title: "让无数发明同时醒来", fact: "也让维护系统的人重新可见" },
];
const cardEvents = cards.flatMap((card, index) => {
  const start = starts[index] + 0.35;
  const end = starts[index] + Math.min(sceneDurations[index] - 0.45, 5.8);
  return [
    `Dialogue: 2,${assTime(start)},${assTime(end)},Kicker,,0,0,0,,${escapeAss(card.kicker)}`,
    `Dialogue: 2,${assTime(start + 0.18)},${assTime(end)},Title,,0,0,0,,${escapeAss(card.title)}`,
    `Dialogue: 2,${assTime(start + 0.38)},${assTime(end)},Fact,,0,0,0,,${escapeAss(card.fact)}`,
  ];
});
const subtitles = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Narration,Microsoft YaHei,27,&H00F4EFE3,&H00FFFFFF,&HB0201723,&HC0000000,0,0,0,0,100,100,1,0,1,1.7,0,2,110,110,38,1\nStyle: Kicker,Microsoft YaHei,20,&H00D9C754,&H00FFFFFF,&HAA101A35,&H90000000,1,0,0,0,100,100,2,0,1,1.4,0,7,62,62,42,1\nStyle: Title,Microsoft YaHei,43,&H00F4EFE3,&H00FFFFFF,&HAA101A35,&H90000000,1,0,0,0,100,100,1,0,1,2,0,7,62,62,72,1\nStyle: Fact,Microsoft YaHei,22,&H005CA8E6,&H00FFFFFF,&HAA101A35,&H90000000,0,0,0,0,100,100,1,0,1,1.5,0,7,62,62,128,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${cardEvents.concat(subtitleEvents).join("\n")}\n`;
await fs.writeFile(path.join(assetDir, "subtitles.ass"), subtitles, "utf8");

const images = beats.map((_, index) => path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}.png`));
const imageFilters = sceneDurations.map((value, index) => {
  const fadeEnd = Math.max(0, value - 0.58).toFixed(2);
  const pan = index % 2 === 0 ? `28+22*t/${value}` : `54-22*t/${value}`;
  return `[${index}:v]fps=30,scale=1344:756:force_original_aspect_ratio=increase,crop=1280:720:x='${pan}':y=18,setsar=1,fade=t=in:st=0:d=0.58:color=0x101A35,fade=t=out:st=${fadeEnd}:d=0.58:color=0x101A35,trim=duration=${value},setpts=PTS-STARTPTS[v${index}]`;
});
const subtitlePath = path.relative(repositoryRoot, path.join(assetDir, "subtitles.ass")).replaceAll("\\", "/").replaceAll(":", "\\:");
const composeFilter = [
  ...imageFilters,
  `${sceneDurations.map((_, index) => `[v${index}]`).join("")}concat=n=5:v=1:a=0,ass='${subtitlePath}',format=yuv420p[vout]`,
  `[5:a]volume=2.0dB[narration]`, `[6:a]volume=-2dB[ambient]`,
  `[narration][ambient]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-19:LRA=7:TP=-2[aout]`,
].join(";");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...images.flatMap((file, index) => ["-loop", "1", "-framerate", "30", "-t", String(sceneDurations[index]), "-i", file]),
  "-i", path.join(assetDir, "narration.wav"), "-i", path.join(assetDir, "ambient.wav"),
  "-filter_complex", composeFilter, "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30",
  "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "32000", "-movflags", "+faststart", "-shortest", outputVideo,
]);

const ttsManifest = JSON.parse(await fs.readFile(path.join(audioDir, "generation-manifest.json"), "utf8"));
const manifest = {
  title: "《停电以后，我看见了电》",
  recipe: "科技人文：亲历事件 × 发明链 × 系统回望",
  durationSeconds: totalDuration,
  videoBytes: (await fs.stat(outputVideo)).size,
  sceneStartsSeconds: starts,
  sceneDurationsSeconds: sceneDurations,
  speechDurationsSeconds: speechDurations.map((value) => Number(value.toFixed(2))),
  narrationCharacters: narration.replace(/\s/g, "").length,
  tts: { provider: ttsManifest.provider, model: ttsManifest.model, voice: ttsManifest.voice, emotion: ttsManifest.emotion, speed: ttsManifest.speed, usageCharacters: ttsManifest.generated.reduce((sum, item) => sum + (item.usageCharacters || 0), 0) },
  imageGeneration: "Codex built-in image generation; scene 01 modern anchor, scene 02 and 05 continuity references, scene 03 and 04 historical device-to-system pair",
  composition: "Deterministic FFmpeg; five slow pans, sentence-level ASS subtitles, scene cards with verified dates, near-silent room tone, restrained grid hum and power-return cue",
  historicalBoundary: "The greatness claim is the narrator's viewpoint; the film explicitly rejects a single-inventor account and separates continuous current, electromagnetic induction, practical lighting and power systems.",
  sources: [
    "https://www.energy.gov/articles/history-light-bulb",
    "https://www.rigb.org/about-us/our-history",
    "https://www.rigb.org/explore-science/explore/collection/michael-faradays-ring-coil-apparatus",
    "https://www.energy.gov/sites/prod/files/2017/02/f34/Appendix--Electricity%20System%20Overview.pdf",
  ],
  files: { video: "after-the-power-went-out-i-saw-electricity.mp4", narration: "narration.wav", ambience: "ambient.wav", subtitles: "subtitles.ass" },
};
await fs.writeFile(path.join(assetDir, "media-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
