"""Level 1 set dressing: office, break room, workshop, yard and street.

One file, one root node per item (all at the origin in the GLB), so the game
clones or instances them. Asset space: metres, Z up, front faces -Y (the
camera side). In three.js the front is +Z.
"""
import math

import bpy

from ivlib.geo import LAMP, METAL, PAINT, Part
from ivlib.scene import root

SPACING = 2.6


# ------------------------------------------------------------------ office
def desk(p):
    w, d, h = 1.4, 0.7, 0.74
    p.box((0, 0, h - 0.025), (w, d, 0.05), "wood_dark", bevel=0.01, seg=0)
    for x in (-1, 1):  # drawer pedestals
        p.box((x * 0.5, 0, (h - 0.05) / 2), (0.38, d - 0.04, h - 0.05), "wood", bevel=0.008, seg=0)
        for k in range(3):
            z = 0.12 + k * 0.21
            p.box((x * 0.5, -d / 2 + 0.005, z), (0.32, 0.01, 0.17), "wood_dark", seg=0, jitter=0.02)
            p.box((x * 0.5, -d / 2 - 0.008, z + 0.04), (0.08, 0.012, 0.015), "brass", METAL, seg=0, jitter=0)
    p.box((0, d / 2 - 0.03, 0.4), (0.62, 0.02, 0.6), "wood", seg=0)  # modesty panel
    # typewriter
    p.box((0.05, -0.05, h + 0.06), (0.36, 0.28, 0.1), "#2f3a33", bevel=0.02, seg=0)
    p.box((0.05, 0.06, h + 0.13), (0.38, 0.08, 0.05), "#2f3a33", bevel=0.01, seg=0)
    p.cyl((0.05, 0.06, h + 0.17), 0.03, 0.42, "black", axis="X", segs=8)
    p.box((0.05, 0.08, h + 0.24), (0.22, 0.01, 0.16), "paper", seg=0, rot=(-15, 0, 0))
    for r in range(3):
        for c in range(7):
            p.box((-0.07 + c * 0.04, -0.12 + r * 0.035, h + 0.115 + r * 0.008), (0.026, 0.026, 0.01), "#d9d0b8", seg=0, jitter=0)
    # telephone, lamp, papers, mug
    p.box((-0.45, -0.08, h + 0.04), (0.18, 0.2, 0.08), "black", bevel=0.02, seg=0)
    p.box((-0.45, -0.08, h + 0.1), (0.2, 0.06, 0.04), "black", bevel=0.015, seg=0)
    p.cyl((-0.45, -0.14, h + 0.081), 0.05, 0.005, "paper", segs=12, smooth=False)
    p.cyl((0.55, 0.15, h + 0.01), 0.07, 0.02, "brass", METAL, segs=12)
    p.beam((0.55, 0.15, h + 0.02), (0.5, 0.1, h + 0.32), 0.018, "brass", METAL)
    p.cyl((0.46, 0.06, h + 0.32), 0.11, 0.1, "#2e6b4a", segs=12, radius2=0.05, rot=(25, 0, 0))
    for k in range(4):
        p.box((-0.15 + k * 0.004, 0.18, h + 0.005 + k * 0.006), (0.22, 0.3, 0.005), "paper", seg=0, rot=(0, 0, k * 4))
    p.cyl((0.4, -0.2, h + 0.05), 0.035, 0.09, "cream", segs=10)


def office_chair(p):
    p.cyl((0, 0, 0.04), 0.04, 0.08, "black", METAL, segs=8)
    for k in range(5):
        a = k / 5 * math.tau
        p.beam((0, 0, 0.05), (math.cos(a) * 0.28, math.sin(a) * 0.28, 0.04), 0.035, "black", METAL)
        p.sphere((math.cos(a) * 0.28, math.sin(a) * 0.28, 0.03), 0.03, "black", segs=(6, 4))
    p.cyl((0, 0, 0.27), 0.025, 0.4, "chrome", METAL, segs=8)
    p.box((0, 0, 0.48), (0.48, 0.46, 0.08), "#7a3b2a", bevel=0.03, seg=0)
    p.box((0, 0.24, 0.8), (0.46, 0.08, 0.56), "#7a3b2a", bevel=0.04, seg=0, rot=(-8, 0, 0))
    for x in (-1, 1):
        p.box((x * 0.25, 0.0, 0.62), (0.04, 0.34, 0.04), "black", bevel=0.01, seg=0)


def filing_cabinet(p):
    p.box((0, 0, 0.66), (0.48, 0.6, 1.32), "#6a7560", METAL, bevel=0.015, seg=0, dirt=0.2)
    for k in range(4):
        z = 0.17 + k * 0.32
        p.box((0, -0.3, z), (0.42, 0.012, 0.28), "#7d8a72", METAL, bevel=0.006, seg=0, jitter=0.02)
        p.box((0, -0.312, z + 0.06), (0.14, 0.02, 0.025), "chrome", METAL, seg=0, jitter=0)
        p.box((0, -0.308, z - 0.04), (0.08, 0.008, 0.04), "paper", seg=0, jitter=0)


