#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const storyboardPath = path.join(root, "storyboard", "潮痕-storyboard.json");
const data = JSON.parse(fs.readFileSync(storyboardPath, "utf8"));

function getSegment(id) {
  for (const episode of data.episodes) {
    const segment = episode.segments.find((item) => item.id === id);
    if (segment) return segment;
  }
  throw new Error(`Missing storyboard segment: ${id}`);
}

function replaceOnce(value, from, to, label) {
  if (value.includes(to)) return value;
  if (!value.includes(from)) throw new Error(`Cannot apply ${label}: source text not found`);
  return value.replace(from, to);
}

function setLogicBridge(segment, value) {
  segment.logicBridgeZh = value;
  segment.semanticReviewed = true;
  segment.semanticReviewedAt = "2026-08-24";
}

{
  const segment = getSegment("E01-01");
  segment.cuts[0].frame = "Cinematic film still, medium shot of a slim East Asian woman in a dark rain jacket rushing through the abandoned ferry waiting hall while hugging a battered tin box freshly retrieved from the demolition inventory of her late father's sealed belongings, loose hair moving, cold overcast morning, chipped blue ticket window behind her, strong forward motion.";
  segment.cuts[0].descriptionZh = "动作：许知遥刚从拆迁清点处领回父亲封存多年的旧物箱，抱着铁皮箱快步冲进候船厅，箱里反复漏出少年喘息。";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "a slim young audio archivist rushes through the abandoned ferry waiting hall while hugging a tin box;",
    "a slim young audio archivist rushes through the abandoned ferry waiting hall while hugging a tin box freshly retrieved from the demolition inventory of her late father's sealed belongings;",
    "E01-01 box provenance",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "旧物箱来源：拆迁清点处刚交还的父亲封存遗物，不是无来源道具。段尾必须落在她已关门并转向长椅，供 E01-02 直接开箱。 ");
}

{
  const segment = getSegment("E01-04");
  segment.cuts[0].descriptionZh = "时间转场：当晚直到次日凌晨。动作：许知遥回到临时修复室，把电台放在灰绿修复台中央；她用软刷清掉电池仓里的盐霜。";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "integrated_multimodal_description:\n[Shot 1]",
    "integrated_multimodal_description:\nTime transition: the story advances from the previous overcast morning through that night into the following predawn hours; it never moves backward in time.\n[Shot 1]",
    "E01-04 time bridge",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "时间只向前：E01-03 的阴天上午之后，省略当日下午与夜晚，进入次日凌晨修复；剪辑时用暗窗与环境声完成转场。 ");
}

{
  const segment = getSegment("E02-01");
  segment.cuts[0].frame = "Cinematic film still, medium shot of a broad-shouldered East Asian male diver pushing into the overcast audio lab after receiving the archivist's overnight message about the 01:47 recording discrepancy, pressing the accident record he brought beside a rolling waveform while the slim East Asian female archivist turns from the console, two-person composition, damp workwear and cool daylight.";
  segment.cuts[0].descriptionZh = "动作：程野收到许知遥连夜发来的报时片段和时间疑点后，带着事故记录快步推门进来，把记录压到滚动的报时波形旁。";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "a broad-shouldered male diver pushes through the lab door and plants an accident record beside the rolling waveform",
    "after receiving the archivist's overnight message about the 01:47 discrepancy, a broad-shouldered male diver pushes through the lab door and plants the accident record he brought beside the rolling waveform",
    "E02-01 arrival motivation",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "程野不是偶然到场：他收到许知遥的连夜消息，带来能与 01:47 录音对照的事故记录。 ");
}

{
  const segment = getSegment("E03-01");
  segment.cuts[1].descriptionZh = "动作：许知遥把值班日志从他手下抽走，并与程野带来的事故记录并排。；许知遥：“一点二十仍值班，一点四十七仍报警。”（冷静核对两条时间）";
  segment.h3Prompt = segment.h3Prompt.replace("一点二十他还在值班，一点四十七报警还在。", "一点二十仍值班，一点四十七仍报警。");
  segment.h3Prompt = segment.h3Prompt.replace("一点二十还在值班，一点四十七仍有报警。", "一点二十仍值班，一点四十七仍报警。");
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "本段只能对比值班日志与事故记录；六桶清单和私章尚未被发现，必须到 E03-05 消防柜夹层开启后才首次出现。 ");
}

{
  const segment = getSegment("E04-01");
  segment.cuts[0].frame = replaceOnce(
    segment.cuts[0].frame,
    "tight two-person close-up at the open warehouse doorway under one harsh night work lamp:",
    "after the investigators return overnight to move the remaining wet evidence before the 09:00 demolition, with the diver staying just outside as a backup recorder, a tight two-person close-up at the open warehouse doorway under one harsh night work lamp:",
    "E04-01 return premise",
  );
  segment.cuts[0].descriptionZh = "因果转场：为抢在次日九点拆迁前复核并转移剩余湿纸，许知遥与程野连夜返回货仓；程野留在门外备份取证。动作：高嵩快步穿过门口，张开手臂拦住抱着电台离开的许知遥。；高嵩：“跑这么急，是怕我先找到那张清单？”（语气从容，像在谈一笔普通生意）";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "integrated_multimodal_description:\n[Shot 1]",
    "integrated_multimodal_description:\nCausal premise: Xu Zhiyao and Cheng Ye returned overnight to verify and move remaining wet evidence before the 09:00 demolition; Cheng Ye stays immediately outside the door as a backup recorder.\n[Shot 1]",
    "E04-01 return bridge",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "E03 修复室之后，两人因次日九点拆迁倒计时连夜返回货仓；程野主动留在门外做第二记录，因此后续门缝录音不是凭空出现。 ");
}

