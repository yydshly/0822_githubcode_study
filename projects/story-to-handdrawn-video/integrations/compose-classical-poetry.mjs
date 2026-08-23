import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const assetDir = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "classical-poetry-demo");
const audioDir = path.join(projectRoot, "generated-audio", "classical-poetry");
const narrationFile = path.join(assetDir, "narration.txt");
const outputVideo = path.join(assetDir, "maple-bridge-night.mp4");

function run(command, args) {
  execFileSync(command, args, { cwd: repositoryRoot, stdio: "inherit", windowsHide: true });
}

function probeDuration(file) {
  const raw = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "json", file,
  ], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true });
  return Number(JSON.parse(raw).format.duration);
}

function assTime(seconds) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360000);
  const minutes = Math.floor((centiseconds % 360000) / 6000);
  const secs = Math.floor((centiseconds % 6000) / 100);
  const cs = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text) {
  return text.replaceAll("\\", "\\\\").replaceAll("{", "\\{").replaceAll("}", "\\}").replaceAll("\n", "\\N");
}

function wrapSubtitle(text, maximum = 25) {
  if (text.length <= maximum) return text;
  const phrases = text.match(/[^，；：、]+[，；：、]?/g) || [text];
  const lines = [];
  let line = "";
  for (const phrase of phrases) {
    if (line && line.length + phrase.length > maximum) {
      lines.push(line);
      line = phrase;
    } else {
      line += phrase;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

const narration = await fs.readFile(narrationFile, "utf8");
const beats = narration.trim().split(/\r?\n\s*\r?\n/).map((text) => text.trim()).filter(Boolean);
if (beats.length !== 5) throw new Error(`Expected five narration beats, found ${beats.length}.`);

const beatFiles = beats.map((_, index) => path.join(audioDir, `beat-${String(index + 1).padStart(2, "0")}.wav`));
await Promise.all(beatFiles.map((file) => fs.access(file)));
const speechDurations = beatFiles.map(probeDuration);
const sceneDurations = speechDurations.map((duration) => Number((duration + 1.15).toFixed(2)));
const starts = [];
let cursor = 0;
for (const duration of sceneDurations) {
  starts.push(Number(cursor.toFixed(2)));
  cursor += duration;
}
const totalDuration = Number(cursor.toFixed(2));

const narrationFilters = sceneDurations.map((duration, index) =>
  `[${index}:a]apad=whole_dur=${duration},atrim=duration=${duration},asetpts=PTS-STARTPTS[a${index}]`,
);
const narrationConcat = `${narrationFilters.join(";")};${sceneDurations.map((_, index) => `[a${index}]`).join("")}concat=n=5:v=0:a=1[narration]`;
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...beatFiles.flatMap((file) => ["-i", file]),
  "-filter_complex", narrationConcat,
  "-map", "[narration]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1",
  path.join(assetDir, "narration.wav"),
]);

const bellStartMs = Math.round(starts[4] * 1000 + 900);
const ambientFilter = [
  `[0:a]lowpass=f=520,highpass=f=65,volume=0.025[water]`,
  `[1:a]afade=t=out:st=0:d=7,volume=0.035,adelay=${bellStartMs}|${bellStartMs}[bell1]`,
  `[2:a]afade=t=out:st=0:d=5,volume=0.018,adelay=${bellStartMs + 35}|${bellStartMs + 35}[bell2]`,
  `[water][bell1][bell2]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.8[ambient]`,
].join(";");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "anoisesrc=color=brown:amplitude=0.6:sample_rate=32000",
  "-f", "lavfi", "-t", "7", "-i", "sine=frequency=174.61:sample_rate=32000",
  "-f", "lavfi", "-t", "5", "-i", "sine=frequency=349.23:sample_rate=32000",
  "-filter_complex", ambientFilter, "-map", "[ambient]", "-c:a", "pcm_s16le", "-ar", "32000", "-ac", "1",
  path.join(assetDir, "ambient.wav"),
]);

