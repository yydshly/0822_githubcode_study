#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const skill = path.join(root, "..", "..", "upstream", "skills", "novel-storyboard", "scripts", "novel-storyboard.mjs");
const scriptPath = path.join(root, "script", "潮痕-script.json");
const priorPath = path.join(root, "storyboard", "潮痕-storyboard-ep1-2.json");
const outPath = path.join(root, "storyboard", "潮痕-storyboard.json");

const seeded = spawnSync(process.execPath, [skill, "seed", scriptPath, "--eps", "3-6"], {
  encoding: "utf8",
  windowsHide: true,
});
if (seeded.status !== 0) throw new Error(seeded.stderr || "seed failed");
const seed = JSON.parse(seeded.stdout);
const prior = JSON.parse(fs.readFileSync(priorPath, "utf8"));

const identity = {
  C01: "the slim female audio archivist in a navy rain jacket and headphones",
  C02: "the broad-shouldered male diver in dark weathered workwear",
  C03: "the controlled middle-aged male investor in a charcoal coat",
  C04: "the older ferryman in faded work clothes",
  C05: "the teenage male witness in rain-soaked dock clothes",
};
const names = { 许知遥: "C01", 程野: "C02", 高嵩: "C03", 许德海: "C04", 许潮: "C05" };
const sceneText = {
  S01: "the weathered old ferry waiting hall and riverside pier",
  S02: "the cool grey-green audio restoration laboratory with cyan waveform monitors",
  S03: "the damp abandoned riverside warehouse with an old fire cabinet",
  S04: "the outer breakwater at low tide under cold predawn light",
};
const soundscape = {
  S01: "River wind moves through broken windows, old boards creak, distant machinery idles, and evidence equipment clicks sharply.",
  S02: "Monitor fans hum, tide hiss moves through the recording, controls click, and the damaged radio pulses beneath the dialogue.",
  S03: "Moisture alarms repeat through the cavernous warehouse, damp paper shifts, boots scrape concrete, and distant demolition machinery vibrates through the walls.",
  S04: "Low tide water pulls through concrete blocks, a dive line strains, wet metal scrapes stone, and the diver's breathing remains close and physical.",
};
const music = {
  S01: "Low bowed cello and restrained percussion build toward an unresolved pulse.",
  S02: "Sparse piano notes sit over a low electronic drone and restrained ticking pulse.",
  S03: "Tight cello ostinato and muted metallic percussion sustain investigative tension.",
  S04: "Sub-bass swells and distant bowed metal rise slowly beneath the predawn water.",
};
const sizePhrase = {
  "extreme-wide": "extreme wide shot",
  wide: "wide shot",
  medium: "medium shot",
  close: "close-up",
  "extreme-close": "extreme close-up",
};
const voice = {
  C01: "The slim female audio archivist speaks in a clear, cool, restrained voice (S1):",
  C02: "The broad-shouldered male diver speaks in a rough low baritone (S2):",
  C03: "The controlled middle-aged investor speaks in a measured, polished low voice (S3):",
  C04: "The older ferryman speaks in a rough, forceful recorded voice (S4):",
  C05: "The teenage male witness speaks in a bright, strained recorded voice (S5):",
};

const roundHalf = (n) => Math.ceil(n * 2) / 2;
const sum = (items, pick = (x) => x) => items.reduce((a, x) => a + pick(x), 0);

function groupScene(beats) {
  const groups = [];
  for (let i = 0; i < beats.length;) {
    const first = beats[i];
    const group = [first];
    const next = beats[i + 1];
    if (next && first.kind === "action" && next.kind === "line") {
      group.push(next); i += 2;
    } else if (next && first.kind === "action" && next.kind === "action") {
      group.push(next); i += 2;
    } else if (next && first.kind === "line" && next.kind === "line" && first.speaker === next.speaker && first.seconds + next.seconds <= 4.8) {
      group.push(next); i += 2;
    } else {
      i += 1;
    }
    groups.push(group);
  }
  return groups;
}

