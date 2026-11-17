"""Worker: one body in work overalls plus optional parts, all on the shared rig.

Optional skinned meshes the game shows per person:
  hat_hard, hat_cap, hair_short, hair_pony, beard, stache,
  vest, toolbelt, clipboard, wrench, earmuffs (role gear)
Colours come from the 16x1 palette texture, so roles (operator, loader,
mechanic, supervisor) and looks (skin, hair, shirt) are texture swaps.
"""
from ivlib import render
from ivlib.palette import ROLES

from assets import character as C
from assets.character import S, W, WHITE


def body(p):
    C.legs(p)
    # pelvis and belt
    p.sphere((0, 0, 0.47), 0.135, WHITE, segs=(10, 6), scale=(1.12, 0.82, 0.62), slot=S["pants"], group="hips", **W)
    p.cyl((0, 0, 0.505), 0.142, 0.035, WHITE, segs=12, slot=S["belt"], group="hips", **W)
    p.box((0, -0.122, 0.505), (0.045, 0.012, 0.035), WHITE, bevel=0.004, seg=0, slot=S["metal"], group="hips", **W)
    # torso: overall trousers to the chest, shirt above
    p.cyl((0, 0, 0.58), 0.142, 0.12, WHITE, segs=12, radius2=0.15, slot=S["suit"], group="spine", **W)
    p.sphere((0, 0, 0.69), 0.165, WHITE, segs=(12, 8), scale=(1.0, 0.75, 0.72), slot=S["shirt"], group="spine", **W)
    p.box((0, -0.105, 0.635), (0.17, 0.035, 0.15), WHITE, bevel=0.018, seg=0, slot=S["suit"], group="spine", **W)  # bib
    p.box((0, -0.124, 0.65), (0.07, 0.008, 0.05), WHITE, bevel=0.004, seg=0, slot=S["suit"], group="spine", **W)  # pocket
    for x in (-1, 1):
        p.box((x * 0.068, -0.1, 0.735), (0.032, 0.03, 0.09), WHITE, bevel=0.006, seg=0, rot=(-12, 0, 0),
              slot=S["suit"], group="spine", **W)
        p.sphere((x * 0.068, -0.122, 0.705), 0.011, WHITE, segs=(6, 4), slot=S["metal"], group="spine", **W)
        p.box((x * 0.068, 0.095, 0.71), (0.032, 0.03, 0.12), WHITE, bevel=0.006, seg=0, slot=S["suit"], group="spine", **W)
    p.box((0, -0.11, 0.785), (0.08, 0.04, 0.03), WHITE, bevel=0.01, seg=0, slot=S["shirt"], group="spine", **W)  # collar
    C.arms(p)
    C.head(p)


def hat_hard(p):
    H = dict(group="head", **W)
    p.dome((0, 0.0, 1.05), 0.182, WHITE, segs=(14, 4), scale=(1.0, 1.06, 0.82), slot=S["hat"], **H)
    p.cyl((0, -0.02, 1.05), 0.205, 0.022, WHITE, segs=16, slot=S["hat"], smooth=False, **H)
    p.box((0, 0.0, 1.2), (0.032, 0.16, 0.03), WHITE, bevel=0.012, seg=0, slot=S["hat"], **H)
    p.box((0, -0.183, 1.11), (0.07, 0.01, 0.04), WHITE, bevel=0.004, seg=0, slot=S["metal"], **H)  # badge


def hat_cap(p):
    H = dict(group="head", **W)
    p.dome((0, 0.01, 1.045), 0.18, WHITE, segs=(14, 4), scale=(1.02, 1.04, 0.76), slot=S["hat"], **H)
    p.box((0, -0.2, 1.05), (0.2, 0.12, 0.018), WHITE, bevel=0.008, seg=0, rot=(-8, 0, 0), slot=S["hat"], **H)
    p.sphere((0, 0.01, 1.18), 0.016, WHITE, segs=(6, 4), slot=S["hat"], **H)


def hair_short(p):
    C.hair_short(p)


