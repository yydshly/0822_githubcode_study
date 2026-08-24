#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));
const frameSize = { "extreme-close": "extreme close-up", close: "close-up", medium: "medium shot", wide: "wide shot" };
const frameSizeZh = { "extreme-close": "大特写", close: "特写", medium: "中景", wide: "全景" };
const cameraZh = { "Tracking Shot": "跟拍", "Static Shot": "固定", "Push In": "推镜" };
const characterZh = { C01: "许知遥", C02: "程野", C03: "高嵩", C04: "许德海", C05: "许潮" };
const propZh = {
  P01: "橙色应急电台",
  P03: "真正的载货联单",
  P05: "许德海事故责任书",
  P06: "程野残录手机",
  P07: "三份独立备份盘",
};
const sceneStyle = {
  "仪式清晨": "public demolition ceremony outside the weathered ferry waiting hall in clear cold morning light, wet stone, temporary loudspeakers and restrained oxidized orange accents",
  "退潮黄昏": "quiet low-tide dusk at the old ferry steps, soft grey-green river light, exposed wet stone and restrained oxidized orange accents",
};
const sound = {
  ceremonyActive: "River wind crosses the public-address speakers, camera shutters and restrained phone clicks punctuate the forecourt, the sealed evidence sleeve rustles softly, and all demolition machinery continues idling without shutting down.",
  ceremonyPressure: "The public-address recording continues under river wind, two nearby phones capture the evidence, the sealed sleeve shifts without opening, and demolition engines remain idling until the project-manager call arrives.",
  ceremonyShutdown: "The broken phone recording crackles, then demolition engines power down one by one; the final engine dies into a quiet forecourt.",
  ceremonyIntake: "The forecourt stays quiet after shutdown; an off-screen procedural phone notice is heard, followed by soft glove and sleeve sounds during the controlled handoff.",
  dusk: "Low-tide water moves below the exposed steps, river wind touches the secured damaged radio shell, small archival fittings click, and the pier settles into evening quiet.",
  duskClosing: "Low-tide water moves below the exposed steps, river wind touches the secured damaged radio shell, small archival fittings click, and one restrained phone vibration closes the sequence.",
};
const music = {
  ceremony: "Low bowed cello and restrained percussion rise beneath the public evidence confrontation without resolving it.",
  dusk: "Sparse piano and a soft sustained cello harmonic leave the ending open but steady.",
};

function makeH3(segment, shots, soundscape, score) {
  let cursor = 0;
  const alignment = segment.cuts.map((cut, index) => {
    const value = `Picture ${index + 1} (from Shot ${index + 1}) aligns with the ${cursor.toFixed(2)}-second mark of the target video`;
    cursor += cut.seconds;
    return value;
  }).join("; ");
  cursor = 0;
  const body = shots.map((shot, index) => {
    const lead = index === 0 ? `[Shot 1] Cinematic, live-action. Following <Picture 1>,` : `[Shot ${index + 1}] At 00:${cursor.toFixed(3).padStart(6, "0")}, the camera cuts to <Picture ${index + 1}>:`;
    const value = `${lead} ${shot} The camera uses a ${segment.cuts[index].camera.toLowerCase()}.`;
    cursor += segment.cuts[index].seconds;
    return value;
  }).join("\n");
  return `How the reference pictures align with the target video — ${alignment}.\n\nintegrated_multimodal_description:\n${body}\n\noverall_soundscape: ${soundscape}\n\nnon_diegetic_music: ${score}`;
}

