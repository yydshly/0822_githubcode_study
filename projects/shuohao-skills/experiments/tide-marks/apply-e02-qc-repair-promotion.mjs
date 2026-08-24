#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const pack = path.join(root, "storyboard-full-pack");
const archiveRoot = path.join(pack, "rejected-originals", "2026-08-24");
const qcPath = path.join(root, "frame-qc-overrides.json");
const provenancePath = path.join(root, "frame-generation-provenance.json");

const selected = [
  ["E02-04", 1, "f1-qc-v3.png", "通过：删除港景与大窗，恢复统一修复室、官方电台和双人对话轴线"],
  ["E02-04", 2, "f2-qc-v2.png", "通过：握椅背动作、手表、官方电台和修复室背景连续"],
  ["E02-04", 3, "f3-qc-v2.png", "通过：程野供述近景、人物身份、波形屏和官方电台连续"],
  ["E02-05", 1, "f1-qc-v2.png", "通过：许知遥追问近景、统一修复室和官方电台连续"],
  ["E02-05", 2, "f2-qc-v2.png", "通过：程野松开椅背的动作、人物身份和官方电台连续"],
  ["E02-05", 3, "f3-qc-v3.png", "通过：双人转向父亲照片，修复室空间统一且只保留一台官方电台"],
  ["E02-05", 4, "f4-qc-v2.png", "通过：程野说出许叔时的视线、照片、波形屏和官方电台连续"],
  ["E02-05", 5, "f5-qc-v2.png", "通过：许知遥持统一叉形双齿钥匙到达门边，双人、修复室和官方电台连续"],
  ["E02-06", 1, "f1-qc-v9.png", "通过：宽景安全露出厚椭圆环和黑化长柄，不再出现错误侧齿；完整双叉由后续镜头建立"],
  ["E02-06", 2, "f2-qc-v2.png", "通过：钥匙正确插入银色新挂锁锁芯并无法转动，动作对象已修正"],
  ["E02-06", 3, "f3-qc-v3.png", "通过：官方厚椭圆环、黑化长柄和完整叉形双齿清楚，许知遥与仓门连续"],
  ["E02-07", 1, "f1-qc-v5.png", "通过：双人进入货仓，官方钥匙全轮廓与官方橙色电台同时可读"],
  ["E02-07", 2, "f2-qc-v2.png", "通过：官方斜栅电台与墙上琥珀报警器同镜连续"],
  ["E02-07", 3, "f3-qc-v3.png", "通过：程野反应近景与官方矩形电台连续，错误圆形大喇叭已移除"],
  ["E02-08", 1, "f1-qc-v2.png", "通过：许知遥持统一钥匙接近消防柜，程野和货仓轴线连续"],
  ["E02-08", 2, "f2-qc-v2.png", "通过：厚椭圆环和黑化轴正确，叉齿按物理关系进入锁芯，柜门开始弹开"],
  ["E02-08", 3, "f3-qc-v2.png", "通过：柜门打开、日志可见、许知遥反应和统一钥匙连续"],
  ["E02-08", 4, "f4-qc-v2.png", "通过：许知遥扶门持钥匙、程野取出霉变日志，双人和道具连续"],
  ["E02-09", 2, "f2-qc-v2.png", "通过：程野对照日志与官方斜栅电台，人物、手表和证据桌连续"],
  ["E02-09", 3, "f3-qc-v2.png", "通过：许知遥把日志置于官方电台旁，双人对峙与开柜背景连续"],
  ["E02-10", 1, "f1-qc-v2.png", "通过：程野蹲在开柜旁、许知遥站在证据桌边，日志与官方电台连续"],
];

const promptFile = (segment) =>
  `storyboard-full-pack/${segment}/actual-generation/qc-repair-candidates-2026-08-24.md`;
const archivedOriginal = (segment, frame) =>
  `storyboard-full-pack/rejected-originals/2026-08-24/${segment}-f${frame}.png`;