def bookshelf(p):
    w, d, h = 1.0, 0.34, 1.8
    p.box((0, 0.15, h / 2), (w, 0.03, h), "wood_dark", seg=0)
    for x in (-1, 1):
        p.box((x * (w / 2 - 0.015), 0, h / 2), (0.03, d, h), "wood_dark", seg=0)
    cols = ["#8e3b2f", "#3f6c94", "#5d6b3a", "#c9b28a", "#2f3b52", "#a87615", "#ece6d6"]
    for k in range(5):
        z = 0.02 + k * 0.42
        p.box((0, 0, z), (w - 0.06, d, 0.03), "wood", seg=0)
        if k == 4:
            continue
        x = -w / 2 + 0.06
        i = 0
        while x < w / 2 - 0.1:
            bw = 0.05 + (i * 37 % 5) * 0.012
            bh = 0.26 + (i * 13 % 4) * 0.03
            p.box((x + bw / 2, -0.02, z + 0.015 + bh / 2), (bw, 0.26, bh), cols[(i + k * 3) % len(cols)], seg=0, jitter=0.05)
            x += bw + 0.008
            i += 1
            if k == 1 and i == 6:
                x += 0.18


def plant(p):
    p.cyl((0, 0, 0.17), 0.16, 0.34, "#a8522a", segs=12, radius2=0.2)
    p.cyl((0, 0, 0.345), 0.19, 0.02, "#3a2a1e", segs=12)
    for k in range(7):
        a = k / 7 * math.tau
        r = 0.08 + (k % 3) * 0.05
        p.sphere((math.cos(a) * r, math.sin(a) * r, 0.55 + (k % 3) * 0.12), 0.14, "#4f7a3a" if k % 2 else "#3f6a32",
                 segs=(8, 6), scale=(1, 1, 0.7))


def water_cooler(p):
    p.box((0, 0, 0.45), (0.34, 0.34, 0.9), "cream", bevel=0.02, seg=0)
    p.box((0, -0.172, 0.7), (0.16, 0.01, 0.1), "steel_dark", METAL, seg=0)
    p.cyl((0, 0, 1.12), 0.15, 0.4, "#6fa6c8", segs=14)
    p.cyl((0, 0, 1.33), 0.05, 0.04, "#4f86a8", segs=10)


# -------------------------------------------------------------- break room
def bench(p):
    p.box((0, 0, 0.3), (1.6, 0.4, 0.05), "wood", bevel=0.01, seg=0)
    for x in (-0.65, 0.65):
        p.box((x, 0, 0.14), (0.06, 0.34, 0.28), "steel_dark", METAL, seg=0)


def break_table(p):
    p.box((0, 0, 0.7), (1.2, 0.7, 0.04), "#c9b28a", bevel=0.01, seg=0)
    for x in (-0.5, 0.5):
        for y in (-0.28, 0.28):
            p.cyl((x, y, 0.34), 0.025, 0.68, "chrome", METAL, segs=8)
    p.cyl((-0.2, 0.05, 0.76), 0.04, 0.09, "cream", segs=10)
    p.cyl((0.25, -0.1, 0.76), 0.04, 0.09, "#b3261e", segs=10)
    p.box((0.05, 0.15, 0.73), (0.3, 0.22, 0.02), "paper", seg=0, rot=(0, 0, 10))  # newspaper


def coffee_machine(p):
    p.box((0, 0, 0.45), (1.0, 0.55, 0.9), "#7d5530", bevel=0.015, seg=0)
    p.box((0, 0, 0.915), (1.04, 0.6, 0.04), "#d9d0b8", seg=0)
    for x in (-0.25, 0.25):
        p.box((x, -0.28, 0.45), (0.44, 0.01, 0.76), "wood_dark", seg=0, jitter=0.03)
    p.box((-0.2, 0.02, 1.15), (0.36, 0.34, 0.44), "#b3261e", METAL, bevel=0.03, seg=0)
    p.box((-0.2, -0.155, 1.2), (0.2, 0.02, 0.12), "chrome", METAL, seg=0)
    p.cyl((-0.2, -0.08, 0.97), 0.06, 0.1, "#2a1a10", segs=10, radius2=0.07)
    for k in range(3):
        p.cyl((0.18 + k * 0.1, -0.05, 0.98), 0.035, 0.09, "cream", segs=10)
    p.box((0.32, 0.12, 1.0), (0.14, 0.12, 0.16), "#c9a24a", METAL, bevel=0.01, seg=0)


def vending(p):
    p.box((0, 0, 0.9), (0.85, 0.75, 1.8), "#a8322a", METAL, bevel=0.03, seg=0, dirt=0.2)
    p.box((-0.1, -0.38, 1.0), (0.55, 0.02, 1.3), "glass", METAL, seg=0, jitter=0)
    for r in range(5):
        for c in range(4):
            p.box((-0.3 + c * 0.13, -0.33, 0.5 + r * 0.24), (0.08, 0.08, 0.14),
                  ["#e3a52a", "#3f6c94", "#ece6d6", "#5d6b3a"][(r + c) % 4], seg=0, jitter=0.05)
    p.box((0.3, -0.385, 1.2), (0.14, 0.01, 0.4), "steel_dark", METAL, seg=0)
    p.box((0, -0.38, 0.22), (0.5, 0.02, 0.16), "black", seg=0)