const updates = {
  "E06-01": {
    actions: [
      "Medium action frame: the investor at frame left lunges toward exactly one active public-address cable while the diver at frame right side-steps between him and the console, holding the single sealed transparent conservation sleeve containing the manifest firmly against his chest. Both men keep their mouths closed; exactly two men, one cable and one bagged manifest are visible, with no orange radio, storage drive, crowd, loose paper or readable text",
      "Medium console frame: the archivist presses one unlabeled physical play control. The same post-impact cracked orange radio sits beside the console, with its split right seam, original black melt scar and salt frost unchanged. She looks toward the investor off-screen and alone speaks; the three independent backup copies remain stored off-site and no storage drive appears",
      "Close reaction frame: the investor forces his public composure back into place and rebukes the archivist off-screen. Only the investor speaks; no crowd or evidence object enters the crop",
    ],
    shots: [
      "the investor lunges for one active public-address cable while the diver blocks the path and keeps the single sealed manifest sleeve protected against his chest. The investor never touches the sleeve; the diver maintains his hold, neither man opens it, and both men keep their mouths fully closed.",
      "the archivist presses one unlabeled play control and recorded tide sound fills the public loudspeakers; she faces the investor off-screen without wavering. The three independent backup copies remain off-site and no storage drives appear in frame. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 你拔一根线，我还有三份备份。</d>",
      "the investor restores a thin layer of public composure and attempts to reclaim the ceremony. Only he speaks and no crowd or evidence object enters the crop. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 这是拆迁仪式，不是你的修复室。</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Tracking Shot", characters: ["C03", "C02"], props: ["P03"], referenceProps: ["P03"], continuityRefs: ["storyboard-full-pack/E05-10/f2.png"], descriptionZh: "动作：高嵩冲向唯一一根现场音响线；程野侧身阻挡，并把装有同一张联单的封闭透明保护袋护在胸前。两人都闭口，此镜不出现电台或备份盘。" },
      1: { size: "medium", camera: "Static Shot", characters: ["C01"], props: ["P01"], referenceProps: ["P01"], continuityRefs: [], descriptionZh: "动作：许知遥按下无字实体播放键，潮声从现场音响涌出；她说：‘你拔一根线，我还有三份备份。’三份备份留在场外，不在画面中出现。" },
      2: { size: "close", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-02": {
    actions: [
      "Medium public-evidence frame: the diver keeps the transparent conservation sleeve closed and supported, holds it flat toward the off-screen attendees and traces one fingertip over the outside of the plastic along exactly six blurred ruled rows. The dark-purple chipped-corner seal remains visible but unreadable; he alone speaks, and the manifest is never removed from the sleeve",
      "Medium reaction frame: the investor stays in sharp focus and speaks while exactly two anonymous front-row adults, seen only from behind, lower two blank redevelopment boards and turn toward the sealed manifest at frame edge. No other spectator, readable board, phone screen or identifiable crowd face appears",
      "Close response frame: the archivist stands beside the public audio console and calmly invites everyone present to verify the evidence together rather than arguing with the investor. All attendees remain off-screen and only the archivist speaks",
    ],
    shots: [
      "the diver keeps the conservation sleeve closed and supported, turns it flat toward the off-screen attendees and moves one fingertip over the outside of the plastic along exactly six blurred ruled rows. The manifest never leaves the sleeve. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 六桶编号，都在这儿。</d>",
      "exactly two anonymous front-row adults, shown only from behind, lower two blank redevelopment boards and turn toward the sealed manifest while the investor raises his volume. No additional crowd face appears. The controlled middle-aged investor speaks in a polished but louder voice (S3): <d>[Chinese] 一张泡烂的纸，也配叫证据？</d>",
      "the archivist refuses to shout back and invites the attendees to verify the evidence together. Everyone else remains off-screen. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 所以请所有人一起核对。</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C02"], props: ["P03"], referenceProps: ["P03"], continuityRefs: ["storyboard-full-pack/E06-01/f1.png"], descriptionZh: "动作：程野保持透明保护袋封闭，把装有联单的保护袋平举给围观者看；手指隔着塑料沿六行模糊编号移动。程野说：‘六桶编号，都在这儿。’" },
      1: { size: "medium", camera: "Static Shot", characters: ["C03"], props: ["P03"], referenceProps: [], continuityRefs: [] },
      2: { size: "close", camera: "Static Shot", characters: ["C01"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-03": {
    actions: [
      "Medium two-shot beside the loudspeaker rig: the archivist and diver listen with both mouths completely closed while a moisture-alarm beep and the teenage witness's recorded date and time play only through the speakers. Exactly two present-day adults appear; no teenager, reenactment, timestamp display or readable interface",
      "Close two-shot: the same two adults remain still and silent with mouths fully closed while the teenage recording states that he was outside the warehouse. No witness body, portrait, reflection or reenactment appears",
      "Medium reaction frame: the investor takes one step backward, turns toward the idle demolition machines at the edge of the forecourt, then alone shouts for the recording to be stopped. No machine has powered down yet",
    ],
    shots: [
      "the archivist and diver stand beside the loudspeaker rig with both mouths completely closed as the moisture alarm and the teenage witness's date-and-time report play publicly. The date and time are heard only and never shown as generated text. The teenage male witness says only in the old off-screen recording (S5): <d>[Chinese] 七月十九日，一点四十七分。</d> No teenage witness appears.",
      "the same two adults remain silent with mouths fully closed while the breathless teenage recording states his location outside the warehouse. No witness body, portrait, reflection or reenactment appears. The teenage male witness says only in the off-screen recording (S5): <d>[Chinese] 我还在货仓外。</d>",
      "the investor takes one step backward, turns toward the still-idling demolition machines and loses public control for the first time. No machine powers down yet. The controlled middle-aged investor alone shouts in a tightened voice (S3): <d>[Chinese] 关掉！</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C01", "C02"], props: [], referenceProps: [], continuityRefs: [] },
      1: { size: "close", camera: "Static Shot", characters: ["C01", "C02"], props: [], referenceProps: [], continuityRefs: [] },
      2: { size: "medium", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-04": {
    actions: [
      "Medium console frame: the archivist raises one unlabeled physical volume fader beside the same cracked orange radio and looks toward the investor off-screen. She alone speaks; the device shows no readable timestamp, waveform label or digits",
      "Close reaction frame: the investor listens with his mouth completely closed as engine-start noise and the teenage witness's recorded allegation come only through the loudspeakers. This is an allegation awaiting verification, not an on-screen finding; his eyes harden, one hand grips the lectern and the witness never appears",
      "Close confrontation frame: the investor points sharply at the loudspeaker and dismisses the teenage witness as lying. Only the investor speaks; no witness body, portrait or reenactment appears",
    ],
    shots: [
      "the archivist raises one unlabeled physical fader beside the same cracked orange radio and states that the timestamp, not the noise, is what frightens him. No timestamp, label or digits appear. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 你怕的不是噪声，是时间。</d>",
      "the investor listens as engine-start noise rises and the teenage recorded allegation plays only through the loudspeakers. This recorded witness allegation awaits verification and is not an on-screen finding. The visible investor's mouth remains completely closed. The teenage male witness says in a rapid off-screen recorded voice (S5): <d>[Chinese] 高嵩拿了备用钥匙，亲自开船。</d> The witness is not visible.",
      "the investor points at the loudspeaker and abandons restraint to attack the recorded witness. Only he speaks and the teenage witness never appears. The controlled middle-aged investor speaks sharply in a raised polished voice (S3): <d>[Chinese] 那是个孩子胡说！</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C01"], props: ["P01"], referenceProps: ["P01"], continuityRefs: [] },
      1: { size: "close", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
      2: { size: "close", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-05": {
    actions: [
      "Medium evidence-camera frame: the diver holds the same closed transparent sleeve flat before the event camera and moves one fingertip down exactly six blurred ruled rows through the plastic. The single manifest stays supported and sealed; he alone speaks, with no readable writing or duplicated paper",
      "Close evidence-comparison frame: the archivist indicates the same six continuous blurred rows and the same dark-purple square seal with one chipped corner and a short leftward bleed, all seen through the closed sleeve. She alone speaks; the seal's authenticity remains subject to examination, with no dark-red seal, readable numbers, second sheet or loose paper",
      "Medium confrontation frame: the investor speaks in sharp focus and gestures toward exactly one grey-yellow responsibility statement lying separately on neutral support beside the sealed manifest. Exactly two anonymous spectators are seen from behind, each holding one phone toward the evidence; no readable screen, crowd face, duplicate document or extra phone",
    ],
    shots: [
      "the diver holds the same closed transparent sleeve flat before the event camera and moves one fingertip down exactly six blurred ruled rows through the plastic. The manifest stays sealed and supported. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 六桶，不是两桶。</d>",
      "the archivist indicates the six continuous blurred rows and the dark-purple square seal with one chipped corner and a short leftward bleed through the closed sleeve. The mark is consistent with the private seal, but authenticity remains pending examination. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 编号连续，私章也在。</d>",
      "exactly two anonymous spectators seen only from behind hold one phone each toward the evidence while the investor falls back on the still-operative responsibility statement as his argument. The statement has not yet been invalidated or authenticated. The controlled middle-aged investor speaks in a measured but tightening voice (S3): <d>[Chinese] 责任书还在，许德海洗不干净。</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C02"], props: ["P03"], referenceProps: ["P03"], continuityRefs: ["storyboard-full-pack/E06-02/f1.png"], descriptionZh: "动作：程野把装有同一张联单的封闭透明保护袋平举到现场摄像设备前，隔袋指过六行模糊结构；他说：‘六桶，不是两桶。’" },
      1: { size: "close", camera: "Static Shot", characters: ["C01"], props: ["P03"], referenceProps: [], continuityRefs: [] },
      2: { size: "medium", camera: "Static Shot", characters: ["C03"], props: ["P03", "P05"], referenceProps: ["P05"], continuityRefs: [] },
    },
  },
  "E06-06": {
    actions: [
      "Medium evidence-table frame: the archivist stands beside the exact single grey-yellow responsibility statement resting flat on neutral conservation support, with two rusted upper-left holes, fixed fold lines and one blurred lower-right signature area. She alone states that it will enter formal examination; she does not declare it void, forged or exculpatory",
      "Medium two-man action frame: the investor reaches toward the single sealed manifest sleeve without making contact; the diver pulls it firmly back against his chest and alone speaks while holding the investor's gaze. The investor's mouth stays closed; exactly two men, one sleeve and natural non-overlapping hands, with no tearing, loose paper or duplicate evidence",
      "Close phone-reaction frame: the investor answers his own plain unbranded phone, a different device from Cheng Ye's cracked P06, and listens with his mouth completely closed. The screen stays turned away. An urgent project-manager operational instruction, not a police, court or judicial ruling, orders demolition paused and on-site materials preserved",
    ],
    shots: [
      "the archivist stands beside the same responsibility statement on neutral support and accepts that it must enter formal examination; no legal conclusion has yet been reached. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 责任书也会进鉴定。</d>",
      "the investor reaches toward the single sealed manifest sleeve without making contact and the diver pulls it firmly back against his chest. The investor's mouth stays closed. The broad-shouldered male diver alone speaks in a rough low baritone (S2): <d>[Chinese] 这一次，谁也扔不回水里。</d>",
      "the investor answers his own plain unbranded phone, not Cheng Ye's cracked P06, and listens with his mouth completely closed while an urgent project-manager voice says only through the speaker: <d>[Chinese] 现场拆迁暂停，所有材料原地封存。</d> This is a project-manager operational instruction only, not a verdict or exoneration.",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C01"], props: ["P05"], referenceProps: ["P05"], continuityRefs: ["storyboard-full-pack/E06-05/f3.png"] },
      1: { size: "medium", camera: "Static Shot", characters: ["C02", "C03"], props: ["P03"], referenceProps: [], continuityRefs: ["storyboard-full-pack/E06-05/f1.png"] },
      2: { size: "close", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-07": {
    actions: [
      "Medium evidence frame: the diver sets the exact P06 graphite-black cracked smartphone beside the same sealed manifest sleeve. Its screen shows only one dim cyan waveform, no icons, text, digits, portrait or timecode. He says his line first; after his mouth closes, the fragmented recording resumes through the phone. No orange radio or storage drive appears",
      "Close reaction frame: the investor tries to define the fragmented recording as worthless before anyone else can interpret it. Only the investor speaks; P06 and the sealed manifest remain off-screen",
      "Medium shutdown frame: the demolition machines power down one after another behind the investor. He grips his own ordinary phone, not P06, and alone says that a pause is not an exoneration; no case result, arrest or official insignia appears",
    ],
    shots: [
      "the diver sets the exact damaged P06 recording phone beside the sealed manifest sleeve. Its screen contains only one dim cyan waveform. The broad-shouldered male diver first speaks in a rough low baritone (S2): <d>[Chinese] 还有你的原话，一份不少。</d> After he closes his mouth, the broken off-screen recording resumes; the investor never appears in this shot.",
      "the investor rushes to define the broken recording as meaningless before the public can interpret it. P06 and the manifest remain off-screen. The controlled middle-aged investor speaks in a tightening polished voice (S3): <d>[Chinese] 断断续续的东西，证明不了什么。</d>",
      "the demolition machines power down one after another and the forecourt becomes quiet; the investor grips his own ordinary phone, not P06, and narrows the significance of the order. No legal result, arrest or official insignia appears. The controlled middle-aged investor speaks with visible strain (S3): <d>[Chinese] 暂停不等于翻案。</d>",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C02"], props: ["P03", "P06"], referenceProps: ["P06"], continuityRefs: ["storyboard-full-pack/E06-06/f2.png"], descriptionZh: "动作：程野把同一部裂屏残录手机放到封闭联单保护袋旁，说：‘还有你的原话，一份不少。’他说完闭口后，手机残录才继续播放。" },
      1: { size: "close", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
      2: { size: "medium", camera: "Static Shot", characters: ["C03"], props: [], referenceProps: [], continuityRefs: [] },
    },
  },
  "E06-08": {
    actions: [
      "Medium evidence-table frame: the archivist places the same post-impact cracked orange radio beside the same sealed manifest sleeve. The radio's split right seam, broken aligned storage-board fragments, black melt scar and salt frost remain unchanged. She alone commits the items to open verification; P05 and P06 remain secured outside the crop, while all three P07 drives remain secured off-site and do not appear",
      "Medium silent two-shot: the archivist and diver listen with both mouths completely closed while a procedural intake notice is heard only from an off-screen phone speaker. Exactly two adults appear; no phone, official person, logo, case number or readable interface is generated",
      "Close controlled-handoff frame: the diver transfers the single closed manifest sleeve with both hands to exactly one pair of neutral-gloved receiving hands; the technician's face and body stay outside the crop. No seal is opened and no readable label, receipt or case number is generated",
    ],
    shots: [
      "the archivist places the same post-impact cracked orange radio beside the same sealed manifest sleeve and commits every item to open verification. P05 and P06 remain secured outside the crop; all three P07 drives remain secured off-site and do not appear. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 对。接下来每一项，都公开核验。</d>",
      "the archivist and diver listen with both mouths completely closed while a procedural notice says only through an off-screen phone speaker: <d>[Chinese] 七一九事故材料已受理，启动复查。</d> This is intake status only, not a verdict, finding of guilt or exoneration; no phone, official person or case number is shown.",
      "the diver transfers the single closed manifest sleeve with both hands to one pair of neutral-gloved receiving hands, beginning a controlled, documented handoff. Any receipt and identifier will be added only in post-production; the receiving technician's face and body stay outside the crop.",
    ],
    metadata: {
      0: { size: "medium", camera: "Push In", characters: ["C01"], props: ["P01", "P03"], referenceProps: ["P01"], continuityRefs: ["storyboard-full-pack/E06-07/f1.png"] },
      1: { size: "medium", camera: "Static Shot", characters: ["C01", "C02"], props: [], referenceProps: [], continuityRefs: [] },
      2: { size: "close", camera: "Static Shot", characters: ["C02"], props: ["P03"], referenceProps: [], continuityRefs: [], descriptionZh: "动作：程野双手把封闭的联单保护袋交给一双戴中性手套的接收人员之手，开始受控登记交接；接收人员的脸和身体不入画。", postProductionZh: "在交接动作稳定后，后期可补一张虚构的无机构标识接收回执；不得在生图或 H3 阶段生成可读编号，也不得声称证据链已经完成法律认证。" },
    },
  },
  "E06-09": {
    actions: [
      "Wide low-tide dusk frame: the archivist secures the same cracked orange radio inside a transparent, publicly visible archival cradle integrated into the weathered life-ring display; this is an open archival display compartment, not a hidden cache. The diver stands exactly two stone steps above, looks toward the silent worksite and alone speaks while the archivist keeps her mouth closed. Exactly two people, no crowd and no cosmetic repair",
      "Close archival frame: the archivist straightens the transparent support around the exact cracked radio and applies one small blank archive label. She speaks both short lines in sequence; no readable label, case number, seal, repainting or second radio",
    ],
    shots: [
      "at low-tide dusk, the archivist secures the cracked orange radio inside a publicly visible transparent archival cradle integrated into the life-ring display; this is not a hidden cache and she does not open or alter the cracked shell. The diver stands exactly two steps above and looks toward the silent worksite. The archivist keeps her mouth closed while the broad-shouldered male diver alone speaks in a rough low baritone (S2): <d>[Chinese] 至少今天，他们停了。</d>",
      "the archivist straightens the transparent support around the exact cracked radio and applies one new blank archive label. No readable label, case number, repainting or second radio appears. The slim female audio archivist speaks both lines in a clear, steady voice (S1): <d>[Chinese] 不是为了赢。</d> She continues in the same voice (S1): <d>[Chinese] 是让每一件证据，都能被核验。</d>",
    ],
    metadata: {
      0: { size: "wide", camera: "Push In", characters: ["C01", "C02"], props: ["P01"], referenceProps: ["P01"], continuityRefs: ["storyboard-full-pack/E06-08/f1.png"], descriptionZh: "动作：黄昏时，许知遥把同一台摔裂电台固定进救生圈档案夹层的公开透明支架；这不是隐藏藏匿。程野站在两级石阶上说：‘至少今天，他们停了。’" },
      1: { size: "close", camera: "Static Shot", characters: ["C01"], props: ["P01"], referenceProps: ["P01"], continuityRefs: [], descriptionZh: "许知遥整理电台的透明归档支架并贴上空白标签，说：‘不是为了赢。是让每一件证据，都能被核验。’标签文字后期处理，生图不生成可读内容。" },
    },
  },
  "E06-10": {
    actions: [
      "Wide static closing frame: the secured archival cradle with the unrepainted cracked radio remains in the foreground while the archivist withdraws her hands. Beyond it, the receding tide exposes exactly the lowest two stone steps and two distinct waterlines. No evidence is opened, altered, duplicated or removed",
      "Close static frame: the archivist's separate slim personal phone, explicitly not Cheng Ye's cracked P06, vibrates in her hand. Its screen contains only a soft blank notification card with an intentionally blurred placeholder block and no logo, authority name, digits or readable text; her expression settles into quiet resolve",
    ],
    shots: [
      "the secured transparent archival cradle with the unrepainted cracked radio remains in the foreground while the archivist withdraws her hands. The receding tide exposes exactly the lowest two stone steps and two distinct waterlines; no evidence is opened, altered, duplicated or removed.",
      "her separate personal phone, explicitly not Cheng Ye's cracked P06, vibrates with a procedural review-intake notification. The generated screen remains deliberately unreadable; the fictional acceptance wording and identifier are added only in post-production. This notification confirms receipt for review, not a verdict, conviction or exoneration.",
    ],
    metadata: {
      0: { size: "wide", camera: "Static Shot", characters: ["C01"], props: ["P01"], referenceProps: ["P01"], continuityRefs: ["storyboard-full-pack/E06-09/f2.png"], descriptionZh: "动作：公开透明归档支架里的摔裂电台保持烧痕、未补漆；许知遥收回双手。潮水退下，最低两级石阶露出深浅两道水线。" },
      1: { size: "close", camera: "Static Shot", characters: ["C01"], props: [], referenceProps: [], continuityRefs: [], descriptionZh: "动作：许知遥自己的普通手机震动；生图只显示模糊空白通知卡。受理文案和虚构编号仅在后期叠加，不把任何具体文字交给生图或 H3 模型。", postProductionZh: "在手机屏幕四角跟踪后叠加 1.0～1.5 秒：第一行‘七一九旧案复查材料已受理’，第二行‘受理编号：FC-0719-01’。该编号为纯剧情虚构格式；不得使用机关徽标、真实单位名、法院或公安 UI，也不得出现‘立案成功’‘许德海无罪’‘高嵩有罪’或‘案件已翻案’。声音只用一次轻震与克制提示音。" },
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
      cut.sizeZh = frameSizeZh[cut.size] || cut.sizeZh || "电影镜头";
      cut.cameraZh = cameraZh[cut.camera] || cut.cameraZh || cut.camera;
      cut.charactersZh = (cut.characters || []).map((id) => characterZh[id] || id).join("、") || "无固定角色";
      cut.propsZh = (cut.props || []).map((id) => propZh[id] || id).join("、") || "无核心道具";
      const size = frameSize[cut.size] || "cinematic shot";
      cut.frame = `Cinematic live-action suspense film still, 16:9 ${size}, ${sceneStyle[segment.lightingZh]}. ${update.actions[index]}. Realistic skin, fabric, paper, metal and environmental texture, controlled continuity, no subtitles, no watermark, no border, no collage, no readable text.`;
      cutCount += 1;
    });
    const isDusk = segment.lightingZh === "退潮黄昏";
    const soundscape = isDusk ? (segment.id === "E06-10" ? sound.duskClosing : sound.dusk)
      : ["E06-01", "E06-02", "E06-03", "E06-04"].includes(segment.id) ? sound.ceremonyActive
      : ["E06-05", "E06-06"].includes(segment.id) ? sound.ceremonyPressure
      : segment.id === "E06-07" ? sound.ceremonyShutdown
      : sound.ceremonyIntake;
    segment.h3Prompt = makeH3(segment, update.shots, soundscape, isDusk ? music.dusk : music.ceremony);
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：公开举证动作、保护袋封闭状态、正式 P01/P03/P05/P06 资产、P07 场外状态、现场扩音/手机通知、录音人物、闭口要求、受控交接、法律边界、后期叠字和 S1–S5 声纹已与中文节拍核对。";
    reviewed += 1;
  }
}

if (reviewed !== Object.keys(updates).length) throw new Error(`仅找到 ${reviewed}/${Object.keys(updates).length} 个第六集段落`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第六集语义重写：${reviewed} 段、${cutCount} 个逐镜提示词、${reviewed} 份 H3 提示词，并修正人物/道具元数据`);