const segmentReferences = {
  "E02-04": [
    "art/images/许知遥临时声音修复室-阴天工作日-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/橙色应急电台-sheet.png",
    "storyboard-full-pack/E02-01/f3.png",
  ],
  "E02-05": [
    "art/images/许知遥临时声音修复室-阴天工作日-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/橙色应急电台-sheet.png",
    "art/images/黄铜船钥匙-sheet.png",
    "storyboard-full-pack/E02-01/f3.png",
  ],
  "E02-06": [
    "art/images/旧渡口货仓-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/黄铜船钥匙-sheet.png",
    "storyboard-full-pack/E02-06/f4.png",
  ],
  "E02-07": [
    "art/images/旧渡口货仓-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/黄铜船钥匙-sheet.png",
    "art/images/橙色应急电台-sheet.png",
    "storyboard-full-pack/E02-06/f4.png",
  ],
  "E02-08": [
    "art/images/旧渡口货仓-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/黄铜船钥匙-sheet.png",
  ],
  "E02-09": [
    "art/images/旧渡口货仓-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/橙色应急电台-sheet.png",
    "storyboard-full-pack/E02-09/f1.png",
  ],
  "E02-10": [
    "art/images/旧渡口货仓-sheet.png",
    "characters/images/许知遥-sheet.png",
    "characters/images/程野-sheet.png",
    "art/images/橙色应急电台-sheet.png",
    "storyboard-full-pack/E02-09/f3.png",
    "storyboard-full-pack/E02-10/f2.png",
    "storyboard-full-pack/E02-10/f3.png",
  ],
};

