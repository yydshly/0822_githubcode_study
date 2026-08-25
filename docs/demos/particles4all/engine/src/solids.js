

import * as SW from './solid_wgsl.js';

export function bodyColor(shape) {
  if (shape === 'box') return [0.55, 0.72, 0.95];
  if (shape === 'sphere') return [0.60, 0.88, 0.66];
  if (shape === 'torus') return [0.96, 0.60, 0.62];
  return [1.0, 0.55, 0.10];
}

export function shapeId(shape) {
  return shape === 'sphere' ? 1 : shape === 'torus' ? 2 : shape === 'cylinder' ? 3 : 0;
}

export function halfExtent(b) {
  if (b.halfExtents) return b.halfExtents.slice(0, 3);
  const s = b.size;
  if (b.shape === 'sphere') return [s, s, s];
  if (b.shape === 'torus') return [s, 0.4 * s, 0.0];
  return [s * 0.9, s * 0.7, s * 0.9];
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2],
                         a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

function pushTri(v, a, b, c) {
  const n = norm(cross(sub(b, a), sub(c, a)));
  for (const p of [a, b, c]) v.push(p[0], p[1], p[2], n[0], n[1], n[2]);
}

function pushQuadN(v, a, b, c, d, na, nb, nc, nd) {
  const p = [a, b, c, a, c, d];
  const n = [na, nb, nc, na, nc, nd];
  for (let i = 0; i < 6; i++) v.push(p[i][0], p[i][1], p[i][2], n[i][0], n[i][1], n[i][2]);
}

function buildBoxMesh(h) {
  const v = [];
  const c = [[-h[0], -h[1], -h[2]], [h[0], -h[1], -h[2]], [h[0], h[1], -h[2]], [-h[0], h[1], -h[2]],
             [-h[0], -h[1], h[2]], [h[0], -h[1], h[2]], [h[0], h[1], h[2]], [-h[0], h[1], h[2]]];
  const faces = [[0,3,2,1],[4,5,6,7],[0,1,5,4],[3,7,6,2],[0,4,7,3],[1,2,6,5]];
  for (const f of faces) {
    pushTri(v, c[f[0]], c[f[1]], c[f[2]]);
    pushTri(v, c[f[0]], c[f[2]], c[f[3]]);
  }
  return v;
}

function buildSphereMesh(r, slices = 32, stacks = 16) {
  const v = [];
  const dir = (t, p) => [Math.sin(t) * Math.cos(p), Math.cos(t), Math.sin(t) * Math.sin(p)];
  const sc = (n, s) => [n[0] * s, n[1] * s, n[2] * s];
  for (let i = 0; i < stacks; i++) {
    const t0 = Math.PI * i / stacks, t1 = Math.PI * (i + 1) / stacks;
    for (let j = 0; j < slices; j++) {
      const p0 = 2 * Math.PI * j / slices, p1 = 2 * Math.PI * (j + 1) / slices;
      const n00 = dir(t0, p0), n01 = dir(t0, p1);
      const n11 = dir(t1, p1), n10 = dir(t1, p0);
      pushQuadN(v, sc(n00, r), sc(n01, r), sc(n11, r), sc(n10, r), n00, n01, n11, n10);
    }
  }
  return v;
}

function buildTorusMesh(R, r, major = 48, minor = 20) {
  const v = [];

  const nrm = (a, b) => [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)];
  const pos = (a, b) => [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b),
                         (R + r * Math.cos(b)) * Math.sin(a)];
  for (let i = 0; i < major; i++) {
    const a0 = 2 * Math.PI * i / major, a1 = 2 * Math.PI * (i + 1) / major;
    for (let j = 0; j < minor; j++) {
      const b0 = 2 * Math.PI * j / minor, b1 = 2 * Math.PI * (j + 1) / minor;
      pushQuadN(v, pos(a0, b0), pos(a1, b0), pos(a1, b1), pos(a0, b1),
                nrm(a0, b0), nrm(a1, b0), nrm(a1, b1), nrm(a0, b1));
    }
  }
  return v;
}

function buildCylinderMesh(radius, halfHeight, slices = 32) {
  const v = [];
  const top = halfHeight;
  const bottom = -halfHeight;
  for (let i = 0; i < slices; i++) {
    const a0 = 2 * Math.PI * i / slices;
    const a1 = 2 * Math.PI * (i + 1) / slices;
    const p00 = [radius * Math.cos(a0), bottom, radius * Math.sin(a0)];
    const p01 = [radius * Math.cos(a1), bottom, radius * Math.sin(a1)];
    const p11 = [radius * Math.cos(a1), top, radius * Math.sin(a1)];
    const p10 = [radius * Math.cos(a0), top, radius * Math.sin(a0)];
    const n0 = [Math.cos(a0), 0, Math.sin(a0)];
    const n1 = [Math.cos(a1), 0, Math.sin(a1)];
    pushQuadN(v, p00, p01, p11, p10, n0, n1, n1, n0);
    pushTri(v, [0, top, 0], p10, p11);
    pushTri(v, [0, bottom, 0], p01, p00);
  }
  return v;
}

