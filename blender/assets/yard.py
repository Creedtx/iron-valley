"""Yard kit (build 0.17): the electricity board's pole transformer, the raised loading dock, and the rust and
weeds that make the yard look lived in. Same conventions as site.py: the camera side is Blender -Y."""
import math

import bpy

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

SPACING = 12.0
def transformer(p, rt, mats):
    """The Valley Electricity Board's pole transformer (1973): an H-frame of two creosoted poles, the supply
    crossarm with porcelain pin insulators on top, drop-out fuses on a lower arm, and a grey oil-filled tank
    with cooling fins on a platform. A main-switch cabinet with a meter window stands between the pole feet.
    Nodes: 'xf_tank' (tank, bushings and fuses: hidden until the board's crew fits it), 'xf_lamp' (the cabinet's
    supply lamp, driven by the game). Anchor: 'sign_spot' (the danger plate)."""
    POLE, TAR = "#4a3a2a", "#3b2f24"
    for x in (-1.1, 1.1):
        p.cyl((x, 0, 4.25), 0.15, 8.5, POLE, segs=10, radius2=0.12, dirt=0.35)
        p.cyl((x, 0, 0.35), 0.17, 0.7, TAR, segs=10)                                                # tarred foot
        p.box((x, -0.16, 2.7), (0.36, 0.04, 0.35), "#2a2620", seg=0)                                # anti-climb band
        for k in range(5):
            p.box((x, -0.18, 2.56 + k * 0.07), (0.38, 0.02, 0.012), "#8d939a", METAL, seg=0, jitter=0)
    # crossarms
    p.box((0, 0, 8.05), (3.4, 0.16, 0.16), "wood_dark", seg=0, dirt=0.3)                             # supply arm
    p.box((0, 0, 6.55), (3.0, 0.14, 0.14), "wood_dark", seg=0, dirt=0.3)                             # fuse arm
    for x in (-1.1, 1.1):                                                                          # braces
        p.beam((x, 0, 7.6), (x * 0.25, 0, 8.0), 0.06, "#5b6168")
    for x in (-1.3, 0.0, 1.3):                                                                     # pin insulators
        p.cyl((x, 0, 8.22), 0.035, 0.2, "#5b6168", METAL, segs=6)
        for k in range(3):
            p.cyl((x, 0, 8.3 + k * 0.07), 0.09 - k * 0.012, 0.05, "#e9e4d6", segs=12)
    # platform
    for y in (-0.42, 0.42):
        p.box((0, y, 4.15), (2.6, 0.12, 0.14), "wood_dark", seg=0, dirt=0.3)
    for k in range(9):
        p.box((-1.0 + k * 0.25, 0, 4.24), (0.18, 0.95, 0.04), "#6e5a42", seg=0, jitter=0.1, dirt=0.4)
    # cable down the left pole in a steel conduit, into the cabinet
    p.cyl((-0.92, -0.12, 2.15), 0.05, 3.9, "#5b6168", METAL, segs=8)
    p.box((-0.6, -0.42, 0.6), (0.7, 0.08, 0.08), "#5b6168", METAL, seg=0)
    # main switch cabinet with a meter window and a danger plate
    p.box((0, -0.5, 0.62), (0.75, 0.4, 1.1), "#6f7a76", METAL, bevel=0.02, dirt=0.35)
    p.box((0, -0.5, 1.2), (0.82, 0.46, 0.06), "#5b6168", METAL, seg=0)
    p.box((0, -0.705, 0.82), (0.32, 0.02, 0.18), "#d9d6c8", seg=0)                                    # meter window
    p.box((0.25, -0.71, 0.5), (0.04, 0.03, 0.22), "#2c2f33", METAL, seg=0)                            # switch handle
    p.box((0, -0.12, 2.15), (0.5, 0.03, 0.36), "#f2efe6", seg=0)                                       # danger plate
    p.box((0, -0.135, 2.24), (0.46, 0.01, 0.1), "red", seg=0, jitter=0)
    p.box((0, -0.135, 2.06), (0.4, 0.01, 0.05), "black", seg=0, jitter=0)
    p.box((0, -0.06, 2.15), (0.06, 0.06, 0.4), "wood_dark", seg=0)                                     # plate post
    p.box((-0.5, -0.12, 2.15), (0.9, 0.04, 0.06), "wood_dark", seg=0)
    p.to_object(mats, parent=rt)
    anchor("sign_spot", (0, -0.15, 2.15), rt)

    t = Part("xf_tank", seed=1701)
    GREY = "#7e8a86"
    t.cyl((0, 0, 4.85), 0.46, 1.1, GREY, METAL, segs=20, dirt=0.25)
    t.cyl((0, 0, 5.44), 0.5, 0.08, "#6c7774", METAL, segs=20)
    for k in range(14):                                                                            # cooling fins
        a = k * 2 * math.pi / 14
        t.box((0.56 * math.cos(a), 0.56 * math.sin(a), 4.8), (0.16, 0.025, 0.85), GREY, METAL, rot=(0, 0, math.degrees(a)), seg=0, jitter=0)
    for x in (-0.22, 0.0, 0.22):                                                                    # HV bushings
        for k in range(4):
            t.cyl((x, 0.12, 5.55 + k * 0.08), 0.06 - k * 0.006, 0.06, "#e9e4d6", segs=10)
        t.beam((x, 0.12, 5.9), (x * 5.9, 0, 6.6), 0.016, "#1d1d1d")                                # up to the fuses
    t.box((0, -0.47, 5.0), (0.3, 0.02, 0.2), "#d9d6c8", seg=0)                                        # rating plate
    for x in (-1.3, 0.0, 1.3):                                                                     # drop-out fuses
        t.cyl((x, 0, 6.72), 0.05, 0.2, "#e9e4d6", segs=8)
        t.cyl((x, -0.05, 6.95), 0.025, 0.32, "#3a3d41", METAL, segs=6, rot=(12, 0, 0))
        t.beam((x, 0, 7.1), (x, 0, 8.18), 0.015, "#1d1d1d")
    t.cyl((0.35, 0.0, 4.6), 0.05, 0.3, "#5b6168", METAL, segs=8, axis="X")                            # LV cable box
    t.to_object(mats, parent=rt)
    lp = Part("xf_lamp", seed=1702)
    lp.dome((0.24, -0.5, 1.24), 0.07, "lamp", LAMP)
    lp.to_object(mats, parent=rt)


