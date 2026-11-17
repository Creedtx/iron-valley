"""Level 2 "Reopened Factory" kit, loaded only when the player reaches level 2.

Roots (each at the origin in the GLB, like env.glb):
  l2_coil         steel strip coil standing on its rim, eye along Y (Blender) = Z (three.js)
  l2_coil_bay     stock-room cradle for 6 coils in a row along X, saddles every 0.75 m
  l2_pipe_rack    finished-pipe rack: two A-frames with three tiers of arms, pipes lie along X
  l2_scaffold     contractor's build site: scaffold frame, barrier tape posts, a sign
  l2_gen_mk2      Generator Mk II: a bigger enclosed genset that replaces Mk I in place
                  named node: gen2_fan (rotate local Y), gen2_lamp (status lamp material)
  l2_cable_reel   small prop for the new pipe-mill circuit
  l2_warehouse    finished-goods store for the back yard: 5.2 x 3.2 m open-front steel shed (cutaway: roof rim only), pallet
                  racking on the left (crates: 4 across, 2 deep, shelves at 0.12, 1.0, 1.9 m) and cantilever
                  arms on the right (pipes along X, 6 per tier, tiers at 0.3 and 0.95 m)
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import root

SPACING = 2.6
SD = "steel_dark"


def coil(p):
    # outer wrap, inner eye, edge bands and two strapping bands
    p.cyl((0, 0, 0.32), 0.32, 0.3, "steel", METAL, axis="Y", segs=20)
    for y in (-0.151, 0.151):
        p.cyl((0, y, 0.32), 0.3, 0.004, "#8d949b", METAL, axis="Y", segs=20, smooth=False)
        p.cyl((0, y * 1.01, 0.32), 0.12, 0.006, "black", axis="Y", segs=14, smooth=False)
    for a in (0.0, math.pi / 2):
        p.box((0, 0, 0.32), (0.66 * abs(math.cos(a)) + 0.03, 0.035, 0.66 * abs(math.sin(a)) + 0.03), "#2f5d8a", seg=0, jitter=0)


def coil_bay(p):
    # 4.5 m base rail with six V saddles
    for y in (-0.28, 0.28):
        p.box((0, y, 0.05), (4.5, 0.1, 0.1), "#2f5d8a", METAL, seg=1.0)
    for k in range(6):
        x = -1.875 + k * 0.75
        for s in (-1, 1):
            p.box((x, s * 0.16, 0.13), (0.42, 0.08, 0.1), "yellow", METAL, seg=0, rot=(s * 28, 0, 0))
    for x in (-2.25, 2.25):
        p.box((x, 0, 0.35), (0.08, 0.66, 0.7), "#2f5d8a", METAL, seg=0)
    p.box((0, -0.36, 0.55), (4.5, 0.03, 0.06), "yellow", METAL, seg=0)
    p.box((-2.25, -0.36, 0.95), (0.6, 0.02, 0.3), "cream", seg=0)  # bay label board
    p.box((-2.25, -0.372, 0.95), (0.44, 0.01, 0.08), "#2f5d8a", seg=0, jitter=0)


def pipe_rack(p):
    for x in (-0.75, 0.75):
        for y in (-0.3, 0.3):
            p.box((x, y, 0.7), (0.08, 0.08, 1.4), "#c23b2a", METAL, seg=0, rot=(-y * 30, 0, 0))
        p.box((x, 0, 0.04), (0.12, 1.0, 0.08), "#c23b2a", METAL, seg=0)
        for z in (0.35, 0.75, 1.15):
            for y in (-1, 1):
                p.box((x, y * 0.36, z), (0.07, 0.42, 0.05), SD, METAL, seg=0)
                p.box((x, y * 0.56, z + 0.05), (0.07, 0.04, 0.1), "yellow", METAL, seg=0)
    p.box((0, 0, 1.4), (1.6, 0.08, 0.08), "#c23b2a", METAL, seg=0)


def scaffold(p):
    for x in (-1.2, 1.2):
        for y in (-0.7, 0.7):
            p.cyl((x, y, 1.1), 0.03, 2.2, "steel", METAL, segs=8)
    for z in (0.1, 1.1, 2.15):
        for y in (-0.7, 0.7):
            p.cyl((0, y, z), 0.025, 2.4, "steel", METAL, axis="X", segs=8)
        for x in (-1.2, 1.2):
            p.cyl((x, 0, z), 0.025, 1.4, "steel", METAL, axis="Y", segs=8)
    p.box((0, 0.7, 1.12), (2.3, 0.3, 0.04), "wood", seg=0)  # plank deck
    for x in (-1.5, 1.5):  # barrier posts and tape
        for y in (-1.0, 1.0):
            p.cyl((x, y, 0.45), 0.035, 0.9, "#d9772b", segs=8)
            p.cyl((x, y, 0.025), 0.12, 0.05, "black", segs=10)
    for y in (-1.0, 1.0):
        p.box((0, y, 0.82), (3.0, 0.01, 0.06), "yellow", seg=0, jitter=0)
    for x in (-1.5, 1.5):
        p.box((x, 0, 0.82), (0.01, 2.0, 0.06), "yellow", seg=0, jitter=0)
    p.box((-1.5, -1.02, 1.3), (0.7, 0.03, 0.45), "cream", seg=0)  # contractor board
    p.box((-1.5, -1.04, 1.38), (0.56, 0.01, 0.1), "#d9772b", seg=0, jitter=0)
    p.cyl((-1.5, -1.0, 0.75), 0.03, 0.7, SD, METAL, segs=8)


def gen_mk2(p):
    # skid, acoustic enclosure with louvres, exhaust, control panel
    p.box((0, 0, 0.08), (2.3, 1.15, 0.16), SD, METAL, seg=1.0)
    p.box((0, 0, 0.75), (2.1, 1.0, 1.18), "#3e6b45", bevel=0.03, seg=1.0, dirt=0.15)
    p.box((0, 0, 1.36), (2.16, 1.06, 0.06), "#2f4f35", bevel=0.01)
    for k in range(7):
        p.box((-0.55 + k * 0.12, -0.505, 0.8), (0.06, 0.02, 0.7), "#2f4f35", seg=0, jitter=0)
    p.box((0.6, -0.51, 0.85), (0.5, 0.02, 0.6), "#2c2f33", seg=0)  # control panel
    p.box((0.6, -0.52, 1.02), (0.36, 0.01, 0.12), "glass", METAL, seg=0, jitter=0)
    p.box((0.6, -0.515, 0.72), (0.2, 0.01, 0.05), "cream", seg=0, jitter=0)
    p.cyl((-0.75, 0.3, 1.65), 0.07, 0.55, SD, METAL, segs=10)
    p.cyl((-0.75, 0.3, 1.94), 0.09, 0.05, "chrome", METAL, segs=10)
    p.box((0, -0.53, 0.3), (1.6, 0.02, 0.05), "yellow", seg=0, jitter=0)
    p.box((-0.6, -0.512, 1.12), (0.5, 0.01, 0.14), "cream", seg=0, jitter=0)  # "MK II" plate
    p.box((-0.6, -0.516, 1.12), (0.34, 0.006, 0.05), "#2f4f35", seg=0, jitter=0)

    fx, fy, fz = 0.35, 0.1, 1.42

    def fan(q):  # drawn in place; the pivot puts the node's origin on the hub
        q.cyl((fx, fy, fz), 0.32, 0.03, SD, METAL, segs=16, smooth=False)
        for k in range(5):
            a = k / 5 * math.tau
            q.box((fx + math.cos(a) * 0.15, fy + math.sin(a) * 0.15, fz + 0.025), (0.24, 0.08, 0.01), "steel", METAL, seg=0,
                  rot=(0, 0, math.degrees(a)))

    def lamp(q):
        q.cyl((0.95, -0.53, 1.22), 0.05, 0.06, "lamp", LAMP, axis="Y", segs=10)

    return {"gen2_fan": (fan, (fx, fy, fz)), "gen2_lamp": (lamp, (0, 0, 0))}


def warehouse(p):
    # slab, back and end walls, sloped roof on posts, open front with a header beam and sign board
    p.box((0, 0, 0.05), (5.4, 3.4, 0.1), "#9c968a", seg=1.0, dirt=0.3)
    p.box((0, 1.6, 1.5), (5.2, 0.1, 3.0), "#c9ced3", METAL, seg=1.0, dirt=0.25)
    for x in (-2.6, 2.6):
        p.box((x, 0, 1.5), (0.1, 3.2, 3.0), "#c9ced3", METAL, seg=1.0, dirt=0.25)
        for y in (-1.55, 0.0):
            p.box((x, y, 1.6), (0.14, 0.14, 3.2), "#2f5d8a", METAL, seg=0)
    for k in range(12):  # corrugation ribs on the back wall
        p.box((-2.4 + k * 0.44, 1.54, 1.5), (0.05, 0.02, 2.9), "#aeb4ba", METAL, seg=0, jitter=0)
    # the game camera looks down into buildings (cutaway, like the factory), so the roof is only a rim and two purlins
    for y in (-1.66, 1.66):
        p.box((0, y, 3.06), (5.4, 0.12, 0.12), "#4a4f55", METAL, seg=0)
    for x in (-2.66, 2.66):
        p.box((x, 0, 3.06), (0.12, 3.4, 0.12), "#4a4f55", METAL, seg=0)
    p.box((0, -1.62, 2.86), (5.3, 0.16, 0.24), "#2f5d8a", METAL, seg=0)     # header beam
    p.box((0, -1.72, 2.86), (2.2, 0.03, 0.3), "cream", seg=0, jitter=0)      # sign board
    p.box((0, -1.62, 0.12), (5.2, 0.05, 0.05), "yellow", seg=0, jitter=0)    # floor edge line
    # crate racking, left half: uprights, beams, decks
    for x in (-2.35, -0.55):
        for y in (-0.35, 1.25):
            p.box((x, y, 1.35), (0.07, 0.07, 2.7), "#e3742a", METAL, seg=0)
    for z in (0.08, 0.95, 1.85):
        for y in (-0.35, 1.25):
            p.box((-1.45, y, z), (1.85, 0.06, 0.08), "#e3742a", METAL, seg=0)
        p.box((-1.45, 0.45, z + 0.04), (1.8, 1.55, 0.03), "wood", seg=0)
    # pipe cantilever, right half: two columns with arms at two tiers
    for x in (0.55, 2.25):
        p.box((x, 1.3, 1.1), (0.12, 0.12, 2.2), SD, METAL, seg=0)
        p.box((x, 1.1, 0.06), (0.14, 0.6, 0.12), SD, METAL, seg=0)
        for z in (0.26, 0.91):
            p.box((x, 0.55, z), (0.08, 1.5, 0.06), SD, METAL, seg=0)
            p.box((x, -0.18, z + 0.06), (0.08, 0.04, 0.1), "yellow", METAL, seg=0)


def cable_reel(p):
    for y in (-0.16, 0.16):
        p.cyl((0, y, 0.3), 0.3, 0.03, "wood", axis="Y", segs=14)
    p.cyl((0, 0, 0.3), 0.16, 0.3, "#c23b2a", axis="Y", segs=14)


ITEMS = {"l2_coil": coil, "l2_coil_bay": coil_bay, "l2_pipe_rack": pipe_rack, "l2_scaffold": scaffold,
         "l2_gen_mk2": gen_mk2, "l2_cable_reel": cable_reel, "l2_warehouse": warehouse}


def build(mats):
    container = root("level2")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 3) * SPACING * 1.8, -(i // 3) * SPACING * 1.6, 0)
        p = Part(name + "_mesh", seed=400 + i)
        extras = fn(p) or {}
        p.to_object(mats, parent=rt)
        for k, (efn, pivot) in extras.items():
            q = Part(k, seed=950 + i)
            efn(q)
            o = q.to_object(mats, pivot=pivot, parent=rt)
            o.name = k
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 140, "before_export": before_export,
                       "bake": {"distance": 0.35, "samples": 48}}