const repairedSegments = {
  "E02-04": {
    id: "E02-04",
    referenceBinding: "2026-08-24 参考图条件修复：许知遥、程野、统一修复室、官方电台与 E02-01 合格空间锚点；旧图已归档",
    default: {
      consistency: "通过：三镜已回到灰黑吸音板、金属工作台、小型铁丝玻璃窗与波形屏组成的统一修复室；官方橙色电台和双人身份连续",
      action: "保留修复后的 f1-f3；视频生成按双人追问、握椅背、程野供述的顺序使用",
    },
  },
  "E02-05": {
    id: "E02-05",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、统一修复室、官方电台、黄铜船钥匙与父亲照片；旧图已归档",
    default: {
      consistency: "通过：五镜均保持统一修复室、两位角色、波形屏和单一官方电台；人物追问到离开房间的动作链连续",
      action: "保留修复后的 f1-f5；f5 作为动作末端，视频从抓起钥匙迈步开始并以到达门边结束",
    },
    frames: {
      "3": {
        consistency: "通过：双人同时转向父亲照片，背景只保留一台官方橙色电台，空间锚点清楚",
        action: "保留修复后的 f3；照片只作为视觉证据，不生成可读文字",
      },
      "5": {
        consistency: "通过：钥匙为厚椭圆环、黑化长柄和叉形双齿；许知遥已到门边，程野紧随其后",
        action: "保留修复后的 f5；图生视频从抓钥匙迈步开始，以 f5 的到门边姿态结束",
      },
    },
  },
  "E02-06": {
    id: "E02-06",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、货仓、黄铜船钥匙、银色新挂锁与原合格 f4；旧图已归档",
    default: {
      consistency: "通过：f1 宽景安全建立厚椭圆环与黑化长柄，f2 正确插入银色新挂锁，f3 清楚展示完整叉形双齿，f4 原合格侧门动作连续",
      action: "保留修复后的 f1-f3 与原 f4；视频生成必须挂载钥匙参考表，并维持银色新挂锁为唯一尝试对象",
    },
    frames: {
      "1": {
        consistency: "通过：宽景只露出厚椭圆环和部分黑化长柄，错误普通侧齿不再可见；完整几何由 f2/f3 接续",
        action: "保留修复后的 f1 v9；视频阶段用 f2/f3 或钥匙表约束模型补画",
      },
      "2": {
        consistency: "通过：钥匙进入银色新挂锁正面锁芯而不是旧门栓孔，无法转动的动作关系正确",
        action: "保留修复后的 f2；银色挂锁与旧锈门栓必须保持为两个不同物体",
      },
      "3": {
        consistency: "通过：钥匙厚椭圆环、黑化长柄、盐白磨损与完整叉形双齿清楚",
        action: "保留修复后的 f3；作为后续钥匙几何的近景锚点",
      },
      "4": {
        consistency: "通过：程野身份、侧门位置、推门动作与仓库入口关系清楚",
        action: "保留原 f4；作为本段末帧和下一段空间参考",
      },
    },
  },
  "E02-07": {
    id: "E02-07",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、货仓、黄铜船钥匙、官方橙色电台与 E02-06/f4；旧图已归档",
    default: {
      consistency: "通过：三镜均使用官方斜栅矩形电台，错误圆形大喇叭已移除；f1 的钥匙全轮廓、双人身份和货仓轴线连续",
      action: "保留修复后的 f1-f3；视频生成保持电台外壳、天线与墙上琥珀报警器稳定，不自行变形",
    },
  },
  "E02-08": {
    id: "E02-08",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、旧渡口货仓与黄铜船钥匙；旧图已归档",
    default: {
      consistency: "通过：四镜中的钥匙已统一为厚椭圆环、黑化短轴与叉形双齿；接近消防柜、插锁开门、发现日志、取出日志的动作链完整",
      action: "保留修复后的 f1-f4；视频阶段严格按柜门关闭到打开的顺序，不提前出现日志",
    },
    frames: {
      "2": {
        consistency: "通过：叉形双齿进入锁芯后按物理关系不可见，厚椭圆环、手部和柜门弹开动作自然",
        action: "保留修复后的 f2；不要在视频中把已插入锁芯的齿部额外生成在外侧",
      },
      "4": {
        consistency: "通过：许知遥扶门持钥匙、程野取出霉变日志，人物与道具关系清楚",
        action: "保留修复后的 f4；视频运动保持钥匙尺度和日志封面稳定",
      },
    },
  },
  "E02-09": {
    id: "E02-09",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、货仓、官方橙色电台与原合格 f1；旧图已归档",
    default: {
      consistency: "通过：f1 原合格日志阅读镜头保留；f2/f3 已统一官方斜栅电台，日志、证据桌、人物和开柜背景连续",
      action: "保留原 f1 与修复后的 f2/f3；视频阶段保持电台天线、破损电池仓和日志静止稳定",
    },
    frames: {
      "1": {
        consistency: "通过：许知遥与程野身份、发霉值班日志和俯身阅读动作连续",
        action: "保留原 f1；作为人物、日志与台面连续参考",
      },
    },
  },
  "E02-10": {
    id: "E02-10",
    referenceBinding: "2026-08-24 参考图条件修复：两位角色、货仓、官方橙色电台、E02-09 修复帧与原合格 f2/f3；旧图已归档",
    default: {
      consistency: "通过：f1 的证据桌电台已恢复官方型号，双人、日志、开柜和消防软管卷盘连续；f2/f3 原合格镜头保留",
      action: "保留修复后的 f1 与原 f2/f3；视频阶段保持前景电台静止、天线不自行伸缩，柜内圆盘保持消防软管卷盘",
    },
    frames: {
      "2": {
        consistency: "通过：许知遥身份、闭口前状态与逼问构图符合分镜，画面未暴露错误核心道具",
        action: "保留原 f2；作为人物近景参考",
      },
      "3": {
        consistency: "通过：两人身份、仓库纵深、消防柜位置与望向黑暗的结尾构图连续",
        action: "保留原 f3；作为本集末帧和下一段空间参考",
      },
    },
  },
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

for (const [segment, frame, candidateName] of selected) {
  const canonical = path.join(pack, segment, `f${frame}.png`);
  const candidate = path.join(pack, segment, candidateName);
  const archived = path.join(archiveRoot, `${segment}-f${frame}.png`);
  const prompt = path.join(root, promptFile(segment));
  for (const required of [canonical, candidate, archived, prompt]) {
    if (!fs.existsSync(required)) throw new Error(`missing required repair artifact: ${required}`);
  }
  if (sha256(canonical) !== sha256(candidate)) {
    throw new Error(`canonical does not match selected candidate: ${segment}/f${frame}`);
  }
}

const qc = JSON.parse(fs.readFileSync(qcPath, "utf8"));
qc.reviewedAt = "2026-08-24";
qc.reviewScope = "E01-E02 历史关键帧逐张人工复核与参考图条件修复";
qc.segments = qc.segments.map((segment) => repairedSegments[segment.id] ?? segment);
fs.writeFileSync(qcPath, `${JSON.stringify(qc, null, 2)}\n`, "utf8");

const repairedKeys = new Set(selected.map(([segment, frame]) => `${segment}/${frame}`));
const provenance = JSON.parse(fs.readFileSync(provenancePath, "utf8")).filter(
  (entry) => !repairedKeys.has(`${entry.segment}/${entry.frame}`),
);

for (const [segment, frame, candidateName, qcText] of selected) {
  provenance.push({
    segment,
    frame,
    generatedAt: "2026-08-24",
    mode: "Codex 内置图像生成·多参考图条件编辑",
    references: [archivedOriginal(segment, frame), ...segmentReferences[segment]],
    promptFile: promptFile(segment),
    candidate: `storyboard-full-pack/${segment}/${candidateName}`,
    output: `storyboard-full-pack/${segment}/f${frame}.png`,
    archivedOriginal: archivedOriginal(segment, frame),
    qc: qcText,
  });
}

provenance.sort((a, b) => a.segment.localeCompare(b.segment) || a.frame - b.frame);
fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");

console.log(`QC segments updated: ${Object.keys(repairedSegments).length}`);
console.log(`provenance entries promoted: ${selected.length}`);
