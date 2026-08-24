#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const storyboard = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

const updates = {
  "E03-01": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up inside the damp abandoned riverside warehouse. The controlled middle-aged male investor in a charcoal coat has just entered quickly and plants one hand firmly on a water-damaged freight document on the wet evidence table, blocking anyone from taking it. His manner is outwardly gentle but controlling and his hand does not release the paper. The old red fire cabinet remains softly visible, realistic cool grey-green and oxidized orange palette, natural hand anatomy, only the investor visible, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up at the same wet warehouse evidence table. The slim female audio archivist in a navy rain jacket and headphones decisively pulls the water-damaged freight document out from beneath an off-screen hand, drawing the paper toward herself while challenging the altered solvent quantity. Her face and gripping hand are clear, only the archivist visible, realistic cool grey-green and oxidized orange palette, natural hand anatomy, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up at the same wet warehouse evidence table. The broad-shouldered male diver in dark weathered workwear leans in and points firmly to a blurred reddish private-seal mark at the lower-right corner of the damaged freight document, his expression controlled but angry. His pointing finger, the paper corner and his face form a clear triangle, only the diver visible, realistic cool grey-green and oxidized orange palette, natural hand anatomy, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, damp warehouse under cool overcast light. Following <Picture 1>, the controlled middle-aged investor enters quickly and plants one hand firmly on the water-damaged freight list, preventing anyone from taking it. The camera slowly pushes toward his anchored hand and controlled expression. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 旧纸受潮，碰坏了没人负责。</d>
[Shot 2] At 00:04.000, the camera cuts to <Picture 2>: the slim female audio archivist pulls the list decisively out from beneath his hand and draws it toward herself. The camera remains static on her cool challenge and the moving paper. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 两桶改成六桶，谁负责？</d>
[Shot 3] At 00:08.000, the camera cuts to <Picture 3>: the broad-shouldered male diver leans toward the table and points to the blurred private seal at the lower-right corner of the list. The camera holds the pointing hand, seal and his restrained anger. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 这里是你的私章。</d>

overall_soundscape: Moisture alarms repeat through the cavernous warehouse, damp paper drags across the wet table, boots scrape concrete, and distant demolition machinery vibrates through the walls.

non_diegetic_music: Tight cello ostinato and muted metallic percussion sustain investigative tension.`,
  },
  "E03-02": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up in the damp warehouse. The controlled middle-aged male investor calmly smooths and straightens the wrinkled cuff of his charcoal coat after the struggle over evidence, keeping a faint patronizing smile while his eyes stay watchful. His fingers, cuff and wristwatch are prominent and his face remains clear, only the investor visible, realistic cool grey-green and oxidized orange palette, no document in his hands, no readable text.",
      "Cinematic live-action suspense film still, 16:9 extreme close-up at the wet warehouse evidence table. The slim female audio archivist deliberately sets the scorched orange emergency radio beside a separate mold-stained duty log while watching an off-screen investor's reaction. Her placing hand, the exact radio and the log dominate the lower frame while her observant face remains visible, only the archivist visible, realistic cool grey-green and oxidized orange palette, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up of the controlled middle-aged male investor after hearing the accusation. He retains the same faint smile but his eyes harden as he claims to be preserving her father's dignity, hands relaxed and cuff adjustment finished, eyeline toward the archivist off-screen. Only the investor visible, realistic cool grey-green and oxidized orange palette, no paper or radio in foreground, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, damp warehouse under cool overcast light. Following <Picture 1>, the controlled middle-aged investor calmly straightens the wrinkled cuff of his charcoal coat while preserving a faint patronizing smile. The camera slowly pushes toward his fingers, watch and composed face. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 十五年前的纸，能说明什么？</d>
[Shot 2] At 00:04.000, the camera cuts to <Picture 2>: the slim female audio archivist deliberately places the scorched orange emergency radio beside the separate mold-stained duty log and watches the investor off-screen for a reaction. The camera holds her hand, both objects and her analytical face. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 能说明你急着清掉这里。</d>
[Shot 3] At 00:08.000, the camera cuts to <Picture 3>: the controlled middle-aged investor keeps his faint smile while his eyes harden, defining the threat as protection of her father's dignity. The camera remains static on his face. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 我是在替你父亲留体面。</d>

overall_soundscape: Moisture alarms repeat through the cavernous warehouse, coat fabric shifts, the radio touches the wet table, and distant demolition machinery vibrates through the walls.

non_diegetic_music: Tight cello ostinato and muted metallic percussion sustain investigative tension.`,
  },
  "E03-03": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 tense two-person close-up across the wet warehouse evidence table. The controlled middle-aged male investor in a charcoal coat slides a water-damaged responsibility document toward the slim female audio archivist in a navy rain jacket and headphones with quiet oppressive confidence; she faces him without yielding and looks toward the approaching paper. Both faces remain distinct, natural hand and paper movement, realistic cool grey-green and oxidized orange palette, no readable text.",
      "Cinematic live-action suspense film still, 16:9 static close-up in the same warehouse position. The slim female audio archivist lifts the water-damaged responsibility document in both hands and checks it line by line with analytical certainty, eyes tracking a blurred timestamp area as she states that her father was not aboard at 1:47. Only the archivist visible, natural hands and paper grip, realistic cool grey-green and oxidized orange palette, no readable writing or numerals.",
      "Cinematic live-action suspense film still, 16:9 tight two-shot at the wet evidence table. The slim female audio archivist and broad-shouldered male diver listen defensively beside the scorched orange emergency radio while the investor speaks only from off-screen. Both visible mouths remain completely closed; her expression is steady and challenged while he watches the radio with restrained anger. Only the archivist and diver visible, realistic cool grey-green and oxidized orange palette, no floating waveform, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, damp warehouse under cool overcast light. Following <Picture 1>, the controlled middle-aged investor slides the water-damaged responsibility document across the wet table toward the slim female audio archivist, using the paper as quiet pressure while she refuses to yield. The camera slowly pushes along his moving hand toward both faces. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 签名是他的，责任也是他的。</d>