# --------------------------------------------------------------- workshop
def timber_rack(p):
    for x in (-0.75, 0.0, 0.75):
        p.prism([(-0.35, 0), (0.35, 0), (0.06, 1.0), (-0.06, 1.0)], 0.08, "rust", METAL, plane="YZ", offset=x)
    p.box((0, 0, 0.05), (1.7, 0.85, 0.1), "steel_dark", METAL, seg=0)


def plank(p):
    p.box((0, 0, 0.03), (1.4, 0.2, 0.06), "wood", bevel=0.006, seg=0, jitter=0.05)
    for x in (-0.35, 0.3):
        p.box((x, -0.101, 0.03), (0.04, 0.004, 0.04), "wood_dark", seg=0, jitter=0)


def workbench(p):
    p.box((0, 0, 0.82), (1.8, 0.7, 0.07), "wood_dark", bevel=0.01, seg=0, dirt=0.1)
    for x in (-0.82, 0.82):
        for y in (-0.3, 0.3):
            p.box((x, y, 0.4), (0.07, 0.07, 0.8), "steel_dark", METAL, seg=0)
    p.box((0, 0, 0.2), (1.7, 0.62, 0.03), "wood", seg=0)
    p.box((0, 0.36, 1.45), (1.8, 0.04, 1.2), "#a8794a", seg=0)  # pegboard
    for x in (-0.6, -0.2, 0.2, 0.6):  # hanging tools
        p.box((x, 0.32, 1.55), (0.05, 0.02, 0.35), "steel", METAL, seg=0)
        p.box((x, 0.31, 1.73), (0.14, 0.03, 0.06), "#b3261e" if x < 0 else "steel_dark", METAL, seg=0)
    p.cyl((0.0, 0.3, 1.2), 0.12, 0.03, "#e3a52a", axis="Y", segs=12)  # tape reel
    p.box((-0.6, -0.1, 0.95), (0.2, 0.16, 0.2), "steel_dark", METAL, bevel=0.01, seg=0)  # vice
    p.box((0.5, 0.0, 0.9), (0.4, 0.22, 0.12), "#b3261e", METAL, bevel=0.01, seg=0)  # toolbox
    p.box((0.1, -0.15, 0.87), (0.3, 0.08, 0.04), "wood", seg=0, rot=(0, 0, 20))


def hanging_lamp(p):
    p.cyl((0, 0, 1.0), 0.008, 2.0, "black", segs=4)
    p.cyl((0, 0, 0.02), 0.32, 0.22, "#2e6b4a", METAL, segs=14, radius2=0.06, caps=False)
    p.cyl((0, 0, 0.13), 0.065, 0.06, "#2e6b4a", METAL, segs=10)


def lamp_bulb(p):
    p.sphere((0, 0, 0), 0.08, "lamp", LAMP, segs=(10, 6))


def tarp_machine(p):
    pts = [(-1.2, 0), (1.2, 0), (1.15, 0.5), (0.9, 1.15), (0.2, 1.4), (-0.6, 1.3), (-1.1, 0.8)]
    p.prism(pts, 1.25, "#5d6b3a", plane="XZ", dirt=0.2)
    for x in (-0.6, 0.5):
        p.box((x, 0, 0.7), (0.03, 1.3, 1.45), "#c9b28a", seg=0, jitter=0)


def shutter(p):
    """Roller shutter for the dock opening, 3.4 m wide, rolled up."""
    p.cyl((0, 0, 3.0), 0.22, 3.5, "steel", METAL, axis="X", segs=12)
    for x in (-1.75, 1.75):
        p.box((x, 0, 1.55), (0.1, 0.18, 3.1), "steel_dark", METAL, seg=0)


# --------------------------------------------------------- yard and street
def tree_round(p):
    p.cyl((0, 0, 0.7), 0.12, 1.4, "#5a3e28", segs=8, radius2=0.08)
    for (x, y, z, r) in ((0, 0, 1.9, 0.75), (0.35, 0.2, 1.6, 0.5), (-0.4, -0.1, 1.65, 0.55), (0.1, -0.35, 2.2, 0.5)):
        p.sphere((x, y, z), r, "#4f7a3a" if r > 0.6 else "#5d8a42", segs=(10, 7))


def tree_pine(p):
    p.cyl((0, 0, 0.4), 0.11, 0.8, "#5a3e28", segs=8)
    for k, (z, r) in enumerate(((0.9, 0.85), (1.6, 0.65), (2.25, 0.42))):
        p.cyl((0, 0, z + 0.3), r, 0.8, "#3f6a32" if k % 2 else "#355e2c", segs=10, radius2=0.04)


def bush(p):
    for (x, y, r) in ((0, 0, 0.45), (0.4, 0.1, 0.32), (-0.38, 0.05, 0.35)):
        p.sphere((x, y, r * 0.7), r, "#4f7a3a", segs=(9, 6), scale=(1, 1, 0.8))


