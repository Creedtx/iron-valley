// Animation sanity check for character GLBs. For every clip it reports the
// largest spine and hips rotation away from rest, and fails when a calm clip
// (idle, inspect, phone) bends the spine more than its limit, or when any
// channel uses CUBICSPLINE (quantisation breaks spline tangents).
//   node tools/anim_check.mjs models/worker.glb [models/owner.glb ...]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const LIMIT = { idle: 4, inspect: 6, phone: 6, sit: 8 };   // degrees of spine bend
let bad = 0;
for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  for (const a of doc.getRoot().listAnimations()) {
    const res = {};
    for (const ch of a.listChannels()) {
      const s = ch.getSampler(), node = ch.getTargetNode().getName();
      if (s.getInterpolation() === 'CUBICSPLINE') { console.log(`FAIL ${file} ${a.getName()} ${node}: CUBICSPLINE`); bad++; }
      if (ch.getTargetPath() !== 'rotation' || !['spine', 'hips', 'head'].includes(node)) continue;
      const acc = s.getOutput(), n = acc.getCount(), q = [0, 0, 0, 0]; let max = 0;
      for (let i = 0; i < n; i++) { acc.getElement(i, q); const w = Math.min(1, Math.abs(q[3]) / Math.hypot(...q)); max = Math.max(max, 2 * Math.acos(w) * 180 / Math.PI); }
      res[node] = +max.toFixed(1);
    }
    const lim = LIMIT[a.getName()], fail = lim !== undefined && (res.spine || 0) > lim;
    if (fail) bad++;
    console.log(`${fail ? 'FAIL' : 'ok  '} ${file.split('/').pop()} ${a.getName().padEnd(8)} spine ${res.spine ?? 0}° hips ${res.hips ?? 0}° head ${res.head ?? 0}°${lim !== undefined ? ` (limit ${lim}°)` : ''}`);
  }
}
process.exit(bad ? 1 : 0);