def loading_dock(p, rt, mats):
    """A raised concrete side-loading dock (1973) for the stake-bed lorry: the lorry pulls up along the dock face
    (-Y) and the loaders hand crates over its side boards. Deck at the bed's height, a steel edge with yellow and
    black paint, two rubber bumpers, a concrete ramp with kerbs and a rail down the back (+Y), a swing-arm dock lamp.
    Node: 'dock_lamp' (lamp head, driven by the game). Anchors: 'drop_spot', 'ramp_spot' (foot of the ramp)."""
    W, D, H = 5.0, 2.0, 0.95
    hx, hy = W / 2, D / 2
    CON, CON_D = "#8a867c", "#6d6a63"
    p.box((0, 0, H / 2), (W, D, H), CON, seg=0, dirt=0.35, jitter=0.03)
    p.box((0, -hy + 0.02, 0.12), (W + 0.02, 0.06, 0.24), CON_D, seg=0, dirt=0.5)                       # kerb stain
    for k in range(1, 4):                                                                           # deck joints
        p.box((-hx + k * W / 4, 0, H + 0.003), (0.02, D - 0.1, 0.006), "#5d5a52", seg=0, jitter=0)
    p.box((0, -hy - 0.02, H - 0.06), (W, 0.06, 0.12), "#5b6168", METAL, seg=0)                         # steel edge angle
    for k in range(20):                                                                             # hazard paint
        p.box((-hx + (k + 0.5) * W / 20, -hy + 0.12, H + 0.004), (W / 20, 0.18, 0.006), "yellow" if k % 2 else "black", seg=0, jitter=0)
    for x in (-1.6, 1.6):                                                                           # rubber bumpers
        p.box((x, -hy - 0.11, 0.62), (0.42, 0.18, 0.42), "rubber", seg=0)
        for k in range(3):
            p.box((x, -hy - 0.205, 0.5 + k * 0.12), (0.4, 0.01, 0.03), "#2a2a2a", seg=0, jitter=0)
    # a concrete ramp down the back (hand trucks and sack barrows, later pallet trucks): 4.5 m long, about 1 in 4.7,
    # anti-slip grooves, concrete kerbs with yellow edges, steel nosing at the top and the toe, a rail on the open side
    RL, RW, RX = 4.5, 1.6, 1.2
    ang = math.degrees(math.atan2(H, RL)); slope = math.hypot(RL, H)
    p.prism([(hy, 0), (hy + RL, 0), (hy, H)], RW, CON, plane="YZ", offset=RX, dirt=0.35)
    for k in range(1, 15):                                                                          # grooves across the slope
        t = k / 15; y = hy + RL * t; z = H * (1 - t)
        p.box((RX, y, z + 0.004), (RW - 0.12, 0.035, 0.012), "#5d5a52", rot=(-ang, 0, 0), seg=0, jitter=0)
    for sx in (-1, 1):                                                                               # kerbs
        x = RX + sx * (RW / 2 + 0.06)
        p.prism([(hy, 0), (hy + RL, 0), (hy + RL, 0.12), (hy, H + 0.12)], 0.12, CON_D, plane="YZ", offset=x, dirt=0.4)
        p.box((x, hy + RL / 2, H / 2 + 0.122), (0.125, slope, 0.012), "yellow", rot=(-ang, 0, 0), seg=0, jitter=0)
    p.box((RX, hy + 0.12, H + 0.006), (RW, 0.24, 0.012), "#5b6168", METAL, seg=0)                      # nosing at the top
    p.box((RX, hy + RL - 0.1, 0.006), (RW, 0.2, 0.012), "#5b6168", METAL, seg=0)                        # toe plate
    rx = RX + RW / 2 + 0.12                                                                          # rail on the north side
    for t in (0.08, 0.5, 0.92):
        y = hy + RL * t; z = H * (1 - t)
        p.cyl((rx, y, z + 0.5), 0.028, 1.0, "yellow", METAL, segs=8)
    p.beam((rx, hy + RL * 0.08, H * 0.92 + 1.0), (rx, hy + RL * 0.92, H * 0.08 + 1.0), 0.04, "yellow")
    p.beam((rx, hy + RL * 0.08, H * 0.92 + 0.55), (rx, hy + RL * 0.92, H * 0.08 + 0.55), 0.03, "yellow")
    # swing-arm dock lamp at one end of the face
    p.cyl((hx - 0.2, -hy + 0.25, H + 1.1), 0.05, 2.2, "#3a3d41", METAL, segs=8)
    p.beam((hx - 0.2, -hy + 0.25, H + 2.15), (hx - 0.6, -hy - 0.3, H + 2.05), 0.04, "#3a3d41")
    # empty pallets at one end, a sack barrow at the other
    p.box((-hx + 0.75, hy - 0.5, H + 0.07), (1.0, 0.8, 0.14), "wood", seg=0, jitter=0.1, dirt=0.3)
    p.box((-hx + 0.75, hy - 0.5, H + 0.21), (1.0, 0.8, 0.14), "wood_dark", seg=0, jitter=0.1, dirt=0.3)
    bx = -0.55
    p.box((bx - 0.15, hy - 0.3, H + 0.65), (0.06, 0.06, 1.2), "red", METAL, rot=(-12, 0, 0), seg=0)
    p.box((bx + 0.15, hy - 0.3, H + 0.65), (0.06, 0.06, 1.2), "red", METAL, rot=(-12, 0, 0), seg=0)
    p.box((bx, hy - 0.45, H + 0.08), (0.42, 0.3, 0.03), "#5b6168", METAL, seg=0)
    p.cyl((bx, hy - 0.2, H + 0.12), 0.11, 0.42, "rubber", axis="X", segs=12)
    p.to_object(mats, parent=rt)
    lm = Part("dock_lamp", seed=1802)
    lm.cyl((hx - 0.6, -hy - 0.3, H + 1.92), 0.18, 0.26, "#3a3d41", METAL, segs=14, radius2=0.08)
    lm.dome((hx - 0.6, -hy - 0.3, H + 1.79), 0.12, "lamp", LAMP, scale=(1, 1, -0.6))
    lm.to_object(mats, parent=rt)
    anchor("drop_spot", (-0.4, -hy + 0.45, H), rt)
    anchor("ramp_spot", (RX, hy + RL + 0.5, 0), rt)


