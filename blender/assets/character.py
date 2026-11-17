"""Shared character rig, clips and builder (stylised proportions).

Every person in the game sits on this rig: about 1.2 m tall with a big head,
so faces read at the game's camera distance. A character is one body mesh
plus optional variant meshes (hats, hair, beards) that share the skeleton.
The game shows or hides variants per person; colour comes from a 16x1
palette texture (slots in ivlib.palette.WORKER_SLOTS), so one file covers
every worker.

Clips: idle, walk, work, fix, sit, carry, cheer, inspect, point, phone.
"""
import math

import bpy
from mathutils import Vector

from ivlib import render
from ivlib.palette import WORKER_DEFAULT, WORKER_SLOTS, srgb
from ivlib.scene import root

S = {n: i for i, n in enumerate(WORKER_SLOTS)}
FPS = 30
WHITE = "#ffffff"  # colour comes from the palette texture; COLOR_0 carries occlusion only

# name: (head, tail, parent)
BONES = {
    "root": ((0, 0, 0), (0, 0, 0.1), None),
    "hips": ((0, 0, 0.44), (0, 0, 0.52), "root"),
    "spine": ((0, 0, 0.52), (0, 0, 0.8), "hips"),
    "head": ((0, 0, 0.8), (0, 0, 1.12), "spine"),
    "thigh.L": ((0.07, 0, 0.44), (0.07, 0, 0.245), "hips"),
    "shin.L": ((0.07, 0, 0.245), (0.07, 0, 0.04), "thigh.L"),
    "thigh.R": ((-0.07, 0, 0.44), (-0.07, 0, 0.245), "hips"),
    "shin.R": ((-0.07, 0, 0.245), (-0.07, 0, 0.04), "thigh.R"),
    "upper_arm.L": ((0.17, 0, 0.745), (0.17, 0, 0.59), "spine"),
    "forearm.L": ((0.17, 0, 0.59), (0.17, 0, 0.42), "upper_arm.L"),
    "upper_arm.R": ((-0.17, 0, 0.745), (-0.17, 0, 0.59), "spine"),
    "forearm.R": ((-0.17, 0, 0.59), (-0.17, 0, 0.42), "upper_arm.R"),
}
NSLOTS = len(WORKER_SLOTS)
W = dict(mat=0, jitter=0.0, nslots=NSLOTS)


def palette_image(colors=None, name="palette"):
    cols = dict(WORKER_DEFAULT, **(colors or {}))
    img = bpy.data.images.new(name, width=NSLOTS, height=1, alpha=False)
    px = []
    for slot in WORKER_SLOTS:
        px += [*srgb(cols[slot]), 1.0]
    img.pixels[:] = px
    img.pack()
    return img


# ----------------------------------------------------------------- body parts
def legs(p, shoe="boots", pants="pants", boot_h=0.075):
    for side, x in (("L", 0.07), ("R", -0.07)):
        g = f"shin.{side}"
        p.box((x, -0.025, 0.03), (0.095, 0.165, 0.06), WHITE, bevel=0.022, seg=0, slot=S[shoe], group=g, **W)
        p.box((x, -0.025, 0.006), (0.1, 0.17, 0.012), WHITE, bevel=0.004, seg=0, slot=S["spare4"], group=g, **W)
        p.cyl((x, 0, 0.045 + boot_h / 2), 0.05, boot_h, WHITE, segs=8, slot=S[shoe], group=g, **W)
        p.cyl((x, 0, 0.17), 0.047, 0.17, WHITE, segs=8, radius2=0.052, slot=S[pants], group=g, **W)
        p.cyl((x, 0, 0.345), 0.057, 0.22, WHITE, segs=8, radius2=0.064, slot=S[pants], group=f"thigh.{side}", **W)
        p.sphere((x, 0, 0.245), 0.05, WHITE, segs=(8, 6), slot=S[pants], group=g, **W)  # knee


