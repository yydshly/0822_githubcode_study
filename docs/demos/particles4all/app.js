import { Particles4AllRuntimeAdapter } from './runtime-adapter.mjs';

const capabilityPresets = [
  {
    id: 'coupling',
    name: '统一耦合基线',
    kind: '核心能力',
    cost: '30K',
    kicker: 'CORE · UNIFIED COUPLING',
    description: '水粒子和三类刚体粒子进入同一空间网格与约束循环。这里先建立基线：水能推动物体，物体也会排开水。',
    mission: '点击“倒入第二批水”，再在水面移动指针；打开引擎调试面板可观察粒子数、密度和 GPU timing。',
    tags: ['PBF', 'Shape Matching', '双向作用', 'SSFR'],
    query: 'preset=small&view=ssfr&particles=30000&body=sphere:0.35:0.76,torus:0.8:0.76,box:1.35:0.76&grab=1&ssfrscale=0.5',
    action: 'pour',
    actionLabel: '倒入第二批水',
    sim: 'PBF + Shape Matching',
    variable: '形状 · 密度 · SSFR',
    boundary: '统一求解器基线'
  },
  {
    id: 'buoyancy',
    name: '密度与浮沉',
    kind: '物理对照',
    cost: '28K',
    kicker: 'PHYSICS · DENSITY STUDY',
    description: '三个同尺寸球体只改变密度比例，用可见的漂浮、悬浮趋势和沉降差异检查浮力是否来自求解结果。',
    mission: '启用“carry solids”后把三个球拖入不同深度再松手，比较它们返回水面或下沉的速度。',
    tags: ['密度比', '浮力', '排水', '对照实验'],
    query: 'preset=small&view=ssfr&particles=28000&body=sphere:0.22:0.82,sphere:0.95:0.82,sphere:2.2:0.82&bodysize=0.085&grab=1&ssfrscale=0.5',
    action: 'reset',
    actionLabel: '重新比较',
    sim: '统一密度约束',
    variable: '0.22× · 0.95× · 2.2×',
    boundary: '定性浮沉，不是浮力标定'
  },
  {
    id: 'tension',
    name: '表面张力实验',
    kind: '流体材料',
    cost: '26K',
    kicker: 'FLUID · SURFACE TENSION',
    description: '降低重力并提高表面张力，让细水柱和小液团更容易保持连续，突出 cohesion 与曲率法向的作用。',
    mission: '连续两次触发细水柱，观察液团聚合；再在调试面板把 tension 调回 0 比较破碎程度。',
    tags: ['表面张力', '液滴聚合', '低重力', '细水柱'],
    query: 'preset=small&view=ssfr&particles=26000&bodies=0&tension=2.1&gravity=3.4&pourspeed=2.4&pourwidth=0.08&pourheight=0.82&pourtilt=18&ssfrscale=0.5',
    action: 'pour',
    actionLabel: '注入细水柱',
    sim: 'PBF + Surface Tension',
    variable: '张力 · 重力 · 喷口',
    boundary: '视觉材料实验'
  },
  {
    id: 'compression',
    name: '容器压缩',
    kind: '动态边界',
    cost: '32K',
    kicker: 'BOUNDARY · MOVING WALL',
    description: 'X 方向墙面可以在水体运行时移动。收窄容器会迫使水和刚体重新排布，是最小的动态边界与水位响应实验。',
    mission: '点击“收窄容器”，观察墙面推进、水位变化和重物响应；随后用上方 box size 滑杆恢复宽度。',
    tags: ['动态边界', '水位响应', '压力视觉化', '刚体'],
    query: 'preset=small&view=ssfr&particles=32000&box=1.8 1.05 1.05&body=box:1.6:0.7,torus:0.7:0.72,sphere:0.4:0.78&grab=1&ssfrscale=0.5',
    action: 'compress',
    actionLabel: '收窄容器',
    sim: 'PBF + Moving Boundary',
    variable: 'box size X',
    boundary: '容器墙，不是任意闸门网格'
  },
  {
    id: 'particles',
    name: '粒子解剖',
    kind: '诊断视图',
    cost: '24K',
    kicker: 'DIAGNOSTIC · PARTICLE VIEW',
    description: '关闭连续水面包装，直接查看粒子位置、速度着色和橙色刚体粒子，理解“算法结果”和“水面视觉”之间的分层。',
    mission: '倒水后观察高速粒子颜色变化；按 D 打开调试面板，再切回 SSFR 对照相同模拟状态的视觉差异。',
    tags: ['粒子位置', '速度着色', '刚体采样', '诊断'],
    query: 'preset=small&view=particles&particles=24000&body=sphere:0.4:0.78,torus:0.8:0.78,box:1.4:0.78&radius=0.48&speedmax=3.2&pourspeed=4&grab=1',
    action: 'pour',
    actionLabel: '生成高速粒子',
    sim: '同一物理状态',
    variable: '显示路径 · 速度颜色',
    boundary: '诊断图，不代表最终画质'
  },
  {
    id: 'mesh',
    name: '表面网格重建',
    kind: '渲染路径',
    cost: '26K',
    kicker: 'RENDER · SURFACE MESH',
    description: '把粒子邻域转换为标量场并重建连续表面，用来观察网格分辨率、等值面阈值和法线平滑的质量成本。',
    mission: '倒水制造新表面，再打开 D 面板调整 field res、blur passes 与 normal smooth，观察轮廓和耗时变化。',
    tags: ['密度场', '等值面', '法线平滑', '网格'],
    query: 'preset=small&view=mesh&particles=26000&bodies=0&meshres=128&meshiso=0.4&fieldsmooth=2&normalsmooth=3&pourspeed=3.5',
    action: 'pour',
    actionLabel: '制造新表面',
    sim: 'PBF → Scalar Field',
    variable: '网格分辨率 · iso',
    boundary: '重建成本随体素分辨率上升'
  },
  {
    id: 'ssfr',
    name: 'SSFR 诊断',
    kind: '渲染剖析',
    cost: '30K',
    kicker: 'RENDER · SCREEN SPACE FLUID',
    description: '逐步查看法线、平滑深度、厚度和原始深度，证明最终水面来自多 pass 屏幕空间重建，而不是一张透明材质。',
    mission: '反复点击“切换诊断层”，依次检查法线、平滑深度、厚度和最终着色。',
    tags: ['各向异性核', '深度', '厚度', 'Narrow-range'],
    query: 'preset=small&view=ssfr&particles=30000&bodies=0&ssfrscale=0.55&ssfrfilter=2&ssfriters=3&ssfrdebug=0',
    action: 'debug',
    actionLabel: '切换诊断层',
    sim: 'PBF → Anisotropic Splat',
    variable: '法线 · 深度 · 厚度',
    boundary: '屏幕空间结果依赖视角/分辨率'
  },
  {
    id: 'dayu',
    name: '治水实验台',
    kind: '应用扩展',
    cost: '42K',
    kicker: 'SCENARIO · FLOOD CONTROL',
    description: '把已有能力映射到“来水、堤石、漂浮物和河道收窄”的叙事任务；它是物理交互原型，不冒充真实水利模型。',
    mission: '先点击“收窄并加水”，再拖动橙色物体改变局部阻挡，比较堵塞前后的水位和物体运动。',
    tags: ['大禹治水', '来水', '堤石', '堵与疏'],
    query: 'preset=small&view=ssfr&box=2.2 1.15 1.2&particles=42000&body=box:2.2:0.72,box:2.2:0.72,torus:0.45:0.78,sphere:0.3:0.8&bodysize=0.09&grab=1&tension=0.35&pourspeed=4.8&pourwidth=0.14&pourheight=0.76&pourtilt=18&ssfrscale=0.5',
    action: 'dayu',
    actionLabel: '收窄并加水',
    sim: '统一水体 + 可拖刚体',
    variable: '边界 · 来水 · 密度',
    boundary: '叙事原型，不做工程判断'
  },
  {
    id: 'performance',
    name: '性能阶梯',
    kind: '设备边界',
    cost: '100K',
    kicker: 'PERFORMANCE · 100K PARTICLES',
    description: '中等预设把初始粒子提高到约 100k，并保持 SSFR。此场景用于暴露模拟和逐像素渲染的共同成本。',
    mission: '按 D 查看 sim/render GPU timing；如果操作明显迟缓，降低 quality，再与 30k 基线比较。',
    tags: ['100k 粒子', 'GPU timing', '质量阶梯', '压力测试'],
    query: 'preset=medium&view=ssfr&particles=100000&bodies=0&ssfrscale=0.55&report=3',
    action: 'reset',
    actionLabel: '重新测量',
    sim: '100k PBF',
    variable: '粒子数 · render scale',
    boundary: '高负载，不承诺实时',
    heavy: true
  }
];

