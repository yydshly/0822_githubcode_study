const styles = [
  { id: "colored-pencil-diary", name: "彩铅日记漫画", family: "narrative", fit: "家庭故事 / 生活日记", preview: "style-pencil", colors: ["#f0bb62", "#8eb8a5", "#e98a74"] },
  { id: "minimal-line-explainer", name: "极简黑白线条讲解", family: "explainer", fit: "知识解释 / 教程", preview: "style-line", colors: ["#252525", "#f7f4ec", "#888"] },
  { id: "kid-crayon", name: "五岁儿童蜡笔坏画", family: "art", fit: "亲子内容 / 儿童故事", preview: "style-crayon", colors: ["#ef6b4e", "#ffd24a", "#4f8fd8"] },
  { id: "rawkid-crayon", name: "潦草家庭投稿蜡笔", family: "art", fit: "家庭投稿 / 童真短片", preview: "style-crayon", colors: ["#d95555", "#f1c84b", "#5a8bb8"] },
  { id: "bean-doodle-infographic", name: "小豆人涂鸦信息图", family: "explainer", fit: "轻量科普 / 数据叙事", preview: "style-line", colors: ["#1f2937", "#f59e0b", "#f7f2e7"] },
  { id: "ms-paint-bad-doodle", name: "鼠标烂涂鸦", family: "art", fit: "网络梗 / 荒诞喜剧", preview: "style-line", colors: ["#0866ff", "#ff2442", "#fff"] },
  { id: "ballpoint-scribble", name: "圆珠笔缠绕线速写", family: "art", fit: "人物随笔 / 情绪片段", preview: "style-ink", colors: ["#213f73", "#d9cdb8", "#5d6d85"] },
  { id: "real-crayon-paper", name: "真实蜡笔纸实拍", family: "art", fit: "手作质感 / 儿童品牌", preview: "style-crayon", colors: ["#ce3d40", "#efb84c", "#497b68"] },
  { id: "ink-wash", name: "水墨写意", family: "narrative", fit: "东方诗意 / 散文", preview: "style-ink", colors: ["#242424", "#a8aa9f", "#ece7da"] },
  { id: "emotional-watercolor-sketch", name: "情绪叙事淡彩速写", family: "narrative", fit: "情绪 MV / 独白", preview: "style-pencil", colors: ["#758cac", "#d49a91", "#e8dcca"] },
  { id: "retro-gouache-concept", name: "中古动画水粉概念稿", family: "narrative", fit: "复古叙事 / 概念预告", preview: "style-print", colors: ["#334a59", "#c7684e", "#d9b36c"] },
  { id: "sunlit-storybook", name: "暖光童画绘本", family: "narrative", fit: "睡前故事 / 童话", preview: "style-pencil", colors: ["#e7aa45", "#70956d", "#f4dfb2"] },
  { id: "nordic-gouache-storybook", name: "北欧低饱和水粉绘本", family: "narrative", fit: "品牌故事 / 治愈绘本", preview: "style-minimal", colors: ["#6f8d8a", "#d4a07d", "#e5dfcf"] },
  { id: "inked-storybook", name: "墨线淡彩绘本", family: "narrative", fit: "文学改编 / 人物故事", preview: "style-ink", colors: ["#303639", "#b9cfbe", "#e6c19c"] },
  { id: "warm-flat-storybook", name: "暖色几何扁平绘本", family: "narrative", fit: "低龄故事 / 社交短片", preview: "style-minimal", colors: ["#d36d4c", "#e8b34e", "#729080"] },
  { id: "naive-marker-notes", name: "稚拙马克笔笔记", family: "explainer", fit: "课堂笔记 / 观点卡片", preview: "style-crayon", colors: ["#ff785a", "#5c86d8", "#232323"] },
  { id: "zine-riso-collage", name: "Zine 孔版拼贴", family: "print", fit: "音乐海报 / 青年文化", preview: "style-print", colors: ["#f04d66", "#2458a6", "#f0dc62"] },
  { id: "organic-contour-doodle", name: "有机轮廓品牌涂鸦", family: "print", fit: "品牌内容 / 产品概念", preview: "style-line", colors: ["#2b4c3f", "#e68463", "#f3e4c8"] },
  { id: "whiteboard-explainer", name: "白板讲解动画", family: "explainer", fit: "培训 / SOP / 产品讲解", preview: "style-line", colors: ["#222", "#2d6cdf", "#f8f8f4"] },
  { id: "linocut-editorial", name: "粗粝木刻社论插画", family: "print", fit: "观点评论 / 文化内容", preview: "style-print", colors: ["#171717", "#a13e31", "#e3d4b4"] },
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const defaultStory = "小雨停了。孩子推开窗，风里还有潮湿的味道。院子上空，出现了一道彩虹。";
const samplePages = [
  { name: "01-rain.png", label: "雨停以后", url: "" },
  { name: "02-window.png", label: "推开窗户", url: "" },
  { name: "03-rainbow.png", label: "看见彩虹", url: "" },
];

const state = {
  input: "text",
  mode: "preview",
  styleIndex: 0,
  transition: "cut",
  generator: "codex",
  textMode: "font",
  layout: "auto",
  duration: 4.4,
  scenes: [],
  pages: samplePages.map((page) => ({ ...page })),
  scene: 0,
  phase: 2,
  artifact: "command",
  family: "all",
  playing: false,
  timer: null,
  directorStory: "technology",
  directorBeat: 0,
  classicalVariant: "lecture",
};

const sceneSymbols = ["#scene-rain", "#scene-window", "#scene-rainbow"];
const skyStarts = [0, 18.54, 38.66, 63.77, 85.11];
const aiEnergyStarts = [0, 15.32, 33.34, 49.637, 63.857];
const knowledgeStarts = [0, 12.299, 28.348, 44.483, 61.223];
const childrenStarts = [0, 20.301, 42.124, 63.089, 87.022];
const mysteryStarts = [0, 25.79, 49.82, 76.10, 105.99];
const brandStarts = [0, 25.86, 52.15, 79.69, 106.67];
const poeticStarts = [0, 22.58, 48.33, 76.04, 100.94];
const classicalStarts = [0, 24.61, 47.46, 68.87, 92.56];
const jiangnanStarts = [0, 26.53, 47.82, 71.03, 93.28];
const technologyStarts = [0, 20.89, 41.16, 64.73, 89.91];
const powerExperienceStates = {
  powered: { label: "供电正常", kicker: "有电时，系统退到背景", title: "房间正在正常运转", live: "当前供电正常。风扇、空调、路由器与城市灯光都在工作。" },
  outage: { label: "供电中断", kicker: "0.0 秒 · 声音先消失", title: "电的缺席比黑暗更快", live: "模拟供电已经中断。风扇停止，空调和路由器熄灭，电器底噪消失。" },
  phone: { label: "手机微光", kicker: "1.4 秒 · 剩余电量接管", title: "电量开始成为倒计时", live: "手机微光接管房间。此刻仍有电池，但补充电量与通信服务都依赖更大的系统。" },
  reveal: { label: "依赖显影", kicker: "3.0 秒 · 日常连接出现", title: "消失的不只是一盏灯", live: "依赖正在显影：制冷、家庭网络、冷藏，以及部分建筑的泵与电梯都可能受到影响。" },
  ready: { label: "系统就绪", kicker: "5.2 秒 · 从设备反查系统", title: "现在，看电如何抵达房间", live: "电力依赖图已经展开。请选择一个设备，沿发电、输电、变电、配电追踪到最终使用。" },
  restore: { label: "正在复电", kicker: "恢复 · 运动与声音返回", title: "系统重新进入背景", live: "模拟供电正在恢复。风扇、网络指示灯和城市光依次返回。" },
};
const powerDependencies = {
  comfort: { index: "PATH 01 · COMFORT", title: "电在这里变成风与冷", copy: "供电经过建筑配电与家庭回路抵达风扇和空调。停电后，最先被身体感知的往往不是黑暗，而是空气停止流动、室温开始上升。", boundary: "边界：升温速度受房屋保温、室外温度和通风条件影响。" },
  router: { index: "PATH 02 · HOME NETWORK", title: "电在这里维持室内连接", copy: "家庭路由器、光猫等设备需要本地供电。停电时，即使运营商网络仍在工作，室内 Wi-Fi 也会随着这些设备断电而消失。", boundary: "边界：不间断电源可以延长家庭设备运行，但不能保证上游接入网络始终可用。" },
  mobile: { index: "PATH 03 · MOBILE NETWORK", title: "手机有电，不等于网络永远在线", copy: "手机依靠电池暂时继续工作；移动通信还依赖基站、传输链路和机房供电。局部停电初期可能由备用电源维持，持续时间和覆盖因地区而异。", boundary: "边界：这里展示依赖关系，不预测某次停电中的具体通信可用时长。" },
  building: { index: "PATH 04 · BUILDING", title: "有些依赖藏在建筑内部", copy: "高层供水、排水、门禁和电梯可能依赖建筑配电。备用发电机通常只保障选定负载，因此‘整栋楼都有备用电’并不等于所有设备照常运行。", boundary: "边界：实际影响取决于建筑设计、消防规范、备用电源和维护状态。" },
};
const powerExperienceRuntime = { value: "powered", timers: [], audioContext: null };
const classicalVariantConfig = {
  lecture: { video: "#lecture-demo-video", starts: jiangnanStarts, timeline: "[data-lecture-time]", title: "lecture-output-title" },
  bright: { video: "#jiangnan-demo-video", starts: jiangnanStarts, timeline: "[data-jiangnan-time]", title: "jiangnan-output-title" },
  night: { video: "#classical-demo-video", starts: classicalStarts, timeline: "[data-classical-time]", title: "classical-output-title" },
};
const phaseNames = ["草图", "勾线", "上色"];
const modeNotes = {
  plan: "只生成分镜计划，不调用图像生成或视频渲染。",
  generate: "生成或登记场景图任务，保留可审计的中间产物。",
  full: "从故事规划一路执行到完整 MP4。",
  import: "导入已有 storyboard.json，从分镜继续执行。",
  render: "复用已有场景图，渲染 1080 × 1440 正片。",
  preview: "低分辨率快速预演，适合调节画风、字幕和节奏。",
};

const directorPresets = {
  memory: {
    title: "家庭记忆 · 证据与思念",
    logline: "用一个有磨损痕迹的物件打开记忆，让“失去”和“仍被保存”同时成立。",
    fit: "高匹配",
    runtime: "约 54 秒",
    styleId: "colored-pencil-diary",
    palette: ["#596d81", "#bb8c66", "#e7d6b8"],
    paletteLabel: "雨夜蓝灰 → 灯光暖棕",
    camera: "物件特写，缓慢推进人物关系",
    transition: "柔和叠化，终幕回到首幕",
    voice: "成熟平静女声 · calm · 0.92×",
    rhythm: "慢—疑问—停顿—温暖回响",
    rationale: "纸张颗粒和不完全上色像正在被修复的记忆；慢镜头让观众先看见证据，再感受人物。",
    template: "handdrawn",
    scenes: [
      { role: "钩子 · 建立原则", short: "钩子", note: "建立原则", title: "先让观众相信她的原则", duration: "9 秒", context: "雨夜档案馆", subject: "被水浸坏的照片", meaning: "事实需要留下痕迹", purpose: "从修复动作进入人物，不先解释背景；“只让事实留下证据”成为后续冲突的尺度。", visual: "手部与照片占主要画幅，人物只露侧脸；冷窗光压住暖台灯。", motion: "黑白线稿先出现，暖色只落在照片和指尖；6% 缓慢推进。", narration: "陈述，不煽情；让规则听起来可靠而克制。" },
      { role: "触发 · 证据异常", short: "触发", note: "证据异常", title: "让一个日期破坏安稳", duration: "11 秒", context: "闭馆前的静室", subject: "晚了二十年的日期", meaning: "事实内部出现裂缝", purpose: "用可核验的时间矛盾制造问题，而不是依赖突然惊吓。", visual: "先看月台编号，再揭示照片背面的日期；人物退到画面边缘。", motion: "局部放大日期，纸张纹理短暂停住；冷色饱和度下降。", narration: "语速略慢，在“二十年”前留出半拍。" },
      { role: "揭示 · 看见缺口", short: "揭示", note: "看见缺口", title: "把谎言拆成两种真实", duration: "10 秒", context: "废弃月台", subject: "两张残片与合成照", meaning: "想念真实，事件未发生", purpose: "同时展示原始残片和生成结果，让观众理解事实与情感并非同一层。", visual: "残片左右分置，合成照位于中间；人物之间保留明显空隙。", motion: "线稿分层拼合，但保留接缝；拒绝使用魔法般无痕变形。", narration: "把信息说清楚，情绪只在最后一句轻微下沉。" },
      { role: "质问 · 价值冲突", short: "质问", note: "价值冲突", title: "让最年轻的人提出难题", duration: "7 秒", context: "屏幕微光下", subject: "外孙女与生成过程", meaning: "真实是否只有一种", purpose: "把抽象伦理问题放进一句具体提问，让观众短暂停留。", visual: "屏幕显示来源链，女孩看向顾岚而不是看镜头。", motion: "停止推进，只让屏幕光轻微呼吸；问句结束后留 0.5 秒空白。", narration: "真诚而非控诉，问号处明显收住。" },
      { role: "回响 · 选择留下", short: "回响", note: "选择留下", title: "回到同一张桌子，但改变颜色", duration: "17 秒", context: "天将亮的档案馆", subject: "三层归档盒", meaning: "不篡改，也不抹去", purpose: "用行动而非结论收束：事实、过程与口述记忆分层保存。", visual: "复用首幕构图，增加晨光；三个档案标签清楚但不过度解释。", motion: "暖色从照片扩散到房间；最终停在仍可见的修复痕迹上。", narration: "平静完成判断，最后一句放慢并留出余韵。" },
    ],
  },
  mystery: {
    title: "悬疑档案 · 线索与认知翻转",
    logline: "一只仍在走的封存旧钟，把暗道、长大衣与被遗漏的救援重新放进可以核验的档案。",
    fit: "高匹配",
    runtime: "真实成片 135.262 秒",
    styleId: "linocut-editorial",
    palette: ["#22262b", "#8f3e36", "#d7c49e"],
    paletteLabel: "炭黑与旧纸，只保留警示红",
    camera: "证据特写与空间纵深交替，缓慢横移后硬切",
    transition: "不对称硬切，翻转处保留物件连续",
    voice: "MiniMax 精英青年男声 · calm · 克制",
    rhythm: "异常—证据链—可信误导—理性翻转—责任收束",
    rationale: "木刻的强黑白关系适合证据与遮蔽；铁锈红只追踪可回看的线索，翻转改变旧物件的解释，结尾把证据分层而非抹平冲突。",
    template: "handdrawn",
    scenes: [
      { role: "异常 · 记录与现实冲突", short: "异常", note: "封条与旧钟", title: "封条没有断，钟却仍在走", duration: "25.79 秒", context: "洪水后的青岬站", subject: "封条与机械钟", meaning: "报告结束不等于事实结束", purpose: "让一条可检查的物理矛盾先出现：需要每周上弦的钟不可能独自运行二十四年。", visual: "沈砚站在门外，手电越过铁锈红封条照向无数字旧钟。", motion: "从门框缓慢横移到钟，避免惊吓式突变。", narration: "只陈述封存记录与机械条件，让观众先提出问题。" },
      { role: "追踪 · 建立证据链", short: "追踪", note: "暗道与钥匙", title: "证明有人进入，但不急着命名", duration: "24.03 秒", context: "候车室维修暗道", subject: "钥匙、鞋印与路线", meaning: "主门封存并非唯一入口", purpose: "让钥匙、暗道和新鞋印互相支撑，同时让已故站长的身份形成不可能缺口。", visual: "无文字路线图、铁钥匙和鞋印共享铁锈红索引，旧钟在远处可见。", motion: "反向横移，按空间关系而非旁白顺序读证据。", narration: "名词之间留短停顿，区分观察、关联和推断。" },
      { role: "误导 · 合理错误", short: "误导", note: "大衣人影", title: "让最像答案的东西先被怀疑", duration: "26.28 秒", context: "旧监控投影走廊", subject: "穿站务大衣的人影", meaning: "影像证明有人，不证明身份", purpose: "利用已故站长的大衣和熟练动作建立可信误导，再由袖口与空衣架提示可继承性。", visual: "投影中的人保持普通剪影，沈砚与空衣架构成第二条阅读路径。", motion: "加深对比后硬停，不制造鬼影或怪物。", narration: "语气接近确认但拒绝绝对词，在身份结论前收住。" },
      { role: "翻转 · 证据改义", short: "翻转", note: "大衣与磁带", title: "同一件物证，指向另一种责任", duration: "29.89 秒", context: "候车室清晨", subject: "周岚、钥匙与儿童录音", meaning: "进入者可解释，缺失者才是核心", purpose: "用已经出现的大衣解释人影，再用撤离时间后的歌声证明原报告遗漏了被救儿童。", visual: "两人、磁带、钥匙、空座位与旧钟形成证据三角。", motion: "放慢横移，让翻转来自物件关系而非炫技。", narration: "先确认来者，再把重点转向被记录抹去的人。" },
      { role: "余波 · 责任收束", short: "余波", note: "证据分层", title: "让真相进入档案，而不是覆盖档案", duration: "29.27 秒", context: "公开的候车室", subject: "分层物证与公开运行的钟", meaning: "修正记录不等于删除冲突", purpose: "分别保存违规进入、录音、口述证词和维护记录；保留旧报告原貌并附上新档案。", visual: "证据分开放置，大衣挂在明处，破封条入盒，门向月台打开。", motion: "亮度轻升后停在开放空间，不用拥抱或胜利姿态。", narration: "降低情绪强度，以可被追问的位置而非英雄结论收束。" },
    ],
  },
  knowledge: {
    title: "知识解释 · 记忆不是录像带",
    logline: "从“记忆会原样回放”的直觉出发，建立编码—情境—提取模型，再把理解迁移到提问与证据保存。",
    fit: "很高匹配",
    runtime: "真实成片 77.333 秒",
    styleId: "whiteboard-explainer",
    palette: ["#1e2933", "#2d6cdf", "#f3f4ed"],
    paletteLabel: "白板黑线 + 单一概念蓝",
    camera: "正视结构，局部缩放只服务概念层级",
    transition: "组件保留，新增关系逐步写入",
    voice: "MiniMax 成熟女声 · neutral · 1.0×",
    rhythm: "误区—模型—机制边界—实验证据—行动迁移",
    rationale: "极简线条降低装饰噪声；概念蓝只追踪当前推理对象，五幅画共享同一视觉语法，让观众看见理解如何一步步成立。",
    template: "whiteboard",
    scenes: [
      { role: "误区 · 激活已有认知", short: "误区", note: "录像带直觉", title: "先让“记忆会原样回放”变得可见", duration: "12 秒", context: "暖白纸上的侧脸", subject: "脑内胶片与连续画格", meaning: "回忆不是按下播放键", purpose: "用观众熟悉的录像比喻建立学习动机，再让破损画格暴露它解释不了的地方。", visual: "胶片穿过人物头部，连续画格逐渐出现缺口；概念蓝只落在胶片。", motion: "黑白稿向蓝色概念层擦入，镜头微幅横移。", narration: "先承认直觉为何自然，再平静指出它把结果误当成机制。" },
      { role: "模型 · 给出最小结构", short: "模型", note: "三段骨架", title: "把经历、情境与提取放进同一条链", duration: "16 秒", context: "三节点白板结构", subject: "注意—情境编码—选择性提取", meaning: "回忆由多环节共同产生", purpose: "先给出能够容纳后续证据的结构，避免堆叠脑科学术语。", visual: "眼睛、神经网络和提取中的细节占据三个固定节点，蓝箭头连接关系。", motion: "三个节点依次显色，已有节点保持位置不动。", narration: "每个环节之后留短停顿，让结构先被看见。" },
      { role: "机制 · 同时交代边界", short: "机制", note: "重建与更新", title: "用碎片重组解释回忆为何会变化", duration: "16 秒", context: "桌面上的记忆碎片", subject: "双手重组照片残片", meaning: "旧信息可能在特定条件下被更新", purpose: "解释重建与更新证据，同时明确它不等于每次提取都会改写、也不等于所有记忆都不可靠。", visual: "同一场景被拆成可见碎片，新的蓝色碎片进入组合但接缝仍保留。", motion: "灰度碎片依次显色，不使用无痕魔法变形。", narration: "结论与限制连续出现，避免观众只记住耸动版本。" },
      { role: "证据 · 对照提问方式", short: "证据", note: "暗示效应", title: "让两种提问产生可比较的回忆路径", duration: "17 秒", context: "同一公园的两次回忆", subject: "开放叙述与带方向提问", meaning: "问题措辞可能影响之后的报告", purpose: "把经典实验洞见迁移到可观察的提问差异，而不是把个体记忆简单判为真假。", visual: "两个人面对同一公园，思考泡与记录本形成左右对照。", motion: "概念蓝沿两条不同路径展开，人物和场景保持不变。", narration: "先说明实验发现，再落到先自由叙述、后非预设提问。" },
      { role: "迁移 · 留下可执行动作", short: "迁移", note: "保存证据层", title: "把理解变成重要事件的记录习惯", duration: "16 秒", context: "桌面的分层档案", subject: "原始照片、录音与当时笔记", meaning: "原始记录与后来回忆分开保存", purpose: "让知识在家庭记录、采访、调查和医疗沟通中变成低门槛行动，而不是重复定义。", visual: "原始照片进入透明档案袋，录音设备与空白笔记分别归档。", motion: "三类证据逐项被概念蓝连接，最后停在清晰的分层结构。", narration: "强调保存、记录、分开三个动词，以操作建议收束。" },
    ],
  },
  children: {
    title: "儿童成长 · 她先学会听风",
    logline: "一个孩子从用力对抗、失败缩小，到观察风、改造方法并带着修补痕迹再次起飞。",
    fit: "高匹配",
    runtime: "真实成片 107.267 秒",
    styleId: "sunlit-storybook",
    palette: ["#6c9a76", "#e9a84d", "#f5dfb0"],
    paletteLabel: "草叶绿 + 阳光橙 + 奶油纸",
    camera: "低机位跟随，动作方向始终清楚",
    transition: "绘本滑页与线稿上色，失败处保留痕迹",
    voice: "MiniMax 甜美女声 · calm · 0.96×",
    rhythm: "愿望—蛮力受挫—观察—主动改造—带痕成长",
    rationale: "暖光绘本让失败保持安全但不轻飘；同一人物和纸鸢贯穿五幕，奖带变尾翼、补丁留在终幕，让成长来自可见行动而不是成人说教。",
    template: "pagebook",
    scenes: [
      { role: "愿望 · 珍惜自己的不整齐", short: "愿望", note: "目标与自我", title: "让歪线成为她愿意带走的东西", duration: "20 秒", context: "春日山坡与旧水塔", subject: "小满和手工燕子纸鸢", meaning: "目标出自自己的手", purpose: "从具体目标开始，同时让观众知道她珍惜纸鸢的不对称，因为那是自己做出的痕迹。", visual: "小满全身、纸鸢和远处水塔构成清楚三角；黄外套是人物锚点。", motion: "线稿从左向右显色，草和布尾只做轻微风向运动。", narration: "温暖但不提前许诺成功，先肯定手作的不完美。" },
      { role: "受挫 · 错误方法产生代价", short: "受挫", note: "蛮力失败", title: "让“更用力”被事实反驳", duration: "22 秒", context: "杨树旁的强风坡", subject: "打结的线与撞树的纸鸢", meaning: "努力不等于方法正确", purpose: "把失败落在清楚因果上：越跑、越拉、线越乱，纸鸢出现可修复的裂口。", visual: "奔跑方向、紧绷线和树枝形成一条冲突路径，水塔保持远景连续。", motion: "滑页后节奏加快，撞树时短暂停住，不做夸张摔倒。", narration: "承认失败被看见时的羞耻，不急着说“没关系”。" },
      { role: "发现 · 从环境重新理解", short: "发现", note: "观察风", title: "答案先藏在芦苇与麻雀里", duration: "21 秒", context: "坡下弯曲的芦苇", subject: "坐着观察的小满与受损纸鸢", meaning: "风不是故意为难她", purpose: "让理解来自孩子自己的观察：芦苇会弯，麻雀会顺势转身，短尾才是失衡原因。", visual: "芦苇、麻雀和纸鸢短尾形成方向押韵；人物从画面中心退开。", motion: "镜头速度降下来，暖色暂时收窄，观察完成后逐步回升。", narration: "语气从收缩变为清楚，只说她看见了什么。" },
      { role: "改造 · 把过去变成材料", short: "改造", note: "主动修补", title: "让奖带从荣誉变成新的尾翼", duration: "24 秒", context: "山坡上的野餐布", subject: "蓝色奖带、补丁与解开的线", meaning: "过去的成功可以服务下一次尝试", purpose: "用一个有代价的选择证明主动性：她剪开自己的奖带，亲手补住裂口、延长尾翼、解开线结。", visual: "手、蓝奖带、右翅补丁和整齐线圈清楚同框，不出现成人的手。", motion: "局部显色依次落在奖带、补丁和线圈，最后保留所有修复痕迹。", narration: "强调“再试一次”，不把牺牲英雄化。" },
      { role: "成长 · 方法真正改变", short: "成长", note: "坚持与松手", title: "风没有变温柔，她改变了动作", duration: "20 秒", context: "再次越过水塔的风", subject: "带补丁和长尾翼的纸鸢", meaning: "成长是更准确地行动", purpose: "用“先松、再收”的新动作完成变化；成功只占结尾一部分，修补痕迹和不对称仍然可见。", visual: "小满位于低处，线构成通向高空纸鸢的强对角；蓝尾翼与红布尾共同保持平衡。", motion: "绘本滑页后缓慢拉远，末尾停在松线的手而非胜利姿势。", narration: "不说“我赢了”，把判断落在什么时候坚持、什么时候松手。" },
    ],
  },
  brand: {
    title: "品牌起源 · 把瑕疵留在正面",
    logline: "一把开裂的椅子，让林又把“可见修补、责任可以返回”从个人选择变成品牌工艺。",
    fit: "高匹配",
    runtime: "真实成片 134.000 秒",
    styleId: "organic-contour-doodle",
    palette: ["#294a3d", "#df8062", "#f1e2c8"],
    paletteLabel: "森林绿 + 珊瑚修补 + 原木与原纸",
    camera: "竖屏材料近景与人物关系交替，轻微横移",
    transition: "同一把弯木椅与珊瑚榫贯穿五幕",
    voice: "MiniMax 真诚青年 · calm · 0.98×",
    rhythm: "问题—选择—工艺—证据—邀请",
    rationale: "有机轮廓和回收纸肌理让材料与责任保持可见；同一处修补从冲突、工艺、复检延伸到开放修理台，价值由可复查行动而非口号成立。",
    template: "handdrawn",
    scenes: [
      { role: "问题 · 完美表面失效", short: "问题", note: "裂缝出现", title: "先让产品的裂缝质问品牌", duration: "25.86 秒", context: "林又的木工工作室", subject: "售出十一个月的弯木椅", meaning: "价值不能只存在于完美时", purpose: "从真实故障而不是创始人口号开始，让是否遮住裂缝成为可以付出代价的选择。", visual: "林又、裂缝和买方递来的白色漆样构成冲突，品牌标志不出现。", motion: "竖屏轻微横移，先看裂缝，再看人物判断。", narration: "陈述事实，不提前赞美创始人。" },
      { role: "选择 · 修补保持可见", short: "选择", note: "珊瑚色蝴蝶榫", title: "拒绝伪装完整，也拒绝直接丢弃", duration: "26.29 秒", context: "第一张修理台", subject: "两枚跨过裂缝的蝴蝶榫", meaning: "材料失效与继续负责同时可见", purpose: "让品牌原则来自一次具体、并不省事的处理，而不是事后提炼的价值词。", visual: "珊瑚色只落在蝴蝶榫，裂纹与旧木色仍清楚。", motion: "镜头沿工具台移动，停在修补接缝。", narration: "说明选择与代价，不把修补浪漫化。" },
      { role: "工艺 · 原则进入系统", short: "工艺", note: "步骤可复查", title: "把一次选择变成别人能执行的流程", duration: "27.54 秒", context: "开放的工艺工作台", subject: "检查、匹配、干装、连接、复测", meaning: "审美承诺转为可复查工艺", purpose: "证明原则可以被学徒解释和重复，也保留材料样本与未知风险。", visual: "同一把椅子处于工序中心，工具与样本围绕展开。", motion: "流程按空间顺序横移，不用悬浮图标替代真实工序。", narration: "动词优先，明确哪些仍然未知。" },
      { role: "证据 · 承诺接受复检", short: "证据", note: "一年后返回", title: "让普通脚垫而不是赞美承担证明", duration: "26.98 秒", context: "一年后的维修下午", subject: "完好的蝴蝶榫与磨损脚垫", meaning: "承诺是问题出现后仍愿意回来", purpose: "不用虚构销量或用户赞词；通过同一椅子的复检说明修补边界和后续责任。", visual: "老人重新坐下，林又检查椅脚，珊瑚榫保持可见。", motion: "从榫移动到脚垫，再回到受力测试。", narration: "说明有限证据，不使用“永远不坏”。" },
      { role: "邀请 · 责任可以返回", short: "邀请", note: "开放修理台", title: "让用户带着旧物进入下一段关系", duration: "27.34 秒", context: "工作室门口的开放修理台", subject: "椅子、台灯、木盒与小凳", meaning: "只修需要修的部分", purpose: "把结尾变成可执行参与方式；公开痕迹不等于把瑕疵装饰化。", visual: "林又与邻里围绕工作台判断物件，修补后的椅子仍在画面中。", motion: "镜头向门口和人群轻移，最后停在可返回的工作台。", narration: "邀请而不催促，以时间留在正面收束。" },
    ],
  },
  poetic: {
    title: "诗性独白 · 潮水把名字还给岸",
    logline: "沈慧回到地图上已经无名的旧渡口，在新桥、潮水与一根朱红线之间重新理解记住与占有的边界。",
    fit: "高匹配",
    runtime: "真实成片 127.633 秒",
    styleId: "ink-wash",
    palette: ["#283034", "#8a4439", "#e7e1d3"],
    paletteLabel: "浅青瓷 + 炭灰 + 单一褪色朱红",
    camera: "纸上竖幅转向河岸横幅，固定构图与极慢漂移",
    transition: "米白淡入淡出，让画幅变化成为记忆与现实的边界",
    voice: "MiniMax 抒情男声 · calm · 0.94×",
    rhythm: "意象—回声—反差—空白—余味",
    rationale: "水墨留白允许观众进入但不替故事逃避判断；渡口、桥、录音机与朱红线反复出现，意义从追索旧名转向允许地点继续变化。",
    template: "mood-mv",
    scenes: [
      { role: "意象 · 名字缺席", short: "意象", note: "无名渡口", title: "让新桥先被地图记住", duration: "22.58 秒", context: "二十七年后的旧渡口", subject: "沈慧、石阶与录音机", meaning: "缺名不等于地点已经消失", purpose: "不急着宣布失去，让今日的水声先进入画面和录音。", visual: "竖幅人物置于石阶下方，雾与空水占据多数画面。", motion: "纸上画幅几乎静止，米白空间保留观看距离。", narration: "平静陈述地图与现场的差异，不索取同情。" },
      { role: "回声 · 记忆不是证据", short: "回声", note: "朱红线振动", title: "让一根线连接感受，却不冒充证明", duration: "25.75 秒", context: "系船环旁的潮水", subject: "朱红线与现场录音", meaning: "机器只收下此刻的风和潮", purpose: "承认母亲与童年的记忆，同时划清记忆不能要求河岸不变的边界。", visual: "沈慧蹲在水边，红线通向涟漪，人物仍被大片留白包围。", motion: "第二张纸幅淡入，环境声贴在旁白下方。", narration: "提到母亲时不升高情绪，结论回到今天。" },
      { role: "反差 · 速度与等待", short: "反差", note: "桥上与桥下", title: "不让怀旧把便利写成背叛", duration: "27.71 秒", context: "现代桥投下的长影", subject: "桥影、旧阶与等候的人", meaning: "速度和停留都曾保护人", purpose: "承认新桥带来的上学、看病与归家，不用私人怀念要求他人退回迟缓。", visual: "横幅展开，桥跨过大面积空水，朱红线连接旧桩与桥影。", motion: "极慢横移，车流只作为稀薄墨痕。", narration: "把两种经验并置，不选胜负。" },
      { role: "空白 · 放弃占有", short: "空白", note: "石面不刻字", title: "把准备好的名字留在包里", duration: "24.90 秒", context: "稍微放晴的石阶", subject: "空白石面与收回的刻刀", meaning: "保存也可能变成占有", purpose: "用不刻字这个行动停止解释，让她无需陌生人的确认也能承认自己的经历。", visual: "人物、录音机与线圈缩在画面左侧，空石与空天占据中心。", motion: "画面近乎静止，只保留低频河岸声。", narration: "句间留白加长，在“占有”后收住。" },
      { role: "余味 · 允许继续变化", short: "余味", note: "潮水覆阶", title: "带走线索，不把渡口恢复成童年", duration: "26.71 秒", context: "傍晚涨潮的渡口", subject: "收回录音机的沈慧", meaning: "记住也可以给变化留余地", purpose: "旧渡口不复原，新桥不退场；把收束落在承担变化，而不是一句万能治愈。", visual: "沈慧向上离开并回望一次，朱红线已缠回录音机，水覆盖末级石阶。", motion: "横幅极慢漂移并淡回米白，不留下物件。", narration: "最后一句放慢，环境声继续几秒。" },
    ],
  },
  classical: {
    title: "古诗词场景 · 忆江南 / 枫桥夜泊",
    logline: "同一套诗词能力可根据文本选择鲜明或克制效果：默认让《忆江南》的日出、花红和春水绿成为一条可观看的记忆路径，也可切换《枫桥夜泊》夜色对照。",
    fit: "很高匹配",
    runtime: "明亮 116 秒 / 夜色 116 秒",
    styleId: "inked-storybook",
    palette: ["#e84d2a", "#159a86", "#f4e3b2"],
    paletteLabel: "日出朱红 + 花红珊瑚 + 孔雀绿春水 + 暖宣纸",
    camera: "水乡全景 → 小舟进入 → 日出光路 → 红绿近景 → 远舟回望",
    transition: "暖宣纸淡化与慢速水路推进；切换夜色版则回到冷墨与声音收束",
    voice: "MiniMax 抒情中文声线 · happy · 0.95×",
    rhythm: "赞叹—熟悉—日出—红绿对照—回望",
    rationale: "鲜明效果必须能从原文解释：朱红来自日出与江花，蓝绿来自春水，“旧曾谙”再把景物变成记忆；保留夜色版用于证明古诗词没有固定色调。",
    template: "mood-mv",
    scenes: [
      { role: "赞叹 · 空间先打开", short: "赞叹", note: "江南好", title: "先让“好”成为一处可以进入的明亮水乡", duration: "26.53 秒", context: "春晨江南水巷", subject: "拱桥、白墙黛瓦、花树与小舟", meaning: "三个字先建立整体感受", purpose: "避免用抽象形容词或旅游口号代替诗境，让水路与屋舍先给出空间证据。", visual: "同一桥、同一舟与青蓝衣回望者建立全景锚点；暖金晨雾、湖蓝天光和孔雀绿水面共同打开画面。", motion: "由暖宣纸显影，镜头沿水路缓慢推进。", narration: "朗读词牌和开篇，再说明‘好’如何先成为空间。" },
      { role: "熟悉 · 风景进入记忆", short: "熟悉", note: "旧曾谙", title: "进入水巷，让观看者的回望解释熟悉感", duration: "21.29 秒", context: "同一座桥后的白墙水巷", subject: "同一小舟与略微回头的人", meaning: "风景不是第一次见，而是身体曾经知道", purpose: "把‘谙’落实为视角，不把人物生成成白居易历史肖像。", visual: "桥仍可追踪，舟与人物靠近，岸边小人物只提供生活尺度。", motion: "镜头跟舟进入，建筑从两侧掠过但不快切。", narration: "在‘谙’后停顿，说明记忆与实景复原的区别。" },
      { role: "日出 · 颜色获得光源", short: "日出", note: "朱红与金光", title: "让朱红太阳和水面光路真正点亮江花", duration: "23.21 秒", context: "远山、屋脊与春水", subject: "日轮、金色反光与小舟", meaning: "鲜明色彩由光线产生，不是滤镜", purpose: "为‘红胜火’建立视觉因果，避免孤立红色装饰。", visual: "同一城镇地理保持，朱红日轮从远山升起，金光沿孔雀绿水面抵近小舟。", motion: "慢速向光路靠近，水面亮度逐步提升。", narration: "先说‘日出’，再解释它为什么是下一句的光源。" },
      { role: "对照 · 花红水绿", short: "对照", note: "红胜火 / 绿如蓝", title: "让珊瑚红花与孔雀绿春水形成最强视觉证据", duration: "22.25 秒", context: "花树贴近的同一河段", subject: "近景江花、分层水色与小舟", meaning: "词中的颜色关系达到峰值", purpose: "同时保留水里的湖蓝、岸绿和高光，避免把江水做成单一色块。", visual: "花枝靠近画面一侧，桥和白墙仍在中远景；红绿鲜明但由暖宣纸和黛瓦压住。", motion: "缓慢横移穿过花枝，水面高光持续流动。", narration: "完整朗读红绿对句，并逐层解释颜色。" },
      { role: "回望 · 鲜明成为记忆", short: "回望", note: "能不忆江南", title: "让小舟远去，颜色仍清晰地留在视野里", duration: "23.14 秒", context: "稍远的水乡全景", subject: "离开的舟、同一桥、花树与春水", meaning: "反问来自曾经生活过的清晰经验", purpose: "不替反问给答案，让鲜明从景观转为记忆的持久度。", visual: "舟变小并回望一次，边缘略回到暖宣纸，中心红花绿水仍清晰。", motion: "镜头极慢拉远，不淡成灰色。", narration: "末句后留一点春水环境声，不做结论口号。" },
    ],
  },
  technology: {
    title: "科技人文 · 停电以后，我看见了电",
    logline: "用一次真实停电让电从背景变成主角，再沿可控电流、电磁感应与供电系统，理解它为何让现代生活和其他发明同时运转。",
    fit: "很高匹配",
    runtime: "真实成片 115.83 秒",
    styleId: "colored-pencil-diary",
    palette: ["#101a35", "#b8663b", "#54c7d9"],
    paletteLabel: "午夜靛蓝 → 应急灯琥珀 → 铜线橙与电弧青 → 黎明暖白",
    camera: "同一房间首尾闭环；依赖网络拉远；历史装置与系统横向展开",
    transition: "停电硬落黑 → 技术蓝晒显影 → 复电暖白回归",
    voice: "MiniMax 真诚成年普通话 · neutral · 0.96×",
    rhythm: "缺席—依赖显影—发现—成网—复电回望",
    rationale: "先让身体经验提出问题，再用装置和系统回答；彩铅保留私人感受，蓝晒与铜线承担技术关系，事实日期由确定性文字层写入。",
    template: "handdrawn",
    scenes: [
      { role: "缺席 · 身体先知道", short: "缺席", note: "闷热与静默", title: "不是先解释电，而是让它突然消失", duration: "20.89 秒", context: "凌晨停电的公寓", subject: "停止的风扇、空调与路由器", meaning: "缺席让基础设施第一次有形", purpose: "把焦虑落在闷热、倒计时和突然消失的电器底噪上，不制造灾难奇观。", visual: "同一人物坐在床边，手机只照亮很小范围；午夜靛蓝压住应急灯琥珀。", motion: "从黑场缓慢显影，镜头几乎不动，静止的风扇成为视觉锚点。", narration: "第一人称、克制；先说身体感受，再说电的缺席。" },
      { role: "显影 · 看见依赖", short: "显影", note: "现代连接", title: "让一间房扩展成一张依赖网络", duration: "20.27 秒", context: "公寓与城市剖面", subject: "制冷、通信、冷藏、泵与电梯", meaning: "电把日常系统连接起来", purpose: "不把每项影响说成必然；用‘可能’提示备用电源、建筑与地区差异。", visual: "复用人物和房间，铜线与电弧青只追踪墙体、街道和设施之间的关系。", motion: "镜头拉远到城市剖面，系统线逐条出现但不做悬浮 UI。", narration: "像列出一张逐渐被看见的清单，在限定词处说清边界。" },
      { role: "发现 · 从现象到机制", short: "发现", note: "1800 / 1831", title: "两件装置连接连续电流与发电机原理", duration: "23.57 秒", context: "匿名历史实验台", subject: "伏打电堆与法拉第环形线圈", meaning: "电是许多人长期追问的结果", purpose: "用 1800 年连续电流和 1831 年电磁感应建立发明链，不把电归于某位单一英雄。", visual: "匿名双手、金属片、湿隔层、铁环与铜线；无名人肖像和生成文字。", motion: "沿桌面从电堆移向环形线圈，确定性年代卡先后出现。", narration: "事实句简洁，明确‘不是某个人在某个夜晚突然发明’。" },
      { role: "成网 · 装置进入社会", short: "成网", note: "1880s 系统", title: "把灯泡放回发电、配电与输电之中", duration: "25.18 秒", context: "十九世纪八十年代供电剖面", subject: "灯、发电机、配电与街区", meaning: "真正改变世界的是协作系统", purpose: "承认实用照明的重要，同时让集中供电与交流输电说明为什么电能够普及。", visual: "匿名工人贯穿灯具工位、机房、变压设备和街区；导线构成清楚阅读路径。", motion: "横向穿过‘使用—发电—配电—街区’，不做英雄式中心构图。", narration: "使用‘许多人继续改进’，拒绝虚构唯一发明者。" },
      { role: "回望 · 系统重新有声", short: "回望", note: "复电与维护者", title: "让同一间房恢复声音，但改变观看方式", duration: "25.94 秒", context: "黎明前复电的公寓", subject: "转动的风扇、路由器和亮起的城市", meaning: "电让其他发明同时醒来", purpose: "把‘最伟大’保留为主人公观点，并让维护网络的人进入结尾。", visual: "严格复用首幕房间；靛蓝转向暖白，人物触摸风而非胜利欢呼。", motion: "风扇先转、网络灯后亮、城市低声恢复，最终停在窗外的连接线上。", narration: "由‘我相信’标注主观判断，最后一句落到系统维护者。" },
    ],
  },
};

const storyFitSamples = {
  memory: "整理母亲留下的旧相册时，我发现一张从未见过的全家福。照片背后的日期和家人的记忆并不一致。我想讲清事实，也想留下她为什么珍惜这张照片。",
  knowledge: "为什么睡眠会影响记忆？我希望用一个简单模型解释信息如何被编码、巩固和提取，再比较熬夜与正常睡眠的数据，最后给学生可执行的复习方法。",
  children: "十岁的小满第一次独自放纸鸢。她越用力奔跑，线却越乱。失败后，她观察芦苇和麻雀，自己改造尾翼，学会什么时候坚持、什么时候松手。",
  mystery: "封存二十年的事故档案里，值班钟仍然准时运行。调查员沿着钥匙、鞋印和旧录音追踪，发现原报告遗漏了一名被救出的孩子，但违规进入也必须被记录。",
  brand: "一家修理家具的小工作室收到开裂的椅子。创始人拒绝用油漆遮住裂缝，改用可见榫接，并把检查、材料匹配和复测写进工艺，让顾客以后仍能带着问题回来。",
  poetic: "多年以后，我回到涨潮的旧渡口。新桥已经通车，地图上却没有旧名字。我带着一台录音机，想知道记忆该如何留下，又不把今天变回过去。",
  classical: "我想介绍白居易的《忆江南·江南好》：日出为什么让江花红胜火，春水为什么绿如蓝，以及‘旧曾谙’如何把鲜明风景变成能够回望的记忆。",
  technology: "昨晚半夜突然停电，空调和风扇都停了，闷热让我夜不能寐。那一刻我发现现代生活离不开电，也想从伏打、法拉第到发电、输电和电网，讲清电为什么可能是人类最伟大的发明之一。",
};

const storyFitProfiles = {
  memory: {
    label: "家庭记忆",
    bestFor: "家庭物件、代际关系、失去与保存",
    risk: "不要让生成画面取代历史证据，也不要用团聚幻象抹平真实缺席。",
    groups: [
      { label: "家庭关系", weight: 20, terms: ["母亲", "父亲", "妈妈", "爸爸", "奶奶", "爷爷", "家人", "家庭", "外孙", "祖父", "祖母"] },
      { label: "记忆物件", weight: 17, terms: ["相册", "照片", "旧信", "遗物", "盒子", "日记", "手表", "纪念", "收藏"] },
      { label: "失去与保存", weight: 14, terms: ["记忆", "想念", "离开", "离别", "团聚", "留下", "保存", "多年以后", "回家"] },
    ],
  },
  knowledge: {
    label: "知识解释",
    bestFor: "机制、模型、教程、研究与行动方法",
    risk: "避免用漂亮图解掩盖证据等级；结论、限制和来源必须一起进入脚本。",
    groups: [
      { label: "解释意图", weight: 21, terms: ["为什么", "如何", "原理", "机制", "解释", "理解", "原因", "意味着"] },
      { label: "模型与证据", weight: 17, terms: ["模型", "数据", "研究", "实验", "比较", "证据", "科学", "记录"] },
      { label: "学习迁移", weight: 13, terms: ["方法", "步骤", "教程", "学生", "学习", "复习", "建议", "执行"] },
    ],
  },
  children: {
    label: "儿童成长",
    bestFor: "孩子通过行动、失败和再尝试完成变化",
    risk: "不要让成人替孩子说出结论；成长必须由新的行动方式证明。",
    groups: [
      { label: "儿童主体", weight: 22, terms: ["孩子", "儿童", "小孩", "女孩", "男孩", "十岁", "九岁", "八岁", "同学", "小满"] },
      { label: "尝试与成长", weight: 18, terms: ["第一次", "尝试", "失败", "学会", "成长", "改造", "观察", "再试", "勇气"] },
      { label: "行动世界", weight: 12, terms: ["学校", "朋友", "游戏", "纸鸢", "风筝", "老师", "比赛", "手工"] },
    ],
  },
  mystery: {
    label: "悬疑档案",
    bestFor: "异常、调查、证据改义与责任收束",
    risk: "反转必须能回看旧线索；真实案件还需要隐私、法律与来源审阅。",
    groups: [
      { label: "调查证据", weight: 20, terms: ["调查", "线索", "证据", "钥匙", "鞋印", "录音", "口供", "物证", "追踪"] },
      { label: "异常与疑点", weight: 18, terms: ["异常", "失踪", "疑点", "真相", "不可能", "秘密", "遗漏", "反转", "封条"] },
      { label: "档案责任", weight: 14, terms: ["档案", "报告", "事故", "封存", "记录", "违规", "责任", "公开"] },
    ],
  },
  brand: {
    label: "品牌起源",
    bestFor: "创始选择、产品工艺、承诺与用户关系",
    risk: "不要虚构销量、认证或用户赞词；品牌主张必须落到可核验的选择和边界。",
    groups: [
      { label: "品牌与用户", weight: 20, terms: ["品牌", "创始人", "顾客", "用户", "工作室", "公司", "门店", "服务"] },
      { label: "产品与工艺", weight: 18, terms: ["产品", "工艺", "材料", "修理", "制作", "榫", "设计", "复测", "质量"] },
      { label: "价值选择", weight: 15, terms: ["选择", "承诺", "责任", "拒绝", "代价", "原则", "透明", "回来", "可见"] },
    ],
  },
  poetic: {
    label: "诗性独白",
    bestFor: "地点记忆、散文独白、重复意象与开放余味",
    risk: "留白不能代替观点；诗性表达仍要避免占有他人的地点、经历与历史。",
    groups: [
      { label: "自然与地点意象", weight: 19, terms: ["河", "潮", "渡口", "岸", "桥", "雾", "风", "月", "雨", "水", "故乡"] },
      { label: "时间与回望", weight: 16, terms: ["多年以后", "回到", "回望", "过去", "名字", "时间", "等待", "离开", "记忆"] },
      { label: "独白与留白", weight: 15, terms: ["我", "沉默", "空白", "梦", "声音", "录音机", "散文", "独白", "余地"] },
    ],
  },
  classical: {
    label: "古诗词场景",
    bestFor: "原文朗诵、逐句意象、空间关系与声音赏析",
    risk: "不要把逐字配图当作理解，也不要把艺术化人物、服饰和建筑当作历史复原。",
    groups: [
      { label: "诗词原文", weight: 24, terms: ["古诗", "诗词", "唐诗", "诗句", "忆江南", "江南好", "日出", "江花", "春水", "红胜火", "绿如蓝", "枫桥夜泊", "月落", "乌啼", "江枫", "渔火", "寒山寺", "钟声"] },
      { label: "场景赏析", weight: 17, terms: ["原文", "作者", "朗诵", "意象", "场景", "逐句", "赏析", "注释", "诗境"] },
      { label: "空间与声音", weight: 15, terms: ["夜半", "客船", "寺院", "江", "桥", "月", "霜", "水", "声音", "远处"] },
    ],
  },
  technology: {
    label: "科技人文",
    bestFor: "亲历事件、基础设施、发明史、系统影响与个人观点",
    risk: "不要把电归于单一英雄，也不要把个人感受、生成画面或建筑特例冒充普遍历史事实。",
    groups: [
      { label: "停电体验", weight: 23, terms: ["停电", "断电", "来电", "复电", "闷热", "燥热", "空调", "风扇", "夜不能寐", "焦虑"] },
      { label: "电力系统", weight: 21, terms: ["电", "电力", "电网", "发电", "输电", "配电", "电流", "交流电", "直流电", "基础设施"] },
      { label: "发明与社会", weight: 17, terms: ["发明", "普及", "依赖", "现代生活", "伟大", "伏打", "法拉第", "爱迪生", "特斯拉", "工程师"] },
    ],
  },
};

const knowledgePresets = {
  science: {
    topic: "为什么天空是蓝色的？",
    audience: "初中生",
    duration: "90",
    objective: "看完后，观众能够用光的散射解释白天天空偏蓝，并说明日落时颜色变化为什么与传播距离有关。",
    misconception: "天空呈蓝色是因为它反射了海水的颜色。",
    entry: "先比较正午蓝天与傍晚红霞：同一束太阳光，为什么会留下不同颜色？",
    evidence: "太阳光包含多种可见光；光进入大气后会与远小于波长的粒子发生瑞利散射；较短波长通常散射更强；日落时阳光穿过的大气路径更长。",
  },
  culture: {
    topic: "一首古诗如何构建空间？——《枫桥夜泊》",
    audience: "小学高年级",
    duration: "90",
    objective: "看完后，观众能够从月落、江枫、渔火、城外寺院和抵达客船的钟声，说明诗如何组织近景、远景与听觉空间。",
    misconception: "把每句诗逐字配成一张图，就等于理解了诗境。",
    entry: "先闭眼听一声从远处抵达船边的钟声，再追问声音经过了怎样的空间。",
    evidence: "原诗四句：月落乌啼霜满天，江枫渔火对愁眠。姑苏城外寒山寺，夜半钟声到客船。可直接观察天时、近岸物象、人物视角、城外寺院与声音抵达。",
  },
  system: {
    topic: "为什么一次停电会让现代系统显形？",
    audience: "普通公众",
    duration: "180",
    objective: "看完后，观众能够从一间房追踪发电、输电、变电、配电和设备使用，并区分本地设备电量与上游基础设施供电。",
    misconception: "停电只意味着灯不亮，手机有电就代表通信不会受影响。",
    entry: "午夜里风扇、空调和路由器同时沉默，身体先于知识意识到电的缺席。",
    evidence: "家庭设备依赖建筑和社区配电；手机可以由电池短时工作，但移动通信还依赖基站、传输链路与机房；不同建筑和地区的备用电源、恢复顺序并不相同。",
  },
};

const knowledgeRuntime = { preset: "science", view: "story", beat: 0, plan: null };
const KNOWLEDGE_STUDIO_ORIGINS = ["http://127.0.0.1:8791", "http://127.0.0.1:8789"];
const KNOWLEDGE_STUDIO_PATH = "/demos/story-to-handdrawn-video/studio.html";

function cleanKnowledgeText(value, fallback = "") {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  return clean || fallback;
}

function clipKnowledgeText(value, length = 62) {
  const clean = cleanKnowledgeText(value);
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
}

function escapeKnowledgeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function readKnowledgeBrief() {
  return {
    topic: cleanKnowledgeText($("#knowledge-topic").value),
    audience: cleanKnowledgeText($("#knowledge-audience").value, "普通公众"),
    duration: Number($("#knowledge-duration").value || 90),
    objective: cleanKnowledgeText($("#knowledge-objective").value),
    misconception: cleanKnowledgeText($("#knowledge-misconception").value, "观众可能把表面现象直接当成原因。"),
    entry: cleanKnowledgeText($("#knowledge-entry").value, "从一个可以被观察、听见或亲身感受到的日常问题进入。"),
    evidence: cleanKnowledgeText($("#knowledge-evidence").value),
  };
}

function knowledgeBlueprint(recipe) {
  if (recipe === "classical") return [
    ["听见", "从声音或一句原文进入"], ["定位", "建立天时与观察位置"], ["意象", "让物象形成关系"], ["空间", "连接近景、远景与人物"], ["回望", "回到原文验证理解"],
  ];
  if (recipe === "technology") return [
    ["亲历", "让系统的缺席先被感到"], ["显影", "列出被连接的日常依赖"], ["机制", "解释核心技术关系"], ["成网", "从装置扩展到公共系统"], ["回望", "带着边界重新看日常"],
  ];
  if (recipe === "children") return [
    ["任务", "让孩子遇到真实问题"], ["误判", "保留失败而不代替决定"], ["观察", "从环境获得新线索"], ["再试", "用行动验证新理解"], ["迁移", "让改变在新任务中成立"],
  ];
  return [
    ["问题", "从可感知现象提出问题"], ["误解", "让旧解释接受检验"], ["机制", "建立核心因果或结构"], ["证据", "用材料限定结论"], ["迁移", "在新情境中重新解释"],
  ];
}

function buildKnowledgeProductionContract(recommendation, recipe) {
  const presentationByStory = {
    classical: "poetic",
    poetic: "poetic",
    knowledge: "handdrawn",
    technology: "handdrawn",
    children: "handdrawn",
    memory: "handdrawn",
    mystery: "standard",
    brand: "standard",
  };
  const presentation = presentationByStory[recommendation.key] || "standard";
  return {
    schema: "knowledge-video-production-contract/v1",
    id: `pc-${recommendation.key}-${Date.now().toString(36)}`,
    source: "research-page",
    story: {
      recipe: recommendation.key,
      label: recipe.title,
      structure: "five-act-learning-arc",
      rhythm: recipe.rhythm,
    },
    visual: {
      style_id: recipe.styleId,
      style_label: styles.find((item) => item.id === recipe.styleId)?.name || recipe.styleId,
      palette: recipe.palette,
      palette_label: recipe.paletteLabel,
      camera: recipe.camera,
      continuity: "五幕复用同一主体、空间规则、色盘、画材和线条语言；只改变教学所需关系。",
      prompt_prefix: `${recipe.title}；${recipe.paletteLabel}；${recipe.camera}；统一画材与主体连续性；画面内不得出现文字、水印、标志或伪文字。`,
    },
    presentation: {
      recipe: presentation,
      label: presentation === "poetic" ? "诗性长卷" : presentation === "handdrawn" ? "手绘显色" : "基础镜头合成",
      transition: recipe.transition,
      subtitles: presentation === "poetic" ? "poetic-safe-area" : "narration-safe-area",
    },
    routing: {
      quality_tier: "automatic",
      story_provider: "MiniMax text",
      image_provider: "MiniMax Image",
      tts_provider: "MiniMax Speech",
      renderer: "story-to-handdrawn-video + FFmpeg",
      curated_upgrade: "Codex agent-assisted final visual",
    },
    quality: {
      consistency_policy: "single-visual-bible",
      review_gates: ["story", "visual-continuity", "pseudo-text", "facts", "playback"],
    },
  };
}

function buildKnowledgePlan(brief) {
  const fitText = `${brief.topic} ${brief.objective} ${brief.misconception} ${brief.entry} ${brief.evidence}`;
  const ranking = scoreStoryFit(fitText);
  const recommendation = ranking[0];
  const recipe = directorPresets[recommendation.key];
  const blueprint = knowledgeBlueprint(recommendation.key);
  const evidenceParts = brief.evidence.split(/[。；;\n]/).map((item) => item.trim()).filter(Boolean);
  const factAnchor = evidenceParts.slice(0, 2).join("；") || brief.evidence;
  const seconds = [0.16, 0.18, 0.27, 0.21, 0.18].map((ratio) => Math.round(brief.duration * ratio));
  const entries = [
    {
      title: `从“${clipKnowledgeText(brief.entry, 34)}”提出问题`,
      purpose: `让${brief.audience}先产生可回答的问题，不在开场直接宣布结论。`,
      visual: `用一个具体场景表现：${brief.entry}`,
      narration: `先描述可观察现象，再提出“${brief.topic}”这个问题。`,
      evidence: "这一幕只建立观察，不把生成画面当作事实证明。",
    },
    {
      title: `让误解“${clipKnowledgeText(brief.misconception, 34)}”接受检验`,
      purpose: "把观众已有解释摆到台面上，说明它能解释什么、又遗漏了什么。",
      visual: "并列旧解释与一个无法被旧解释覆盖的反例，不使用嘲讽式错误标记。",
      narration: `准确复述常见误解，再用一个追问打开缺口：${brief.misconception}`,
      evidence: "误解来自学习设计假设，发布前应由真实受众或教师确认。",
    },
    {
      title: `建立“${clipKnowledgeText(brief.topic, 36)}”的核心关系`,
      purpose: `完成本片最重要的学习目标：${brief.objective}`,
      visual: `使用${recipe.paletteLabel}，只让必要对象、路径和前后关系进入画面。`,
      narration: "每句话只推进一个概念；先说关系，再补术语，避免用比喻替代机制。",
      evidence: factAnchor,
    },
    {
      title: "把核心关系放回证据与适用条件",
      purpose: "让观众知道结论从哪里来、在哪些条件下成立，以及哪些部分仍需来源审阅。",
      visual: "事实卡、原文或材料片段与解释画面并置；确定性文字层承担名称、数字和出处。",
      narration: `引用或转述材料依据：${clipKnowledgeText(brief.evidence, 88)}`,
      evidence: brief.evidence,
    },
    {
      title: `让${brief.audience}在新情境中重新解释`,
      purpose: "不重复口号，而是要求观众用刚建立的关系判断一个相邻问题。",
      visual: "回到首幕场景并改变一个条件，让首尾画面形成可以被解释的差异。",
      narration: `用一句可检验的学习承诺收束：${brief.objective}`,
      evidence: "通过理解题检查概念、误解修正和迁移，而不是只问是否喜欢视频。",
    },
  ];
  const beats = entries.map((entry, index) => ({
    index: index + 1,
    role: blueprint[index][0],
    roleGoal: blueprint[index][1],
    seconds: seconds[index],
    ...entry,
  }));
  const questions = [
    { type: "核心概念", question: `不用复述视频，你会怎样向同学解释“${brief.topic}”？`, answer: `回答应包含学习目标要求的核心关系：${brief.objective}` },
    { type: "误解修正", question: `为什么“${brief.misconception}”这个说法不够完整？`, answer: `应指出旧解释遗漏的条件或关系，并至少引用一项材料：${factAnchor}` },
    { type: "迁移应用", question: "如果首幕场景中的一个条件发生变化，你会先检查什么，再得出结论？", answer: "先识别发生变化的条件，再用核心关系作出预测，最后说明需要什么证据验证，而不是只套用结论。" },
  ];
  const boundaries = {
    fact: brief.evidence,
    viewpoint: `“${brief.objective}”是本片的教学解释目标；其中的价值判断和因果表述需要与材料逐项对应。`,
    art: `${recipe.title}提供视觉组织方法；人物、空间、颜色和转场用于帮助理解，不自动等于历史照片、科学观测或真实个案。`,
    review: "发布前核对原始来源、术语、数字、适用条件、版权和受众难度；医学、法律、安全等高风险主题必须由专业人员审阅。",
  };
  const production = [
    `锁定受众：${brief.audience}；成片目标 ${brief.duration} 秒`,
    `五幕脚本与旁白审阅，预计 ${beats.map((beat) => beat.seconds).join(" / ")} 秒`,
    `视觉处方：${recipe.title}；风格 ${recipe.styleId}`,
    "Codex/图像供应商生成分镜；逐幕检查文字、水印、连续性和事实错位",
    `MiniMax TTS 建议：${recipe.voice}；Key 仅在运行时注入`,
    "字幕、来源卡、理解题与横屏/竖屏导出；最终人工审片后发布",
  ];
  const productionContract = buildKnowledgeProductionContract(recommendation, recipe);
  return {
    schema: "knowledge-video-plan/v1",
    brief,
    recommendation: { key: recommendation.key, label: storyFitProfiles[recommendation.key].label, score: recommendation.score, style: recipe.styleId, rationale: fitExplanation(recommendation) },
    ranking: ranking.map((item) => ({ key: item.key, label: item.profile.label, score: item.score })),
    learningPromise: `${brief.audience}看完后，不只记住“${brief.topic}”，还能够：${brief.objective}`,
    beats,
    boundaries,
    questions,
    production,
    productionContract,
  };
}

function renderKnowledgeBeat() {
  const plan = knowledgeRuntime.plan;
  if (!plan) return;
  const beat = plan.beats[knowledgeRuntime.beat];
  $("#knowledge-beat-index").textContent = `${String(beat.index).padStart(2, "0")} / 05`;
  $("#knowledge-beat-role").textContent = `${beat.role} · ${beat.seconds} 秒`;
  $("#knowledge-beat-title").textContent = beat.title;
  $("#knowledge-beat-purpose").textContent = `${beat.roleGoal}。${beat.purpose}`;
  $("#knowledge-beat-visual").textContent = beat.visual;
  $("#knowledge-beat-narration").textContent = beat.narration;
  $("#knowledge-beat-evidence").textContent = beat.evidence;
  $$('[data-knowledge-beat]').forEach((button, index) => button.setAttribute("aria-selected", String(index === knowledgeRuntime.beat)));
}

function setKnowledgeView(view, focus = false) {
  knowledgeRuntime.view = view;
  $$('[data-knowledge-view]').forEach((button) => {
    const active = button.dataset.knowledgeView === view;
    button.setAttribute("aria-selected", String(active));
    if (active && focus) button.focus();
  });
  ["story", "trust", "check", "production"].forEach((key) => { $(`#knowledge-${key}-panel`).hidden = key !== view; });
}

function renderKnowledgePlan(plan) {
  knowledgeRuntime.plan = plan;
  knowledgeRuntime.beat = 0;
  $("#knowledge-plan").dataset.recipe = plan.recommendation.key;
  $("#knowledge-plan-status").textContent = "PLAN READY · 5 ACTS";
  $("#knowledge-plan-title").textContent = plan.brief.topic;
  $("#knowledge-plan-summary").textContent = `${plan.brief.audience} · ${plan.brief.duration} 秒 · ${plan.recommendation.rationale}`;
  $("#knowledge-recipe-name").textContent = plan.recommendation.label;
  $("#knowledge-recipe-score").textContent = `${plan.recommendation.score}%`;
  $("#knowledge-promise").textContent = plan.learningPromise;
  $("#knowledge-beats").innerHTML = plan.beats.map((beat, index) => `<button type="button" role="tab" data-knowledge-beat="${index}" aria-selected="${index === 0}"><span>${String(beat.index).padStart(2, "0")} · ${beat.seconds}s</span><b>${escapeKnowledgeHtml(beat.role)}</b></button>`).join("");
  $$('[data-knowledge-beat]').forEach((button) => button.addEventListener("click", () => { knowledgeRuntime.beat = Number(button.dataset.knowledgeBeat); renderKnowledgeBeat(); }));
  $("#knowledge-boundary-fact").textContent = plan.boundaries.fact;
  $("#knowledge-boundary-viewpoint").textContent = plan.boundaries.viewpoint;
  $("#knowledge-boundary-art").textContent = plan.boundaries.art;
  $("#knowledge-boundary-review").textContent = plan.boundaries.review;
  $("#knowledge-quiz").innerHTML = plan.questions.map((item, index) => `<article class="knowledge-question"><span>Q${index + 1}</span><div><b>${escapeKnowledgeHtml(item.question)}</b><small>${escapeKnowledgeHtml(item.type)}</small></div><button type="button" aria-expanded="false" aria-controls="knowledge-answer-${index}" data-knowledge-answer="${index}">显示答案</button><p class="knowledge-answer" id="knowledge-answer-${index}" hidden>${escapeKnowledgeHtml(item.answer)}</p></article>`).join("");
  $$('[data-knowledge-answer]').forEach((button) => button.addEventListener("click", () => {
    const answer = $(`#knowledge-answer-${button.dataset.knowledgeAnswer}`);
    const open = answer.hidden;
    answer.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    button.textContent = open ? "收起答案" : "显示答案";
  }));
  $("#knowledge-production-list").innerHTML = plan.production.map((item) => `<li>${escapeKnowledgeHtml(item)}</li>`).join("");
  $("#knowledge-package-preview").textContent = JSON.stringify({ schema: plan.schema, topic: plan.brief.topic, audience: plan.brief.audience, recipe: plan.recommendation, production_contract: plan.productionContract, outputs: ["five-act-storyboard", "fact-boundaries", "comprehension-check", "production-checklist"] }, null, 2);
  $("#knowledge-action-status").textContent = "方案已在本地生成，可继续审阅或导出。";
  $("#knowledge-open-recipe").dataset.story = plan.recommendation.key;
  renderKnowledgeBeat();
  setKnowledgeView("story");
}

function validateKnowledgeBrief(brief) {
  const required = [["#knowledge-topic", brief.topic], ["#knowledge-objective", brief.objective], ["#knowledge-evidence", brief.evidence]];
  let valid = true;
  required.forEach(([selector, value]) => {
    const field = $(selector);
    const invalid = value.length < 8;
    field.setAttribute("aria-invalid", String(invalid));
    if (invalid) valid = false;
  });
  $("#knowledge-form-error").hidden = valid;
  if (!valid) {
    const firstInvalid = required.find(([, value]) => value.length < 8);
    if (firstInvalid) $(firstInvalid[0]).focus();
  }
  return valid;
}

function generateKnowledgePlan({ announce = true } = {}) {
  const brief = readKnowledgeBrief();
  if (!validateKnowledgeBrief(brief)) return false;
  renderKnowledgePlan(buildKnowledgePlan(brief));
  if (announce) $("#knowledge-plan-status").textContent = "UPDATED · 5 ACTS";
  return true;
}

function loadKnowledgePreset(key) {
  const preset = knowledgePresets[key];
  if (!preset) return;
  knowledgeRuntime.preset = key;
  Object.entries(preset).forEach(([field, value]) => { $(`#knowledge-${field}`).value = value; });
  $$('[data-knowledge-preset]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.knowledgePreset === key)));
  $("#knowledge-form-error").hidden = true;
  generateKnowledgePlan({ announce: false });
}

function downloadKnowledgePlan() {
  if (!knowledgeRuntime.plan) return;
  const blob = new Blob([JSON.stringify(knowledgeRuntime.plan, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "knowledge-video-plan.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("#knowledge-action-status").textContent = "生产包已下载：包含知识简报、八类评分、五幕、可信边界、理解题和生产清单。";
}

function encodeKnowledgeHandoff(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function probeKnowledgeStudioOrigin(origin) {
  return new Promise((resolve) => {
    const image = new Image();
    const timer = window.setTimeout(() => { image.src = ""; resolve(false); }, 1400);
    image.onload = () => { window.clearTimeout(timer); resolve(true); };
    image.onerror = () => { window.clearTimeout(timer); resolve(false); };
    image.src = `${origin}${KNOWLEDGE_STUDIO_PATH.replace("studio.html", "assets/power-outage-demo/scene-04-thumb.webp")}?probe=${Date.now()}`;
  });
}

async function resolveKnowledgeStudioOrigin() {
  const isLoopback = location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
  if (location.protocol !== "file:" && !isLoopback) return location.origin;
  if (isLoopback) {
    try {
      const response = await fetch(`${location.origin}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(1600) });
      if (response.ok) return location.origin;
    } catch (_) {}
  }
  for (const origin of [...new Set(KNOWLEDGE_STUDIO_ORIGINS)]) {
    if (await probeKnowledgeStudioOrigin(origin)) return origin;
  }
  return null;
}

async function openKnowledgeStudio({ handoff = false, fragment = "" } = {}) {
  const status = $("#knowledge-action-status");
  const hostedStatic = location.protocol !== "file:" && !(location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname));
  if (handoff && !generateKnowledgePlan({ announce: false })) return;
  if (status) {
    status.dataset.status = "working";
    status.textContent = hostedStatic
      ? "正在打开同源静态生产台；简报只通过地址片段交接，不会调用本机 API……"
      : "正在查找本机真实生产服务，并准备安全交接……";
  }
  const origin = await resolveKnowledgeStudioOrigin();
  if (!origin) {
    if (status) {
      status.dataset.status = "error";
      status.textContent = "没有发现 8791 或 8789 本地生产服务。请先启动 studio-server，再重试；当前简报仍保留在本页。";
    }
    return;
  }
  const target = new URL(KNOWLEDGE_STUDIO_PATH, origin);
  if (handoff) {
    const plan = knowledgeRuntime.plan;
    const payload = {
      schema: "knowledge-video-handoff/v1",
      source: "research-page",
      created_at: new Date().toISOString(),
      brief: plan.brief,
      local_plan: { recommendation: plan.recommendation, learning_promise: plan.learningPromise },
      production_contract: plan.productionContract,
    };
    target.hash = new URLSearchParams({ handoff: encodeKnowledgeHandoff(payload), intent: "review" }).toString();
  } else if (fragment) target.hash = fragment;
  location.assign(target.href);
}

function bindKnowledgeProduct() {
  const form = $("#knowledge-form");
  if (!form) return;
  form.addEventListener("submit", (event) => { event.preventDefault(); generateKnowledgePlan(); });
  $$('[data-knowledge-preset]').forEach((button) => button.addEventListener("click", () => loadKnowledgePreset(button.dataset.knowledgePreset)));
  $$("#knowledge-form input, #knowledge-form textarea, #knowledge-form select").forEach((field) => field.addEventListener("input", () => {
    field.removeAttribute("aria-invalid");
    $("#knowledge-form-error").hidden = true;
    $$('[data-knowledge-preset]').forEach((button) => button.setAttribute("aria-pressed", "false"));
  }));
  $$('[data-knowledge-view]').forEach((button) => button.addEventListener("click", () => setKnowledgeView(button.dataset.knowledgeView)));
  $("#knowledge-beats").addEventListener("keydown", moveDirectorTab);
  $(".knowledge-output-tabs").addEventListener("keydown", (event) => {
    const tabs = $$('[data-knowledge-view]');
    const current = tabs.indexOf(document.activeElement);
    if (current < 0 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const next = (current + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setKnowledgeView(tabs[next].dataset.knowledgeView, true);
  });
  $("#knowledge-download").addEventListener("click", downloadKnowledgePlan);
  $("#knowledge-open-recipe").addEventListener("click", (event) => openRealRecipe(event.currentTarget.dataset.story));
  $("#knowledge-send-studio").addEventListener("click", () => openKnowledgeStudio({ handoff: true }));
  $$('[data-studio-link]').forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    openKnowledgeStudio({ fragment: link.dataset.studioFragment || "" });
  }));
  loadKnowledgePreset("science");
}

function splitStory(text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return ["请输入一段故事，再生成分镜。"];
  const sentences = clean.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [clean];
  const scenes = [];
  sentences.forEach((sentence) => {
    const value = sentence.trim();
    if (value.length <= 36) scenes.push(value);
    else {
      for (let index = 0; index < value.length; index += 32) scenes.push(value.slice(index, index + 32));
    }
  });
  return scenes.slice(0, 12);
}

function captionLines(text) {
  const clean = text.replace(/[。！？!?；;]$/, "");
  const lines = [];
  for (let index = 0; index < clean.length; index += 13) lines.push(clean.slice(index, index + 13));
  return lines.slice(0, 3).join("\n");
}

function secondsFor(text) {
  const lines = Math.max(1, Math.ceil(text.length / 13));
  return Math.min(6.2, Math.max(4.4, 3.8 + lines * 0.48 + text.length * 0.035));
}

function makeScenes() {
  state.scenes = splitStory($("#story-input").value).map((text, index) => ({
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    text,
    caption: captionLines(text),
    duration: Number(secondsFor(text).toFixed(1)),
    symbol: sceneSymbols[index % sceneSymbols.length],
  }));
  state.scene = Math.min(state.scene, state.scenes.length - 1);
}

function currentItems() {
  if (state.input === "text") return state.scenes;
  return state.pages.map((page, index) => ({
    id: `page-${String(index + 1).padStart(2, "0")}`,
    text: page.label || page.name,
    caption: page.label || `图片第 ${index + 1} 页`,
    duration: Number(state.duration),
    symbol: sceneSymbols[index % sceneSymbols.length],
    url: page.url,
  }));
}

function initSelectors() {
  const select = $("#style-select");
  select.innerHTML = styles.map((style, index) => `<option value="${index}">${String(index + 1).padStart(2, "0")} · ${style.name}</option>`).join("");
  renderStyles();
}

function renderStyles() {
  const query = $("#style-search").value.trim().toLowerCase();
  const visible = styles.map((style, index) => ({ ...style, index })).filter((style) => {
    const familyMatch = state.family === "all" || style.family === state.family;
    const queryMatch = !query || `${style.id} ${style.name} ${style.fit}`.toLowerCase().includes(query);
    return familyMatch && queryMatch;
  });
  $("#style-count").textContent = `${visible.length} / ${styles.length} 种画风`;
  $("#style-grid").innerHTML = visible.map((style) => `
    <button class="style-card${style.index === state.styleIndex ? " is-selected" : ""}" type="button" data-style-index="${style.index}" aria-pressed="${style.index === state.styleIndex}">
      <span class="style-reference-crop" style="--sheet-x:${-(style.index % 4) * 25}%;--sheet-y:${-Math.floor(style.index / 4) * 20}%">
        <img src="./assets/handdrawn-style-library-contact-sheet.jpg" alt="${style.name}上游真实风格参考图" loading="lazy" />
        <span class="reference-chip">上游参考</span>
      </span>
      <span class="style-card__meta">
        <span class="style-card__number">${String(style.index + 1).padStart(2, "0")}</span>
        <strong>${style.name}</strong>
        <small>${style.id}</small>
        <span>${style.fit}</span>
      </span>
    </button>`).join("") || '<p class="empty-state">没有匹配的画风，请换一个关键词。</p>';
  $$("[data-style-index]").forEach((button) => button.addEventListener("click", () => selectStyle(Number(button.dataset.styleIndex))));
  renderStyleFocus();
}

function renderStyleFocus() {
  const style = styles[state.styleIndex];
  const preview = $("#style-focus-preview");
  preview.style.setProperty("--sheet-x", `${-(state.styleIndex % 4) * 25}%`);
  preview.style.setProperty("--sheet-y", `${-Math.floor(state.styleIndex / 4) * 20}%`);
  $("#style-focus-name").textContent = `${String(state.styleIndex + 1).padStart(2, "0")} · ${style.name}`;
  $("#style-focus-id").textContent = style.id;
  $("#style-focus-fit").textContent = `适合：${style.fit}。这是上游仓库提供的统一题材参考图；中央舞台展示的是合成机制模拟，不等同于模型生成质量。`;
}

function selectStyle(index) {
  state.styleIndex = index;
  $("#style-select").value = String(index);
  renderStyles();
  updateAll("已切换画风");
}

function renderQueue() {
  $("#page-queue").innerHTML = state.pages.map((page, index) => `
    <button type="button" class="queue-item${state.scene === index ? " is-active" : ""}" data-page-index="${index}" aria-pressed="${state.scene === index}">
      <span>${String(index + 1).padStart(2, "0")}</span><strong>${page.name}</strong><small>${page.url ? "本地上传" : "演示样本"}</small>
    </button>`).join("");
  $$("[data-page-index]").forEach((button) => button.addEventListener("click", () => {
    state.scene = Number(button.dataset.pageIndex);
    updateAll();
  }));
}

function renderTimeline() {
  const items = currentItems();
  if (!items.length) return;
  state.scene = Math.min(state.scene, items.length - 1);
  $("#scene-timeline").innerHTML = items.map((item, index) => `
    <button type="button" class="timeline-item${index === state.scene ? " is-active" : ""}" data-scene-index="${index}" aria-label="第 ${index + 1} 镜：${item.text}" aria-pressed="${index === state.scene}">
      <span>${String(index + 1).padStart(2, "0")}</span><i style="--duration:${item.duration}s"></i>
    </button>`).join("");
  $$("[data-scene-index]").forEach((button) => button.addEventListener("click", () => {
    state.scene = Number(button.dataset.sceneIndex);
    updateAll();
  }));
  const total = items.reduce((sum, item) => sum + item.duration, 0);
  $("#timeline-summary").textContent = `${items.length} 镜 · 约 ${total.toFixed(1)} 秒`;
}

function outputContract() {
  const uploaded = state.input === "images";
  const highQuality = ["render", "full"].includes(state.mode);
  if (state.mode === "plan") return { composition: "Story plan", output: "storyboard.generated.json", canvas: "计划文件" };
  if (state.mode === "generate") {
    return { composition: uploaded ? "Image manifest" : "Generation jobs", output: uploaded ? "uploaded-pages.json" : state.generator === "codex" ? "codex-image-jobs.json" : "storyboard.json", canvas: "中间产物" };
  }
  if (state.mode === "import") return { composition: "Imported storyboard", output: "storyboard.json", canvas: "已有分镜" };
  return {
    composition: uploaded ? "UploadedPictureSilent" : "PictureSilent",
    output: uploaded ? `uploaded_picture_silent${highQuality ? "" : "-preview"}.mp4` : `picture_silent${highQuality ? "" : "-preview"}.mp4`,
    canvas: highQuality ? "1080 × 1440" : "720 × 960",
  };
}

function commandText() {
  const style = styles[state.styleIndex].id;
  if (state.input === "images") {
    const names = state.pages.length ? state.pages.map((page) => `inputs/${page.name}`).join(" ") : "inputs/01.png";
    return `python scripts/run_story_video.py --images ${names} --title "图片故事" --mode ${state.mode} --transition ${state.transition} --layout ${state.layout} --page-duration ${state.duration}`;
  }
  const story = $("#story-input").value.trim().replace(/"/g, "'");
  return `python scripts/run_story_video.py --text "${story}" --title "雨后彩虹" --style ${style} --mode ${state.mode} --generator ${state.generator} --text-mode ${state.textMode} --transition ${state.transition}`;
}

function storyboardData() {
  const items = currentItems();
  return {
    title: state.input === "text" ? "雨后彩虹" : "图片故事",
    input: state.input,
    style: styles[state.styleIndex].id,
    transition: state.transition,
    scenes: items.map((item, index) => ({
      id: item.id,
      order: index + 1,
      caption: item.caption,
      duration: item.duration,
      source: state.input === "text" ? "generated" : state.pages[index]?.name,
    })),
  };
}

function manifestData() {
  const output = outputContract();
  return {
    mode: state.mode,
    generator: state.input === "text" ? state.generator : "none",
    composition: output.composition,
    output: `outputs/${output.output}`,
    canvas: output.canvas,
    assets: currentItems().map((_, index) => `scene-${String(index + 1).padStart(2, "0")}.png`),
    status: "demo-preview",
  };
}

function renderArtifact() {
  const value = state.artifact === "command" ? commandText() : JSON.stringify(state.artifact === "storyboard" ? storyboardData() : manifestData(), null, 2);
  $("#artifact-preview").textContent = value;
  $$("[data-artifact]").forEach((button) => {
    const active = button.dataset.artifact === state.artifact;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
}

function renderPreview() {
  const items = currentItems();
  if (!items.length) return;
  const item = items[state.scene];
  const style = styles[state.styleIndex];
  const frame = $("#paper-frame");
  frame.className = `paper-frame ${style.preview}${state.transition === "page-flip" ? " page-flip" : ""}`;
  frame.style.setProperty("--accent-a", style.colors[0]);
  frame.style.setProperty("--accent-b", style.colors[1]);
  frame.style.setProperty("--accent-c", style.colors[2]);
  $$(".scene-use").forEach((use) => use.setAttribute("href", item.symbol));
  $("#scene-caption").textContent = item.caption;
  $("#page-number").textContent = `${String(state.scene + 1).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
  $("#timecode").textContent = `${phaseNames[state.phase]} · ${item.duration.toFixed(1)}s`;
  const image = $("#uploaded-preview");
  if (state.input === "images" && item.url) {
    image.src = item.url;
    image.hidden = false;
    $("#paper-frame").classList.add("has-upload");
  } else {
    image.hidden = true;
    image.removeAttribute("src");
    $("#paper-frame").classList.remove("has-upload");
  }
  const output = outputContract();
  $("#preview-title").textContent = output.composition;
  $("#resolution-badge").textContent = output.canvas;
  $$("[data-phase]").forEach((button) => {
    const phase = Number(button.dataset.phase);
    const active = phase === state.phase;
    const disabled = state.input === "images" && state.transition === "page-flip" && phase !== 2;
    button.classList.toggle("is-active", active);
    button.disabled = disabled;
    button.setAttribute("aria-pressed", String(active));
  });
  frame.dataset.phase = String(state.phase);
}

function renderOutput() {
  const output = outputContract();
  $("#composition-value").textContent = output.composition;
  $("#output-value").textContent = output.output;
  $("#canvas-value").textContent = output.canvas;
  $("#mode-note").textContent = modeNotes[state.mode];
  let dependency = "本演示只在浏览器模拟参数，不会发起付费或联网生成。";
  if (state.input === "images") dependency += " 图片入口绕过 LLM/图像生成，使用 FFmpeg 与 Remotion 本地渲染。";
  else if (state.mode === "plan") dependency += " plan 模式无需图像服务。";
  else if (state.generator === "codex") dependency += " Codex 模式输出可交给 Agent 执行的图像任务清单。";
  else dependency += " API 模式在真实流水线中需要 OPENAI_API_KEY。";
  $("#dependency-note").textContent = dependency;
  renderArtifact();
}

function renderInputState() {
  const isText = state.input === "text";
  $("#text-input-panel").hidden = !isText;
  $("#images-input-panel").hidden = isText;
  $$("[data-text-only]").forEach((element) => { element.hidden = !isText; });
  $$("[data-images-only]").forEach((element) => { element.hidden = isText; });
  $$("[data-input]").forEach((button) => {
    const active = button.dataset.input === state.input;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  const importOption = $('#mode-select option[value="import"]');
  importOption.disabled = !isText;
  if (!isText && state.mode === "import") {
    state.mode = "preview";
    $("#mode-select").value = state.mode;
  }
  if (!isText && state.transition === "page-flip") state.phase = 2;
  renderQueue();
}

function setStatus(message = "配置已同步到预演、命令和中间产物。") {
  $("#console-status").textContent = message;
}

function updateAll(status) {
  renderInputState();
  renderTimeline();
  renderPreview();
  renderOutput();
  setStatus(status);
}

function setInput(input) {
  stopPlayback();
  state.input = input;
  state.scene = 0;
  updateAll(input === "text" ? "已切换到故事文本入口" : "已切换到图片分页入口");
}

function stopPlayback() {
  window.clearInterval(state.timer);
  state.timer = null;
  state.playing = false;
  $("#play-toggle").textContent = "播放预演";
  $("#play-toggle").setAttribute("aria-pressed", "false");
}

function togglePlayback() {
  if (state.playing) {
    stopPlayback();
    setStatus("预演已暂停");
    return;
  }
  if (reducedMotion.matches) {
    setStatus("系统已启用减少动态效果；请使用阶段与分镜按钮手动预览。 ");
    return;
  }
  state.playing = true;
  $("#play-toggle").textContent = "暂停预演";
  $("#play-toggle").setAttribute("aria-pressed", "true");
  state.timer = window.setInterval(() => {
    const items = currentItems();
    if (state.input === "images" && state.transition === "page-flip") {
      state.scene = (state.scene + 1) % items.length;
    } else if (state.phase < 2) state.phase += 1;
    else {
      state.phase = 0;
      state.scene = (state.scene + 1) % items.length;
    }
    renderTimeline();
    renderPreview();
  }, 1100);
  setStatus("正在播放三阶段手绘预演");
}

function handleFiles(files) {
  if (!files.length) return;
  state.pages = [...files].slice(0, 12).map((file, index) => ({
    name: file.name,
    label: file.name.replace(/\.[^.]+$/, ""),
    url: URL.createObjectURL(file),
    order: index + 1,
  }));
  state.scene = 0;
  updateAll(`已载入 ${state.pages.length} 张图片；渲染时按当前顺序分页。`);
}

function updateIntegration() {
  const source = $("#source-choices .is-selected")?.dataset.value || "story";
  const template = $("#template-choices .is-selected")?.dataset.value || "handdrawn";
  const addons = $$('#integration input[type="checkbox"]:checked').map((input) => input.value);
  const sourceLabels = { story: "故事文本", lyrics: "歌词 / 情绪曲线", images: "图片序列", document: "文档 / 知识库" };
  const templateLabels = { handdrawn: "手绘成长", "mood-mv": "情绪 MV", whiteboard: "白板讲解", pagebook: "翻页绘本" };
  const addonLabels = { tts: "TTS / 音乐", qc: "自动质检", brand: "品牌规范", queue: "批量任务队列" };
  const flow = [sourceLabels[source], "统一 Storyboard", templateLabels[template], ...addons.map((addon) => addonLabels[addon]), "MP4 / 中间产物"];
  $("#composed-pipeline").innerHTML = flow.map((item, index) => `<span>${item}</span>${index < flow.length - 1 ? "<b>→</b>" : ""}`).join("");
  $("#integration-summary").textContent = `组合结果：${sourceLabels[source]} 进入统一分镜协议，套用“${templateLabels[template]}”视觉模板${addons.length ? `，并接入 ${addons.map((addon) => addonLabels[addon]).join("、")}` : ""}。底层保留可替换的图像生成器、字幕和 Remotion 渲染层。`;
}

function syncDirectorTemplate(template) {
  $$("#template-choices [data-value]").forEach((button) => {
    const active = button.dataset.value === template;
    button.classList.toggle("is-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });
  updateIntegration();
}

function scoreStoryFit(text) {
  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const results = Object.entries(storyFitProfiles).map(([key, profile]) => {
    let score = 24;
    const matched = [];
    profile.groups.forEach((group) => {
      const hits = [...new Set(group.terms.filter((term) => normalized.includes(term.toLowerCase())))];
      if (!hits.length) return;
      score += group.weight + Math.min(9, (hits.length - 1) * 3);
      matched.push({ label: group.label, hits });
    });
    return { key, profile, score, matched, structural: [] };
  });
  const byKey = Object.fromEntries(results.map((item) => [item.key, item]));
  const boost = (key, value, label) => {
    byKey[key].score += value;
    if (label) byKey[key].structural.push(label);
  };
  if (/[我我们]|我的/.test(normalized)) {
    boost("memory", 4, "第一人称关系视角");
    boost("poetic", 6, "第一人称独白");
  }
  if (/[？?]|为什么|如何|原理|机制/.test(normalized)) {
    boost("knowledge", 8, "明确解释问题");
    boost("mystery", 3, "存在待解问题");
  }
  if (/\d|一[十百千万]|二十|三十/.test(normalized)) {
    boost("knowledge", 3, "出现量化信息");
    boost("mystery", 4, "时间或数字可核验");
  }
  if (/先|然后|后来|最后|再次|再试|第一次/.test(normalized)) {
    boost("children", 5, "行动发生阶段变化");
    boost("brand", 4, "选择进入过程");
  }
  if (/但是|却|然而|并不|不是/.test(normalized)) {
    boost("mystery", 4, "存在认知反差");
    boost("poetic", 3, "意象内部有反差");
  }
  if (/《|》|古诗|诗词|唐诗|宋词|逐句|原文/.test(normalized)) boost("classical", 16, "明确的题目、作者或古诗词结构");
  if (/停电|断电|复电|来电|空调.*停|风扇.*停/.test(normalized)) boost("technology", 14, "亲历停电让基础设施显影");
  if (/发明|电网|发电|输电|伏打|法拉第|特斯拉|爱迪生/.test(normalized)) boost("technology", 9, "从个人体验进入发明与系统史");
  if (normalized.length < 70) {
    boost("poetic", 3, "文本密度适合留白");
    boost("classical", 2, "短文本适合逐句场景化");
  }
  if (normalized.length > 220) boost("knowledge", 3, "信息密度较高");
  return results
    .map((item) => ({ ...item, score: Math.max(18, Math.min(96, item.score)) }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

function fitExplanation(result) {
  const evidence = result.matched.map((item) => item.label).concat(result.structural).slice(0, 3);
  if (!evidence.length) return `当前文本缺少${result.profile.label}的强信号，可作为视觉备选，但不建议直接套用。`;
  return `命中${evidence.join("、")}，与“${result.profile.bestFor}”的处方目标一致。`;
}

function renderStoryFit(results) {
  const top = results[0];
  const preset = directorPresets[top.key];
  const signalItems = top.matched
    .flatMap((group) => [`${group.label}：${group.hits.slice(0, 3).join(" / ")}`])
    .concat(top.structural)
    .slice(0, 6);
  $("#story-fit-score").textContent = `${top.score}%`;
  $("#story-fit-result-title").textContent = preset.title;
  $("#story-fit-summary").textContent = fitExplanation(top);
  $("#story-fit-signal-list").innerHTML = (signalItems.length ? signalItems : ["未命中强关键词，建议补充主体、冲突和变化"]).map((item) => `<em>${item}</em>`).join("");
  $("#story-fit-ranking").innerHTML = results.map((result, index) => `
    <article class="story-fit-rank">
      <div class="story-fit-rank__head"><span>${String(index + 1).padStart(2, "0")}</span><b>${result.profile.label}${index < 3 ? " · 推荐" : " · 参考"}</b><em>${result.score}%</em></div>
      <i aria-hidden="true"><span style="width:${result.score}%"></span></i>
      <p>${fitExplanation(result)}</p>
    </article>`).join("");
  $("#story-fit-route").innerHTML = preset.scenes.map((scene, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span>${scene.short} · ${scene.note}</li>`).join("");
  $("#story-fit-risk").textContent = top.profile.risk;
  const openButton = $("#story-fit-open-recipe");
  openButton.disabled = false;
  openButton.dataset.story = top.key;
  $("#story-fit-result").dataset.story = top.key;
}

function analyzeStoryFit() {
  const input = $("#story-fit-input");
  const text = input.value.trim();
  const invalid = text.length < 12;
  input.setAttribute("aria-invalid", String(invalid));
  $("#story-fit-error").hidden = !invalid;
  if (invalid) {
    $("#story-fit-result-title").textContent = "信息还不够形成匹配";
    $("#story-fit-summary").textContent = "补充一个主体、一处冲突和一次变化，再重新分析。";
    $("#story-fit-score").textContent = "—";
    $("#story-fit-open-recipe").disabled = true;
    input.focus();
    return false;
  }
  renderStoryFit(scoreStoryFit(text));
  return true;
}

function openRealRecipe(story) {
  if (!directorPresets[story]) return;
  if (story === "classical") state.classicalVariant = "lecture";
  state.directorStory = story;
  state.directorBeat = 0;
  renderNarrativeDirector();
  const regionSelectors = {
    memory: ".real-demo",
    knowledge: "#director-real-output",
    children: "#children-real-output",
    mystery: "#mystery-real-output",
    brand: "#brand-real-output",
    poetic: "#poetic-real-output",
    classical: "#classical-real-output",
    technology: "#technology-real-output",
  };
  const region = $(regionSelectors[story]);
  if (!region) return;
  region.setAttribute("tabindex", "-1");
  region.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "start" });
  window.setTimeout(() => region.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 420);
}

function renderRecipeComparison() {
  const keys = ["memory", "knowledge", "children", "mystery", "brand", "poetic", "classical", "technology"];
  $("#recipe-comparison-grid").innerHTML = keys.map((key, index) => {
    const profile = storyFitProfiles[key];
    const preset = directorPresets[key];
    const style = styles.find((item) => item.id === preset.styleId)?.name || preset.styleId;
    return `
      <article class="recipe-compare-card">
        <div class="recipe-compare-card__head"><b>${profile.label}</b><span>${String(index + 1).padStart(2, "0")} · REAL</span></div>
        <h5>${preset.scenes.map((scene) => scene.short).join(" → ")}</h5>
        <p>${profile.bestFor}</p>
        <dl>
          <div><dt>VISUAL</dt><dd>${style} · ${preset.paletteLabel}</dd></div>
          <div><dt>SOUND & RHYTHM</dt><dd>${preset.voice}；${preset.rhythm}</dd></div>
          <div><dt>RISK</dt><dd>${profile.risk}</dd></div>
        </dl>
        <button type="button" data-comparison-story="${key}">打开${profile.label}真实样片</button>
      </article>`;
  }).join("");
  $$('[data-comparison-story]').forEach((button) => button.addEventListener("click", () => openRealRecipe(button.dataset.comparisonStory)));
}

function bindStoryFitLab() {
  const form = $("#story-fit-form");
  if (!form) return;
  const input = $("#story-fit-input");
  const updateCount = () => { $("#story-fit-count").textContent = `${input.value.length} / 1200`; };
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    analyzeStoryFit();
  });
  input.addEventListener("input", () => {
    updateCount();
    input.removeAttribute("aria-invalid");
    $("#story-fit-error").hidden = true;
    $$('[data-fit-sample]').forEach((button) => button.setAttribute("aria-pressed", "false"));
  });
  $$('[data-fit-sample]').forEach((button) => button.addEventListener("click", () => {
    input.value = storyFitSamples[button.dataset.fitSample];
    $$('[data-fit-sample]').forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    updateCount();
    analyzeStoryFit();
  }));
  $("#story-fit-open-recipe").addEventListener("click", (event) => openRealRecipe(event.currentTarget.dataset.story));
  renderRecipeComparison();
  updateCount();
  analyzeStoryFit();
}

function renderDirectorBeat() {
  const preset = directorPresets[state.directorStory];
  const scene = preset.scenes[state.directorBeat];
  $("#director-scene-index").textContent = `${String(state.directorBeat + 1).padStart(2, "0")} / ${String(preset.scenes.length).padStart(2, "0")}`;
  $("#director-context").textContent = scene.context;
  $("#director-subject").textContent = scene.subject;
  $("#director-meaning").textContent = scene.meaning;
  $("#director-scene-role").textContent = scene.role;
  $("#director-scene-duration").textContent = scene.duration;
  $("#director-scene-title").textContent = scene.title;
  $("#director-scene-purpose").textContent = scene.purpose;
  $("#director-scene-visual").textContent = scene.visual;
  $("#director-scene-motion").textContent = scene.motion;
  $("#director-scene-narration").textContent = scene.narration;
  $$('[data-director-beat]').forEach((button, index) => {
    const active = index === state.directorBeat;
    button.setAttribute("aria-selected", String(active));
  });
}

function renderNarrativeDirector({ syncTemplate = true } = {}) {
  const preset = directorPresets[state.directorStory];
  const director = $("#narrative-director");
  director.style.setProperty("--director-a", preset.palette[0]);
  director.style.setProperty("--director-b", preset.palette[1]);
  director.style.setProperty("--director-c", preset.palette[2]);
  $("#director-fit").textContent = preset.fit;
  $("#director-runtime").textContent = preset.runtime;
  $("#director-preset-title").textContent = preset.title;
  $("#director-logline").textContent = preset.logline;
  $("#director-style").textContent = styles.find((style) => style.id === preset.styleId)?.name || preset.styleId;
  $("#director-palette").textContent = preset.paletteLabel;
  $("#director-camera").textContent = preset.camera;
  $("#director-transition").textContent = preset.transition;
  $("#director-voice").textContent = preset.voice;
  $("#director-rhythm").textContent = preset.rhythm;
  $("#director-rationale").textContent = preset.rationale;
  $("#director-open-style").dataset.styleId = preset.styleId;
  $$('[data-director-story]').forEach((button) => button.setAttribute("aria-selected", String(button.dataset.directorStory === state.directorStory)));
  $("#director-beats").innerHTML = preset.scenes.map((scene, index) => `
    <button type="button" role="tab" data-director-beat="${index}" aria-selected="${index === state.directorBeat}">
      <span>${String(index + 1).padStart(2, "0")}</span><b>${scene.short}</b><small>${scene.note}</small>
    </button>`).join("");
  $$('[data-director-beat]').forEach((button) => button.addEventListener("click", () => {
    state.directorBeat = Number(button.dataset.directorBeat);
    renderDirectorBeat();
    if (state.directorStory === "knowledge") seekKnowledgeBeat(state.directorBeat);
    if (state.directorStory === "children") seekChildrenBeat(state.directorBeat);
    if (state.directorStory === "mystery") seekMysteryBeat(state.directorBeat);
    if (state.directorStory === "brand") seekBrandBeat(state.directorBeat);
    if (state.directorStory === "poetic") seekPoeticBeat(state.directorBeat);
    if (state.directorStory === "classical") seekClassicalBeat(state.directorBeat);
    if (state.directorStory === "technology") seekTechnologyBeat(state.directorBeat);
  }));
  renderDirectorBeat();
  const realOutput = $("#director-real-output");
  const childrenOutput = $("#children-real-output");
  const mysteryOutput = $("#mystery-real-output");
  const brandOutput = $("#brand-real-output");
  const poeticOutput = $("#poetic-real-output");
  const classicalOutput = $("#classical-real-output");
  const technologyOutput = $("#technology-real-output");
  const knowledgeVideo = $("#knowledge-demo-video");
  const childrenVideo = $("#children-demo-video");
  const mysteryVideo = $("#mystery-demo-video");
  const brandVideo = $("#brand-demo-video");
  const poeticVideo = $("#poetic-demo-video");
  const classicalVideo = $("#classical-demo-video");
  const jiangnanVideo = $("#jiangnan-demo-video");
  const lectureVideo = $("#lecture-demo-video");
  const technologyVideo = $("#technology-demo-video");
  const showKnowledgeOutput = state.directorStory === "knowledge";
  const showChildrenOutput = state.directorStory === "children";
  const showMysteryOutput = state.directorStory === "mystery";
  const showBrandOutput = state.directorStory === "brand";
  const showPoeticOutput = state.directorStory === "poetic";
  const showClassicalOutput = state.directorStory === "classical";
  const showTechnologyOutput = state.directorStory === "technology";
  realOutput.hidden = !showKnowledgeOutput;
  realOutput.setAttribute("aria-hidden", String(!showKnowledgeOutput));
  childrenOutput.hidden = !showChildrenOutput;
  childrenOutput.setAttribute("aria-hidden", String(!showChildrenOutput));
  mysteryOutput.hidden = !showMysteryOutput;
  mysteryOutput.setAttribute("aria-hidden", String(!showMysteryOutput));
  brandOutput.hidden = !showBrandOutput;
  brandOutput.setAttribute("aria-hidden", String(!showBrandOutput));
  poeticOutput.hidden = !showPoeticOutput;
  poeticOutput.setAttribute("aria-hidden", String(!showPoeticOutput));
  classicalOutput.hidden = !showClassicalOutput;
  classicalOutput.setAttribute("aria-hidden", String(!showClassicalOutput));
  technologyOutput.hidden = !showTechnologyOutput;
  technologyOutput.setAttribute("aria-hidden", String(!showTechnologyOutput));
  if (!showKnowledgeOutput) knowledgeVideo?.pause();
  if (!showChildrenOutput) childrenVideo?.pause();
  if (!showMysteryOutput) mysteryVideo?.pause();
  if (!showBrandOutput) brandVideo?.pause();
  if (!showPoeticOutput) poeticVideo?.pause();
  if (!showClassicalOutput) {
    classicalVideo?.pause();
    jiangnanVideo?.pause();
    lectureVideo?.pause();
  } else renderClassicalVariant();
  if (!showTechnologyOutput) {
    technologyVideo?.pause();
    restorePowerExperience({ instant: true, silent: true });
  }
  $$('[data-recipe-target]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.recipeTarget === state.directorStory)));
  if (syncTemplate) syncDirectorTemplate(preset.template);
}

function moveDirectorTab(event) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const tabs = $$('[role="tab"]', event.currentTarget);
  const current = Math.max(0, tabs.indexOf(document.activeElement));
  let next = current;
  if (event.key === "ArrowLeft") next = (current - 1 + tabs.length) % tabs.length;
  if (event.key === "ArrowRight") next = (current + 1) % tabs.length;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = tabs.length - 1;
  event.preventDefault();
  tabs[next].focus();
  tabs[next].click();
}

function bindRealDemo() {
  const video = $("#real-demo-video");
  const beatButtons = $$("[data-demo-time]");
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const readStart = (button) => Number(button.getAttribute("data-demo-time"));
  const starts = beatButtons.map(readStart);
  const updateBeat = () => {
    let activeIndex = 0;
    starts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button) => button.addEventListener("click", () => {
    video.pause();
    video.currentTime = readStart(button);
    updateBeat();
  }));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekKnowledgeBeat(index) {
  const video = $("#knowledge-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = knowledgeStarts[index] || 0;
  $$('[data-knowledge-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function seekSkyBeat(index) {
  const video = $("#sky-blue-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = skyStarts[index] || 0;
  $$('[data-sky-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindSkyDemo() {
  const video = $("#sky-blue-demo-video");
  const beatButtons = $$('[data-sky-time]');
  if (!video || !beatButtons.length) return;
  const updateBeat = () => {
    let activeIndex = 0;
    skyStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekSkyBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function bindAiEnergyDemo() {
  const video = $("#ai-energy-demo-video");
  const beatButtons = $$('[data-ai-energy-time]');
  if (!video || !beatButtons.length) return;
  const updateBeat = () => {
    let activeIndex = 0;
    aiEnergyStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => {
    video.pause();
    video.currentTime = aiEnergyStarts[index] || 0;
    updateBeat();
  }));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekTechnologyBeat(index) {
  const video = $("#technology-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = technologyStarts[index] || 0;
  $$('[data-technology-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function clearPowerExperienceTimers() {
  powerExperienceRuntime.timers.forEach((timer) => window.clearTimeout(timer));
  powerExperienceRuntime.timers = [];
}

function setPowerExperienceState(next, { announce = true } = {}) {
  const experience = $("#power-experience");
  const config = powerExperienceStates[next];
  if (!experience || !config) return;
  powerExperienceRuntime.value = next;
  experience.dataset.powerState = next;
  $("#power-status-label").textContent = config.label;
  $("#power-room-kicker").textContent = config.kicker;
  $("#power-room-title").textContent = config.title;
  if (announce) $("#power-live-status").textContent = config.live;
  const map = $("#power-system-map");
  const mapVisible = next === "ready";
  map.hidden = !mapVisible;
  map.setAttribute("aria-hidden", String(!mapVisible));
  const primary = $("#power-experience-primary");
  const skip = $("#power-experience-skip");
  primary.disabled = next === "restore";
  primary.textContent = next === "powered" ? "开始停电体验" : next === "ready" ? "恢复演示供电" : next === "restore" ? "正在恢复…" : "立即完成显影";
  skip.hidden = next === "ready" || next === "restore";
}

function powerTone(context, { frequency, endFrequency = frequency, duration, volume, delay = 0, type = "sine" }) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function getPowerAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  powerExperienceRuntime.audioContext ||= new AudioContextClass();
  powerExperienceRuntime.audioContext.resume?.();
  return powerExperienceRuntime.audioContext;
}

function playPowerCutSound() {
  const context = getPowerAudioContext();
  if (!context) return;
  powerTone(context, { frequency: 62, endFrequency: 48, duration: 0.42, volume: 0.035, type: "triangle" });
  powerTone(context, { frequency: 210, endFrequency: 120, duration: 0.07, volume: 0.045, delay: 0.02, type: "square" });
}

function playPowerRestoreSound() {
  const context = getPowerAudioContext();
  if (!context) return;
  powerTone(context, { frequency: 150, endFrequency: 240, duration: 0.12, volume: 0.035, type: "square" });
  powerTone(context, { frequency: 52, endFrequency: 68, duration: 0.62, volume: 0.024, delay: 0.08, type: "triangle" });
}

function beginPowerExperience() {
  clearPowerExperienceTimers();
  playPowerCutSound();
  setPowerExperienceState("outage");
  const delays = reducedMotion.matches ? [120, 240, 360] : [1400, 3000, 5200];
  ["phone", "reveal", "ready"].forEach((next, index) => {
    powerExperienceRuntime.timers.push(window.setTimeout(() => setPowerExperienceState(next), delays[index]));
  });
}

function revealPowerSystem() {
  clearPowerExperienceTimers();
  setPowerExperienceState("ready");
}

function restorePowerExperience({ instant = false, silent = false } = {}) {
  clearPowerExperienceTimers();
  if (instant) {
    setPowerExperienceState("powered", { announce: !silent });
    return;
  }
  if (!silent) playPowerRestoreSound();
  setPowerExperienceState("restore");
  powerExperienceRuntime.timers.push(window.setTimeout(() => setPowerExperienceState("powered"), reducedMotion.matches ? 80 : 850));
}

function selectPowerDependency(key, { focusPanel = false } = {}) {
  const detail = powerDependencies[key];
  if (!detail) return;
  $$('[data-power-dependency]').forEach((button) => button.setAttribute("aria-selected", String(button.dataset.powerDependency === key)));
  $("#power-system-map").dataset.activeDependency = key;
  $("#power-dependency-index").textContent = detail.index;
  $("#power-dependency-title").textContent = detail.title;
  $("#power-dependency-copy").textContent = detail.copy;
  $("#power-dependency-boundary").textContent = detail.boundary;
  if (focusPanel) $("#power-dependency-detail").focus({ preventScroll: true });
}

function bindPowerExperience() {
  const experience = $("#power-experience");
  if (!experience) return;
  $("#power-experience-primary").addEventListener("click", () => {
    if (powerExperienceRuntime.value === "powered") beginPowerExperience();
    else if (powerExperienceRuntime.value === "ready") restorePowerExperience();
    else revealPowerSystem();
  });
  $("#power-experience-skip").addEventListener("click", revealPowerSystem);
  $("#power-restore-button").addEventListener("click", () => restorePowerExperience());
  $("#power-enter-film").addEventListener("click", async () => {
    const video = $("#technology-demo-video");
    video.currentTime = 0;
    video.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
    window.setTimeout(() => video.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 380);
    try { await video.play(); } catch { /* Native controls remain available when autoplay is denied. */ }
  });
  $$('[data-power-dependency]').forEach((button) => button.addEventListener("click", () => selectPowerDependency(button.dataset.powerDependency)));
  $(".power-dependency-tabs").addEventListener("keydown", moveDirectorTab);
  experience.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || powerExperienceRuntime.value === "powered") return;
    event.preventDefault();
    restorePowerExperience();
    $("#power-experience-primary").focus();
  });
  setPowerExperienceState("powered", { announce: false });
  selectPowerDependency("comfort");
}

function bindTechnologyDemo() {
  const video = $("#technology-demo-video");
  const beatButtons = $$('[data-technology-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    technologyStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekTechnologyBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function bindKnowledgeDemo() {
  const video = $("#knowledge-demo-video");
  const beatButtons = $$('[data-knowledge-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    knowledgeStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekKnowledgeBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekChildrenBeat(index) {
  const video = $("#children-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = childrenStarts[index] || 0;
  $$('[data-children-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindChildrenDemo() {
  const video = $("#children-demo-video");
  const beatButtons = $$('[data-children-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    childrenStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekChildrenBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekMysteryBeat(index) {
  const video = $("#mystery-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = mysteryStarts[index] || 0;
  $$('[data-mystery-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindMysteryDemo() {
  const video = $("#mystery-demo-video");
  const beatButtons = $$('[data-mystery-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    mysteryStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekMysteryBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekBrandBeat(index) {
  const video = $("#brand-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = brandStarts[index] || 0;
  $$('[data-brand-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindBrandDemo() {
  const video = $("#brand-demo-video");
  const beatButtons = $$('[data-brand-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    brandStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekBrandBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekPoeticBeat(index) {
  const video = $("#poetic-demo-video");
  if (!video) return;
  video.pause();
  video.currentTime = poeticStarts[index] || 0;
  $$('[data-poetic-time]').forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindPoeticDemo() {
  const video = $("#poetic-demo-video");
  const beatButtons = $$('[data-poetic-time]');
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    poeticStarts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => seekPoeticBeat(index)));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function seekClassicalBeat(index) {
  const config = classicalVariantConfig[state.classicalVariant] || classicalVariantConfig.lecture;
  const video = $(config.video);
  if (!video) return;
  video.pause();
  video.currentTime = config.starts[index] || 0;
  $$(config.timeline).forEach((button, buttonIndex) => button.setAttribute("aria-pressed", String(buttonIndex === index)));
}

function bindPoetryTimeline(videoSelector, buttonSelector, starts) {
  const video = $(videoSelector);
  const beatButtons = $$(buttonSelector);
  if (!video || !beatButtons.length) return;
  video.dataset.timelineBound = "true";
  const updateBeat = () => {
    let activeIndex = 0;
    starts.forEach((start, index) => { if (video.currentTime >= start) activeIndex = index; });
    beatButtons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === activeIndex)));
  };
  beatButtons.forEach((button, index) => button.addEventListener("click", () => {
    video.pause();
    video.currentTime = starts[index] || 0;
    updateBeat();
  }));
  video.addEventListener("timeupdate", updateBeat);
  video.addEventListener("seeked", updateBeat);
}

function renderClassicalVariant() {
  const config = classicalVariantConfig[state.classicalVariant] || classicalVariantConfig.lecture;
  $("#classical-real-output")?.setAttribute("aria-labelledby", config.title);
  $$('[data-classical-variant]').forEach((button) => button.setAttribute("aria-selected", String(button.dataset.classicalVariant === state.classicalVariant)));
  $$('[data-classical-panel]').forEach((panel) => { panel.hidden = panel.dataset.classicalPanel !== state.classicalVariant; });
  Object.values(classicalVariantConfig).forEach((candidate) => {
    if (candidate.video !== config.video) $(candidate.video)?.pause();
  });
  seekClassicalBeat(state.directorBeat);
}

function bindClassicalDemo() {
  bindPoetryTimeline("#lecture-demo-video", "[data-lecture-time]", jiangnanStarts);
  bindPoetryTimeline("#jiangnan-demo-video", "[data-jiangnan-time]", jiangnanStarts);
  bindPoetryTimeline("#classical-demo-video", "[data-classical-time]", classicalStarts);
  $$('[data-classical-variant]').forEach((button) => button.addEventListener("click", () => {
    state.classicalVariant = button.dataset.classicalVariant;
    renderClassicalVariant();
  }));
  $(".classical-variant-switch")?.addEventListener("keydown", moveDirectorTab);
  renderClassicalVariant();
}

function bindEvents() {
  $$("[data-input]").forEach((button) => button.addEventListener("click", () => setInput(button.dataset.input)));
  $("#story-input").addEventListener("input", () => { $("#character-count").textContent = `${$("#story-input").value.length} 字`; });
  $("#plan-story").addEventListener("click", () => { makeScenes(); updateAll(`已按标点与长度拆成 ${state.scenes.length} 个分镜。`); });
  $("#restore-pages").addEventListener("click", () => { state.pages = samplePages.map((page) => ({ ...page })); state.scene = 0; updateAll("已恢复三页图片演示样本"); });
  $("#image-input").addEventListener("change", (event) => handleFiles(event.target.files));
  $("#mode-select").addEventListener("change", (event) => { state.mode = event.target.value; updateAll("运行模式已更新"); });
  $("#style-select").addEventListener("change", (event) => selectStyle(Number(event.target.value)));
  $("#transition-select").addEventListener("change", (event) => { state.transition = event.target.value; if (state.input === "images" && state.transition === "page-flip") state.phase = 2; updateAll("转场策略已更新"); });
  $("#generator-select").addEventListener("change", (event) => { state.generator = event.target.value; updateAll("图像生成器已更新"); });
  $("#text-mode-select").addEventListener("change", (event) => { state.textMode = event.target.value; updateAll("字幕模式已更新"); });
  $("#layout-select").addEventListener("change", (event) => { state.layout = event.target.value; updateAll("图片布局已更新"); });
  $("#duration-select").addEventListener("change", (event) => { state.duration = Number(event.target.value); updateAll("单页时长已更新"); });
  $("#open-style-library").addEventListener("click", () => $("#style-library").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" }));
  $$("[data-phase]").forEach((button) => button.addEventListener("click", () => { state.phase = Number(button.dataset.phase); renderPreview(); setStatus(`已切换到${phaseNames[state.phase]}阶段`); }));
  $("#play-toggle").addEventListener("click", togglePlayback);
  $$("[data-artifact]").forEach((button) => button.addEventListener("click", () => { state.artifact = button.dataset.artifact; renderArtifact(); }));
  $("#copy-artifact").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#artifact-preview").textContent); setStatus("当前产物已复制到剪贴板"); }
    catch { setStatus("浏览器未开放剪贴板权限，请手动选择复制。 "); }
  });
  $("#style-search").addEventListener("input", renderStyles);
  $$("[data-family]").forEach((button) => button.addEventListener("click", () => {
    state.family = button.dataset.family;
    $$("[data-family]").forEach((item) => { const active = item === button; item.classList.toggle("is-active", active); item.setAttribute("aria-pressed", String(active)); });
    renderStyles();
  }));
  $$("#source-choices [data-value], #template-choices [data-value]").forEach((button) => button.addEventListener("click", () => {
    $$(`#${button.parentElement.id} [data-value]`).forEach((item) => { const active = item === button; item.classList.toggle("is-selected", active); item.setAttribute("aria-pressed", String(active)); });
    updateIntegration();
  }));
  $$('#integration input[type="checkbox"]').forEach((input) => input.addEventListener("change", updateIntegration));
  $$('[data-director-story]').forEach((button) => button.addEventListener("click", () => {
    state.directorStory = button.dataset.directorStory;
    state.directorBeat = 0;
    renderNarrativeDirector();
  }));
  $$('[data-recipe-target]').forEach((button) => button.addEventListener("click", () => {
    const target = $(`[data-director-story="${button.dataset.recipeTarget}"]`);
    target?.click();
    target?.focus();
    if (button.dataset.recipeTarget === "memory") document.querySelector(".real-demo")?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  }));
  $("#director-story-types").addEventListener("keydown", moveDirectorTab);
  $("#director-beats").addEventListener("keydown", moveDirectorTab);
  $("#director-open-style").addEventListener("click", () => {
    const index = styles.findIndex((style) => style.id === $("#director-open-style").dataset.styleId);
    if (index < 0) return;
    selectStyle(index);
    $("#style-library").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  });
  bindKnowledgeProduct();
  bindStoryFitLab();
  bindRealDemo();
  bindSkyDemo();
  bindAiEnergyDemo();
  bindKnowledgeDemo();
  bindChildrenDemo();
  bindMysteryDemo();
  bindBrandDemo();
  bindPoeticDemo();
  bindClassicalDemo();
  bindTechnologyDemo();
  bindPowerExperience();
  reducedMotion.addEventListener?.("change", () => {
    if (!reducedMotion.matches) return;
    stopPlayback();
    if (!["powered", "ready"].includes(powerExperienceRuntime.value)) revealPowerSystem();
  });
}

makeScenes();
initSelectors();
bindEvents();
renderNarrativeDirector();
updateIntegration();
$("#character-count").textContent = `${defaultStory.length} 字`;
updateAll("参数控制台使用本地机制模拟；整合扩展区包含真实生图、TTS 与最终 MP4。 ");