def arms(p, sleeve="shirt", hand="glove", rolled=True):
    for side, x in (("L", 0.17), ("R", -0.17)):
        ua, fa = f"upper_arm.{side}", f"forearm.{side}"
        p.sphere((x, 0, 0.735), 0.058, WHITE, segs=(8, 6), slot=S[sleeve], group=ua, **W)
        p.cyl((x, 0, 0.665), 0.046, 0.15, WHITE, segs=8, radius2=0.05, slot=S[sleeve], group=ua, **W)
        if rolled:
            p.cyl((x, 0, 0.592), 0.052, 0.04, WHITE, segs=8, slot=S[sleeve], group=ua, **W)
            p.cyl((x, 0, 0.51), 0.036, 0.15, WHITE, segs=8, radius2=0.04, slot=S["skin"], group=fa, **W)
        else:
            p.cyl((x, 0, 0.51), 0.042, 0.16, WHITE, segs=8, radius2=0.046, slot=S[sleeve], group=fa, **W)
        p.sphere((x, -0.004, 0.405), 0.047, WHITE, segs=(8, 6), scale=(0.85, 1, 1.05), slot=S[hand], group=fa, **W)
        p.sphere((x * 0.86, -0.03, 0.42), 0.02, WHITE, segs=(6, 4), slot=S[hand], group=fa, **W)  # thumb


def head(p, brows=True, nose=0.032):
    H = dict(group="head", **W)
    p.cyl((0, 0, 0.805), 0.046, 0.06, WHITE, segs=8, slot=S["skin"], **H)
    p.sphere((0, 0, 0.975), 0.165, WHITE, segs=(14, 10), scale=(1.0, 0.94, 1.0), slot=S["skin"], **H)
    p.sphere((0, -0.035, 0.9), 0.12, WHITE, segs=(10, 6), scale=(1.0, 0.95, 0.75), slot=S["skin"], **H)  # jaw
    p.sphere((0, -0.162, 0.95), nose, WHITE, segs=(8, 6), scale=(0.9, 1, 1.05), slot=S["skin"], **H)
    for x in (-1, 1):
        p.sphere((x * 0.163, 0.0, 0.97), 0.035, WHITE, segs=(8, 6), scale=(0.55, 0.9, 1.15), slot=S["skin"], **H)
        p.sphere((x * 0.058, -0.138, 1.005), 0.034, WHITE, segs=(8, 6), scale=(0.95, 0.55, 1.2), slot=S["spare2"], **H)
        p.sphere((x * 0.058, -0.155, 1.0), 0.019, WHITE, segs=(8, 6), scale=(1, 0.6, 1.15), slot=S["eyes"], **H)
        p.sphere((x * 0.098, -0.128, 0.935), 0.026, WHITE, segs=(8, 5), scale=(1, 0.5, 0.7), slot=S["spare3"], **H)
        if brows:
            p.box((x * 0.06, -0.152, 1.058), (0.062, 0.018, 0.016), WHITE, bevel=0.005, seg=0, rot=(0, x * -8, 0),
                  slot=S["hair"], **H)
    p.box((0, -0.15, 0.885), (0.05, 0.012, 0.01), WHITE, bevel=0.003, seg=0, slot=S["eyes"], **H)  # mouth


def hair_short(p, slot="hair"):
    H = dict(group="head", **W)
    p.dome((0, 0.012, 1.005), 0.172, WHITE, segs=(12, 4), scale=(1.03, 1.0, 0.92), slot=S[slot], **H)
    p.sphere((0, 0.05, 0.96), 0.158, WHITE, segs=(12, 7), scale=(1.04, 0.9, 0.95), slot=S[slot], **H)
    for x in (-1, 1):
        p.box((x * 0.155, -0.03, 0.97), (0.03, 0.06, 0.08), WHITE, bevel=0.01, seg=0, slot=S[slot], **H)  # sideburns


# ------------------------------------------------------------- role gear
def clipboard(p):
    """Held in the left hand; lies flat towards the face when the forearm lifts."""
    G = dict(group="forearm.L", **W)
    p.box((0.155, -0.035, 0.375), (0.17, 0.014, 0.23), WHITE, bevel=0.004, seg=0, slot=S["board"], **G)
    p.box((0.155, -0.044, 0.37), (0.14, 0.006, 0.19), WHITE, seg=0, slot=S["paper"], **G)
    for k in range(4):
        p.box((0.155, -0.048, 0.32 + k * 0.035), (0.1, 0.004, 0.006), WHITE, seg=0, slot=S["cord"], **G)
    p.box((0.155, -0.048, 0.478), (0.07, 0.014, 0.03), WHITE, bevel=0.004, seg=0, slot=S["metal"], **G)


