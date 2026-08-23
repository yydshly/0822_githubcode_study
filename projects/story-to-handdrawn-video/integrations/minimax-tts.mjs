import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const repositoryRoot = path.resolve(projectRoot, "..", "..");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) throw new Error(`Unexpected argument: ${item}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${item}`);
    args[item.slice(2)] = value;
    index += 1;
  }
  return args;
}

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
  const envFile = process.env.MINIMAX_ENV_FILE
    ? path.resolve(process.env.MINIMAX_ENV_FILE)
    : path.join(projectRoot, ".env");
  try {
    const local = parseEnv(await fs.readFile(envFile, "utf8"));
    for (const [name, value] of Object.entries(local)) {
      if (process.env[name] === undefined) process.env[name] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function numberSetting(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }
  return value;
}

await loadLocalEnv();

const args = parseArgs(process.argv.slice(2));
const inputFile = path.resolve(
  args.input ?? path.join(repositoryRoot, "docs", "demos", "story-to-handdrawn-video", "assets", "real-demo", "narration.txt"),
);
const outputDir = path.resolve(args["output-dir"] ?? path.join(projectRoot, "generated-audio"));
const apiKey = process.env.MINIMAX_API_KEY || process.env.MINIMAX_TOKEN_PLAN_KEY;
if (!apiKey || /^(replace|your[_-]?key|填入)/i.test(apiKey)) {
  throw new Error("MiniMax API key is missing. Copy .env.example to .env and set MINIMAX_API_KEY locally.");
}

const apiBase = new URL(process.env.MINIMAX_API_BASE || "https://api.minimaxi.com");
if (apiBase.protocol !== "https:") throw new Error("MINIMAX_API_BASE must use HTTPS.");

const settings = {
  model: process.env.MINIMAX_TTS_MODEL || "speech-2.8-hd",
  voice: process.env.MINIMAX_TTS_VOICE || "female-chengshu",
  emotion: process.env.MINIMAX_TTS_EMOTION || "calm",
  speed: numberSetting("MINIMAX_TTS_SPEED", 0.92, 0.5, 2),
  volume: numberSetting("MINIMAX_TTS_VOLUME", 1, 0.1, 10),
  pitch: numberSetting("MINIMAX_TTS_PITCH", -1, -12, 12),
};

async function synthesize(text) {
  const response = await fetch(new URL("/v1/t2a_v2", apiBase), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: settings.model,
      text,
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
        format: "wav",
        channel: 1,
      },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  const result = await response.json();
  if (!response.ok || result.base_resp?.status_code !== 0) {
    const code = result.base_resp?.status_code ?? response.status;
    const message = result.base_resp?.status_msg ?? response.statusText;
    throw new Error(`MiniMax TTS request failed (${code}): ${message}`);
  }
  if (!result.data?.audio) throw new Error("MiniMax TTS response contained no audio.");
  return result;
}

const narration = await fs.readFile(inputFile, "utf8");
const beats = narration.trim().split(/\r?\n\s*\r?\n/).map((text) => text.trim()).filter(Boolean);
if (beats.length === 0) throw new Error("The input file contains no narration beats.");

await fs.mkdir(outputDir, { recursive: true });
const generated = [];
for (let index = 0; index < beats.length; index += 1) {
  const expressiveText = beats[index]
    .replace(/。/g, "。<#0.22#>")
    .replace(/？/g, "？<#0.30#>")
    .replace(/<#0\.(22|30)#>$/, "");
  const result = await synthesize(expressiveText);
  const filename = `beat-${String(index + 1).padStart(2, "0")}.wav`;
  await fs.writeFile(path.join(outputDir, filename), Buffer.from(result.data.audio, "hex"));
  generated.push({
    beat: index + 1,
    file: filename,
    audioLengthMs: result.extra_info?.audio_length,
    sampleRate: result.extra_info?.audio_sample_rate,
    usageCharacters: result.extra_info?.usage_characters,
  });
}

const manifest = {
  provider: "MiniMax China HTTP T2A",
  model: settings.model,
  voice: settings.voice,
  emotion: settings.emotion,
  speed: settings.speed,
  pitch: settings.pitch,
  source: path.relative(repositoryRoot, inputFile).replaceAll(path.sep, "/"),
  outputDir,
  generated,
};
await fs.writeFile(path.join(outputDir, "generation-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify(manifest, null, 2));
