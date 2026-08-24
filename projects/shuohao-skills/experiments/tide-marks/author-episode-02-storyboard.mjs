#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const experimentDir = path.dirname(fileURLToPath(import.meta.url));
const storyboardDir = path.join(experimentDir, "storyboard");
const seedPath = path.join(storyboardDir, "潮痕-storyboard-ep2-seed.json");
const episodeOnePath = path.join(storyboardDir, "潮痕-storyboard.json");
const episodeTwoPath = path.join(storyboardDir, "潮痕-storyboard-ep2.json");
const combinedPath = path.join(storyboardDir, "潮痕-storyboard-ep1-2.json");

const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const seedEpisode = seed.episodes.find((episode) => episode.ep === 2);
if (!seedEpisode) throw new Error("seed 中没有第 2 集");

const sceneByIndex = new Map(seedEpisode.seedScenes.map((scene) => [scene.sceneIndex, scene]));

const speakerLead = {
  C01: "The slim female audio archivist speaks in a clear, cool, restrained voice (S1):",
  C02: "The broad-shouldered male diver speaks in a rough low baritone (S2):",
  C05: "A distant teenage male recording speaks in an off-screen voiceover with a bright strained voice (S3), while all visible lips remain completely closed:",
};

const segments = [
  {
    sceneIndex: 1,
    note: "双主角同场开场：行动主体进门，正反打核对两套时间。",
    soundscape: "The door opens sharply, paper lands on steel, monitor fans hum, and the damaged radio emits a faint alarm pulse beneath room tone.",
    music: "Low bowed cello with a restrained ticking pulse.",
    cuts: [
      { beats: [1, 1], seconds: 3, size: "medium", camera: "Tracking Shot", characters: ["C01", "C02"], props: ["P01"], frame: "Cinematic film still, medium shot of a broad-shouldered East Asian male diver pushing into the overcast audio lab and pressing an accident record beside a rolling waveform while a slim East Asian female archivist turns from the console, two-person composition, damp workwear and cool daylight.", action: "a broad-shouldered male diver pushes through the lab door and plants an accident record beside the rolling waveform as the female archivist turns toward him" },
      { beats: [2, 2], seconds: 3, size: "close", camera: "Static Shot", characters: ["C02"], props: [], frame: "Cinematic film still, close-up of the weathered male diver leaning over the steel bench, one finger pinning an accident record, heavy brows and guilty eyes held steady in soft overcast laboratory light.", action: "the male diver pins the accident record to the bench and states the official departure time without preamble" },
      { beats: [3, 4], seconds: 4.5, size: "medium", camera: "Pan Right", characters: ["C01", "C02"], props: ["P01"], frame: "Cinematic film still, medium shot across the audio bench: the slim female archivist drags the damaged orange radio recording back to an alarm spike while the male diver watches from the opposite side, their faces separated by twin cyan waveform monitors.", action: "the female archivist scrubs the radio recording back to an alarm spike while the male diver studies the waveform across from her" },
      { beats: [5, 5], seconds: 2.5, size: "extreme-close", camera: "Push In", characters: ["C01"], props: ["P01"], frame: "Cinematic film still, extreme close-up of the female archivist's precise fingertip pressing play beside the scorched orange emergency radio, a cyan waveform frozen at a narrow spike, cool overcast light on scratched steel.", action: "her fingertip presses play beside the scorched orange radio and the waveform begins to move" },
    ],
  },
  {
    sceneIndex: 1,
    note: "录音与现实双层人物：少年只以画外录音存在，画内保持两人。",
    soundscape: "A brittle teenage recording emerges through tide hiss; a regular moisture alarm pulse repeats while clothing brushes the steel bench.",
    music: "Sparse muted piano over a low electronic drone.",
    cuts: [
      { beats: [6, 6], seconds: 3, size: "extreme-close", camera: "Static Shot", characters: [], props: ["P01"], frame: "Cinematic film still, extreme close-up of the damaged orange emergency radio speaker under a cyan waveform display as an old teenage recording breaks through salt noise, the broken grille bar and fire scar sharply visible.", action: "the scorched radio speaker carries a distant teenage time report through salt noise" },
      { beats: [7, 8], seconds: 4, size: "medium", camera: "Push In", characters: ["C01", "C02"], props: ["P01"], frame: "Cinematic film still, medium shot with both people visible: the male diver bends close to the orange radio speaker while the female archivist listens at the console, a repeating waveform pulse between their profiles in the overcast restoration room.", action: "the male diver bends toward the speaker as the regular alarm pulse cuts through the tide recording; the camera pushes in between both listeners" },
      { beats: [9, 9], seconds: 2.5, size: "close", camera: "Static Shot", characters: ["C02"], props: ["P01"], frame: "Cinematic film still, close-up of the male diver recognizing the sound, eyes fixed on the radio and jaw tightening, cyan monitor light reflected in his weathered face.", action: "recognition settles across the male diver's face as he identifies the warehouse moisture alarm" },
    ],
  },
  {
    sceneIndex: 1,
    note: "用正反打和纸面插入镜头把时间矛盾变成可见证据。",
    soundscape: "The alarm pulse repeats every thirty seconds, a pencil scratches paper, and the room falls quiet between short questions.",
    music: "A restrained cello ostinato with isolated piano notes.",
    cuts: [
      { beats: [10, 10], seconds: 2, size: "close", camera: "Static Shot", characters: ["C01"], props: [], frame: "Cinematic film still, close-up of the female archivist turning sharply toward the diver, brows lifted in a precise challenge, neutral overcast daylight and faint cyan fill across her face.", action: "the female archivist turns sharply and asks whether the sound came from the boat" },
      { beats: [11, 12], seconds: 4, size: "close", camera: "Push In", characters: ["C02"], props: [], frame: "Cinematic film still, close-up of the male diver slowly shaking his head, one hand braced on the bench, certainty and old dread visible in his deep-set eyes.", action: "the male diver shakes his head and explains that the alarm has repeated every thirty seconds since childhood" },
      { beats: [13, 14], seconds: 4, size: "extreme-close", camera: "Pan Right", characters: ["C01"], props: [], frame: "Cinematic film still, extreme close-up of the female archivist's hand drawing two separated time marks on one blank evidence sheet, her tense face reflected faintly in the monitor edge, no readable writing.", action: "her pencil places two incompatible time marks on the same evidence sheet as she realizes her brother was still ashore" },
      { beats: [15, 15], seconds: 3, size: "close", camera: "Static Shot", characters: ["C02"], props: [], frame: "Cinematic film still, close-up of the male diver avoiding the woman's gaze after stating that one record must be false, soft window light exposing tension in his jaw.", action: "the male diver states that at least one record is false and then avoids her gaze" },
    ],
  },
  {
    sceneIndex: 1,
    note: "回避升级为逼问，椅背手部特写承接负疚。",
    soundscape: "A chair creaks under tightening fingers, distant traffic fades behind wired glass, and the radio hiss continues at low level.",
    music: "Low sustained strings with a single muted heartbeat-like drum.",
    cuts: [
      { beats: [16, 17], seconds: 3.5, size: "close", camera: "Push In", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, close-up two-person composition across the bench as the female archivist notices the diver's evasive look and leans forward to question him, his shoulders turning away while her gaze hardens.", action: "the female archivist catches his evasive glance and presses him for what else he knows" },
      { beats: [18, 18], seconds: 2.5, size: "extreme-close", camera: "Static Shot", characters: ["C02"], props: [], frame: "Cinematic film still, extreme close-up of the male diver's rough hand tightening around the back of a worn steel chair, pale knuckles and a dive-watch pressure mark visible.", action: "his hand tightens around the chair back before he can answer" },
      { beats: [19, 19], seconds: 4, size: "close", camera: "Push In", characters: ["C02"], props: [], frame: "Cinematic film still, close-up of the male diver finally meeting her eyes as he confesses finding half a burned boat plate after the accident, guilt held in a rigid face.", action: "the male diver finally looks up and admits that he found half a burned boat plate the next day" },
    ],
  },
  {
    sceneIndex: 1,
    note: "双人对峙落到父亲旧照和钥匙，作为转场钩子。",
    soundscape: "The chair releases with a metal tick, paper shifts under a hand, and the brass key scrapes sharply across the bench.",
    music: "A tense cello line rises, then cuts to a held low note.",
    cuts: [
      { beats: [20, 20], seconds: 2, size: "close", camera: "Static Shot", characters: ["C01"], props: [], frame: "Cinematic film still, close-up of the female archivist reacting instantly, eyes locked on the diver as she demands the boat plate's location.", action: "the female archivist demands to know where the boat plate is" },
      { beats: [21, 22], seconds: 3.5, size: "close", camera: "Pull Out", characters: ["C02"], props: [], frame: "Cinematic film still, close-up widening from the male diver's hand releasing the chair to his ashamed face as he admits throwing the plate back into the river.", action: "his hand releases the chair and the camera pulls out as he admits throwing the plate back into the water" },
      { beats: [23, 24], seconds: 3, size: "medium", camera: "Pan Left", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, medium shot with both investigators visible as the female archivist asks who ordered it and the male diver turns toward an old father photograph beside the monitor, the photograph soft and unreadable.", action: "she asks who ordered him to discard it, and he turns toward the old father photograph" },
      { beats: [25, 25], seconds: 2, size: "close", camera: "Static Shot", characters: ["C02"], props: [], frame: "Cinematic film still, close-up of the male diver looking at the old photograph as he gives a painfully quiet answer, cold window light flattening the room behind him.", action: "the male diver gives the father's familiar title in a voice barely above the room tone" },
      { beats: [26, 27], seconds: 3.5, size: "medium", camera: "Tracking Shot", characters: ["C01", "C02"], props: ["P02"], frame: "Cinematic film still, medium shot of both investigators: the female archivist snatches the blackened brass boat key from the bench and strides toward the door while the male diver pivots to follow, decisive forward motion in overcast light.", action: "the female archivist grabs the blackened brass key and strides for the door, ordering an immediate trip to the warehouse as the diver follows" },
    ],
  },
  {
    sceneIndex: 2,
    note: "新场景先运动主体、门锁特写、再由第二人物找到侧门。",
    soundscape: "Boots cross wet concrete, brass scrapes inside a new padlock, and a heavy side door groans open.",
    music: "Low tremolo strings with sparse metallic percussion.",
    cuts: [
      { beats: [1, 1], seconds: 3, size: "wide", camera: "Tracking Shot", characters: ["C01", "C02"], props: ["P02"], frame: "Cinematic film still, wide shot outside an abandoned riverside warehouse as the female archivist strides toward the steel door with the brass key ready and the male diver follows one pace behind under dim overcast afternoon light.", action: "both investigators cross the wet yard toward the warehouse steel door, the camera tracking their urgent approach" },
      { beats: [2, 3], seconds: 3.5, size: "extreme-close", camera: "Push In", characters: ["C01"], props: ["P02"], frame: "Cinematic film still, extreme close-up of the blackened brass key entering a clean new padlock and refusing to turn, its off-center triangular notch and salt-white patches visible against cold steel.", action: "the brass key enters the new padlock but stops against the unfamiliar mechanism" },
      { beats: [4, 4], seconds: 2, size: "close", camera: "Static Shot", characters: ["C01"], props: ["P02"], frame: "Cinematic film still, close-up of the female archivist studying the mismatched new lock and immediately recognizing that it was replaced later.", action: "the female archivist identifies the lock as a later replacement" },
      { beats: [5, 5], seconds: 2.5, size: "medium", camera: "Pan Right", characters: ["C02"], props: [], frame: "Cinematic film still, medium shot of the male diver testing a partly open side door and pushing it inward, deep warehouse darkness appearing beyond his shoulder.", action: "the male diver finds the partly open side door and pushes it inward" },
    ],
  },
  {
    sceneIndex: 2,
    note: "双人进场与声源确认，强调两人共享但反应不同。",
    soundscape: "The side door echoes shut, a moisture alarm beeps through the cavernous warehouse, and the radio playback overlaps it exactly.",
    music: "A subdued low-frequency drone with a faint ticking motif.",
    cuts: [
      { beats: [6, 6], seconds: 3, size: "wide", camera: "Tracking Shot", characters: ["C01", "C02"], props: ["P01", "P02"], frame: "Cinematic film still, wide shot inside the dim warehouse as the two investigators enter together, the woman holding the brass key and damaged radio while the diver scans the concrete walls, cold doorway light behind them.", action: "the pair enter the dim warehouse together and spread their attention across the unfamiliar interior" },
      { beats: [7, 8], seconds: 4, size: "extreme-close", camera: "Push In", characters: [], props: ["P01"], frame: "Cinematic film still, extreme close-up linking a weak amber moisture-alarm lamp on the rear wall with the scorched orange radio in foreground as their pulses overlap in perfect rhythm.", action: "the rear alarm lamp blinks in exact rhythm with the damaged radio playback as the camera pushes toward the matching pulses" },
      { beats: [9, 9], seconds: 2, size: "close", camera: "Static Shot", characters: ["C02"], props: ["P01"], frame: "Cinematic film still, close-up of the male diver listening between the wall alarm and the orange radio, his recognition now certain in the dim amber-and-cold warehouse light.", action: "the male diver confirms that this is the sound preserved in the recording" },
    ],
  },
  {
    sceneIndex: 2,
    note: "钥匙真正用途揭晓，动作在双人配合中完成。",
    soundscape: "Footsteps approach the wall cabinet, brass enters an old lock, the latch snaps, and the cabinet door springs outward.",
    music: "Muted piano notes brighten slightly over sustained low strings.",
    cuts: [
      { beats: [10, 10], seconds: 2.5, size: "medium", camera: "Tracking Shot", characters: ["C01", "C02"], props: ["P02"], frame: "Cinematic film still, medium shot following the female archivist toward an embedded fire cabinet while the male diver remains behind near the blinking alarm, two-person depth composition in the dim warehouse.", action: "the female archivist crosses toward the embedded fire cabinet while the diver watches the alarm behind her" },
      { beats: [11, 12], seconds: 3.5, size: "extreme-close", camera: "Push In", characters: ["C01"], props: ["P02"], frame: "Cinematic film still, extreme close-up of the blackened brass key fitting the old fire-cabinet lock and turning cleanly as the metal door springs open, salt-white patches sharp under amber light.", action: "the same brass key fits the old cabinet lock, turns, and releases the spring-loaded door" },
      { beats: [13, 13], seconds: 2, size: "close", camera: "Static Shot", characters: ["C01"], props: ["P02"], frame: "Cinematic film still, close-up of the female archivist staring into the newly opened cabinet, surprise displacing certainty as she realizes what the key opens.", action: "the female archivist realizes that the inherited key was meant for this cabinet" },
      { beats: [14, 14], seconds: 3, size: "medium", camera: "Pan Right", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, medium shot with both investigators visible as the male diver reaches into the open fire cabinet and lifts out a mold-stained duty log while the female archivist holds the door and watches.", action: "the male diver removes a mold-stained duty log while the female archivist holds the cabinet open" },
    ],
  },
  {
    sceneIndex: 2,
    note: "日志、电台与两人证词在桌面三角构图中完成对账。",
    soundscape: "Damp pages separate with soft tearing sounds, the alarm continues at fixed intervals, and the radio hiss fills the spaces between voices.",
    music: "A tightening cello ostinato with restrained low piano.",
    cuts: [
      { beats: [15, 16], seconds: 4, size: "close", camera: "Push In", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, close-up two-person composition over a mold-stained duty log as the female archivist turns to a dated page and reads one time while the male diver leans in from the opposite side, all writing blurred and unreadable.", action: "the female archivist opens the log to the accident date and reads the official duty time while the diver follows the page" },
      { beats: [17, 17], seconds: 4.5, size: "close", camera: "Static Shot", characters: ["C02"], props: ["P01"], frame: "Cinematic film still, close-up of the male diver comparing the damp log with the orange radio waveform, one hand indicating the time conflict without showing readable text.", action: "the male diver compares the log with the radio recording and states that the alarm was still sounding twenty-seven minutes later" },
      { beats: [18, 19], seconds: 4, size: "medium", camera: "Pan Left", characters: ["C01", "C02"], props: ["P01"], frame: "Cinematic film still, medium shot with both investigators visible as the female archivist sets the moldy log beside the scorched orange radio and turns on the diver, anger rising while he absorbs the implication across the evidence table.", action: "she places the log beside the radio and voices the impossible split between her brother ashore and her father written aboard" },
    ],
  },
  {
    sceneIndex: 2,
    note: "以双人高低位对话收束，视线引向货仓深处留下悬念。",
    soundscape: "The alarm pulse continues, fabric shifts as the diver crouches, and a distant metal drip echoes from the dark rear of the warehouse.",
    music: "A single low cello note expands into unresolved dark ambience.",
    cuts: [
      { beats: [20, 21], seconds: 4, size: "medium", camera: "Pull Out", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, medium shot in a two-level composition with the male diver crouched beside the open cabinet and the female archivist standing over the evidence table as he reinterprets the father's warning.", action: "the crouched diver admits that the father was not afraid of the boat being found, while the camera pulls out to hold both investigators" },
      { beats: [22, 22], seconds: 2, size: "close", camera: "Static Shot", characters: ["C01"], props: [], frame: "Cinematic film still, close-up of the female archivist looking down at the diver and demanding what her father actually feared, cool light hardening her expression.", action: "the female archivist demands to know what the father feared" },
      { beats: [23, 24], seconds: 4.5, size: "wide", camera: "Push In", characters: ["C01", "C02"], props: [], frame: "Cinematic film still, wide shot of both investigators turning toward the unlit depth of the warehouse, the open fire cabinet and evidence table behind them, a narrow corridor of darkness becoming the final focal point.", action: "the male diver looks into the warehouse depth and recalls that the father stared there while ordering everyone to stop searching; the camera pushes into the darkness between them" },
    ],
  },
];

const formatAlignmentSeconds = (seconds) => seconds.toFixed(2);
const formatShotTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = (seconds - minutes * 60).toFixed(3).padStart(6, "0");
  return `${String(minutes).padStart(2, "0")}:${remainder}`;
};

const buildH3Prompt = (segment) => {
  let cursor = 0;
  const alignmentParts = segment.cuts.map((cut, index) => {
    const part = `Picture ${index + 1} (from Shot ${index + 1}) aligns with the ${formatAlignmentSeconds(cursor)}-second mark of the target video`;
    cursor += cut.seconds;
    return part;
  });

  const scene = sceneByIndex.get(segment.sceneIndex);
  cursor = 0;
  const shotLines = segment.cuts.map((cut, index) => {
    const prefix = index === 0
      ? `[Shot 1] Cinematic, live-action, cool grey-green and oxidized orange palette. Following <Picture 1>,`
      : `[Shot ${index + 1}] At ${formatShotTime(cursor)}, the camera cuts to <Picture ${index + 1}>:`;
    const dialogue = scene.beats
      .filter((beat) => beat.n >= cut.beats[0] && beat.n <= cut.beats[1] && beat.kind === "line")
      .map((beat) => `${speakerLead[beat.speaker]} <d>[Chinese] ${beat.text}</d>`)
      .join(" ");
    const line = `${prefix} ${cut.action}. The camera uses a ${cut.camera.toLowerCase()}.${dialogue ? ` ${dialogue}` : ""}`;
    cursor += cut.seconds;
    return line;
  });

  return [
    `How the reference pictures align with the target video — ${alignmentParts.join("; ")}.`,
    "",
    "integrated_multimodal_description:",
    ...shotLines,
    "",
    `overall_soundscape: ${segment.soundscape}`,
    "",
    `non_diegetic_music: ${segment.music}`,
  ].join("\n");
};

const episodeTwo = {
  ep: 2,
  segments: segments.map((segment, index) => ({
    id: `E02-${String(index + 1).padStart(2, "0")}`,
    sceneIndex: segment.sceneIndex,
    cuts: segment.cuts.map(({ action, ...cut }) => cut),
    h3Prompt: buildH3Prompt(segment),
    note: segment.note,
  })),
};

const episodeTwoDocument = {
  source: "潮痕",
  style: "realistic",
  promptLang: "en",
  episodes: [episodeTwo],
};

const episodeOneDocument = JSON.parse(fs.readFileSync(episodeOnePath, "utf8"));
const combinedDocument = {
  ...episodeOneDocument,
  episodes: [
    ...episodeOneDocument.episodes.filter((episode) => episode.ep !== 2),
    episodeTwo,
  ].sort((a, b) => a.ep - b.ep),
};

fs.writeFileSync(episodeTwoPath, `${JSON.stringify(episodeTwoDocument, null, 2)}\n`, "utf8");
fs.writeFileSync(combinedPath, `${JSON.stringify(combinedDocument, null, 2)}\n`, "utf8");

const cutCount = episodeTwo.segments.reduce((sum, segment) => sum + segment.cuts.length, 0);
const seconds = episodeTwo.segments.reduce(
  (sum, segment) => sum + segment.cuts.reduce((segmentSum, cut) => segmentSum + cut.seconds, 0),
  0,
);
console.log(`✓ 第 2 集：${episodeTwo.segments.length} 段 / ${cutCount} 镜 / ${seconds.toFixed(1)} 秒`);
console.log(`  ${episodeTwoPath}`);
console.log(`  ${combinedPath}`);