def lamp_post(p):
    p.cyl((0, 0, 0.1), 0.12, 0.2, "steel_dark", METAL, segs=10)
    p.cyl((0, 0, 2.0), 0.05, 4.0, "steel_dark", METAL, segs=8)
    p.beam((0, 0, 3.9), (0, -0.7, 4.0), 0.05, "steel_dark", METAL)
    p.box((0, -0.8, 3.95), (0.22, 0.38, 0.1), "steel_dark", METAL, bevel=0.02, seg=0)
    p.box((0, -0.8, 3.89), (0.16, 0.3, 0.02), "#fff2c8", seg=0, jitter=0)


def fence_panel(p):
    """Wooden fence, 2.4 m between post centres along X."""
    for x in (-1.2, 1.2):
        p.box((x, 0, 0.65), (0.12, 0.12, 1.3), "wood_dark", seg=0, dirt=0.2)
    for z in (0.35, 1.0):
        p.box((0, 0.07, z), (2.4, 0.04, 0.09), "wood_dark", seg=0)
    for k in range(10):
        x = -1.08 + k * 0.24
        p.box((x, 0.1, 0.6), (0.2, 0.025, 1.12 + (k % 3) * 0.04), "wood", seg=0, jitter=0.06, dirt=0.25)


def car(p):
    """A 1970s sedan, nose towards +X, 4.2 m."""
    prof = [(-2.05, 0.3), (2.05, 0.3), (2.12, 0.55), (2.0, 0.78), (1.0, 0.82), (0.55, 1.28), (-0.85, 1.3),
            (-1.35, 0.85), (-2.05, 0.8)]
    p.prism(prof, 1.7, "#3f6c94", METAL, plane="XZ", dirt=0.1)
    p.box((-0.15, -0.852, 1.05), (1.3, 0.01, 0.34), "glass", METAL, seg=0, jitter=0)
    p.box((-0.15, 0.852, 1.05), (1.3, 0.01, 0.34), "glass", METAL, seg=0, jitter=0)
    p.box((0.78, 0, 1.06), (0.02, 1.5, 0.4), "glass", METAL, seg=0, rot=(0, -45, 0), jitter=0)
    p.box((-1.1, 0, 1.08), (0.02, 1.5, 0.4), "glass", METAL, seg=0, rot=(0, 40, 0), jitter=0)
    for x in (2.13, -2.1):
        p.box((x, 0, 0.42), (0.08, 1.75, 0.12), "chrome", METAL, seg=0)
    for y in (-0.6, 0.6):
        p.cyl((2.13, y, 0.62), 0.09, 0.03, "#fff2c8", axis="X", segs=10, smooth=False)
        p.box((-2.08, y, 0.65), (0.03, 0.22, 0.1), "red", seg=0)
    for x in (1.35, -1.3):
        for y in (-0.82, 0.82):
            p.cyl((x, y, 0.33), 0.33, 0.24, "rubber", axis="Y", segs=14)
            p.cyl((x, y * 1.12, 0.33), 0.18, 0.02, "chrome", METAL, axis="Y", segs=10, smooth=False)


def dumpster(p):
    p.box((0, 0, 0.6), (1.8, 1.1, 1.1), "#3e5c3a", METAL, bevel=0.03, seg=0, dirt=0.3)
    p.box((0, 0.05, 1.2), (1.85, 1.15, 0.08), "#2f4a2c", METAL, seg=0, rot=(-6, 0, 0))
    for x in (-0.7, 0.7):
        p.cyl((x, -0.4, 0.06), 0.06, 0.05, "black", axis="X", segs=8)
        p.cyl((x, 0.4, 0.06), 0.06, 0.05, "black", axis="X", segs=8)


def power_pole(p):
    p.cyl((0, 0, 3.5), 0.12, 7.0, "#5a4632", segs=8, radius2=0.1)
    p.box((0, 0, 6.6), (1.8, 0.12, 0.12), "#5a4632", seg=0)
    for x in (-0.75, 0.0, 0.75):
        p.cyl((x, 0, 6.75), 0.04, 0.16, "#d9d0b8", segs=6)
    p.cyl((0.0, 0.18, 5.6), 0.2, 0.5, "grey", METAL, segs=10)  # transformer


def sale_sign(p):
    for x in (-0.6, 0.6):
        p.box((x, 0, 0.8), (0.08, 0.08, 1.6), "wood_dark", seg=0)
    p.box((0, -0.05, 1.3), (1.5, 0.04, 0.8), "cream", seg=0, jitter=0)


def gate_post(p):
    p.box((0, 0, 1.2), (0.5, 0.5, 2.4), "brick", bevel=0.01, seg=0)
    p.box((0, 0, 2.45), (0.6, 0.6, 0.1), "#8a877f", seg=0)
    p.sphere((0, 0, 2.6), 0.16, "#8a877f", segs=(10, 6))


