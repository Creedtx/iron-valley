"""Staff facilities (level 1): the toilet block in the back yard and the break room's water cooler.

Roots (each at the origin in the GLB):
  fac_toilet_block  2.6 x 2.0 m block, two stalls, doors on the front (three.js +Z)
                    named nodes: door_1, door_2 (hinged on their left edge, rotate local Y in three.js),
                    occ_1, occ_2 (occupancy lamps, lamp material), anchors in the game
  fac_water_cooler  bottled water cooler; node cooler_water (the water in the bottle, pivot at the neck,
                    scale local Y in three.js to show the level), cooler_bottle (the shell)
  fac_bottle        a spare 19 l bottle, upright
  fac_bottle_rack   two-shelf rack for spare bottles (3 per shelf, 0.32 m apart, shelves at 0.08 and 0.62 m)
  fac_mop_bucket    yellow wringer bucket on castors with a mop
  fac_wet_sign      yellow A-frame "wet floor" sign
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import root

SPACING = 3.4
SD = "steel_dark"
WALL = "#d8d2c4"
TRIM = "#2f5d8a"


def toilet_block(p):
    # slab, walls (front wall has two door openings), partitions, roof with overhang, vent, sink, mirror
    p.box((0, -0.12, 0.05), (2.8, 2.45, 0.1), "#9c968a", seg=1.0, dirt=0.3)
    p.box((0, 1.0, 1.2), (2.6, 0.12, 2.3), WALL, seg=1.0, dirt=0.25)            # back
    for x in (-1.3, 1.3):
        p.box((x, 0, 1.2), (0.12, 2.12, 2.3), WALL, seg=1.0, dirt=0.25)          # ends
    p.box((-0.25, 0.1, 1.2), (0.08, 1.8, 2.3), WALL, seg=0)                       # stall partition
    p.box((0.75, 0.1, 1.2), (0.08, 1.8, 2.3), WALL, seg=0)                        # wash bay partition
    # front wall pieces around the two door openings (openings x -1.18..-0.36 and -0.14..0.68)
    for x0, x1 in ((-1.3, -1.18), (-0.36, -0.14), (0.68, 0.79)):  # the wash bay (0.79..1.3) stays open
        p.box(((x0 + x1) / 2, -1.0, 1.2), (x1 - x0, 0.12, 2.3), WALL, seg=0)
    p.box((0.06, -1.0, 2.2), (2.6, 0.12, 0.3), WALL, seg=0)                       # lintel over doors and wash bay
    p.box((-0.25, -1.07, 0.55), (2.1, 0.02, 0.06), TRIM, seg=0, jitter=0)         # painted band
    p.box((0, -0.05, 2.42), (2.95, 2.4, 0.12), "#4a4f55", METAL, seg=1.0)         # roof
    p.box((0, -1.25, 2.36), (2.95, 0.04, 0.12), "#3a3d41", METAL, seg=0)          # gutter
    p.cyl((0.95, 0.55, 2.75), 0.06, 0.6, SD, METAL, segs=10)                      # vent pipe
    p.cyl((0.95, 0.55, 3.07), 0.09, 0.06, SD, METAL, segs=10)
    # inside each stall: pan and cistern (seen when a door stands open)
    for x in (-0.77, 0.27):
        p.cyl((x, 0.55, 0.22), 0.19, 0.4, "#f1efe9", segs=14)
        p.box((x, 0.82, 0.75), (0.4, 0.16, 0.3), "#f1efe9", seg=0)
        p.box((x + 0.3, 0.9, 1.0), (0.1, 0.08, 0.12), "#f1efe9", seg=0)           # paper holder
    # wash bay: basin on brackets, tap, mirror, soap, towel dispenser, lamp over the doors
    p.box((1.02, -0.66, 0.85), (0.46, 0.36, 0.14), "#f1efe9", bevel=0.02, seg=0)
    p.box((1.02, -0.66, 0.6), (0.06, 0.2, 0.36), SD, METAL, seg=0)
    p.cyl((1.02, -0.52, 1.0), 0.02, 0.14, "chrome", METAL, segs=8)
    p.box((1.02, -0.39, 1.45), (0.4, 0.02, 0.5), "glass", METAL, seg=0, jitter=0)
    p.box((0.86, -0.4, 1.1), (0.08, 0.06, 0.14), "#e8e0d0", seg=0)
    p.box((1.22, -0.4, 1.2), (0.14, 0.08, 0.26), "#f1efe9", seg=0)
    p.box((-0.25, -1.1, 2.15), (0.3, 0.12, 0.08), SD, METAL, seg=0)               # outside lamp
    p.box((-0.25, -1.13, 2.1), (0.24, 0.02, 0.04), "cream", seg=0, jitter=0)
    for x in (-0.77, 0.27):                                                       # door number plates
        p.box((x, -1.075, 1.95), (0.18, 0.01, 0.12), "cream", seg=0, jitter=0)
    # sign board on the end wall
    p.box((1.37, -0.2, 1.75), (0.02, 0.8, 0.36), TRIM, seg=0)
    p.box((1.385, -0.2, 1.75), (0.01, 0.68, 0.24), "cream", seg=0, jitter=0)

    def door(i, x_hinge):
        def fn(q):
            q.box((x_hinge + 0.41, -1.0, 0.98), (0.8, 0.05, 1.86), "#5d6b3a", seg=0, dirt=0.2)
            q.box((x_hinge + 0.72, -1.04, 1.0), (0.04, 0.04, 0.12), "chrome", METAL, seg=0)
            q.box((x_hinge + 0.41, -1.03, 1.7), (0.4, 0.01, 0.14), "#46542b", seg=0, jitter=0)  # vent slot
        return fn

    def occ(x):
        def fn(q):
            q.box((x, -1.085, 2.12), (0.12, 0.03, 0.05), "lamp", LAMP, seg=0)
        return fn

    return {"door_1": (door(1, -1.18), (-1.18, -1.0, 0)), "door_2": (door(2, -0.14), (-0.14, -1.0, 0)),
            "occ_1": (occ(-0.77), (0, 0, 0)), "occ_2": (occ(0.27), (0, 0, 0))}


def water_cooler(p):
    p.box((0, 0, 0.47), (0.36, 0.36, 0.94), "cream", bevel=0.02, seg=0)
    p.box((0, -0.181, 0.62), (0.22, 0.01, 0.26), "#d8d2c4", seg=0, jitter=0)      # recess
    p.box((-0.05, -0.19, 0.74), (0.05, 0.04, 0.06), "#2f7fd0", seg=0)             # cold tap
    p.box((0.05, -0.19, 0.74), (0.05, 0.04, 0.06), "#c23b2a", seg=0)              # hot tap
    p.box((0, -0.2, 0.52), (0.2, 0.1, 0.03), SD, METAL, seg=0)                    # drip tray
    p.cyl((0, 0, 0.95), 0.12, 0.04, "#cfd6db", segs=14)                           # collar
    p.cyl((0.24, 0, 0.75), 0.045, 0.36, "#f1efe9", segs=10)                         # cup dispenser
    p.cyl((0.24, 0, 0.56), 0.05, 0.03, "#cfd6db", segs=10)
    p.cyl((-0.3, -0.05, 0.16), 0.12, 0.32, "#3a3d41", segs=12)                    # cup bin

    def bottle(q):
        q.cyl((0, 0, 1.2), 0.155, 0.46, "#a9d4ec", segs=16)
        q.cyl((0, 0, 0.98), 0.06, 0.06, "#a9d4ec", segs=10)
        for z in (1.08, 1.32):
            q.cyl((0, 0, z), 0.158, 0.02, "#8cc1e0", segs=16, smooth=False)

    def water(q):  # pivot at the neck: scaling it down empties the bottle from the top, as it would
        q.cyl((0, 0, 1.18), 0.14, 0.42, "#2f7fd0", segs=16)

    return {"cooler_bottle": (bottle, (0, 0, 0)), "cooler_water": (water, (0, 0, 0.97))}


def bottle(p):
    p.cyl((0, 0, 0.25), 0.155, 0.46, "#6fa6c8", segs=16)
    p.cyl((0, 0, 0.52), 0.06, 0.08, "#6fa6c8", segs=10)
    p.cyl((0, 0, 0.57), 0.065, 0.03, "#2f7fd0", segs=10)
    for z in (0.12, 0.38):
        p.cyl((0, 0, z), 0.158, 0.02, "#4f86a8", segs=16, smooth=False)


def bottle_rack(p):
    for x in (-0.5, 0.5):
        for y in (-0.2, 0.2):
            p.box((x, y, 0.6), (0.04, 0.04, 1.2), SD, METAL, seg=0)
    for z in (0.06, 0.6):
        p.box((0, 0, z), (1.06, 0.44, 0.04), "wood", seg=0)
    p.box((0, 0.21, 1.0), (1.06, 0.02, 0.06), "yellow", METAL, seg=0)


def mop_bucket(p):
    p.box((0, 0, 0.22), (0.42, 0.3, 0.3), "yellow", bevel=0.03, seg=0)
    p.box((0.12, 0, 0.42), (0.16, 0.28, 0.12), "#3a3d41", seg=0)                  # wringer
    for x in (-0.16, 0.16):
        for y in (-0.11, 0.11):
            p.cyl((x, y, 0.03), 0.03, 0.03, "black", axis="Y", segs=8)
    p.beam((-0.08, 0, 0.3), (-0.22, 0.05, 1.25), 0.016, "wood")                   # mop handle
    p.cyl((-0.06, 0, 0.3), 0.07, 0.12, "#e8e0d0", segs=10)


def wet_sign(p):
    for s in (-1, 1):
        p.box((0, s * 0.11, 0.33), (0.3, 0.02, 0.64), "yellow", seg=0, rot=(s * 10, 0, 0))
        p.box((0, s * 0.125, 0.42), (0.18, 0.005, 0.16), "black", seg=0, jitter=0, rot=(s * 10, 0, 0))


ITEMS = {"fac_toilet_block": toilet_block, "fac_water_cooler": water_cooler, "fac_bottle": bottle,
         "fac_bottle_rack": bottle_rack, "fac_mop_bucket": mop_bucket, "fac_wet_sign": wet_sign}


def build(mats):
    container = root("facilities")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 3) * SPACING, -(i // 3) * SPACING, 0)
        p = Part(name + "_mesh", seed=600 + i)
        extras = fn(p) or {}
        p.to_object(mats, parent=rt)
        for k, (efn, pivot) in extras.items():
            q = Part(k, seed=980 + i)
            efn(q)
            o = q.to_object(mats, pivot=pivot, parent=rt)
            o.name = k
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 110, "before_export": before_export,
                       "bake": {"distance": 0.35, "samples": 48}}
