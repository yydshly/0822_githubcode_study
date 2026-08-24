# 实验日志

## 2026-08-24：获取上游与设计横向场景

### 假设

1. Particles4All 的核心是统一粒子求解器，而不只是水面渲染效果。
2. 同一固定版本可以通过参数变化形成多个能力证据和应用场景，不需要复制或伪造新引擎。
3. “治水实验台”适合作为独立可选体验，不应直接替代史境阅读器的轻量画面层。

### 操作

- 将 `https://github.com/matsuoka-601/Particles4All.git` 获取到 `projects/particles4all/upstream/`。
- 固定提交：`f0ab7c2d1f1c690260b4529a7b4928da9ec4be8f`。
- 检查 `src/sim.js`、`src/wgsl.js`、`src/aniso_wgsl.js`、`src/ssfr.js`、`src/main.js` 和三个预设。
- 将目标路由为“研究子项目 + Physics Interaction 场景矩阵 + Production Hardening”。
- 设计九个共享引擎的参数化场景，并保留 WebGPU/设备性能回退说明。

### 结果与证据

- `Sim.step()` 明确执行 predict、grid count/scan/scatter、lambda、delta、body shape matching、velocity、XSPH、surface tension 和 finalize。
- `wgsl.js` 中的流体密度约束遍历动态粒子及静态边界粒子；刚体部分计算协方差并通过迭代极分解恢复旋转。
- `ssfr.js` 和相关 WGSL 生成深度、厚度、滤波和最终复合结果。
- 上游提供 particle、mesh、ray march 和 SSFR 四种显示路径。

### 判断

源码证据支持“统一模拟 + 独立渲染”结论。下一步需要浏览器运行、交互与视觉证据，才能判断不同场景的实际可用性和性能边界。

## 2026-08-24：硬件 WebGPU、交互与响应式验证

### 假设

- small 配置可以作为默认交互档。
- particle、mesh、SSFR 和场景参数切换不会破坏统一模拟状态。
- 100k 配置应该被展示为性能边界，而不是默认体验。

### 操作

- 在 `http://127.0.0.1:8107/demos/particles4all/` 启动静态服务。
- 用 Playwright 驱动 Chrome 151 的硬件加速会话。
- 自动切换统一耦合、浮沉、mesh、治水、100k 和 390px 粒子场景。
- 触发倒水与“收窄并加水”，检查 iframe 内 `__sim.n`、`__gpuError`、canvas 和 timing。
- 单独运行上游 `verify=1`。

### 结果与证据

- 九场景清单、父级状态和同源 iframe 控制正常。
- 倒水新增 6,370 粒子。
- particle、mesh、SSFR 都建立可见 canvas。
- `verify=1`：`scanMonotonic=true`、`scanTotal=8000`、`nonFinite=0`。
- 100k：sim 359.50ms、render 36.55ms，能运行但不实时。
- 390×844 修复后无页面级横向溢出。
- 最终自动回归 `failed=[]`，console errors 与 page errors 均为空。

### 判断

small 适合作为默认研究入口；100k 只适合作为显式压力测试。场景矩阵已证明同一引擎可横向覆盖物理、诊断、渲染和叙事用途，但“治水”仍是参数化容器实验，不等于真实河道或工程水利模拟。

## 2026-08-24：自动 A/B 与冻结代理

### 假设

- 比“并排两个实时 iframe”更重要的是同初态规则、同模拟时长、同输入预算和同采样点。
- 不改上游求解器，也可以在实验台外层读取一次冻结快照，建立足够诚实的相对代理。

### 操作

- 为五个使用场景定义自动 A/B profile、目标模拟时长、固定来水粒子预算和四个结果指标。
- 每个 variant 使用新 iframe，暂停、Reset、清空残余时间，应用唯一变量后运行并冻结。
- 通过 `livePos()`、`liveBody()`、`bodyPose` 和上游 stats 读取 P05/P95、扩散、刚体位移、实际边界与最大速度。
- 增加 A/B/Δ 结果、受控条件检查，以及手动交互后的“自由探索”失效标记。
- 浏览器回归覆盖浮具完整 A/B、清障双方精确注入 3,000 粒子、实际箱体边界、100K、移动结果和上游 verify。