const capabilities = Object.freeze({
  pbf: { label: 'PBF 流体约束' },
  coupling: { label: '刚液双向耦合' },
  shapeMatching: { label: 'Shape Matching 刚体' },
  density: { label: '密度与排水' },
  movingBoundary: { label: '动态箱体边界' },
  inflow: { label: '连续来水' },
  tension: { label: '表面张力' },
  particleView: { label: '粒子速度诊断' },
  mesh: { label: '表面网格重建' },
  ssfr: { label: 'SSFR 水面重建' },
  gpuTiming: { label: 'GPU 分阶段计时' }
});

const presetById = Object.fromEntries(capabilityPresets.map(preset => [preset.id, preset]));

const scenarios = [
  {
    ...presetById.buoyancy,
    group: 'S1 场景验证 · 原库真实运行',
    name: '水上救援：浮具与载荷',
    kind: '救援装备与浮力教学',
    focus: '承载差异',
    kicker: 'USE CASE · FLOTATION LOAD',
    description: '同体积浮具只改变载荷密度，为什么一个返回水面，另一个持续下沉？场景先验证承载差异，再解释密度约束与排水。',
    mission: '分别选择 A 轻载与 B 重载；把物体拖到相近深度后松手，比较垂向运动与最终吃水趋势。',
    capabilityIds: ['pbf', 'coupling', 'shapeMatching', 'density', 'ssfr'],
    variants: [
      {
        id: 'light',
        label: 'A · 轻载 0.22×',
        query: 'preset=small&view=ssfr&particles=28000&body=sphere:0.22:0.82&bodysize=0.085&grab=1&ssfrscale=0.5'
      },
      {
        id: 'heavy',
        label: 'B · 重载 2.20×',
        query: 'preset=small&view=ssfr&particles=28000&body=sphere:2.2:0.82&bodysize=0.085&grab=1&ssfrscale=0.5'
      }
    ],
    actionLabel: '重播当前载荷',
    variable: '仅改变刚体密度：0.22× / 2.20×',
    observe: '上浮或下沉方向 · 垂向速度 · 吃水趋势',
    boundary: '定性浮沉代理，不是浮具承载认证'
  },
  {
    ...presetById.compression,
    group: 'S1 场景验证 · 原库真实运行',
    name: '可变容积水箱',
    kind: '储液设备与活塞原型',
    focus: '容积响应',
    kicker: 'USE CASE · VARIABLE VOLUME TANK',
    description: '相同水量和物体配置下，水箱有效容积缩小时会发生什么？这里关注水位、速度和漂浮物重排，而不是先展示“移动边界”参数。',
    mission: 'A 保持原宽作为基线；切到 B 后点击“应用当前边界”，观察墙面推进期间与稳定后的差异。',
    capabilityIds: ['pbf', 'movingBoundary', 'coupling', 'shapeMatching', 'ssfr'],
    variants: [
      { id: 'wide', label: 'A · 保持原宽', targetBoxX: 1 },
      { id: 'narrow', label: 'B · 收窄至 0.60×', targetBoxX: 0.6 }
    ],
    action: 'boundaryCompare',
    actionLabel: '应用当前边界',
    variable: '仅改变整体 X 边界：1.00× / 0.60×',
    observe: '水位抬升 · 最大扰动 · 物体位移与重排',
    boundary: '真实能力是整面箱壁缩放，不是局部闸门'
  },
  {
    ...presetById.tension,
    group: 'S1 场景验证 · 原库真实运行',
    name: '喷注实验：液柱与成滴',
    kind: '低重力科普与液态视觉',
    focus: '聚滴差异',
    kicker: 'USE CASE · JET AND DROPLETS',
    description: '在相同低重力、喷口和流速下，表面张力是否会让细液柱更连续、液团更容易聚合？这是材料观感与科普演示的受控对照。',
    mission: '分别选择 A 无张力与 B 高张力，点击“注入同规格细流”；比较液柱断裂和液团聚合趋势。',
    capabilityIds: ['pbf', 'inflow', 'tension', 'ssfr'],
    variants: [
      {
        id: 'zero-tension',
        label: 'A · 张力 0.0',
        query: 'preset=small&view=ssfr&particles=26000&bodies=0&tension=0&gravity=3.4&pourspeed=2.4&pourwidth=0.08&pourheight=0.82&pourtilt=18&ssfrscale=0.5'
      },
      {
        id: 'high-tension',
        label: 'B · 张力 2.1',
        query: 'preset=small&view=ssfr&particles=26000&bodies=0&tension=2.1&gravity=3.4&pourspeed=2.4&pourwidth=0.08&pourheight=0.82&pourtilt=18&ssfrscale=0.5'
      }
    ],
    actionLabel: '注入同规格细流',
    variable: '仅改变表面张力：0.0 / 2.1',
    observe: '液柱断裂趋势 · 液团数量 · 聚合连续性',
    boundary: '视觉参数不是工程表面张力单位标定'
  },
  {
    ...presetById.coupling,
    group: 'S1 场景验证 · 原库真实运行',
    name: '互动清障：水与漂浮物',
    kind: '互动展陈与游戏机制',
    focus: '反馈差异',
    kicker: 'USE CASE · INTERACTIVE CLEARING',
    description: '加入可搬动障碍后，来水路径与水面扰动是否会改变，物体是否也被水推动？该场景把双向耦合转成可操作的清障体验。',
    mission: '先在 A 无障碍中注水；再切到 B 有障碍并重复注水，随后拖动物体，比较水体反馈。',
    capabilityIds: ['pbf', 'coupling', 'shapeMatching', 'inflow', 'ssfr'],
    variants: [
      {
        id: 'fluid-only',
        label: 'A · 无可搬障碍',
        query: 'preset=small&view=ssfr&particles=30000&bodies=0&grab=1&ssfrscale=0.5'
      },
      {
        id: 'with-solids',
        label: 'B · 三类可搬障碍',
        query: 'preset=small&view=ssfr&particles=30000&body=sphere:0.35:0.76,torus:0.8:0.76,box:1.35:0.76&grab=1&ssfrscale=0.5'
      }
    ],
    actionLabel: '注入等量来水',
    variable: '仅改变是否存在可搬刚体',
    observe: '水流路径 · 水面扰动 · 刚体位移与转动',
    boundary: '只支持 sphere / torus / box 基础刚体'
  },
  {
    ...presetById.dayu,
    group: 'S1 候选应用 · 原库能力待扩展',
    name: '治水科普：堵与疏概念',
    kind: '历史叙事交互原型',
    focus: '空间差异',
    kicker: 'SCENARIO PROXY · FLOOD CONTROL',
    description: '用封闭箱体的“宽域/整体收窄”代理堵与疏的概念，观察相同来水下的积水与漂浮物响应。它用于验证叙事交互，不冒充真实河道。',
    mission: 'A 与 B 都从相同初态开始并注入等量来水；B 会先整体收窄 X 边界。比较两次响应，并留意下方判断边界。',
    capabilityIds: ['pbf', 'movingBoundary', 'inflow', 'coupling', 'ssfr'],
    variants: [
      { id: 'open-proxy', label: 'A · 宽域代理', targetBoxX: 1 },
      { id: 'narrow-proxy', label: 'B · 整体收窄至 0.70×', targetBoxX: 0.7 }
    ],
    action: 'floodCompare',
    actionLabel: '运行当前来水',
    variable: '仅改变整体 X 边界：1.00× / 0.70×',
    observe: '积水高度趋势 · 漂浮物位移 · 稳定过程',
    boundary: '无河道、出口和流量探针；不能用于水利结论'
  },
  {
    ...presetById.particles,
    group: 'U1 研究与诊断 · 固定上游',
    name: '技术透视：粒子运动',
    kind: '机制证据',
    focus: '运动结构',
    kicker: 'DIAGNOSTIC · PARTICLE VIEW',
    description: '它不是独立使用场景，而是所有场景共享的机制透视：关闭连续水面包装，直接查看粒子位置、速度和刚体采样。',
    capabilityIds: ['pbf', 'coupling', 'shapeMatching', 'particleView'],
    variable: '观察方式：连续水面 / 原始粒子',
    observe: '速度分布 · 刚体采样 · 水与物体接触',
    boundary: '诊断图不代表最终画质'
  },
  {
    ...presetById.mesh,
    group: 'U1 研究与诊断 · 固定上游',
    name: '技术透视：表面网格',
    kind: '结构证据',
    focus: '表面结构',
    kicker: 'DIAGNOSTIC · SURFACE MESH',
    description: '把相同粒子状态转成标量场与连续表面，用来解释液体轮廓从哪里来，以及分辨率和等值面对结构的影响。',
    capabilityIds: ['pbf', 'mesh'],
    variable: '观察方式：场分辨率 · 等值面',
    observe: '轮廓连续性 · 小液团保留 · 重建耗时',
    boundary: '重建成本随体素分辨率上升'
  },
  {
    ...presetById.ssfr,
    group: 'U1 研究与诊断 · 固定上游',
    name: '技术透视：SSFR 分层',
    kind: '画面证据',
    focus: '画面分层',
    kicker: 'DIAGNOSTIC · SCREEN SPACE FLUID',
    description: '逐步查看法线、平滑深度和厚度，证明应用场景中的“水面”来自多 pass 屏幕空间重建，不是一张透明材质。',
    capabilityIds: ['pbf', 'ssfr'],
    variable: '观察方式：法线 · 深度 · 厚度',
    observe: '轮廓平滑 · 液体厚薄 · 屏幕空间伪影',
    boundary: '结果依赖视角与屏幕分辨率'
  },
  {
    ...presetById.performance,
    group: 'U1 研究与诊断 · 固定上游',
    name: '技术透视：设备负载',
    kind: '运行边界',
    focus: '性能边界',
    kicker: 'DIAGNOSTIC · 100K PARTICLES',
    description: '100K 不是独立使用场景，而是质量档位与设备边界。它用于暴露模拟和逐像素水面渲染的共同成本。',
    capabilityIds: ['pbf', 'ssfr', 'gpuTiming'],
    variable: '质量档位：30K / 100K · render scale',
    observe: 'sim / render GPU 时间 · 操作响应 · 表面连续性',
    boundary: '高负载，不承诺实时'
  }
];