def vest(p):
    """Hi-vis vest over the torso with two reflective bands."""
    G = dict(group="spine", **W)
    p.sphere((0, 0.0, 0.665), 0.178, WHITE, segs=(14, 8), scale=(1.03, 0.82, 0.8), slot=S["vest"], **G)
    for z in (0.6, 0.675):
        p.sphere((0, 0.0, z), 0.181, WHITE, segs=(14, 4), scale=(1.03, 0.82, 0.09), slot=S["stripe"], **G)
    for x in (-1, 1):
        p.box((x * 0.07, -0.13, 0.735), (0.045, 0.03, 0.1), WHITE, bevel=0.008, seg=0, rot=(-14, 0, 0), slot=S["vest"], **G)
        p.box((x * 0.07, -0.133, 0.67), (0.02, 0.012, 0.17), WHITE, seg=0, slot=S["stripe"], **G)
    p.box((0, -0.14, 0.62), (0.06, 0.01, 0.045), WHITE, seg=0, slot=S["board"], **G)  # name badge


def toolbelt(p):
    G = dict(group="hips", **W)
    p.cyl((0, 0, 0.5), 0.152, 0.045, WHITE, segs=12, slot=S["belt"], **G)
    for x in (-1, 1):
        p.box((x * 0.135, -0.05, 0.455), (0.065, 0.1, 0.11), WHITE, bevel=0.015, seg=0, slot=S["belt"], **G)
    p.box((0.135, -0.06, 0.53), (0.02, 0.02, 0.09), WHITE, seg=0, slot=S["tool"], **G)  # screwdriver
    p.box((-0.135, -0.075, 0.525), (0.03, 0.02, 0.07), WHITE, seg=0, slot=S["tool"], **G)  # tester
    p.cyl((0.0, 0.14, 0.47), 0.05, 0.04, WHITE, segs=10, axis="Y", slot=S["cord"], **G)  # tape / wire coil


def wrench(p):
    """Spanner in the right hand, hanging along the forearm line."""
    G = dict(group="forearm.R", **W)
    p.beam((-0.172, -0.03, 0.42), (-0.172, -0.03, 0.24), 0.022, WHITE, slot=S["metal"], **G)
    p.box((-0.172, -0.03, 0.225), (0.07, 0.024, 0.045), WHITE, bevel=0.006, seg=0, slot=S["metal"], **G)
    p.box((-0.172, -0.03, 0.4), (0.03, 0.03, 0.05), WHITE, bevel=0.006, seg=0, slot=S["tool"], **G)


def earmuffs(p):
    G = dict(group="head", **W)
    for x in (-1, 1):
        p.cyl((x * 0.172, 0.0, 0.975), 0.058, 0.05, WHITE, segs=12, axis="X", slot=S["muff"], **G)
        p.cyl((x * 0.2, 0.0, 0.975), 0.04, 0.012, WHITE, segs=10, axis="X", slot=S["cord"], **G)
        p.beam((x * 0.175, 0.0, 1.03), (x * 0.15, 0.0, 1.1), 0.018, WHITE, slot=S["cord"], **G)