def hair_pony(p):
    C.hair_short(p)
    H = dict(group="head", **W)
    p.sphere((0, 0.17, 1.02), 0.06, WHITE, segs=(10, 7), slot=S["hair"], **H)
    p.sphere((0, 0.205, 0.93), 0.055, WHITE, segs=(10, 7), scale=(0.85, 0.85, 1.6), slot=S["hair"], **H)
    p.cyl((0, 0.185, 1.0), 0.03, 0.03, WHITE, segs=8, rot=(30, 0, 0), slot=S["spare1"], **H)  # hair tie
    p.box((0, -0.14, 1.095), (0.24, 0.05, 0.05), WHITE, bevel=0.02, seg=0, rot=(-25, 0, 0), slot=S["hair"], **H)  # fringe


def beard(p):
    H = dict(group="head", **W)
    p.sphere((0, -0.065, 0.885), 0.128, WHITE, segs=(10, 7), scale=(1.05, 0.85, 0.75), slot=S["stache"], **H)
    p.box((0, -0.16, 0.912), (0.11, 0.03, 0.03), WHITE, bevel=0.012, seg=0, slot=S["stache"], **H)


def stache(p):
    H = dict(group="head", **W)
    for x in (-1, 1):
        p.box((x * 0.04, -0.16, 0.915), (0.07, 0.03, 0.03), WHITE, bevel=0.012, seg=0, rot=(0, x * 12, 0),
              slot=S["stache"], **H)


VARIANTS = {"hat_hard": hat_hard, "hat_cap": hat_cap, "hair_short": hair_short, "hair_pony": hair_pony,
            "beard": beard, "stache": stache, "vest": C.vest, "toolbelt": C.toolbelt, "clipboard": C.clipboard,
            "wrench": C.wrench, "earmuffs": C.earmuffs}

# looks used by the preview sheet (and as examples for the game)
LOOKS = [
    ("operator", ["hat_hard", "earmuffs", "stache"], {}),
    ("loader", ["hat_cap", "hair_short", "beard", "vest"], {"skin": "#9b6a43", "hair": "#1a1a1a", "stache": "#1a1a1a"}),
    ("electrician", ["hat_hard", "hair_pony", "toolbelt"], {"skin": "#f1c9a5", "hair": "#a8522a"}),
    ("mechanic", ["hat_cap", "hair_short", "toolbelt", "wrench"], {"skin": "#c68c5f", "hair": "#2a1f19"}),
    ("supervisor", ["hat_hard", "hair_short", "vest", "clipboard"], {"skin": "#e0ac85", "hair": "#b8b2a6", "stache": "#b8b2a6"}),
]


def sheet(rig, objs, mats, clips, rdir):
    made, out, shown = [], [], []
    idle = next(c for c in clips if c.name == "idle")
    for o in objs.values():
        o.hide_render = True
    for i, (role, parts, cols) in enumerate(LOOKS):
        m = mats[3].copy()
        m.node_tree.nodes["Image Texture"].image = C.palette_image(dict(ROLES[role], **cols), f"pal_{role}")
        shown += C.clone_set(rig, objs, ["worker_body"] + parts, (i - 2) * 0.5, idle, m, made, frame=30)
    out.append(render.render_preview(shown, f"{rdir}/worker_roles.png", size=900, margin=1.05))
    for o in made:
        bpy_remove(o)
    made, shown = [], []
    frames = {"idle": 30, "walk": 5, "carry": 5, "work": 5, "fix": 4, "sit": 22, "cheer": 13, "inspect": 10, "point": 9, "phone": 30}
    for i, c in enumerate(clips):
        shown += C.clone_set(rig, objs, ["worker_body", "hat_hard", "clipboard"], (i - 4.5) * 0.55, c, None, made, frame=frames[c.name])
    out.append(render.render_preview(shown, f"{rdir}/worker_clips.png", size=1200, margin=1.02))
    for o in made:
        bpy_remove(o)
    for o in objs.values():
        o.hide_render = False
    return out


def bpy_remove(o):
    import bpy
    bpy.data.objects.remove(o, do_unlink=True)


def palette_image():
    return C.palette_image(None, "worker_palette")


def build(mats):
    return C.build_character(mats, "worker", body, VARIANTS, sheet=sheet, budget=200)