const subtitleEvents = beats.flatMap((text, beatIndex) => {
  const sentences = text.match(/[^。！？]+[。！？]?/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [text];
  const totalCharacters = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
  const available = speechDurations[beatIndex] - 0.28;
  let sentenceCursor = starts[beatIndex] + 0.14;
  return sentences.map((sentence, sentenceIndex) => {
    const isLast = sentenceIndex === sentences.length - 1;
    const share = available * sentence.length / totalCharacters;
    const start = sentenceCursor;
    const end = isLast ? starts[beatIndex] + speechDurations[beatIndex] + 0.28 : sentenceCursor + share - 0.04;
    sentenceCursor += share;
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Narration,,0,0,0,,${escapeAss(wrapSubtitle(sentence))}`;
  });
}).join("\n");
const subtitles = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Narration,Microsoft YaHei,27,&H00F3E7D2,&H00FFFFFF,&HAA101418,&HB5000000,0,0,0,0,100,100,1,0,1,1.4,0,2,120,120,40,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${subtitleEvents}\n`;
await fs.writeFile(path.join(assetDir, "subtitles.ass"), subtitles, "utf8");

const imageFiles = beats.map((_, index) => path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}.png`));
const videoFilters = sceneDurations.map((duration, index) => {
  const endFade = Math.max(0, duration - 0.7).toFixed(2);
  const pan = index % 2 === 0 ? `34+14*t/${duration}` : `48-14*t/${duration}`;
  return `[${index}:v]fps=30,scale=1344:756:force_original_aspect_ratio=increase,crop=1280:720:x='${pan}':y=18,setsar=1,fade=t=in:st=0:d=0.7:color=0x0A0F12,fade=t=out:st=${endFade}:d=0.7:color=0x0A0F12,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`;
});
const subtitlePath = path.relative(repositoryRoot, path.join(assetDir, "subtitles.ass")).replaceAll("\\", "/").replaceAll(":", "\\:");
const composeFilter = [
  ...videoFilters,
  `${sceneDurations.map((_, index) => `[v${index}]`).join("")}concat=n=5:v=1:a=0,ass='${subtitlePath}',format=yuv420p[vout]`,
  `[5:a]volume=2.5dB[narration]`,
  `[6:a]volume=-2dB[ambient]`,
  `[narration][ambient]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
].join(";");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...imageFiles.flatMap((file, index) => ["-loop", "1", "-framerate", "30", "-t", String(sceneDurations[index]), "-i", file]),
  "-i", path.join(assetDir, "narration.wav"),
  "-i", path.join(assetDir, "ambient.wav"),
  "-filter_complex", composeFilter,
  "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30",
  "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "32000",
  "-movflags", "+faststart", "-shortest", outputVideo,
]);
const videoBytes = (await fs.stat(outputVideo)).size;

let ttsManifest = null;
try {
  ttsManifest = JSON.parse(await fs.readFile(path.join(audioDir, "generation-manifest.json"), "utf8"));
} catch {
  // Older audio generations remain composable; the output manifest makes the missing provenance explicit.
}
const outputManifest = {
  title: "《枫桥夜泊》：夜半钟声如何穿过一首诗",
  poem: "张继《枫桥夜泊》",
  durationSeconds: totalDuration,
  videoBytes,
  sceneStartsSeconds: starts,
  sceneDurationsSeconds: sceneDurations,
  speechDurationsSeconds: speechDurations.map((value) => Number(value.toFixed(2))),
  narrationCharacters: narration.replace(/\s/g, "").length,
  tts: ttsManifest ? {
    provider: ttsManifest.provider,
    model: ttsManifest.model,
    voice: ttsManifest.voice,
    emotion: ttsManifest.emotion,
    usageCharacters: ttsManifest.generated.reduce((sum, item) => sum + (item.usageCharacters || 0), 0),
  } : { provider: "MiniMax China HTTP T2A", provenance: "generation-manifest.json not found" },
  imageGeneration: "Codex image generation; scene 01 anchor plus four continuity references",
  composition: "Deterministic FFmpeg; five slow pans, ASS subtitles, river-bed ambience, final bell cue",
  files: {
    video: "maple-bridge-night.mp4",
    narration: "narration.wav",
    ambience: "ambient.wav",
    subtitles: "subtitles.ass",
  },
};
await fs.writeFile(path.join(assetDir, "media-manifest.json"), `${JSON.stringify(outputManifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(outputManifest, null, 2));
