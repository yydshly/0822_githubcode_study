#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

const warehouseSound = "Moisture alarms repeat through the cavernous warehouse, damp paper shifts, boots scrape wet concrete, the steel door groans, and distant demolition machinery vibrates through the walls.";
const pierSound = "Night river wind crosses the stone steps and old pier, wet shoes strike concrete, the damaged radio shell scrapes stone, and distant machinery idles beside the dark warehouse.";
const warehouseMusic = "Tight cello ostinato and muted metallic percussion sustain investigative tension.";
const pierMusic = "Low bowed cello and restrained percussion build toward an unresolved pulse.";

const updates = {
  "E04-02": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up in the single-lamp night warehouse. The controlled middle-aged investor in a charcoal coat extends one real-estate document as an offer while the scorched orange emergency radio remains visible beyond it on the wet evidence table. He speaks quietly with deliberate pauses, face composed and coercive, only the investor visible, harsh work lamp, cool grey-green shadows and oxidized orange accent, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up in the same single-lamp warehouse. The slim female audio archivist in a wet navy rain jacket stands squarely and stares at the investor off-screen without accepting the document; both hands remain away from the offered page and her expression shows analytical refusal. Only the archivist visible, cool grey-green shadows with one harsh warm lamp, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up at the warehouse doorway. The controlled middle-aged investor retracts the real-estate document with one hand and uses the other to pull the heavy steel door shut behind him, maintaining the same faint smile as the room becomes enclosed. Only the investor visible, natural hands, single harsh work lamp, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 5.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 10.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, single-lamp night warehouse. Following <Picture 1>, the controlled middle-aged investor extends one real-estate document toward the archivist off-screen while the scorched orange radio remains on the wet table beyond it. The camera slowly pushes toward the page and his coercively calm face. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 城里一套房，换电台和清单。今晚就签。</d>
[Shot 2] At 00:05.000, the camera cuts to <Picture 2>: the slim female audio archivist refuses to touch the offered document, holds the investor's gaze and identifies his urgency as proof that six barrels were deliberate. The camera remains static on her controlled refusal. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 你买得这么急，说明六桶不是笔误。</d>
[Shot 3] At 00:10.000, the camera cuts to <Picture 3>: the investor retracts the document and pulls the heavy steel door shut with his free hand, enclosing the confrontation without losing his smile. The camera holds his face, hand and closing door. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 多出来的溶剂，我没否认。</d>

overall_soundscape: ${warehouseSound}

non_diegetic_music: ${warehouseMusic}`,
  },
  "E04-03": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 close-up in the single-lamp night warehouse. The slim female audio archivist in a wet navy rain jacket immediately presses the investor off-screen to name who piloted the boat that night, chin lifted and eyes unblinking. Only the archivist visible, harsh side light, cool grey-green shadows, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the controlled middle-aged investor in a charcoal coat under the same single work lamp. He dismisses the identity of the pilot with a small indifferent shrug and a faint smile, eyeline toward the archivist off-screen. Only the investor visible, realistic mature skin and dark fabric, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up of the slim female audio archivist in the same warehouse. She states with compressed anger that her father was locked inside this building, shoulders still and eyes fixed on the investor off-screen. Only the archivist visible, cold grey-green light with a narrow warm edge, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 3.50-second mark of the target video; Picture 3 (from Shot 3) aligns with the 7.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, single-lamp night warehouse. Following <Picture 1>, the slim female audio archivist immediately presses the investor off-screen to identify who piloted the boat. The camera pushes slowly toward her unwavering face. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 那晚是谁开的船？</d>
[Shot 2] At 00:03.500, the camera cuts to <Picture 2>: the controlled middle-aged investor gives a small indifferent shrug and dismisses the pilot's identity as irrelevant after the lightning strike. The camera remains static on his faint smile. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 雷打下来，谁开都一样。</d>
[Shot 3] At 00:07.000, the camera cuts to <Picture 3>: the archivist keeps her body still and states that her father was locked inside the warehouse, compressing visible anger into the final words. The camera holds her close-up. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 我爸被锁在这儿。</d>

overall_soundscape: ${warehouseSound}

non_diegetic_music: ${warehouseMusic}`,
  },
  "E04-04": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 close-up beside the rusted warehouse steel door. The controlled middle-aged investor in a charcoal coat turns away and pats the corroded door twice with an open hand while claiming the dead father signed because he knew his son boarded the boat. His gesture treats the building as proof he controls, only the investor visible, single harsh work lamp, natural hand, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the slim female audio archivist in a wet navy rain jacket refusing the diversion. She asks why her brother was inside the warehouse, eyes locked toward the investor off-screen and body planted beside the wet evidence table. Only the archivist visible, cool grey-green single-lamp night lighting, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up of the controlled middle-aged investor beside the wet table. He gestures dismissively toward the scorched orange emergency radio while claiming the teenage witness stole it to imitate an adult distress call, contempt visible at the edge of his smile. Only the investor visible, exact box-shaped radio in lower foreground, no readable display or text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the controlled middle-aged investor under the single warehouse lamp. He deliberately slows his speech and leans a fraction toward the archivist off-screen while blaming the teenage witness for boarding the boat himself. Only the investor visible, faint smile gone colder, no radio or paper in foreground, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 5.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 8.00-second mark of the target video; Picture 4 (from Shot 4) aligns with the 11.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, single-lamp night warehouse. Following <Picture 1>, the controlled middle-aged investor turns and pats the rusted steel door with an open hand while imposing his conclusion on the dead father. The camera slowly pushes toward his hand and profile. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 他后来签了字，因为他知道许潮上了船。</d>
