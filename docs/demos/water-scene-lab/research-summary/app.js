const frame = document.querySelector('#upstream-frame');
const title = document.querySelector('#demo-title');
const description = document.querySelector('#demo-description');
const action = document.querySelector('#demo-action');
const proof = document.querySelector('#demo-proof');
const boundary = document.querySelector('#demo-boundary');

const demos = {
  ssfr: {
    title: '原生 SSFR 水面',
    query: 'preset=small&view=ssfr',
    description: '粒子经过各向异性核和屏幕空间窄域滤波，被重建为连续水面。点击原生画面右上角 Pour water 可以直接观察注水和水面响应。',
    action: '旋转镜头、推水、Pour water',
    proof: '源库具有连续水面重建路径',
    boundary: '不代表真实河流或瀑布已经实现',
  },
  particles: {
    title: '原始粒子与刚体采样',
    query: 'preset=small&view=particles&particles=24000&body=sphere:0.4:0.78,torus:0.8:0.78,box:1.4:0.78&radius=0.48&speedmax=3.2',
    description: '关闭水面包装，直接查看蓝色流体粒子、速度着色和橙色刚体粒子。这是理解求解结果的诊断视图。',
    action: 'Pour water、移动指针推水',
    proof: '流体和刚体进入统一粒子求解循环',
    boundary: '粒子球不是最终水面画质',
  },
  mesh: {
    title: '原生表面网格重建',
    query: 'preset=small&view=mesh&particles=26000&bodies=0&meshres=128&meshiso=0.4&fieldsmooth=2&normalsmooth=3',
    description: '同一粒子状态被转换为标量场与连续网格，可用于检查等值面、法线平滑和小液团保留情况。',
    action: 'Pour water；按 D 调整 field res / iso',
    proof: '源库具有独立的三维表面重建路径',
    boundary: '体素分辨率提高会显著增加成本',
  },
  tension: {
    title: '原生表面张力实验',
    query: 'preset=small&view=ssfr&particles=26000&bodies=0&tension=2.1&gravity=3.4&pourspeed=2.4&pourwidth=0.08&pourheight=0.82&pourtilt=18&ssfrscale=0.5',
    description: '降低重力并提高张力，观察细液柱断裂、液滴聚合和水团连续性。这仍然运行上游原生参数入口。',
    action: '连续点击 Pour water 注入细流',
    proof: '源库支持表面张力与液滴聚合的定性效果',
    boundary: '参数不是工程表面张力单位标定',
  },
};

document.querySelectorAll('[data-demo]').forEach(button => {
  button.addEventListener('click', () => {
    const demo = demos[button.dataset.demo];
    document.querySelectorAll('[data-demo]').forEach(item => item.classList.toggle('active', item === button));
    title.textContent = demo.title;
    description.textContent = demo.description;
    action.textContent = demo.action;
    proof.textContent = demo.proof;
    boundary.textContent = demo.boundary;
    frame.src = `../../particles4all/engine/?${demo.query}`;
  });
});
