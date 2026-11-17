"""Generator Mk I: the workshop's old diesel set. Footprint 1.4 x 1.6 m.

Moving nodes: flywheel (spin on local X), status_lamp. The game puts the
breakdown badge at issue_anchor and sends the fixer to fix_spot.
"""
import math

from ivlib.geo import LAMP, METAL, PAINT, Part
from ivlib.scene import anchor, root


def build(mats):
    r = root("generator")
    b = Part("generator_body", seed=21)
    sd, gm = "steel_dark", "gunmetal"
    # skid and rusty body
    b.box((0, 0, 0.05), (1.56, 1.76, 0.1), sd, METAL, bevel=0.01)
    for y in (-0.7, 0.7):
        b.box((0, y, 0.12), (1.5, 0.08, 0.06), "yellow_deep", seg=0)
    b.box((0, 0, 0.58), (1.4, 1.6, 0.96), "#8e3328", bevel=0.03, seg=0.8, dirt=0.45)
    # front louvre panel
    b.box((0, -0.805, 0.62), (1.12, 0.03, 0.72), sd, METAL, seg=0)
    for k in range(9):
        b.box((0, -0.83, 0.32 + k * 0.075), (1.06, 0.025, 0.03), gm, METAL, rot=(25, 0, 0), seg=0, jitter=0)
    b.box((-0.4, -0.818, 1.0), (0.26, 0.01, 0.08), "brass", METAL, seg=0)
    # engine block and cylinder heads
    b.box((-0.05, 0.05, 1.25), (0.9, 1.0, 0.36), "grey", METAL, bevel=0.02)
    for k in range(4):
        b.cyl((-0.3 + k * 0.17, 0.05, 1.47), 0.055, 0.1, sd, METAL, segs=10)
        b.box((-0.3 + k * 0.17, 0.05, 1.53), (0.1, 0.12, 0.03), gm, METAL, seg=0)
    # exhaust stack with a rain cap
    b.cyl((-0.38, 0.42, 1.95), 0.07, 0.9, sd, METAL, segs=10, dirt=0)
    b.cyl((-0.38, 0.42, 2.43), 0.1, 0.05, sd, METAL, segs=10, rot=(0, 17, 0))
    b.cyl((-0.38, 0.42, 1.52), 0.1, 0.06, gm, METAL, segs=10)
    # radiator on the back, fuel tank on the left side
    b.box((0, 0.83, 0.62), (1.0, 0.06, 0.8), gm, METAL, seg=0)
    for k in range(8):
        b.box((-0.42 + k * 0.12, 0.865, 0.62), (0.03, 0.02, 0.74), sd, METAL, seg=0, jitter=0)
    b.cyl((-0.82, 0.25, 0.42), 0.18, 0.7, "olive", axis="Y", segs=12, dirt=0.3)
    b.cyl((-0.82, 0.25, 0.62), 0.04, 0.05, "brass", METAL, segs=8)
    b.cyl((-0.95, -0.3, 0.35), 0.025, 0.5, sd, METAL, axis="X", segs=6)
    # control panel, tilted towards the player
    b.box((0.4, -0.55, 1.3), (0.44, 0.05, 0.26), sd, METAL, rot=(-30, 0, 0), seg=0)
    for x in (-0.11, 0.11):
        b.cyl((0.4 + x, -0.585, 1.31), 0.06, 0.02, "paper", axis="Y", segs=12, rot=(-30, 0, 0), smooth=False)
        b.box((0.4 + x, -0.6, 1.33), (0.008, 0.005, 0.05), "red", seg=0, rot=(-30, 0, 30 * (1 if x > 0 else -1)))
    # flywheel guard bracket
    b.box((0.73, -0.12, 0.62), (0.06, 0.12, 0.12), sd, METAL, seg=0)
    b.box((0.72, -0.12, 0.33), (0.06, 0.1, 0.5), sd, METAL, seg=0)
    # lamp post
    b.cyl((0.5, -0.3, 1.47), 0.015, 0.1, sd, METAL, segs=6)
    b.to_object(mats, parent=r)

    fw = Part("flywheel", seed=22)
    n, rad = 16, 0.36
    for i in range(n):
        a0, a1 = i / n * math.tau, (i + 1) / n * math.tau
        fw.beam((0, math.cos(a0) * rad, math.sin(a0) * rad), (0, math.cos(a1) * rad, math.sin(a1) * rad),
                0.09, "#3d3f43", METAL, jitter=0)
    for k in range(5):
        a = k / 5 * math.pi
        fw.beam((0, -math.cos(a) * rad, -math.sin(a) * rad), (0, math.cos(a) * rad, math.sin(a) * rad),
                0.035, "steel", METAL, jitter=0)
    fw.cyl((0, 0, 0), 0.07, 0.09, "yellow", axis="X", segs=10)
    fo = fw.to_object(mats, parent=r)
    fo.location = (0.79, -0.12, 0.62)

    # build 0.16: a cooling fan on top (spins while the engine runs), a battery box and fuel lines
    b2 = Part("generator_extra", seed=24)
    b2.cyl((0.52, 0.5, 1.1), 0.21, 0.08, gm, METAL, segs=18)
    b2.cyl((0.52, 0.5, 1.15), 0.2, 0.02, "#1d1f22", METAL, segs=18)
    for k in range(4):
        a = k / 4 * math.pi
        b2.beam((0.52 - math.cos(a) * 0.2, 0.5 - math.sin(a) * 0.2, 1.17), (0.52 + math.cos(a) * 0.2, 0.5 + math.sin(a) * 0.2, 1.17), 0.012, sd)
    b2.box((0.45, -0.95, 0.2), (0.34, 0.2, 0.22), "black", bevel=0.01)
    for x in (0.36, 0.54):
        b2.cyl((x, -0.95, 0.33), 0.025, 0.04, "red" if x > 0.4 else "#2c2f33", segs=8)
    b2.beam((-0.82, 0.0, 0.3), (-0.6, -0.2, 1.1), 0.02, "black")
    b2.beam((-0.6, -0.2, 1.1), (-0.4, 0.0, 1.2), 0.02, "black")
    for k in range(3):
        b2.box((-0.25 + k * 0.25, -0.815, 1.28), (0.12, 0.008, 0.035), "yellow" if k == 1 else "paper", seg=0)
    b2.to_object(mats, parent=r)
    fan = Part("fan", seed=25)
    for k in range(5):
        a = k / 5 * math.tau
        fan.box((math.cos(a) * 0.09, math.sin(a) * 0.09, 0), (0.15, 0.05, 0.012), "#b8bec4", METAL, rot=(18, 0, math.degrees(a)), seg=0)
    fan.cyl((0, 0, 0), 0.04, 0.04, "yellow", segs=10)
    fan.to_object(mats, parent=r).location = (0.52, 0.5, 1.11)

    lamp = Part("status_lamp", seed=23)
    lamp.sphere((0, 0, 0), 0.06, "lamp", LAMP, segs=(10, 6))
    lamp.to_object(mats, parent=r).location = (0.5, -0.3, 1.56)

    anchor("fix_spot", (1.15, -0.8, 0), r)
    anchor("issue_anchor", (0, 0, 2.15), r)
    anchor("smoke", (-0.38, 0.42, 2.5), r)
    return r, {"kind": "machine", "budget_kib": 150}