const experimentProfiles = Object.freeze({
  buoyancy: {
    seconds: 1.5,
    metrics: [
      { key: 'bodyMeanY', label: '刚体中心高度代理', unit: 'u', digits: 3 },
      { key: 'bodyTravel', label: '刚体位移代理', unit: 'u', digits: 3 },
      { key: 'fluidP95', label: '流体高度 P95', unit: 'u', digits: 3 },
      { key: 'maxSpeed', label: '求解器最大速度', unit: 'u/s', digits: 2 }
    ]
  },
  compression: {
    seconds: 1.2,
    metrics: [
      { key: 'boxX', label: '实际箱体宽度 X', unit: 'u', digits: 3 },
      { key: 'fluidP95', label: '流体高度 P95', unit: 'u', digits: 3 },
      { key: 'regionP95Delta', label: '来水侧 − 远侧 P95', unit: 'u', digits: 3 },
      { key: 'maxSpeed', label: '求解器最大速度', unit: 'u/s', digits: 2 },
      { key: 'bodyTravel', label: '刚体位移代理', unit: 'u', digits: 3 }
    ]
  },
  tension: {
    seconds: 1.35,
    pourParticles: 900,
    metrics: [
      { key: 'fluidP95', label: '流体高度 P95', unit: 'u', digits: 3 },
      { key: 'fluidYSpread', label: '垂向展开 P95−P05', unit: 'u', digits: 3 },
      { key: 'maxSpeed', label: '求解器最大速度', unit: 'u/s', digits: 2 },
      { key: 'fluidParticles', label: '流体粒子数（输入校验）', unit: '', digits: 0 }
    ]
  },
  coupling: {
    seconds: 1.2,
    pourParticles: 3000,
    metrics: [
      { key: 'fluidP95', label: '流体高度 P95', unit: 'u', digits: 3 },
      { key: 'inletSharePct', label: '来水侧半区粒子占比', unit: '%', digits: 1 },
      { key: 'regionP95Delta', label: '来水侧 − 远侧 P95', unit: 'u', digits: 3 },
      { key: 'bodyTravel', label: '刚体位移代理', unit: 'u', digits: 3 },
      { key: 'fluidParticles', label: '流体粒子数（输入校验）', unit: '', digits: 0 }
    ]
  },
  dayu: {
    seconds: 1.2,
    pourParticles: 3000,
    metrics: [
      { key: 'boxX', label: '实际箱体宽度 X', unit: 'u', digits: 3 },
      { key: 'fluidP95', label: '积水高度 P95 代理', unit: 'u', digits: 3 },
      { key: 'inletSharePct', label: '来水侧半区粒子占比', unit: '%', digits: 1 },
      { key: 'regionP95Delta', label: '来水侧 − 远侧 P95', unit: 'u', digits: 3 },
      { key: 'bodyTravel', label: '漂浮物位移代理', unit: 'u', digits: 3 },
      { key: 'fluidParticles', label: '流体粒子数（输入校验）', unit: '', digits: 0 }
    ]
  }
});

