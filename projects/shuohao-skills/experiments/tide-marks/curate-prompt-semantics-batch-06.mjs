#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const frameSize = { "extreme-close": "extreme close-up", close: "close-up", medium: "medium shot", wide: "wide shot" };
const sceneStyle = {
  "沉船点外侧防波堤": "cold low-tide night at the outer breakwater, black river water, wet concrete wave blocks, practical headlamp light, cool grey-green shadows and restrained oxidized orange accents",
  "许知遥临时声音修复室": "audio restoration room before dawn, cyan waveform monitors, worn grey-green steel bench, dim practical light and restrained oxidized orange accents",
};
const sound = {
  water: "Low-tide water pulls through concrete blocks, a safety line strains and scrapes wet stone, breathing stays close, and the black river moves under cold night wind.",
  radioRecording: "Monitor fans hum in the pre-dawn lab. The cracked radio reproduces tide hiss, engine noise, recovered teenage speech and distant child crying; controls click and damp paper shifts. No present-day person speaks except for the explicitly scripted dialogue.",
  phoneRecording: "Monitor fans hum in the pre-dawn lab while a damaged smartphone speaker crackles with the investor's broken recording. The cracked orange radio stays silent on the bench, paper shifts softly, and no off-screen voice is added beyond the explicitly scripted phone recording.",
  evidenceReview: "Monitor fans hum in the pre-dawn lab as conservation paper, the cracked radio and the responsibility statement are compared on the steel bench. Evidence shifts softly; the cracked radio remains silent beneath the explicitly scripted present-day dialogue.",
  departure: "Monitor fans hum, three storage drives click into place, one transparent conservation sleeve rustles, an off-screen alarm sounds one minute before nine with no visible phone, digits or interface, and quick footsteps move toward the door.",
};
const music = {
  water: "Sub-bass swells and distant bowed metal rise slowly beneath the night water.",
  lab: "Sparse piano notes sit over a low electronic drone and a restrained ticking pulse.",
};

function makeH3(segment, shots, soundscape, score) {
  let cursor = 0;
  const alignment = segment.cuts.map((cut, index) => {
    const text = `Picture ${index + 1} (from Shot ${index + 1}) aligns with the ${cursor.toFixed(2)}-second mark of the target video`;
    cursor += cut.seconds;
    return text;
  }).join("; ");
  cursor = 0;
  const shotText = shots.map((shot, index) => {
    const lead = index === 0 ? `[Shot 1] Cinematic, live-action. Following <Picture 1>,` : `[Shot ${index + 1}] At 00:${cursor.toFixed(3).padStart(6, "0")}, the camera cuts to <Picture ${index + 1}>:`;
    const line = `${lead} ${shot} The camera uses a ${segment.cuts[index].camera.toLowerCase()}.`;
    cursor += segment.cuts[index].seconds;
    return line;
  }).join("\n");
  return `How the reference pictures align with the target video — ${alignment}.\n\nintegrated_multimodal_description:\n${shotText}\n\noverall_soundscape: ${soundscape}\n\nnon_diegetic_music: ${score}`;
}

