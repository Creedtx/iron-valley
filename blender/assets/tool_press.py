"""Tool Press: the level 3 machine (strategy: 'Tool machine: basic tools').
Steel strip unrolls from a coil, runs through a straightener and under a
flywheel power press that stamps spanner blanks; finished tools slide down a
chute into a tray. Footprint 2.2 x 1.1 m, orange so it reads apart from the
green saw and the blue pipe mill.

Moving nodes: tcoil (spin on local Z in three.js, scaled by what is left),
ram (slide down local Y while stamping), flywheel (spin on local X),
tool_out (a spanner sliding along +X into the tray), beacon and status_lamp
(emissive, driven by the game).
"""
import math

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

PX = 0.1  # press centre along the bed


def spanner(p, x, y, z, length=0.34, col="chrome"):
    # flat open-ended spanner lying along X: shaft plus two jaws
    p.box((x, y, z), (length, 0.05, 0.014), col, METAL, seg=0, jitter=0)
    for s in (-1, 1):
        ex = x + s * length / 2
        p.cyl((ex, y, z), 0.045, 0.016, col, METAL, segs=10, smooth=False)
        p.box((ex + s * 0.03, y, z + 0.001), (0.05, 0.03, 0.018), "steel_dark", METAL, seg=0, jitter=0)