[Shot 2] At 00:05.000, the camera cuts to <Picture 2>: the slim female audio archivist refuses his diversion and asks why her brother was inside the warehouse. The camera holds her direct eyeline toward him off-screen. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 我哥为什么会在货仓？</d>
[Shot 3] At 00:08.000, the camera cuts to <Picture 3>: the investor gestures dismissively toward the scorched orange radio on the wet table and describes the teenage witness with open contempt. The camera remains static on his face and the radio below. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 他偷了电台，想学大人报险。</d>
[Shot 4] At 00:11.500, the camera cuts to <Picture 4>: the investor leans a fraction toward the archivist off-screen and deliberately slows the accusation that the teenager put himself aboard. The camera pushes closer as his expression hardens. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 最后，他把自己送上了船。</d>

overall_soundscape: ${warehouseSound}

non_diegetic_music: ${warehouseMusic}`,
  },
  "E04-05": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up built across the closed warehouse door. Inside, the slim female audio archivist in a wet navy rain jacket speaks toward the investor off-screen; at the narrow door seam, the broad-shouldered male diver outside raises a plain smartphone at chest level and presses its microphone close to the gap to record. Both identities remain distinct, exactly two visible people, single harsh lamp and dark exterior spill, no readable phone interface or text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the controlled middle-aged investor under the single warehouse lamp. Politeness drops enough to expose the threat as he warns the archivist off-screen that continuing the investigation will cost her last home. Only the investor visible, eyes steady and smile nearly absent, no readable text.",
      "Cinematic live-action suspense film still, 16:9 medium tracking-shot moment at the warehouse steel door. The controlled middle-aged investor looks down, notices a moving shadow beneath the door seam, grabs the handle and yanks the door open in one sharp motion. Only the investor visible before the opening reveals anyone outside, natural hand and door movement, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.50-second mark of the target video; Picture 3 (from Shot 3) aligns with the 9.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, single-lamp night warehouse. Following <Picture 1>, the slim female audio archivist speaks from inside while the broad-shouldered male diver remains outside the closed steel door and holds a smartphone microphone close to the narrow seam at chest height. The camera stays static across the door boundary, keeping her accusation and his covert recording readable. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 你连一个不能开口的孩子都要推过去。</d>
[Shot 2] At 00:04.500, the camera cuts to <Picture 2>: the controlled middle-aged investor faces the archivist off-screen, his polite surface thinning as he threatens her last remaining home. The camera holds his eyes and nearly vanished smile. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 我是在提醒你，查下去，你连最后的家也保不住。</d>
[Shot 3] At 00:09.500, the camera cuts to <Picture 3>: the investor notices a moving shadow beneath the door seam, grabs the steel handle and yanks the door open in one abrupt motion. The camera tracks the handle and swinging door without revealing a new person before the cut.

overall_soundscape: ${warehouseSound} A phone microphone brushes the door seam before the latch snaps open.

non_diegetic_music: ${warehouseMusic}`,
  },
  "E04-06": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 wide two-person action frame just outside the newly opened warehouse door. The broad-shouldered male diver has stepped back two paces but still holds a plain smartphone upright at his chest; the controlled middle-aged investor stands in the doorway with his smile gone and asks what was recorded. Show both men and the full distance between them so the retreat is physically readable, cold night spill against the single warm warehouse lamp, no readable phone screen or text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the broad-shouldered male diver outside the warehouse. He gives one short answer while lowering his center of gravity to turn and run, smartphone still secure against his chest, eyeline briefly returning to the investor off-screen. Only the diver visible, rough wet workwear, no readable phone interface or text.",
      "Cinematic live-action suspense film still, 16:9 medium tracking shot across the wet yard. The broad-shouldered male diver turns and sprints toward the old ferry waiting hall with the smartphone held securely while the controlled middle-aged investor immediately pursues from behind. Exactly two men visible, natural running anatomy, warehouse doorway receding, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 3.50-second mark of the target video; Picture 3 (from Shot 3) aligns with the 6.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, night exterior at the warehouse door. Following <Picture 1>, the broad-shouldered male diver steps back two paces but keeps the smartphone upright at his chest as the controlled middle-aged investor fills the doorway with his smile gone. The camera remains static between them. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 录到了什么？</d>
