import assert from 'node:assert/strict';
import * as shaders from '../../../docs/demos/particles4all/engine/src/wgsl.js';

const shaderEntries = Object.entries(shaders).filter(([, source]) => typeof source === 'string');
const multiSwizzleAssignment = /\.[xyzwrgba]{2,4}\s*(?:[+\-*/%&|^]?=)/g;
const violations = [];

for (const [name, source] of shaderEntries) {
  for (const match of source.matchAll(multiSwizzleAssignment)) {
    violations.push({ shader: name, syntax: match[0], offset: match.index });
  }
}

assert.deepEqual(violations, [],
  'Core WGSL must not require the optional swizzle_assignment language feature');
assert.match(shaders.staticCollisionWGSL, /p = vec3f\(corrected\.x, p\.y, corrected\.y\)/);
assert.doesNotMatch(shaders.staticCollisionWGSL, /select\([^\n]*\/\s*(?:d|dist)/,
  'Collision normals must not eagerly evaluate a possible division by zero');

console.log(JSON.stringify({
  passed: 3,
  failed: 0,
  shadersChecked: shaderEntries.length,
  baseline: 'WGSL core language without swizzle_assignment'
}));
