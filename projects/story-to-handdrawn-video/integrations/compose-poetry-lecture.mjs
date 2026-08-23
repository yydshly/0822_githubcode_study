import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");
const assetDir = path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "jiangnan-bright-demo");
const outputVideo = path.join(assetDir, "remembering-jiangnan-lecture.mp4");
const panelFile = path.join(assetDir, "lecture-panels.ass");

function run(command, args) {
  execFileSync(command, args, { cwd: repositoryRoot, stdio: "inherit", windowsHide: true });
}

function assTime(seconds) {
  const value = Math.max(0, Math.round(seconds * 100));
  return `${Math.floor(value / 360000)}:${String(Math.floor((value % 360000) / 6000)).padStart(2, "0")}:${String(Math.floor((value % 6000) / 100)).padStart(2, "0")}.${String(value % 100).padStart(2, "0")}`;
}

function event(start, end, style, text) {
  const normalizedText = text.replaceAll("↵", String.raw`\N`);
  return `Dialogue: 0,${assTime(start)},${assTime(end)},${style},,0,0,0,,${normalizedText}`;
}

const manifestFile = path.join(assetDir, "media-manifest.json");
const manifest = JSON.parse(await fs.readFile(manifestFile, "utf8"));
const starts = manifest.sceneStartsSeconds;
const durations = manifest.sceneDurationsSeconds;
const totalDuration = manifest.durationSeconds;
if (starts.length !== 5 || durations.length !== 5) throw new Error("Expected five lecture scenes.");

const poem = [
  "江南好，",
  "风景旧曾谙。",
  "日出江花红胜火，",
  "春来江水绿如蓝。",
  "能不忆江南？",
];

const lessons = [
  { stage: "01 · 赞叹", keyword: "江南好", note: "先用一个“好”打开记忆，↵它表达赞叹，不是地理结论。", evidence: "画面证据｜晨光、水路与城镇同时展开" },
  { stage: "02 · 熟悉", keyword: "旧曾谙", note: "“谙”是熟悉。诗人写的不是初见，↵而是曾经生活过的经验。", evidence: "画面证据｜小舟进入水巷，视角由远及近" },
  { stage: "03 · 日出", keyword: "日出", note: "颜色由时间发生：日轮升起，↵金光沿水面抵近观看者。", evidence: "画面证据｜暖色从远山、屋脊进入春水" },
  { stage: "04 · 对照", keyword: "红胜火 / 绿如蓝", note: "红与绿不是装饰，而是两组比较。↵“蓝”也保留蓼蓝染料的语义边界。", evidence: "画面证据｜近景花红与孔雀绿水互为尺度" },
  { stage: "05 · 回望", keyword: "能不忆江南", note: "反问把视线从风景带回记忆。↵诗没有替读者回答。", evidence: "画面证据｜舟已远去，颜色仍留在视野" },
];

const activeLineSets = [[0], [1], [2], [2, 3], [4]];
const yPositions = [176, 222, 268, 314, 360];
const events = [];

for (let index = 0; index < 5; index += 1) {
  const start = starts[index];
  const end = index === 4 ? totalDuration : starts[index + 1];
  events.push(event(start, end, "SceneTag", `{\\pos(38,40)}${lessons[index].stage}`));
  events.push(event(start, end, "Section", "{\\pos(804,40)}READ · SEE · UNDERSTAND"));
  events.push(event(start, end, "Title", "{\\pos(804,72)}忆江南 · 江南好"));
  events.push(event(start, end, "Author", "{\\pos(804,120)}唐 · 白居易"));
  poem.forEach((line, lineIndex) => {
    let style = activeLineSets[index].includes(lineIndex) ? "PoemActive" : "Poem";
    if (index === 3 && lineIndex === 3) style = "PoemGreen";
    events.push(event(start, end, style, `{\\pos(804,${yPositions[lineIndex]})}${line}`));
  });
  events.push(event(start, end, "KeyLabel", "{\\pos(804,430)}本幕关键词"));
  events.push(event(start, end, index === 3 ? "KeywordGreen" : "Keyword", `{\\pos(804,458)}${lessons[index].keyword}`));
  events.push(event(start, end, "Note", `{\\pos(804,514)}${lessons[index].note}`));
  events.push(event(start, end, "Evidence", `{\\pos(804,632)}${lessons[index].evidence}`));
}