def weeds(p, rt, mats):
    """A clump of yard weeds for wall feet and fence lines: rank grass, dock leaves, a nettle stand, a few
    dandelion heads. About 1.2 x 0.6 m."""
    import random
    r = random.Random(1901)
    G = ["#5f7a32", "#6f8a3a", "#4f6a2c", "#7d8f45", "#566e30"]
    for k in range(26):                                                                             # grass blades
        x, y = r.uniform(-0.6, 0.6), r.uniform(-0.28, 0.28); h = r.uniform(0.25, 0.6)
        p.box((x, y, h / 2), (0.035, 0.012, h), r.choice(G), rot=(r.uniform(-25, 25), r.uniform(-25, 25), r.uniform(0, 180)), seg=0, jitter=0)
    for k in range(5):                                                                              # dock leaves
        x, y = r.uniform(-0.45, 0.45), r.uniform(-0.2, 0.2)
        p.sphere((x, y, 0.1), 0.16, r.choice(G[1:]), scale=(1.4, 0.7, 0.18), rot=(r.uniform(-20, 20), 0, r.uniform(0, 180)), segs=(8, 4))
    for k in range(3):                                                                              # nettles
        x = r.uniform(-0.4, 0.4)
        p.cyl((x, 0.05, 0.35), 0.012, 0.7, "#4f6a2c", segs=5)
        for j in range(4):
            p.sphere((x, 0.05, 0.2 + j * 0.13), 0.07, "#46622a", scale=(1.3, 0.5, 0.35), rot=(0, 0, j * 90), segs=(6, 3))
    for k in range(3):                                                                              # dandelions
        x, y = r.uniform(-0.5, 0.5), r.uniform(-0.2, 0.2)
        p.cyl((x, y, 0.16), 0.008, 0.32, "#6f8a3a", segs=4)
        p.sphere((x, y, 0.33), 0.035, "#e3c02a" if k % 2 else "#eeeae0", segs=(6, 4))
    p.to_object(mats, parent=rt)