export class Solids {
  constructor(device, format) {
    this.dev = device;
    this.count = 0;
    this.nVerts = 0;

    this.gen = 0;

    const pm = device.createShaderModule({ code: SW.bodyPackWGSL, label: 'bodyPack' });
    this.pPack = device.createComputePipeline({
      label: 'bodyPack', layout: 'auto', compute: { module: pm, entryPoint: 'main' } });
    const sm = device.createShaderModule({ code: SW.solidWGSL, label: 'solid' });
    this.pipe = device.createRenderPipeline({
      label: 'solid', layout: 'auto',
      vertex: { module: sm, entryPoint: 'vs' },
      fragment: { module: sm, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
      depthStencil: { format: 'depth24plus', depthWriteEnabled: true, depthCompare: 'less' },
    });
    this.packUni = device.createBuffer({ size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  }

  build(sim, staticBodies = []) {
    const dynamicBodies = sim.scene.bodies;
    staticBodies = Array.from(staticBodies);
    const bodies = [...dynamicBodies, ...staticBodies];
    this.dynamicCount = dynamicBodies.length;
    this.staticBodies = staticBodies;
    this.staticStart = this.dynamicCount;
    this.staticIndex = new Map(staticBodies.map((body, index) => [body.key, this.staticStart + index]));
    this.count = bodies.length;
    this.bind = null; this.packBind = null;
    this.gen++;
    if (!this.count) { this.nVerts = 0; return; }

    const all = [];
    bodies.forEach((b, i) => {
      const h = halfExtent(b);
      const v = b.shape === 'sphere' ? buildSphereMesh(h[0])
              : b.shape === 'torus' ? buildTorusMesh(h[0], h[1])
              : b.shape === 'cylinder' ? buildCylinderMesh(h[0], h[1])
              : buildBoxMesh(h);
      for (let k = 0; k < v.length; k += 6) {
        all.push(v[k], v[k + 1], v[k + 2], i, v[k + 3], v[k + 4], v[k + 5], 0);
      }
    });
    this.nVerts = all.length / 8;
    this.verts?.destroy();
    this.verts = this.dev.createBuffer({ size: all.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'solidVerts' });
    this.dev.queue.writeBuffer(this.verts, 0, new Float32Array(all));

    const stat = new Float32Array(this.count * 8);
    bodies.forEach((b, i) => {
      const h = halfExtent(b), c = b.color || bodyColor(b.shape);
      stat.set([h[0], h[1], h[2], shapeId(b.shape)], i * 8);
      stat.set([c[0], c[1], c[2], 0], i * 8 + 4);
    });
    this.stat?.destroy();
    this.stat = this.dev.createBuffer({ size: stat.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'bodyStatic' });
    this.dev.queue.writeBuffer(this.stat, 0, stat);

    this.packed?.destroy();
    this.packed = this.dev.createBuffer({ size: this.count * 6 * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, label: 'bodiesPacked' });
    this.dev.queue.writeBuffer(this.packUni, 0, new Uint32Array([this.dynamicCount, 0, 0, 0]));

    staticBodies.forEach((body, index) => {
      const h = halfExtent(body);
      const colour = body.color || bodyColor(body.shape);
      const rot = body.rot || [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const data = new Float32Array(24);
      data.set([body.centre[0], body.centre[1], body.centre[2], shapeId(body.shape)], 0);
      data.set([h[0], h[1], h[2], 0], 4);
      data.set([rot[0], rot[1], rot[2], 0], 8);
      data.set([rot[3], rot[4], rot[5], 0], 12);
      data.set([rot[6], rot[7], rot[8], 0], 16);
      data.set([colour[0], colour[1], colour[2], 0], 20);
      this.dev.queue.writeBuffer(this.packed, (this.staticStart + index) * 6 * 16, data);
    });
  }

  pack(enc, sim) {
    if (!this.dynamicCount) return;
    if (!this.packBind) {
      this.packBind = this.dev.createBindGroup({
        layout: this.pPack.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: this.packUni } },
                  { binding: 1, resource: { buffer: sim.buf.bodyCentre } },
                  { binding: 2, resource: { buffer: sim.buf.bodyRot } },
                  { binding: 3, resource: { buffer: this.stat } },
                  { binding: 4, resource: { buffer: this.packed } }],
      });
    }
    const pass = enc.beginComputePass(this.timer?.mark('pack'));
    pass.setPipeline(this.pPack);
    pass.setBindGroup(0, this.packBind);
    pass.dispatchWorkgroups(Math.ceil(this.dynamicCount / 64));
    pass.end();
  }

  setStaticState({ activeNozzle = null, pumpActive = false } = {}) {
    for (const body of this.staticBodies || []) {
      const index = this.staticIndex.get(body.key);
      if (index == null) continue;
      const base = body.color || bodyColor(body.shape);
      const isNozzle = body.role === 'nozzle';
      const active = isNozzle && body.nozzle === activeNozzle;
      const colour = active
        ? [Math.min(1, base[0] * 1.45 + 0.12), Math.min(1, base[1] * 1.45 + 0.12), Math.min(1, base[2] * 1.45 + 0.12)]
        : pumpActive && isNozzle
          ? [base[0] * 0.78, base[1] * 0.78, base[2] * 0.78]
          : base;
      this.dev.queue.writeBuffer(this.packed, index * 6 * 16 + 5 * 16,
                                 new Float32Array([colour[0], colour[1], colour[2], 0]));
    }
  }

  describeStatic() {
    return (this.staticBodies || []).map(body => ({
      key: body.key,
      role: body.role || 'apparatus',
      nozzle: body.nozzle || null,
      shape: body.shape,
      centre: body.centre.slice(),
      halfExtents: halfExtent(body)
    }));
  }

  draw(pass, viewUni) {
    if (!this.count || !this.nVerts) return;
    if (!this.bind || this.bindKey !== viewUni) {
      this.bindKey = viewUni;
      this.bind = this.dev.createBindGroup({
        layout: this.pipe.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: viewUni } },
                  { binding: 1, resource: { buffer: this.packed } },
                  { binding: 2, resource: { buffer: this.verts } }],
      });
    }
    pass.setPipeline(this.pipe);
    pass.setBindGroup(0, this.bind);
    pass.draw(this.nVerts);
  }
}