[Shot 2] At 00:03.500, the camera cuts to <Picture 2>: the diver gives one clipped reply while shifting his weight to turn, keeping the phone secure. The camera holds his face and compact preparation to run. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 够你解释很久。</d>
[Shot 3] At 00:06.500, the camera cuts to <Picture 3>: the diver turns and sprints across the wet yard toward the waiting hall; the investor immediately runs after him from the warehouse doorway. The tracking camera follows both men without changing their screen direction.

overall_soundscape: The steel door bangs open, wet shoes scrape and accelerate across concrete, the phone shifts against fabric, and the warehouse alarm recedes behind them.

non_diegetic_music: Fast muted percussion joins the tight cello pulse without resolving it.`,
  },
  "E04-07": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up action moment on wet stone steps at night. The broad-shouldered male diver runs down the steps while the slim female audio archivist follows holding the scorched orange radio; the controlled middle-aged investor turns sharply, snatches the box-shaped radio from her and drives it toward the stone. Exactly three distinct people visible with natural anatomy, radio frozen just before impact, cool river night with oxidized orange focal point, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up on the wet steps. The orange radio shell has cracked open and one small storage board slides from the seam; the controlled middle-aged investor stands above it breathing slightly harder and forces a smile while asking what remains. Only the investor visible, broken radio and board clear at his feet, natural fragments, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up on the stone steps. The slim female audio archivist crouches and carefully gathers the cracked orange radio shell and loose storage board, looking upward with absolute calm as she states that three backups exist. Only the archivist visible, natural hands, exact damaged radio parts, no readable text.",
      "Cinematic live-action suspense film still, 16:9 tense two-person close-up on the wet steps. The controlled middle-aged investor has stopped higher on the stairs while the slim female audio archivist below fits the broken storage board back inside the cracked radio shell and explains her archival method without looking away. Exactly two people visible, natural hands and radio geometry, cold night river light with oxidized orange accent, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 3.50-second mark of the target video; Picture 3 (from Shot 3) aligns with the 7.00-second mark of the target video; Picture 4 (from Shot 4) aligns with the 10.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, wet stone steps beside the old pier at night. Following <Picture 1>, the broad-shouldered male diver runs down the steps and the archivist follows with the scorched orange radio; the controlled middle-aged investor turns, snatches the radio from her and slams it onto the stone. The tracking camera holds all three people and the radio through one continuous action.
[Shot 2] At 00:03.500, the camera cuts to <Picture 2>: the cracked orange shell lies on the step as one storage board slides from its seam. The investor stands above it, breath slightly uneven, and forces his smile back. The camera remains static on his face and the broken device below. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 现在，你还剩什么？</d>
[Shot 3] At 00:07.000, the camera cuts to <Picture 3>: the slim female audio archivist crouches, gathers the cracked shell and loose board with controlled hands, and answers without hesitation. The camera holds her calm face and the recovered parts. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 三份备份。</d>
[Shot 4] At 00:10.500, the camera cuts to <Picture 4>: the investor stops higher on the steps while the archivist fits the loose storage board back inside the broken shell below him. The camera slowly pushes toward her hands and unwavering face. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 档案修复，从来不在原介质上做。</d>

overall_soundscape: ${pierSound}

non_diegetic_music: ${pierMusic}`,
  },
  "E04-08": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 close-up on the wet pier steps at night. The broad-shouldered male diver steps firmly beside the crouching slim female audio archivist and faces the investor off-screen, explaining that the destroyed radio was only the copy they allowed him to see. Both investigators visible, her cracked orange radio held low, natural posture, cold river light, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the controlled middle-aged investor on the pier. He turns and points toward the dark warehouse behind him while announcing demolition at nine the next morning, no longer disguising the threat. Only the investor visible, dark warehouse silhouette aligned with his pointing hand, natural anatomy, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up of the controlled middle-aged investor. His eyes drop deliberately toward the smartphone held by the diver off-screen as he warns that none of the wet papers inside the warehouse will survive. Only the investor visible, face stripped of the earlier smile, cold night light, no paper in his hands, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 5.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 8.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, wet pier steps at night. Following <Picture 1>, the broad-shouldered male diver steps firmly beside the slim female audio archivist and faces the investor off-screen while she keeps the cracked orange radio low in her hands. The camera remains static on their united position. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 你毁掉的，只是我们愿意让你看见的那份。</d>