def junk_pile(p):
    import random
    r = random.Random(4)
    for k in range(9):
        x, y = r.uniform(-1.4, 1.4), r.uniform(-0.6, 0.6)
        if k % 3 == 0:
            p.cyl((x, y, 0.3), 0.21, 0.6, ["#8a3b23", "#5d6b3a", "#3f6c94"][k % 3], METAL, segs=10, rot=(r.uniform(-8, 8), 0, 0), dirt=0.3)
        elif k % 3 == 1:
            s = r.uniform(0.3, 0.5)
            p.box((x, y, s / 2), (s, s, s), "wood", bevel=0.01, seg=0, rot=(0, 0, r.uniform(0, 90)), dirt=0.3)
        else:
            p.box((x, y, 0.05 + k * 0.01), (1.3, 0.16, 0.05), "wood_dark", seg=0, rot=(0, r.uniform(-10, 10), r.uniform(0, 180)))
    p.cyl((0.9, -0.3, 0.18), 0.35, 0.3, "rubber", axis="Y", segs=12, rot=(70, 0, 0))  # old tyre
    p.box((-0.9, 0.2, 0.35), (0.7, 0.5, 0.7), "rust", METAL, bevel=0.02, seg=0, rot=(0, 10, 25))  # old motor


# ------------------------------------------------------------- electrics
def switchboard(p):
    """Main distribution board: the generator feeds it, three circuits leave it.
    Front faces -Y; the back sits on the wall at +Y 0.15."""
    w, d, h = 0.72, 0.3, 1.55
    p.box((0, 0, 0.06), (w + 0.06, d + 0.04, 0.12), "steel_dark", METAL, seg=0)  # plinth
    p.box((0, 0, 0.12 + h / 2), (w, d, h), "#7d8a8f", METAL, bevel=0.012, seg=0, dirt=0.15)
    p.box((0, -d / 2 - 0.006, 0.12 + h / 2), (w - 0.06, 0.012, h - 0.08), "#8f9ca1", METAL, bevel=0.004, seg=0)  # door
    p.box((0, -d / 2 - 0.02, 1.32), (w - 0.14, 0.02, 0.2), "#2c2f33", METAL, seg=0)  # lamp strip
    p.box((0, -d / 2 - 0.016, 0.98), (w - 0.14, 0.012, 0.3), "#3a3d41", METAL, seg=0)  # breaker rail window
    p.box((0.27, -d / 2 - 0.03, 0.75), (0.03, 0.03, 0.16), "chrome", METAL, seg=0)  # door handle
    # main isolator: yellow plate, red rotary handle
    p.box((-0.18, -d / 2 - 0.014, 0.62), (0.2, 0.012, 0.2), "yellow", seg=0)
    p.cyl((-0.18, -d / 2 - 0.03, 0.62), 0.05, 0.03, "red", axis="Y", segs=12)
    p.box((-0.18, -d / 2 - 0.05, 0.62), (0.03, 0.03, 0.12), "red", seg=0)
    # danger sign: yellow triangle, black bolt
    p.prism([(-0.09, 0), (0.09, 0), (0, 0.15)], 0.01, "yellow", plane="XZ", center=(0.12, -d / 2 - 0.016, 0.45))
    p.prism([(0.012, 0.12), (-0.02, 0.06), (0.004, 0.06), (-0.012, 0.02), (0.02, 0.075), (-0.004, 0.075)], 0.012,
            "black", plane="XZ", center=(0.12, -d / 2 - 0.022, 0.45))
    # meter dial and cable glands on top
    p.cyl((-0.2, -d / 2 - 0.02, 1.32), 0.06, 0.02, "paper", axis="Y", segs=14, smooth=False)
    p.box((-0.2, -d / 2 - 0.032, 1.34), (0.006, 0.004, 0.05), "red", seg=0, rot=(0, 40, 0))
    for x in (-0.2, 0.0, 0.2):
        p.cyl((x, 0.0, 0.12 + h + 0.04), 0.035, 0.08, "steel_dark", METAL, segs=8)
    p.cyl((0.24, 0.0, 0.06), 0.045, 0.12, "steel_dark", METAL, segs=8)  # generator feed gland, bottom
    lamps = {}
    for i, n in enumerate(("main", "saw", "lights", "office")):
        x = -0.2 + i * 0.135 if i else -0.2
        if i == 0:
            continue
        lamps[f"sb_lamp_{n}"] = (lambda q, x=x: q.sphere((x, -d / 2 - 0.035, 1.32), 0.026, "lamp", LAMP, segs=(8, 6)), (0, 0, 0))
        lamps[f"sb_brk_{n}"] = (lambda q, x=x: (q.box((x, -d / 2 - 0.035, 0.98), (0.06, 0.04, 0.1), "black", seg=0),
                                               q.box((x, -d / 2 - 0.06, 1.0), (0.025, 0.04, 0.05), "#ece6d9", seg=0)),
                                (x, -d / 2 - 0.035, 0.98))
    lamps["sb_lamp_main"] = (lambda q: q.sphere((-0.18, -d / 2 - 0.035, 0.76), 0.022, "lamp", LAMP, segs=(8, 6)), (0, 0, 0))
    return lamps