const frame = document.querySelector('#engine-frame');
const runtimeAdapter = new Particles4AllRuntimeAdapter(frame);
const cover = document.querySelector('#frame-cover');
const runtimeCard = document.querySelector('.runtime-card');
const runtimeTitle = document.querySelector('#runtime-title');
const runtimeDetail = document.querySelector('#runtime-detail');
const engineLabel = document.querySelector('#engine-label');
const actionButton = document.querySelector('#scene-action');
const fullLink = document.querySelector('#open-full');
const list = document.querySelector('#scenario-list');
const heavyWarning = document.querySelector('#heavy-warning');
const comparisonLabel = document.querySelector('#comparison-label');
const variantSwitcher = document.querySelector('#variant-switcher');
const runComparisonButton = document.querySelector('#run-comparison');
const comparisonStatus = document.querySelector('#comparison-status');
const comparisonTimeline = document.querySelector('#comparison-timeline');
const probeResults = document.querySelector('#probe-results');
const probeControlState = document.querySelector('#probe-control-state');
const probeTableBody = document.querySelector('#probe-table-body');
const probeALabel = document.querySelector('#probe-a-label');
const probeBLabel = document.querySelector('#probe-b-label');
const probeNote = document.querySelector('#probe-note');
const auditSteps = document.querySelector('#audit-steps');
const auditInput = document.querySelector('#audit-input');
const auditSnapshot = document.querySelector('#audit-snapshot');

let activeIndex = 0;
let activeVariantIndex = 0;
let pollTimer = 0;
let engineReady = false;
let debugMode = 0;
let comparisonRunning = false;
let comparisonRunToken = 0;
let comparisonResultsData = null;
let comparisonResultsSceneId = null;
let comparisonPhaseHistory = [];

const comparisonPhases = ['prepare', 'a-run', 'a-freeze', 'b-run', 'b-freeze', 'complete'];

function activeVariant(scene) {
  return scene.variants?.[activeVariantIndex] || null;
}

function activeQuery(scene) {
  return activeVariant(scene)?.query || scene.query;
}

function capabilityLabels(scene) {
  return (scene.capabilityIds || [])
    .map(id => capabilities[id]?.label)
    .filter(Boolean);
}

function experimentProfile(scene) {
  return experimentProfiles[scene.id] || null;
}

function engineUrl(scene) {
  const url = new URL('./engine/index.html', window.location.href);
  url.search = activeQuery(scene);
  return url.href;
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value;
}

function setRuntime(state, title, detail) {
  runtimeCard.dataset.state = state;
  runtimeTitle.textContent = title;
  runtimeDetail.textContent = detail;
}