function visibleCharacters(group, scene) {
  const text = group.map((b) => b.text).join(" ");
  const recorded = /录音|耳机里|远处传来|声音|广播/.test(text);
  const found = [];
  for (const [name, id] of Object.entries(names)) {
    if (text.includes(name) && !(recorded && ["C03", "C04", "C05"].includes(id))) found.push(id);
  }
  for (const beat of group) {
    if (beat.kind === "line" && !recorded && !["C04", "C05"].includes(beat.speaker)) found.push(beat.speaker);
  }
  const unique = [...new Set(found)].filter((id) => identity[id] && scene.characters.includes(id));
  if (unique.length) return unique.slice(0, 3);
  return scene.characters.filter((id) => ["C01", "C02", "C03"].includes(id)).slice(0, 2);
}

function propsFor(group) {
  const text = group.map((b) => b.text).join(" ");
  const props = [];
  if (/电台|录音|音轨|播放|波形/.test(text)) props.push("P01");
  if (/钥匙/.test(text)) props.push("P02");
  if (/联单|金属筒/.test(text)) props.push("P03");
  return props;
}

function actionDescription(group, chars, props, sceneId) {
  const text = group.map((b) => b.text).join(" ");
  const subject = chars.length ? chars.map((id) => identity[id]).join(chars.length > 1 ? " and " : "") : "the physical evidence";
  if (/潜|水下|出水|防波堤/.test(text)) return `${subject} works against the low-tide water and retrieves evidence beside the breakwater`;
  if (/联单|清单|日志|责任书|纸|副本/.test(text)) return `${subject} examines and repositions the damaged documentary evidence on a hard surface`;
  if (/钥匙/.test(text)) return `${subject} handles the blackened brass key as a decisive piece of evidence`;
  if (/电台|录音|音轨|耳机|波形|播放/.test(text)) return `${subject} operates or listens to the scorched orange radio and its moving cyan waveform`;
  if (/门|走|跑|闯|进|离开|冲/.test(text)) return `${subject} moves urgently through ${sceneText[sceneId]}`;
  if (/按住|抢|摔|拔|挡|抓|展开/.test(text)) return `${subject} makes a sharp physical move over the contested evidence`;
  if (group.some((b) => b.kind === "line")) return `${subject} holds the tense exchange and reacts to the new claim`;
  return `${subject} advances the investigation through a restrained physical action`;
}

function makeCuts(scene) {
  const groups = groupScene(scene.beats);
  const cuts = groups.map((group, index) => {
    const lineSeconds = sum(group.filter((b) => b.kind === "line"), (b) => b.seconds);
    const seconds = Math.min(5, Math.max(2, roundHalf(lineSeconds), group.length > 1 ? 3 : 2.5));
    const chars = visibleCharacters(group, scene);
    const props = propsFor(group).filter((id) => scene.props.includes(id));
    const objectFocus = props.length || /手|纸|章|锁|线|按钮|编号|记号/.test(group.map((b) => b.text).join(" "));
    const size = objectFocus ? "extreme-close" : group.some((b) => b.kind === "line") ? "close" : index % 4 === 0 ? "wide" : "medium";
    const camera = group.some((b) => b.kind === "line") ? (index % 3 === 0 ? "Push In" : "Static Shot") : (index % 3 === 0 ? "Tracking Shot" : index % 3 === 1 ? "Pan Right" : "Static Shot");
    const action = actionDescription(group, chars, props, scene.sceneId);
    const subjects = chars.length ? chars.map((id) => identity[id]).join(chars.length > 1 ? " and " : "") : "the evidence and recording equipment";
    const frame = `Cinematic film still, ${sizePhrase[size]} of ${subjects} in ${sceneText[scene.sceneId]}, ${action}, realistic cool grey-green and oxidized orange palette, controlled natural lighting, no readable text.`;
    return { beats: [group[0].n, group.at(-1).n], seconds, size, camera, characters: chars, props, frame, group, action };
  });

  return cuts;
}

function packSegments(cuts) {
  const segments = [];
  let current = [];
  for (const cut of cuts) {
    if (current.length && sum(current, (c) => c.seconds) + cut.seconds > 15) {
      segments.push(current); current = [];
    }
    current.push(cut);
  }
  if (current.length) segments.push(current);
  if (segments.length > 1 && sum(segments.at(-1), (c) => c.seconds) < 7) {
    const previous = segments.at(-2);
    while (previous.length > 2 && sum(segments.at(-1), (c) => c.seconds) < 9) segments.at(-1).unshift(previous.pop());
  }
  return segments;
}

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
};