### 结果与证据

- 浮具 A/B 流体输入一致，轻载中心 Y 高于重载；该断言只用于求解器内部趋势回归。
- 清障 A/B 各增加 3,000 个流体粒子，B 记录到非零刚体位移。
- 390×844 页面无横向溢出；移动结果按指标同时展示 A、B 和 Δ。
- 硬件 Chrome 最终回归 `failed=[]`、`consoleErrors=[]`、`pageErrors=[]`。

### 判断

实验台已经从“手动切换预设”升级为场景驱动的受控顺序比较。下一步价值最高的不是继续加故事，而是补引擎级整数 tick 桥接、GPU 区域归约探针和同 tick 关键帧；在开放出口与局部边界出现前，治水仍只保留为叙事代理。

## 2026-08-24：精确 solver steps 与区域差异

### 假设

- 不修改固定上游镜像，也可以通过当前 `Sim` 实例的临时 step 封顶，消除冻结终点的慢帧超调。
- 对场景差异而言，冻结时空间分布比混合刚/液的全局最大速度更有解释力。

### 操作

- 按上游 `stepDt=(1/60)/substeps` 计算目标，并临时包装当前 iframe 实例的 `sim.step()`；完成后删除包装。
- 对边界场景令 `timeScale=0`，在 solver step 0 前把整体 X 箱壁移动到目标，再开始实验。
- 增加“准备 → A 运行 → A 冻结 → B 运行 → B 冻结 → 完成”时间线和协议审计。
- 冻结快照按 `boxX/2` 划分来水侧/远侧，输出计数、占比、各区 P95 与差值。
- 浏览器回归从两组 A/B 扩展为五个场景的十个 variant。

### 结果与证据

- 五个场景目标/实际 solver steps 分别为 `180/180`、`144/144`、`162/162`、`144/144`、`144/144`。
- 成滴 A/B 各精确新增 900 粒子；清障和治水 A/B 各精确新增 3,000 粒子。
- 水箱 B 在 step 0 前达到 `boxX=1.08`，治水 B 达到 `boxX=1.54`。
- 所有区域均满足 `inletParticles + farParticles = fluidParticles`。
- 最终硬件回归 `failed=[]`、`consoleErrors=[]`、`pageErrors=[]`、`nonFinite=0`。

### 判断

当前协议已经能严格比较相同终点步数和固定输入，但仍不是完整的引擎级 tick director：边界是实验前预置，而不是在某一 60Hz tick 内渐变。下一阶段如果需要中间事件或时间序列，应明确建立本地 runtime fork，而不是继续从父页面拼接墙钟控制。

## 2026-08-24：研究主线纠偏与 Runtime Adapter Gate

### 决策

- Particles4All 成为唯一活动水体研究主线。
- Water Scene Lab 的 Ocean、River、Waterfall 和 Watershed 因未调用原库求解器，统一冻结为 `C0 Concept`。
- 成果分为 U0 原库、U1 受控证据、E1 原库扩展、S1 场景验证；没有原库运行证据的效果不进入主线。

### 实现

- 增加同源 `Particles4AllRuntimeAdapter`，直接使用固定上游暴露的 `__sim`、`__ui`、`__readBuf` 和 GPU queue。
- 提供 `connect / reset / step / sample / flush / dispose`，不重新实现 PBF 或刚体算法。
- 无 GPU 契约测试 14/14 通过。

### 硬件 WebGPU 结果

- 原页面路径与 Adapter 路径使用同一 query、Reset 和 24 solver ticks。
- 34/34 自动检查通过；总/流体/刚体粒子计数相同，`simTime` 相同，`nonFinite=0`。
- 刚体中心相同；流体质心和分位数差均在预先声明容差内。
- 页面非空、关键 UI、WebGPU canvas、控制台和 page error 检查通过。

### 判断

Stage 2 通过。Adapter 只扩展运行控制与证据接口，没有增加新物理。项目改为计划驱动：先完成 M3-WP1 受控注入、M3-WP2 tick 事件、M3-WP3 流体包生成和 M3-WP4 刚体事件，再进入 M5-S1 局部落水冲击。宏观水环境路线继续冻结。

## 2026-08-24：总体计划与 M3-WP1