const ass = `[Script Info]
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: SceneTag,Microsoft YaHei,16,&H00FFF7DD,&H00FFFFFF,&H002E362F,&H960C2428,-1,0,0,0,100,100,1,0,3,8,0,7,0,0,0,1
Style: Section,Microsoft YaHei,12,&H00465245,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,2,0,1,0,0,7,0,0,0,1
Style: Title,KaiTi,32,&H00152F32,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: Author,Microsoft YaHei,15,&H006B7569,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: Poem,KaiTi,27,&H00677768,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: PoemActive,KaiTi,30,&H002A4A52,&H00FFFFFF,&H00F5E6BD,&H00000000,-1,0,0,0,100,100,1,0,1,2.5,0,7,0,0,0,1
Style: PoemGreen,KaiTi,30,&H003E7051,&H00FFFFFF,&H00F5E6BD,&H00000000,-1,0,0,0,100,100,1,0,1,2.5,0,7,0,0,0,1
Style: KeyLabel,Microsoft YaHei,13,&H00667767,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: Keyword,Microsoft YaHei,23,&H003843E9,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: KeywordGreen,Microsoft YaHei,23,&H004D8058,&H00FFFFFF,&H00000000,&H00000000,-1,0,0,0,100,100,1,0,1,0,0,7,0,0,0,1
Style: Note,Microsoft YaHei,18,&H00263F43,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1
Style: Evidence,Microsoft YaHei,14,&H005E786A,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
await fs.writeFile(panelFile, ass, "utf8");

const images = durations.map((_, index) => path.join(assetDir, `scene-${String(index + 1).padStart(2, "0")}.png`));
const imageFilters = durations.map((value, index) => {
  const pan = index % 2 === 0 ? `18+12*t/${value}` : `38-12*t/${value}`;
  return `[${index}:v]fps=30,scale=1280:720:force_original_aspect_ratio=increase,crop=760:720:x='${pan}':y=0,setsar=1,pad=1280:720:0:0:color=0xFBF1D4,drawbox=x=760:y=0:w=4:h=720:color=0x2D9488:t=fill,drawbox=x=788:y=414:w=448:h=210:color=0xFFF9E8@0.72:t=fill,drawbox=x=788:y=414:w=448:h=210:color=0xD5B45B@0.72:t=2,trim=duration=${value},setpts=PTS-STARTPTS[v${index}]`;
});
const panelPath = path.relative(repositoryRoot, panelFile).replaceAll("\\", "/").replaceAll(":", "\\:");
const filter = [
  ...imageFilters,
  `${durations.map((_, index) => `[v${index}]`).join("")}concat=n=5:v=1:a=0,ass='${panelPath}',format=yuv420p[vout]`,
  `[5:a]volume=2.2dB[narration]`,
  `[6:a]volume=-3dB[ambient]`,
  `[narration][ambient]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[aout]`,
].join(";");

run("ffmpeg", [
  "-y", "-hide_banner", "-loglevel", "warning",
  ...images.flatMap((file, index) => ["-loop", "1", "-framerate", "30", "-t", String(durations[index]), "-i", file]),
  "-i", path.join(assetDir, "narration.wav"),
  "-i", path.join(assetDir, "ambient.wav"),
  "-filter_complex", filter,
  "-map", "[vout]", "-map", "[aout]",
  "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-r", "30",
  "-c:a", "aac", "-b:a", "128k", "-ac", "2", "-ar", "32000",
  "-movflags", "+faststart", "-shortest", outputVideo,
]);

manifest.lecture = {
  title: "《忆江南》诗卷讲解版",
  durationSeconds: totalDuration,
  videoBytes: (await fs.stat(outputVideo)).size,
  layout: "16:9 split teaching canvas; left imagery and right persistent poem scroll",
  informationLayers: ["original poem", "active line", "keyword", "interpretation", "visual evidence"],
  captions: "No bottom teaching subtitles; semantic text is deterministically typeset in the scroll panel",
  file: path.basename(outputVideo),
  panelSource: path.basename(panelFile),
};
await fs.writeFile(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest.lecture, null, 2));