[Shot 2] At 00:05.000, the camera cuts to <Picture 2>: the controlled middle-aged investor turns and points toward the dark warehouse behind him, abandoning polite ambiguity as he announces the demolition time. The camera holds his pointing line and the warehouse silhouette. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 明早九点，拆迁启动。</d>
[Shot 3] At 00:08.500, the camera cuts to <Picture 3>: the investor's eyes lower toward the diver's smartphone just outside the frame as he warns that every wet paper inside will be destroyed. The camera pushes toward his unsmiling face. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 里面的湿纸，一张都留不住。</d>

overall_soundscape: ${pierSound}

non_diegetic_music: ${pierMusic}`,
  },
  "E04-09": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 close-up of the broad-shouldered male diver on the wet pier steps at night. He faces the investor off-screen and deliberately emphasizes the possibility of evidence underwater, making one restrained pointing gesture toward the dark river beyond the railing without entering the water. Only the diver visible, smartphone secure at his chest, natural hand, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up with strong depth along the night pier. The controlled middle-aged investor walks quickly away into the deep background while the slim female audio archivist in the foreground turns immediately toward the diver off-screen and asks how much was recorded. Exactly the investor and archivist visible, opposite screen directions clear, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up of the broad-shouldered male diver playing the damaged recording on a plain smartphone held at chest level. After a dense burst of noise, three separated voice clusters appear as abstract waveform shapes on the screen with no interface text; his mouth remains closed as he listens. Only the diver visible, no orange radio, natural hands, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up centered on the smartphone speaker and abstract broken waveform while the slim female audio archivist and broad-shouldered male diver listen behind it with both mouths fully closed. The controlled middle-aged investor is heard only through the distorted phone recording and is not visible. Exactly two visible people, no orange radio, no readable interface or text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 7.50-second mark of the target video; Picture 4 (from Shot 4) aligns with the 11.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, wet pier steps at night. Following <Picture 1>, the broad-shouldered male diver faces the investor off-screen and deliberately stresses the possibility of evidence underwater, indicating the dark river beyond the railing without entering it. The camera remains static on his restrained gesture and controlled provocation. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 你越急，水下那份东西越值得找。</d>
[Shot 2] At 00:04.000, the camera cuts to <Picture 2>: the investor walks quickly away along the pier in the deep background while the archivist immediately turns toward the diver off-screen in the foreground. The camera holds both screen directions. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 刚才录到了多少？</d>
[Shot 3] At 00:07.500, the camera cuts to <Picture 3>: the diver opens the damaged recording on his smartphone. A burst of noise passes and three separated abstract voice clusters appear without readable interface text. The camera tracks closer to the phone while his mouth remains closed.
[Shot 4] At 00:11.000, the camera cuts to <Picture 4>: the smartphone speaker emits three distorted fragments while the archivist and diver remain behind it with both mouths fully closed. The investor is not visible and exists only in the phone recording. The controlled middle-aged investor says only through a distorted off-screen phone recording in a measured low voice (S3): <d>[Chinese] 她的学籍……住处……让他签。</d>

overall_soundscape: ${pierSound} Phone noise breaks into three clipped voice fragments.

non_diegetic_music: ${pierMusic}`,
  },
};

const metadataFixes = {
  "E04-06": {
    0: { size: "wide", sizeZh: "全景" },
  },
  "E04-07": {
    1: { props: ["P01"] },
    3: { props: ["P01"] },
  },
  "E04-08": {
    0: { characters: ["C02", "C01"] },
  },
  "E04-09": {
    2: { props: [] },
    3: { characters: ["C01", "C02"], props: [] },
  },
};

let reviewed = 0;
let cutCount = 0;
for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    const update = updates[segment.id];
    if (!update) continue;
    if (segment.cuts.length !== update.frames.length) throw new Error(`${segment.id}: 镜头数量不匹配`);
    segment.cuts.forEach((cut, index) => {
      cut.frame = update.frames[index];
      Object.assign(cut, metadataFixes[segment.id]?.[index] || {});
      cutCount += 1;
    });
    segment.h3Prompt = update.h3;
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：逐镜动作、出镜人物、手机残录、画外声音、口型、道具状态、追逐方向和声纹标签已与中文节拍核对。";
    reviewed += 1;
  }
}

if (reviewed !== Object.keys(updates).length) throw new Error(`仅找到 ${reviewed}/${Object.keys(updates).length} 个第四集待审段落`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第四集语义重写：${reviewed} 段、${cutCount} 个逐镜提示词、${reviewed} 份 H3 提示词，并修正人物/道具元数据`);