### 计划重构

- 建立 G0 宏观目标、M0–M6 七个模块、17 个工作包和 G1–G6 六个 Gate。
- 建立 `program-state.json`，强制任意时刻只有一个活动模块、工作包和 Gate。
- 落水池从“下一任务”调整为 M5-S1 场景验证，依赖 M3 输入/事件/交互模块完成。
- 计划一致性测试 36/36 通过。

### M3-WP1 实现与结果

- Adapter 增加 `injectFluid({positions, velocities})`，直接调用原库 `Sim.appendFluid()`。
- 输入必须为等长、有限的 xyz 三元组；返回请求量、实际量、前后计数、容量和截断状态。
- 无 GPU 接口测试 24/24 通过，覆盖正常注入、容量截断、非法长度和 Reset。
- Intel Gen-12LP WebGPU 浏览器 Gate 28/28 通过；两次 Reset/注入/12 ticks 重放的计数、非有限值、质心和 P95 均满足要求。

### 状态迁移

M3-WP1 从 `active` 变为 `completed`；M3-WP2 整数 tick 事件队列成为唯一活动工作包，G3 继续保持 `active`。

## 2026-08-24：M3-WP2 整数 tick 事件队列

### 实现

- Adapter 增加 `runSchedule({ticks, events, reset})`，以整数 solver tick 调度 `injectFluid` 与 `sample`。
- 事件 id 唯一、tick 有界；同一 tick 按输入顺序执行，所有事件写入可审计历史。
- 调度器仅编排原库 `sim.step()`、`Sim.appendFluid()` 和冻结采样，不实现新求解器。

### 验证与状态迁移

- 单元测试 38/38 通过。
- Chrome 151 / Intel Gen-12LP WebGPU 浏览器 Gate 26/26 通过；两次 Reset 的 12 tick 事件序列、最终粒子数与质心聚合在容差内一致，非有限位置为 0。
- M3-WP2 从 `active` 变为 `completed`；M3-WP3 可序列化流体包生成器成为唯一活动工作包，G3 继续保持 `active`。

## 2026-08-24：M3-WP3 可序列化流体包生成器

### 实现与验证

- 新增 `createFluidBlock()`，用 origin、counts、spacing、velocity 的 JSON 配置生成 Float32 位置和速度数组。
- 限制输入为有限三维向量、正整数计数和正 spacing，并以 300,000 粒子作为上游容量上界。
- 单元测试 46/46、Chrome/Intel WebGPU 浏览器 Gate 27/27 通过；`3×2×2` 包无重复、计数精确、两次 Reset 后聚合结果稳定。

### 状态迁移

M3-WP3 从 `active` 变为 `completed`；M3-WP4 刚体初态与交互事件成为唯一活动工作包，G3 继续保持 `active`。

## 2026-08-24：M3-WP4 刚体初态与交互事件

### 实现与验证

- `describeBodies()` 从上游 `sim.bodies` 输出稳定身份、shape、密度、粒子数和初始中心。
- `sampleBodies()` 直接读回 GPU `bodyCentre/bodyRot`，避免依赖渲染循环中的异步缓存时机。
- `holdBody`、`releaseBody` 和 `sampleBodies` 进入整数 tick 调度器，继续调用原库接口。
- 单元测试 60/60、Chrome/Intel WebGPU 浏览器 Gate 41/41 通过；两次 24 tick 重放得到一致身份与容差内一致轨迹。

### 状态迁移

M3-WP4 与 G3 完成；M3 模块关闭。M5-S1 落水池局部冲击成为唯一活动工作包，G4 局部交互成为活动 Gate。

## 2026-08-24：M5-S1 落水池局部冲击

### 失败、收敛与结果

- 第一版 64 粒子 / 60 ticks / size 0.085 sphere 的水体差异不足且刚体已落到底部，未通过 Gate。
- 第二版扩大流体包到 384 粒子并缩短至 30 ticks，但小球仍只造成 6 个局部粒子差，继续拒绝通过。
- 最终只把上游原生 sphere size 调整为 0.15；PBF、重力、spacing、迭代、输入包与步数不变。
- 最终 Gate 28/28：局部冲击区差 116 个粒子，Y-P95 差 0.003075，B 两次刚体和水体末态均在容差内一致。

