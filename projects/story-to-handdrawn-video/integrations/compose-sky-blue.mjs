import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const assetDir = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "sky-blue-demo");
const audioDir = path.join(projectRoot, "generated-audio", "sky-blue");
const outputVideo = path.join(assetDir, "why-is-the-sky-blue.mp4");

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

function wrapSubtitle(text, maximum = 24) {
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
const ttsAvailable = (await Promise.all(beatFiles.map(async (file) => {
  try { await fs.access(file); return true; } catch { return false; }
}))).every(Boolean);
const speechDurations = ttsAvailable
  ? beatFiles.map(duration)
  : beats.map((text) => Number(Math.max(9, text.replace(/\s/g, "").length / 5.1).toFixed(2)));
const sceneDurations = speechDurations.map((value) => Number((value + 1.0).toFixed(2)));
const starts = [];
let cursor = 0;
for (const value of sceneDurations) {
  starts.push(Number(cursor.toFixed(2)));
  cursor += value;
}
const totalDuration = Number(cursor.toFixed(2));

if (ttsAvailable) {
  const narrationFilters = sceneDurations.map((value, index) => `[${index}:a]apad=whole_dur=${value},atrim=duration=${value},asetpts=PTS-STARTPTS[a${index}]`);
  run("ffmpeg", [
    "-y", "-hide_banner", "-loglevel", "warning",
    ...beatFiles.flatMap((file) => ["-i", file]),
    "-filter_complex", `${narrationFilters.join(";")};${sceneDurations.map((_, index) => `[a${index}]`).join("")}concat=n=5:v=0:a=1[narration]`,
    "-map", "[narration]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1", path.join(assetDir, "narration.wav"),
  ]);
} else {
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "warning", "-f", "lavfi", "-t", String(totalDuration), "-i", "anullsrc=r=32000:cl=mono", "-c:a", "pcm_s16le", path.join(assetDir, "narration.wav")]);
  console.warn("MiniMax beats are not present; composed a visual-review cut with timed subtitles and ambience only.");
}

run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "anoisesrc=color=pink:amplitude=0.22:sample_rate=32000",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "sine=frequency=180:sample_rate=32000",
  "-filter_complex", `[0:a]highpass=f=100,lowpass=f=1100,volume=0.007,afade=t=in:st=0:d=2,afade=t=out:st=${Math.max(0, totalDuration - 2)}:d=2[wind];[1:a]volume=0.0015,tremolo=f=0.12:d=0.4[tone];[wind][tone]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.7[ambient]`,
  "-map", "[ambient]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1", path.join(assetDir, "ambient.wav"),
]);

const subtitleEvents = beats.flatMap((text, beatIndex) => {
  const sentences = text.match(/[^。！？]+[。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const available = Math.max(1, speechDurations[beatIndex] - 0.25);
  let sentenceCursor = starts[beatIndex] + 0.12;
  return sentences.map((sentence, sentenceIndex) => {
    const share = available * sentence.length / totalCharacters;
    const end = sentenceIndex === sentences.length - 1 ? starts[beatIndex] + speechDurations[beatIndex] + 0.2 : sentenceCursor + share - 0.04;
    const event = `Dialogue: 0,${assTime(sentenceCursor)},${assTime(end)},Narration,,0,0,0,,${escapeAss(wrapSubtitle(sentence))}`;
    sentenceCursor += share;
    return event;
  });
});

const cards = [
  { kicker: "01 · QUESTION", title: "天空不是被涂蓝的", fact: "误区：海洋反射 → 追问：阳光 × 空气" },
  { kicker: "02 · SPECTRUM", title: "白光里藏着一整段颜色", fact: "蓝紫：短波长　｜　橙红：长波长" },
  { kicker: "03 · RAYLEIGH SCATTERING", title: "空气把蓝光从四面八方送来", fact: "分子越小于波长，短波散射越明显" },
  { kicker: "04 · LONGER PATH", title: "同一机制，也写出晚霞", fact: "路径变长 → 蓝紫散开 → 直达光偏暖" },
  { kicker: "05 · TRANSFER", title: "用一个解释，预测另一个现象", fact: "正午蓝天与橙红晚霞，是同一条因果链" },
];
const cardEvents = cards.flatMap((card, index) => {
  const start = starts[index] + 0.32;
  const end = starts[index] + Math.min(sceneDurations[index] - 0.35, 6.2);
  return [
    `Dialogue: 2,${assTime(start)},${assTime(end)},Kicker,,0,0,0,,${escapeAss(card.kicker)}`,
    `Dialogue: 2,${assTime(start + 0.16)},${assTime(end)},Title,,0,0,0,,${escapeAss(card.title)}`,
    `Dialogue: 2,${assTime(start + 0.34)},${assTime(end)},Fact,,0,0,0,,${escapeAss(card.fact)}`,
  ];
});

const subtitles = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Narration,Microsoft YaHei,28,&H00FFFFFF,&H00FFFFFF,&HB0243851,&HC0000000,0,0,0,0,100,100,1,0,1,1.8,0,2,116,116,34,1\nStyle: Kicker,Microsoft YaHei,19,&H0033D9FF,&H00FFFFFF,&HAA123A4D,&H90000000,1,0,0,0,100,100,2,0,1,1.3,0,7,58,58,39,1\nStyle: Title,Microsoft YaHei,39,&H00FFFFFF,&H00FFFFFF,&HAA123A4D,&H90000000,1,0,0,0,100,100,1,0,1,2,0,7,58,58,67,1\nStyle: Fact,Microsoft YaHei,21,&H00F7D78B,&H00FFFFFF,&HAA123A4D,&H90000000,0,0,0,0,100,100,1,0,1,1.4,0,7,58,58,118,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${cardEvents.concat(subtitleEvents).join("\n")}\n`;
const polishedSubtitles = subtitles.replace(
  "Style: Fact,Microsoft YaHei,21,&H00F7D78B,&H00FFFFFF,&HAA123A4D,&H90000000,0,0,0,0,100,100,1,0,1,1.4,0,7,58,58,118,1",
  "Style: Fact,Microsoft YaHei,21,&H00FFF1C2,&H00FFFFFF,&H40143852,&H70143852,0,0,0,0,100,100,1,0,3,5,0,7,58,58,118,1",
);
await fs.writeFile(path.join(assetDir, "subtitles.ass"), polishedSubtitles, "utf8");

const images = beats.map((_, index) => path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}.png`));
const imageFilters = sceneDurations.map((value, index) => {
  const fadeEnd = Math.max(0, value - 0.55).toFixed(2);
  const x = index % 2 === 0 ? `12+36*t/${value}` : `48-36*t/${value}`;
  const y = index === 2 ? `0+16*t/${value}` : `18-10*t/${value}`;
  return `[${index}:v]fps=30,scale=1344:756:force_original_aspect_ratio=increase,crop=1280:720:x='${x}':y='${y}',setsar=1,fade=t=in:st=0:d=0.55:color=0x0B3A66,fade=t=out:st=${fadeEnd}:d=0.55:color=0x0B3A66,trim=duration=${value},setpts=PTS-STARTPTS[v${index}]`;
});
const subtitlePath = path.relative(repositoryRoot, path.join(assetDir, "subtitles.ass")).replaceAll("\\", "/").replaceAll(":", "\\:");
const composeFilter = [
  ...imageFilters,
  `${sceneDurations.map((_, index) => `[v${index}]`).join("")}concat=n=5:v=1:a=0,ass='${subtitlePath}',format=yuv420p[vout]`,
  `[5:a]volume=1.8dB[narration]`,
  `[6:a]volume=-3dB[ambient]`,
  `[narration][ambient]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-18:LRA=6:TP=-2[aout]`,
].join(";");