def ivy(p, rt, mats):
    """Ivy climbing a wall from the ground: a flat spray of leaf clusters on the -Y face, 1.6 m wide, 2.4 m
    tall. Place it against a wall facing the camera."""
    import random
    r = random.Random(1911)
    G = ["#3f5a2a", "#4d6a30", "#36502a", "#5a7436"]
    for k in range(70):
        u = r.random(); x = r.uniform(-0.8, 0.8) * (1.0 - 0.45 * u); z = 0.1 + u * 2.3
        p.sphere((x, -0.04 - r.uniform(0, 0.05), z), r.uniform(0.07, 0.13), r.choice(G), scale=(1.2, 0.35, 1.0), segs=(6, 3))
    for k in range(5):                                                                              # stems
        x0 = r.uniform(-0.5, 0.5)
        p.beam((x0, -0.03, 0.0), (x0 + r.uniform(-0.4, 0.4), -0.03, r.uniform(1.4, 2.3)), 0.018, "#4a3a2a")
    p.to_object(mats, parent=rt)


def rust_heap(p, rt, mats):
    """Rusty scrap against a wall: corrugated sheets leaning on it, an old cart wheel, a length of pipe, a
    flattened drum and a coil of wire. About 2.4 x 1.2 m; the wall side is +Y."""
    for k, (x, ang, tint) in enumerate(((-0.8, 18, "#7c5a3c"), (-0.35, 22, "#8f6440"), (0.2, 15, "#6e4a30"))):
        for j in range(7):
            p.box((x + (j - 3) * 0.1, 0.25 + 0.05 * (j % 2), 0.9), (0.05 + 0.03 * (j % 2), 0.02, 1.8), tint, METAL, rot=(ang, 0, 0), seg=0, jitter=0.04, dirt=0.6)
    p.cyl((0.85, 0.15, 0.55), 0.55, 0.08, "#5a3f2a", METAL, axis="Y", segs=16, rot=(14, 0, 0), dirt=0.6)            # cart wheel
    p.cyl((0.85, 0.15, 0.55), 0.12, 0.14, "#4a3424", METAL, axis="Y", segs=10, rot=(14, 0, 0))
    for k in range(8):
        a = k * 45
        p.box((0.85, 0.15, 0.55), (0.04, 0.05, 1.0), "#5a3f2a", METAL, rot=(14, a, 0), seg=0, jitter=0)
    p.cyl((-0.2, -0.35, 0.1), 0.09, 2.0, "#6e4a30", METAL, axis="X", segs=10, dirt=0.6)                          # pipe
    p.cyl((1.4, -0.3, 0.2), 0.3, 0.4, "#7c5a3c", METAL, segs=14, rot=(90, 0, 30), dirt=0.7)                       # drum on its side
    for k in range(4):                                                                                       # wire coil
        p.cyl((-1.1, -0.3, 0.06 + k * 0.03), 0.28 - k * 0.01, 0.02, "#5b4a3a", METAL, segs=14, caps=False)
    p.to_object(mats, parent=rt)


ITEMS = {"site_transformer": transformer, "site_loading_dock": loading_dock, "site_weeds": weeds, "site_ivy": ivy, "site_rust_heap": rust_heap}


def build(mats):
    container = root("yard")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 3) * SPACING, -(i // 3) * SPACING, 0)
        p = Part(name + "_mesh", seed=2100 + i)
        fn(p, rt, mats)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 200, "before_export": before_export,
                       "bake": {"distance": 0.6, "samples": 48}}
