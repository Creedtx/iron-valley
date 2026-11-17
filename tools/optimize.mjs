// Post-process a Blender GLB for the game: weld duplicate vertices, quantize
// attributes (KHR_mesh_quantization, read natively by three.js GLTFLoader),
// optionally meshopt-compress, then validate with the Khronos validator.
//
//   node tools/optimize.mjs <in.glb> <out.glb> [--meshopt]
//
// Prints one JSON line: { inBytes, outBytes, errors, warnings }.
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';

const [inPath, outPath, ...flags] = process.argv.slice(2);
const useMeshopt = flags.includes('--meshopt');

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const doc = await io.read(inPath);

// Keep a copy of every node name: the game looks up blades, wheels and
// anchors by name, so pruning must never drop an empty node.
await doc.transform(
  dedup(),
  prune({ keepLeaves: true, keepAttributes: true }),
  quantize({ quantizePosition: 14, quantizeNormal: 8, quantizeColor: 8, quantizeTexcoord: 10, quantizeWeight: 8 }),
  weld(),
);
if (useMeshopt) await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));

await io.write(outPath, doc);
const bytes = new Uint8Array(fs.readFileSync(outPath));
const report = await validator.validateBytes(bytes, { maxIssues: 50 });
const issues = report.issues;
const out = {
  inBytes: fs.statSync(inPath).size, outBytes: bytes.length,
  errors: issues.numErrors, warnings: issues.numWarnings,
  messages: issues.messages.filter(m => m.severity <= 1).slice(0, 8).map(m => `${m.code}: ${m.message} @ ${m.pointer}`),
};
console.log(JSON.stringify(out));
if (issues.numErrors) process.exit(2);
