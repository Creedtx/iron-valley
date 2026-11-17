"""Crate machine (build 0.16): the level 1 crate line. Footprint 3.4 x 1.5 m.

Left to right (Blender X): infeed roller table -> saw station (circular blade in a steel cabinet, extraction hood,
belt-driven motor) -> nailing station (gantry with a pneumatic nailer) -> outfeed rollers. An air compressor and
a dust cyclone stand behind it; a stack light sits on the gantry.

Moving nodes the game drives:
  blade (spin on local Z in three.js), pulley (spin, Z), plank (slides along X on the infeed),
  roller_0..roller_7 (spin, Z), press_head (moves down on Y while nailing), crate_wip (the crate being nailed),
  crate_out (a finished crate rolling off the outfeed, along X), comp_wheel (compressor flywheel, spin on X),
  comp_piston (bobs on Y), status_lamp (emissive colour = machine state).
Anchors: op_spot, out_spot, issue_anchor, dust_spot (sawdust comes out here), nail_spot (sparks/puffs).
"""
import math

from ivlib.geo import LAMP, METAL, PAINT, Part
from ivlib.scene import anchor, root

FOOT = (3.4, 1.5)
TOP = 0.86          # working height of the line


def hazard_strip(p, x0, x1, y, z, h=0.06, n=8):
    w = (x1 - x0) / n
    for i in range(n):
        p.box((x0 + w * (i + 0.5), y, z), (w, 0.02, h), "yellow" if i % 2 == 0 else "black", seg=0, jitter=0.0)


def legs(p, x0, x1, y0, y1, h, col="steel_dark"):
    for x in (x0, x1):
        for y in (y0, y1):
            p.box((x, y, h / 2), (0.07, 0.07, h), col, METAL, seg=0, dirt=0.25)
            p.box((x, y, 0.02), (0.14, 0.14, 0.04), "gunmetal", METAL, seg=0)        # foot plate
    for y in (y0, y1):
        p.box(((x0 + x1) / 2, y, 0.2), (x1 - x0, 0.05, 0.05), col, METAL, seg=0)
    for x in (x0, x1):
        p.box((x, (y0 + y1) / 2, 0.2), (0.05, y1 - y0, 0.05), col, METAL, seg=0)


def crate(p, cx, cy, cz, s=0.42, open_top=False):
    """a small slatted crate, centred at (cx, cy) with its base at cz"""
    for k in range(3):                                      # side slats
        z = cz + 0.06 + k * 0.13
        for sy in (-1, 1):
            p.box((cx, cy + sy * s / 2, z), (s, 0.025, 0.1), "wood", bevel=0.004, seg=0, jitter=0.06)
        for sx in (-1, 1):
            p.box((cx + sx * s / 2, cy, z), (0.025, s, 0.1), "wood", bevel=0.004, seg=0, jitter=0.06)
    for sx in (-1, 1):                                      # corner posts
        for sy in (-1, 1):
            p.box((cx + sx * s / 2, cy + sy * s / 2, cz + 0.2), (0.045, 0.045, 0.4), "wood_dark", seg=0)
    p.box((cx, cy, cz + 0.015), (s, s, 0.03), "wood_dark", seg=0)
    if not open_top:
        for k in range(3):
            p.box((cx, cy - s / 3 + k * s / 3, cz + 0.41), (s + 0.03, 0.11, 0.025), "wood", bevel=0.004, seg=0, jitter=0.06)


