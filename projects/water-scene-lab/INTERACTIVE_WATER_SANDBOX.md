# Stage 9 决策｜Interactive Water Sandbox

状态：`completed / Gate 15 passed`  
目标平台：桌面浏览器  
宿主类型：固定场景预设的物理交互沙盘

## 决策结果

下一主线确定为 **Interactive Water Sandbox｜水体交互场景沙盘**。

它不是第四种水效果，也不是通用编辑器。它把已经通过真实浏览器 Gate 的 Waterfall、River、Ocean 三条 Particles4All 场景契约装入同一个宿主，用固定预设展示同一原库算法在不同使用场景中的对象差异、输入差异和证据差异。

## 为什么选择它

| 候选 | 场景价值 | 原库复用 | 新算法风险 | 决策 |
| --- | --- | --- | --- | --- |
| 固定预设水体交互沙盘 | 高：可用于游戏原型、互动展览、科普教学 | 高：直接复用三份契约、PBF、Shape Matching 与原生刚体 | 低 | `advance` |
| 工程水工数字孪生 | 潜在高 | 低：当前没有现实尺度、复杂边界与标定 | 极高 | `hold` |
| 第四种独立水效果 | 低：继续增加孤立 Demo | 低到中 | 中 | `stop` |
| 通用场景编辑器 | 中长期可能有价值 | 中 | 高：会先建设工具而非验证场景 | `hold` |
| 自研新液体求解器 | 偏离研究主线 | 无 | 极高 | `stop` |

## 宏观目标

面向桌面端游戏原型、互动展示与科普教学，建立一个可选择场景、运行原库物理、观察对象响应、查看证据并安全重置的水体交互宿主。

成功不是“页面里同时出现三块水”，而是：

```text
一个宏观宿主
  → 三个固定使用场景
  → 三份已有场景契约
  → 一个按需加载的 Particles4All 运行槽
  → 可读的位移 / 旋转 / 粒子 / WebGPU 证据
  → 明确真实性边界
```

## 能力地图

| 维度 | 已有资产 | 沙盘中的职责 |
| --- | --- | --- |
| Rendering | 现有 DOM 路线台、Three.js 宏观页面、Particles4All WebGPU 画布 | DOM 负责目标与证据；WebGPU 负责局部物理结果 |
| Scene assets | Waterfall、River、Ocean 场景壳；原生 box/torus | 固定预设的环境叙事与英雄对象 |
| Motion | PBF 粒子、Shape Matching 刚体、固定 ticks | 由契约事件驱动，不用装饰动画替代物理结果 |
| Interaction | 预设选择、运行、重置、卸载、查看原始运行时 | 一次只允许一个物理运行槽 |
| Evidence | 三场景合同、浏览器 Gate、跨 GPU 聚合结果 | 每个预设展示对应输入、对象、结果与边界 |
| Risks | iframe 内部接口、28K 基础流体、封闭箱体边界 | 保持内部研究工具定位，不包装为工程仿真或稳定 SDK |

## 三个固定场景模块

| 预设 | 使用场景 | Particles4All 原生对象 | 已有证据 | 沙盘中要解释的差异 |
| --- | --- | --- | --- | --- |
| 跌水冲击区 | 落水区重物/防护对象观察 | `box / density 2.2` | 额外向下撞击约 `0.01538 u` | 高密度对象主要体现冲击增量 |
| 河道漂流区 | 漂浮物/障碍的沿流响应 | `box / density 0.35` | 沿流约 `0.24703 u`、旋转约 `14.27°` | 同形状、不同密度与方向产生漂移和姿态差异 |
| 水面浮环区 | 浮环/浮标的上举响应 | `torus / density 0.22` | 相对基线上举约 `0.01528 u`、旋转约 `1.20°` | 不同原生形状在上升脉冲下形成浮环响应 |

## 用户体验顺序

1. 首屏解释沙盘目标和三类预设，不立即创建 WebGPU 设备。
2. 用户选择一个固定场景，看到宏观输入、原生对象和预期观察点。
3. 点击运行后加载唯一的 Particles4All runtime，执行已有场景契约。
4. 画面旁显示实际 body profile、注入量、ticks、方向位移、旋转、有限值和 Gate。
5. 切换预设前必须重置或卸载，避免多个 28K solver 同时常驻。
6. 最终比较页只比较有共同语义的字段，不把内部单位解释为现实工程量。

## 模块边界

### Sandbox Shell

- 三个固定预设卡片；
- 当前目标、对象和真实性说明；
- 单个物理视口和证据控制台；
- 桌面端布局、加载态、失败态和返回路线台。

### Preset Registry

- 只引用已存在的三份 `water-scene.particles4all-near-field/v1` 契约；
- 不复制发射器、映射或验收逻辑；
- 每个预设声明场景价值和主要证据字段。

### Runtime Slot

- 最多一个 `Particles4AllRuntimeAdapter`；
- 按需加载；
- 切换场景前卸载；
- 支持运行、重置、错误恢复和原始运行时检查。

### Evidence Director

- 固定顺序：基线 → 英雄对象 → 物理事件 → 证据停留；
- UI 只显示运行时真实返回数据；
- 不在结果出来前预写“通过”。

## Stage 10 工作包

1. `S10-WP1 Host Shell and Preset Navigation`：建立可运行页面、三预设导航、目标/边界 DOM 与单物理视口占位。
2. `S10-WP2 Single Runtime Slot and Contract Loading`：连接已有 Adapter/Runner，保证一次只加载一个 solver。
3. `S10-WP3 Guided Evidence Sequence and Reset`：实现运行、结果、重置、卸载与预设切换生命周期。
4. `S10-WP4 Desktop Browser and GPU Gate`：Chrome/Edge、Intel/NVIDIA 复核，不扩大到移动端。

## 验收门

- `G16 Host Shell`：一个页面能解释三个预设，DOM 在 WebGPU 未加载时仍完整可读；页面不存在横向溢出和阻塞错误。
- `G17 Runtime Lifecycle`：任意时刻最多一个 solver；切换预设会卸载前一实例；运行和重置可重复。
- `G18 Evidence Integrity`：三预设分别调用原场景契约，body profile、方向 Gate、旋转与非有限值结果一致。
- `G19 Desktop Coverage`：Chrome/Edge 与 Intel/NVIDIA 通过；结果离散度不超过既定 5% 门。

## 明确不做

- 不做自由拖拽、任意模型导入或通用编辑器；
- 不做现实浮力、流量、结构载荷或水工安全结论；
- 不做新 PBF、浅水、海洋或洪水求解器；
- 不把三个 solver 同时运行；
- 不先做移动端和发布型 SDK。

正式机器可读规格见 [`sandbox-program.json`](sandbox-program.json)。