[Shot 2] At 00:04.000, the camera cuts to <Picture 2>: the slim female audio archivist lifts the document in both hands and checks the blurred timestamp area line by line. The camera remains static on her precise eye movement and natural paper grip. The slim female audio archivist speaks in a clear, cool, restrained voice (S1): <d>[Chinese] 一点四十七，他不在船上。</d>
[Shot 3] At 00:08.000, the camera cuts to <Picture 3>: the archivist and broad-shouldered male diver stand beside the scorched orange radio, both mouths completely closed as they hear the investor dismiss the repaired recording. The camera holds both reactions and the radio. The controlled middle-aged investor says only in an off-screen voiceover in a measured, polished low voice (S3): <d>[Chinese] 录音修出来什么，全凭你说。</d> The investor remains outside the frame.

overall_soundscape: Moisture alarms repeat through the cavernous warehouse, damp paper slides across the table, the radio emits a faint hiss, and distant demolition machinery vibrates through the walls.

non_diegetic_music: Tight cello ostinato and muted metallic percussion sustain investigative tension.`,
  },
  "E03-04": {
    frames: [
      "Cinematic live-action suspense film still, 16:9 extreme close-up at the wet warehouse evidence table. The broad-shouldered male diver in dark weathered workwear moves protectively in front of the scorched orange emergency radio, his shoulders and forearm forming a defensive barrier while the radio remains visible beside his guarding arm. His expression shows restrained anger and certainty, only the diver visible, realistic cool grey-green and oxidized orange palette, no floating waveform, no readable text.",
      "Cinematic live-action suspense film still, 16:9 medium shot inside the warehouse. As heavy demolition machinery starts outside, the controlled middle-aged male investor in a charcoal coat turns away from the confrontation and walks toward the open riverside doorway with controlled urgency. Distant dust, vibration and cold exterior light imply the machine outside; only the investor visible, realistic cool grey-green palette, no machinery inside, no readable text.",
      "Cinematic live-action suspense film still, 16:9 close-up from inside the warehouse. The controlled middle-aged male investor pauses at the open doorway and looks back over his shoulder with calm transactional pressure, composed almost polite face and clearly threatening eyes. The bright river doorway frames him and the old red fire cabinet remains soft behind, only the investor visible, realistic cool grey-green palette, no paper, radio or machinery, no readable text.",
    ],
    h3: `How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 2) aligns with the 4.00-second mark of the target video; Picture 3 (from Shot 3) aligns with the 7.50-second mark of the target video.

integrated_multimodal_description:
[Shot 1] Cinematic, live-action, damp warehouse under cool overcast light. Following <Picture 1>, the broad-shouldered male diver steps protectively in front of the scorched orange radio, using his shoulders and forearm to block access without touching it. The camera slowly pushes toward his guarding arm, the radio and his restrained anger. The broad-shouldered male diver speaks in a rough low baritone (S2): <d>[Chinese] 报警器不会替她撒谎。</d>
[Shot 2] At 00:04.000, the camera cuts to <Picture 2>: heavy demolition machinery starts outside and vibrates the wet floor. The controlled middle-aged investor turns away from the table and walks toward the open riverside doorway with deliberate urgency. The camera pans right with his movement; no machine enters the warehouse.
[Shot 3] At 00:07.500, the camera cuts to <Picture 3>: the investor pauses at the doorway and looks back over his shoulder, remaining almost polite while his eyes carry a direct threat. The camera holds his three-quarter profile. The controlled middle-aged investor speaks in a measured, polished low voice (S3): <d>[Chinese] 我给你们十分钟。</d> He continues in the same voice (S3): <d>[Chinese] 遗物交给我，旧事到此为止。</d>

overall_soundscape: Moisture alarms repeat through the cavernous warehouse, damp paper shifts, boots scrape concrete, and demolition machinery starts outside with a heavy low vibration.

non_diegetic_music: Tight cello ostinato and muted metallic percussion sustain investigative tension.`,
  },
};

let reviewed = 0;
for (const episode of storyboard.episodes) {
  for (const segment of episode.segments) {
    const update = updates[segment.id];
    if (!update) continue;
    if (segment.cuts.length !== update.frames.length) throw new Error(`${segment.id}: 镜头数量不匹配`);
    segment.cuts.forEach((cut, index) => { cut.frame = update.frames[index]; });
    segment.h3Prompt = update.h3;
    segment.semanticReviewed = true;
    segment.semanticReviewedAt = "2026-08-24";
    segment.note = "人工语义审核完成：提示词已按实际生成记录、图片 QC、中文节拍、人物/道具连续性、口型和声纹标签重写。";
    reviewed += 1;
  }
}

if (reviewed !== Object.keys(updates).length) throw new Error(`仅找到 ${reviewed}/${Object.keys(updates).length} 个第三集早段`);
fs.writeFileSync(storyboardPath, `${JSON.stringify(storyboard, null, 2)}\n`, "utf8");
console.log(`✓ 第三集早段语义重写：${reviewed} 段、${Object.values(updates).reduce((sum, item) => sum + item.frames.length, 0)} 个逐镜提示词、${reviewed} 份 H3 提示词`);