def junction_box(p):
    """Wall junction box, origin on the wall (+Y), conduit stubs up and down."""
    p.box((0, -0.06, 0), (0.3, 0.12, 0.3), "#7d8a8f", METAL, bevel=0.01, seg=0, dirt=0.1)
    p.box((0, -0.122, 0), (0.26, 0.008, 0.26), "#8f9ca1", METAL, seg=0)
    for x in (-0.1, 0.1):
        for z in (-0.1, 0.1):
            p.cyl((x, -0.128, z), 0.012, 0.006, "chrome", METAL, axis="Y", segs=6, smooth=False)
    p.prism([(-0.05, 0), (0.05, 0), (0, 0.085)], 0.006, "yellow", plane="XZ", center=(0, -0.13, -0.04))
    for z in (0.18, -0.18):
        p.cyl((0, -0.06, z), 0.03, 0.08, "steel_dark", METAL, segs=8)


def isolator(p):
    """Machine isolator on a post: yellow box, red rotary handle."""
    p.box((0, 0, 0.03), (0.22, 0.22, 0.06), "steel_dark", METAL, seg=0)
    p.cyl((0, 0, 0.55), 0.035, 1.0, "steel_dark", METAL, segs=8)
    p.box((0, -0.04, 1.12), (0.2, 0.12, 0.24), "yellow", bevel=0.012, seg=0)
    p.cyl((0, -0.11, 1.13), 0.05, 0.025, "red", axis="Y", segs=12)
    p.box((0, -0.13, 1.13), (0.03, 0.025, 0.11), "red", seg=0)
    p.box((0, -0.105, 1.04), (0.12, 0.006, 0.025), "paper", seg=0, jitter=0)
    p.cyl((0, -0.04, 1.27), 0.025, 0.06, "steel_dark", METAL, segs=8)


def cable_tray(p):
    """1 m of ladder tray along X with three cables; origin at the tray centre,
    a wall bracket reaches back to +Y 0.45."""
    for y in (-0.14, 0.14):
        p.box((0, y, 0), (1.0, 0.015, 0.07), "steel", METAL, seg=0)
    for k in range(4):
        p.box((-0.375 + k * 0.25, 0, -0.03), (0.03, 0.28, 0.012), "steel", METAL, seg=0)
    for y, c in ((-0.07, "black"), (0.0, "#3a3d41"), (0.07, "#6a3a2a")):
        p.cyl((0, y, -0.005), 0.024, 1.0, c, axis="X", segs=6)
    p.box((0, 0.3, -0.05), (0.04, 0.3, 0.04), "steel_dark", METAL, seg=0)  # bracket arm
    p.box((0, 0.44, 0.0), (0.08, 0.02, 0.16), "steel_dark", METAL, seg=0)


def cable_cover(p):
    """1 m yellow and black floor cable protector along X."""
    p.prism([(-0.13, 0), (0.13, 0), (0.07, 0.035), (-0.07, 0.035)], 1.0, "yellow", plane="YZ")
    for k in range(5):
        p.box((-0.4 + k * 0.2, 0, 0.036), (0.08, 0.12, 0.004), "black", seg=0, rot=(0, 0, 30), jitter=0)


def wall_lamp(p):
    """Industrial bulkhead lamp; origin on the wall. The bulb is its own node."""
    p.box((0, -0.02, 0), (0.16, 0.04, 0.2), "steel_dark", METAL, seg=0)
    p.beam((0, -0.03, 0.05), (0, -0.38, 0.1), 0.03, "steel_dark", METAL)
    p.cyl((0, -0.42, 0.02), 0.2, 0.16, "#2e6b4a", METAL, segs=14, radius2=0.05, caps=False)
    p.cyl((0, -0.42, 0.1), 0.055, 0.05, "#2e6b4a", METAL, segs=10)
    return {"lamp_bulb": (lambda q: q.sphere((0, -0.42, -0.04), 0.07, "lamp", LAMP, segs=(10, 6)), (0, 0, 0))}


def floodlight(p):
    """Dock floodlight on a short bracket; the lens is its own node."""
    p.box((0, 0.02, 0), (0.1, 0.06, 0.12), "steel_dark", METAL, seg=0)
    p.box((0, -0.12, 0.02), (0.28, 0.14, 0.2), "#2c2f33", METAL, bevel=0.015, seg=0, rot=(-20, 0, 0))
    for k in range(4):
        p.box((-0.1 + k * 0.066, -0.11, 0.13), (0.02, 0.1, 0.02), "#2c2f33", METAL, seg=0, rot=(-20, 0, 0))
    return {"lamp_bulb": (lambda q: q.box((0, -0.195, -0.005), (0.22, 0.012, 0.14), "lamp", LAMP, seg=0, rot=(-20, 0, 0)), (0, 0, 0))}


