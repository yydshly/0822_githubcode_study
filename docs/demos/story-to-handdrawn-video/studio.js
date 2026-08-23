(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STAGES = ["brief", "plan", "storyboard", "voice", "render", "delivery"];
  const IS_LOCAL_RUNTIME = location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
  const API_BASE = IS_LOCAL_RUNTIME ? location.origin : null;
  const STORAGE_KEY = "knowledge-video-studio/v1";
  const VOICE_PROFILES = {
    "female-chengshu": { label: "成熟讲述" },
    "male-qn-jingying": { label: "清晰男声" },
    "female-tianmei": { label: "亲和女声" },
  };
  const EFFECT_PROFILES = {
    knowledge: { label: "知识解释", styleId: "whiteboard-explainer", styleLabel: "白板讲解动画", palette: ["#f8f8f4", "#222222", "#2d6cdf"], paletteLabel: "暖白纸面 + 黑线 + 概念蓝", camera: "正视结构，局部缩放只服务概念层级", presentation: "handdrawn" },
    technology: { label: "技术系统", styleId: "minimal-line-explainer", styleLabel: "极简黑白线条讲解", palette: ["#eef2ed", "#24313a", "#f3b447"], paletteLabel: "工程纸白 + 炭黑 + 能量黄", camera: "从日常物件沿系统路径逐层展开", presentation: "handdrawn" },
    classical: { label: "古典诗词", styleId: "ink-wash", styleLabel: "水墨写意", palette: ["#ece7da", "#242424", "#4d8068"], paletteLabel: "宣纸暖白 + 墨灰 + 青绿", camera: "长卷式空间推进，视点随意象移动", presentation: "poetic" },
    children: { label: "儿童成长", styleId: "sunlit-storybook", styleLabel: "暖光童画绘本", palette: ["#f4dfb2", "#e7aa45", "#70956d"], paletteLabel: "暖阳金 + 草木绿 + 纸张米白", camera: "儿童视线高度，动作结果清楚可读", presentation: "handdrawn" },
    memory: { label: "家庭记忆", styleId: "colored-pencil-diary", styleLabel: "彩铅日记漫画", palette: ["#e7d6b8", "#596d81", "#bb8c66"], paletteLabel: "纸张米色 + 雨夜蓝灰 + 灯光暖棕", camera: "物件特写缓慢推进人物关系", presentation: "handdrawn" },
    mystery: { label: "悬疑档案", styleId: "linocut-editorial", styleLabel: "粗粝木刻社论插画", palette: ["#d7c49e", "#22262b", "#8f3e36"], paletteLabel: "旧纸 + 炭黑 + 线索红", camera: "证据特写与空间纵深交替", presentation: "standard" },
    brand: { label: "品牌价值", styleId: "organic-contour-doodle", styleLabel: "有机轮廓品牌涂鸦", palette: ["#f3e4c8", "#2b4c3f", "#e68463"], paletteLabel: "纸张米白 + 深绿 + 珊瑚橙", camera: "从具体选择扩展到群体关系", presentation: "standard" },
    poetic: { label: "意境散文", styleId: "emotional-watercolor-sketch", styleLabel: "情绪叙事淡彩速写", palette: ["#e8dcca", "#758cac", "#d49a91"], paletteLabel: "雾灰蓝 + 暖粉 + 纸张米色", camera: "留白构图与慢速呼吸式推进", presentation: "poetic" },
  };
  const PRESENTATION_PROFILES = {
    standard: { label: "基础镜头合成", transition: "平移 / 缩放与淡入淡出", subtitles: "narration-safe-area" },
    handdrawn: { label: "手绘显色", transition: "纸感降饱和起笔，逐幕显色与缓慢推进", subtitles: "narration-safe-area" },
    poetic: { label: "诗性长卷", transition: "留白画幅、横向游观与克制叠化", subtitles: "poetic-safe-area" },
  };
  const PRESET_EFFECT_PROFILE = { sky: "knowledge", electricity: "technology", poetry: "classical", aiEnergy: "technology" };
  const BLANK_PROJECT = {
    topic: "",
    audience: "普通公众",
    duration: "90",
    objective: "",
    misconception: "",
    entry: "",
    evidence: "",
  };

  function makeProductionContract(profileKey = "knowledge", presentationOverride = "", source = "studio") {
    const key = EFFECT_PROFILES[profileKey] ? profileKey : "knowledge";
    const profile = EFFECT_PROFILES[key];
    const presentationKey = PRESENTATION_PROFILES[presentationOverride] ? presentationOverride : profile.presentation;
    const presentation = PRESENTATION_PROFILES[presentationKey];
    return {
      schema: "knowledge-video-production-contract/v1",
      id: `pc-${key}-${presentationKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      source,
      story: { recipe: key, label: profile.label, structure: "five-act-learning-arc", rhythm: "问题—检验—模型—证据—迁移" },
      visual: {
        style_id: profile.styleId,
        style_label: profile.styleLabel,
        palette: [...profile.palette],
        palette_label: profile.paletteLabel,
        camera: profile.camera,
        continuity: "五幕复用同一主体、空间规则、色盘、画材和线条语言；只改变教学所需关系。",
        prompt_prefix: `${profile.label}；${profile.styleLabel}；${profile.paletteLabel}；${profile.camera}；统一主体与画材；画面内不得出现文字、水印、标志或伪文字。`,
      },
      presentation: { recipe: presentationKey, label: presentation.label, transition: presentation.transition, subtitles: presentation.subtitles },
      routing: { quality_tier: "automatic", story_provider: "MiniMax text", image_provider: "MiniMax Image", tts_provider: "MiniMax Speech", renderer: "story-to-handdrawn-video + FFmpeg", curated_upgrade: "Codex agent-assisted final visual" },
      quality: { consistency_policy: "single-visual-bible", review_gates: ["story", "visual-continuity", "pseudo-text", "facts", "playback"] },
    };
  }

  function sanitizeProductionContract(input, fallbackProfile = "knowledge", fallbackPresentation = "") {
    const requestedProfile = cleanHandoffValue(input?.story?.recipe, 24);
    const profileKey = EFFECT_PROFILES[requestedProfile] ? requestedProfile : fallbackProfile;
    const requestedPresentation = cleanHandoffValue(input?.presentation?.recipe, 24);
    const base = makeProductionContract(profileKey, PRESENTATION_PROFILES[requestedPresentation] ? requestedPresentation : fallbackPresentation, cleanHandoffValue(input?.source, 40) || "studio");
    if (!input || input.schema !== base.schema) return base;
    base.id = cleanHandoffValue(input.id, 100) || base.id;
    base.story.label = cleanHandoffValue(input.story?.label, 80) || base.story.label;
    base.story.rhythm = cleanHandoffValue(input.story?.rhythm, 200) || base.story.rhythm;
    base.visual.style_id = cleanHandoffValue(input.visual?.style_id, 80) || base.visual.style_id;
    base.visual.style_label = cleanHandoffValue(input.visual?.style_label, 80) || base.visual.style_label;
    base.visual.palette = Array.isArray(input.visual?.palette) ? input.visual.palette.slice(0, 5).map((value) => cleanHandoffValue(value, 20)).filter(Boolean) : base.visual.palette;
    base.visual.palette_label = cleanHandoffValue(input.visual?.palette_label, 140) || base.visual.palette_label;
    base.visual.camera = cleanHandoffValue(input.visual?.camera, 220) || base.visual.camera;
    base.visual.continuity = cleanHandoffValue(input.visual?.continuity, 300) || base.visual.continuity;
    base.visual.prompt_prefix = cleanHandoffValue(input.visual?.prompt_prefix, 600) || base.visual.prompt_prefix;
    base.presentation.label = cleanHandoffValue(input.presentation?.label, 80) || base.presentation.label;
    base.presentation.transition = cleanHandoffValue(input.presentation?.transition, 220) || base.presentation.transition;
    return base;
  }

  let handoffReadError = "";

  function cleanHandoffValue(value, maxLength) {
    return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function decodeStudioHandoff() {
    const encoded = new URLSearchParams(location.hash.slice(1)).get("handoff");
    if (!encoded) return null;
    try {
      if (encoded.length > 12000) throw new Error("交接数据过长");
      const normalized = encoded.replaceAll("-", "+").replaceAll("_", "/");
      const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder().decode(bytes));
      if (payload.schema !== "knowledge-video-handoff/v1") throw new Error("交接数据版本不兼容");
      const brief = {
        topic: cleanHandoffValue(payload.brief?.topic, 100),
        audience: cleanHandoffValue(payload.brief?.audience, 40) || "普通公众",
        duration: ["60", "90", "180"].includes(String(payload.brief?.duration)) ? String(payload.brief.duration) : "90",
        objective: cleanHandoffValue(payload.brief?.objective, 320),
        misconception: cleanHandoffValue(payload.brief?.misconception, 180),
        entry: cleanHandoffValue(payload.brief?.entry, 180),
        evidence: cleanHandoffValue(payload.brief?.evidence, 700),
      };
      if (brief.topic.length < 8 || brief.objective.length < 8 || brief.evidence.length < 8) throw new Error("交接简报缺少必填内容");
      return {
        source: cleanHandoffValue(payload.source, 40) || "research-page",
        createdAt: cleanHandoffValue(payload.created_at, 40),
        localPlan: payload.local_plan && typeof payload.local_plan === "object" ? payload.local_plan : null,
        productionContract: sanitizeProductionContract(payload.production_contract, cleanHandoffValue(payload.local_plan?.recommendation?.key, 24) || "knowledge"),
        brief,
      };
    } catch (error) {
      handoffReadError = error instanceof Error ? error.message : "无法读取交接数据";
      return null;
    }
  }

  const incomingHandoff = decodeStudioHandoff();

  const presets = {
    sky: {
      topic: "为什么天空是蓝色的？",
      audience: "初中生",
      duration: "90",
      objective: "看完后，观众能够用白光分色与瑞利散射解释蓝天和晚霞为何呈现不同颜色。",
      misconception: "天空是蓝色，因为它反射了海水。",
      entry: "同一天空为什么中午偏蓝、傍晚偏红？",
      evidence: "太阳光包含不同波长的可见光；在远小于波长的粒子上，散射强度与波长的四次方成反比；日落时光线穿过更长的大气路径。",
    },
    electricity: {
      topic: "电如何成为现代生活的基础设施？",
      audience: "普通公众",
      duration: "180",
      objective: "看完后，观众能够解释发电、输电和用电如何形成系统，并理解电气化为何改变生产、通信、医疗与日常生活。",
      misconception: "电是一位天才在某个时刻单独发明出来的成品。",
      entry: "一次短暂停电，为什么会同时影响照明、降温、通信、支付和供水？",
      evidence: "电气化来自电磁学、发电机、输配电、照明与电机等长期协作演进；现代电网通过发电、升压输电、变电和配电把能源送到用户。",
    },
    poetry: {
      topic: "《忆江南》如何用色彩和空间构建记忆？",
      audience: "初中生",
      duration: "90",
      objective: "看完后，观众能够从视点、色彩对照与空间推进解释“日出江花红胜火，春来江水绿如蓝”的画面结构。",
      misconception: "诗词讲解只需要逐字翻译和介绍作者生平。",
      entry: "短短五句，为什么能让人看见一整片江南？",
      evidence: "原词以“江南好”总领，通过旧曾谙、日出、江花、春水和能不忆江南完成由判断到视觉再到回望的结构。",
    },
    aiEnergy: {
      topic: "为什么 AI 那么耗电？",
      audience: "普通公众",
      duration: "90",
      objective: "看完后，观众能够解释 AI 用电发生在计算、数据搬运和散热环节，并理解单次请求与大规模持续调用之间的区别。",
      misconception: "AI 只是云端软件，输入一句话几乎不需要真实能源；或者每次 AI 回答都耗费相同电量。",
      entry: "当你按下发送键，一句提示词背后有哪些设备同时开始工作？",
      evidence: "依据 IEA《Energy and AI》：AI 模型训练与部署主要发生在数据中心；数据中心包含服务器、存储、网络、供电保障和冷却系统。服务器中的 CPU 与 GPU 等加速器执行计算，数据在存储器和网络之间移动也需要电，计算产生的热量需要冷却。实际耗电取决于模型、硬件、任务长度、利用率、数据中心效率和电力来源；不能给所有 AI 请求套用同一个耗电数字。",
    },
  };

  const baseActs = [
    { role: "问题进入", short: "QUESTION", title: "从一个能被感知的反差提出问题", purpose: "激活观众已有经验，并明确这条视频最终要解释的具体问题。", visual: "让两个可比较的现象同时出现，不先展示结论。", voice: "承认直觉为什么合理，再留下一个必须继续看的问题。", trust: "问题来自日常经验，不把直觉当成科学证据。", seconds: 16 },
    { role: "拆开直觉", short: "MISCONCEPTION", title: "让常见误解接受一次可见检验", purpose: "不是简单宣布误解错误，而是展示它无法解释的反例。", visual: "保留原场景，加入一个足以反驳误解的对照。", voice: "准确复述误解，再说明它遗漏了哪个关系。", trust: "反例只用于排除解释，不直接证明新模型。", seconds: 17 },
    { role: "建立模型", short: "MODEL", title: "用最小结构建立核心机制", purpose: "用少量元素呈现关键因果关系，让后续证据有位置可以进入。", visual: "固定主体和视觉语法，只增加必要关系与方向。", voice: "先给关系，再给术语；类比必须同时说明边界。", trust: "艺术化箭头表达关系，不代表真实尺度或运动轨迹。", seconds: 22 },
    { role: "证据解释", short: "EVIDENCE", title: "让事实材料解释模型为什么成立", purpose: "把输入材料放到对应机制上，避免用漂亮画面替代证据。", visual: "用同一构图建立变量变化前后的对照。", voice: "明确哪些是事实、哪些是基于事实的解释。", trust: "来源、日期与适用条件进入项目清单。", seconds: 20 },
    { role: "迁移收束", short: "TRANSFER", title: "把理解迁移到一个新的观察", purpose: "观众要能用刚建立的模型解释新情境，而不只是复述定义。", visual: "回到开头场景，让新的理解改变观看方式。", voice: "用一个可回答的问题收束，不使用空泛升华。", trust: "迁移结论不超出已展示证据的范围。", seconds: 15 },
  ];

  const sceneMeta = [
    { label: "问题 · 日常反差", title: "屋顶上的同一片天空", note: "女孩在中午蓝天与远处晚霞之间提出问题。" },
    { label: "模型 · 白光分色", title: "先看见光里有什么", note: "棱镜把白光展开，不把蓝天归因于海水反射。" },
    { label: "机制 · 瑞利散射", title: "短波光更容易被散射", note: "同一人物和屋顶保留，空气粒子与光路进入画面。" },
    { label: "证据 · 大气路径", title: "傍晚为什么转为红色", note: "光线穿过更长路径，蓝紫光更多离开直达视线。" },
    { label: "迁移 · 重新观看", title: "蓝天与晚霞是同一机制", note: "回到屋顶，用新模型完成解释和知识迁移。" },
  ];

  const aiEnergyDemo = {
    projectId: "kv-20260823074716-bq4ges",
    manifestUrl: "./assets/ai-energy-demo/project.json",
    project: { ...presets.aiEnergy },
    plan: {
      title: "按下发送键后，AI 在悄悄消耗什么",
      learning_promise: "观众能说出 AI 用电发生在计算、数据搬运和散热三个环节，并理解单次请求与大规模持续调用之间存在显著差异。",
      visual_bible: "信息图式 3D 数字插画；深夜蓝与电光蓝为底，暖橙红表达算力和热量，冷绿表达效率提升；无真实人物、无画内文字。",
      facts_boundary: "只使用数据中心、服务器、存储、网络、冷却、CPU/GPU、任务长度、利用率和电力来源等已提供概念；不为单次请求杜撰统一耗电数字。",
      acts: [
        { index: 1, role: "问题进入", title: "一句提示词的旅程", purpose: "把观众从手机界面带到远方的物理基础设施。", visual: "手机发出的光带越过网络，进入透明剖面的数据中心；不出现文字。", narration: "你按下发送键的瞬间，提示词穿过终端与网络，抵达数据中心。一句简单的话，背后仍需要真实的服务器、网络和供电系统协同工作。", trust: "画面为关系示意，不对应真实位置或设备数量。", seconds: 18 },
        { index: 2, role: "拆开误解", title: "云不是虚无的", purpose: "纠正云端软件几乎不需要真实能源的误解。", visual: "数据中心剖面显露服务器、供电和冷却路径；不出现人物或水印。", narration: "有人觉得 AI 只是云端软件，输入一句话几乎不耗电。但云不是虚无的，它是一座座真实的数据中心，里面的服务器、存储、网络与冷却设备都需要电力。", trust: "只表达 AI 服务依赖实体硬件，不暗示所有数据中心结构相同。", seconds: 18 },
        { index: 3, role: "建立模型", title: "三股电流同时涌动", purpose: "建立计算、数据搬运与散热三个耗电环节。", visual: "计算、数据流和冷却三条能量路径汇入同一服务器集群。", narration: "电主要消耗在三个地方：CPU 和 GPU 拼命做计算，存储与网络之间来回搬运数据，散热系统则在不停抽走热量。三股电流，同时涌动。", trust: "三部分来自事实材料；画面不表达真实占比。", seconds: 18 },
        { index: 4, role: "证据解释", title: "不是每次都耗同样的电", purpose: "解释单次请求和大规模持续调用的差异。", visual: "稀疏小请求与密集大请求流向同一数据中心，形成相对亮度对照。", narration: "但不是每次回答都耗同样的电。模型大小、硬件新旧、问题长短、数据中心利用率和电力来源，都会让能耗相差非常悬殊。", trust: "只做定性比较，不给出未经证实的单次请求数字。", seconds: 18 },
        { index: 5, role: "迁移收束", title: "压低曲线的几种方式", purpose: "把理解转化为效率、批处理、利用率和低碳电力四个方向。", visual: "更高效的数据中心与风电、城市供电相连，能量颜色从橙转为冷绿。", narration: "理解这一点不是为了焦虑，而是为了选择。更高效的模型、批处理、提高利用率、转向低碳电力，每一项都在悄悄压低 AI 的能耗曲线。", trust: "只复述输入材料中的降耗方向，不外推商业或政策结论。", seconds: 18 },
      ],
    },
    storyboard: {
      provider: "Codex imagegen · final visual layer",
      model: "Codex built-in imagegen",
      scenes: [1, 2, 3, 4, 5].map((index) => ({
        index,
        url: `./assets/ai-energy-demo/scene-0${index}.png`,
        status: "generated",
        provider: "Codex built-in imagegen",
        draft_provider: "MiniMax Image image-01",
        revision_reason: index === 4 ? "统一视觉圣经并强化请求规模对照" : "统一风格并移除初稿伪文字或水印",
      })),
    },
    voice: {
      provider: "MiniMax China HTTP T2A",
      model: "speech-2.8-hd",
      voice: "female-chengshu",
      speed: 0.94,
      url: "./assets/ai-energy-demo/narration.wav",
      segments: [14.52, 17.22, 15.497, 13.42, 14.52].map((duration, index) => ({ index: index + 1, duration })),
    },
    render: {
      file: "why-ai-uses-electricity.mp4",
      url: "./assets/ai-energy-demo/why-ai-uses-electricity.mp4",
      width: 1280,
      height: 720,
      duration: 79.2,
      bytes: 4978252,
      renderer: "deterministic FFmpeg",
    },
    events: [
      { stage: "FACT", status: "ok", message: "IEA 事实边界与学习目标已人工复核" },
      { stage: "STORY", status: "ok", message: "五幕故事、旁白、画面任务和禁区已对齐" },
      { stage: "VISUAL", status: "ok", message: "MiniMax 初稿已由 Codex 统一重绘为最终五幕" },
      { stage: "AUDIO", status: "ok", message: "MiniMax speech-2.8-hd 五段旁白已生成" },
      { stage: "RENDER", status: "ok", message: "FFmpeg 已生成 H.264 / AAC 成片与字幕" },
      { stage: "QC", status: "ok", message: "事实、叙事、画面连续性和技术播放均已复核" },
    ],
  };

  function buildRecordedPlan(title, learningPromise, rows) {
    const roles = ["问题进入", "拆开误解", "建立模型", "证据解释", "迁移收束"];
    return {
      title,
      learning_promise: learningPromise,
      acts: rows.map(([actTitle, visual, narration, trust], index) => ({
        index: index + 1,
        role: roles[index],
        title: actTitle,
        purpose: `第 ${index + 1} 幕用画面与旁白共同完成“${actTitle}”的知识任务。`,
        visual,
        narration,
        trust,
        seconds: 18,
      })),
    };
  }

  function buildRecordedStoryboard(folder, titles) {
    return {
      provider: "Codex imagegen · reviewed reference",
      model: "Codex built-in imagegen",
      scenes: titles.map((title, index) => ({
        index: index + 1,
        title,
        url: `./assets/${folder}/scene-0${index + 1}-thumb.webp`,
        provider: "Codex built-in imagegen",
        status: "recorded",
      })),
    };
  }

  function buildRecordedEvents(label) {
    return [
      { stage: "PLAN", status: "ok", message: `${label}五幕知识方案已载入` },
      { stage: "VISUAL", status: "ok", message: "5 张匹配分镜与连续性记录已载入" },
      { stage: "AUDIO", status: "ok", message: "MiniMax 正式旁白与真实时长已载入" },
      { stage: "RENDER", status: "ok", message: "H.264 / AAC 正式样片已载入" },
      { stage: "QC", status: "ok", message: "项目来源、字幕与媒体播放已检查" },
    ];
  }

  const presetDemos = {
    sky: {
      projectId: "sample-sky-blue",
      manifestUrl: "./assets/sky-blue-demo/media-manifest.json",
      plan: buildRecordedPlan("天空为什么是蓝色", "用同一个散射模型解释正午蓝天与傍晚晚霞。", [
        ["海洋没有把天空染蓝", "同一学生在屋顶观察远离海岸的蓝天。", "抬头看，天空为什么是蓝色的？有人说，是海洋把天空染蓝了。可即使远离海岸，晴空依旧蔚蓝。真正的答案，藏在阳光与空气相遇的那一刻。", "日常反例用于排除海水反射解释。"],
        ["白光里原本就有许多颜色", "棱镜把白光展开为连续光谱。", "太阳光看起来是白色，却包含从紫、蓝到橙、红的一整段可见光。让它穿过棱镜，不同波长就会走向不同方向：蓝紫光的波长较短，橙红光的波长较长。", "光谱方向为教学示意。"],
        ["短波光更容易被空气散射", "空气分子与多向蓝色光路围绕同一学生展开。", "当阳光进入大气，远小于可见光波长的空气分子会让光发生瑞利散射。短波长的光被散射得更强，于是蓝光从四面八方进入我们的眼睛。", "粒子大小与光路不按真实比例绘制。"],
        ["更长的大气路径写出晚霞", "正午蓝与傍晚橙使用同一屋顶作对照。", "到了日落，阳光要斜着穿过更长的大气路径。沿途越来越多的蓝紫光被散向别处，继续直达眼睛的光便偏向橙红。", "只表达路径变化与相对散射。"],
        ["用一个机制预测另一个现象", "学生回到屋顶向同伴复述蓝天和晚霞。", "天空不是一块被涂蓝的幕布，而是一场每秒都在发生的光与空气的相遇。下一次看见晚霞，你已经知道它为什么会燃烧。", "收束不超出已建立的散射模型。"],
      ]),
      storyboard: buildRecordedStoryboard("sky-blue-demo", ["海洋没有把天空染蓝", "白光里原本就有许多颜色", "短波光更容易被空气散射", "更长的大气路径写出晚霞", "用一个机制预测另一个现象"]),
      voice: { provider: "MiniMax China HTTP T2A", model: "speech-2.8-hd", voice: "female-chengshu", speed: 0.92, url: "./assets/sky-blue-demo/narration.wav", segments: [17.54, 19.12, 24.11, 20.34, 21.14].map((duration, index) => ({ index: index + 1, duration })) },
      render: { file: "why-is-the-sky-blue.mp4", url: "./assets/sky-blue-demo/why-is-the-sky-blue.mp4", width: 1280, height: 720, duration: 107.233, renderer: "deterministic FFmpeg" },
      events: buildRecordedEvents("天空科普"),
      narrationCharacters: 401,
    },
    electricity: {
      projectId: "sample-electricity-system",
      manifestUrl: "./assets/power-outage-demo/media-manifest.json",
      plan: buildRecordedPlan("停电以后，我看见了电", "从一次停电解释现代生活对电力系统的依赖，以及电气化为何不是单一发明。", [
        ["电的缺席先被身体感知", "同一现代人物在闷热、断电的凌晨房间里等待。", "凌晨两点多，空调先停，风扇的叶片慢下来，路由器最后一点绿光也熄了。黑暗并不可怕，可怕的是闷热没有尽头，手机电量开始变成倒计时。", "亲历感受不等于所有停电场景的普遍后果。"],
        ["停电让依赖网络显影", "房间向制冷、通信、冷藏、泵与电梯的依赖关系展开。", "余下的手机光照出一张依赖清单：制冷、通信、冷藏，还有一些建筑里的水泵与电梯，都可能随着供电中断而退到幕后。", "不同设备可能有电池、应急电源和不同恢复顺序。"],
        ["电不是一位天才的单次发明", "匿名实验之手、伏打电堆与法拉第环形线圈依次出现。", "电也不是某个人在某个夜晚突然发明的。一八零零年，伏打电堆让连续电流更容易被研究。一八三一年，法拉第的实验展示电磁感应。", "年份与装置来自史实来源，不把电归于单一发明者。"],
        ["装置协作才成为供电系统", "灯、发电机、变压器、配电设备和街区组成系统。", "但能产生电，还不等于千家万户能够使用电。许多人继续改进灯丝、发电机、变压器、配电和计量。真正改变世界的，不只是一只灯泡，而是一整套会协作的系统。", "区分发现、装置与基础设施系统。"],
        ["复电之后重新看见维护者", "同一房间和城市复电，风扇与路由器重新工作。", "后来，电回来了。风扇重新转动，路由器的灯一颗颗亮起，窗外的城市恢复低声呼吸。它让无数别的发明同时醒来，也让维护这张网络的人重新变得可见。", "“伟大”属于叙述者判断，不作为客观排名。"],
      ]),
      storyboard: buildRecordedStoryboard("power-outage-demo", ["电的缺席先被身体感知", "停电让依赖网络显影", "电不是一位天才的单次发明", "装置协作才成为供电系统", "复电之后重新看见维护者"]),
      voice: { provider: "MiniMax China HTTP T2A", model: "speech-2.8-hd", voice: "Chinese (Mandarin)_Sincere_Adult", speed: 0.96, url: "./assets/power-outage-demo/narration.wav", segments: [19.74, 19.12, 22.42, 24.03, 24.79].map((duration, index) => ({ index: index + 1, duration })) },
      render: { file: "after-the-power-went-out-i-saw-electricity.mp4", url: "./assets/power-outage-demo/after-the-power-went-out-i-saw-electricity.mp4", width: 1280, height: 720, duration: 115.833, renderer: "deterministic FFmpeg" },
      events: buildRecordedEvents("电力系统"),
      narrationCharacters: 494,
    },
    poetry: {
      projectId: "sample-remembering-jiangnan",
      manifestUrl: "./assets/jiangnan-bright-demo/media-manifest.json",
      plan: buildRecordedPlan("《忆江南》如何用色彩和空间构建记忆", "从总领、视点、日出、红绿对照与反问收束解释一首词的画面结构。", [
        ["“江南好”先建立可进入的空间", "春晨水乡、屋舍、拱桥和清透水面从总景展开。", "唐，白居易，《忆江南·江南好》。江南好。开篇只有三个字，却不是空泛的赞美。画面先给出春晨的水乡，让“好”先成为可以进入的空间。", "只使用原词能够支持的总体江南意象。"],
        ["“旧曾谙”把风景变成记忆", "小舟进入水巷，以回望者而非作者肖像建立视点。", "风景旧曾谙。“谙”不是第一次看见，而是曾经熟悉。镜头跟随一叶小舟进入水巷，不把舟中人画成白居易的历史肖像。", "回望者是视点工具，不宣称为作者写实形象。"],
        ["“日出”是颜色变化的光源", "太阳从白墙黛瓦与远山后升起，金色反光靠近小舟。", "日出。太阳从远山和白墙黛瓦之后升起，朱红色不是装饰，而是下一句的光源。江南由安静的轮廓转为有温度、有方向的清晨。", "日出与颜色关系属于文本内解释。"],
        ["红与绿构成全词视觉高潮", "珊瑚红花与孔雀绿水同框，保留蓝色天光和岸影层次。", "江花红胜火，春来江水绿如蓝。这是全词最鲜明的颜色对照：花红被日光点燃；水绿之中仍有天光的蓝、岸影的深绿和流动的亮面。", "颜色为诗意视觉化，不当作历史现场复原。"],
        ["反问把画面收回记忆", "小舟渐远，红花、绿水和晨光留在视野中。", "能不忆江南？结尾不是要求一个答案。小舟渐远，红花、绿水和晨光仍留在视野里；鲜明的颜色最终不是喧闹，而是记忆留下的清晰度。", "解释聚焦文本结构，不补写争议生平。"],
      ]),
      storyboard: buildRecordedStoryboard("jiangnan-bright-demo", ["“江南好”先建立可进入的空间", "“旧曾谙”把风景变成记忆", "“日出”是颜色变化的光源", "红与绿构成全词视觉高潮", "反问把画面收回记忆"]),
      voice: { provider: "MiniMax China HTTP T2A", model: "speech-2.8-hd", voice: "Chinese (Mandarin)_Lyrical_Voice", speed: 0.95, url: "./assets/jiangnan-bright-demo/narration.wav", segments: [25.48, 20.24, 22.16, 21.2, 22.09].map((duration, index) => ({ index: index + 1, duration })) },
      render: { file: "remembering-jiangnan-lecture.mp4", url: "./assets/jiangnan-bright-demo/remembering-jiangnan-lecture.mp4", width: 1280, height: 720, duration: 116.42, renderer: "deterministic FFmpeg · lecture layout" },
      events: buildRecordedEvents("《忆江南》诗卷讲解"),
      narrationCharacters: 383,
    },
    aiEnergy: { ...aiEnergyDemo, narrationCharacters: 609 },
  };

  const initialState = {
    stage: "brief",
    completed: [],
    locked: [false, false, false, false, false],
    audioReady: false,
    voice: "female-chengshu",
    speed: 0.92,
    ratio: "16:9",
    recipe: "handdrawn",
    productionContract: makeProductionContract("knowledge", "handdrawn", "studio-default"),
    service: "demo",
    serviceMode: "offline",
    apiKeyConfigured: false,
    projectId: null,
    plan: null,
    storyboard: null,
    voiceData: null,
    renderData: null,
    origin: "draft",
    activePreset: "sky",
    handoff: null,
    project: { ...presets.sky },
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || typeof saved !== "object") return structuredClone(initialState);
      const inferredPreset = Object.entries(presets).find(([, preset]) => preset.topic === saved.project?.topic)?.[0] || "sky";
      const migratedVoice = saved.voice === "presenter_male" ? "male-qn-jingying" : saved.voice;
      const voice = VOICE_PROFILES[migratedVoice] ? migratedVoice : initialState.voice;
      const activePreset = Object.prototype.hasOwnProperty.call(saved, "activePreset") ? saved.activePreset : inferredPreset;
      const fallbackProfile = activePreset ? PRESET_EFFECT_PROFILE[activePreset] || "knowledge" : "knowledge";
      const productionContract = sanitizeProductionContract(saved.productionContract, fallbackProfile, PRESENTATION_PROFILES[saved.recipe] ? saved.recipe : "");
      const recipe = productionContract.presentation.recipe;
      return { ...initialState, ...saved, voice, recipe, productionContract, activePreset, project: { ...initialState.project, ...(saved.project || {}) } };
    } catch (_) {
      return structuredClone(initialState);
    }
  }

  let state = loadState();
  if (state.activePreset === null) {
    const containsRecordedAsset = (value) => String(value || "").includes("/assets/");
    if (state.storyboard?.scenes?.some((scene) => containsRecordedAsset(scene.url))) {
      state.storyboard = null;
      state.locked = [false, false, false, false, false];
      state.completed = state.completed.filter((stage) => !["plan", "storyboard", "voice", "render", "delivery"].includes(stage));
    }
    if (containsRecordedAsset(state.voiceData?.url)) {
      state.voiceData = null;
      state.audioReady = false;
      state.completed = state.completed.filter((stage) => !["voice", "render", "delivery"].includes(stage));
    }
    if (containsRecordedAsset(state.renderData?.url)) {
      state.renderData = null;
      state.completed = state.completed.filter((stage) => !["render", "delivery"].includes(stage));
    }
    if (!state.plan) state.stage = "brief";
    else if (!state.storyboard && !["brief", "plan"].includes(state.stage)) state.stage = "plan";
    else if (!state.voiceData && ["render", "delivery"].includes(state.stage)) state.stage = "voice";
    else if (!state.renderData && state.stage === "delivery") state.stage = "render";
  }
  if (incomingHandoff) {
    state = {
      ...structuredClone(initialState),
      activePreset: null,
      origin: "research-handoff",
      handoff: {
        source: incomingHandoff.source,
        createdAt: incomingHandoff.createdAt,
        localPlan: incomingHandoff.localPlan,
        status: "incoming",
      },
      productionContract: incomingHandoff.productionContract,
      recipe: incomingHandoff.productionContract.presentation.recipe,
      project: { ...incomingHandoff.brief },
    };
    persist();
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  } else if (handoffReadError) {
    history.replaceState(null, "", `${location.pathname}${location.search}`);
  }
  let activeAct = 0;
  let toastTimer;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function announce(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
  }

  function markComplete(stage) {
    if (!state.completed.includes(stage)) state.completed.push(stage);
    persist();
    renderProjectState();
  }

  function setStage(stage, focus = true) {
    if (!STAGES.includes(stage)) return;
    state.stage = stage;
    persist();
    $$('[data-stage]').forEach((panel) => {
      const active = panel.dataset.stage === stage;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });
    $$('[data-stage-button]').forEach((button) => {
      const active = button.dataset.stageButton === stage;
      if (active) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
      button.dataset.complete = String(state.completed.includes(button.dataset.stageButton));
    });
    renderProjectState();
    if (focus) {
      const title = $(`[data-stage="${stage}"] h2`);
      title?.setAttribute("tabindex", "-1");
      title?.focus({ preventScroll: true });
      $(".workflow-rail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function renderProjectState() {
    const completedCount = state.completed.length;
    const lockedCount = state.locked.filter(Boolean).length;
    const labels = { brief: "DRAFT", plan: "PLANNING", storyboard: "REVIEW", voice: "AUDIO", render: "RENDER", delivery: "DELIVERY" };
    $("#project-state").textContent = labels[state.stage] || "DRAFT";
    $("#project-title").textContent = state.project.topic;
    $("#project-meta").textContent = `${state.project.audience} · ${state.project.duration} 秒 · ${state.ratio}`;
    $("#project-progress-bar").style.width = `${Math.max(8, Math.round((completedCount / 6) * 100))}%`;
    $("#scene-count").textContent = `${lockedCount}/5`;
    $("#audio-state").textContent = state.audioReady ? "已生成" : "未生成";
    const recordedDemo = getPresetDemo();
    $("#estimated-images").textContent = `${recordedDemo?.storyboard?.scenes?.length || 5} 张`;
    $("#estimated-voice").textContent = recordedDemo?.narrationCharacters ? `${recordedDemo.narrationCharacters} 字` : "待方案计算";
    $("#estimated-motion").textContent = "0 段";
    $("#locked-label").textContent = `${lockedCount} / 5 已锁定`;
    $("#approve-storyboard").disabled = lockedCount !== 5;
    const custom = isCustomProject();
    const customAccess = {
      brief: true,
      plan: Boolean(state.plan),
      storyboard: Boolean(state.storyboard),
      voice: Boolean(state.storyboard),
      render: Boolean(state.voiceData),
      delivery: Boolean(state.renderData),
    };
    $$('[data-stage-button]').forEach((button) => {
      button.dataset.complete = String(state.completed.includes(button.dataset.stageButton));
      button.disabled = custom && !customAccess[button.dataset.stageButton];
    });
  }

  function renderIncomingHandoff() {
    const card = $("#incoming-handoff");
    const title = $("#handoff-title");
    const meta = $("#handoff-meta");
    const generate = $("#handoff-generate");
    if (handoffReadError) {
      card.hidden = false;
      card.dataset.status = "error";
      title.textContent = "研究页交接数据无法读取";
      meta.textContent = `${handoffReadError}。请返回研究页重新送入，或直接在下方填写。`;
      generate.disabled = true;
      return;
    }
    const visible = state.handoff?.status === "incoming";
    card.hidden = !visible;
    if (!visible) return;
    card.dataset.status = "ready";
    title.textContent = `已接收：${state.project.topic}`;
    const recommendation = cleanHandoffValue(state.handoff.localPlan?.recommendation?.label || state.handoff.localPlan?.recommendation?.name, 48);
    const contract = state.productionContract;
    meta.textContent = IS_LOCAL_RUNTIME
      ? `${state.project.audience} · ${state.project.duration} 秒 · 七项简报已带入${recommendation ? ` · 本地建议：${recommendation}` : ""}。效果契约 ${contract.id} 已锁定为“${contract.visual.style_label} + ${contract.presentation.label}”，确认后会随简报提交。`
      : `${state.project.audience} · ${state.project.duration} 秒 · 七项简报已带入${recommendation ? ` · 研究建议：${recommendation}` : ""}。当前为远端静态说明，可审阅效果契约；真实生成请在本地生产台执行。`;
    generate.innerHTML = IS_LOCAL_RUNTIME
      ? "<span>确认并生成方案</span><small>调用 MiniMax 文本模型</small>"
      : "<span>远端不执行生成</span><small>真实任务请切换本地</small>";
    generate.disabled = false;
  }

  function renderProductionContract() {
    const contract = state.productionContract;
    if (!contract) return;
    $("#contract-id").textContent = contract.id;
    $("#contract-story").textContent = contract.story.label;
    $("#contract-visual").textContent = contract.visual.style_label;
    $("#contract-presentation").textContent = contract.presentation.label;
    $("#contract-routing").textContent = IS_LOCAL_RUNTIME ? "MiniMax 全自动" : "远端静态展示";
    $("#contract-routing-detail").textContent = IS_LOCAL_RUNTIME
      ? "文本 → 图片 → TTS；本地生产台可完整执行"
      : "配置可审阅；MiniMax 与 FFmpeg 在本地执行";
    $("#contract-quality-boundary").textContent = IS_LOCAL_RUNTIME
      ? "最高质量的 Codex 统一终稿属于 Agent 协作精制路线，网页不能把它伪装成可直接调用的 API；当前选择的是可在本地生产台完整跑通的 MiniMax 自动路线。"
      : "远端页面只展示可执行效果契约与质量路线，不调用模型；MiniMax 自动链在本地生产台执行，Codex 统一终稿仍属于 Agent 协作精制。";
    $("#contract-palette").textContent = contract.visual.palette_label;
    $("#contract-continuity").textContent = contract.visual.continuity;
    $("#effect-profile").value = EFFECT_PROFILES[contract.story.recipe] ? contract.story.recipe : "knowledge";
    $$('[data-presentation]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.presentation === contract.presentation.recipe)));
    $$('input[name="recipe"]').forEach((input) => {
      input.checked = input.value === contract.presentation.recipe;
      input.disabled = true;
    });
    $("#render-contract-id").textContent = contract.id;
    $("#delivery-contract-id").textContent = contract.id;
    state.recipe = contract.presentation.recipe;
  }

  function changeProductionContract(profileKey, presentationKey) {
    if (!isCustomProject()) enterCustomDraft();
    state.productionContract = makeProductionContract(profileKey, presentationKey, state.handoff ? "research-adjusted" : "studio-selection");
    state.recipe = state.productionContract.presentation.recipe;
    state.projectId = null;
    state.plan = null;
    state.storyboard = null;
    state.voiceData = null;
    state.renderData = null;
    state.locked = [false, false, false, false, false];
    state.audioReady = false;
    state.completed = [];
    renderProductionContract();
    renderActs();
    renderStoryboard();
    renderScripts();
    applyGeneratedMedia();
    renderProjectState();
    persist();
    announce(`效果契约已更新：${state.productionContract.visual.style_label} + ${state.productionContract.presentation.label}。旧生成结果已清空。`);
  }

  function selectedVoiceLabel() {
    return VOICE_PROFILES[state.voice]?.label || state.voice;
  }

  function invalidateVoiceOutput() {
    state.audioReady = false;
    state.voiceData = null;
    state.renderData = null;
    state.completed = state.completed.filter((stage) => !["voice", "render", "delivery"].includes(stage));
    applyGeneratedMedia();
    if (!isCustomProject()) {
      $("#audio-badge").textContent = `已选择${selectedVoiceLabel()} · 生成后试听`;
      $("#voice-preview-note").textContent = "当前播放器仍是该预设的参考样例，不代表当前选择；重新生成后才会替换。";
    }
    renderProjectState();
  }

  function fillForm(project) {
    Object.entries(project).forEach(([key, value]) => {
      const field = $(`#${key}`);
      if (field) field.value = value;
    });
  }

  function getPresetDemo() {
    return presetDemos[state.activePreset] || null;
  }

  function isCustomProject() {
    return state.activePreset === null;
  }

  function renderProjectMode() {
    const custom = isCustomProject();
    document.body.dataset.projectMode = custom ? "custom" : "preset";
    $("#preset-library").hidden = custom;
    $("#preset-source").hidden = state.activePreset !== "aiEnergy";
    $("#run-ai-pipeline").hidden = custom;
    const deliveryAction = $("#run-demo-job");
    deliveryAction.disabled = custom && !state.renderData;
    if (custom && !state.renderData) {
      deliveryAction.querySelector("span").textContent = "尚无本次成片";
      deliveryAction.querySelector("small").textContent = "请先完成分镜、声音与正式合成";
    } else if (custom) {
      deliveryAction.querySelector("span").textContent = "查看当前交付结果";
      deliveryAction.querySelector("small").textContent = "直接播放、下载并查看项目清单";
    } else {
      deliveryAction.querySelector("span").textContent = "运行演示任务";
      deliveryAction.querySelector("small").textContent = "查看完整状态与交付过程";
    }
  }

  function enterCustomDraft() {
    if (isCustomProject()) return;
    state.activePreset = null;
    state.origin = "custom-draft";
    state.project = readForm();
    state.projectId = null;
    state.plan = null;
    state.storyboard = null;
    state.voiceData = null;
    state.renderData = null;
    state.locked = [false, false, false, false, false];
    state.completed = [];
    state.audioReady = false;
    state.handoff = null;
    $$('[data-preset]').forEach((button) => button.setAttribute("aria-pressed", "false"));
    renderProjectMode();
    renderProductionContract();
    renderActs();
    renderStoryboard();
    renderScripts();
    applyGeneratedMedia();
    renderProjectState();
    persist();
  }

  function selectPreset(name, { reset = true } = {}) {
    const preset = presets[name];
    if (!preset) return;
    state.activePreset = name;
    $$('[data-preset]').forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.preset === name)));
    state.project = { ...preset };
    if (reset) {
      state.locked = [false, false, false, false, false];
      state.audioReady = false;
      state.completed = [];
      state.projectId = null;
      state.plan = null;
      state.storyboard = null;
      state.voiceData = null;
      state.renderData = null;
      state.origin = "draft";
      state.handoff = null;
      state.productionContract = makeProductionContract(PRESET_EFFECT_PROFILE[name] || "knowledge", "", "preset-selection");
      state.recipe = state.productionContract.presentation.recipe;
    }
    fillForm(state.project);
    renderActs();
    renderStoryboard();
    renderScripts();
    applyGeneratedMedia();
    persist();
    renderProjectState();
    renderIncomingHandoff();
    renderProjectMode();
    renderProductionContract();
  }

  function readForm() {
    return {
      topic: $("#topic").value.trim(),
      audience: $("#audience").value,
      duration: $("#duration").value,
      objective: $("#objective").value.trim(),
      misconception: $("#misconception").value.trim(),
      entry: $("#entry").value.trim(),
      evidence: $("#evidence").value.trim(),
    };
  }

  function buildActs() {
    const currentPlan = state.plan?.acts?.length === 5 ? state.plan : getPresetDemo()?.plan;
    if (currentPlan?.acts?.length === 5) {
      return currentPlan.acts.map((act, index) => ({
        ...act,
        short: ["QUESTION", "MISCONCEPTION", "MODEL", "EVIDENCE", "TRANSFER"][index],
        voice: act.narration,
      }));
    }
    return baseActs.map((act, index) => {
      const project = state.project;
      if (index === 0) return { ...act, title: project.entry || act.title, purpose: `以“${project.entry || "日常问题"}”建立观看动机，并明确观众最后要能解释什么。` };
      if (index === 1) return { ...act, title: `检验“${project.misconception || "常见误解"}”`, purpose: `让“${project.misconception || "常见误解"}”面对无法解释的反例，而不是只用权威结论覆盖它。` };
      if (index === 2) return { ...act, title: `建立“${project.topic}”的最小解释模型`, purpose: project.objective };
      if (index === 3) return { ...act, purpose: `把材料“${project.evidence.slice(0, 82)}${project.evidence.length > 82 ? "…" : ""}”放到对应机制上。` };
      return { ...act, title: "回到开头，用新的模型完成解释", purpose: `让${project.audience}能够迁移并复述：${project.objective}` };
    });
  }

  function renderActs() {
    const acts = buildActs();
    const list = $("#act-list");
    list.replaceChildren();
    acts.forEach((act, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-selected", String(index === activeAct));
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><span><b>${escapeHtml(act.role)}</b><small>${act.seconds} 秒 · ${escapeHtml(act.short)}</small></span>`;
      button.addEventListener("click", () => { activeAct = index; renderActs(); });
      item.append(button);
      list.append(item);
    });
    const act = acts[activeAct];
    $("#act-label").textContent = `ACT ${String(activeAct + 1).padStart(2, "0")} · ${act.role}`;
    $("#act-title").textContent = act.title;
    $("#act-purpose").textContent = act.purpose;
    $("#act-visual").textContent = act.visual;
    $("#act-voice").textContent = act.voice;
    $("#act-trust").textContent = act.trust;
    $("#learning-promise").textContent = state.plan?.learning_promise || getPresetDemo()?.plan?.learning_promise || `观众能够完成：${state.project.objective}`;
  }

  function renderStoryboard() {
    const grid = $("#storyboard-grid");
    const acts = buildActs();
    const recordedScenes = getPresetDemo()?.storyboard?.scenes || [];
    const custom = isCustomProject();
    grid.replaceChildren();
    sceneMeta.forEach((scene, index) => {
      const generated = state.storyboard?.scenes?.find((item) => Number(item.index) === index + 1);
      const recorded = recordedScenes.find((item) => Number(item.index) === index + 1);
      const displayScene = generated || recorded;
      const act = acts[index];
      const imageSource = displayScene?.url || (custom ? "" : `./assets/sky-blue-demo/scene-0${index + 1}-thumb.webp`);
      const title = displayScene || custom ? act.title : scene.title;
      const note = displayScene || custom ? act.visual : scene.note;
      const label = generated ? `${act.role} · FINAL VISUAL` : recorded ? `${act.role} · RECORDED SAMPLE` : custom ? `${act.role} · WAITING` : scene.label;
      const provider = displayScene?.provider || state.storyboard?.model || (custom ? "NOT GENERATED" : "REFERENCE");
      const card = document.createElement("article");
      card.className = "scene-card";
      card.dataset.scene = String(index);
      card.innerHTML = `
        <div class="scene-card__image" data-index="SCENE ${String(index + 1).padStart(2, "0")}">${imageSource ? `<img src="${escapeHtml(imageSource)}" alt="${escapeHtml(title)}" />` : `<div class="scene-image-empty"><b>等待本项目图像</b><span>批准方案后由图像模型生成</span></div>`}</div>
        <div class="scene-card__body"><span>${escapeHtml(label)}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(note)}</p>
          <div class="scene-card__actions"><button type="button" class="regenerate-button" ${custom && !state.projectId ? "disabled" : ""}>重新生成</button><button type="button" class="lock-button" aria-pressed="${state.locked[index]}" ${!displayScene ? "disabled" : ""}>${state.locked[index] ? "已锁定" : "锁定镜头"}</button></div>
          <div class="scene-card__state"><span>${displayScene ? `${escapeHtml(provider)} · ${generated ? "GENERATED" : "RECORDED"}` : custom ? "CURRENT PROJECT · EMPTY" : "REFERENCE · STYLE LOCK"}</span><b>${state.locked[index] ? "APPROVED" : displayScene ? "REVIEW" : "WAIT"}</b></div>
        </div>`;
      $(".lock-button", card).addEventListener("click", () => toggleLock(index));
      $(".regenerate-button", card).addEventListener("click", () => regenerateScene(index));
      grid.append(card);
    });
    renderProjectState();
  }

  function toggleLock(index) {
    state.locked[index] = !state.locked[index];
    persist();
    renderStoryboard();
    announce(state.locked[index] ? `第 ${index + 1} 幕已锁定，后续批量生成会跳过它。` : `第 ${index + 1} 幕已解锁。`);
  }

  async function callAction(action, payload) {
    if (!IS_LOCAL_RUNTIME || !API_BASE) throw new Error("远端页面只展示流程；请在本地生产台执行真实生成");
    const response = await fetch(`${API_BASE}/api/actions/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) throw new Error(result.error || `HTTP ${response.status}`);
    return result;
  }

  async function regenerateScene(index) {
    if (state.locked[index]) {
      announce(`第 ${index + 1} 幕已锁定；先解锁才能重新生成。`);
      return;
    }
    const card = $(`[data-scene="${index}"]`);
    card.dataset.generating = "true";
    const button = $(".regenerate-button", card);
    button.disabled = true;
    button.textContent = state.service === "online" ? "真实生成中" : "演示生成中";
    if (state.service === "online") {
      try {
        if (!state.projectId) throw new Error("请先从第一步生成真实方案。");
        const result = await callAction("storyboard", { project_id: state.projectId, scene_indices: [index] });
        state.storyboard = result.storyboard;
        persist();
        renderStoryboard();
        announce(`第 ${index + 1} 幕已由 ${state.storyboard.model} 重新生成。`);
      } catch (error) {
        card.dataset.generating = "false";
        button.disabled = false;
        button.textContent = "重新生成";
        announce(`生成失败：${error.message}`);
      }
      return;
    }
    setTimeout(() => {
      card.dataset.generating = "false";
      button.disabled = false;
      button.textContent = "重新生成";
      announce(state.service === "online" ? `第 ${index + 1} 幕生成任务已返回。` : `第 ${index + 1} 幕演示生成完成，未调用 API。`);
    }, 650);
  }

  async function regenerateUnlockedScenes() {
    const indices = state.locked.map((locked, index) => locked ? null : index).filter((index) => index !== null);
    if (!indices.length) return announce("所有镜头都已锁定，没有需要重生成的场景。" );
    if (state.service !== "online") {
      indices.forEach((index) => regenerateScene(index));
      return;
    }
    const button = $("#regenerate-unlocked");
    button.disabled = true;
    button.textContent = `正在生成 ${indices.length} 幕…`;
    try {
      const result = await callAction("storyboard", { project_id: state.projectId, scene_indices: indices });
      state.storyboard = result.storyboard;
      persist();
      renderStoryboard();
      announce(`${indices.length} 个未锁定镜头已重新生成。`);
    } catch (error) {
      announce(`批量生成失败：${error.message}`);
    } finally {
      button.disabled = false;
      button.textContent = "重新生成未锁定镜头";
    }
  }

  function renderScripts() {
    const acts = buildActs();
    const table = $("#script-table");
    table.replaceChildren();
    acts.forEach((act, index) => {
      const row = document.createElement("div");
      row.className = "script-row";
      const realDuration = state.voiceData?.segments?.[index]?.duration;
      row.innerHTML = `<span>0${index + 1}</span><b>${escapeHtml(act.role)}</b><p>${escapeHtml(act.voice)}</p><small>${realDuration ? `${Number(realDuration).toFixed(1)}s` : `${act.seconds}.0s`}</small>`;
      table.append(row);
    });
  }

  async function checkService(silent = false) {
    const button = $("#service-check");
    const label = $("#service-label");
    const hint = $("small", button);
    if (!IS_LOCAL_RUNTIME) {
      state.service = "demo";
      state.serviceMode = "hosted";
      state.apiKeyConfigured = false;
      button.dataset.status = "hosted";
      label.textContent = "远端静态演示";
      hint.textContent = "运行边界";
      $("#service-detail").dataset.status = "hosted";
      $("#service-detail").innerHTML = '<b>远端静态演示：</b>这里用于查看样例、效果契约和完整生产流程，不会探测或调用你的本机 API。需要新生成时，请在仓库内运行 <code>node integrations\\studio-server.mjs</code>，再打开 <code>http://127.0.0.1:8789/…/studio.html</code>。<a href="https://github.com/yydshly/0822_githubcode_study/blob/main/projects/story-to-handdrawn-video/DEPLOYMENT.md">查看本地运行说明 ↗</a>';
      if (!silent) announce("当前是远端静态生产台；真实生成请切换到本地安全服务。" );
      persist();
      return;
    }
    hint.textContent = "检测服务";
    button.dataset.status = "checking";
    label.textContent = "检测中";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    try {
      const response = await fetch(`${API_BASE}/api/health`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      state.service = "online";
      state.serviceMode = payload.mode || "live";
      state.apiKeyConfigured = Boolean(payload.apiKeyConfigured);
      button.dataset.status = "online";
      label.textContent = payload.mode === "mock" ? "测试服务在线" : payload.apiKeyConfigured ? "真实服务在线" : "服务在线 · 待配置";
      $("#service-detail").dataset.status = "online";
      $("#service-detail").innerHTML = payload.mode === "mock"
        ? "<b>测试服务已连接：</b>完整 API、项目存储和 FFmpeg 链路可运行，但不会请求 MiniMax 或消耗额度。"
        : payload.apiKeyConfigured
          ? `<b>真实服务已连接：</b>${escapeHtml(payload.models.text)}、${escapeHtml(payload.models.image)} 与 ${escapeHtml(payload.models.speech)} 已就绪；密钥只在本地服务内。`
          : "<b>服务已连接但未配置 Key：</b>页面可以运行，真实 MiniMax 动作会明确返回配置错误。";
      if (!silent) announce(payload.mode === "mock" ? "本地测试服务已连接。" : "本地生成服务已连接，后续动作将提交真实任务。" );
    } catch (_) {
      state.service = "demo";
      state.serviceMode = "offline";
      state.apiKeyConfigured = false;
      button.dataset.status = "demo";
      label.textContent = "演示模式";
      $("#service-detail").dataset.status = "demo";
      $("#service-detail").innerHTML = `<b>当前为演示模式：</b>未发现 ${escapeHtml(API_BASE)} 生成服务。所有操作保存在本机浏览器，不调用 API，也不会消耗额度。`;
      if (!silent) announce("未发现本地生成服务，继续使用明确标注的演示流程。");
    } finally {
      clearTimeout(timer);
      persist();
    }
  }

  async function runButtonTask(button, runningText, demoDoneText, liveDoneText, action, payload, task) {
    const original = button.innerHTML;
    button.disabled = true;
    const executionLabel = state.service === "online"
      ? state.serviceMode === "mock" ? "本地测试任务 · 不消耗额度" : "MiniMax 真实任务处理中"
      : "演示任务 · 不调用 API";
    button.innerHTML = `<span>${runningText}</span><small>${executionLabel}</small>`;
    try {
      let result = null;
      if (state.service === "online") result = await callAction(action, typeof payload === "function" ? payload() : payload);
      else await new Promise((resolve) => setTimeout(resolve, 620));
      task(result);
      announce(state.service === "online" ? liveDoneText : demoDoneText);
    } catch (error) {
      $("#project-state").textContent = "ERROR";
      $("#service-detail").dataset.status = "error";
      $("#service-detail").innerHTML = `<b>任务失败：</b>${escapeHtml(error.message)}。项目输入仍保留，可以修改或重试。`;
      announce(`任务失败：${error.message}`);
    } finally {
      button.disabled = false;
      button.innerHTML = original;
    }
  }

  async function generateIncomingHandoff() {
    const card = $("#incoming-handoff");
    const button = $("#handoff-generate");
    const meta = $("#handoff-meta");
    const original = button.innerHTML;
    card.dataset.status = "checking";
    button.disabled = true;
    button.innerHTML = "<span>正在确认服务…</span><small>不会把 API Key 发送给网页</small>";
    await checkService(true);
    const unavailable = state.service !== "online" || (state.serviceMode !== "mock" && !state.apiKeyConfigured);
    if (unavailable) {
      card.dataset.status = "error";
      meta.textContent = state.serviceMode === "hosted"
        ? "当前是远端静态流程。简报已安全带入，可继续查看方案结构；真实生成请在本地生产台重新打开或导入项目。"
        : state.service !== "online"
          ? "没有发现本地生成服务。请启动 studio-server 后重试；简报已经保留，不会退回旧样例。"
        : "本地服务在线，但尚未读取到 MiniMax API Key。请在服务端环境变量中配置后重试。";
      button.disabled = false;
      button.innerHTML = original;
      return;
    }
    card.dataset.status = "ready";
    meta.textContent = state.serviceMode === "mock"
      ? "测试服务已连接；下一步将验证完整生成请求，但不会消耗额度。"
      : "MiniMax 文本模型已就绪；正在提交当前七项简报。";
    button.disabled = false;
    button.innerHTML = original;
    $("#brief-form").requestSubmit($("#generate-plan"));
  }

  function runDeliveryJob() {
    const recordedDemo = getPresetDemo();
    if (recordedDemo) {
      state.projectId = state.projectId || recordedDemo.projectId;
      state.renderData = structuredClone(recordedDemo.render);
      state.origin = state.activePreset === "aiEnergy" ? "recorded-real-sample" : "preset-sample";
      persist();
      applyGeneratedMedia();
    }
    setStage("delivery");
    const button = $("#run-demo-job");
    const log = $("#job-log");
    const dot = $("#job-dot");
    const bar = $("#job-progress-bar");
    const status = $("#job-status");
    const entries = [
      ["PLAN", "读取已批准知识方案与可信边界"],
      ["ASSET", "检查 5 个锁定分镜及媒体来源"],
      ["AUDIO", "写入旁白时长与逐句字幕时间"],
      ["COMPOSE", "应用手绘描边、显色与镜头运动"],
      ["ENCODE", "FFmpeg 生成 H.264 / AAC 主文件"],
      ["QC", "检查播放、字幕安全区、音频峰值与清单"],
    ];
    log.replaceChildren();
    $("#deliverables").hidden = true;
    $(".quality-card").classList.remove("is-complete");
    setQualityStatuses(["wait", "wait", "wait", "wait"]);
    $("#quality-title").textContent = "正在检查生成结果";
    button.disabled = true;
    dot.className = "is-running";
    bar.style.width = "4%";
    status.textContent = "演示任务运行中";

    entries.forEach((entry, index) => {
      setTimeout(() => {
        const item = document.createElement("li");
        const now = new Date();
        item.innerHTML = `<time>${now.toLocaleTimeString("zh-CN", { hour12: false })}</time><span>${entry[1]}</span><b>${entry[0]} OK</b>`;
        log.append(item);
        bar.style.width = `${Math.round(((index + 1) / entries.length) * 100)}%`;
        if (index === entries.length - 1) {
          dot.className = "is-complete";
          status.textContent = recordedDemo ? "对应预设样例完成 · 未调用 API" : "演示完成 · 未调用 API";
          $("#quality-title").textContent = recordedDemo ? "当前预设的真实媒体检查通过" : "4 项检查全部通过";
          $(".quality-card").classList.add("is-complete");
          setQualityStatuses(["pass", "pass", "pass", "pass"]);
          $("#deliverables").hidden = false;
          if (recordedDemo) {
            showDeliveryMedia(recordedDemo.render);
            $("#output-video-name").textContent = recordedDemo.render.file;
            $("#output-video-meta").textContent = `${recordedDemo.render.width}×${recordedDemo.render.height} · ${recordedDemo.render.duration}s · H.264 / AAC`;
            $("#output-video-download").href = recordedDemo.render.url;
            $("#output-video-download").textContent = "下载当前预设成片";
            $("#output-manifest").href = recordedDemo.manifestUrl;
          }
          button.disabled = false;
          button.querySelector("span").textContent = "重新运行演示任务";
          markComplete("delivery");
          announce("完整交付状态演示完成；未调用 API。" );
        }
      }, 280 + index * 360);
    });
  }

  function applyGeneratedMedia() {
    const recordedDemo = getPresetDemo();
    const firstScene = state.storyboard?.scenes?.[0]?.url || recordedDemo?.storyboard?.scenes?.[0]?.url;
    const audioUrl = state.voiceData?.url || recordedDemo?.voice?.url;
    const audio = $("#studio-audio");
    const audioEmpty = $("#audio-empty");
    if (audioUrl) {
      audio.src = audioUrl;
      audio.hidden = false;
      audioEmpty.hidden = true;
      $("#audio-waveform").hidden = false;
      audio.load();
      $("#audio-output-label").textContent = state.voiceData ? "AUDIO OUTPUT · CURRENT PROJECT" : "AUDIO OUTPUT · RECORDED SAMPLE";
      $("#audio-badge").textContent = state.voiceData
        ? `${state.voiceData.model} · ${selectedVoiceLabel()} · ${state.voiceData.segments?.length || 5} 段`
        : `${recordedDemo.voice.model} · 参考样例`;
      $("#voice-preview-note").textContent = state.voiceData
        ? `播放器仅载入本次“${state.project.topic}”生成的${selectedVoiceLabel()}旁白。`
        : `当前试听的是“${state.project.topic}”预设项目的已完成参考旁白。`;
    } else {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.hidden = true;
      audioEmpty.hidden = false;
      $("#audio-waveform").hidden = true;
      $("#audio-output-label").textContent = "AUDIO OUTPUT · CURRENT PROJECT";
      $("#audio-badge").textContent = "等待本项目 TTS";
      $("#voice-preview-note").textContent = "当前没有借用任何样例声音。点击生成后，播放器才会载入本次任务音频。";
    }
    const videoUrl = state.renderData?.url || recordedDemo?.render?.url;
    const preview = $("#composition-preview");
    const source = $("#composition-source");
    if (videoUrl) {
      if (firstScene) preview.poster = firstScene;
      else preview.removeAttribute("poster");
      source.src = videoUrl;
      preview.hidden = false;
      $("#composition-empty").hidden = true;
      preview.load();
      const render = state.renderData || recordedDemo.render;
      $("#composition-label").textContent = state.renderData ? "PREVIEW · CURRENT PROJECT" : "PREVIEW · RECORDED SAMPLE";
      $("#composition-title").textContent = state.project.topic;
      $("#composition-meta").textContent = `${render.width}×${render.height} · ${render.duration}s · H.264 / AAC`;
      showDeliveryMedia(render);
    } else {
      preview.pause();
      source.removeAttribute("src");
      preview.removeAttribute("poster");
      preview.load();
      preview.hidden = true;
      $("#composition-empty").hidden = false;
      $("#composition-label").textContent = "PREVIEW · CURRENT PROJECT";
      $("#composition-title").textContent = "等待本项目成片";
      $("#composition-meta").textContent = "生成后可在此预览，也会进入交付页";
      $("#delivery-video").pause();
      $("#delivery-source").removeAttribute("src");
      $("#delivery-video").removeAttribute("poster");
      $("#delivery-video").load();
      $("#delivery-player").hidden = true;
    }
    renderProjectMode();
  }

  function showDeliveryMedia(render) {
    if (!render?.url) {
      $("#delivery-video").pause();
      $("#delivery-source").removeAttribute("src");
      $("#delivery-video").removeAttribute("poster");
      $("#delivery-video").load();
      $("#delivery-player").hidden = true;
      return;
    }
    const player = $("#delivery-video");
    const poster = state.storyboard?.scenes?.[0]?.url || getPresetDemo()?.storyboard?.scenes?.[0]?.url;
    if (poster) player.poster = poster;
    else player.removeAttribute("poster");
    $("#delivery-source").src = render.url;
    player.load();
    $("#delivery-player").hidden = false;
    $("#delivery-player-title").textContent = state.project.topic;
    $("#delivery-player-meta").textContent = `${render.width}×${render.height} · ${render.duration}s · ${render.renderer || "H.264 / AAC"}。播放器与下载链接均为本项目文件。`;
  }

  function setQualityStatuses(statuses) {
    $$(".quality-card li").forEach((item, index) => {
      const status = statuses[index] || "wait";
      item.dataset.status = status;
      $("b", item).textContent = status === "pass" ? "PASS" : status === "review" ? "REVIEW" : "WAIT";
    });
  }

  function showRemoteDelivery(result) {
    if (result.production_contract) state.productionContract = sanitizeProductionContract(result.production_contract);
    state.renderData = result.render;
    persist();
    applyGeneratedMedia();
    showDeliveryMedia(result.render);
    setStage("delivery");
    const events = Array.isArray(result.events) ? result.events : [];
    const log = $("#job-log");
    log.replaceChildren();
    events.forEach((entry) => {
      const item = document.createElement("li");
      const time = entry.at ? new Date(entry.at).toLocaleTimeString("zh-CN", { hour12: false }) : "RECORDED";
      item.innerHTML = `<time>${escapeHtml(time)}</time><span>${escapeHtml(entry.message)}</span><b>${escapeHtml(entry.stage)} ${entry.status === "running" ? "RUN" : "OK"}</b>`;
      log.append(item);
    });
    $("#job-id").textContent = `JOB · ${state.projectId}`;
    $("#job-dot").className = "is-complete";
    $("#job-progress-bar").style.width = "100%";
    $("#job-status").textContent = result.mode === "mock"
      ? "测试链路完成 · 未调用 MiniMax"
      : result.mode === "curated"
        ? "真实混合样例复现 · 未重复调用 API"
        : result.mode === "preset"
          ? "对应预设样例 · 未调用 API"
        : "真实任务完成";
    const requiresHumanReview = result.mode === "live";
    $("#quality-title").textContent = requiresHumanReview
      ? "2 项技术检查通过 · 2 项待人工审核"
      : result.mode === "curated"
        ? "事实、叙事、视觉与技术检查已人工复核"
        : result.mode === "preset"
          ? "当前预设的真实媒体检查通过"
        : "4 项检查全部通过";
    $(".quality-card").classList.toggle("is-complete", !requiresHumanReview);
    setQualityStatuses(requiresHumanReview ? ["review", "review", "pass", "pass"] : ["pass", "pass", "pass", "pass"]);
    $("#deliverables").hidden = false;
    $("#output-video-name").textContent = result.render.file;
    $("#output-video-meta").textContent = `${result.render.width}×${result.render.height} · ${result.render.duration}s · H.264 / AAC`;
    $("#output-video-download").href = result.render.url;
    $("#output-video-download").textContent = "下载本次成片";
    $("#output-manifest").href = result.manifest_url || `${API_BASE}/api/projects/${encodeURIComponent(state.projectId)}`;
    $("#run-demo-job").querySelector("span").textContent = "查看当前交付结果";
    renderProjectMode();
    renderProductionContract();
    markComplete("delivery");
  }

  function exportProject() {
    const storyboardFallback = isCustomProject()
      ? buildActs().map((act, index) => ({ index: index + 1, title: act.title, visual: act.visual, approved: false, status: "not-generated" }))
      : sceneMeta.map((scene, index) => ({ id: index + 1, ...scene, approved: state.locked[index], reference_asset: `scene-0${index + 1}.png` }));
    const payload = {
      schema: "knowledge-video-project/v1",
      exported_at: new Date().toISOString(),
      execution_mode: state.origin === "recorded-real-sample" ? "recorded-real-sample" : state.origin === "preset-sample" ? "recorded-preset-sample" : state.service === "online" ? state.serviceMode : "demo",
      active_preset: state.activePreset,
      project_id: state.projectId,
      brief: state.project,
      production_contract: state.productionContract,
      plan: state.plan || { acts: buildActs() },
      storyboard: state.storyboard || storyboardFallback,
      approvals: { scenes: state.locked },
      voice: state.voiceData || { provider: "MiniMax", model: "speech-2.8-hd", voice_id: state.voice, speed: state.speed, ready: state.audioReady },
      render: state.renderData || { recipe: state.recipe, ratio: state.ratio, renderer: "story-to-handdrawn-video + FFmpeg" },
      security: { api_key_in_browser: false, api_base: API_BASE },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "knowledge-video-project.json";
    anchor.click();
    URL.revokeObjectURL(url);
    announce("项目包已导出，不包含 API Key。" );
  }

  function setPipelineStep(index, status, label) {
    const runner = $("#pipeline-runner");
    const items = $$("[data-pipeline-step]", runner);
    items.forEach((item, itemIndex) => {
      if (itemIndex < index) item.dataset.status = "complete";
      else if (itemIndex === index) item.dataset.status = status;
      else item.dataset.status = "wait";
    });
    $("#pipeline-runner-status").textContent = label;
    $("#pipeline-runner-bar").style.width = `${Math.round(((index + (status === "complete" ? 1 : 0.35)) / items.length) * 100)}%`;
  }

  function waitForPipeline(ms) {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return new Promise((resolve) => setTimeout(resolve, reduced ? 30 : ms));
  }

  async function runAiRecordedPipeline(button) {
    if (button.disabled) return;
    const runner = $("#pipeline-runner");
    const original = button.innerHTML;
    selectPreset("aiEnergy");
    state.origin = "recorded-real-sample";
    state.projectId = aiEnergyDemo.projectId;
    state.productionContract = makeProductionContract("technology", "standard", "curated-sample");
    state.productionContract.routing.quality_tier = "curated";
    state.productionContract.routing.image_provider = "Codex built-in imagegen · agent-assisted";
    state.recipe = "standard";
    renderProductionContract();
    runner.hidden = false;
    runner.setAttribute("aria-busy", "true");
    button.disabled = true;
    button.innerHTML = "<span>正在复现真实生产链…</span><small>不重复消耗 API 额度</small>";
    runner.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      setPipelineStep(0, "active", "01 / 06 · 锁定事实与学习目标");
      await waitForPipeline(480);
      state.plan = structuredClone(aiEnergyDemo.plan);
      state.project = { ...aiEnergyDemo.project };
      renderActs();
      renderScripts();
      markComplete("brief");
      setStage("plan", false);

      setPipelineStep(1, "active", "02 / 06 · 对齐旁白、画面任务与可信边界");
      await waitForPipeline(520);
      markComplete("plan");

      setPipelineStep(2, "active", "03 / 06 · 加载 Codex 最终统一视觉");
      await waitForPipeline(620);
      state.storyboard = structuredClone(aiEnergyDemo.storyboard);
      state.locked = [true, true, true, true, true];
      renderStoryboard();
      applyGeneratedMedia();
      markComplete("storyboard");
      setStage("storyboard", false);

      setPipelineStep(3, "active", "04 / 06 · 写入 MiniMax HD 旁白与真实时长");
      await waitForPipeline(520);
      state.voiceData = structuredClone(aiEnergyDemo.voice);
      state.voice = aiEnergyDemo.voice.voice;
      state.speed = aiEnergyDemo.voice.speed;
      state.audioReady = true;
      renderScripts();
      applyGeneratedMedia();
      $("#audio-badge").textContent = "speech-2.8-hd · 5 段 · MiniMax";
      markComplete("voice");
      setStage("voice", false);

      setPipelineStep(4, "active", "05 / 06 · 加载字幕与确定性 FFmpeg 成片");
      await waitForPipeline(560);
      state.renderData = structuredClone(aiEnergyDemo.render);
      applyGeneratedMedia();
      markComplete("render");
      setStage("render", false);

      setPipelineStep(5, "active", "06 / 06 · 播放、下载与来源清单就绪");
      await waitForPipeline(460);
      showRemoteDelivery({
        render: structuredClone(aiEnergyDemo.render),
        events: structuredClone(aiEnergyDemo.events),
        mode: "curated",
        manifest_url: aiEnergyDemo.manifestUrl,
      });
      setPipelineStep(5, "complete", "完成 · 79.2 秒真实成片可播放");
      announce("AI 耗电样例已到达成片：故事与最终视觉由 Codex 统一，旁白由 MiniMax 生成。" );
    } finally {
      runner.setAttribute("aria-busy", "false");
      button.disabled = false;
      button.innerHTML = original;
      persist();
    }
  }

  function bindEvents() {
    $$('[data-stage-button]').forEach((button) => button.addEventListener("click", () => setStage(button.dataset.stageButton)));
    $$('[data-go]').forEach((button) => button.addEventListener("click", () => setStage(button.dataset.go)));
    $("#service-check").addEventListener("click", () => checkService(false));

    $$('[data-preset]').forEach((button) => button.addEventListener("click", () => selectPreset(button.dataset.preset)));
    $("#run-ai-pipeline").addEventListener("click", (event) => runAiRecordedPipeline(event.currentTarget));
    $("#handoff-edit").addEventListener("click", () => {
      $("#topic").focus();
      announce("可以修改任何字段；生成时会提交修改后的完整简报。" );
    });
    $("#handoff-generate").addEventListener("click", generateIncomingHandoff);
    $("#effect-profile").addEventListener("change", (event) => {
      const profileKey = event.currentTarget.value;
      changeProductionContract(profileKey, EFFECT_PROFILES[profileKey]?.presentation || "standard");
    });
    $$('[data-presentation]').forEach((button) => button.addEventListener("click", () => {
      changeProductionContract(state.productionContract.story.recipe, button.dataset.presentation);
    }));
    $$("#brief-form input, #brief-form textarea, #brief-form select").forEach((field) => field.addEventListener("input", () => {
      enterCustomDraft();
    }));

    $("#brief-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const project = readForm();
      const valid = project.topic && project.objective && project.evidence;
      $("#form-error").hidden = Boolean(valid);
      if (!valid) return;
      if (state.service !== "online" && !getPresetDemo()) await checkService(true);
      if (state.service !== "online" && !getPresetDemo()) {
        $("#service-detail").dataset.status = "error";
        $("#service-detail").innerHTML = "<b>新目标尚未生成：</b>未连接本地生成服务。自定义目标不会套用旧样例；请启动 studio-server 后重试。";
        announce("新目标需要连接本地生成服务，当前输入已保留。" );
        return;
      }
      state.project = project;
      renderActs();
      renderScripts();
      renderProjectState();
      state.plan = null;
      state.storyboard = null;
      state.voiceData = null;
      state.renderData = null;
      state.locked = [false, false, false, false, false];
      applyGeneratedMedia();
      runButtonTask(
        event.submitter,
        "正在生成结构化方案…",
        "演示方案已生成，未调用 API。",
        state.serviceMode === "mock" ? "测试服务已返回五幕方案。" : "MiniMax 方案已返回，请逐幕审核。",
        "plan",
        () => ({ project, production_contract: state.productionContract }),
        (result) => {
          if (result) {
            state.projectId = result.project_id;
            state.plan = result.plan;
            state.productionContract = sanitizeProductionContract(result.production_contract || state.productionContract);
            state.recipe = state.productionContract.presentation.recipe;
            state.origin = state.serviceMode;
            if (state.handoff) state.handoff.status = "planned";
          } else if (getPresetDemo()) {
            state.projectId = getPresetDemo().projectId;
            state.plan = structuredClone(getPresetDemo().plan);
            state.origin = state.activePreset === "aiEnergy" ? "recorded-real-sample" : "preset-sample";
          }
          persist();
          renderActs();
          renderScripts();
          renderProjectState();
          renderIncomingHandoff();
          renderProductionContract();
          markComplete("brief");
          setStage("plan");
        },
      );
    });

    $("#approve-plan").addEventListener("click", (event) => runButtonTask(
      event.currentTarget,
      "正在生成五幕分镜…",
      "已进入分镜审核；当前使用正式样例素材演示。",
      state.serviceMode === "mock" ? "测试服务已准备五幕参考分镜。" : "MiniMax Image 已返回五幕分镜。",
      "storyboard",
      () => ({ project_id: state.projectId }),
      (result) => {
        if (result) state.storyboard = result.storyboard;
        else if (getPresetDemo()) state.storyboard = structuredClone(getPresetDemo().storyboard);
        state.locked = [false, false, false, false, false];
        persist();
        renderStoryboard();
        applyGeneratedMedia();
        markComplete("plan");
        setStage("storyboard");
      },
    ));

    $("#lock-all").addEventListener("click", () => {
      state.locked = [true, true, true, true, true];
      persist();
      renderStoryboard();
      announce(`5 个${state.storyboard ? "生成" : "样例"}镜头已全部锁定。` );
    });
    $("#regenerate-unlocked").addEventListener("click", regenerateUnlockedScenes);
    $("#approve-storyboard").addEventListener("click", () => {
      if (state.locked.some((locked) => !locked)) return;
      markComplete("storyboard");
      setStage("voice");
    });

    $$('[data-voice]').forEach((button) => button.addEventListener("click", () => {
      const changed = state.voice !== button.dataset.voice;
      state.voice = button.dataset.voice;
      $$('[data-voice]').forEach((item) => item.setAttribute("aria-checked", String(item === button)));
      if (changed) invalidateVoiceOutput();
      persist();
    }));
    $("#speed").addEventListener("input", (event) => {
      const speed = Number(event.currentTarget.value);
      const changed = state.speed !== speed;
      state.speed = speed;
      $("#speed-output").value = `${state.speed.toFixed(2)}×`;
      if (changed) invalidateVoiceOutput();
      persist();
    });
    $("#generate-voice").addEventListener("click", (event) => runButtonTask(
      event.currentTarget,
      "正在生成五段旁白…",
      "声音流程演示完成；试听仍为正式参考样例。",
      state.serviceMode === "mock" ? "测试音频已拼接并写回真实时长。" : "MiniMax 旁白与字幕时间已生成。",
      "voice",
      () => ({ project_id: state.projectId, options: { voice: state.voice, speed: state.speed } }),
      (result) => {
        if (result) {
          state.voiceData = result.voice;
          state.voice = result.voice.voice;
          state.speed = result.voice.speed;
        }
        else if (getPresetDemo()) {
          state.voiceData = structuredClone(getPresetDemo().voice);
          state.voice = getPresetDemo().voice.voice;
          state.speed = getPresetDemo().voice.speed;
          $("#speed").value = state.speed;
          $("#speed-output").value = `${Number(state.speed).toFixed(2)}×`;
        }
        state.audioReady = true;
        persist();
        renderScripts();
        applyGeneratedMedia();
        markComplete("voice");
        $("#audio-badge").textContent = state.voiceData ? `${state.voiceData.model} · ${selectedVoiceLabel()} · ${state.voiceData.segments.length} 段` : "演示完成 · 参考音频";
        if (state.voiceData) $("#voice-preview-note").textContent = `播放器现已切换为本次任务生成的${selectedVoiceLabel()}旁白；镜头和字幕使用这份音频的真实时长。`;
        setStage("render");
      },
    ));

    $$('[data-ratio]').forEach((button) => button.addEventListener("click", () => {
      state.ratio = button.dataset.ratio;
      $$('[data-ratio]').forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      persist();
      renderProjectState();
    }));
    $$('input[name="recipe"]').forEach((input) => input.addEventListener("change", () => { state.recipe = input.value; persist(); }));
    $("#start-render").addEventListener("click", (event) => {
      if (state.service !== "online") {
        if (isCustomProject()) {
          $("#service-detail").dataset.status = "error";
          $("#service-detail").innerHTML = "<b>本项目尚未合成：</b>真实服务当前离线，不能用演示成片替代新项目结果。请恢复服务后重试。";
          announce("真实服务离线；本项目没有被样例替代。" );
          return;
        }
        markComplete("render");
        runDeliveryJob();
        return;
      }
      runButtonTask(
        event.currentTarget,
        "正在合成正式成片…",
        "演示合成完成。",
        state.serviceMode === "mock" ? "测试素材已完成 FFmpeg 成片。" : "本次知识视频已完成渲染。",
        "render",
        () => ({ project_id: state.projectId, options: { ratio: state.ratio, recipe: state.productionContract.presentation.recipe, production_contract_id: state.productionContract.id, motion_clips: $("#motion-clips").checked } }),
        (result) => {
          markComplete("render");
          showRemoteDelivery(result);
        },
      );
    });
    $("#run-demo-job").addEventListener("click", () => {
      if ((state.service === "online" || ["recorded-real-sample", "preset-sample"].includes(state.origin)) && state.renderData) {
        setStage("delivery");
        const recordedDemo = getPresetDemo();
        if (recordedDemo) showRemoteDelivery({ render: state.renderData, events: recordedDemo.events, mode: state.origin === "recorded-real-sample" ? "curated" : "preset", manifest_url: recordedDemo.manifestUrl });
        else announce("当前真实交付结果仍然有效。" );
      } else runDeliveryJob();
    });
    $("#export-project").addEventListener("click", exportProject);
    $("#new-project").addEventListener("click", () => {
      const serviceSnapshot = { service: state.service, serviceMode: state.serviceMode, apiKeyConfigured: state.apiKeyConfigured };
      state = { ...structuredClone(initialState), ...serviceSnapshot, activePreset: null, origin: "custom-draft", project: { ...BLANK_PROJECT } };
      state.productionContract = makeProductionContract("knowledge", "handdrawn", "new-project");
      state.recipe = state.productionContract.presentation.recipe;
      $("#pipeline-runner").hidden = true;
      persist();
      fillForm(state.project);
      renderIncomingHandoff();
      renderProjectMode();
      renderProductionContract();
      renderActs();
      renderStoryboard();
      renderScripts();
      applyGeneratedMedia();
      setStage("brief");
      $("#topic").focus();
      announce("已创建空白项目；不会载入任何样例内容或媒体。" );
    });

    $(".workflow-rail").addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const buttons = $$('[data-stage-button]');
      const current = buttons.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === "ArrowRight" ? (current + 1) % buttons.length : (current - 1 + buttons.length) % buttons.length;
      buttons[next].focus();
    });
  }

  function init() {
    if (!incomingHandoff && location.hash === "#ai-energy" && state.origin !== "recorded-real-sample") {
      state = { ...structuredClone(initialState), activePreset: "aiEnergy", project: { ...presets.aiEnergy } };
    }
    fillForm(state.project);
    renderIncomingHandoff();
    renderProjectMode();
    renderProductionContract();
    $("#speed").value = state.speed;
    $("#speed-output").value = `${Number(state.speed).toFixed(2)}×`;
    $$('[data-voice]').forEach((button) => button.setAttribute("aria-checked", String(button.dataset.voice === state.voice)));
    $$('[data-ratio]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.ratio === state.ratio)));
    $$('[data-preset]').forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.preset === state.activePreset)));
    const recipe = $(`input[name="recipe"][value="${state.recipe}"]`);
    if (recipe) recipe.checked = true;
    renderActs();
    renderStoryboard();
    renderScripts();
    bindEvents();
    applyGeneratedMedia();
    renderProjectState();
    setStage(state.stage, false);
    if (state.stage === "delivery" && state.renderData && state.projectId) {
      const curated = state.origin === "recorded-real-sample";
      const recordedPreset = state.origin === "preset-sample";
      const recordedDemo = getPresetDemo();
      if (curated) {
        $("#pipeline-runner").hidden = false;
        setPipelineStep(5, "complete", "完成 · 79.2 秒真实成片可播放");
      }
      showRemoteDelivery({
        render: state.renderData,
        events: curated || recordedPreset ? recordedDemo?.events || [] : [],
        mode: curated ? "curated" : recordedPreset ? "preset" : state.serviceMode,
        manifest_url: curated || recordedPreset ? recordedDemo?.manifestUrl : undefined,
      });
    }
    checkService(true);
  }

  init();
})();