def build(mats):
    r = root("saw_bench")
    b = Part("saw_bench_body", seed=11)
    sd, gm, st = "steel_dark", "gunmetal", "steel"

    # ---- infeed roller table (x -1.7 .. -0.62) ---------------------------------------------------------------
    legs(b, -1.64, -0.7, -0.36, 0.36, TOP - 0.06)
    for sy in (-1, 1):
        b.box((-1.17, sy * 0.4, TOP - 0.05), (1.1, 0.06, 0.1), "olive", METAL, bevel=0.01, dirt=0.2)   # side rails
    b.box((-1.17, 0.42, TOP + 0.07), (1.1, 0.04, 0.12), st, METAL, seg=0)                            # fence
    # ---- saw station (x -0.62 .. 0.32) ------------------------------------------------------------------------
    b.box((-0.15, 0, 0.42), (0.92, 0.9, 0.78), "olive", METAL, bevel=0.025, seg=0.6, dirt=0.3)       # cabinet
    b.box((-0.15, -0.455, 0.42), (0.74, 0.02, 0.6), "olive_dark", METAL, seg=0)                       # door
    for z in (0.22, 0.62):
        b.box((-0.48, -0.47, z), (0.04, 0.03, 0.08), gm, METAL, seg=0)                                # hinges
    b.box((0.12, -0.47, 0.44), (0.03, 0.03, 0.14), "chrome", METAL, seg=0)                            # handle
    for k in range(5):                                                                               # vents
        b.box((-0.15, -0.463, 0.16 + k * 0.035), (0.4, 0.008, 0.016), "black", seg=0, jitter=0)
    b.box((-0.15, 0, TOP - 0.02), (1.0, 1.0, 0.05), "steel", METAL, bevel=0.01, seg=0.5)             # cast table
    b.box((-0.15, 0, TOP + 0.006), (0.05, 0.7, 0.004), "black", seg=0)                                # blade slot
    hazard_strip(b, -0.65, 0.35, -0.51, TOP - 0.03, n=10)
    # warning plate on the cabinet
    b.box((-0.2, -0.468, 0.68), (0.24, 0.006, 0.12), "yellow", seg=0)
    b.prism([(-0.25, 0.64), (-0.15, 0.64), (-0.2, 0.72)], 0.004, "black", plane="XZ", offset=-0.472)
    # the saw's heavy cast housing (the concept's chunky olive machine), a duct from its top to the cyclone
    b.box((-0.15, 0.0, TOP + 0.34), (1.0, 0.95, 0.62), "olive", METAL, bevel=0.06, seg=0.8, dirt=0.35)
    b.box((-0.15, 0.0, TOP + 0.68), (0.86, 0.8, 0.08), "olive_dark", METAL, bevel=0.03)
    b.box((-0.15, -0.49, TOP + 0.2), (0.7, 0.02, 0.14), "#2c2f33", seg=0)                               # feed throat
    for k in range(4):
        b.box((0.18, -0.48, TOP + 0.36 + k * 0.06), (0.24, 0.01, 0.025), "#2c2f33", seg=0, jitter=0)       # vents
    for x in (-0.6, 0.3):
        for z in (TOP + 0.1, TOP + 0.6):
            b.cyl((x, -0.48, z), 0.02, 0.012, "gunmetal", METAL, axis="Y", segs=6)                          # rivets
    b.box((-0.4, -0.485, TOP + 0.48), (0.3, 0.01, 0.16), "#d8cfb8", seg=0)                               # maker's plate
    b.cyl((-0.15, 0.2, TOP + 0.85), 0.07, 0.3, "#5d636b", METAL, segs=10)
    b.beam((-0.15, 0.2, TOP + 1.0), (-0.6, 0.62, 1.95), 0.12, "#5d636b", METAL)
    # motor under the table at the back, belt cover
    b.cyl((-0.2, 0.62, 0.42), 0.17, 0.42, "olive_dark", METAL, axis="X", segs=16)
    for k in range(-3, 4):
        b.cyl((-0.2 + k * 0.05, 0.62, 0.42), 0.185, 0.015, sd, METAL, axis="X", segs=16, smooth=False)
    b.box((-0.2, 0.62, 0.22), (0.4, 0.3, 0.06), gm, METAL, seg=0)
    b.box((0.08, 0.6, 0.6), (0.06, 0.36, 0.5), "yellow_deep", bevel=0.01)                             # belt guard
    # ---- nailing station (x 0.34 .. 1.22): jig table and a gantry with the nailer --------------------------------
    legs(b, 0.4, 1.16, -0.42, 0.42, TOP - 0.06)
    b.box((0.78, 0, TOP - 0.03), (0.86, 0.9, 0.05), "olive", METAL, bevel=0.01)
    for sy in (-1, 1):
        b.box((0.78, sy * 0.3, TOP + 0.02), (0.7, 0.04, 0.05), "#c23b2a", seg=0)                        # jig stops
    for sx in (0.42, 1.14):                                                                          # gantry
        b.box((sx, 0.38, 1.25), (0.09, 0.09, 1.25), "olive_dark", METAL, bevel=0.01, dirt=0.15)
        b.box((sx, 0.38, 0.03), (0.2, 0.2, 0.06), gm, METAL, seg=0)
    b.box((0.78, 0.38, 1.9), (0.86, 0.12, 0.14), "olive_dark", METAL, bevel=0.012)
    b.box((0.78, 0.18, 1.86), (0.2, 0.32, 0.1), "olive_dark", METAL, seg=0)                               # nailer arm
    b.cyl((0.78, 0.04, 1.64), 0.075, 0.36, "chrome", METAL, segs=14)                                  # air cylinder
    b.cyl((0.78, 0.04, 1.84), 0.09, 0.05, gm, METAL, segs=14)
    b.cyl((0.78, 0.04, 1.45), 0.09, 0.04, gm, METAL, segs=14)
    b.box((0.78, 0.38, 2.08), (0.98, 0.3, 0.24), "olive", METAL, bevel=0.03, dirt=0.3)            # nailer cowl
    for x in (0.4, 0.78, 1.16):
        b.cyl((x, 0.22, 2.08), 0.018, 0.01, gm, METAL, axis="Y", segs=6)                               # rivets
    b.box((-0.15, 0.32, 0.42), (0.96, 0.3, 0.8), "olive_dark", METAL, bevel=0.02, dirt=0.3)            # motor housing
    # ---- outfeed rollers (x 1.22 .. 1.7), sloping down a touch -------------------------------------------------
    legs(b, 1.26, 1.66, -0.32, 0.32, TOP - 0.1)
    for sy in (-1, 1):
        b.box((1.46, sy * 0.36, TOP - 0.09), (0.5, 0.05, 0.08), "olive", METAL, seg=0)
    b.box((1.7, 0, TOP - 0.02), (0.04, 0.6, 0.1), "#c23b2a", seg=0)                                   # end stop
    # ---- control pedestal at the operator's place ------------------------------------------------------------------
    b.box((-0.75, -0.7, 0.55), (0.06, 0.06, 1.1), sd, METAL, seg=0)
    b.box((-0.75, -0.74, 1.12), (0.32, 0.12, 0.24), "cream", bevel=0.012, rot=(-25, 0, 0))
    b.cyl((-0.83, -0.81, 1.15), 0.035, 0.03, "red", axis="Y", segs=10, rot=(-25, 0, 0))               # e-stop
    b.cyl((-0.83, -0.81, 1.15), 0.05, 0.012, "yellow", axis="Y", segs=12, rot=(-25, 0, 0))
    b.cyl((-0.7, -0.8, 1.17), 0.02, 0.02, "#33cc55", axis="Y", segs=8, rot=(-25, 0, 0))
    b.cyl((-0.64, -0.8, 1.17), 0.02, 0.02, "black", axis="Y", segs=8, rot=(-25, 0, 0))
    b.box((-0.67, -0.79, 1.06), (0.12, 0.01, 0.05), "black", seg=0, rot=(-25, 0, 0))                  # meter
    # cable from the pedestal into the cabinet
    b.beam((-0.75, -0.66, 0.05), (-0.6, -0.3, 0.05), 0.03, "black", METAL)
    # ---- behind the line: compressor and dust cyclone ------------------------------------------------------------
    b.cyl((1.2, 0.86, 0.28), 0.2, 0.75, "red", METAL, axis="X", segs=16, dirt=0.25)                   # air tank
    for x in (0.95, 1.45):
        b.box((x, 0.86, 0.06), (0.06, 0.32, 0.12), sd, METAL, seg=0)
    b.box((1.2, 0.86, 0.56), (0.4, 0.3, 0.18), gm, METAL, bevel=0.01)                                 # pump block
    b.cyl((1.15, 0.86, 0.72), 0.06, 0.16, st, METAL, segs=10)                                         # cylinder
    b.cyl((1.4, 0.98, 0.5), 0.06, 0.06, "paper", axis="Y", segs=12)                                   # gauge
    b.beam((1.0, 0.86, 0.56), (0.9, 0.5, 1.2), 0.025, "black", METAL)                                 # air hose
    b.beam((0.9, 0.5, 1.2), (0.78, 0.2, 1.75), 0.025, "black", METAL)
    # dust cyclone (x -0.75, y 0.75): cone on legs, bag underneath
    cx, cy = -0.72, 0.78
    for a in range(3):
        ang = a / 3 * math.tau
        b.beam((cx + math.cos(ang) * 0.24, cy + math.sin(ang) * 0.24, 0), (cx + math.cos(ang) * 0.18, cy + math.sin(ang) * 0.18, 1.3), 0.04, sd)
    b.cyl((cx, cy, 1.75), 0.24, 0.5, "#9aa1a8", METAL, segs=16)
    b.cyl((cx, cy, 1.36), 0.24, 0.3, "#9aa1a8", METAL, segs=16, radius2=0.07)
    b.cyl((cx, cy, 2.03), 0.08, 0.1, gm, METAL, segs=10)
    b.dome((cx, cy, 0.0), 0.26, "#d8cfb8", segs=(12, 4), scale=(1, 1, 2.4), jitter=0.04)               # dust bag
    b.cyl((cx, cy, 1.12), 0.07, 0.4, "#d8cfb8", segs=10)
    # stack light on the gantry's back post
    b.cyl((1.14, 0.38, 2.0), 0.02, 0.16, sd, METAL, segs=6)
    b.cyl((1.14, 0.38, 2.1), 0.075, 0.05, gm, METAL, segs=12)                                        # beacon base
    # sawdust on the ground under the saw, offcuts in a bin
    b.dome((-0.2, -0.62, 0.0), 0.3, "#b48a55", segs=(9, 3), scale=(1.5, 0.8, 0.18), jitter=0.06)
    b.box((-1.45, 0.78, 0.22), (0.4, 0.34, 0.44), "olive_dark", bevel=0.01, dirt=0.3)
    for k in range(4):
        b.box((-1.5 + k * 0.06, 0.78 + (k % 2) * 0.06 - 0.03, 0.47 + k * 0.01), (0.06, 0.06, 0.3), "wood", rot=(12 * (k - 1.5), 8, 0), seg=0)
    b.to_object(mats, parent=r)

    # ---- moving parts -------------------------------------------------------------------------------------------------
    blade = Part("blade", seed=12)
    blade.gear((0, 0, 0), 0.3, 28, 0.035, 0.012, "chrome", METAL, axis="Y")
    blade.cyl((0, 0, 0), 0.05, 0.04, "#c23b2a", METAL, axis="Y", segs=10)
    blade.to_object(mats, parent=r).location = (-0.15, 0, TOP - 0.06)

    pul = Part("pulley", seed=15)
    pul.cyl((0, 0, 0), 0.2, 0.06, gm, METAL, axis="Y", segs=16)
    for k in range(3):
        a = k / 3 * math.tau
        pul.box((math.cos(a) * 0.1, 0, math.sin(a) * 0.1), (0.05, 0.08, 0.05), "yellow", seg=0)
    pul.to_object(mats, parent=r).location = (0.38, -0.5, TOP + 0.36)

    for i in range(8):                                     # 6 infeed rollers, 2 outfeed
        x = -1.6 + i * 0.17 if i < 6 else 1.34 + (i - 6) * 0.22
        z = TOP - 0.02 if i < 6 else TOP - 0.07
        ro = Part(f"roller_{i}", seed=30 + i)
        ro.cyl((0, 0, 0), 0.04, 0.74 if i < 6 else 0.6, "chrome", METAL, axis="Y", segs=10)
        for sy in (-1, 1):
            ro.box((0.025, sy * 0.2, 0), (0.012, 0.02, 0.012), "black", seg=0, jitter=0)   # marks, so the spin reads
        ro.to_object(mats, parent=r).location = (x, 0, z)

    plank = Part("plank", seed=13)
    plank.box((0, 0, 0), (0.9, 0.34, 0.045), "wood", bevel=0.006, seg=0.5)
    plank.box((0.2, 0.0, 0.024), (0.08, 0.3, 0.002), "wood_dark", seg=0)
    plank.to_object(mats, parent=r).location = (-1.2, 0, TOP + 0.045)

    ph = Part("press_head", seed=16)
    ph.cyl((0, 0, 0.12), 0.025, 0.28, "chrome", METAL, segs=8)
    ph.box((0, 0, -0.04), (0.16, 0.12, 0.1), "#2c2f33", METAL, bevel=0.01)
    ph.box((0, -0.065, -0.04), (0.1, 0.01, 0.05), "yellow", seg=0)
    ph.box((0, 0, -0.1), (0.04, 0.04, 0.04), "chrome", METAL, seg=0)
    ph.to_object(mats, parent=r).location = (0.78, 0.04, 1.28)

    wip = Part("crate_wip", seed=17)
    crate(wip, 0, 0, 0, s=0.46, open_top=True)
    wip.to_object(mats, parent=r).location = (0.78, 0, TOP)

    out = Part("crate_out", seed=18)
    crate(out, 0, 0, 0, s=0.42)
    out.to_object(mats, parent=r).location = (1.4, 0, TOP - 0.05)

    cw = Part("comp_wheel", seed=19)
    cw.cyl((0, 0, 0), 0.13, 0.03, gm, METAL, axis="X", segs=14)
    for k in range(4):
        a = k / 4 * math.tau
        cw.box((0.0, math.cos(a) * 0.07, math.sin(a) * 0.07), (0.035, 0.03, 0.03), "red", seg=0)
    cw.to_object(mats, parent=r).location = (1.43, 0.86, 0.62)

    cp = Part("comp_piston", seed=20)
    cp.cyl((0, 0, 0), 0.045, 0.08, "chrome", METAL, segs=10)
    cp.box((0, 0, 0.05), (0.12, 0.12, 0.03), gm, METAL, seg=0)
    cp.to_object(mats, parent=r).location = (1.15, 0.86, 0.84)

    lamp = Part("status_lamp", seed=14)
    lamp.dome((0, 0, 0), 0.07, "lamp", LAMP, segs=(12, 4), scale=(1, 1, 1.5))
    lamp.to_object(mats, parent=r).location = (1.14, 0.38, 2.13)

    anchor("op_spot", (-0.35, -1.12, 0), r)       # where the operator stands
    anchor("out_spot", (1.55, -1.6, 0), r)        # finished-goods pallet centre
    anchor("issue_anchor", (0.2, 0, 2.5), r)      # badge position for breakdowns
    anchor("dust_spot", (-0.15, -0.3, TOP + 0.15), r)
    anchor("nail_spot", (0.78, -0.1, TOP + 0.3), r)
    return r, {"kind": "machine", "budget_kib": 260}
