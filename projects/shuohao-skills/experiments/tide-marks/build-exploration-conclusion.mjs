#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const offline = path.join(root, "offline-production");
const storyboard = JSON.parse(fs.readFileSync(path.join(root, "storyboard", "潮痕-storyboard.json"), "utf8"));
const segments = storyboard.episodes.flatMap((episode) => episode.segments);
const cuts = segments.reduce((sum, segment) => sum + segment.cuts.length, 0);
const conclusion = {
  updatedAt: "2026-08-24",
  explorationStatus: "complete",
  productionAttemptStatus: "failed-narrative-gate",
  narrativeGatePassed: false,
  productionDecision: "stop-video-generation",
  libraryBoundary: "基于已有小说，把改编过程拆成大纲、角色、美术、剧本、分镜、校验和导出；不负责保证小说质量、因果逻辑或成片质量。",
  evidence: [
    "E01-01 结束于人物奔向门并准备开门，E01-02 却回到先前位置打开盒子，行动与空间状态发生回退。",
    "两个连续视频样本已经证明：格式校验、图片齐全和提示词齐全不能保证故事因果与动态衔接成立。",
    "问题发生在视频模型之前；继续扩大生成只会放大返工成本。",
  ],
  inventory: { episodes: storyboard.episodes.length, segments: segments.length, cuts, status: "实验资料，不是可投产资产" },
  nextFocus: ["小说原型质量", "全剧因果链", "小说到短剧的改编取舍", "人物与物体状态连续性", "低成本连贯性预演质量门"],
};

fs.writeFileSync(path.join(offline, "library-exploration-conclusion.json"), `${JSON.stringify(conclusion, null, 2)}\n`, "utf8");

const md = `# shuohao-skills 能力探索与《潮痕》失败复盘

## 最终结论

这是一次**库能力探索完成、短剧投产尝试失败**的实验。

shuohao-skills 的核心能力，是在**已经有小说**的前提下，把改编工作拆成大纲、角色、美术、剧本、分镜、校验和导出等结构化步骤。它擅长保证字段、ID、时长、引用和文件组织合法，但不负责判断：

- 小说原型是否值得改编；
- 人物欲望、冲突升级和结局是否成立；
- 小说拆成短剧以后，因果关系是否连续；
- 上一段结束状态是否必然导向下一段开始状态；
- 视频模型最终生成的动作是否可用。

## 本次尝试为何失败

E01-01 结束于人物奔向门并准备开门，E01-02 却回到先前位置打开盒子。这个问题不是简单的转场瑕疵，而是人物目标、位置和动作因果发生回退。

两个连续视频样本虽然不能证明 59 段逐段都失败，但已经足以证明当前生产流程缺少叙事前置质量门。继续生成剩余视频没有研究或生产性价比。

## 59 段和 193 张图片的正确口径

- ${segments.length} 段、${cuts} 镜表示结构化资料已经生成。
- 图片与提示词是实验资料和失败证据，不是正式投产资产。
- 原库 validate 通过表示规格合法，不表示故事成立。
- 后补的 11 项逻辑修复与 58 个边界审计属于问题暴露后的补救，不能反向证明故事原型已经合格。
- 当前叙事质量门未通过，视频生产应停止。

## 后续研究重心

1. 先建立小说原型评审：人物欲望、核心矛盾、关键选择、人物弧、伏笔与结局。
2. 再建立全剧因果图和人物/道具/空间状态时间线。
3. 把“小说拆分”升级为“短剧改编”：允许删线、合人、改序、补桥和重写场景。
4. 每段必须有进入原因、动作变化、结束结果和下一段继承条件。
5. 先用低成本文字走查、状态表或静态预演验证连续片段；通过后只生成 2～3 段视频做小样。
6. 小样连播通过，才重新扩大图片与视频生产。

## 阶段状态

- 库能力探索：完成。
- 本次短剧投产尝试：叙事前置质量门失败。
- 视频生成：停止，不继续扩大。
- 下一阶段：回到小说原型与小说拆分/改编能力研究。
`;
fs.writeFileSync(path.join(root, "LIBRARY-EXPLORATION-CONCLUSION.zh-CN.md"), `${md}\n`, "utf8");

const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>库能力探索与《潮痕》失败复盘</title><style>:root{color-scheme:dark;--bg:#090e14;--panel:#141a22;--line:#3b4655;--text:#f2f5f8;--muted:#aab3be;--red:#ff7d72;--amber:#f5bc65;--cyan:#5ddce5}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0,#402019,transparent 34rem),var(--bg);color:var(--text);font:16px/1.72 system-ui,"Microsoft YaHei",sans-serif}main{max-width:1080px;margin:auto;padding:42px 22px 80px}a{color:var(--cyan)}h1{font-size:clamp(32px,5vw,56px);line-height:1.12;margin:8px 0 16px}.hero,.box{border:1px solid var(--line);border-radius:17px;background:rgba(20,26,34,.94);padding:24px;margin:18px 0}.hero{border-left:6px solid var(--red)}.tag{color:var(--red);font-weight:800}.verdict{font-size:21px;color:#fff}.muted,p,li{color:var(--muted)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.grid .box{margin:0}.grid h3{margin-top:0}.bad{color:var(--red)}.good{color:var(--cyan)}ol li,ul li{margin:8px 0}.status{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.status div{background:#0e141b;border:1px solid var(--line);border-radius:10px;padding:13px}.status b{display:block;margin-top:4px}@media(max-width:760px){.grid,.status{grid-template-columns:1fr}}</style></head><body><main><a href="../index.html">← 返回主入口</a><section class="hero"><span class="tag">纠正后的最终结论</span><h1>库能力探索完成，短剧投产尝试失败</h1><p class="verdict">成功的是发现了 shuohao-skills 的边界；失败的是把“结构合法、资料齐全”误认为“故事成立、可以投产”。</p><div class="status"><div><small>库能力探索</small><b class="good">完成</b></div><div><small>叙事质量门</small><b class="bad">未通过</b></div><div><small>视频决策</small><b class="bad">停止扩大</b></div><div><small>59段/193镜</small><b>实验资料</b></div></div></section><section class="grid"><article class="box"><h3>库真正能做什么</h3><p>${conclusion.libraryBoundary}</p></article><article class="box"><h3>库不能替你保证什么</h3><p>小说好坏、人物动机、因果连续性、改编取舍、跨段动态状态和最终视频质量。</p></article></section><section class="box"><h2>失败证据</h2><ul>${conclusion.evidence.map((item) => `<li>${item}</li>`).join("")}</ul><p><b>所以不值得继续生成剩余视频。</b>当前图片和提示词应保留为研究样本，而不是继续消耗成本的投产包。</p></section><section class="box"><h2>研究重心前移</h2><ol><li>小说原型评审：人物欲望、冲突、选择、人物弧、伏笔和结局。</li><li>全剧因果图与状态时间线：人物位置、知识、目标、道具持有与物体开合。</li><li>小说到短剧的真正改编：删线、合人、改序、补桥和重写，而不是机械切段。</li><li>投产前低成本走查：先验证连续场景，再只生成 2～3 段视频小样。</li><li>小样连播通过以后，才恢复规模化图片和视频生产。</li></ol></section><p><a href="capability-evaluation.html">查看库能力归属</a> · <a href="foundational-capability-architecture.html">查看必须补齐的前置能力</a></p></main></body></html>`;
fs.writeFileSync(path.join(offline, "library-exploration-conclusion.html"), html, "utf8");
console.log("✓ 探索结论：库能力探索完成；叙事前置质量门失败；停止扩大视频生成");
