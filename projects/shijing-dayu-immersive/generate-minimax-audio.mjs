import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, "..", "..");
const require = createRequire(import.meta.url);
const story = require(path.join(repositoryRoot, "docs", "demos", "shijing-dayu-immersive", "history-data.js"));
const books = story.books || [story];
const outputDir = path.join(repositoryRoot, "docs", "demos", "shijing-dayu-immersive", "assets", "audio");
const credentialFile = process.env.MINIMAX_ENV_FILE || "D:/claude_code/20260606_挖掘minimax的能力/get_minimax_power/backend/.env";
const apiBase = process.env.MINIMAX_API_BASE || "https://api.minimaxi.com";

const settings = {
  model: "speech-2.8-hd",
  voice: "female-chengshu",
  emotion: "calm",
  speed: 0.88,
  volume: 1,
  pitch: -1,
};

const requestedMode = process.env.MINIMAX_TTS_MODE || "all";
const force = process.env.MINIMAX_TTS_FORCE === "1";

function parseEnv(raw) {
  const values = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith("#")) continue;
    values[match[1]] = match[2].trim().replace(/^[\"']|[\"']$/g, "");
  }
  return values;
}

const localEnv = parseEnv(await fs.readFile(credentialFile, "utf8"));
const apiKey = process.env.MINIMAX_API_KEY || process.env.MINIMAX_TOKEN_PLAN_KEY || localEnv.MINIMAX_API_KEY || localEnv.MINIMAX_TOKEN_PLAN_KEY;
if (!apiKey) throw new Error("MiniMax API key is not configured.");

async function synthesize(text) {
  const expressiveText = text
    .replace(/。/g, "。<#0.24#>")
    .replace(/；/g, "；<#0.18#>")
    .replace(/：/g, "：<#0.16#>")
    .replace(/<#0\.24#>$/, "");
  const response = await fetch(`${apiBase}/v1/t2a_v2`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      text: expressiveText,
      stream: false,
      language_boost: "Chinese",
      output_format: "hex",
      subtitle_enable: true,
      subtitle_type: "sentence",
      voice_setting: {
        voice_id: settings.voice,
        speed: settings.speed,
        vol: settings.volume,
        pitch: settings.pitch,
        emotion: settings.emotion,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const result = await response.json();
  if (!response.ok || result.base_resp?.status_code !== 0 || !result.data?.audio) {
    const code = result.base_resp?.status_code ?? response.status;
    const message = result.base_resp?.status_msg ?? response.statusText;
    throw new Error(`MiniMax TTS failed (${code}): ${message}`);
  }
  return result;
}

await fs.mkdir(outputDir, { recursive: true });
const generated = [];
for (const currentBook of books) {
  for (const [chapterIndex, chapter] of currentBook.chapters.entries()) {
    for (const [segmentIndex, segment] of chapter.segments.entries()) {
      for (const [mode, content] of Object.entries(segment.modes)) {
        if (requestedMode !== "all" && requestedMode !== mode) continue;
        const filename = `${segment.id}${mode === "explain" ? "" : `-${mode}`}.mp3`;
        const outputPath = path.join(outputDir, filename);
        try {
          if (!force && (await fs.stat(outputPath)).size > 1000) {
            generated.push({ book: currentBook.id, chapter: chapterIndex + 1, segment: segmentIndex + 1, id: segment.id, mode, file: filename, reused: true });
            console.log(`reused ${filename}`);
            continue;
          }
        } catch (_error) {
          // Missing files are synthesized below.
        }
        const result = await synthesize(`${segment.title}。${content.text}`);
        await fs.writeFile(outputPath, Buffer.from(result.data.audio, "hex"));
        generated.push({
          book: currentBook.id,
          chapter: chapterIndex + 1,
          segment: segmentIndex + 1,
          id: segment.id,
          mode,
          file: filename,
          audioLengthMs: result.extra_info?.audio_length,
          usageCharacters: result.extra_info?.usage_characters,
        });
        console.log(`generated ${filename} (${result.extra_info?.audio_length ?? "?"} ms)`);
      }
    }
  }
}

const manifest = {
  provider: "MiniMax China HTTP T2A",
  generatedAt: new Date().toISOString(),
  ...settings,
  source: "docs/demos/shijing-dayu-immersive/history-data.js",
  requestedMode,
  generated,
};
await fs.writeFile(path.join(outputDir, "generation-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