function buildPrompt(cuts, sceneId) {
  let cursor = 0;
  const alignment = cuts.map((cut, i) => {
    const value = `Picture ${i + 1} (from Shot ${i + 1}) aligns with the ${cursor.toFixed(2)}-second mark of the target video`;
    cursor += cut.seconds;
    return value;
  }).join("; ");
  cursor = 0;
  const shots = cuts.map((cut, i) => {
    const lead = i === 0
      ? `[Shot 1] Cinematic, live-action, cool grey-green and oxidized orange palette. Following <Picture 1>,`
      : `[Shot ${i + 1}] At ${formatTime(cursor)}, the camera cuts to <Picture ${i + 1}>:`;
    const text = cut.group.map((beat) => {
      if (beat.kind !== "line") return "";
      const context = cut.group.map((b) => b.text).join(" ");
      const mappedVoice = voice[beat.speaker];
      const offscreen = !mappedVoice || ["C04", "C05"].includes(beat.speaker) || /录音|耳机里|远处传来|声音|广播/.test(context);
      const speaker = !mappedVoice
        ? "An unidentified voice says only through an off-screen recording or speaker while all visible lips remain completely closed:"
        : offscreen
          ? `${mappedVoice.replace(" speaks ", " says in an off-screen voiceover ")} while all visible lips remain completely closed:`
          : mappedVoice;
      return `${speaker} <d>[Chinese] ${beat.text}</d>`;
    }).filter(Boolean).join(" ");
    const line = `${lead} ${cut.action}. The camera uses a ${cut.camera.toLowerCase()}.${text ? ` ${text}` : ""}`;
    cursor += cut.seconds;
    return line;
  });
  return `How the reference pictures align with the target video — ${alignment}.\n\nintegrated_multimodal_description:\n${shots.join("\n")}\n\noverall_soundscape: ${soundscape[sceneId]}\n\nnon_diegetic_music: ${music[sceneId]}`;
}

const authoredEpisodes = seed.episodes.map((episode) => {
  const segments = [];
  const sceneCuts = episode.seedScenes.map((scene) => ({ scene, cuts: makeCuts(scene) }));
  let slack = 116 - sum(sceneCuts, ({ cuts }) => sum(cuts, (cut) => cut.seconds));
  for (let pass = 0; slack >= 0.5 && pass < 5; pass++) {
    for (const { cuts } of sceneCuts) {
      for (const cut of cuts) {
        if (slack < 0.5) break;
        if (cut.seconds < 5) { cut.seconds += 0.5; slack -= 0.5; }
      }
    }
  }
  for (const { scene, cuts } of sceneCuts) {
    for (const packed of packSegments(cuts)) {
      segments.push({
        id: `E${String(episode.ep).padStart(2, "0")}-${String(segments.length + 1).padStart(2, "0")}`,
        sceneIndex: scene.sceneIndex,
        cuts: packed.map(({ group, action, ...cut }) => cut),
        h3Prompt: buildPrompt(packed, scene.sceneId),
        note: `自动导演底稿：${scene.sceneId} 连续节拍，关键帧按需生成前需做视觉复核。`,
      });
    }
  }
  return { ep: episode.ep, segments };
});

const document = {
  ...prior,
  episodes: [...prior.episodes.filter((e) => e.ep < 3), ...authoredEpisodes].sort((a, b) => a.ep - b.ep),
};
fs.writeFileSync(outPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");

for (const episode of authoredEpisodes) {
  const cuts = sum(episode.segments, (s) => s.cuts.length);
  const seconds = sum(episode.segments, (s) => sum(s.cuts, (c) => c.seconds));
  console.log(`✓ E${String(episode.ep).padStart(2, "0")}: ${episode.segments.length} 段 / ${cuts} 镜 / ${seconds.toFixed(1)} 秒`);
}
console.log(outPath);