def diesel_tank(p):
    """Bulk diesel tank on saddles in a concrete bund, pump at the +X end."""
    p.box((0, 0, 0.05), (2.0, 1.1, 0.1), "concrete", seg=0, dirt=0.3)
    for x in (-0.95, 0.95):
        p.box((x, 0, 0.12), (0.06, 1.1, 0.24), "concrete", seg=0)
    for y in (-0.53, 0.53):
        p.box((0, y, 0.12), (2.0, 0.06, 0.24), "concrete", seg=0)
    for x in (-0.5, 0.5):
        p.box((x, 0, 0.3), (0.12, 0.8, 0.4), "steel_dark", METAL, seg=0)
    p.cyl((0, 0, 0.82), 0.45, 1.6, "#8e2b22", METAL, axis="X", segs=16, dirt=0.15)
    for x in (-0.8, 0.8):
        p.cyl((x, 0, 0.82), 0.43, 0.04, "#7a241d", METAL, axis="X", segs=16)
    p.box((0, -0.452, 0.88), (0.6, 0.01, 0.16), "yellow", seg=0)  # "DIESEL" band
    for k in range(5):
        p.box((-0.2 + k * 0.1, -0.459, 0.88), (0.05, 0.004, 0.09), "black", seg=0, jitter=0)
    p.cyl((-0.4, 0, 1.3), 0.08, 0.1, "steel_dark", METAL, segs=10)  # filler
    p.cyl((0.35, -0.3, 1.18), 0.07, 0.02, "paper", axis="Y", segs=12, smooth=False, rot=(-40, 0, 0))  # gauge
    # pump with hose and nozzle
    p.box((0.95, -0.25, 0.7), (0.26, 0.24, 0.5), "#3a3d41", METAL, bevel=0.015, seg=0)
    p.box((0.95, -0.375, 0.8), (0.18, 0.01, 0.14), "#c9a24a", METAL, seg=0)
    p.cyl((1.12, -0.25, 0.75), 0.022, 0.3, "black", segs=6, rot=(0, 20, 0))
    p.box((1.1, -0.38, 0.62), (0.05, 0.12, 0.05), "black", seg=0)


def jerrycan(p):
    p.box((0, 0, 0.21), (0.34, 0.16, 0.42), "#b3261e", METAL, bevel=0.02, seg=0)
    for x in (-0.08, 0.08):
        p.box((x, -0.083, 0.2), (0.1, 0.01, 0.3), "#9e2018", METAL, seg=0, rot=(0, 30 if x > 0 else -30, 0))
    for x in (-0.09, 0.0, 0.09):
        p.box((x, 0, 0.45), (0.025, 0.05, 0.05), "#9e2018", METAL, seg=0)
    p.box((0, 0, 0.475), (0.22, 0.05, 0.02), "#9e2018", METAL, seg=0)
    p.cyl((0.13, 0, 0.45), 0.03, 0.06, "steel_dark", METAL, segs=8)


def elec_bench(p):
    """Electrician's bench: parts drawers, cable reels, meter, soldering iron."""
    p.box((0, 0, 0.8), (1.4, 0.6, 0.06), "#6a7560", METAL, bevel=0.01, seg=0)
    for x in (-0.64, 0.64):
        for y in (-0.25, 0.25):
            p.box((x, y, 0.4), (0.06, 0.06, 0.8), "steel_dark", METAL, seg=0)
    p.box((-0.35, 0, 0.42), (0.6, 0.56, 0.7), "#5a6550", METAL, seg=0)  # drawer pedestal
    for k in range(4):
        p.box((-0.35, -0.285, 0.15 + k * 0.17), (0.54, 0.01, 0.14), "#6a7560", METAL, seg=0, jitter=0.02)
        p.box((-0.35, -0.295, 0.18 + k * 0.17), (0.12, 0.012, 0.02), "chrome", METAL, seg=0, jitter=0)
    p.box((0, 0.27, 1.25), (1.4, 0.05, 0.85), "#a8794a", seg=0)  # pegboard
    for r in range(3):  # parts bins
        for c in range(6):
            p.box((-0.5 + c * 0.2, 0.18, 0.9 + r * 0.13), (0.16, 0.14, 0.1), ["#3f6c94", "#e3a52a", "#b3261e"][r], seg=0, jitter=0.04)
    for x, col in ((-0.45, "#d9772b"), (0.0, "#3f6c94"), (0.45, "#b3261e")):  # cable reels
        p.cyl((x, 0.22, 1.5), 0.11, 0.06, col, axis="Y", segs=12)
        p.cyl((x, 0.22, 1.5), 0.03, 0.08, "steel_dark", METAL, axis="Y", segs=8)
    p.box((0.4, -0.08, 0.88), (0.14, 0.09, 0.1), "#e3a52a", seg=0, bevel=0.01)  # multimeter
    p.box((0.4, -0.127, 0.9), (0.08, 0.004, 0.04), "#3a4a3a", seg=0)
    p.box((0.15, -0.12, 0.85), (0.2, 0.12, 0.05), "#2c2f33", METAL, seg=0)  # soldering station
    p.beam((0.1, -0.12, 0.88), (0.22, -0.2, 0.86), 0.015, "chrome", METAL)


def ladder(p):
    """A-frame step ladder, closed and leaning look avoided: open on its feet."""
    for y, a in ((-0.28, 1), (0.28, -1)):
        for x in (-0.22, 0.22):
            p.beam((x, y, 0.0), (x * 0.8, 0.0, 1.5), 0.04, "#c9a24a", METAL)
    for k in range(5):
        z = 0.25 + k * 0.27
        t = z / 1.5
        p.box((0, -0.28 * (1 - t), z), (0.4 - t * 0.08, 0.1, 0.025), "#b8913a", METAL, seg=0)
    p.box((0, 0, 1.5), (0.4, 0.18, 0.04), "#b3261e", seg=0)