### 状态迁移

M5-S1 与 G4 完成。因为 M5-S2 闸门/喷流需要局部开口而上游只有整体封闭 box，M4-WP1 局部边界缺口审计成为唯一活动工作包，G5 成为活动 Gate。

## 2026-08-24：M4-WP1 局部边界缺口审计

### 证据与决策

- 源码确认边界是完整六面 shell；`boundary=0` 不关闭 WGSL clamp；`resizeBox()` 只做整体 shell 重建和全体粒子重映射。
- Chrome/Intel WebGPU 探针 20/20 通过：关闭边界样本后高速粒子仍停在 X 上限；缩箱后六面保持完整。
- 真实出口需要 aperture mask、条件 clamp、外部网格/回收和质量账本，不能靠删除局部 boundary 粒子伪造。
- M5-S2 不要求立即解决真实出流：先复用上游 box 刚体与 hold/release，验证封闭箱内闸门偏转。

### 状态迁移

M4-WP1 完成，M4 返回 conditional，M4-WP2 保持 pending。M5-S2 封闭箱内闸门与喷流成为唯一活动工作包，G5 继续 active。

## 2026-08-24：M5-S2 封闭箱内闸门与喷流

- 同一上游 box、280 粒子横向喷流、30 ticks；A box 位于流路外，B 位于流路内，tick 15 同步释放。
- Chrome/Intel WebGPU Gate 34/34：B 上游多 53 个粒子，横向宽度差 -0.056171；B 两次水体与刚体结果稳定。
- 没有增加局部边界 mask 或 WGSL 分支，证明 M3 Adapter 模块可复用于第二场景。
- M5-S2 与 G5 完成；M5-S3 容器倾倒/溢流可行性成为唯一活动工作包，G6 active。

## 2026-08-24：M5-S3 容器倾倒可行性停止决策

- GPU Gate 23/23：box/sphere 体积中心被刚体粒子占据；torus 是薄圆环，不是容器。
- 上游没有目标旋转、复合刚体、静态 collider 或任意初始 pose API。
- 真正 cup 需要新增 rest point cloud、场景语法、旋转驱动、渲染和质量 Gate，超过 Adapter 小扩展范围。
- M5-S3 以 STOP 完成，M4-WP2 保持 pending；M6-WP1 性能与兼容性矩阵成为唯一活动工作包。

## 2026-08-24：M6-WP1 性能与兼容性有界基线

- Chrome/Edge × Intel Gen-12LP 的 28K/100K/300K × particles/SSFR 六项均可运行，固定 tick 精确、`nonFinite=0`，无 console/page error。
- 独立 rAF 墙钟显示 28K 为 14.15–20.02 FPS 的 demonstrable 档；100K 约 2.05–2.95 FPS、300K 约 0.66–0.90 FPS，均为 not practical。
- 原页面慢帧仍显示约 20 FPS，因为 FPS 使用了被 50 ms 截断的模拟 `dt`；记录为低风险上游修复候选。
- Chrome/Edge 生命周期 Gate 均为 19/19：Reset、两次 120 ticks、计数和有限值通过；显式 GPU device disposal 缺失。
- RTX、Safari、Apple 未验证且不作外推。M6-WP1 以 bounded baseline 完成，M6-WP2 组件化与上游贡献评估成为唯一活动工作包。

## 2026-08-24：M6-WP2/WP3 组件与最终决策

- 上游镜像共同文件哈希完全一致；扩展仍位于 Adapter、编排、探针与测试层，没有暗改原求解器。
- Adapter、流体包、整数 tick 事件和 Evidence Gates 保留为内部工具包；因依赖非公共 globals 和缺少显式 GPU 释放，不发布通用 npm SDK。
- `patches/fps-wall-clock.patch` 已通过 `git apply --check`，作为低风险上游候选保留，未对外提交。
- 最终主决策为 KEEP AS RESEARCH；内部 PACKAGE 已有能力模块，PREPARE FPS CONTRIBUTION，STOP 复杂容器/宏观水环境/通用实时 SDK。
- M6 与 G6 完成，项目进入 `research-complete`；除非满足 FINAL_DECISION 的重新启动条件，不再自动新增工作包。