def build(mats):
    r = root("tool_press")
    b = Part("tool_press_body", seed=61)
    sd, og, od = "steel_dark", "orange", "rust"
    # bed and plinth
    b.box((0, 0, 0.22), (2.2, 0.95, 0.44), og, bevel=0.025, seg=0.8, dirt=0.3)
    b.box((0, 0, 0.05), (2.3, 1.05, 0.1), sd, METAL, seg=0)
    for i in range(10):  # hazard lip on the operator side
        b.box((-1.1 + 0.22 * (i + 0.5), -0.48, 0.36), (0.22, 0.02, 0.08), "yellow" if i % 2 == 0 else "black",
              seg=0, jitter=0)
    b.box((0, 0, 0.455), (2.0, 0.6, 0.03), sd, METAL, seg=0)
    # uncoiler on the left
    for y in (-0.22, 0.22):
        b.box((-0.85, y, 0.72), (0.12, 0.06, 0.56), od, bevel=0.01)
    b.cyl((-0.85, 0, 0.9), 0.05, 0.56, sd, METAL, axis="Y", segs=10)
    # straightener: three small rolls in a cage
    for x in (-0.48, -0.36, -0.24):
        b.cyl((x, 0, 0.6), 0.035, 0.34, "chrome", METAL, axis="Y", segs=10)
    for y in (-0.19, 0.19):
        b.box((-0.36, y, 0.63), (0.36, 0.03, 0.18), og, seg=0)
    # strip into the die
    b.box((-0.58, 0, 0.66), (0.4, 0.26, 0.012), "steel", METAL, rot=(0, 18, 0), seg=0)
    b.box((-0.05, 0, 0.545), (0.5, 0.26, 0.012), "steel", METAL, seg=0)
    # press: two columns, crown, die block and guards
    for y in (-0.3, 0.3):
        b.box((PX, y, 1.05), (0.26, 0.14, 1.2), og, bevel=0.02, dirt=0.2)
    b.box((PX, 0, 1.72), (0.46, 0.8, 0.3), od, bevel=0.03, dirt=0.25)
    b.box((PX, 0, 0.52), (0.36, 0.42, 0.1), sd, METAL, seg=0)         # die
    b.box((PX, -0.3, 0.9), (0.36, 0.02, 0.5), "glass", METAL, seg=0, jitter=0)   # light guard
    b.box((PX, -0.31, 0.68), (0.3, 0.01, 0.05), "yellow", seg=0, jitter=0)
    # flywheel shaft on the crown
    b.cyl((PX, 0.38, 1.72), 0.05, 0.14, sd, METAL, axis="Y", segs=10)
    # chute and tray on the right
    b.box((0.62, 0, 0.56), (0.5, 0.3, 0.02), "steel", METAL, rot=(0, -14, 0), seg=0)
    b.box((0.98, 0, 0.5), (0.36, 0.42, 0.06), sd, METAL, seg=0)
    for y in (-0.2, 0.2):
        b.box((0.98, y, 0.56), (0.36, 0.02, 0.1), "steel", METAL, seg=0)
    for k in range(3):  # spanners already in the tray
        spanner(b, 0.98, -0.1 + k * 0.1, 0.545 + k * 0.016, length=0.28)
    # control pedestal with two-hand buttons, cabinet, beacon mast
    b.box((-0.55, -0.62, 0.55), (0.12, 0.12, 1.1), sd, METAL, seg=0)
    b.box((-0.55, -0.62, 1.12), (0.42, 0.16, 0.1), "black", seg=0)
    for x in (-0.7, -0.4):
        b.cyl((x, -0.62, 1.18), 0.035, 0.03, "#4f8f4a", segs=10)
    b.cyl((-0.55, -0.62, 1.18), 0.035, 0.03, "red", segs=10)
    b.box((0.95, 0.4, 0.85), (0.34, 0.22, 0.82), od, bevel=0.015, dirt=0.2)
    b.cyl((0.95, 0.285, 1.05), 0.075, 0.02, "paper", axis="Y", segs=14, smooth=False)
    b.box((0.95, 0.274, 1.06), (0.006, 0.004, 0.06), "red", seg=0, rot=(0, 25, 0))
    b.cyl((1.03, 0.4, 1.36), 0.018, 0.2, sd, METAL, segs=6)
    b.cyl((0.87, 0.4, 1.31), 0.018, 0.1, sd, METAL, segs=6)
    b.cyl((0.6, 0.4, 1.4), 0.025, 0.7, "black", axis="X", segs=6)   # hose to the crown
    b.to_object(mats, parent=r)

    coil = Part("tcoil", seed=62)
    coil.cyl((0, 0, 0), 0.32, 0.3, "steel", METAL, axis="Y", segs=20)
    coil.cyl((0, 0, 0), 0.12, 0.305, sd, METAL, axis="Y", segs=12, smooth=False)
    for k in range(3):
        coil.cyl((0, 0, 0), 0.32 - 0.06 * (k + 1), 0.302, "gunmetal", METAL, axis="Y", segs=20, caps=True)
    coil.to_object(mats, parent=r).location = (-0.85, 0, 0.9)

    ram = Part("ram", seed=63)
    ram.box((0, 0, 0), (0.3, 0.4, 0.34), og, bevel=0.015)
    ram.box((0, 0, -0.2), (0.24, 0.3, 0.07), "chrome", METAL, seg=0)
    ram.cyl((0, 0, 0.26), 0.06, 0.2, "chrome", METAL, segs=10)
    ram.to_object(mats, parent=r).location = (PX, 0, 1.18)

    fly = Part("flywheel", seed=64)
    fly.cyl((0, 0, 0), 0.3, 0.08, sd, METAL, axis="Y", segs=20)
    for a in range(4):
        ang = a * math.pi / 4
        fly.box((0, 0, 0), (0.5 * abs(math.cos(ang)) + 0.04, 0.09, 0.5 * abs(math.sin(ang)) + 0.04), og, seg=0, jitter=0)
    fly.cyl((0, 0, 0), 0.07, 0.1, "chrome", METAL, axis="Y", segs=10)
    fly.to_object(mats, parent=r).location = (PX, 0.5, 1.72)

    out = Part("tool_out", seed=65)
    spanner(out, 0, 0, 0)
    out.to_object(mats, parent=r).location = (0.55, 0, 0.6)

    beacon = Part("beacon", seed=66)
    beacon.cyl((0, 0, 0), 0.055, 0.11, "#ff9a1f", LAMP, segs=12)
    beacon.to_object(mats, parent=r).location = (1.03, 0.4, 1.52)

    lamp = Part("status_lamp", seed=67)
    lamp.sphere((0, 0, 0), 0.045, "lamp", LAMP, segs=(10, 6))
    lamp.to_object(mats, parent=r).location = (0.87, 0.4, 1.4)

    anchor("op_spot", (-0.25, -1.0, 0), r)
    anchor("out_spot", (1.65, -0.95, 0), r)
    anchor("issue_anchor", (0, 0, 2.2), r)
    return r, {"kind": "machine", "budget_kib": 150}
