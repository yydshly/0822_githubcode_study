# 资料来源与使用边界

本文件记录路线设计所依赖的第一方文档、原始论文或官方示例。资料支持的是技术选择，不替代本仓库的运行证据。

## 大范围水面与海洋

- NVIDIA, [Effective Water Simulation from Physical Models](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models)：用多组正弦/几何波与动态法线构造实时大水面的经典实现，适合作为 Ocean MVP 的视觉基线；原文也明确其目标是视觉可信而非严格物理模拟。
- Jerry Tessendorf, [Simulating Ocean Water](https://people.computing.clemson.edu/~jtessen/reports/papers_files/coursenotes2002.pdf)：频谱海洋与 FFT 路线的原始技术来源之一，用于后续海况统计与频域路线评估，不代表本仓库已实现。
- Jerry Tessendorf, [Interactive Water Surfaces / iWave](https://people.computing.clemson.edu/~jtessen/reports/papers_files/Interactive_Water_Surfaces.pdf)：支持把开放海洋环境波与局部交互波场分层处理的原始资料，用于界定未来混合路线。
- NVIDIA, [WaveWorks](https://developer.nvidia.com/waveworks)：官方产品说明展示了基于风谱、逆 FFT、泡沫与多层细节的海洋路线，用来界定高级 Ocean 分支的能力范围。
- NOAA, [Shallow-Water Analytical Benchmarking](https://nctr.pmel.noaa.gov/benchmark/Analytical/index.html)：用于界定浅水模型面向长波、水深与深度平均运动的职责，不把它当作普通深海风浪细节方案。
- Three.js, [WebGPU Ocean example](https://threejs.org/examples/webgpu_ocean.html) 与 [WebGPU Compute Water example](https://threejs.org/examples/webgpu_compute_water.html)：官方浏览器示例，用来审视渲染骨架与计算水面兼容边界；不能仅凭示例名称推断其物理能力，复用前仍需固定版本审计。

## 河流、流向与开放边界

- Three.js, [CatmullRomCurve3](https://threejs.org/docs/pages/CatmullRomCurve3.html) 与 [Curve](https://threejs.org/docs/pages/Curve.html)：样条中心线、按弧长取点和切线的官方接口依据；它们只生成形状和路径。
- Alex Vlachos / Valve, [Water Flow in Portal 2](https://advances.realtimerendering.com/s2010/Vlachos-Waterflow%28SIGGRAPH%202010%20Advanced%20RealTime%20Rendering%20Course%29.pdf)：flow map 与双相位表面细节的原作者演讲资料，用于 River 视觉流向路线。
- Three.js, [Water2Mesh source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Water2Mesh.js) 与 [Water2 source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Water2.js)：官方 WebGPU/WebGL 水面源码参考；flow map 驱动的是表面着色，不代表水量运输。
- Kurganov & Petrova, [A Second-Order Well-Balanced Positivity Preserving Central-Upwind Scheme for the Saint-Venant System](https://people.tamu.edu/~gpetrova/KPSV.pdf)：浅水方程在非平床、静水平衡和非负水深方面的原始数值方法依据。
- US Army Corps of Engineers, [HEC-RAS 2D Boundary and Initial Conditions](https://www.hec.usace.army.mil/confluence/rasdocs/r2dum/latest/boundary-and-initial-conditions-for-2d-flow-areas)：用于界定上/下游开放边界、边界条件对结果的影响及研究区布置；本项目不因此成为 HEC-RAS 等价物。

## 局部流体、浅水与计算边界

- Epic Games, [Fluid Simulation Overview](https://dev.epicgames.com/documentation/unreal-engine/fluid-simulation-in-unreal-engine---overview?lang=en-US)：官方文档区分 2D FLIP、浅水和 3D FLIP 的适用范围与成本，支持“按场景选择模型”而不是单一求解器的路线。
- NVIDIA, [Fast Fluid Dynamics Simulation on the GPU](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)：GPU 网格流体与边界处理参考；其二维示例并不自动提供自由海面，因此不作为 Ocean MVP 的直接替代。
- Three.js, [GPGPU Water example source](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_gpgpu_water.html)：官方高度场水面示例，可作为局部水面扰动与浏览器计算管线参考；使用前仍需固定提交和许可证记录。
- Nuttapong Chentanez and Matthias Müller, [Real-time Simulation of Large Bodies of Water with Small Scale Details](https://matthias-research.github.io/pages/publications/hfFluid.pdf)：浅水高度场与粒子质量/动量转换的原始论文，支持 Waterfall/Flood 共享研究母体；未实现交换审计时不能引用它来声称本项目守恒。
- Ihmsen et al., [Unified Spray, Foam and Air Bubbles for Particle-Based Fluids](https://cg.informatik.uni-freiburg.de/publications/2012_CGI_sprayFoamBubbles.pdf)：把喷雾、泡沫与气泡作为次级 diffuse particles 的原始资料，支持视觉层设计，但不等于完整空气—水多相求解。

## 渲染与真实性边界

- NVIDIA, [Rendering Water Caustics](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-2-rendering-water-caustics)：用于理解焦散的视觉近似路线；不能因为有焦散效果就声称水体模拟更准确。
- NVIDIA, [Real-Time Simulation and Rendering of 3D Fluids](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids)：体积流体模拟与渲染参考，用来评估瀑布/雾等高级路线的成本，不是当前 MVP 的默认方案。

## 开源能力与架构基准

- Wave Harmonic, [Crest](https://github.com/wave-harmonic/crest) 与 [Oceans, Rivers and Lakes](https://crest.readthedocs.io/en/stable/user/water-bodies.html)：MIT 开源 Unity 水系统，支持海洋、湖泊、河流、流场、泡沫、浮力和开放世界层级；用于研究统一水面输入、查询和 LOD 架构。其 GitHub 版本不支持 WebGL，不能直接作为本浏览器项目依赖。
- Arnklit, [Waterways](https://github.com/Arnklit/Waterways)：MIT 开源 Godot 河流生成插件，支持样条河道、地形贴合、流向/泡沫图和浮力查询；用于研究 River 的场景创作和全局高度/流场输出。它主要是作者工具和视觉流场，不是浅水求解器。
- UIHI Lab, [Hydro3DJS](https://github.com/uihilab/Hydro3DJS)：MIT 开源 Three.js 水文可视化库，支持降雨、洪水区、地理数据和数字孪生式展示；用于研究宏观场景、GeoJSON 和数据可视化层，不据此声称实时水动力求解。
- Lisyarus, [webgpu-shallow-water](https://github.com/lisyarus/webgpu-shallow-water)：MIT 开源 WebGPU 浅水方程实现，显式保存地形、水柱高度和方向流量；用于审视 Flood/Pool 的 GPU 数据布局、源/汇和水量限制。高度场不能直接表达悬空瀑布，需要与粒子或解析水束转换。
- Weigert, [SimpleHydrology](https://github.com/weigert/SimpleHydrology)：MIT 开源程序化地形水文实验，研究溪流、水潭、流量、动量和侵蚀；用于 `WaterGraph`、汇流和场景生成参考，不作为现成浏览器渲染库。
- Yong Su, [threejs-water](https://github.com/jeantimex/threejs-water)：MIT 开源 Three.js 局部水面模拟，包含波动、反射/折射、焦散、浮力和物体扰动；用于 Pool 和局部交互候选，不代表三维自由液体或大尺度河海。
- Piellard, [Waterfall WebGL](https://piellardj.github.io/waterfall-webgl/)：GPU 瀑布粒子与障碍碰撞实验，用于研究落水粒子和表面重建；粒子彼此独立，不能单独提供上游—下游质量守恒。

这些开源项目覆盖大量子能力，但没有一个项目在当前 Web 技术栈中直接提供完整的 Ocean → River → Waterfall → Pool → Flood → Local Liquid 统一系统。因此本项目优先建设能力适配、公共语义和跨模块传递，不重复从零编写所有渲染效果。

## 引用规则

1. 论文和官方文档只能证明方法存在及其通常适用范围。
2. “本项目已实现、可运行、达到某性能”必须由本仓库固定版本和测试证据支持。
3. 第三方示例若进入代码，必须另行记录固定提交、许可证、修改点与运行结果。
4. 任何与真实流量、水位、淹没范围或工程安全有关的结论，都不能由视觉原型直接推导。
