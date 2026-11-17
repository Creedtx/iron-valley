"""Level 4 "Growing Enterprise" kit, loaded only when the player reaches level 4.

Roots (each at the origin in the GLB):
  l4_forklift   yellow counterbalance forklift, 2.3 m long with the forks, 1.1 m wide; forks point along +X.
                Moving node 'forks' (carriage, backrest and tines) slides up local Y in three.js. Anchor
                'seat_spot' is where the driver sits, 'load_spot' the middle of the tines.
  l4_stall      Rusty Pike's stall by the gate: a trestle table under a striped awning with boxes of spare
                parts, 1.8 x 0.9 m, front (the customer side) at Blender -Y
  l4_porch      office porch: plank deck 3.2 x 1.5 m, two posts, a corrugated lean-to roof and a step,
                front at Blender -Y, the back edge (y +0.75) meets the office wall
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

SPACING = 3.2
SD = "steel_dark"


def forklift(p, rt, mats):
    yl, bk = "yellow", "black"
    # chassis and counterweight
    p.box((-0.05, 0, 0.42), (1.3, 1.0, 0.42), yl, bevel=0.04, dirt=0.25)
    p.box((-0.78, 0, 0.55), (0.34, 1.04, 0.66), "#2c2f33", METAL, bevel=0.06, dirt=0.3)
    p.box((-0.05, 0, 0.66), (1.0, 0.9, 0.08), SD, METAL, seg=0)                      # floor plate
    for x, y in ((0.42, 0.52), (0.42, -0.52), (-0.5, 0.52), (-0.5, -0.52)):          # wheels
        r = 0.24 if x > 0 else 0.2
        p.cyl((x, y, r), r, 0.2, bk, axis="Y", segs=16)
        p.cyl((x, y + (0.101 if y > 0 else -0.101), r), r * 0.5, 0.01, "steel", METAL, axis="Y", segs=10, smooth=False)
    # seat, wheel, levers
    p.box((-0.3, 0, 0.86), (0.36, 0.44, 0.14), bk, bevel=0.03)
    p.box((-0.45, 0, 1.08), (0.08, 0.44, 0.4), bk, bevel=0.03)
    p.cyl((0.2, 0, 1.0), 0.02, 0.36, SD, METAL, rot=(0, -30, 0), segs=6)
    p.cyl((0.28, 0, 1.15), 0.12, 0.025, bk, rot=(0, -30, 0), segs=14)
    for y in (-0.08, 0.0, 0.08):
        p.cyl((0.32, y + 0.25, 0.92), 0.012, 0.22, SD, METAL, segs=6)
        p.sphere((0.32, y + 0.25, 1.03), 0.025, "red", segs=(6, 4))
    # overhead guard
    for x in (-0.55, 0.38):
        for y in (-0.42, 0.42):
            p.box((x, y, 1.42), (0.05, 0.05, 1.0), bk, METAL, seg=0, rot=(0, 6 if x > 0 else 0, 0))
    p.box((-0.08, 0, 1.94), (1.0, 0.9, 0.05), bk, METAL, seg=0)
    for x in (-0.4, -0.2, 0.0, 0.2):
        p.box((x, 0, 1.97), (0.04, 0.86, 0.03), "#3a3d41", METAL, seg=0, jitter=0)
    p.cyl((-0.5, -0.36, 2.04), 0.05, 0.1, "#ff9a1f", LAMP, segs=10)                 # beacon
    p.box((0.62, 0, 0.5), (0.04, 0.5, 0.05), yl, seg=0)                              # front lights bar
    for y in (-0.3, 0.3):
        p.cyl((0.65, y, 0.52), 0.04, 0.03, "lamp", LAMP, axis="X", segs=10)
    # mast: two channels and a cross head
    for y in (-0.3, 0.3):
        p.box((0.7, y, 1.08), (0.08, 0.1, 2.0), SD, METAL, seg=0)
    p.box((0.7, 0, 2.06), (0.1, 0.7, 0.08), SD, METAL, seg=0)
    p.cyl((0.74, 0, 1.2), 0.03, 1.6, "chrome", METAL, segs=8)                         # lift ram
    p.to_object(mats, parent=rt)

    fk = Part("forks", seed=811)
    fk.box((0.05, 0, 0.38), (0.06, 0.78, 0.62), SD, METAL, seg=0)                     # backrest
    for z in (0.18, 0.4, 0.62):
        fk.box((0.06, 0, z), (0.07, 0.8, 0.04), "#3a3d41", METAL, seg=0, jitter=0)
    for y in (-0.22, 0.22):
        fk.box((0.5, y, 0.03), (0.9, 0.12, 0.05), "steel", METAL, seg=0, bevel=0.01)
        fk.box((0.08, y, 0.25), (0.06, 0.12, 0.44), "steel", METAL, seg=0)
    fk.to_object(mats, parent=rt).location = (0.76, 0, 0.06)
    anchor("seat_spot", (-0.3, 0, 0.62), rt)
    anchor("load_spot", (1.26, 0, 0.2), rt)


def stall(p, rt, mats):
    # trestle table
    p.box((0, 0, 0.78), (1.8, 0.8, 0.05), "wood", bevel=0.01)
    for x in (-0.75, 0.75):
        for y in (-0.3, 0.3):
            p.box((x, y, 0.39), (0.06, 0.06, 0.78), "wood_dark", seg=0)
    # awning poles and the striped canopy, sloping to the front
    for x in (-0.86, 0.86):
        p.box((x, 0.38, 1.1), (0.05, 0.05, 2.2), "wood_dark", seg=0)
        p.box((x, -0.42, 0.95), (0.05, 0.05, 1.9), "wood_dark", seg=0)
    for k in range(8):
        x = -0.9 + 0.225 * (k + 0.5)
        p.box((x, -0.02, 2.0), (0.225, 1.0, 0.03), "red" if k % 2 == 0 else "cream", rot=(-14, 0, 0), seg=0, jitter=0)
    for k in range(8):   # scalloped valance at the front
        x = -0.9 + 0.225 * (k + 0.5)
        p.box((x, -0.5, 1.82), (0.2, 0.02, 0.12), "red" if k % 2 == 0 else "cream", seg=0, jitter=0)
    # boxes of parts, a bin of bolts and a hand-written board
    for k, (x, col) in enumerate(((-0.6, "#b88a52"), (-0.2, "#a8794a"), (0.25, "#b88a52"))):
        p.box((x, 0.05, 0.92), (0.32, 0.28, 0.22), col, seg=0)
        p.cyl((x, -0.09, 0.95), 0.05, 0.004, "#2f5d8a", axis="Y", segs=8, smooth=False)
    p.cyl((0.62, 0.0, 0.88), 0.14, 0.16, SD, METAL, segs=12)
    for k in range(6):
        a = k * 1.05
        p.cyl((0.62 + 0.07 * math.cos(a), 0.07 * math.sin(a), 0.97), 0.025, 0.03, "steel", METAL, segs=6)
    p.box((0, 0.36, 1.45), (1.1, 0.03, 0.42), "cream", seg=0, jitter=0)                # price board
    p.box((0, 0.345, 1.58), (0.8, 0.005, 0.06), "red", seg=0, jitter=0)
    for k in range(3):
        p.box((-0.2 + k * 0.2, 0.345, 1.42 - k * 0.0), (0.12, 0.005, 0.03), "#2c2621", seg=0, jitter=0)
    p.to_object(mats, parent=rt)
    anchor("keeper_spot", (0, 0.75, 0), rt)


def porch(p, rt, mats):
    # deck on short piers, planks across
    p.box((0, 0, 0.16), (3.2, 1.5, 0.08), "wood", bevel=0.01, dirt=0.25)
    for k in range(12):
        p.box((-1.6 + 3.2 / 12 * (k + 0.5), 0, 0.205), (0.012, 1.48, 0.006), "wood_dark", seg=0, jitter=0)
    for x in (-1.5, 0, 1.5):
        p.box((x, -0.6, 0.06), (0.12, 0.12, 0.12), "concrete", seg=0)
    p.box((0, -0.92, 0.07), (1.2, 0.34, 0.08), "wood", seg=0)                           # step
    # posts and a lean-to roof of corrugated steel
    for x in (-1.5, 1.5):
        p.box((x, -0.66, 1.3), (0.1, 0.1, 2.2), "wood_dark", seg=0)
    p.box((0, -0.66, 2.38), (3.3, 0.1, 0.1), "wood_dark", seg=0)
    p.box((0, -0.05, 2.5), (3.5, 1.7, 0.04), "#7d8a94", METAL, rot=(-9, 0, 0), seg=0, dirt=0.3)
    for k in range(14):
        p.box((-1.7 + 3.4 / 14 * (k + 0.5), -0.05, 2.53), (0.02, 1.68, 0.02), "#9aa5ad", METAL, rot=(-9, 0, 0), seg=0, jitter=0)
    # railing at the sides and a bench by the door
    for x in (-1.55, 1.55):
        p.box((x, 0.0, 0.62), (0.05, 1.3, 0.05), "wood_dark", seg=0)
        p.box((x, 0.0, 0.42), (0.04, 1.3, 0.04), "wood_dark", seg=0)
    p.box((-0.9, 0.5, 0.45), (1.0, 0.36, 0.06), "wood", seg=0)
    for x in (-1.3, -0.5):
        p.box((x, 0.5, 0.31), (0.06, 0.3, 0.24), "wood_dark", seg=0)
    p.to_object(mats, parent=rt)


ITEMS = {"l4_forklift": forklift, "l4_stall": stall, "l4_porch": porch}


def build(mats):
    container = root("level4")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = (i * SPACING * 1.4, 0, 0)
        p = Part(name + "_mesh", seed=800 + i)
        fn(p, rt, mats)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 110, "before_export": before_export,
                       "bake": {"distance": 0.3, "samples": 48}}
