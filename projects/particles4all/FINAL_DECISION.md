# M6-WP3｜Particles4All 最终技术决策

状态：`completed`。

## 主决策

```text
KEEP AS RESEARCH
+ PACKAGE INTERNAL TOOLKIT
+ PREPARE ONE UPSTREAM FIX
+ STOP BROAD EXPANSION
```

Particles4All 值得保留为浏览器 WebGPU 局部液体—刚体研究基线，但当前不应包装成通用实时水体 SDK，也不应继续扩展到海洋、河流、流域、工程洪水或复杂容器系统。

## 保留（KEEP）

- 固定上游源码、原生 WebGPU/PBF/Shape Matching/SSFR 能力地图；
- 28K 级局部液体与刚体交互样例；
- 落水池、闸门喷流两类复用证据；
- 容器倾倒的 STOP 证据，作为避免未来重复踩坑的边界记录；
- Chrome/Edge 性能、数值和生命周期矩阵。

价值：它提供普通水面 shader 或装饰粒子无法提供的双向粒子—刚体约束证据，适合技术预研、交互原型、教学和高性能设备上的局部效果验证。

## 内部包装（PACKAGE INTERNAL）

保留以下模块作为仓库内研究工具，而不是公开稳定 SDK：

- `Particles4AllRuntimeAdapter`；
- `createFluidBlock()`；
- 整数 tick 事件队列；
- 刚体采样、hold/release 事件；
- GPU 浏览器 Evidence Gates 与 JSON 证据格式。

暂不发布 npm 包，原因是 Adapter 依赖 iframe、DOM 控件和 `window.__sim/__ui` 内部接口，且缺少显式 GPU 资源释放契约。

## 上游候选（CONTRIBUTE PREP）

本地准备 [`patches/fps-wall-clock.patch`](patches/fps-wall-clock.patch)：把 FPS 墙钟累计与为求解稳定性而截断的 `sim dt` 分离。该补丁不改变 PBF 求解输入，只修正慢帧显示；100K/300K 的独立 rAF 证据可以复现问题。

不在本轮直接提交 PR。对外贡献需要用户授权，并应先与上游作者确认复现方式和测试环境。

Apple storage-buffer 兼容已有上游 issue/PR，本项目不重复贡献。

## 停止（STOP）

- M4-WP2 复杂碰撞体与中空容器 fork；
- 目标旋转、复合刚体与容器倾倒渲染链；
- 独立海洋、河流、流域、洪水和 CFD 路线；
- 把 100K/300K 当成本机实时质量档；
- 在没有公共运行时 API 和资源生命周期前对外承诺通用 SDK。

## 性能产品边界

在本机 Intel Gen-12LP：

- 28K particles / SSFR：约 17.60–20.02 / 14.15–15.08 FPS，只能定位为可演示；
- 100K：约 2.05–2.95 FPS，不实用；
- 300K：约 0.66–0.90 FPS，不实用。

这些结果不外推到 RTX、Safari 或 Apple GPU。需要面向新设备或产品时，应以同一 Gate 重新测量，而不是沿用本机结论。

## 重新启动扩展的条件

只有出现下列至少一项新证据，才重新开启已停止路线：

1. 明确产品需求需要真实双向局部液体—刚体交互；
2. 目标设备实测达到约定帧率与稳定性预算；
3. 上游提供稳定运行时 API 或资源释放契约；
4. 复杂碰撞/容器能力有可复用上游实现，而不是本项目独立造引擎；
5. 新收益足以覆盖 solver、场景语法、渲染和跨设备测试的共同维护成本。

## 项目意义

最终成果不是“更多水场景”，而是一条可复现的技术判断链：原库算法真实存在，Adapter 能受控复用，两个局部场景证明模块价值，容器与宏观水环境被证据化停止，性能矩阵给出产品边界，并留下一个低风险上游改进候选。后续团队可以基于这些证据快速决定是否重新投入，而无需从视觉印象重新争论。