run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...images.flatMap((file, index) => ["-loop", "1", "-framerate", "30", "-t", String(sceneDurations[index]), "-i", file]),
  "-i", path.join(assetDir, "narration.wav"), "-i", path.join(assetDir, "ambient.wav"),
  "-filter_complex", composeFilter, "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30",
  "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "32000", "-movflags", "+faststart", "-shortest", outputVideo,
]);

for (let index = 0; index < images.length; index += 1) {
  run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "warning", "-i", images[index], "-vf", "scale=320:-2", "-frames:v", "1", "-c:v", "libwebp", "-quality", "78", path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}-thumb.webp`)]);
}

const ttsManifest = ttsAvailable
  ? JSON.parse(await fs.readFile(path.join(audioDir, "generation-manifest.json"), "utf8"))
  : { provider: "MiniMax pending", model: "speech-2.8-hd", voice: "female-chengshu", emotion: "calm", speed: 0.92 };
const manifest = {
  title: "《天空为什么是蓝色的？》",
  recipe: "日常追问 × 机制显影 × 现象迁移",
  durationSeconds: totalDuration,
  videoBytes: (await fs.stat(outputVideo)).size,
  sceneStartsSeconds: starts,
  sceneDurationsSeconds: sceneDurations,
  speechDurationsSeconds: speechDurations.map((value) => Number(value.toFixed(2))),
  narrationCharacters: narration.replace(/\s/g, "").length,
  tts: { provider: ttsManifest.provider, model: ttsManifest.model, voice: ttsManifest.voice, emotion: ttsManifest.emotion, speed: ttsManifest.speed },
  reviewCut: !ttsAvailable,
  imageGeneration: "Five 16:9 keyframes created with Codex built-in image generation; scene 01 is the character/style anchor and scenes 02–05 reference it for continuity.",
  composition: "Deterministic FFmpeg; five slow pans, sentence-level subtitles, scene concept cards, restrained rooftop ambience, H.264/AAC fast-start MP4.",
  visualBoundary: "Light paths, molecule sizes and atmospheric thickness are explanatory visualizations and are not drawn to scale.",
  sources: [
    "https://science.nasa.gov/universe/glossary/",
    "https://spaceplace.nasa.gov/blue-sky/en/",
    "https://gml.noaa.gov/grad/about/redsky/",
    "https://science.nasa.gov/earth/earth-observatory/crepuscular-rays-and-light-scattering-150090/",
  ],
  files: { video: "why-is-the-sky-blue.mp4", narration: "narration.wav", ambience: "ambient.wav", subtitles: "subtitles.ass" },
};
await fs.writeFile(path.join(assetDir, "media-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
