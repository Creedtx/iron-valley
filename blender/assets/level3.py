"""Level 3 "Local Manufacturer" kit, loaded only when the player reaches level 3.

Roots (each at the origin in the GLB):
  l3_toolbox      the carried and shipped unit of the tool press: a red steel box of spanners, 0.34 x 0.18 x 0.16 m,
                  origin at its base centre, long side along X
  l3_tool_rack    finished-tools shelf by the press: 1.6 m wide, three shelves (0.12, 0.62, 1.12 m), 4 boxes a row,
                  two rows deep; front at Blender -Y
  l3_parts_shelf  spare-parts store for the mechanics: steel shelving with labelled bins, 1.4 m wide, two open slots
                  a shelf for part boxes at 0.45 and 0.95 m
  l3_part         a spare part in its box (cardboard with a gear print), 0.22 x 0.18 x 0.14 m, origin at its base
  l3_hay_bale     round bale for the North field before it is bought
  l3_field_gate   farm gate between the dock apron and the North field (two posts and a five-bar gate)
"""
import math

import bpy

from ivlib.geo import METAL, Part
from ivlib.scene import root

SPACING = 2.6
SD = "steel_dark"


def toolbox(p):
    p.box((0, 0, 0.065), (0.34, 0.18, 0.13), "red", METAL, bevel=0.01, seg=0)
    p.box((0, 0, 0.135), (0.35, 0.19, 0.02), "#8f2a1f", METAL, seg=0)          # lid
    p.box((0, 0, 0.165), (0.16, 0.025, 0.02), SD, METAL, seg=0, jitter=0)       # handle
    for x in (-0.07, 0.07):
        p.box((x, 0, 0.152), (0.02, 0.025, 0.03), SD, METAL, seg=0, jitter=0)
    p.box((0.12, -0.091, 0.1), (0.04, 0.004, 0.03), "chrome", METAL, seg=0, jitter=0)   # latch
    p.box((-0.05, -0.091, 0.07), (0.12, 0.004, 0.04), "cream", seg=0, jitter=0)         # label


def tool_rack(p):
    for x in (-0.78, 0.78):
        for y in (-0.22, 0.22):
            p.box((x, y, 0.75), (0.05, 0.05, 1.5), SD, METAL, seg=0)
    for z in (0.08, 0.58, 1.08):
        p.box((0, 0, z), (1.6, 0.5, 0.035), "#5c636b", METAL, seg=0)
        p.box((0, -0.25, z + 0.02), (1.6, 0.02, 0.05), "orange", METAL, seg=0, jitter=0)
    p.box((0, 0.24, 1.3), (1.6, 0.02, 0.36), "#5c636b", METAL, seg=0)            # back board
    p.box((0, 0.225, 1.33), (0.9, 0.01, 0.16), "cream", seg=0, jitter=0)        # sign board


def parts_shelf(p):
    for x in (-0.68, 0.68):
        for y in (-0.2, 0.2):
            p.box((x, y, 0.7), (0.045, 0.045, 1.4), "#2f5d8a", METAL, seg=0)
    for z in (0.06, 0.44, 0.94, 1.36):
        p.box((0, 0, z), (1.4, 0.44, 0.03), "#9aa1a8", METAL, seg=0)
    # labelled bins on the top shelf
    for k in range(5):
        x = -0.54 + k * 0.27
        p.box((x, -0.02, 1.47), (0.22, 0.36, 0.18), ["yellow", "blue", "red", "yellow", "blue"][k], seg=0)
        p.box((x, -0.205, 1.49), (0.12, 0.004, 0.05), "cream", seg=0, jitter=0)
    # gear sign on the end
    p.cyl((0.71, -0.2, 1.15), 0.09, 0.01, "cream", axis="X", segs=12, smooth=False)
    p.cyl((0.716, -0.2, 1.15), 0.05, 0.01, "#2f5d8a", axis="X", segs=8, smooth=False)


def part(p):
    p.box((0, 0, 0.07), (0.22, 0.18, 0.14), "#b88a52", seg=0)
    p.box((0, 0, 0.142), (0.225, 0.04, 0.006), "#d9c79a", seg=0, jitter=0)      # tape
    p.cyl((0, -0.091, 0.075), 0.04, 0.004, "#2f5d8a", axis="Y", segs=8, smooth=False)


def hay_bale(p):
    p.cyl((0, 0, 0.55), 0.55, 1.1, "#c9a24a", axis="Y", segs=18)
    for y in (-0.3, 0.0, 0.3):
        p.cyl((0, y, 0.55), 0.555, 0.02, "#a8853a", axis="Y", segs=18, smooth=False)
    p.cyl((0, -0.551, 0.55), 0.35, 0.004, "#b8923f", axis="Y", segs=14, smooth=False)


def field_gate(p):
    for x in (-1.6, 1.6):
        p.box((x, 0, 0.65), (0.16, 0.16, 1.3), "wood_dark", seg=0)
        p.cyl((x, 0, 1.32), 0.1, 0.06, "wood_dark", segs=8)
    for k in range(5):  # five bars, open gate swung along the fence
        p.box((-0.8, 0.0, 0.25 + k * 0.2), (1.5, 0.06, 0.07), "wood", seg=0)
    p.box((-0.8, 0.0, 0.65), (1.55, 0.06, 0.07), "wood", seg=0, rot=(0, math.degrees(math.atan2(0.8, 1.5)), 0))


ITEMS = {"l3_toolbox": toolbox, "l3_tool_rack": tool_rack, "l3_parts_shelf": parts_shelf, "l3_part": part,
         "l3_hay_bale": hay_bale, "l3_field_gate": field_gate}


def build(mats):
    container = root("level3")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 3) * SPACING * 1.5, -(i // 3) * SPACING * 1.4, 0)
        p = Part(name + "_mesh", seed=700 + i)
        fn(p)
        p.to_object(mats, parent=rt)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 90, "before_export": before_export,
                       "bake": {"distance": 0.3, "samples": 48}}
