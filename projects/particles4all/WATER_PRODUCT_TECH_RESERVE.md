# 水相关产品、游戏与开源技术储备

> 调研日期：2026-08-25
>
> 归属：Particles4All 阶段归档的后续选型资料
>
> 状态：`reserve`（不代表启动新研发）

## 调研目的

这份资料不继续寻找“更逼真的水效果”，而是为未来出现明确水相关产品时快速回答三个问题：

1. 产品中的水承担什么作用？
2. Particles4All 是否匹配，还是应该选择更轻或更专业的技术？
3. 哪些产品结构、开源项目和许可边界值得重新检查？

核心判断：**水相关产品不是同一条技术路线。** 水可以是视觉反馈、解谜资源、容器内动力、宏观世界系统、载具环境或工程研究对象。应先确定产品问题，再选择水的表示与求解方式。

## 产品与技术地图

| 产品类型 | 水在产品中的作用 | 已有参考 | 优先技术 | Particles4All 的位置 |
| --- | --- | --- | --- | --- |
| 水流解谜 | 被引导、分流、收集和消耗的规则资源 | Where's My Water?、Enigmo | 2D 粒子、简化流体规则、关卡逻辑 | 可做小范围 3D 机关，但通常成本过高 |
| 容器互动玩具 | 推动圆环、小球等刚体的动力介质 | 实体水中套圈、Fluidity | 局部粒子流体，或水动力近似 + 刚体 | 最接近源库优势，但必须建立封闭水体与输入映射 |
| 网页互动体验 | 鼠标、触摸、手势或数据的视觉反馈 | WebGL Fluid Simulation、ripple、Rainform | 2D GPU 流体、波动方程、Shader | 除非需要三维倒水和刚体耦合，否则不应使用 |
| 泳池与产品展示 | 水面光学、涟漪、焦散、漂浮 | threejs-water | 高度场、反射折射、低成本浮力 | 只在需要体积流体或喷溅时作为补充 |
| 海洋与大型环境 | 构成地形、航行、天气和视觉空间 | Unreal Water、WaterThreeJS、Stormworks | Gerstner 波、波谱、样条水体、浮力近似、LOD | 只适合船体或岸边的局部近场交互 |
| 河流与水资源系统 | 灌溉、水坝、洪水、经济和世界状态 | Timberborn | 网格水深、浅水模型、流向图、规则系统 | 不适合作为宏观主求解器 |
| 工程仿真 | 输出波浪、溃坝、结构冲击等分析数据 | DualSPHysics | 专业 SPH/CFD、CUDA、离线或高算力计算 | 不能替代工程求解器 |

## 产品与游戏参考

### Where's My Water?

