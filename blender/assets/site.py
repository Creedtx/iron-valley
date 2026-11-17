"""The level 1 site kit (build 0.16): separate weathered buildings on a wide dirt yard, after the concept art.

Every root sits at the origin in the GLB with its front (the camera side, the game's +z) at Blender -Y.
Nodes the game hides when the owner walks inside are separate objects named below.

  site_barn        workshop barn, 14 x 9 m, brick plinth and faded barn-red boards, a rusty corrugated gable
                   roof. Nodes: 'barn_roof', 'barn_front' (front wall above the plinth, the sliding doors and
                   the sign board), 'barn_boards' (planks over the back windows, removed when restored).
                   Anchors: 'sign_spot' (face of the sign board), 'door_spot' (the doorway on the floor).
  site_office      office hut, 6.5 x 4.5 m, green clapboard, a porch with an awning. Nodes: 'office_roof',
                   'office_front'. Anchors: 'door_spot', 'sign_spot'.
  site_shed        storage shed, 7 x 5 m, open front, rough planks, a lean-to roof. Node: 'shed_roof'.
                   Anchor: 'sign_spot'.
  site_water_tower riveted tank on four braced steel legs, 10 m tall.
  site_rail        6 m of railway along X: ballast, sleepers, two rails.
  site_crossing    level crossing sign: a crossbuck on a post with two red lamps.
  site_gen_cage    concrete pad with a chain-link cage, gate gap on the west side, and bollards.
  site_dock        timber loading dock, 5 x 3.4 m, low deck with bumpers on the truck side (+X).
  site_skip        rusty yellow scrap skip full of broken planks.
  site_firstaid    first-aid board on two posts.
  site_corr_fence  2.4 m panel of corrugated sheet on timber posts.
  site_bollard     yellow and black steel bollard.
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

SPACING = 18.0
SD = "steel_dark"
BARN = "#7a3d2c"          # faded barn red
BARN_DARK = "#5e2f23"
RUST = "#7c5a3c"
RUST2 = "#8f6440"
TIN = "#7d8a94"


def corrugated(p, x0, x1, y0, y1, z0, z1, along="X", tint=RUST, ribs_every=0.18, rot=None, **kw):
    """A sloped sheet of corrugated iron from edge (y0, z0) to (y1, z1), spanning x0..x1, with ribs across it."""
    cy, cz = (y0 + y1) / 2, (z0 + z1) / 2
    run = math.hypot(y1 - y0, z1 - z0)
    ang = math.degrees(math.atan2(z1 - z0, y1 - y0))
    w = x1 - x0
    p.box(((x0 + x1) / 2, cy, cz), (w, run, 0.04), tint, METAL, rot=(ang, 0, 0), seg=0, dirt=0.15, jitter=0.06)
    n = int(w / ribs_every)
    for k in range(n):
        x = x0 + (k + 0.5) * w / n
        col = tint if k % 7 else RUST2       # a few sheets rustier than the rest
        p.box((x, cy, cz + 0.035), (0.03, run, 0.03), col, METAL, rot=(ang, 0, 0), seg=0, jitter=0.08)


def planks(p, x0, x1, y, z0, z1, color, width=0.24, gap=0.012, vertical=True, face="Y", jitter=0.09, dirt=0.35):
    """A wall of boards between x0..x1 (or y0..y1 when face='X'), z0..z1 high, one plank per box."""
    span = x1 - x0
    n = max(1, int(span / width))
    for k in range(n):
        a = x0 + (k + 0.5) * span / n
        h = z1 - z0
        if face == "Y":
            p.box((a, y, (z0 + z1) / 2), (span / n - gap, 0.06, h), color, seg=0, jitter=jitter, dirt=dirt)
        else:
            p.box((y, a, (z0 + z1) / 2), (0.06, span / n - gap, h), color, seg=0, jitter=jitter, dirt=dirt)


def brick_plinth(p, x0, x1, y0, y1, h=1.1):
    p.box(((x0 + x1) / 2, (y0 + y1) / 2, h / 2), (x1 - x0, y1 - y0, h), "brick", bevel=0.01, dirt=0.4, jitter=0.05)
    p.box(((x0 + x1) / 2, (y0 + y1) / 2, h + 0.03), (x1 - x0 + 0.06, y1 - y0 + 0.06, 0.06), "#8a877f", seg=0)


# ------------------------------------------------------------------------------------------------- barn
def barn(p, rt, mats):
    W, D, H, R = 14.0, 9.0, 4.4, 6.6       # width (X), depth (Y), eaves height, ridge height
    hx, hy = W / 2, D / 2
    p.box((0, 0, 0.04), (W - 0.2, D - 0.2, 0.08), "concrete", seg=0, dirt=0.2)           # floor slab
    # back wall (north, +Y): plinth, boards, three windows high up
    brick_plinth(p, -hx, hx, hy - 0.25, hy)
    planks(p, -hx, hx, hy - 0.12, 1.14, H, BARN)
    for x in (-4.5, 0, 4.5):
        p.box((x, hy - 0.16, 3.1), (1.8, 0.04, 1.2), "#2c2f33", seg=0)
        p.box((x, hy - 0.18, 3.1), (1.6, 0.03, 1.0), "glass", METAL, seg=0)
        for k in (-0.5, 0, 0.5):
            p.box((x + k * 0.55, hy - 0.2, 3.1), (0.05, 0.03, 1.0), "#2c2f33", seg=0, jitter=0)
    # side walls with their gable triangles (east and west)
    for sx in (-1, 1):
        x = sx * (hx - 0.12)
        p.box((sx * (hx - 0.12), 0, 0.55), (0.25, D, 1.1), "brick", dirt=0.4, jitter=0.05)
        planks(p, -hy, hy, x, 1.14, H, BARN, face="X")
        steps = 10
        for k in range(steps):
            yk = -hy + (k + 0.5) * D / steps
            top = H + (R - H) * (1 - abs(yk) / hy)
            p.box((x, yk, (H + top) / 2), (0.06, D / steps - 0.012, top - H), BARN, seg=0, jitter=0.09, dirt=0.1)
        p.box((x + sx * 0.05, 0, 5.5), (0.03, 0.7, 0.7), "#2c2f33", seg=0)                # gable vent
        for k in range(4):
            p.box((x + sx * 0.06, 0, 5.25 + k * 0.17), (0.02, 0.62, 0.04), "#5b6168", seg=0, jitter=0)
    # the low front stub that stays when the front comes off (a doorway gap in the middle)
    for x0, x1 in ((-hx, -2.2), (2.2, hx)):
        p.box(((x0 + x1) / 2, -hy + 0.12, 0.55), (x1 - x0, 0.25, 1.1), "brick", dirt=0.4, jitter=0.05)
        p.box(((x0 + x1) / 2, -hy + 0.12, 1.13), (x1 - x0 + 0.06, 0.31, 0.06), "#8a877f", seg=0)
    # gutters and downpipes along the eaves
    for sy in (-1, 1):
        p.cyl((0, sy * (hy + 0.42), H - 0.05), 0.07, W + 0.8, "#3a3d41", METAL, axis="X", segs=8)
    for sx in (-1, 1):
        p.cyl((sx * (hx + 0.2), -(hy + 0.42), H / 2), 0.05, H, "#3a3d41", METAL, segs=8)
    # a rusty water butt and a heap of old tyres by the west wall
    p.cyl((-hx - 0.6, -hy + 1.2, 0.45), 0.4, 0.9, RUST, METAL, segs=14, dirt=0.3)
    for k in range(3):
        p.cyl((-hx - 0.7, 1.6, 0.12 + k * 0.2), 0.42, 0.2, "rubber", segs=14)
    p.to_object(mats, parent=rt)

    # roof: two slopes of corrugated iron, a ridge cap and a ventilator
    rf = Part("barn_roof", seed=1201)
    for sy in (-1, 1):
        corrugated(rf, -hx - 0.45, hx + 0.45, sy * (hy + 0.5), 0, H - 0.05, R + 0.02)
    rf.box((0, 0, R + 0.08), (W + 0.9, 0.36, 0.1), "#5b6168", METAL, seg=0)
    for x in (-3.5, 3.5):
        rf.box((x, 0, R + 0.35), (0.9, 0.9, 0.5), TIN, METAL, seg=0, dirt=0.2)
        rf.box((x, 0, R + 0.66), (1.2, 1.2, 0.08), "#5b6168", METAL, seg=0)
    for x in (-5.2, 1.0, 5.6):                                       # rust streaks and a patched sheet
        rf.box((x, -hy * 0.45, (H + R) / 2 + 0.06), (1.1, 2.4, 0.01), RUST2, METAL, rot=(math.degrees(math.atan2(R - H, hy + 0.5)), 0, 0), seg=0, jitter=0)
    rf.to_object(mats, parent=rt)

    # front wall above the plinth, the gable, the sliding doors on their rail and the sign board
    fr = Part("barn_front", seed=1202)
    y = -hy + 0.12
    planks(fr, -hx, -2.2, y, 1.14, H, BARN)
    planks(fr, 2.2, hx, y, 1.14, H, BARN)
    planks(fr, -2.2, 2.2, y, 3.8, H, BARN)
    steps = 14
    for k in range(steps):
        xk = -hx + (k + 0.5) * W / steps
        top = H + (R - H) * (1 - abs(xk) / hx) * 0      # flat front: the ridge runs along X, so no front gable
        _ = top
    fr.box((0, y - 0.1, 3.9), (5.4, 0.08, 0.12), SD, METAL, seg=0)                     # door rail
    for sx in (-1, 1):                                                                   # doors slid half open
        cx = sx * 2.35
        fr.box((cx, y - 0.16, 1.9), (2.2, 0.08, 3.7), "#4f6b3e", dirt=0.35, jitter=0.05)
        for k in range(5):
            fr.box((cx - 0.88 + k * 0.44, y - 0.21, 1.9), (0.03, 0.02, 3.6), "#3f5631", seg=0, jitter=0)
        fr.beam((cx - 1.0, y - 0.22, 0.25), (cx + 1.0, y - 0.22, 3.55), 0.09, "#3f5631")
        fr.box((cx, y - 0.22, 0.2), (2.1, 0.03, 0.1), "#3f5631", seg=0)
        fr.box((cx, y - 0.22, 3.65), (2.1, 0.03, 0.1), "#3f5631", seg=0)
    fr.box((0, y - 0.12, 4.75), (6.6, 0.1, 1.15), "#4a3226", bevel=0.02, dirt=0.2)           # sign board
    fr.box((0, y - 0.18, 4.75), (6.3, 0.02, 0.95), "#5a3d2b", seg=0)
    for x in (-3.0, 3.0):
        fr.box((x, y - 0.2, 4.75), (0.08, 0.03, 0.08), "#b8913a", METAL, seg=0, jitter=0)
    for x in (-5.0, 5.0):                                                                # lamps over the door
        fr.box((x, y - 0.3, 3.6), (0.06, 0.4, 0.06), SD, METAL, seg=0)
        fr.cyl((x, y - 0.5, 3.52), 0.16, 0.14, "#2c2f33", METAL, segs=10, radius2=0.06)
    fr.to_object(mats, parent=rt)

    bd = Part("barn_boards", seed=1203)
    for x in (-4.5, 0, 4.5):
        for k, (dz, r) in enumerate(((-0.3, 8), (0.05, -6), (0.38, 4))):
            bd.box((x, hy - 0.26, 3.1 + dz), (2.0, 0.05, 0.22), "wood_dark", rot=(0, r, 0), seg=0, jitter=0.1)
    bd.to_object(mats, parent=rt)
    anchor("sign_spot", (0, y - 0.2, 4.75), rt)
    anchor("door_spot", (0, -hy, 0), rt)


# ------------------------------------------------------------------------------------------------- office
def office(p, rt, mats):
    W, D, H = 6.5, 4.5, 2.9
    hx, hy = W / 2, D / 2
    GREEN, GREEN_D, TRIM = "#5f7550", "#4b5e40", "#d9d0b8"
    p.box((0, 0, 0.12), (W, D, 0.24), "concrete", seg=0, dirt=0.2)                     # raised floor
    p.box((0, 0, 0.25), (W - 0.3, D - 0.3, 0.02), "#7a6448", seg=0)                       # boards inside
    # back and side walls: clapboard (horizontal boards), white trim at the corners
    def clap(x0, x1, y0, y1, z0, z1, along="X"):
        n = int((z1 - z0) / 0.22)
        for k in range(n):
            z = z0 + (k + 0.5) * (z1 - z0) / n
            if along == "X":
                p.box(((x0 + x1) / 2, y0, z), (x1 - x0, 0.08, (z1 - z0) / n - 0.012), GREEN, seg=0, jitter=0.07, dirt=0.25)
            else:
                p.box((x0, (y0 + y1) / 2, z), (0.08, y1 - y0, (z1 - z0) / n - 0.012), GREEN, seg=0, jitter=0.07, dirt=0.25)
    clap(-hx, hx, hy - 0.04, hy, 0.24, H)
    for sx in (-1, 1):
        clap(sx * (hx - 0.04), 0, -hy, hy, 0.24, H, along="Y")
        p.box((sx * hx, hy, H / 2), (0.14, 0.14, H), TRIM, seg=0)
        p.box((sx * hx, -hy, H / 2), (0.14, 0.14, H), TRIM, seg=0)
        # gable triangle at each end
        for k in range(8):
            yk = -hy + (k + 0.5) * D / 8
            top = H + 1.1 * (1 - abs(yk) / hy)
            p.box((sx * (hx - 0.04), yk, (H + top) / 2), (0.08, D / 8 - 0.01, top - H), GREEN_D, seg=0, jitter=0.07)
    for x in (-1.6, 1.6):                                                                # back windows
        p.box((x, hy + 0.01, 1.7), (1.1, 0.06, 0.9), TRIM, seg=0)
        p.box((x, hy + 0.03, 1.7), (0.95, 0.04, 0.75), "glass", METAL, seg=0)
    # front stub with the doorway gap
    for x0, x1 in ((-hx, 0.65), (1.75, hx)):
        clap(x0, x1, -hy + 0.04, -hy, 0.24, 0.95)
    # porch: deck, posts, a lean-to awning, a step and a bench
    p.box((0, -hy - 0.8, 0.12), (W + 0.4, 1.6, 0.24), "wood", seg=0, dirt=0.3)
    for k in range(14):
        p.box((-hx - 0.2 + (k + 0.5) * (W + 0.4) / 14, -hy - 0.8, 0.245), (0.01, 1.58, 0.005), "wood_dark", seg=0, jitter=0)
    p.box((1.2, -hy - 1.8, 0.07), (1.2, 0.4, 0.14), "wood", seg=0)
    for x in (-hx, hx):
        p.box((x, -hy - 1.5, 1.35), (0.12, 0.12, 2.3), "wood_dark", seg=0)
    for x in (-hx + 0.05, hx - 0.05):
        p.box((x, -hy - 1.5, 0.6), (0.05, 0.05, 0.05), "wood_dark", seg=0)
    p.box((0, -hy - 1.5, 2.45), (W + 0.3, 0.12, 0.12), "wood_dark", seg=0)
    corrugated(p, -hx - 0.3, hx + 0.3, -hy - 1.75, -hy - 0.05, 2.45, 2.75, tint=TIN, ribs_every=0.2)
    p.box((-1.9, -hy - 0.6, 0.5), (1.4, 0.4, 0.06), "wood", seg=0)                     # porch bench
    for x in (-2.5, -1.3):
        p.box((x, -hy - 0.6, 0.36), (0.06, 0.34, 0.24), "wood_dark", seg=0)
    p.to_object(mats, parent=rt)

    rf = Part("office_roof", seed=1301)
    for sy in (-1, 1):
        corrugated(rf, -hx - 0.35, hx + 0.35, sy * (hy + 0.35), 0, H - 0.02, H + 1.12, tint=RUST)
    rf.box((0, 0, H + 1.16), (W + 0.7, 0.3, 0.08), "#5b6168", METAL, seg=0)
    rf.box((hx - 1.2, 0.8, H + 1.2), (0.4, 0.4, 0.9), "brick", seg=0)                  # stove chimney
    rf.box((hx - 1.2, 0.8, H + 1.68), (0.5, 0.5, 0.06), "#5b6168", METAL, seg=0)
    rf.to_object(mats, parent=rt)

    fr = Part("office_front", seed=1302)
    y = -hy + 0.04
    def fclap(x0, x1, z0, z1):
        n = int((z1 - z0) / 0.22)
        for k in range(n):
            z = z0 + (k + 0.5) * (z1 - z0) / n
            fr.box(((x0 + x1) / 2, y, z), (x1 - x0, 0.08, (z1 - z0) / n - 0.012), GREEN, seg=0, jitter=0.07, dirt=0.2)
    fclap(-hx, 0.65, 0.95, H)
    fclap(1.75, hx, 0.95, H)
    fclap(0.65, 1.75, 2.35, H)
    fr.box((1.2, y - 0.02, 1.3), (0.95, 0.06, 2.1), "#3f5631", seg=0)                   # door, ajar
    fr.box((1.2, y - 0.05, 1.7), (0.6, 0.03, 0.55), "glass", METAL, seg=0)
    fr.cyl((0.85, y - 0.08, 1.2), 0.03, 0.04, "brass", METAL, axis="Y", segs=8)
    for x in (-1.9, 3.0 - hx + 1.8):
        fr.box((-1.6, y - 0.03, 1.75), (1.6, 0.06, 1.0), TRIM, seg=0)
        fr.box((-1.6, y - 0.05, 1.75), (1.45, 0.04, 0.85), "glass", METAL, seg=0)
        fr.box((-1.6, y - 0.07, 1.75), (0.04, 0.02, 0.85), TRIM, seg=0, jitter=0)
        break
    fr.box((-0.2, y - 0.06, 2.62), (2.4, 0.05, 0.36), "#2c2621", seg=0)                 # OFFICE board
    for sx in (-1, 1):
        fr.box((sx * hx, y - 0.02, H / 2), (0.14, 0.14, H), TRIM, seg=0)
    fr.to_object(mats, parent=rt)
    anchor("door_spot", (1.2, -hy, 0.24), rt)
    anchor("sign_spot", (-0.2, y - 0.1, 2.62), rt)


# ------------------------------------------------------------------------------------------------- shed
def shed(p, rt, mats):
    W, D, Hf, Hb = 7.0, 5.0, 3.3, 2.6
    hx, hy = W / 2, D / 2
    GREY = "#7b6e5c"
    p.box((0, 0, 0.04), (W - 0.1, D - 0.1, 0.08), "#6b6458", seg=0, dirt=0.3)
    planks(p, -hx, hx, hy - 0.04, 0.0, Hb, GREY, width=0.28)
    for sx in (-1, 1):
        n = int(D / 0.28)
        for k in range(n):
            yk = -hy + (k + 0.5) * D / n
            top = Hf + (Hb - Hf) * (yk + hy) / D
            p.box((sx * (hx - 0.04), yk, top / 2), (0.06, D / n - 0.014, top), GREY, seg=0, jitter=0.1, dirt=0.35)
    for x in (-hx + 0.1, -1.2, 1.2, hx - 0.1):                                          # open front on four posts
        p.box((x, -hy + 0.1, Hf / 2), (0.16, 0.16, Hf), "wood_dark", seg=0)
    p.box((0, -hy + 0.1, Hf - 0.1), (W, 0.18, 0.2), "wood_dark", seg=0)
    for x in (-hx + 0.6, hx - 0.6):                                                     # knee braces
        p.beam((x - 0.5 * math.copysign(1, x), -hy + 0.1, Hf - 0.7), (x + 0.0, -hy + 0.1, Hf - 0.15), 0.08, "wood_dark")
    p.box((0, -hy + 0.02, Hf - 0.45), (2.8, 0.05, 0.42), "#e3a52a", seg=0)              # STORAGE board
    p.to_object(mats, parent=rt)
    rf = Part("shed_roof", seed=1401)
    corrugated(rf, -hx - 0.35, hx + 0.35, -hy - 0.45, hy + 0.35, Hf + 0.05, Hb + 0.02, tint=RUST)
    rf.to_object(mats, parent=rt)
    anchor("sign_spot", (0, -hy - 0.01, Hf - 0.45), rt)


# ------------------------------------------------------------------------------------------------- small kit
def water_tower(p, rt, mats):
    legs = [(-1.4, -1.4), (1.4, -1.4), (1.4, 1.4), (-1.4, 1.4)]
    for x, y in legs:
        p.beam((x * 1.15, y * 1.15, 0), (x * 0.82, y * 0.82, 7.0), 0.18, "#4a4f55")
        p.box((x * 1.15, y * 1.15, 0.15), (0.6, 0.6, 0.3), "concrete", seg=0)
    for z0, z1 in ((0.6, 3.4), (3.4, 6.4)):                                             # cross bracing
        for i in range(4):
            a, b = legs[i], legs[(i + 1) % 4]
            k0, k1 = 1.15 - (z0 / 7) * 0.33, 1.15 - (z1 / 7) * 0.33
            p.beam((a[0] * k0, a[1] * k0, z0), (b[0] * k1, b[1] * k1, z1), 0.06, "#4a4f55")
            p.beam((b[0] * k0, b[1] * k0, z0), (a[0] * k1, a[1] * k1, z1), 0.06, "#4a4f55")
    p.box((0, 0, 7.05), (3.6, 3.6, 0.14), "#4a4f55", METAL, seg=0)                     # deck and rail
    for x, y in legs:
        p.cyl((x * 1.2, y * 1.2, 7.55), 0.03, 0.9, "#4a4f55", METAL, segs=6)
    n = 22                                                                                # staved wooden tank
    for k in range(n):
        a = k / n * math.tau
        p.box((1.45 * math.cos(a), 1.45 * math.sin(a), 8.4), (0.42, 0.12, 2.6), "#7d5a3c", rot=(0, 0, math.degrees(a) + 90), seg=0, jitter=0.08, dirt=0.2)
    for z in (7.5, 8.4, 9.3):
        p.cyl((0, 0, z), 1.53, 0.06, "#3a3d41", METAL, segs=22, caps=False)
    p.cyl((0, 0, 10.05), 1.65, 0.9, "#5b6168", METAL, segs=22, radius2=0.1)              # conical roof
    p.cyl((0, 0, 10.55), 0.08, 0.3, "#3a3d41", METAL, segs=8)
    p.beam((1.5, 0, 7.1), (1.5, 0, 0.2), 0.05, "#4a4f55")                          # ladder
    p.beam((1.75, 0, 7.1), (1.75, 0, 0.2), 0.05, "#4a4f55")
    for k in range(20):
        p.box((1.62, 0, 0.5 + k * 0.33), (0.28, 0.03, 0.03), "#4a4f55", seg=0, jitter=0)
    p.beam((-1.3, -0.9, 7.6), (-2.6, -1.6, 6.0), 0.16, "#3a3d41")                  # spout
    p.to_object(mats, parent=rt)


def rail(p, rt, mats):
    L = 6.0
    p.prism([(-1.6, 0), (1.6, 0), (1.15, 0.28), (-1.15, 0.28)], L, "#6f6a62", plane="YZ", dirt=0.2)
    for k in range(int(L / 0.65)):
        x = -L / 2 + (k + 0.5) * L / int(L / 0.65)
        p.box((x, 0, 0.33), (0.24, 2.4, 0.12), "#4a3a2c", seg=0, jitter=0.12)
    for y in (-0.72, 0.72):
        p.box((0, y, 0.44), (L, 0.07, 0.1), "#5b5f63", METAL, seg=0)
        p.box((0, y, 0.5), (L, 0.05, 0.03), "#a7aeb4", METAL, seg=0)
    p.to_object(mats, parent=rt)


def crossing(p, rt, mats):
    p.cyl((0, 0, 1.6), 0.07, 3.2, "cream", segs=10)
    for r in (35, -35):
        p.box((0, -0.06, 2.8), (1.5, 0.04, 0.22), "cream", rot=(0, r, 0), seg=0)
        p.box((0, -0.08, 2.8), (1.42, 0.02, 0.06), "red", rot=(0, r, 0), seg=0, jitter=0)
    p.box((0, -0.05, 2.0), (0.9, 0.08, 0.14), "black", seg=0)
    for x in (-0.38, 0.38):
        p.cyl((x, -0.12, 2.0), 0.13, 0.08, "black", axis="Y", segs=14)
        p.cyl((x, -0.17, 2.0), 0.09, 0.03, "red", LAMP, axis="Y", segs=12)
    p.box((0, 0, 0.12), (0.5, 0.5, 0.24), "concrete", seg=0)
    p.to_object(mats, parent=rt)


def gen_cage(p, rt, mats):
    W, D = 3.8, 3.4
    p.box((0, 0, 0.08), (W + 0.4, D + 0.4, 0.16), "concrete", seg=0, dirt=0.25)
    posts = []
    for x in (-W / 2, 0, W / 2):
        for y in (-D / 2, D / 2):
            posts.append((x, y))
    for y in (-0.85, 0.85):
        posts.append((W / 2, y))
    for x, y in posts:
        p.cyl((x, y, 1.0), 0.04, 2.0, "steel", METAL, segs=8)
    def mesh_run(a, b):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        for z in (0.1, 1.95):
            p.beam((a[0], a[1], z), (b[0], b[1], z), 0.035, "steel")
        n = int(L / 0.16)
        for k in range(n + 1):
            t = k / n
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            p.beam((x, y, 0.12), (x, y, 1.93), 0.012, "#9aa1a8")
        for z in (0.55, 1.0, 1.45):
            p.beam((a[0], a[1], z), (b[0], b[1], z), 0.012, "#9aa1a8")
    mesh_run((-W / 2, D / 2), (W / 2, D / 2))                        # back
    mesh_run((W / 2, -D / 2), (W / 2, D / 2))                        # east
    mesh_run((-W / 2, -D / 2), (-0.35, -D / 2))                      # front, left of the gate gap
    mesh_run((0.75, -D / 2), (W / 2, -D / 2))
    mesh_run((-W / 2, D / 2), (-W / 2, 0.6))                         # west, with the cable gap
    for x, y in ((-W / 2 - 0.45, -D / 2 - 0.45), (W / 2 + 0.45, -D / 2 - 0.45), (-W / 2 - 0.45, D / 2 + 0.45), (W / 2 + 0.45, D / 2 + 0.45)):
        p.cyl((x, y, 0.5), 0.09, 1.0, "yellow", segs=10)
        for z in (0.35, 0.75):
            p.cyl((x, y, z), 0.093, 0.12, "black", segs=10)
    p.box((-0.2, -D / 2 - 0.03, 1.55), (0.5, 0.03, 0.36), "yellow", seg=0)                 # DANGER plate
    p.box((-0.2, -D / 2 - 0.05, 1.55), (0.3, 0.02, 0.2), "black", seg=0, jitter=0)
    p.to_object(mats, parent=rt)


def dock(p, rt, mats):
    W, D = 5.0, 3.4
    p.box((0, 0, 0.09), (W, D, 0.18), "#6e5a42", seg=0, dirt=0.3)
    for k in range(18):
        x = -W / 2 + (k + 0.5) * W / 18
        p.box((x, 0, 0.185), (W / 18 - 0.015, D - 0.04, 0.015), "wood", seg=0, jitter=0.12, dirt=0.3)
    for k in range(12):                                                                 # yellow and black edge
        y = -D / 2 + (k + 0.5) * D / 12
        p.box((W / 2 - 0.08, y, 0.2), (0.16, D / 12, 0.02), "yellow" if k % 2 else "black", seg=0, jitter=0)
    for y in (-1.1, 1.1):                                                               # rubber bumpers
        p.box((W / 2 + 0.08, y, 0.55), (0.18, 0.4, 0.5), "rubber", seg=0)
        p.box((W / 2 - 0.05, y, 0.55), (0.12, 0.6, 0.8), "wood_dark", seg=0)
    for y in (-D / 2 + 0.1, D / 2 - 0.1):                                               # side rails
        for x in (-W / 2 + 0.2, 0, W / 2 - 0.5):
            p.box((x, y, 0.65), (0.1, 0.1, 0.9), "wood_dark", seg=0)
        p.box((-0.15, y, 1.05), (W - 0.6, 0.08, 0.08), "wood_dark", seg=0)
    p.to_object(mats, parent=rt)


def skip(p, rt, mats):
    p.prism([(-1.6, 0.1), (1.6, 0.1), (2.0, 1.2), (-2.0, 1.2)], 1.8, "#b88a2a", plane="XZ", dirt=0.45)
    p.prism([(-1.5, 0.25), (1.5, 0.25), (1.88, 1.15), (-1.88, 1.15)], 1.6, "#3a2c20", plane="XZ")
    for x in (-1.2, 1.2):
        p.box((x, 0, 0.06), (0.25, 1.8, 0.12), SD, METAL, seg=0)
    for k in range(9):
        a = k * 37
        p.box((-1.3 + (k % 5) * 0.62, -0.5 + (k % 3) * 0.45, 1.25 + (k % 2) * 0.08), (1.6, 0.16, 0.05), "wood" if k % 2 else "wood_dark", rot=(k * 7, -8 + k * 3, a), seg=0, jitter=0.12)
    for x in (-1.0, 0.9):
        p.cyl((x, -0.95, 0.7), 0.1, 0.06, RUST, METAL, axis="Y", segs=10)
    p.to_object(mats, parent=rt)


def firstaid(p, rt, mats):
    for x in (-0.6, 0.6):
        p.box((x, 0, 0.9), (0.08, 0.08, 1.8), "wood_dark", seg=0)
    p.box((0, -0.05, 1.45), (1.4, 0.05, 0.9), "#2f6b3a", seg=0, dirt=0.2)
    p.box((0, -0.08, 1.48), (0.36, 0.02, 0.12), "#f4efe6", seg=0, jitter=0)
    p.box((0, -0.08, 1.48), (0.12, 0.02, 0.36), "#f4efe6", seg=0, jitter=0)
    p.box((0, -0.08, 1.15), (1.1, 0.02, 0.12), "#f4efe6", seg=0, jitter=0)
    p.box((0, -0.08, 1.8), (1.1, 0.02, 0.12), "#f4efe6", seg=0, jitter=0)
    p.to_object(mats, parent=rt)


def corr_fence(p, rt, mats):
    for x in (-1.2, 1.2):
        p.box((x, 0.08, 0.95), (0.12, 0.12, 1.9), "wood_dark", seg=0)
    for z in (0.35, 1.5):
        p.box((0, 0.08, z), (2.5, 0.06, 0.1), "wood_dark", seg=0)
    for k in range(13):
        x = -1.2 + (k + 0.5) * 2.4 / 13
        p.box((x, 0, 0.95), (0.17, 0.05, 1.8), RUST if k % 4 else RUST2, METAL, seg=0, jitter=0.1, dirt=0.3, rot=(0, 0, 0))
        p.box((x + 0.08, -0.02, 0.95), (0.025, 0.03, 1.78), "#5e4430", METAL, seg=0, jitter=0)
    p.to_object(mats, parent=rt)


def bollard(p, rt, mats):
    p.cyl((0, 0, 0.5), 0.09, 1.0, "yellow", segs=12)
    for z in (0.3, 0.7):
        p.cyl((0, 0, z), 0.094, 0.13, "black", segs=12)
    p.to_object(mats, parent=rt)



# ------------------------------------------------------------------------------------------------- workshop (build 0.16b)
def workshop(p, rt, mats):
    """Grandfather's brick workshop from the level 1 concept: brick walls with darker coursing, a big open door on the
    south side with a lamp over it, warm lit windows, a gabled tin roof with holes in it and a tall chimney."""
    W, D, H, R = 14.0, 8.0, 4.0, 6.1
    hx, hy = W / 2, D / 2
    BR, BR_D, MORTAR = "#9a4a35", "#7d3a2a", "#6a5a4c"
    p.box((0, 0, 0.04), (W - 0.2, D - 0.2, 0.08), "concrete", seg=0, dirt=0.3)                    # floor slab
    def wall(x0, x1, y0, y1, z0, z1):
        p.box(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (x1 - x0, y1 - y0, z1 - z0), BR, seg=0, dirt=0.35, jitter=0.06)
        n = int((z1 - z0) / 0.32)
        for k in range(1, n + 1):                                                                   # coursing
            z = z0 + k * (z1 - z0) / (n + 1)
            if x1 - x0 > y1 - y0:
                p.box(((x0 + x1) / 2, y0 - 0.016, z), (x1 - x0, 0.012, 0.025), MORTAR, seg=0, jitter=0)
                p.box(((x0 + x1) / 2, y1 + 0.016, z), (x1 - x0, 0.012, 0.025), MORTAR, seg=0, jitter=0)
            else:
                p.box((x0 - 0.016, (y0 + y1) / 2, z), (0.012, y1 - y0, 0.025), MORTAR, seg=0, jitter=0)
                p.box((x1 + 0.016, (y0 + y1) / 2, z), (0.012, y1 - y0, 0.025), MORTAR, seg=0, jitter=0)
    T = 0.3
    wall(-hx, hx, hy - T, hy, 0, H)                                                                 # back
    for sx in (-1, 1):                                                                              # sides + gables
        x0, x1 = (-hx, -hx + T) if sx < 0 else (hx - T, hx)
        wall(x0, x1, -hy, hy, 0, H)
        for k in range(8):
            yk = -hy + (k + 0.5) * D / 8
            top = H + (R - H) * (1 - abs(yk) / hy)
            p.box(((x0 + x1) / 2, yk, (H + top) / 2), (T, D / 8 + 0.01, top - H), BR, seg=0, jitter=0.05, dirt=0.25)
        # a lit window in each side wall
        p.box((sx * (hx + 0.01), 0.6, 2.0), (0.04, 1.3, 1.2), "#2c2f33", seg=0)
        p.box((sx * (hx + 0.03), 0.6, 2.0), (0.02, 1.15, 1.05), "lamp", LAMP, seg=0)
    # front: a low stub stays when the front fades; the door gap in the middle
    for x0, x1 in ((-hx, -1.8), (1.8, hx)):
        wall(x0, x1, -hy, -hy + T, 0, 1.0)
    # back windows (lit), with stone sills
    for x in (-4.5, 0.0, 4.5):
        p.box((x, hy + 0.01, 2.2), (1.4, 0.04, 1.3), "#2c2f33", seg=0)
        p.box((x, hy + 0.03, 2.2), (1.25, 0.02, 1.15), "lamp", LAMP, seg=0)
        p.box((x, hy + 0.08, 1.52), (1.6, 0.16, 0.08), "#a9a49a", seg=0)
    # chimney at the back-left, through the roof
    p.box((-4.6, hy - 1.0, 4.2), (0.9, 0.9, 8.4), BR_D, seg=0, dirt=0.4, jitter=0.05)
    for k in range(12):
        p.box((-4.6, hy - 1.0 - 0.466, 0.4 + k * 0.66), (0.9, 0.012, 0.025), MORTAR, seg=0, jitter=0)
    p.box((-4.6, hy - 1.0, 8.45), (1.05, 1.05, 0.12), "#6d6a63", seg=0)
    p.cyl((-4.6, hy - 1.0, 8.62), 0.16, 0.24, "#7d3a2a", segs=10)
    # downpipes, gutters
    for sy in (-1, 1):
        p.cyl((0, sy * (hy + 0.38), H - 0.05), 0.07, W + 0.6, "#3a3d41", METAL, axis="X", segs=8)
    for sx in (-1, 1):
        p.cyl((sx * (hx + 0.15), -(hy + 0.38), H / 2), 0.05, H, "#3a3d41", METAL, segs=8)
    # a few old crates and a barrel by the wall, a bench under the side window
    for x, y, z in ((hx + 0.5, -2.6, 0.25), (hx + 0.5, -2.0, 0.25), (hx + 0.5, -2.3, 0.75)):
        p.box((x, y, z), (0.5, 0.5, 0.5), "wood", bevel=0.01, dirt=0.3, jitter=0.08)
    p.cyl((-hx - 0.5, -2.8, 0.45), 0.32, 0.9, "#5d6b3a", METAL, segs=14, dirt=0.4)
    p.to_object(mats, parent=rt)

    rf = Part("ws_roof", seed=1501)
    for sy in (-1, 1):
        # three runs per slope; the middle run on the front slope has two sheets missing (holes in the roof)
        for k, (a, b2) in enumerate(((-hx - 0.4, -2.6), (-2.6, 2.6), (2.6, hx + 0.4))):
            corrugated(rf, a, b2, sy * (hy + 0.45), 0, H - 0.05, R + 0.02, tint="#4f555b" if (k + (sy > 0)) % 2 else "#5d5a55", ribs_every=0.32)
    rf.box((0, 0, R + 0.08), (W + 0.9, 0.34, 0.1), "#5b6168", METAL, seg=0)
    rf.to_object(mats, parent=rt)

    fr = Part("ws_front", seed=1502)
    y = -hy + T / 2
    def fwall(x0, x1, z0, z1):
        fr.box(((x0 + x1) / 2, y, (z0 + z1) / 2), (x1 - x0, T, z1 - z0), BR, seg=0, dirt=0.35, jitter=0.06)
        n = int((z1 - z0) / 0.32)
        for k in range(1, n + 1):
            fr.box(((x0 + x1) / 2, -hy - 0.016, z0 + k * (z1 - z0) / (n + 1)), (x1 - x0, 0.012, 0.025), MORTAR, seg=0, jitter=0)
    fwall(-hx, -1.8, 1.0, H); fwall(1.8, hx, 1.0, H); fwall(-1.8, 1.8, 2.8, H)
    fr.box((0, -hy - 0.02, 2.76), (3.9, 0.36, 0.12), "#6d6a63", seg=0)                              # lintel
    for x in (-4.6, 4.6):                                                                          # lit front windows
        fr.box((x, -hy - 0.01, 2.1), (1.9, 0.04, 1.4), "#2c2f33", seg=0)
        fr.box((x, -hy - 0.03, 2.1), (1.75, 0.02, 1.25), "lamp", LAMP, seg=0)
        for k in (-0.5, 0, 0.5):
            fr.box((x + k * 0.6, -hy - 0.05, 2.1), (0.05, 0.02, 1.25), "#2c2f33", seg=0, jitter=0)
        fr.box((x, -hy - 0.06, 2.1), (1.75, 0.02, 0.05), "#2c2f33", seg=0, jitter=0)
        fr.box((x, -hy - 0.1, 1.36), (2.1, 0.18, 0.08), "#a9a49a", seg=0)
    fr.box((0, -hy - 0.12, 3.2), (4.6, 0.08, 0.5), "#3a2b20", bevel=0.015)                          # sign board
    fr.to_object(mats, parent=rt)
    anchor("sign_spot", (0, -hy - 0.17, 3.2), rt)
    anchor("smoke", (-4.6, hy - 1.0, 8.8), rt)


def canopy(p, rt, mats):
    """The loading bay roof from the concept: timber posts, a shingled lean-to roof, a hazard barrier on one side."""
    W, D, Hf, Hb = 7.2, 5.6, 3.3, 3.9
    hx, hy = W / 2, D / 2
    for x in (-hx, 0, hx):
        for y in (-hy, hy):
            h = Hf if y < 0 else Hb
            p.box((x, y, h / 2), (0.24, 0.24, h), "wood_dark", seg=0, dirt=0.3, jitter=0.05)
            p.box((x, y, 0.06), (0.4, 0.4, 0.12), "concrete", seg=0)
    for y, h in ((-hy, Hf), (hy, Hb)):
        p.box((0, y, h + 0.1), (W + 0.4, 0.2, 0.24), "wood_dark", seg=0, jitter=0.05)
    for x in (-hx, 0, hx):
        p.beam((x, -hy, Hf + 0.15), (x, hy, Hb + 0.15), 0.16, "wood_dark")
    # hazard barrier along the west side, a timber screen along the east side
    p.box((-hx - 0.1, 0, 0.5), (0.1, D - 0.6, 0.8), "yellow", seg=0, dirt=0.25)
    for k in range(9):
        p.box((-hx - 0.16, -hy + 0.5 + k * 0.6, 0.5), (0.02, 0.24, 0.8), "black", rot=(30, 0, 0), seg=0, jitter=0)
    planks(p, -hy + 0.3, hy - 0.3, hx + 0.1, 0.0, 1.6, "#6e4a2c", face="X")
    p.to_object(mats, parent=rt)
    rf = Part("canopy_roof", seed=1601)
    run = math.hypot(D + 0.8, Hb - Hf)
    ang = math.degrees(math.atan2(Hb - Hf, D + 0.8))
    rows = 9
    for k in range(rows):                                                                          # overlapping shingle rows
        t = (k + 0.5) / rows
        yy, zz = -hy - 0.4 + t * (D + 0.8), Hf + 0.3 + t * (Hb - Hf) + (rows - k) * 0.018
        for j in range(12):
            xx = -hx - 0.3 + (j + 0.5 + (k % 2) * 0.5) * (W + 0.6) / 12.5
            rf.box((xx, yy, zz + (j % 2) * 0.004), ((W + 0.6) / 12.5 - 0.02, run / rows + 0.08, 0.05), "#5a4535" if (j + k) % 3 else "#6b5240", rot=(ang, 0, 0), seg=0, jitter=0.12, dirt=0.3)
    rf.to_object(mats, parent=rt)


def plank_fence(p, rt, mats):
    """The concept's weathered fence: 2.4 m of vertical boards on two rails between square posts."""
    for x in (-1.2, 1.2):
        p.box((x, 0.04, 0.95), (0.13, 0.13, 1.9), "#5a4632", seg=0, dirt=0.35)
        p.box((x, 0.04, 1.93), (0.17, 0.17, 0.05), "#4a3828", seg=0)
    for z in (0.45, 1.4):
        p.box((0, 0.07, z), (2.4, 0.05, 0.1), "#6a5038", seg=0, jitter=0.05)
    n = 15
    for k in range(n):
        x = -1.12 + (k + 0.5) * 2.24 / n
        h = 1.62 + ((k * 37) % 7) * 0.025
        p.box((x, 0.0, h / 2), (2.24 / n - 0.018, 0.035, h), "#8a7058" if k % 3 else "#7a6048", seg=0, jitter=0.14, dirt=0.4)
        p.prism([(x - 0.07, h), (x + 0.07, h), (x, h + 0.07)], 0.035, "#8a7058", plane="XZ", offset=0.0)
    p.to_object(mats, parent=rt)


ITEMS = {"site_plank_fence": plank_fence, "site_workshop": workshop, "site_canopy": canopy, "site_barn": barn, "site_office": office, "site_shed": shed, "site_water_tower": water_tower, "site_rail": rail,
         "site_crossing": crossing, "site_gen_cage": gen_cage, "site_dock": dock, "site_skip": skip,
         "site_firstaid": firstaid, "site_corr_fence": corr_fence, "site_bollard": bollard}


def build(mats):
    container = root("site")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 4) * SPACING, -(i // 4) * SPACING, 0)
        p = Part(name + "_mesh", seed=1100 + i)
        fn(p, rt, mats)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 390, "before_export": before_export,
                       "bake": {"distance": 0.6, "samples": 48}}
