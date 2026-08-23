import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const assetDir = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "jiangnan-bright-demo");
const audioDir = path.join(projectRoot, "generated-audio", "jiangnan-bright");
const outputVideo = path.join(assetDir, "remembering-jiangnan.mp4");

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

function wrapSubtitle(text, maximum = 25) {
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
const sceneDurations = speechDurations.map((value) => Number((value + 1.05).toFixed(2)));
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

const chirpOne = 4600;
const chirpTwo = Math.round(starts[3] * 1000 + 2400);
const ambientFilter = [
  `[0:a]lowpass=f=650,highpass=f=85,volume=0.018[water]`,
  `[1:a]afade=t=in:st=0:d=0.08,afade=t=out:st=0.22:d=0.55,volume=0.022,adelay=${chirpOne}|${chirpOne}[bird1]`,
  `[2:a]afade=t=in:st=0:d=0.06,afade=t=out:st=0.18:d=0.48,volume=0.016,adelay=${chirpTwo}|${chirpTwo}[bird2]`,
  `[water][bird1][bird2]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.7[ambient]`,
].join(";");
run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  "-f", "lavfi", "-t", String(totalDuration), "-i", "anoisesrc=color=brown:amplitude=0.55:sample_rate=32000",
  "-f", "lavfi", "-t", "0.85", "-i", "sine=frequency=1760:sample_rate=32000",
  "-f", "lavfi", "-t", "0.72", "-i", "sine=frequency=2349:sample_rate=32000",
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
}).join("\n");
const subtitles = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Narration,Microsoft YaHei,27,&H00F7F0D8,&H00FFFFFF,&H99243F4A,&HB3000000,0,0,0,0,100,100,1,0,1,1.5,0,2,120,120,40,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${subtitleEvents}\n`;
await fs.writeFile(path.join(assetDir, "subtitles.ass"), subtitles, "utf8");

const images = beats.map((_, index) => path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}.png`));
const imageFilters = sceneDurations.map((value, index) => {
  const fadeEnd = Math.max(0, value - 0.62).toFixed(2);
  const pan = index % 2 === 0 ? `30+16*t/${value}` : `50-16*t/${value}`;
  return `[${index}:v]fps=30,scale=1344:756:force_original_aspect_ratio=increase,crop=1280:720:x='${pan}':y=18,setsar=1,fade=t=in:st=0:d=0.62:color=0xF4E3B2,fade=t=out:st=${fadeEnd}:d=0.62:color=0xF4E3B2,trim=duration=${value},setpts=PTS-STARTPTS[v${index}]`;
});
const subtitlePath = path.relative(repositoryRoot, path.join(assetDir, "subtitles.ass")).replaceAll("\\", "/").replaceAll(":", "\\:");
const composeFilter = [
  ...imageFilters,
  `${sceneDurations.map((_, index) => `[v${index}]`).join("")}concat=n=5:v=1:a=0,ass='${subtitlePath}',format=yuv420p[vout]`,
  `[5:a]volume=2.2dB[narration]`, `[6:a]volume=-3dB[ambient]`,
  `[narration][ambient]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
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
  title: "《忆江南·江南好》：鲜明颜色如何成为记忆",
  poem: "白居易《忆江南·江南好》",
  durationSeconds: totalDuration,
  videoBytes: (await fs.stat(outputVideo)).size,
  sceneStartsSeconds: starts,
  sceneDurationsSeconds: sceneDurations,
  speechDurationsSeconds: speechDurations.map((value) => Number(value.toFixed(2))),
  narrationCharacters: narration.replace(/\s/g, "").length,
  tts: { provider: ttsManifest.provider, model: ttsManifest.model, voice: ttsManifest.voice, emotion: ttsManifest.emotion, usageCharacters: ttsManifest.generated.reduce((sum, item) => sum + (item.usageCharacters || 0), 0) },
  imageGeneration: "Codex built-in image generation; scene 01 anchor plus four continuity references",
  composition: "Deterministic FFmpeg; five slow pans, sentence-level ASS subtitles, low river ambience and two restrained morning bird cues",
  files: { video: "remembering-jiangnan.mp4", narration: "narration.wav", ambience: "ambient.wav", subtitles: "subtitles.ass" },
};
await fs.writeFile(path.join(assetDir, "media-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
