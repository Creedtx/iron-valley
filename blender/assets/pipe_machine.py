"""Pipe Mill: the level 2 metal machine (strategy: 'Metal machine: pipes').
Steel strip unrolls from a coil, passes three forming stands and leaves as a
pipe on the run-out tray. Footprint 2.2 x 1.2 m.

Moving nodes: coil (spin on local Z in three.js), roller_1..3 (spin on local
Z), pipe_out (slide along +X while producing), beacon and status_lamp
(emissive, driven by the game).
"""
from ivlib.geo import LAMP, METAL, PAINT, Part
from ivlib.scene import anchor, root

STANDS = (-0.25, 0.1, 0.45)


def build(mats):
    r = root("pipe_machine")
    b = Part("pipe_machine_body", seed=31)
    sd, bl, bd = "steel_dark", "olive", "olive_dark"   # build 0.17: olive like the crate machine (Level 2 concept)
    # bed
    b.box((0, 0, 0.22), (2.2, 1.0, 0.44), bl, bevel=0.025, seg=0.8, dirt=0.3)
    b.box((0, 0, 0.05), (2.3, 1.1, 0.1), sd, METAL, seg=0)
    for i in range(10):  # hazard lip
        b.box((-1.1 + 0.22 * (i + 0.5), -0.505, 0.36), (0.22, 0.02, 0.08), "yellow" if i % 2 == 0 else "black",
              seg=0, jitter=0)
    b.box((0, 0, 0.455), (2.0, 0.6, 0.03), sd, METAL, seg=0)
    # uncoiler stand on the left
    for y in (-0.22, 0.22):
        b.box((-0.85, y, 0.72), (0.12, 0.06, 0.56), bd, bevel=0.01)
    b.cyl((-0.85, 0, 0.9), 0.05, 0.56, sd, METAL, axis="Y", segs=10)
    # strip running into the stands
    b.box((-0.45, 0, 0.62), (0.55, 0.3, 0.012), "steel", METAL, rot=(0, 16, 0), seg=0)
    b.box((0.1, 0, 0.555), (1.0, 0.28, 0.012), "steel", METAL, seg=0)
    # forming stands: two posts and a cross-head each
    for x in STANDS:
        for y in (-0.24, 0.24):
            b.box((x, y, 0.75), (0.16, 0.08, 0.6), bl, bevel=0.012)
        b.box((x, 0, 1.08), (0.18, 0.58, 0.1), bd, bevel=0.012)
        b.cyl((x, 0, 1.17), 0.03, 0.1, "chrome", METAL, segs=8)
        b.cyl((x, 0, 0.5), 0.07, 0.42, "chrome", METAL, axis="Y", segs=12)  # lower roll (fixed)
    # run-out tray
    b.box((0.88, 0, 0.5), (0.44, 0.34, 0.04), sd, METAL, seg=0)
    for y in (-0.15, 0.15):
        b.box((0.88, y, 0.55), (0.44, 0.02, 0.07), "steel", METAL, seg=0)
    # control cabinet with gauge, lamp post and beacon mast
    b.box((0.95, 0.42, 0.85), (0.34, 0.24, 0.82), bd, bevel=0.015, dirt=0.2)
    b.cyl((0.95, 0.295, 1.05), 0.075, 0.02, "paper", axis="Y", segs=14, smooth=False)
    b.box((0.95, 0.284, 1.06), (0.006, 0.004, 0.06), "red", seg=0, rot=(0, -35, 0))
    b.box((0.87, 0.295, 0.8), (0.07, 0.02, 0.07), "black", seg=0)
    b.cyl((1.03, 0.42, 1.36), 0.018, 0.2, sd, METAL, segs=6)
    b.cyl((0.87, 0.42, 1.31), 0.018, 0.1, sd, METAL, segs=6)
    # hose from cabinet to the stands
    b.cyl((0.65, 0.42, 1.13), 0.025, 0.6, "black", axis="X", segs=6)
    b.to_object(mats, parent=r)

    coil = Part("coil", seed=32)
    coil.cyl((0, 0, 0), 0.32, 0.3, "steel", METAL, axis="Y", segs=20)
    coil.cyl((0, 0, 0), 0.12, 0.305, sd, METAL, axis="Y", segs=12, smooth=False)
    for k in range(3):
        coil.cyl((0, 0, 0), 0.32 - 0.06 * (k + 1), 0.302, "gunmetal", METAL, axis="Y", segs=20, caps=True)
    coil.to_object(mats, parent=r).location = (-0.85, 0, 0.9)

    for i, x in enumerate(STANDS, 1):
        roll = Part(f"roller_{i}", seed=40 + i)
        roll.cyl((0, 0, 0), 0.075, 0.42, "chrome", METAL, axis="Y", segs=12)
        roll.cyl((0, 0, 0), 0.085, 0.04, "gunmetal", METAL, axis="Y", segs=12)
        roll.to_object(mats, parent=r).location = (x, 0, 0.67)

    pipe = Part("pipe_out", seed=33)
    pipe.cyl((0, 0, 0), 0.06, 0.9, "steel", METAL, axis="X", segs=12)
    pipe.cyl((0.451, 0, 0), 0.045, 0.004, sd, METAL, axis="X", segs=12, smooth=False)
    pipe.to_object(mats, parent=r).location = (0.95, 0, 0.6)

    beacon = Part("beacon", seed=34)
    beacon.cyl((0, 0, 0), 0.055, 0.11, "#ff9a1f", LAMP, segs=12)
    beacon.to_object(mats, parent=r).location = (1.03, 0.42, 1.52)

    lamp = Part("status_lamp", seed=35)
    lamp.sphere((0, 0, 0), 0.045, "lamp", LAMP, segs=(10, 6))
    lamp.to_object(mats, parent=r).location = (0.87, 0.42, 1.4)

    anchor("op_spot", (0.1, -1.0, 0), r)
    anchor("out_spot", (1.65, -0.95, 0), r)
    anchor("issue_anchor", (0, 0, 1.75), r)
    return r, {"kind": "machine", "budget_kib": 150}