def cable_drum(p):
    """Wooden cable drum on its side with orange cable."""
    for y in (-0.22, 0.22):
        p.cyl((0, y, 0.45), 0.45, 0.04, "wood", axis="Y", segs=16)
    p.cyl((0, 0, 0.45), 0.3, 0.4, "#d9772b", axis="Y", segs=14)
    p.cyl((0, 0, 0.45), 0.08, 0.5, "wood_dark", axis="Y", segs=8)


def timber_bay(p):
    """Stock room timber rack: three cantilever arms each side of a spine,
    2.4 m long along X. The game stacks planks on it."""
    for x in (-1.05, 0.0, 1.05):
        p.box((x, 0, 0.9), (0.1, 0.12, 1.8), "#2f5d8a", METAL, seg=0)
        p.box((x, 0, 0.05), (0.14, 1.1, 0.1), "#2f5d8a", METAL, seg=0)
        for z in (0.35, 0.95, 1.55):
            p.box((x, 0, z), (0.07, 1.0, 0.06), "yellow", METAL, seg=0)
    p.box((0, 0, 1.78), (2.2, 0.08, 0.06), "#2f5d8a", METAL, seg=0)
    p.box((0, 0, 0.6), (2.2, 0.05, 0.05), "#2f5d8a", METAL, seg=0)


def timber_bundle(p):
    """Strapped bundle of planks as delivered, 1.2 m long."""
    for r in range(3):
        for c in range(4):
            p.box((0, -0.2 + c * 0.135, 0.04 + r * 0.075), (1.2, 0.12, 0.065), "wood", bevel=0.005, seg=0, jitter=0.08)
    for x in (-0.4, 0.4):
        p.box((x, 0, 0.12), (0.03, 0.56, 0.25), "#c23b2a", seg=0)


def trolley(p):
    """Platform trolley a loader pushes; handle at -X, load deck 1.1 x 0.6 m."""
    p.box((0, 0, 0.22), (1.1, 0.6, 0.05), "steel_dark", METAL, seg=0)
    p.box((0, 0, 0.25), (1.06, 0.56, 0.01), "#3a3d41", seg=0)
    for x in (-0.45, 0.45):
        for y in (-0.24, 0.24):
            p.cyl((x, y, 0.08), 0.08, 0.05, "rubber", axis="Y", segs=10)
            p.box((x, y, 0.16), (0.04, 0.04, 0.1), "steel_dark", METAL, seg=0)
    for y in (-0.26, 0.26):
        p.beam((-0.55, y, 0.24), (-0.62, y, 0.95), 0.025, "red", METAL)
    p.beam((-0.62, -0.27, 0.95), (-0.62, 0.27, 0.95), 0.03, "black")


def stock_sign(p):
    """Wall sign over the stock room door: yellow board, black lettering bars."""
    p.box((0, 0, 0), (1.6, 0.04, 0.34), "yellow", bevel=0.01, seg=0)
    p.box((0, -0.022, 0), (1.5, 0.004, 0.26), "black", seg=0)


ITEMS = {
    "env_desk": desk, "env_office_chair": office_chair, "env_filing_cabinet": filing_cabinet,
    "env_bookshelf": bookshelf, "env_plant": plant, "env_water_cooler": water_cooler,
    "env_bench": bench, "env_break_table": break_table, "env_coffee_machine": coffee_machine, "env_vending": vending,
    "env_timber_rack": timber_rack, "env_plank": plank, "env_workbench": workbench,
    "env_hanging_lamp": hanging_lamp, "env_lamp_bulb": lamp_bulb, "env_tarp_machine": tarp_machine, "env_shutter": shutter,
    "env_tree_round": tree_round, "env_tree_pine": tree_pine, "env_bush": bush, "env_lamp_post": lamp_post,
    "env_fence_panel": fence_panel, "env_car": car, "env_dumpster": dumpster, "env_power_pole": power_pole,
    "env_sale_sign": sale_sign, "env_gate_post": gate_post, "env_junk_pile": junk_pile,
    "env_switchboard": switchboard, "env_junction_box": junction_box, "env_isolator": isolator,
    "env_cable_tray": cable_tray, "env_cable_cover": cable_cover, "env_wall_lamp": wall_lamp,
    "env_floodlight": floodlight, "env_diesel_tank": diesel_tank, "env_jerrycan": jerrycan,
    "env_elec_bench": elec_bench, "env_ladder": ladder, "env_cable_drum": cable_drum,
    "env_timber_bay": timber_bay, "env_timber_bundle": timber_bundle, "env_trolley": trolley, "env_stock_sign": stock_sign,
}


def build(mats):
    container = root("env")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 6) * SPACING * 1.4, -(i // 6) * SPACING * 1.4, 0)
        p = Part(name + "_mesh", seed=200 + i)
        extras = fn(p) or {}
        p.to_object(mats, parent=rt)
        # named sub-parts the game drives (lamps, breaker handles)
        for k, (efn, pivot) in extras.items():
            q = Part(k, seed=900 + i)
            efn(q)
            o = q.to_object(mats, pivot=pivot, parent=rt)
            o.name = k
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 260, "before_export": before_export,
                       "bake": {"distance": 0.35, "samples": 48}}