function renderScenarioButtons() {
  const fragment = document.createDocumentFragment();
  let currentGroup = '';
  scenarios.forEach((scene, index) => {
    if (scene.group !== currentGroup) {
      currentGroup = scene.group;
      const heading = document.createElement('p');
      heading.className = 'scenario-group-label';
      heading.textContent = currentGroup;
      fragment.append(heading);
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scenario-button';
    button.dataset.scene = scene.id;
    button.setAttribute('aria-pressed', 'false');
    button.title = `${scene.focus} · ${scene.cost} 粒子档位`;
    button.innerHTML = `
      <span class="scenario-index">${String(index + 1).padStart(2, '0')}</span>
      <span><span class="scenario-name"></span><span class="scenario-kind"></span></span>
      <span class="scenario-focus"></span>`;
    button.querySelector('.scenario-name').textContent = scene.name;
    button.querySelector('.scenario-kind').textContent = scene.kind;
    button.querySelector('.scenario-focus').textContent = scene.focus;
    button.addEventListener('click', () => selectScenario(index));
    fragment.append(button);
  });
  list.replaceChildren();
  list.append(fragment);
}

function renderTags(tags) {
  const root = document.querySelector('#scene-tags');
  root.replaceChildren();
  for (const tag of tags) {
    const chip = document.createElement('span');
    chip.textContent = tag;
    root.append(chip);
  }
}

function renderVariants(scene) {
  const variants = scene.variants || [];
  comparisonLabel.textContent = variants.length ? '受控对照' : '检查方法';
  variantSwitcher.replaceChildren();
  variantSwitcher.hidden = variants.length === 0;

  variants.forEach((variant, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.variant = variant.id;
    button.setAttribute('aria-pressed', String(index === activeVariantIndex));
    button.textContent = variant.label;
    button.addEventListener('click', () => selectScenario(activeIndex, { variantIndex: index }));
    variantSwitcher.append(button);
  });
}

function setComparisonStatus(state, message) {
  comparisonStatus.dataset.state = state;
  comparisonStatus.textContent = message;
}

function resetComparisonTimeline(visible = true) {
  comparisonTimeline.hidden = !visible;
  comparisonTimeline.dataset.state = 'idle';
  comparisonPhaseHistory = [];
  comparisonTimeline.querySelectorAll('[data-step]').forEach(item => {
    item.dataset.state = 'pending';
    item.removeAttribute('aria-current');
  });
}

function setComparisonPhase(phase, state = 'running') {
  const activeIndex = comparisonPhases.indexOf(phase);
  if (activeIndex < 0) return;
  if (comparisonPhaseHistory.at(-1) !== phase) comparisonPhaseHistory.push(phase);
  comparisonTimeline.dataset.state = state;
  comparisonTimeline.querySelectorAll('[data-step]').forEach((item, index) => {
    item.dataset.state = index < activeIndex || state === 'complete' ? 'done' :
      index === activeIndex ? 'active' : 'pending';
    if (index === activeIndex && state !== 'complete') item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

function setComparisonBusy(busy) {
  comparisonRunning = busy;
  frame.classList.toggle('protocol-locked', busy);
  frame.toggleAttribute('inert', busy);
  document.querySelectorAll('.scenario-button, .variant-switcher button, #reload-scene')
    .forEach(button => { button.disabled = busy; });
  actionButton.disabled = busy || !engineReady;
  runComparisonButton.disabled = busy || !engineReady || !experimentProfile(scenarios[activeIndex]);
  runComparisonButton.textContent = busy ? '正在运行受控 A/B…' : '运行 A → B 完整对照';
}

function clearProbeResults() {
  comparisonResultsData = null;
  comparisonResultsSceneId = null;
  probeResults.hidden = true;
  probeTableBody.replaceChildren();
  auditSteps.textContent = '—';
  auditInput.textContent = '—';
  auditSnapshot.textContent = '—';
  if (window.__particles4allLab) window.__particles4allLab.comparisonResults = null;
}

function markProbeResultsStale(reason) {
  if (!comparisonResultsData || comparisonRunning) return;
  probeControlState.dataset.state = 'stale';
  probeControlState.textContent = '记录结果 · 当前画面已自由探索';
  probeNote.textContent = `${reason}；表中仍是上一次自动对照的冻结采样，不再代表当前画面。`;
}

function quantile(sorted, p) {
  if (!sorted.length) return null;
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))];
}

async function readProbe(win, runMeta) {
  const sim = win.__sim;
  if (!sim?.n || typeof win.__readBuf !== 'function') throw new Error('引擎未提供粒子快照接口');

  const n = sim.n;
  const bytes = n * 16;
  const [positions, bodyMask] = await Promise.all([
    win.__readBuf(sim.livePos(), bytes),
    win.__readBuf(sim.liveBody(), bytes)
  ]);

  const fluidY = [];
  const inletY = [];
  const farY = [];
  const boxX = sim.params?.box?.[0] ?? 0;
  const regionSplitX = boxX * 0.5;
  let fluidXTotal = 0;
  for (let i = 0; i < n; i++) {
    // body buffer is vec4u; __readBuf exposes the same bits as Float32. Zero remains
    // exactly zero, which is sufficient to distinguish fluid from rigid-body samples.
    if (bodyMask[i * 4] !== 0) continue;
    const x = positions[i * 4];
    const y = positions[i * 4 + 1];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    fluidY.push(y);
    fluidXTotal += x;
    (x <= regionSplitX ? inletY : farY).push(y);
  }
  fluidY.sort((a, b) => a - b);
  inletY.sort((a, b) => a - b);
  farY.sort((a, b) => a - b);

  const poses = (sim.bodyPose || []).map((pose, index) => {
    const initial = sim.bodies?.[index]?.centre || pose.centre;
    const dx = pose.centre[0] - initial[0];
    const dy = pose.centre[1] - initial[1];
    const dz = pose.centre[2] - initial[2];
    return {
      centre: Array.from(pose.centre),
      travel: Math.hypot(dx, dy, dz)
    };
  });
  const bodyMeanY = poses.length
    ? poses.reduce((sum, pose) => sum + pose.centre[1], 0) / poses.length
    : null;
  const bodyTravel = poses.length
    ? poses.reduce((sum, pose) => sum + pose.travel, 0) / poses.length
    : null;
  const p05 = quantile(fluidY, 0.05);
  const p95 = quantile(fluidY, 0.95);
  const inletP95 = quantile(inletY, 0.95);
  const farP95 = quantile(farY, 0.95);
  const stats = sim.stats || win.__lastStats || {};
  const tickController = runMeta.tickController;

  return {
    capturedSimTime: sim.simTime,
    duration: sim.simTime - runMeta.startTime,
    totalParticles: n,
    fluidParticles: fluidY.length,
    solidParticles: n - fluidY.length,
    injectedParticles: fluidY.length - runMeta.initialFluid,
    boxX,
    fluidP05: p05,
    fluidP95: p95,
    fluidYSpread: p05 == null || p95 == null ? null : p95 - p05,
    fluidMeanX: fluidY.length ? fluidXTotal / fluidY.length : null,
    regionSplitX,
    inletParticles: inletY.length,
    farParticles: farY.length,
    inletSharePct: fluidY.length ? inletY.length / fluidY.length * 100 : null,
    inletP95,
    farP95,
    regionP95Delta: inletP95 == null || farP95 == null ? null : inletP95 - farP95,
    bodyMeanY,
    bodyTravel,
    bodyCount: poses.length,
    maxSpeed: Number.isFinite(stats.maxSpeed) ? stats.maxSpeed : null,
    avgRho: Number.isFinite(stats.avgRho) ? stats.avgRho : null,
    maxRho: Number.isFinite(stats.maxRho) ? stats.maxRho : null,
    stepDt: tickController?.stepDt ?? null,
    targetSolverSteps: tickController?.targetSteps ?? null,
    actualSolverSteps: tickController?.actualSteps ?? null
  };
}

function formatProbeValue(value, metric, delta = false) {
  if (!Number.isFinite(value)) return '—';
  const digits = metric.digits ?? 2;
  const numeric = digits === 0
    ? Math.round(Math.abs(value)).toLocaleString()
    : Math.abs(value).toFixed(digits);
  const sign = delta ? (value > 0 ? '+' : value < 0 ? '−' : '') : (value < 0 ? '−' : '');
  return `${sign}${numeric}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function renderProbeResults(scene, results) {
  const profile = experimentProfile(scene);
  const [a, b] = results;
  probeALabel.textContent = a.variant.label;
  probeBLabel.textContent = b.variant.label;
  probeTableBody.replaceChildren();

  for (const metric of profile.metrics) {
    const row = document.createElement('tr');
    const label = document.createElement('th');
    label.scope = 'row';
    label.textContent = metric.label;
    const av = document.createElement('td');
    const bv = document.createElement('td');
    const dv = document.createElement('td');
    av.dataset.label = a.variant.label;
    bv.dataset.label = b.variant.label;
    dv.dataset.label = 'Δ · B − A';
    av.textContent = formatProbeValue(a.probe[metric.key], metric);
    bv.textContent = formatProbeValue(b.probe[metric.key], metric);
    const delta = Number.isFinite(a.probe[metric.key]) && Number.isFinite(b.probe[metric.key])
      ? b.probe[metric.key] - a.probe[metric.key]
      : null;
    dv.textContent = formatProbeValue(delta, metric, true);
    row.append(label, av, bv, dv);
    probeTableBody.append(row);
  }

  const sameInput = a.probe.fluidParticles === b.probe.fluidParticles;
  const targetInputOk = !profile.pourParticles ||
    (a.probe.injectedParticles === profile.pourParticles && b.probe.injectedParticles === profile.pourParticles);
  const targetSteps = a.probe.targetSolverSteps;
  const exactSteps = Number.isInteger(targetSteps) &&
    a.probe.actualSolverSteps === targetSteps &&
    b.probe.actualSolverSteps === targetSteps &&
    b.probe.targetSolverSteps === targetSteps;
  const controlled = exactSteps && sameInput && targetInputOk;
  const protocol = {
    stepDt: a.probe.stepDt,
    targetSteps,
    fixedInputParticles: profile.pourParticles || 0,
    aActualSteps: a.probe.actualSolverSteps,
    bActualSteps: b.probe.actualSolverSteps,
    history: comparisonPhaseHistory.slice(),
    strictPassed: controlled
  };
  probeControlState.dataset.state = controlled ? 'ok' : 'warning';
  probeControlState.textContent = controlled
    ? `受控通过 · ${targetSteps}/${targetSteps} solver steps`
    : '受控条件有偏差 · 查看协议审计';
  auditSteps.textContent = `A ${a.probe.actualSolverSteps}/${targetSteps} · B ${b.probe.actualSolverSteps}/${targetSteps}`;
  auditInput.textContent = profile.pourParticles
    ? `A/B 各新增 ${profile.pourParticles.toLocaleString()} 粒子`
    : 'A/B 均无新增来水';
  auditSnapshot.textContent = '每个条件冻结读取 1 次';
  probeNote.textContent =
    `精确步协议：A/B 各 ${targetSteps} 个 solver steps（${a.probe.duration.toFixed(3)}s / ${b.probe.duration.toFixed(3)}s）；` +
    `流体粒子 A/B ${a.probe.fluidParticles.toLocaleString()} / ${b.probe.fluidParticles.toLocaleString()}。` +
    '半区 P95、占比、位移和速度均为求解器内部代理，不是工程测量或真实流量。';
  probeResults.hidden = false;

  comparisonResultsSceneId = scene.id;
  comparisonResultsData = { sceneId: scene.id, controlled, protocol, results };
  window.__particles4allLab.comparisonResults = comparisonResultsData;
}

function pauseEngine(win, paused) {
  const isPaused = Boolean(win.__ui?.paused);
  if (isPaused !== paused) win.document.getElementById('pause')?.click();
}

async function settleExperimentBoundary(win, variant, token) {
  if (variant.targetBoxX == null) return null;
  if (!setEngineRange('boxx', variant.targetBoxX)) throw new Error('无法设置实验边界');

  const ui = win.__ui;
  const sim = win.__sim;
  const targetBoxX = ui.boxBaseX * variant.targetBoxX;
  const previousTimeScale = ui.timeScale;
  ui.timeScale = 0;
  pauseEngine(win, false);

  const deadline = performance.now() + 5000;
  while (performance.now() < deadline && Math.abs(sim.params.box[0] - targetBoxX) > 0.001) {
    if (token !== comparisonRunToken) throw new Error('对照运行已取消');
    await delay(16);
  }
  pauseEngine(win, true);
  ui.timeScale = previousTimeScale;
  sim.timeBank = 0;
  sim.lastAdvanced = 0;
  sim.lastSubsteps = 0;
  if (Math.abs(sim.params.box[0] - targetBoxX) > 0.002) throw new Error('实验边界未在 step 0 前到位');
  return targetBoxX;
}

function armSolverStepController(win, profile) {
  const sim = win.__sim;
  const substeps = Math.max(1, Number(sim.params?.substeps) || 1);
  const stepDt = (1 / 60) / substeps;
  const targetSteps = Math.round(profile.seconds / stepDt);
  const startTime = sim.simTime;
  const originalStep = sim.step;
  const controller = {
    version: 1,
    mode: 'outer-step-cap',
    stepDt,
    targetSteps,
    actualSteps: 0,
    startTime,
    complete: false,
    released: false,
    originalStep,
    wrapper: null
  };

  controller.wrapper = function controlledStep(frameDt) {
    if (controller.released) return originalStep.call(this, frameDt);
    if (controller.complete) {
      this.lastAdvanced = 0;
      this.lastSubsteps = 0;
      return;
    }

    const remaining = controller.targetSteps - controller.actualSteps;
    const bank = Math.max(0, Number(this.timeBank) || 0);
    const remainingDt = Math.max(0, remaining * controller.stepDt - bank);
    originalStep.call(this, Math.min(Math.max(0, Number(frameDt) || 0), remainingDt));
    controller.actualSteps = Math.min(controller.targetSteps,
      Math.max(0, Math.round((this.simTime - controller.startTime) / controller.stepDt)));

    if (controller.actualSteps >= controller.targetSteps) {
      controller.complete = true;
      this.timeBank = 0;
      win.__ui.paused = true;
      const pause = win.document.getElementById('pause');
      const box = win.document.getElementById('boxx');
      if (pause) pause.textContent = 'Resume';
      if (box) box.disabled = true;
    }
  };
  sim.step = controller.wrapper;
  win.__labSolverController = controller;
  return controller;
}

function releaseSolverStepController(win) {
  const controller = win?.__labSolverController;
  const sim = win?.__sim;
  if (!controller || !sim) return;
  controller.released = true;
  if (sim.step === controller.wrapper) delete sim.step;
  sim.timeBank = 0;
  sim.lastAdvanced = 0;
  win.__labSolverController = null;
}

async function prepareExperiment(scene, variant, profile, token) {
  const win = frame.contentWindow;
  pauseEngine(win, true);
  win.__sim.timeBank = 0;
  win.__sim.lastAdvanced = 0;
  win.document.getElementById('reset')?.click();
  win.__sim.timeBank = 0;
  win.__sim.lastAdvanced = 0;

  const targetBoxX = await settleExperimentBoundary(win, variant, token);

  const initialFluid = win.__sim.n - win.__sim.scene.nBody;
  if (profile.pourParticles) {
    win.__ui.pourBudget = profile.pourParticles;
    win.__ui.pourLeft = profile.pourParticles;
    win.__ui.pouring = false;
    win.document.getElementById('pour')?.click();
  }
  const tickController = armSolverStepController(win, profile);
  const startTime = win.__sim.simTime;
  pauseEngine(win, false);
  return { startTime, initialFluid, targetBoxX, tickController };
}

function delay(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

async function waitForEngineReady(token, timeout = 45000) {
  const deadline = performance.now() + timeout;
  while (performance.now() < deadline) {
    if (token !== comparisonRunToken) throw new Error('对照运行已取消');
    if (engineReady && frame.contentWindow?.__sim?.n) return frame.contentWindow;
    await delay(100);
  }
  throw new Error('等待 WebGPU 场景超时');
}

async function waitForExperiment(scene, variant, profile, runMeta, token) {
  const win = frame.contentWindow;
  const deadline = performance.now() + 90000;
  while (performance.now() < deadline) {
    if (token !== comparisonRunToken) throw new Error('对照运行已取消');
    const controller = runMeta.tickController;
    setComparisonStatus('running',
      `${variant.label} · solver steps ${controller.actualSteps} / ${controller.targetSteps}`);
    const inputComplete = !profile.pourParticles || win.__ui.pourLeft <= 0;
    if (controller.complete && inputComplete) {
      pauseEngine(win, true);
      return;
    }
    if (controller.complete && !inputComplete) {
      throw new Error(`固定 ${controller.targetSteps} steps 内未完成粒子预算`);
    }
    await delay(40);
  }
  pauseEngine(win, true);
  throw new Error(`${scene.name} ${variant.label} 未在时限内完成`);
}

async function runFullComparison() {
  if (comparisonRunning) return;
  const sceneIndex = activeIndex;
  const scene = scenarios[sceneIndex];
  const profile = experimentProfile(scene);
  if (!profile || scene.variants?.length !== 2) return;

  const token = ++comparisonRunToken;
  clearProbeResults();
  resetComparisonTimeline(true);
  setComparisonPhase('prepare');
  setComparisonBusy(true);
  const results = [];

  try {
    for (let index = 0; index < scene.variants.length; index++) {
      const variant = scene.variants[index];
      const runPhase = index === 0 ? 'a-run' : 'b-run';
      const freezePhase = index === 0 ? 'a-freeze' : 'b-freeze';
      setComparisonPhase(runPhase);
      setComparisonStatus('running', `正在准备 ${variant.label}…`);
      selectScenario(sceneIndex, {
        variantIndex: index,
        skipHistory: true,
        internalComparison: true
      });
      setComparisonBusy(true);
      const win = await waitForEngineReady(token);
      const runMeta = await prepareExperiment(scene, variant, profile, token);
      await waitForExperiment(scene, variant, profile, runMeta, token);
      setComparisonPhase(freezePhase);
      setComparisonStatus('running', `正在冻结 ${variant.label} 的代理指标…`);
      const probe = await readProbe(win, runMeta);
      results.push({ variant, probe });
      releaseSolverStepController(win);
    }

    setComparisonPhase('complete', 'complete');
    renderProbeResults(scene, results);
    updateParentUrl(scene);
    setComparisonStatus('complete',
      `A/B 已完成：双方精确运行 ${results[0].probe.targetSolverSteps} solver steps，并在终点冻结采样。当前画面为 ${results[1].variant.label}。`);
  } catch (error) {
    setComparisonPhase(comparisonPhaseHistory.at(-1) || 'prepare', 'error');
    setComparisonStatus('error', `A/B 对照失败：${error.message}`);
    probeResults.hidden = true;
  } finally {
    if (token === comparisonRunToken) {
      releaseSolverStepController(frame.contentWindow);
      pauseEngine(frame.contentWindow, false);
      setComparisonBusy(false);
    }
  }
}

function stopPolling() {
  window.clearInterval(pollTimer);
  pollTimer = 0;
}

function startPolling(scene) {
  stopPolling();
  let tries = 0;
  pollTimer = window.setInterval(() => {
    tries += 1;
    try {
      const win = frame.contentWindow;
      if (win?.__gpuError) {
        engineReady = false;
        actionButton.disabled = true;
        runComparisonButton.disabled = true;
        cover.hidden = true;
        engineLabel.textContent = 'GPU pipeline 报错';
        setRuntime('error', 'WebGPU pipeline 失败', String(win.__gpuError).slice(0, 150));
        stopPolling();
        return;
      }
      if (win?.__sim?.n) {
        engineReady = true;
        actionButton.disabled = comparisonRunning;
        runComparisonButton.disabled = comparisonRunning || !experimentProfile(scene);
        cover.hidden = true;
        const count = Number(win.__sim.n).toLocaleString();
        const variant = activeVariant(scene);
        engineLabel.textContent = `${count} particles · ${variant?.label || scene.kind}`;
        setRuntime('ok', 'WebGPU 正在运行', `${count} 个粒子；可切换场景、重置或全屏检查调试面板。`);
        stopPolling();
      }
    } catch (error) {
      engineLabel.textContent = '等待同源引擎状态';
    }
    if (tries > 50) {
      cover.hidden = true;
      setRuntime('error', '引擎初始化超时', '可全屏打开并检查浏览器控制台、WebGPU 支持和硬件加速。');
      stopPolling();
    }
  }, 400);
}

function updateParentUrl(scene) {
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', scene.id);
  const variant = activeVariant(scene);
  if (variant) url.searchParams.set('variant', variant.id);
  else url.searchParams.delete('variant');
  history.replaceState(null, '', url);
}

function selectScenario(index, options = {}) {
  activeIndex = (index + scenarios.length) % scenarios.length;
  const scene = scenarios[activeIndex];
  const profile = experimentProfile(scene);
  if (!options.internalComparison && comparisonResultsSceneId && comparisonResultsSceneId !== scene.id) {
    clearProbeResults();
  }
  const requestedVariant = Number.isInteger(options.variantIndex) ? options.variantIndex : 0;
  activeVariantIndex = scene.variants?.length
    ? (requestedVariant + scene.variants.length) % scene.variants.length
    : 0;
  debugMode = 0;
  engineReady = false;
  actionButton.disabled = true;
  runComparisonButton.hidden = !profile;
  runComparisonButton.disabled = true;
  comparisonTimeline.hidden = !profile;
  cover.hidden = false;
  engineLabel.textContent = '正在创建场景';

  if (!options.internalComparison && comparisonResultsSceneId !== scene.id) {
    resetComparisonTimeline(Boolean(profile));
    if (profile) {
      const input = profile.pourParticles
        ? `固定注入 ${profile.pourParticles.toLocaleString()} 个流体粒子`
        : '不增加来水';
      const expectedSteps = Math.round(profile.seconds * 120);
      setComparisonStatus('idle',
        `自动协议：A/B 各精确封顶 ${expectedSteps} solver steps，${input}；单实例顺序采样。`);
    } else {
      setComparisonStatus('idle', '该项属于研究与诊断，不运行场景 A/B 自动协议。');
    }
  }

  setText('#scene-kicker', scene.kicker);
  setText('#scene-title', scene.name);
  setText('#scene-description', scene.description);
  setText('#scene-mission', scene.mission);
  setText('#scenario-count', `${String(activeIndex + 1).padStart(2, '0')} / ${String(scenarios.length).padStart(2, '0')}`);
  setText('#evidence-sim', capabilityLabels(scene).join(' · '));
  setText('#evidence-variable', scene.variable);
  setText('#evidence-observe', scene.observe);
  setText('#evidence-boundary', scene.boundary);
  actionButton.textContent = activeVariant(scene)?.actionLabel || scene.actionLabel;
  heavyWarning.hidden = !scene.heavy;
  renderTags(capabilityLabels(scene));
  renderVariants(scene);

  document.querySelectorAll('.scenario-button').forEach((button, buttonIndex) => {
    button.setAttribute('aria-pressed', String(buttonIndex === activeIndex));
  });
  const activeButton = document.querySelector(`.scenario-button[data-scene="${scene.id}"]`);
  if (activeButton && window.matchMedia('(max-width: 700px)').matches) {
    list.scrollLeft = Math.max(0, activeButton.offsetLeft - (list.clientWidth - activeButton.offsetWidth) / 2);
  }

  const url = engineUrl(scene);
  fullLink.href = url;
  frame.title = `Particles4All：${scene.name}`;
  frame.src = url;
  if (!options.skipHistory) updateParentUrl(scene);
  startPolling(scene);
  window.__particles4allLab.active = scene.id;
  window.__particles4allLab.activeVariant = activeVariant(scene)?.id || null;
}

function engineDocument() {
  if (!engineReady) return null;
  try { return frame.contentDocument; } catch { return null; }
}

function clickEngine(id) {
  const element = engineDocument()?.getElementById(id);
  if (!element) return false;
  element.click();
  return true;
}

function setEngineRange(id, value) {
  const element = engineDocument()?.getElementById(id);
  if (!element) return false;
  element.value = String(value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function runSceneAction() {
  const scene = scenarios[activeIndex];
  const variant = activeVariant(scene);
  if (!engineReady) return;
  markProbeResultsStale('外层场景动作改变了当前状态');
  if (scene.action === 'pour') clickEngine('pour');
  if (scene.action === 'reset') clickEngine('reset');
  if (scene.action === 'boundaryCompare') setEngineRange('boxx', variant?.targetBoxX ?? 1);
  if (scene.action === 'floodCompare') {
    setEngineRange('boxx', variant?.targetBoxX ?? 1);
    clickEngine('pour');
  }
  if (scene.action === 'debug') {
    debugMode = (debugMode + 1) % 4;
    const select = engineDocument()?.getElementById('ssfrdebug');
    if (select) {
      select.value = String(debugMode);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const labels = ['最终着色', '法线', '平滑深度', '厚度'];
      actionButton.textContent = `当前：${labels[debugMode]}`;
    }
  }
}

frame.addEventListener('load', () => {
  engineLabel.textContent = '引擎文档已加载 · 等待 GPU';
  try {
    const doc = frame.contentDocument;
    const markFreeExplore = () => markProbeResultsStale('引擎内的拖拽、相机或参数操作改变了当前状态');
    doc?.addEventListener('pointerdown', markFreeExplore, { capture: true });
    doc?.addEventListener('input', markFreeExplore, { capture: true });
  } catch {
    // Same-origin access is expected; the full-screen link remains available if embedding changes.
  }
});

actionButton.addEventListener('click', runSceneAction);
runComparisonButton.addEventListener('click', runFullComparison);
document.querySelector('#reload-scene').addEventListener('click', () => {
  markProbeResultsStale('当前变体被重新载入');
  selectScenario(activeIndex, { variantIndex: activeVariantIndex });
});

window.addEventListener('keydown', (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === '[') selectScenario(activeIndex - 1);
  if (event.key === ']') selectScenario(activeIndex + 1);
});

renderScenarioButtons();

window.__particles4allLab = {
  scenarios,
  capabilities,
  active: null,
  activeVariant: null,
  comparisonResults: null,
  runtime: runtimeAdapter,
  selectScenario,
  runComparison: runFullComparison,
  get engineReady() { return engineReady; }
};

if (!('gpu' in navigator)) {
  setRuntime('error', '此浏览器未提供 WebGPU', '可阅读场景和研究说明；实时画面请使用支持 WebGPU 的新版浏览器。');
}

const initialParams = new URLSearchParams(location.search);
const requested = initialParams.get('scenario');
const requestedIndex = scenarios.findIndex(scene => scene.id === requested);
const initialScene = scenarios[requestedIndex >= 0 ? requestedIndex : 0];
const requestedVariant = initialScene.variants?.findIndex(variant => variant.id === initialParams.get('variant')) ?? -1;
selectScenario(requestedIndex >= 0 ? requestedIndex : 0, {
  skipHistory: requestedIndex >= 0,
  variantIndex: requestedVariant >= 0 ? requestedVariant : 0
});