const updates = {
  "E05-01": {
    actions: [
      "Dynamic medium action frame: the broad-shouldered male diver runs down the wet concrete slope and clips one brass carabiner on his black-and-yellow safety rope securely into the only rusted ring. His transparent black dive mask is pushed onto his forehead; one small cool-white lamp is fixed on the viewer-left side of the mask, at his right temple, and one black communication earpiece sits in his right ear. Show the anchor, carabiner, continuous rope to his waist harness and natural fastening anatomy; only the silent diver is visible",
      "The same diver pauses at the waterline with the dive mask still pushed onto his forehead, the single lamp still on viewer-left at his right temple, and uses two fingers to check the black earpiece in his right ear while his other hand steadies the same safety rope. He deliberately slows his breathing and speaks one low sentence, only the diver visible",
      "The same diver listens to an urgent female voice through the right-ear earpiece with his mouth fully closed. The mask remains on his forehead with the one lamp on viewer-left at his right temple; he glances from one small unreadable rope timer toward the falling waterline while steadying the same safety rope, only the diver visible",
    ],
    shots: [
      "the broad-shouldered male diver runs down the wet slope and clips the brass carabiner of his black-and-yellow safety rope into the only rusted ring. His mask is pushed onto his forehead, with one lamp on viewer-left at his right temple and one earpiece in his right ear.",
      "the diver keeps the mask on his forehead, checks the right-ear earpiece and regulates his breath before entry. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 知遥，给我十五分钟。</d>",
      "the diver listens with his mouth completely closed, the same mask, single lamp, right-ear earpiece and safety rope unchanged, while the waterline continues falling. Keep the rope timer unreadable and do not create a second countdown or second lamp. The slim female audio archivist says only through the off-screen connection in a clear, urgent voice (S1): <d>[Chinese] 退潮只剩十二分钟，别逞强。</d>",
    ],
    sound: sound.water,
    music: music.water,
    metadata: { 0: { size: "medium" } },
  },
  "E05-02": {
    actions: [
      "The same broad-shouldered male diver pauses at the black waterline and looks back toward the shore connection. His transparent black dive mask remains pushed onto his forehead with one cool-white lamp on viewer-left at his right temple; the right-ear earpiece, waist harness, black-and-yellow safety rope and unreadable timer remain unchanged. He finishes one difficult sentence before lowering the mask, only the diver visible",
      "Wide side action frame: the same diver has now pulled the transparent mask down to seal his eyes and nose; the one lamp remains on viewer-left at his right temple and the right-ear earpiece remains in place. He turns toward frame-right and slides into the black river while the same black-and-yellow safety rope pays out continuously from his waist toward frame-left over wet concrete, no tank, snorkel or fins, only the silent diver visible",
      "The diver is completely beneath the dark surface. The same taut black-and-yellow safety line disappears from the upper-left wet slope into the lower-right water; below the entry point show only one faint submerged human shadow and one blurred cool-white lamp point, never a clear face, hand or second light. An urgent female call reaches his earpiece and he cannot answer; no person is visible above water",
    ],
    shots: [
      "the diver pauses at the waterline with the mask still on his forehead, the one lamp at his right temple, the right-ear earpiece and safety rope unchanged, and completes the admission he avoided fifteen years earlier. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 十五年前，我已经退过一次。</d>",
      "the diver pulls the mask down over his eyes and nose, keeps the single lamp on the same side, turns and slides frame-right into the black river as the safety rope travels steadily toward frame-left over wet concrete behind him. This is a short free dive: do not add an oxygen tank, snorkel, fins, breathing tube or second rope.",
      "the taut safety line disappears beneath the dark surface; only one faint submerged shadow and one lamp point remain while the diver cannot answer. Do not reveal a clear face or add a tank, snorkel, fins, second lamp or second rope. The slim female audio archivist calls only through the off-screen headset connection in a clear, urgent voice (S1): <d>[Chinese] 程野，回话。</d>",
    ],
    sound: sound.water,
    music: music.water,
  },
  "E05-03": {
    actions: [
      "Close frame: the same broad-shouldered male diver breaks the black river surface with heavy breath, his mask sealed over eyes and nose, one lamp on viewer-left at his right temple and the right-ear earpiece unchanged. Both arms lock around exactly one sealed old steel document canister: a dark-brown rusted cylinder about 45 by 18 centimetres with two low reinforcing ribs, a fixed round base at frame-left and one thick threaded lid with two short grip tabs at frame-right. The lid remains completely closed and no paper is visible; only the diver and the single canister appear",
      "Medium action frame: the soaked diver has pushed the same mask back onto his forehead and braces the exact same single canister horizontally between his knees on the wet slope. One hand stabilizes the body while the other turns the frame-right threaded lid; the lid has loosened by only about one centimetre and remains on the mouth, with a narrow dark gap. Preserve the two low ribs, fixed frame-left base, right-side grip tabs and proportions; no paper or manifest is visible, the diver keeps his mouth closed, and no other person appears",
    ],
    shots: [
      "the diver bursts through the black surface with heavy breath and locks both arms around one sealed dark-brown steel canister with two low ribs, a fixed left base and a thick closed threaded lid at frame-right. No paper is visible. The broad-shouldered male diver speaks through strained breath in a rough low baritone (S2): <d>[Chinese] 找到了。</d>",
      "the soaked diver pushes the mask onto his forehead, braces the exact same canister between his knees and loosens the frame-right threaded lid by only about one centimetre. The lid remains attached and no paper appears; the diver stays silent.",
    ],
    sound: sound.water,
    music: music.water,
    metadata: { 0: { size: "close" }, 1: { size: "medium" } },
  },
  "E05-04": {
    actions: [
      "Close continuity frame: the exact same single rusted steel document canister is open, with its one threaded lid now fully removed and visible only once beside the mouth. One wet freight-manifest roll slides only partly out and still remains inside the canister; the broad-shouldered male diver supports it without unfolding it and listens with his mouth fully closed. Preserve the two low ribs, fixed base, dark river patina and natural hands; only the diver is visible, with no duplicate lid, canister or paper and no readable text",
      "Close frame: the broad-shouldered male diver holds the exact same detached canister lid beneath the single lamp at his right temple and studies one small irregular hand-scratched half-moon mark. The mark is not a full circle, power symbol, logo, letter or number. He speaks with a slight natural mouth opening; the manifest and the female archivist remain out of frame, with no second lid or duplicate object",
      "Wide uphill action frame: before running, the diver has returned the only wet manifest completely inside the exact same canister and tightened the same threaded lid closed. No paper is visible outside. He hugs the sealed canister to his chest and runs uphill across wet wave blocks toward shore while the same safety rope trails safely behind; only the diver and one canister appear",
    ],
    shots: [
      "the same canister is open and its only lid is fully removed; one wet manifest roll slides only partly out and remains inside while the diver supports it without unfolding it. He keeps his mouth completely closed. The slim female audio archivist gives an order only through the off-screen headset connection in a clear urgent voice (S1): <d>[Chinese] 别展开，马上带回来。</d> Do not show her, a second lid, a second canister, duplicate paper or readable text.",
      "the diver raises the same detached lid beneath his single right-temple lamp and finds one irregular hand-scratched half-moon mark, never a full circle, power icon, logo, letter or number. He alone speaks with natural lip movement in a newly trembling rough voice (S2): <d>[Chinese] 筒盖上有许潮的潮记。</d> Keep the manifest and the female archivist out of frame.",
      "the only manifest has already been returned completely inside the same canister and the same lid has been tightened closed. With no paper visible outside, the diver hugs the sealed canister and runs uphill over the wet wave blocks toward shore while the safety rope trails behind.",
    ],
    sound: sound.water,
    music: music.water,
    metadata: {
      0: { size: "close", characters: ["C02"], props: ["P03", "P04"], continuityRefs: ["storyboard-full-pack/E05-03/f2.png"], descriptionZh: "动作：同一只文件筒的筒盖已经完全旋下；唯一一卷湿联单只滑出一部分，仍留在筒内。程野闭口听许知遥画外下令：‘别展开，马上带回来。’" },
      1: { size: "close", characters: ["C02"], props: ["P04"], descriptionZh: "程野把同一只独立筒盖举到右侧头灯下，辨认无字的半月划痕：‘筒盖上有许潮的潮记。’" },
      2: { size: "wide", camera: "Tracking Shot", characters: ["C02"], props: ["P04"], descriptionZh: "动作：程野已把唯一联单完整放回筒内并旋紧同一只筒盖；画面外无纸张。他抱筒沿消波块向岸上奔跑。" },
    },
  },
  "E05-05": {
    actions: [
      "Medium static frame: the slim female audio archivist keeps her mouth fully closed and presses one unlabeled physical playback control beside the same unrepaired cracked orange radio. Preserve its split casing, bent antenna, broken grille, scorch and salt marks, with the broken memory board fitted back inside but not repaired. The cyan monitor shows only a dense engine waveform band followed by one blunt overload spike, with no letters, numbers, timecode, labels or readable interface; only the archivist is visible",
      "Close frame: the archivist listens rigidly with her mouth fully closed beside the exact same unrepaired cracked orange radio while a teenage male report emerges only from the old recording. Preserve the split casing and damage; no teenage witness, investor, child, portrait, reflection or reenactment appears, and the monitor remains abstract and unreadable",
      "Medium evidence-handling frame: at the start the archivist is already wearing thin conservation gloves. The broad-shouldered male diver places exactly one damp, curled recovered freight manifest beside the monitor while she begins to unfold the same sheet slowly on the steel bench. The paper is not sealed or bagged; show exactly two adults, natural hands, one manifest and no readable writing, phone or responsibility statement",
    ],
    shots: [
      "the archivist keeps her mouth closed and presses one unlabeled playback control beside the same cracked, unrepaired orange radio. The cyan screen shows only a dense engine waveform band followed by one blunt overload spike, without text, digits, timecode or readable UI.",
      "the archivist listens with her mouth completely closed beside the unchanged cracked radio as the teenage witness speaks only from the damaged old recording. The teenage male witness says in a fast, low, off-screen recorded voice (S5): <d>[Chinese] 高嵩开的船，他要赶在检查前运走六桶。</d> Do not show the witness, investor, child, portrait, reflection or reenactment.",
      "with her thin conservation gloves already on, the archivist begins unfolding exactly one damp curled manifest as the diver places it beside the monitor. The sheet is not sealed or bagged; keep hands natural and show no duplicate paper, readable writing, phone or responsibility statement.",
    ],
    sound: sound.radioRecording,
    music: music.lab,
    metadata: {
      0: { size: "medium", camera: "Static Shot", characters: ["C01"], props: ["P01"], continuityRefs: ["storyboard-full-pack/E04-07/f4.png"], descriptionZh: "动作：许知遥闭口按下一个无字播放控件；同一台摔裂电台保持未修复状态，屏幕只出现发动机声带和一个沉闷爆音尖峰，不显示文字或时间码。" },
      1: { size: "close", characters: ["C01"], props: ["P01"] },
      2: { size: "medium", characters: ["C01", "C02"], props: ["P03"], descriptionZh: "动作：镜头开始时许知遥已经戴好薄手套；程野放下唯一一张潮湿卷曲的联单，她开始慢慢展开。联单尚未装袋。" },
    },
  },
  "E05-06": {
    actions: [
      "Close evidence frame: the slim female audio archivist follows exactly six aligned but blurred entry-row structures across the only damp manifest with one gloved fingertip and speaks with a small natural mouth opening. The same sheet is unfolded but not yet fully conservation-flattened; no row content, letters or numbers are readable, and no second manifest appears",
      "Close evidence frame: the broad-shouldered male diver points to one blurred dark-purple square private seal at the lower-right corner of the same manifest. The seal has one chipped corner and a short feathered bleed trailing left, matching the official evidence state. He alone speaks with a natural mouth opening; no red replacement seal, readable text or duplicate sheet appears",
      "Medium restoration frame: the archivist uses one unlabeled backward control to make a single rewind action, then listens beside the exact same cracked, unrepaired orange radio with her mouth fully closed. The cyan monitor contains only an abstract waveform: no digits, minus sign, timecode, button text or readable UI. The teenage witness exists only in the old audio and never appears",
      "Medium reaction frame: the archivist and diver freeze beside the same cracked, unrepaired orange radio with both mouths fully closed. An abstract unreadable waveform remains on the monitor while continuous child crying and the teenage witness's running voice emerge only from the recording; show exactly two present-day adults, with no child, witness, portrait, reflection or reenactment",
    ],
    shots: [
      "the archivist traces exactly six aligned blurred row structures on the only damp, unfolded but not fully flattened manifest. She alone speaks with natural lip movement in a clear, cool, restrained voice (S1): <d>[Chinese] 六行编号，和货仓清单一模一样。</d> Keep every row unreadable and do not create a second sheet.",
      "the diver points to the dark-purple chipped-corner square seal with its short leftward bleed at the lower-right corner of the same manifest. He alone speaks with natural lip movement in a rough low baritone (S2): <d>[Chinese] 右下角，是他的私章。</d> Do not turn the seal red or make text readable.",
      "the archivist makes one rewind action using an unlabeled backward control and then keeps her mouth completely closed while the teenage witness speaks only from the old recording. The teenage male witness says in a breathless off-screen recorded voice (S5): <d>[Chinese] 电台藏在救生圈里，位置我报过了。</d> Keep the waveform abstract and show no digits, timecode, readable UI or teenage witness.",
      "the archivist and diver remain silent with both mouths fully closed as continuous child crying appears beneath the teenage witness's running voice. The teenage male witness says only in the off-screen recording (S5): <d>[Chinese] 舱里还有孩子。</d> Show exactly two present-day adults and no child, witness, portrait, reflection or reenactment.",
    ],
    sound: sound.radioRecording,
    music: music.lab,
    metadata: {
      0: { size: "close", characters: ["C01"], props: ["P03"], continuityRefs: ["storyboard-full-pack/E05-05/f3.png"] },
      1: { size: "close", characters: ["C02"], props: ["P03"], descriptionZh: "程野指向同一张联单右下角缺一角、向左带短晕尾的暗紫方章：‘右下角，是他的私章。’" },
      2: { size: "medium", characters: ["C01"], props: ["P01"], descriptionZh: "动作：许知遥用无字回拨控件执行一次倒回操作，随后闭口听录音；画面只显示抽象波形，不显示数字、时间码或按钮文字。" },
      3: { size: "medium", characters: ["C01", "C02"], props: ["P01"] },
    },
  },
  "E05-07": {
    actions: [
      "Medium reaction frame: the slim female audio archivist and broad-shouldered male diver listen beside the same cracked, unrepaired orange radio and an abstract cyan waveform with both mouths fully closed. The teenage witness resolves through the old recording to return for a child; exactly two present-day adults are visible, with no witness, child, portrait, reflection or reenactment",
      "Medium two-person frame: an abstract waveform suggests receding footsteps abruptly covered by one overload burst. Only the archivist loses composure and speaks one word with a small natural mouth opening; the diver's mouth remains fully closed beside her. Preserve the same cracked radio and show exactly two adults, no recorded person and no readable UI",
      "Medium terminal-state frame: the archivist's headphones are already removed and rest once on the steel bench; both of her hands now brace naturally on the bench as she is half-risen and frozen with her mouth fully closed. The teenage witness's message returns only through audio; show no extra hands, floating headset, witness, child or reenactment",
      "Medium ending frame: the archivist and diver listen beside the same cracked, unrepaired orange radio and abstract waveform, both mouths fully closed, while the teenage witness's final explanation is gradually buried by tide noise. Exactly two present-day adults appear; do not show the witness, child, father, investor, portrait, reflection or reenactment",
    ],
    shots: [
      "the archivist and diver listen beside the same cracked radio with both mouths completely closed as the teenage witness makes an immediate decision only in the recording. The teenage male witness says in a determined off-screen recorded voice (S5): <d>[Chinese] 我回去带他出来。</d> Do not show the witness, child or reenactment.",
      "recorded footsteps recede and an overload burst covers the abstract waveform; only the archivist breaks her composure and speaks in a strained voice (S1): <d>[Chinese] 哥。</d> The diver's mouth stays fully closed. Keep the recorded people absent and the interface unreadable.",
      "the headphones are already off and rest once on the bench while the archivist braces both hands there, half-risen, and freezes with her mouth completely closed. The teenage male witness says only in the off-screen recording (S5): <d>[Chinese] 知遥长大以后，告诉她。</d> Do not show the witness or create extra hands or a second headset.",
      "the archivist and diver remain silent beside the same cracked radio with both mouths fully closed while tide noise gradually covers the final explanation. The teenage male witness says only in the off-screen recording (S5): <d>[Chinese] 我不是跟爸赌气跑掉的。</d> Do not show the witness, child, father, investor or reenactment.",
    ],
    sound: sound.radioRecording,
    music: music.lab,
    metadata: {
      0: { size: "medium", characters: ["C01", "C02"], props: ["P01"], continuityRefs: ["storyboard-full-pack/E05-06/f4.png"] },
      1: { size: "medium", characters: ["C01", "C02"], props: ["P01"] },
      2: { size: "medium", characters: ["C01"], props: [], descriptionZh: "画面采用动作终态：耳机已经摘下并放在台面，许知遥双手撑住修复台、半起身、闭口；‘摘下再撑住’的过程留给后期视频运动。" },
      3: { size: "medium", characters: ["C01", "C02"], props: ["P01"] },
    },
  },
  "E05-08": {
    actions: [
      "Medium evidence frame: the slim female audio archivist places the same unrepaired cracked orange radio beside the only damp manifest, which lies flat on neutral conservation support but is not yet inside any sleeve or bag. The broad-shouldered male diver studies both and alone speaks slowly with natural lip movement; the archivist's mouth remains closed. Show exactly two adults, one radio and one unbagged manifest, with no readable text or duplicate evidence",
      "Close frame: the archivist regains her controlled posture and states her conclusion toward the diver off-screen with natural restrained lip movement. Only she is visible; the named investor remains absent, with no portrait, reflection, phone playback reenactment or readable screen",
      "Close frame: the diver holds one damaged smartphone at chest level, plays its broken recording and listens with his mouth fully closed. The phone shows only a small abstract waveform with no text, digits, face, portrait or readable UI. The investor's threat exists only in the phone audio; show only the diver and keep the orange radio outside the crop",
      "Close two-person listening frame: the damaged smartphone remains in the foreground with its screen turned away or softly blurred while the archivist and diver listen behind it with both mouths fully closed. The investor is heard only through the phone; exactly two present-day adults appear, with no investor, portrait, reflection, reenactment or readable interface",
    ],
    shots: [
      "the archivist places the same cracked radio beside the only manifest on neutral conservation support; the manifest is not yet inside any transparent sleeve or bag. The diver studies both items and alone speaks in a rough low baritone (S2): <d>[Chinese] 他留下证据，又回去救人。</d> The archivist's mouth stays closed; show no duplicate evidence or readable paper text.",
      "the archivist regains control and states that the investor rewrote the witness's rescue decision as guilt. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 高嵩把他的选择，改成了罪。</d> The investor is not visible.",
      "the diver plays the damaged recording on one smartphone at chest level and keeps his mouth fully closed. Its screen contains only an abstract waveform with no text, digits, portrait or readable UI. The controlled middle-aged investor says only through the broken phone recording in a measured low voice (S3): <d>[Chinese] 她的学籍和住处，都在我手里。</d> Do not show the investor.",
      "the smartphone remains foregrounded with its screen turned away or blurred while the archivist and diver listen with both mouths completely closed. The controlled middle-aged investor says only through the phone recording (S3): <d>[Chinese] 要想保住女儿，就让他签。</d> The last words are cut by noise; do not show the investor, a portrait, reflection or reenactment.",
    ],
    sound: sound.phoneRecording,
    music: music.lab,
    metadata: {
      0: { size: "medium", characters: ["C01", "C02"], props: ["P01", "P03"], referenceProps: ["P03"], continuityRefs: ["storyboard-full-pack/E05-07/f4.png"], descriptionZh: "动作：许知遥把同一台摔裂电台放在联单旁；联单只铺在保育衬纸上，尚未装进透明袋。程野说：‘他留下证据，又回去救人。’" },
      1: { size: "close", characters: ["C01"], props: [] },
      2: { size: "close", characters: ["C02"], props: ["P06"] },
      3: { size: "close", characters: ["C01", "C02"], props: ["P06"] },
    },
  },
  "E05-09": {
    actions: [
      "Close evidence frame: the slim female audio archivist places exactly one weathered responsibility statement beside the same unbagged manifest on conservation support and fixes her eyes on its signature. Keep the full lower-right corner of the responsibility statement inside the frame, with the blurred blue-black signature and faded oval stamp visible but unreadable. Both paper documents remain bare and unbagged on separate neutral supports. Wearing thin conservation gloves, she alone speaks with restrained natural lip movement; only the archivist is visible and the diver stays completely outside the crop. Show exactly two paper evidence items and no other evidence: the P06 phone, cracked radio, metal canister, storage drives and transparent sleeve are all completely outside the crop. No duplicate document or readable text",
      "Medium evidence-chain frame: the broad-shouldered male diver methodically indicates exactly three distinct items in order—the same unrepaired cracked orange radio, the same unbagged manifest and one bare weathered responsibility statement—while the archivist follows beside him. Preserve the radio's black melt scar, cracked/open right-side structure, salt-frosted scuffs and bent antenna without repair or repainting; both papers remain bare and unbagged. Keep the responsibility statement's lower-right blurred blue-black signature and faded oval stamp visibly inside the frame but unreadable. He alone speaks; her mouth remains closed. Show exactly two adults and one of each evidence item, with no phone, storage drives, transparent sleeve, duplicate paper or readable text",
      "Close frame: the archivist lifts her gaze away from the evidence and looks through the same wired-glass window toward the whitening sky, stating the final missing step with controlled natural lip movement. Preserve the window's established radial spider crack in the same location; do not repair or redraw the pane as intact glass. Only she is visible; keep evidence and screens outside the crop and show no readable text",
    ],
    shots: [
      "the archivist places exactly one weathered responsibility statement beside the same unbagged manifest and holds her gaze on its signature. Keep the full lower-right corner of the responsibility statement inside the frame, with the blurred blue-black signature and faded oval stamp visible but unreadable. Both documents remain bare and unbagged on separate neutral supports. She alone is visible and speaks in a clear voice carrying restrained grief (S1): <d>[Chinese] 爸不是认罪。他是在替我挡。</d> This is her personal interpretation, not a verified finding or exoneration. Keep the diver, P06 phone, cracked radio, metal canister, storage drives and transparent sleeve completely outside the crop. Show exactly two paper evidence items, no duplicate paper and no readable text.",
      "the diver confirms exactly three distinct items—the same unrepaired cracked orange radio, unbagged manifest and bare responsibility statement—one by one while the archivist follows with her mouth closed. Preserve the radio's black melt scar, cracked/open right side, salt-frosted scuffs and bent antenna without repair or repainting; both papers stay bare and unbagged. Keep the responsibility statement's lower-right blurred blue-black signature and faded oval stamp visibly inside the frame but unreadable. He speaks in a rough low baritone (S2): <d>[Chinese] 录音、联单、责任书，现在能互相对上。</d> Their correspondence is a working investigative correlation, not authentication, guilt or exoneration. Do not add a phone, storage drives, transparent sleeve, duplicate evidence or readable text.",
      "the archivist raises her eyes from the evidence toward the same wired-glass window and identifies public disclosure as the remaining step. Preserve the window's established radial spider crack in the same location and do not repair the pane. She is the only visible person and speaks in a clear, cool voice (S1): <d>[Chinese] 还差公开。</d> Keep every other person, all evidence and every screen completely outside the crop; show no readable text, interface or subtitle.",
    ],
    sound: sound.evidenceReview,
    music: music.lab,
    metadata: {
      0: { size: "close", characters: ["C01"], props: ["P03", "P05"], continuityRefs: ["storyboard-full-pack/E05-08/f4.png"], descriptionZh: "动作：许知遥把唯一一张父亲责任书放在同一张尚未装袋的联单旁，眼睛停在模糊签名上，说：‘爸不是认罪。他是在替我挡。’P05 右下角必须完整入画，蓝黑模糊签名和褪色椭圆印可辨但不可读；两张纸分别裸放在中性衬纸上。只有许知遥入画并开口；程野、P06 手机、摔裂电台、金属文件筒、三个备份盘和透明保护袋均不出现。她表达的是个人判断，不是已核实结论或免责认定。" },
      1: { size: "medium", characters: ["C01", "C02"], props: ["P01", "P03", "P05"], referenceProps: ["P01"], descriptionZh: "程野逐件确认恰好三件不同证物：一台摔裂电台、一张尚未装袋的联单和一张责任书，并说：‘录音、联单、责任书，现在能互相对上。’P01 保留黑色熔痕、右侧裂开结构、盐霜擦痕和弯天线；P05 右下蓝黑模糊签名与褪色椭圆印入画但不可读。只有程野开口，许知遥闭口；不出现手机、备份盘、透明袋、重复证物或可读文字。这里仅表示调查线索可以相互印证，不代表真实性鉴定、定罪或免责。" },
      2: { size: "close", characters: ["C01"], props: [], descriptionZh: "许知遥从证物方向抬眼看向同一扇铁丝玻璃窗外，说：‘还差公开。’窗户原有的放射状蛛裂必须保留在同一位置，玻璃不能自动修复。只有许知遥入画并开口；其他人物、全部证物和所有屏幕均在画外，不生成可读文字、界面或字幕。" },
    },
  },
  "E05-10": {
    actions: [
      "Medium parallel-action frame: the slim female audio archivist copies the repaired recording to exactly three separate small storage drives, each plain and unlabeled, while the broad-shouldered male diver slides the fully supported manifest into exactly one transparent conservation sleeve for the first time. This is silent present-day action and both adults keep their mouths fully closed. Show exactly two adults, three drives, one manifest and one sleeve with natural hands. The cracked radio, responsibility statement, P06 phone and metal canister are all completely outside the crop; no labels, digits or document text are readable",
      "Close frame: the diver lifts the same single transparent conservation sleeve after the only supported manifest is completely inside and the sleeve opening is fully closed; no paper edge protrudes and he never opens it again. He turns decisively toward the door and alone speaks with natural lip movement. Only the diver and one fully closed bagged manifest appear, with no loose duplicate paper, radio, phone, storage drive or readable text",
      "Wide departure frame: the archivist carries the same unrepaired cracked orange radio, preserving its black melt scar, cracked/open right-side structure, salt-frosted scuffs and bent antenna without repair or repainting. The diver carries the single manifest completely inside the same fully closed transparent conservation sleeve and never opens it. Both adults walk quickly toward the door with their mouths fully closed. Before departing, the diver has fully pocketed the same cracked-screen phone containing the residual recording inside an inner pocket and takes it with him; the phone remains completely out of frame. Exactly three unlabeled storage drives remain together on the steel bench. An off-screen alarm sound alone indicates one minute before nine; show no phone, digits or interface. Pale dawn enters through wired glass, exactly two adults visible",
    ],
    shots: [
      "the archivist copies the repaired recording onto exactly three plain unlabeled storage drives while the diver slides the only supported manifest into one transparent conservation sleeve for the first time. This shot has no present-day dialogue and both adults keep their mouths fully closed. Keep the cracked radio, responsibility statement, P06 phone and metal canister completely outside the crop; show no labels, digits, readable document text or duplicate evidence.",
      "after the only supported manifest is completely inside the same single transparent conservation sleeve and its opening is fully closed, the diver lifts it and turns toward the exit without ever opening it again. He alone speaks with natural lip movement in a rough low baritone (S2): <d>[Chinese] 去渡口。</d> Show no protruding or loose paper, duplicate evidence, radio, phone, storage drive or readable text.",
      "the archivist carries the same unrepaired cracked orange radio, preserving its black melt scar, cracked/open right side, salt-frosted scuffs and bent antenna without repair or repainting. The diver carries the only manifest completely inside the same fully closed transparent conservation sleeve and never opens it. Both adults walk toward the door with their mouths fully closed. Before they leave, the diver has fully placed the same cracked-screen residual-recording phone inside his inner pocket and takes it with him; keep the phone completely out of frame. Exactly three unlabeled drives remain together on the bench. Indicate one minute before nine only with an off-screen alarm sound, with no phone, digits, interface or duplicate evidence.",
    ],
    sound: sound.departure,
    music: music.lab,
    metadata: {
      0: { size: "medium", camera: "Static Shot", characters: ["C01", "C02"], props: ["P03", "P07"], referenceProps: ["P07"], continuityRefs: ["storyboard-full-pack/E05-09/f2.png"], descriptionZh: "动作：许知遥把修复录音复制到恰好三个无标签、彼此独立的存储盘；程野第一次把同一张联单装进唯一一个透明保护袋。此镜无台词，两人嘴唇完全闭合。画面只出现两位成人、三个存储盘、一张联单和一个保护袋；摔裂电台、P05 责任书、P06 残录手机与 P04 金属文件筒均在画外，不生成标签、数字或可读文字。" },
      1: { size: "close", characters: ["C02"], props: ["P03"], descriptionZh: "联单已经完全进入同一个透明保护袋，袋口完全封闭，没有纸边外露，之后绝不再打开。程野拿起唯一一袋联单，独自开口说：‘去渡口。’只出现程野和这一袋联单；不出现散纸、重复证物、电台、手机、存储盘或可读文字。" },
      2: { size: "wide", characters: ["C01", "C02"], props: ["P01", "P03", "P06", "P07"], referenceProps: ["P01"], descriptionZh: "动作：许知遥拿同一台未修复的摔裂电台，黑色熔痕、右侧裂开结构、盐霜擦痕和弯天线保持不变；程野拿已完全装入且袋口完全封闭的唯一一袋联单，绝不打开。两人闭口快步走向门口；出发前，程野已把同一部裂屏残录手机完全收入内侧口袋并随身带走，手机不出画；恰好三个存储盘留在台面。距九点一分钟只由画外闹钟声提示，不显示手机、数字或界面。" },
    },
  },
};