- 官方资料：[Getting Started with Where's My Water?](https://appsupport.disney.com/hc/en-us/articles/360000758626-Getting-Started-with-Where-s-My-Water)
- 产品结构：玩家滑动、冲刷和引导水流进入目标位置，关卡围绕水量、路径、障碍和收集目标组织。
- 可复用启发：玩法来自“水 + 目标 + 障碍 + 资源约束”，不是来自完整三维物理精度。

### Enigmo

- 官方资料：[Enigmo Instructions](https://www.pangeasoft.net/enigmo/files/Enigmo%20Instructions.pdf)
- 产品结构：放置挡板、滑道、加速器和海绵，引导水、油、岩浆进入不同容器。
- 可复用启发：有限工具库存、液体差异、连续输入、计时与关卡编辑器把流体演示转化为长期玩法。

### Fluidity: Spin Cycle

- 官方资料：[Nintendo 游戏说明书](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-3DS-fluidity-spin-cycle-en?_a=DATAg1AAZAA0)
- 产品结构：通过倾斜设备改变重力方向和水体运动。
- 可复用启发：传感器或设备姿态可以成为流体输入，不必把交互限制在“点击注水”。

### Timberborn

- 产品资料：[Steam 产品页](https://store.steampowered.com/app/1062090/Timberborn/)
- 产品结构：水与干旱、灌溉、水坝、闸门、运河、泵、地形和自动化系统共同构成城市经营。
- 可复用启发：宏观水体的产品价值来自世界规则和资源循环，不来自逐粒子展示。

### Stormworks: Build and Rescue

- 产品资料：[Steam 产品页](https://store.steampowered.com/app/573090/Stormworks_Build_and_Rescue/)
- 产品结构：海况、水压、排水浮力和风浪服务于载具设计、救援任务和生存风险。
- 可复用启发：水体与具体产品系统绑定；海洋本身不是孤立的演示目标。

### The Fluid Toy

- 源码：[Victor2266/The-Fluid-Toy](https://github.com/Victor2266/The-Fluid-Toy)
- 产品结构：Unity GPU 粒子流体与水枪、目标、管道、闸门、阀门、温度、水源和排水口组合成关卡。
- 可复用启发：这是“算法能力如何进入目标、装置、反馈和关卡”的直接参考。

## GitHub 技术储备

### A. 局部三维体积流体

| 项目 | 主要能力 | 适合复查的触发条件 | 初步许可判断 |
| --- | --- | --- | --- |
| [Particles4All](https://github.com/matsuoka-601/Particles4All) | WebGPU PBF、刚体 Shape Matching、统一液固耦合、SSFR | 局部注水、喷流、冲击、浮沉、刚体互动 | MIT；本项目已固定版本并保留许可证 |
| [jeantimex/fluid](https://github.com/jeantimex/fluid) | WebGPU SPH、PIC/FLIP、白水、屏幕空间与体积渲染 | 需要喷雾、泡沫、气泡或比较不同求解器 | 使用前重新核对当时版本与许可证 |
| [webgpu-ocean](https://github.com/XavierYribarren/webgpu-ocean) | WebGPU MLS-MPM、SPH、大粒子量实验 | 性能研究或 MLS-MPM 技术比较 | 使用前重新核对当时版本与许可证 |
| [PositionBasedDynamics](https://github.com/InteractiveComputerGraphics/PositionBasedDynamics) | 刚体、柔体和流体的 PBD 参考实现 | 需要学术基线、桌面端原型或算法对照 | 使用前检查当前许可证与依赖 |

### B. 水面、泳池与海洋表现

| 项目 | 主要能力 | 更适合的场景 | 初步许可判断 |
| --- | --- | --- | --- |
| [threejs-water](https://github.com/jeantimex/threejs-water) | 2D 波动方程、倒影、折射、焦散、漂浮和物体排水 | 泳池、湖面、产品展示、物体入水 | MIT（以使用时仓库为准） |
| [WaterThreeJS](https://github.com/achrefelouafi/WaterThreeJS) | Gerstner 波、泡沫、焦散、水下效果、SSR | 海洋和大型视觉场景 | MIT（以使用时仓库为准） |
| [Unreal Water System](https://dev.epicgames.com/documentation/unreal-engine/water-system-in-unreal-engine) | 河流、湖泊、海洋、样条、浮力、波浪、地形和 LOD | Unreal 游戏或大型三维场景 | 遵循 Unreal Engine 许可，不属于独立开源库 |

### C. 网页互动与数据表达

| 项目 | 主要能力 | 更适合的场景 | 许可注意 |
| --- | --- | --- | --- |
| [WebGL Fluid Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation) | 浏览器二维 GPU 流体、鼠标和触摸互动 | 官网背景、营销互动、生成艺术 | MIT（以使用时仓库为准） |
| [ripple](https://github.com/aisparkedu/ripple) | 摄像头、MediaPipe 手势和 WebGL 波动方程 | 展览、摄像头互动、手势涟漪 | 使用前核对源码、模型与第三方依赖许可 |
| [Rainform](https://github.com/afterimage-lab/Rainform) | 降雨数据驱动雨幕、瀑布、涟漪和声音 | 数据叙事、气象展示、互动艺术 | 非商业许可，非 OSI 开源；不能直接用于商业产品 |

### D. 工程与离线工作流

| 项目 | 主要能力 | 适合的场景 | 边界 |
| --- | --- | --- | --- |
| [DualSPHysics](https://github.com/DualSPHysics/DualSPHysics) | C++/CUDA SPH、自由液面、波浪、溃坝冲击 | 水利、海洋结构和工程研究 | 不是网页实时效果库；LGPL 与集成方式需专项审查 |
| [splashsurf](https://github.com/InteractiveComputerGraphics/splashsurf) | 从 SPH 粒子重建平滑表面 | 离线渲染、影视、Blender 和网格导出 | 只负责表面重建，不负责实时流体求解 |

## Particles4All 的保留定位

Particles4All 应继续被定义为：

> 面向浏览器的局部三维粒子流体与刚体耦合能力样本。

适合复用：

- 有限容器内注水、倾倒、溢流和晃动；
- 短距离水枪、喷口、闸门和局部冲击；
- 漂浮物、圆环、浮具和简单机关的水体互动；
- 教学、互动展览、游戏原型和液体产品概念展示；
- 需要观察 particles、mesh、SSFR 和求解参数差异的研究工具。

不应承担：

- 无限海面、长距离河流、流域和洪水主求解；
- 高并发或低性能设备上的网页背景；
- 工程 CFD、水文、防洪和承载结论；
- 在缺少产品目标时继续堆叠场景或重写另一套水引擎。

## 水中套圈方向的产品化条件

当前网页套圈只保留为能力概念，不继续无目标优化。若未来重新启动，应先选择物理输入：

1. **封闭水压**：按钮推动活塞或循环泵，保持水量守恒；
2. **容器摇晃**：鼠标拖动、触摸或手机 IMU 改变容器姿态；
3. **混合近似**：可见水使用低粒子量或水面效果，圆环动力使用经过校准的浮力、阻力和冲击模型。

并至少定义：初始未套中、可失败、操作预算、成功判定、多个关卡或装置差异、目标设备帧率。真实粒子水不自动等于可玩性。

## 未来选型决策树

```text
只需要“看起来像水”
    → Shader / Gerstner 波 / 高度场

需要鼠标、触摸、数据或手势涟漪
    → 2D GPU 流体 / 波动方程

需要泳池水面、焦散和物体漂浮
    → threejs-water 类高度场方案

需要倾倒、冲击、飞溅、容器和刚体双向作用
    → Particles4All / WebGPU SPH / PIC-FLIP

需要河流、海洋和世界水循环
    → 浅水模型 / 网格水深 / 样条水体 / 波谱 / LOD

需要工程结论
    → DualSPHysics 或其他专业 CFD/SPH 工具
```

## 重启流程

未来出现水相关产品需求时，不直接恢复某个演示，按以下顺序处理：

1. 写明产品目标、用户动作、水承担的规则和必须出现的验收画面。
2. 用上面的决策树选择最低成本的水技术。
3. 只有“局部三维体积流体 + 刚体双向作用”不可替代时，才优先恢复 Particles4All。
4. 重新检查候选库的活跃度、浏览器兼容、许可证、依赖和目标设备性能。
5. 先做一个可观察、可失败、可测性能的垂直切片，再决定是否产品化。

## 资料时效与许可说明

- 以上信息是 2026-08-25 的调研快照，不保证未来版本、维护状态和许可证不变。
- “产品参考”只用于理解玩法和系统结构，不表示其代码或资产可复用。
- 在商业接入前必须重新核对目标提交的 LICENSE、第三方依赖、素材来源和商用条款。
- 本清单用于选型储备，不把外部项目的声明视为本项目已完成的运行验证。