{
  const segment = getSegment("E05-01");
  segment.cuts[0].frame = replaceOnce(
    segment.cuts[0].frame,
    "Dynamic medium action frame: the broad-shouldered male diver runs down the wet concrete slope",
    "Dynamic medium action frame: guided by the place where he personally discarded half a boat plate fifteen years ago and by the direction of Xu Chao's recorded footsteps toward the pier, the broad-shouldered male diver runs down the wet concrete slope",
    "E05-01 search-location premise",
  );
  segment.cuts[0].descriptionZh = "动作：程野根据十五年前自己丢下半块船牌的位置，并结合许潮录音里奔向栈桥的脚步方向，沿防波堤快步跑下消波块，冲向退潮后露出的水线；他把安全绳扣在坡面的锈环上。";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "Following <Picture 1>, the broad-shouldered male diver runs down the wet slope",
    "Following <Picture 1>, guided by the place where he personally discarded half a boat plate fifteen years ago and the recorded direction of Xu Chao's footsteps toward the pier, the broad-shouldered male diver runs down the wet slope",
    "E05-01 location bridge",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "潜水点不是猜中：由程野当年的船牌抛弃位置与许潮录音脚步方向交叉定位，只锁定小范围低潮搜索区。 ");
}

{
  const segment = getSegment("E05-10");
  segment.cuts[0].descriptionZh = "动作：许知遥把修复录音复制到恰好三个无标签、彼此独立的存储盘，并把音频校验摘要、联单照片和复查申请通过预先确认的受理通道提交；原始联单仍在现场由程野装入唯一一个透明保护袋。此镜不生成可读界面，两人嘴唇完全闭合。";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "Following <Picture 1>, the archivist copies the repaired recording onto exactly three plain unlabeled storage drives while the diver slides",
    "Following <Picture 1>, the archivist copies the repaired recording onto exactly three plain unlabeled storage drives and completes a pre-arranged off-screen submission of the audio checksum summary, manifest photographs and review request, without showing any UI or readable text, while the diver slides",
    "E05-10 pre-submission",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "三份盘留在修复室，作为场外备份；现场拔线只能中断扩音，不能删除备份。出发前已在线提交摘要与复查申请，所以 E06 的受理通知与接收人员到场都有前因。 ");
}

{
  const segment = getSegment("E06-01");
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "integrated_multimodal_description:\n",
    "integrated_multimodal_description:\nContinuity premise: all three independent storage drives remain secured together at the restoration lab outside the demolition venue; disconnecting one loudspeaker cable can interrupt only the live playback, not erase the copies.\n",
    "E06-01 backup premise",
  );
  setLogicBridge(segment, "“三份备份”指修复室内三块独立介质；它们都不在拆迁现场。高嵩伸手拔的是现场扩音线，只能断直播声音，不能让证据消失。 ");
}

{
  const segment = getSegment("E06-06");
  segment.cuts[2].descriptionZh = "动作：围观者的现场视频传到项目方后，高嵩的手机连续震动；他低头接起项目主管的电话。；画外信息：“现场拆迁暂停，所有材料原地封存。”（项目方的即时风险控制指令，不是司法结论）";
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "the investor answers his own plain unbranded phone, not Cheng Ye's cracked P06, and listens with his mouth completely closed while an urgent project-manager voice says only through the speaker:",
    "after attendee phone videos have reached the project company, the investor answers his own plain unbranded phone, not Cheng Ye's cracked P06, and listens with his mouth completely closed while an urgent project-manager voice issues an immediate risk-control instruction only through the speaker:",
    "E06-06 project response",
  );
  segment.summaryZh = segment.cuts.map((cut) => cut.descriptionZh).filter(Boolean).join("；");
  setLogicBridge(segment, "项目暂停来自公开现场视频触发的内部风险控制，只暂停拆迁和封存材料；不等于司法定罪、翻案或证据认证。 ");
}

{
  const segment = getSegment("E06-08");
  segment.cuts[1].descriptionZh = "画外信息：“此前提交的七一九事故材料已受理，启动复查。”（电话扩音里的正式通知；仅表示进入复查流程，不代表结论）";
  segment.cuts[2].descriptionZh = "短暂时间跳切后，程野双手把封闭的联单保护袋交给按受理流程赶到现场的一双中性手套，开始受控登记交接；接收人员的脸和身体不入画。";
  segment.h3Prompt = segment.h3Prompt.replace("此前在线提交的七一九事故材料已受理，启动复查。", "此前提交的七一九事故材料已受理，启动复查。");
  segment.h3Prompt = replaceOnce(segment.h3Prompt, "七一九事故材料已受理，启动复查。", "此前提交的七一九事故材料已受理，启动复查。", "E06-08 intake notice");
  segment.h3Prompt = replaceOnce(
    segment.h3Prompt,
    "At 00:09.500, the camera cuts to <Picture 3>: the diver transfers",
    "At 00:09.500, after a brief explicit time ellipsis, the camera cuts to <Picture 3>: the diver transfers",
    "E06-08 handoff ellipsis",
  );
  segment.summaryZh = "许知遥：“对。接下来每一项，都公开核验。”（把同一台摔裂电台放到始终封闭的透明袋旁）；画外信息：“此前提交的七一九事故材料已受理，启动复查。”（仅表示程序受理，不代表结论）；短暂时间跳切后，程野双手把封闭的联单保护袋交给按受理流程赶到现场的一双中性手套，开始受控登记交接；接收人员的脸和身体不入画。";
  setLogicBridge(segment, "E05-10 已先提交摘要、照片和申请；本段电话是该提交的程序反馈。交接镜头前有明确时间跳切，接收人员不是几秒内凭空出现。 ");
}

fs.writeFileSync(storyboardPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
console.log("✓ 全剧因果桥已固化到分镜与 H3 提示词");