let reviewed = 0;
let cutCount = 0;
for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    const update = updates[segment.id];
    if (!update) continue;
    if (segment.cuts.length !== update.actions.length || segment.cuts.length !== update.shots.length) throw new Error(`${segment.id}: 镜头数量不匹配`);
    segment.cuts.forEach((cut, index) => {
      const metadata = update.metadata?.[index] || {};
      Object.assign(cut, metadata);
      cut.semanticDescriptionLocked = Object.prototype.hasOwnProperty.call(metadata, "descriptionZh");
      const size = frameSize[cut.size] || "cinematic shot";
      cut.frame = `Cinematic live-action suspense film still, 16:9 ${size}, ${sceneStyle[segment.sceneZh]}. ${update.actions[index]}. Realistic skin, fabric, metal and water texture, controlled continuity, no subtitles, no watermark, no border, no collage, no readable text.`;
      cutCount += 1;
    });
    segment.h3Prompt = makeH3(segment, update.shots, update.sound, update.music);
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：逐镜动作、水下安全逻辑、证据状态、旧录音/手机残录、出镜人物、闭口要求和 S1–S5 声纹已与中文节拍核对。";
    reviewed += 1;
  }
}

if (reviewed !== Object.keys(updates).length) throw new Error(`仅找到 ${reviewed}/${Object.keys(updates).length} 个第五集段落`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第五集语义重写：${reviewed} 段、${cutCount} 个逐镜提示词、${reviewed} 份 H3 提示词，并修正录音人物/道具元数据`);