# ---------------------------------------------------------------------- rig
def _rig(name):
    arm = bpy.data.armatures.new(f"{name}_rig")
    ob = bpy.data.objects.new(f"{name}_rig", arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for bn, (h, t, par) in BONES.items():
        b = arm.edit_bones.new(bn)
        b.head, b.tail = h, t
        b.align_roll(Vector((0, -1, 0)))
        if par:
            b.parent = eb[par]
            b.use_connect = False
        b.use_deform = bn != "root"
        eb[bn] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ob.pose.bones:
        pb.rotation_mode = "XYZ"
    return ob


def _apply(rig, pose):
    for pb in rig.pose.bones:
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
    for bn, v in pose.items():
        pb = rig.pose.bones[bn]
        side = -1 if bn.endswith(".R") else 1
        pb.rotation_euler = (v.get("pitch", 0), v.get("yaw", 0), side * v.get("spread", 0))
        if "lift" in v or "fwd" in v:
            pb.location = (0, v.get("lift", 0), v.get("fwd", 0))


def _key(rig, frame):
    for pb in rig.pose.bones:
        pb.keyframe_insert("rotation_euler", frame=frame)
        if pb.name == "hips":
            pb.keyframe_insert("location", frame=frame)


def _fcurves(act):
    if hasattr(act, "fcurves") and len(getattr(act, "fcurves", [])):
        return list(act.fcurves)
    out = []
    for layer in act.layers:
        for strip in layer.strips:
            for bag in strip.channelbags:
                out += list(bag.fcurves)
    return out


def _clip(rig, name, keys, loop=True, interp="BEZIER"):
    act = bpy.data.actions.new(name)
    act.use_fake_user = True
    rig.animation_data_create()
    rig.animation_data.action = act
    if loop:
        step = keys[1][0] - keys[0][0]
        keys = keys + [(keys[-1][0] + step, keys[0][1])]
    for t, pose in keys:
        _apply(rig, pose)
        _key(rig, round(t * FPS))
    for fc in _fcurves(act):
        for kp in fc.keyframe_points:
            kp.interpolation = interp
    return act


def _base(spine=0.0, head=0.0, arms=0.1):
    return {"spine": {"pitch": spine}, "head": {"pitch": head},
            "upper_arm.L": {"spread": arms}, "upper_arm.R": {"spread": arms},
            "forearm.L": {"pitch": 0.15}, "forearm.R": {"pitch": 0.15}}


def _merge(*ps):
    out = {}
    for p in ps:
        for k, v in p.items():
            out.setdefault(k, {}).update(v)
    return out


def _walk_pose(s, c, carry=False):
    leg = 0.6
    pose = _merge(_base(spine=0.08), {
        "hips": {"lift": abs(c) * 0.03, "yaw": s * 0.08},
        "spine": {"yaw": -s * 0.1},
        "thigh.L": {"pitch": s * leg}, "thigh.R": {"pitch": -s * leg},
        "shin.L": {"pitch": -max(0.0, -c) * 0.9}, "shin.R": {"pitch": -max(0.0, c) * 0.9},
    })
    if carry:
        for side in ("L", "R"):
            pose = _merge(pose, {f"upper_arm.{side}": {"pitch": 0.8, "spread": 0.12},
                                 f"forearm.{side}": {"pitch": 0.85}})
        pose = _merge(pose, {"spine": {"pitch": -0.05}})
    else:
        pose = _merge(pose, {"upper_arm.L": {"pitch": -s * 0.6}, "upper_arm.R": {"pitch": s * 0.6},
                             "forearm.L": {"pitch": 0.35}, "forearm.R": {"pitch": 0.35}})
    return pose


def _clips(rig):
    clips = []
    # Idle: still upper body. Only breathing (shoulders), a little weight shift
    # and the head looking around; the spine never pitches.
    def idle(look, breathe, nod=0.0):
        return _merge(_base(spine=0.02, arms=0.1 + breathe * 0.025), {
            "head": {"yaw": look, "pitch": nod}, "hips": {"lift": -breathe * 0.004},
            "forearm.L": {"pitch": 0.15 + breathe * 0.04}, "forearm.R": {"pitch": 0.15 + breathe * 0.04}})
    clips.append(_clip(rig, "idle", [
        (0.0, idle(0.0, 0.0)), (1.0, idle(-0.16, 1.0, 0.03)), (2.0, idle(-0.16, 0.0, 0.03)),
        (3.0, idle(0.0, 1.0)), (4.0, idle(0.18, 0.0, 0.02)), (5.0, idle(0.18, 1.0, 0.02)),
    ]))
    ph = [i / 4 * math.tau for i in range(4)]
    clips.append(_clip(rig, "walk", [(i * 0.17, _walk_pose(math.sin(p), math.cos(p))) for i, p in enumerate(ph)]))
    clips.append(_clip(rig, "carry", [(i * 0.17, _walk_pose(math.sin(p), math.cos(p), carry=True)) for i, p in enumerate(ph)]))

    def work(a):
        return _merge(_base(spine=0.22, head=0.3), {
            "upper_arm.L": {"pitch": 1.05 + a, "spread": 0.18}, "upper_arm.R": {"pitch": 1.1 - a, "spread": 0.18},
            "forearm.L": {"pitch": 0.6}, "forearm.R": {"pitch": 0.55}, "hips": {"lift": -0.01}})
    clips.append(_clip(rig, "work", [(0.0, work(0.15)), (0.35, work(-0.15))]))

    def fix(a):
        return _merge(_base(spine=0.35, head=0.3), {
            "hips": {"lift": -0.16, "fwd": 0.03},
            "thigh.L": {"pitch": 1.35}, "shin.L": {"pitch": -1.9},
            "thigh.R": {"pitch": 0.55}, "shin.R": {"pitch": -1.55},
            "upper_arm.R": {"pitch": 1.45 + a, "spread": 0.12}, "forearm.R": {"pitch": 0.5 - a},
            "upper_arm.L": {"pitch": 0.95, "spread": 0.18}, "forearm.L": {"pitch": 0.6}})
    clips.append(_clip(rig, "fix", [(0.0, fix(0.35)), (0.15, fix(-0.3)), (0.3, fix(0.35))], loop=False))

    def sit(y, cup):
        return _merge(_base(spine=-0.04), {
            "hips": {"lift": -0.15},
            "thigh.L": {"pitch": 1.5}, "thigh.R": {"pitch": 1.45},
            "shin.L": {"pitch": -1.5}, "shin.R": {"pitch": -1.45},
            "upper_arm.L": {"pitch": 0.35}, "upper_arm.R": {"pitch": 0.55 + cup},
            "forearm.L": {"pitch": 0.6}, "forearm.R": {"pitch": 1.2 + cup * 1.5}, "head": {"yaw": y, "pitch": -cup * 0.3}})
    clips.append(_clip(rig, "sit", [(0.0, sit(-0.3, 0.0)), (1.5, sit(0.0, 0.35)), (3.0, sit(0.3, 0.0))]))

    up = _merge(_base(spine=-0.08, head=-0.2), {
        "upper_arm.L": {"pitch": 2.6, "spread": 0.45}, "upper_arm.R": {"pitch": 2.6, "spread": 0.45},
        "forearm.L": {"pitch": 0.2}, "forearm.R": {"pitch": 0.2}, "hips": {"lift": 0.12},
        "thigh.L": {"pitch": -0.2}, "thigh.R": {"pitch": -0.2}, "shin.L": {"pitch": -0.5}, "shin.R": {"pitch": -0.5}})
    crouch = _merge(_base(spine=0.15), {"hips": {"lift": -0.06}, "thigh.L": {"pitch": 0.5}, "thigh.R": {"pitch": 0.5},
                                        "shin.L": {"pitch": -0.9}, "shin.R": {"pitch": -0.9}})
    clips.append(_clip(rig, "cheer", [(0.0, _base()), (0.2, crouch), (0.45, up), (0.7, crouch), (0.95, up), (1.3, _base())],
                       loop=False))

    # Inspect: clipboard held up in the left hand, right hand writes, head
    # moves between the board and whoever is being checked.
    def inspect(look_down, pen):
        return _merge(_base(spine=0.04), {
            "upper_arm.L": {"pitch": 0.55, "spread": 0.02}, "forearm.L": {"pitch": 1.25},
            "upper_arm.R": {"pitch": 0.5 + pen * 0.05, "spread": -0.02}, "forearm.R": {"pitch": 1.35 + pen * 0.12},
            "head": {"pitch": 0.32 * look_down, "yaw": (1 - look_down) * 0.12}})
    clips.append(_clip(rig, "inspect", [(0.0, inspect(1, 0)), (0.35, inspect(1, 1)), (0.7, inspect(1, 0)),
                                        (1.05, inspect(1, 1)), (1.6, inspect(0, 0)), (2.4, inspect(0, 0))]))

    # Point: giving an instruction, right arm out, left hand on the hip.
    def point(k):
        return _merge(_base(spine=0.03), {
            "upper_arm.R": {"pitch": 1.35 + k * 0.12, "spread": 0.12}, "forearm.R": {"pitch": 0.08},
            "upper_arm.L": {"pitch": -0.25, "spread": 0.55}, "forearm.L": {"pitch": 1.5},
            "head": {"pitch": -0.04 + k * 0.03}})
    clips.append(_clip(rig, "point", [(0.0, point(0)), (0.3, point(1)), (0.6, point(0)), (0.9, point(1))]))

    # Phone: a slacking worker on a call, weight on one leg.
    def phone(k):
        return _merge(_base(spine=0.0), {
            "hips": {"yaw": 0.08}, "thigh.L": {"pitch": 0.08}, "shin.L": {"pitch": -0.16},
            "upper_arm.R": {"pitch": 0.35, "spread": 0.75}, "forearm.R": {"pitch": 2.35},
            "upper_arm.L": {"pitch": -0.2, "spread": 0.5}, "forearm.L": {"pitch": 1.45},
            "head": {"spread": -0.14, "yaw": -0.15 + k * 0.3, "pitch": 0.04 * k}})
    clips.append(_clip(rig, "phone", [(0.0, phone(0)), (1.2, phone(1)), (2.4, phone(0.2))]))
    return clips


def _check_axes(rig):
    _apply(rig, {"thigh.L": {"pitch": 0.6}, "upper_arm.L": {"spread": 0.6}, "spine": {"pitch": 0.3}})
    bpy.context.view_layer.update()
    pb = rig.pose.bones
    assert pb["thigh.L"].tail.y < -0.05, "thigh pitch sign"
    assert pb["upper_arm.L"].tail.x > 0.22, "arm spread sign"
    assert pb["spine"].tail.y < -0.05, "spine pitch sign"
    _apply(rig, {})
    bpy.context.view_layer.update()


# -------------------------------------------------------------------- build
def build_character(mats, name, body_fn, variants=None, sheet=None, budget=150):
    """body_fn(part) fills the body; variants maps node name -> fn(part).
    Each variant is its own skinned mesh on the same skeleton."""
    from ivlib.geo import Part

    r = root(name)
    rig = _rig(name)
    rig.parent = r
    _check_axes(rig)
    objs = {}
    for vname, fn in [(f"{name}_body", body_fn)] + list((variants or {}).items()):
        p = Part(vname, seed=hash(vname) % 1000)
        fn(p)
        o = p.to_object([mats[3]], parent=rig)
        o.name = vname
        mod = o.modifiers.new("Armature", "ARMATURE")
        mod.object = rig
        objs[vname] = o
    clips = _clips(rig)
    rig.animation_data.action = None
    _apply(rig, {})
    body = objs[f"{name}_body"]

    def renders(_root, rdir):
        if sheet:
            return sheet(rig, objs, mats, clips, rdir)
        return [render.render_preview(list(objs.values()), f"{rdir}/{name}.png", size=720, margin=1.3)]

    groups = [[body]] + [[body, o] for k, o in objs.items() if o is not body]
    return r, {"kind": "character", "budget_kib": budget, "animations": True, "uvs": True,
               "renders": renders, "bake": {"distance": 0.16, "strength": 0.55, "samples": 96, "groups": groups}}


def clone_set(rig, objs, show, dx, action=None, palette=None, made=None, frame=None):
    """Copy the rig and chosen meshes for preview renders."""
    scene = bpy.context.scene
    rg = rig.copy()
    rg.data = rig.data
    rg.animation_data_clear()
    scene.collection.objects.link(rg)
    rg.parent = None
    rg.location = (dx, 0, 0)
    out = []
    for k in show:
        src = objs[k]
        o = src.copy()
        o.hide_render = False
        scene.collection.objects.link(o)
        o.parent = rg
        o.matrix_parent_inverse.identity()
        o.location = (0, 0, 0)
        o.modifiers["Armature"].object = rg
        if palette is not None:
            o.material_slots[0].link = "OBJECT"
            o.material_slots[0].material = palette
        out.append(o)
    if action is not None:
        rg.animation_data_create()
        rg.animation_data.action = action
        if hasattr(rg.animation_data, "action_slot") and action.slots:
            rg.animation_data.action_slot = action.slots[0]
        if frame is not None:
            scene.frame_set(frame)
            vals = {pb.name: (tuple(pb.rotation_euler), tuple(pb.location)) for pb in rg.pose.bones}
            rg.animation_data.action = None
            for pb in rg.pose.bones:
                pb.rotation_euler, pb.location = vals[pb.name]
    if made is not None:
        made.extend([rg] + out)
    return out
