"""Iron Valley asset build.

Runs headless, either with the Blender app or the bpy module:

    blender -b -P blender/build.py -- [--only saw_bench,worker] [--fast] [--no-render]
    python3 blender/build.py [--only ...] [--fast] [--no-render]

Writes models/<name>.glb, renders/<name>*.png and reports/budget.{json,md}.
Exits with code 1 when any model breaks its size budget, so it can gate CI.
"""
import argparse
import importlib
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from ivlib import bake, export, render, scene  # noqa: E402

ORDER = ["saw_bench", "pipe_machine", "tool_press", "generator", "truck", "props", "env", "site", "yard", "facilities", "level2", "level3", "level4", "level5", "worker", "owner"]
FILE_LIMIT_KIB = 400  # strategy doc: any single file under 400 KiB


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--fast", action="store_true", help="skip the occlusion bake")
    ap.add_argument("--no-render", action="store_true")
    ap.add_argument("--no-meshopt", action="store_true", help="skip EXT_meshopt_compression (default on; the game uses MeshoptDecoder)")
    ap.add_argument("--out", default=ROOT)
    return ap.parse_args(argv)


def build_one(name, args):
    t0 = time.time()
    scene.reset()
    mod = importlib.import_module(f"assets.{name}")
    if hasattr(mod, "palette_image"):
        mats = scene.materials(mod.palette_image())
    else:
        mats = scene.materials()
    root, meta = mod.build(mats)
    meshes = [o for o in root.children_recursive if o.type == "MESH"]
    if args.fast:
        bake.flat_color(meshes)
    else:
        bake.bake_ao(meshes, **meta.get("bake", {}))
    shots = []
    if not args.no_render:
        rdir = os.path.join(args.out, "renders")
        os.makedirs(rdir, exist_ok=True)
        if "renders" in meta:
            shots = meta["renders"](root, rdir)
        else:
            shots = [render.render_preview(meshes, os.path.join(rdir, f"{name}.png"))]
    if "before_export" in meta:
        meta["before_export"](root)
    if not meta.get("uvs", False):
        for o in meshes:
            while o.data.uv_layers:
                o.data.uv_layers.remove(o.data.uv_layers[0])
    raw = export.export_glb(root, os.path.join(args.out, "build", "raw", f"{name}.glb"),
                            animations=meta.get("animations", False))
    path = os.path.join(args.out, "models", f"{name}.glb")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    cmd = ["node", os.path.join(args.out, "tools", "optimize.mjs"), raw, path]
    if not args.no_meshopt:
        cmd.append("--meshopt")
    res = subprocess.run(cmd, capture_output=True, text=True)
    opt = json.loads(res.stdout.strip().splitlines()[-1]) if res.stdout.strip() else {}
    if res.returncode:
        print(res.stdout, res.stderr, file=sys.stderr)
        raise SystemExit(f"[iv] {name}: optimiser or validator failed")
    if meta.get("animations"):
        chk = subprocess.run(["node", os.path.join(args.out, "tools", "anim_check.mjs"), path], capture_output=True, text=True)
        if chk.returncode:
            print(chk.stdout, chk.stderr, file=sys.stderr)
            raise SystemExit(f"[iv] {name}: animation check failed")
    rep = export.glb_report(path)
    rep["raw_kib"] = round(opt["inBytes"] / 1024, 1)
    rep["validator"] = {"errors": opt["errors"], "warnings": opt["warnings"]}
    rep.update(name=name, kind=meta["kind"], budget_kib=meta["budget_kib"],
               seconds=round(time.time() - t0, 1), renders=[os.path.relpath(s, args.out) for s in shots])
    rep["ok"] = rep["kib"] <= meta["budget_kib"] and rep["kib"] <= FILE_LIMIT_KIB
    print(f"[iv] {name}: {rep['kib']} KiB / {meta['budget_kib']} KiB, {rep['triangles']} tris, "
          f"{rep['draw_calls']} draw calls, {len(rep['animations'])} clips, {rep['seconds']} s, "
          f"{'OK' if rep['ok'] else 'OVER BUDGET'}", flush=True)
    return rep


def write_reports(reps, out):
    rdir = os.path.join(out, "reports")
    os.makedirs(rdir, exist_ok=True)
    old = {}
    jp = os.path.join(rdir, "budget.json")
    if os.path.exists(jp):
        try:
            old = {r["name"]: r for r in json.load(open(jp))["models"]}
        except Exception:
            old = {}
    old.update({r["name"]: r for r in reps})
    models = [old[n] for n in ORDER if n in old]
    total = round(sum(m["kib"] for m in models), 1)
    json.dump({"models": models, "total_kib": total}, open(jp, "w"), indent=2)
    lines = ["| Model | Size | Budget | Triangles | Draw calls | Clips | Status |",
             "|---|---:|---:|---:|---:|---:|---|"]
    for m in models:
        lines.append(f"| {m['name']} | {m['kib']} KiB | {m['budget_kib']} KiB | {m['triangles']} | "
                     f"{m['draw_calls']} | {len(m['animations'])} | {'OK' if m['ok'] else 'OVER'} |")
    lines.append(f"\nTotal: {total} KiB (level 1 first download target: under 5 MiB including code)")
    open(os.path.join(rdir, "budget.md"), "w").write("\n".join(lines) + "\n")


def main():
    args = parse()
    names = [n for n in args.only.split(",") if n] or ORDER
    reps = [build_one(n, args) for n in names]
    write_reports(reps, args.out)
    if not all(r["ok"] for r in reps):
        sys.exit(1)


if __name__ == "__main__":
    main()
