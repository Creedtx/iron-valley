"""Level 5 "Regional Manufacturer" kit, loaded only when the player reaches level 5.

Roots (each at the origin in the GLB; front at Blender -Y, which is the camera side in the game):
  l5_dock   the second loading dock on the road frontage: a steel canopy over a dock leveller plate,
            bollards, a dock lamp and a DOCK 2 board, 1.9 m (X) by 3.2 m (Y). The truck backs up to its
            +X edge. Anchor 'sign_spot' is the face of the board.
  l5_bank   the Valley Bank across the road: a stone front with four columns, a pediment, steps and a
            double door, 6.0 m wide (X), 4.2 m deep (Y), 4.6 m tall. Anchors 'sign_spot' (the frieze)
            and 'door_spot' (the foot of the steps).
  l5_shop   Ada Finch's corner shop: brick, a shop window, a striped awning, crates of greens and a
            bench by the door, 4.6 m (X) by 3.6 m (Y). Anchors 'sign_spot' (the fascia) and
            'bench_spot' (in front of the bench).
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

SPACING = 7.0
SD = "steel_dark"


def dock(p, rt, mats):
    # dock leveller plate on the ground, its hinged lip at the truck side, and a yellow-black kerb
    p.box((0.25, 0, 0.03), (1.5, 2.6, 0.06), "#6b7077", METAL, seg=0, dirt=0.3)
    for k in range(9):
        p.box((-0.4 + k * 0.16, 0, 0.065), (0.02, 2.5, 0.01), "#80868d", METAL, seg=0, jitter=0)
    p.box((1.05, 0, 0.05), (0.14, 2.6, 0.06), "#5b6168", METAL, seg=0)
    for k in range(10):
        p.box((1.05, -1.17 + k * 0.26, 0.085), (0.15, 0.13, 0.012), "yellow" if k % 2 == 0 else "black", seg=0, jitter=0)
    # canopy: two posts at the yard side, beams, a sloping corrugated roof
    for y in (-1.45, 1.45):
        p.box((-0.82, y, 1.6), (0.14, 0.14, 3.2), SD, METAL, seg=0)
        p.box((0.98, y, 1.85), (0.1, 0.1, 0.5), SD, METAL, seg=0, rot=(0, 0, 0))
        p.box((0.08, y, 3.12), (1.95, 0.1, 0.12), SD, METAL, seg=0, rot=(0, 7, 0))
    p.box((0.08, 0, 3.28), (2.1, 3.3, 0.04), "#8d98a1", METAL, rot=(0, 7, 0), seg=0, dirt=0.2)
    for k in range(15):
        p.box((0.08, -1.6 + k * (3.2 / 14), 3.31), (2.08, 0.025, 0.025), "#a7b1b8", METAL, rot=(0, 7, 0), seg=0, jitter=0)
    p.box((1.12, 0, 3.0), (0.06, 3.3, 0.18), "yellow", seg=0)                         # yellow fascia
    # rubber bumpers on the posts at truck height, and bollards beside the bay
    for y in (-1.2, 1.2):
        p.box((0.98, y * 1.0, 1.0), (0.16, 0.26, 0.34), "rubber", seg=0)
    for y in (-1.6, 1.6):
        p.cyl((1.0, y, 0.45), 0.09, 0.9, "yellow", segs=10)
        p.cyl((1.0, y, 0.92), 0.095, 0.05, "black", segs=10)
    # dock lamp on an arm
    p.box((-0.82, -1.45, 2.35), (0.6, 0.05, 0.05), SD, METAL, seg=0, rot=(0, 0, 0))
    p.cyl((-0.5, -1.45, 2.3), 0.09, 0.12, "#ffe9b0", LAMP, segs=10)
    # control box on the post
    p.box((-0.74, 1.45, 1.25), (0.1, 0.32, 0.42), "#2f5d8a", seg=0)
    p.box((-0.69, 1.45, 1.32), (0.01, 0.06, 0.06), "#3dff5a", LAMP, seg=0, jitter=0)
    p.box((-0.69, 1.45, 1.2), (0.01, 0.06, 0.06), "red", LAMP, seg=0, jitter=0)
    # the DOCK 2 board hangs from the fascia; the game prints its face
    p.box((1.1, 0, 2.62), (0.05, 1.1, 0.4), "#2f5d8a", seg=0)
    for y in (-0.45, 0.45):
        p.box((1.1, y, 2.86), (0.02, 0.02, 0.12), SD, METAL, seg=0)
    p.to_object(mats, parent=rt)
    anchor("sign_spot", (1.13, 0, 2.62), rt)


def bank(p, rt, mats):
    stone, light, dark = "#b9b2a2", "#ddd6c4", "#8d8676"
    # plinth and three steps up to the portico
    p.box((0, 0.3, 0.25), (6.0, 3.6, 0.5), dark, bevel=0.02, seg=0, dirt=0.2)
    for k in range(3):
        p.box((0, -1.65 - k * 0.3, 0.42 - k * 0.15), (3.4 + k * 0.4, 0.32, 0.16), stone, bevel=0.01, seg=0, dirt=0.3)
    # the hall behind the columns
    p.box((0, 0.6, 2.35), (5.8, 3.0, 3.7), light, bevel=0.03, dirt=0.15)
    p.box((0, 0.6, 4.3), (6.1, 3.2, 0.25), stone, bevel=0.02, seg=0)                  # cornice
    p.box((0, 0.6, 4.5), (5.7, 2.9, 0.18), dark, seg=0)                               # roof
    # portico: four columns with bases and capitals, entablature, pediment
    for x in (-1.95, -0.65, 0.65, 1.95):
        p.cyl((x, -1.2, 2.3), 0.2, 3.4, "#e9e3d2", segs=14)
        p.box((x, -1.2, 0.6), (0.5, 0.5, 0.2), stone, seg=0)
        p.box((x, -1.2, 4.0), (0.52, 0.52, 0.18), stone, seg=0)
    p.box((0, -1.05, 4.32), (4.9, 0.9, 0.42), light, seg=0)                           # entablature (the frieze)
    p.prism([(-2.6, 4.53), (2.6, 4.53), (0, 5.35)], 0.9, light, plane="XZ", offset=-1.05)
    p.prism([(-2.25, 4.62), (2.25, 4.62), (0, 5.2)], 0.05, dark, plane="XZ", offset=-1.52)
    # double door with a fanlight, and two tall windows
    p.box((0, -0.92, 1.65), (1.3, 0.08, 2.2), "#3a2a1c", bevel=0.01, seg=0)
    p.box((0, -0.96, 1.65), (0.04, 0.02, 2.1), "brass", METAL, seg=0, jitter=0)
    for x in (-0.12, 0.12):
        p.cyl((x, -0.98, 1.6), 0.03, 0.03, "brass", METAL, axis="Y", segs=8)
    p.box((0, -0.92, 2.95), (1.3, 0.06, 0.32), "#f3cf8f", LAMP, seg=0)
    for x in (-2.15, 2.15):
        p.box((x, -0.92, 2.0), (0.9, 0.08, 1.9), "#2a3138", seg=0)
        p.box((x, -0.95, 2.0), (0.8, 0.03, 1.8), "glass", METAL, seg=0)
        p.box((x, -0.97, 2.0), (0.04, 0.02, 1.8), "#e9e3d2", seg=0, jitter=0)
        p.box((x, -0.97, 2.15), (0.8, 0.02, 0.04), "#e9e3d2", seg=0, jitter=0)
        p.box((x, -1.0, 1.0), (1.0, 0.16, 0.08), stone, seg=0)
    # lamps either side of the door and a brass plate
    for x in (-0.95, 0.95):
        p.cyl((x, -1.0, 2.35), 0.08, 0.22, "#ffe9b0", LAMP, segs=10)
        p.box((x, -0.96, 2.2), (0.04, 0.08, 0.08), "brass", METAL, seg=0)
    p.box((1.1, -0.98, 1.4), (0.36, 0.02, 0.26), "brass", METAL, seg=0, jitter=0)
    p.to_object(mats, parent=rt)
    anchor("sign_spot", (0, -1.51, 4.32), rt)
    anchor("door_spot", (0, -2.9, 0), rt)


def shop(p, rt, mats):
    brick = "brick"
    p.box((0, 0.3, 1.5), (4.6, 3.0, 3.0), brick, bevel=0.02, dirt=0.25)
    p.box((0, 0.3, 3.02), (4.5, 2.9, 0.06), "#4d4a46", seg=0)                           # tar roof
    for (x, y, sx, sy) in ((0, -1.22, 4.75, 0.16), (0, 1.82, 4.75, 0.16), (-2.3, 0.3, 0.16, 3.15), (2.3, 0.3, 0.16, 3.15)):
        p.box((x, y, 3.1), (sx, sy, 0.22), "cream", seg=0)                              # parapet coping
    p.box((0, -1.22, 0.12), (4.7, 0.2, 0.24), "concrete", seg=0)                       # step
    # shopfront: a painted frame, the window, the door
    p.box((0, -1.21, 1.3), (4.4, 0.06, 2.4), "#2f5a3a", seg=0)
    p.box((-0.7, -1.25, 1.35), (2.6, 0.03, 1.55), "glass", METAL, seg=0)
    for x in (-1.55, -0.7, 0.15):
        p.box((x, -1.27, 1.35), (0.05, 0.02, 1.55), "#2f5a3a", seg=0, jitter=0)
    p.box((-0.7, -1.27, 0.95), (2.6, 0.02, 0.05), "#2f5a3a", seg=0, jitter=0)
    p.box((1.35, -1.24, 1.12), (0.9, 0.04, 2.0), "#24452d", seg=0)                       # door
    p.box((1.35, -1.27, 1.5), (0.6, 0.02, 0.8), "glass", METAL, seg=0)
    p.cyl((1.05, -1.29, 1.05), 0.03, 0.03, "brass", METAL, axis="Y", segs=8)
    # goods in the window: shelves of tins and jars
    for z in (0.75, 1.25):
        p.box((-0.7, -1.05, z), (2.5, 0.25, 0.04), "wood", seg=0)
        for k in range(8):
            p.cyl((-1.8 + k * 0.3, -1.05, z + 0.1), 0.06, 0.16, ["red", "yellow", "#2f5d8a", "cream"][k % 4], segs=8)
    # fascia for the name, and a striped awning sloping out
    p.box((0, -1.24, 2.62), (4.4, 0.08, 0.42), "#2f5a3a", seg=0)
    for k in range(10):
        x = -2.2 + 0.44 * (k + 0.5)
        p.box((x, -1.75, 2.18), (0.44, 1.05, 0.03), "#2f7a4a" if k % 2 == 0 else "cream", rot=(-22, 0, 0), seg=0, jitter=0)
        p.box((x, -2.26, 1.92), (0.4, 0.02, 0.14), "#2f7a4a" if k % 2 == 0 else "cream", seg=0, jitter=0)
    for x in (-2.15, 2.15):
        p.box((x, -1.7, 2.18), (0.03, 1.05, 0.03), SD, METAL, rot=(-22, 0, 0), seg=0)
    # crates of greens on a trestle, a bench by the door, a newspaper board
    p.box((-0.9, -1.75, 0.45), (1.6, 0.6, 0.05), "wood", seg=0)
    for x in (-1.6, -0.2):
        p.box((x, -1.75, 0.22), (0.05, 0.5, 0.44), "wood_dark", seg=0)
    for k, col in enumerate(("#6fa33a", "#d9772b", "#b3261e", "#8fbf4a")):
        x = -1.45 + k * 0.38
        p.box((x, -1.75, 0.58), (0.34, 0.5, 0.2), "#b88a52", seg=0)
        p.sphere((x, -1.75, 0.68), 0.15, col, segs=(8, 5), scale=(1, 1.3, .5))
    p.box((1.6, -1.95, 0.42), (1.1, 0.36, 0.06), "wood", seg=0)
    for x in (1.15, 2.05):
        p.box((x, -1.95, 0.2), (0.06, 0.3, 0.4), "wood_dark", seg=0)
    p.box((1.6, -1.8, 0.72), (1.1, 0.05, 0.36), "wood", seg=0, rot=(-12, 0, 0))
    p.prism([(-0.25, 0), (0.25, 0), (0.12, 0.85), (-0.12, 0.85)], 0.04, "#2c2621", plane="XZ", offset=-2.35, center=(0.5, 0, 0))
    p.box((0.5, -2.38, 0.55), (0.3, 0.01, 0.4), "paper", seg=0, jitter=0)
    # a drainpipe and a chimney stack
    p.cyl((2.28, -1.15, 1.5), 0.05, 3.0, "#3a3d41", METAL, segs=8)
    p.box((1.4, 1.2, 3.45), (0.5, 0.4, 0.7), brick, seg=0)
    p.box((1.4, 1.2, 3.82), (0.6, 0.5, 0.06), "cream", seg=0)
    p.to_object(mats, parent=rt)
    anchor("sign_spot", (0, -1.29, 2.62), rt)
    anchor("bench_spot", (1.6, -2.55, 0), rt)


ITEMS = {"l5_dock": dock, "l5_bank": bank, "l5_shop": shop}


def build(mats):
    container = root("level5")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = (i * SPACING, 0, 0)
        p = Part(name + "_mesh", seed=900 + i)
        fn(p, rt, mats)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 160, "before_export": before_export,
                       "bake": {"distance": 0.4, "samples": 48}}
