"""Trucks for the yard: two vehicles in one file.

truck_lorry   - the haulier's dropside lorry that collects finished goods at the
                loading dock. 5.0 m long, cab towards +X, blue cab.
truck_flatbed - the timber supplier's flatbed with stakes and bunks, green cab;
                it delivers planks to the stock room.

Both share the cab, chassis and lamps. Named nodes per vehicle:
  wheel_fl, wheel_fr, wheel_rl, wheel_rr  spin on local Z (three.js); the
                                          front pair also steer on Y
  lamp_head, lamp_brake, lamp_rev         lamp material, the game sets emissive
  tailgate (lorry)                        hinged at its bottom edge, drops open
Anchors: bed (centre of the load floor), seat (driver), tailgate.
"""
import math

from ivlib.geo import LAMP, METAL, Part
from ivlib.scene import anchor, root

WHEEL_R = 0.43
AXLES = {"f": 1.55, "r": -1.2}
SD = "steel_dark"


def cab(b, col):
    # chassis rails, fuel tank, battery box, steps
    for y in (-0.42, 0.42):
        b.box((-0.25, y, 0.62), (4.7, 0.13, 0.17), SD, METAL, seg=1.2)
    b.cyl((0.45, -0.72, 0.62), 0.2, 0.75, "gunmetal", METAL, axis="X", segs=14)
    for x in (0.2, 0.7):
        b.box((x, -0.72, 0.62), (0.04, 0.44, 0.44), SD, METAL, seg=0)
    b.box((0.45, 0.72, 0.6), (0.5, 0.32, 0.34), "black", seg=0)  # battery box
    for y in (-1.0, 1.0):
        b.box((1.65, y * 0.98, 0.55), (0.5, 0.18, 0.04), SD, METAL, seg=0)  # step
    # cab shell: side profile extruded across the width
    prof = [(1.0, 0.62), (2.38, 0.62), (2.38, 1.32), (2.24, 1.38), (2.06, 2.12), (1.0, 2.15)]
    b.prism(prof, 1.94, col, plane="XZ", dirt=0.2)
    b.box((1.55, 0, 2.17), (1.08, 1.78, 0.06), col, bevel=0.02)
    for y in (-0.6, 0.0, 0.6):
        b.box((1.95, y, 2.22), (0.06, 0.14, 0.05), "orange", seg=0)  # roof marker lamps
    b.box((2.18, 0, 2.08), (0.16, 1.8, 0.03), "black", seg=0, rot=(0, -12, 0))  # sun visor
    # glass and frames
    b.box((2.17, 0, 1.75), (0.04, 1.7, 0.64), "glass", METAL, rot=(0, -22, 0), seg=0, jitter=0)
    b.box((2.04, 0, 1.75), (0.06, 0.06, 0.66), "black", rot=(0, -22, 0), seg=0)
    for y in (-0.975, 0.975):
        b.box((1.5, y, 1.74), (0.78, 0.02, 0.52), "glass", METAL, seg=0, jitter=0)
        b.box((1.07, y, 1.3), (0.02, 0.012, 0.82), "black", seg=0, jitter=0)
        b.box((1.92, y, 1.3), (0.02, 0.012, 0.82), "black", seg=0, jitter=0)
        b.box((1.48, y * 1.004, 1.17), (0.56, 0.01, 0.32), "cream", seg=0, jitter=0)  # door logo panel
        b.box((1.48, y * 1.008, 1.17), (0.4, 0.01, 0.07), col, seg=0, jitter=0)
        b.box((1.75, y * 1.012, 1.42), (0.13, 0.03, 0.03), "chrome", METAL, seg=0)
        b.beam((2.2, y * 0.98, 1.66), (2.28, y * 1.16, 1.72), 0.025, SD, METAL)  # mirror arm
        b.box((2.28, y * 1.17, 1.62), (0.05, 0.13, 0.28), "black", seg=0)
        b.box((2.31, y * 1.17, 1.62), (0.01, 0.1, 0.24), "glass", METAL, seg=0, jitter=0)
    for y in (-0.42, 0.42):  # wipers
        b.box((2.23, y, 1.5), (0.02, 0.5, 0.02), "black", seg=0, rot=(14, 0, 0))
    # front: grille, badge, bumper, plate, indicators
    b.box((2.395, 0, 0.98), (0.03, 1.14, 0.54), "black", seg=0)
    for k in range(7):
        b.box((2.41, 0, 0.75 + k * 0.075), (0.02, 1.08, 0.022), "chrome", METAL, seg=0, jitter=0)
    b.cyl((2.42, 0, 1.3), 0.06, 0.02, "chrome", METAL, axis="X", segs=10, smooth=False)
    b.box((2.46, 0, 0.6), (0.16, 2.02, 0.18), SD, METAL, bevel=0.02)
    b.box((2.55, 0, 0.6), (0.02, 0.44, 0.12), "cream", seg=0)
    for y in (-0.78, 0.78):
        b.cyl((2.4, y, 1.05), 0.125, 0.05, "chrome", METAL, axis="X", segs=14)
        b.box((2.4, y * 1.1, 0.82), (0.03, 0.12, 0.07), "orange", seg=0)
    # mudguards and exhaust stack behind the cab
    for x in AXLES.values():
        for y in (-0.86, 0.86):
            b.box((x, y, 0.95), (1.05, 0.32, 0.05), "black", seg=0)
            b.box((x + 0.5, y, 0.77), (0.05, 0.32, 0.34), "black", seg=0)
    b.cyl((0.9, 0.82, 1.6), 0.05, 1.5, SD, METAL, segs=8)
    b.cyl((0.9, 0.82, 2.38), 0.065, 0.08, "chrome", METAL, segs=8)
    b.box((0.93, 0, 1.3), (0.07, 1.96, 0.62), SD, METAL, seg=1.0)  # headboard


def retro_cab(b, col):
    """A 1950s bonneted lorry cab, like the concept's old blue truck: long rounded bonnet, round front wings,
    split windscreen, rounded cab roof."""
    for y in (-0.42, 0.42):
        b.box((-0.25, y, 0.62), (4.7, 0.13, 0.17), SD, METAL, seg=1.2)
    b.cyl((0.2, -0.72, 0.62), 0.2, 0.6, "gunmetal", METAL, axis="X", segs=14)
    # bonnet: a box with a rounded top running forward to the grille
    b.box((1.92, 0, 0.98), (1.1, 1.0, 0.56), col, bevel=0.04, dirt=0.3)
    b.sphere((1.92, 0, 1.25), 0.5, col, scale=(1.1, 1.0, 0.42), segs=(16, 8), dirt=0.3)
    b.box((2.48, 0, 1.0), (0.05, 0.62, 0.6), "chrome", METAL, bevel=0.02)
    for k in range(9):
        b.box((2.51, -0.28 + k * 0.07, 1.0), (0.02, 0.02, 0.55), "#2c2f33", seg=0, jitter=0)       # grille bars
    b.box((2.2, 0, 1.47), (0.3, 0.06, 0.03), "chrome", METAL, seg=0)                                   # bonnet strip
    # round front wings over the wheels, running boards back to the cab
    for y in (-0.82, 0.82):
        b.cyl((1.6, y, 0.92), 0.5, 0.36, col, axis="Y", segs=18, dirt=0.35)
        b.box((1.6, y, 0.7), (1.1, 0.36, 0.42), col, seg=0, dirt=0.3)
        b.box((0.9, y, 0.58), (0.9, 0.3, 0.05), "#2c2f33", METAL, seg=0)                               # running board
        b.cyl((2.18, y * 0.92, 1.1), 0.12, 0.12, "chrome", METAL, axis="X", segs=14)                     # headlamp shells
    # the cab: rounded roof, split windscreen, doors with a faded name panel
    b.box((0.85, 0, 1.25), (1.0, 1.9, 1.15), col, bevel=0.05, dirt=0.3)
    b.sphere((0.85, 0, 1.82), 0.95, col, scale=(0.55, 1.0, 0.22), segs=(16, 8), dirt=0.25)
    for y in (-0.42, 0.42):
        b.box((1.36, y, 1.6), (0.03, 0.74, 0.46), "glass", METAL, rot=(0, -10, 0), seg=0, jitter=0)
    b.box((1.37, 0, 1.6), (0.05, 0.06, 0.5), col, seg=0)
    for y in (-0.955, 0.955):
        b.box((0.9, y, 1.62), (0.6, 0.02, 0.42), "glass", METAL, seg=0, jitter=0)
        b.box((0.82, y * 1.004, 1.12), (0.62, 0.01, 0.3), "#d8d2c4", seg=0, jitter=0)
        b.box((0.82, y * 1.008, 1.12), (0.46, 0.01, 0.06), col, seg=0, jitter=0)
        b.box((1.15, y * 1.012, 1.3), (0.12, 0.03, 0.03), "chrome", METAL, seg=0)
        b.beam((1.3, y * 0.96, 1.7), (1.42, y * 1.16, 1.78), 0.025, SD, METAL)
        b.cyl((1.44, y * 1.18, 1.72), 0.09, 0.04, "chrome", METAL, axis="X", segs=10)
    b.box((2.52, 0, 0.62), (0.14, 2.0, 0.16), "chrome", METAL, bevel=0.03)                              # bumper
    b.box((2.6, 0, 0.62), (0.02, 0.42, 0.11), "cream", seg=0)
    for x in AXLES.values():
        if x < 1:
            for y in (-0.86, 0.86):
                b.box((x, y, 0.95), (1.05, 0.32, 0.05), "black", seg=0)
    b.cyl((0.3, 0.82, 1.4), 0.05, 1.3, SD, METAL, segs=8)


def lamps(r, x_rear, seed, head=(2.43, 0.78, 1.05)):
    h = Part("lamp_head", seed=seed)
    for y in (-head[1], head[1]):
        h.cyl((head[0], y, head[2]), 0.095, 0.02, "lamp", LAMP, axis="X", segs=14, smooth=False)
    h.to_object(MATS, parent=r).name = "lamp_head"
    br = Part("lamp_brake", seed=seed + 1)
    rv = Part("lamp_rev", seed=seed + 2)
    for y in (-0.82, 0.82):
        br.box((x_rear - 0.03, y, 0.8), (0.03, 0.16, 0.09), "lamp", LAMP, seg=0)
        rv.box((x_rear - 0.03, y * 0.66, 0.8), (0.03, 0.08, 0.09), "lamp", LAMP, seg=0)
    br.to_object(MATS, parent=r).name = "lamp_brake"
    rv.to_object(MATS, parent=r).name = "lamp_rev"


def wheels(r, seed):
    for ax, x in AXLES.items():
        for side, y in (("l", 0.86), ("r", -0.86)):
            w = Part(f"wheel_{ax}{side}", seed=seed)
            w.cyl((0, 0, 0), WHEEL_R, 0.32, "rubber", axis="Y", segs=18)
            s = 1 if y > 0 else -1
            w.cyl((0, s * 0.165, 0), 0.24, 0.02, "grey", METAL, axis="Y", segs=14, smooth=False)
            w.cyl((0, s * 0.18, 0), 0.08, 0.03, SD, METAL, axis="Y", segs=8)
            for k in range(6):  # wheel nuts
                a = k / 6 * math.tau
                w.cyl((math.cos(a) * 0.14, s * 0.178, math.sin(a) * 0.14), 0.018, 0.02, "chrome", METAL, axis="Y", segs=6)
            o = w.to_object(MATS, parent=r)
            o.name = f"wheel_{ax}{side}"
            o.location = (x, y, WHEEL_R)


def lorry(top):
    r = root("truck_lorry")
    r.parent = top
    b = Part("lorry_body", seed=51)
    retro_cab(b, "#3f6d96")
    # timber stake body: plank floor, slatted wooden sides on stakes (period dropside)
    b.box((-0.75, 0, 0.96), (3.1, 2.0, 0.1), "wood", bevel=0.01, seg=1.0, dirt=0.25)
    for x in [-2.2 + 0.3 * i for i in range(11)]:
        b.box((x, 0, 1.015), (0.02, 1.96, 0.004), "wood_dark", seg=0, jitter=0)
    for y in (-0.98, 0.98):
        for k in range(3):
            b.box((-0.75, y, 1.13 + k * 0.2), (3.1, 0.05, 0.15), "#8a6a48", seg=0, jitter=0.1, dirt=0.35)
        for x in (-2.25, -1.5, -0.75, 0.0, 0.7):
            b.box((x, y * 1.02, 1.3), (0.08, 0.06, 0.66), "#5a4632", seg=0, jitter=0.05)
    b.box((0.73, 0, 1.4), (0.06, 1.96, 0.8), "#8a6a48", seg=0, dirt=0.3)                          # headboard
    b.box((-0.7, 0, 0.84), (3.2, 1.9, 0.14), SD, METAL, seg=1.0)  # subframe
    for y in (-0.9, 0.9):  # rear underride bar and lamp brackets
        b.box((-2.3, y * 0.5, 0.55), (0.06, 0.06, 0.3), SD, METAL, seg=0)
    b.box((-2.3, 0, 0.42), (0.08, 1.8, 0.08), "yellow", seg=0)
    b.box((-2.32, 0, 0.66), (0.02, 0.44, 0.12), "cream", seg=0)  # rear plate
    b.to_object(MATS, parent=r)
    tg = Part("tailgate", seed=55)
    for k in range(3):
        tg.box((0, 0, 0.08 + k * 0.2), (0.05, 1.96, 0.15), "#8a6a48", seg=0, jitter=0.1, dirt=0.35)
    for y in (-0.6, 0.6):
        tg.box((-0.03, y, 0.3), (0.03, 0.08, 0.1), "chrome", METAL, seg=0)
    o = tg.to_object(MATS, pivot=(0, 0, 0), parent=r)
    o.name = "tailgate"
    o.location = (-2.3, 0, 1.0)
    lamps(r, -2.32, 70, head=(2.25, 0.76, 1.1))
    wheels(r, 60)
    anchor("bed", (-0.7, 0, 1.02), r)
    anchor("seat", (1.5, -0.42, 1.0), r)
    anchor("dock_rear", (-2.45, 0, 0), r)
    return r


def flatbed(top):
    r = root("truck_flatbed")
    r.parent = top
    r.location = (0, 5.0, 0)  # apart from the lorry for the occlusion bake; the game places it
    b = Part("flatbed_body", seed=81)
    cab(b, "#3e6b45")
    b.box((-0.7, 0, 0.96), (3.2, 2.0, 0.1), "wood_dark", bevel=0.01, seg=1.0, dirt=0.25)
    b.box((-0.7, 0, 0.84), (3.2, 1.9, 0.14), SD, METAL, seg=1.0)
    for x in (-1.9, -0.7, 0.4):  # timber bunks
        b.box((x, 0, 1.06), (0.14, 2.0, 0.1), "wood", seg=0)
    for x in (-2.2, -1.2, -0.2, 0.75):  # stakes
        for y in (-0.97, 0.97):
            b.box((x, y, 1.45), (0.07, 0.07, 0.9), SD, METAL, seg=0)
    for y in (-0.97, 0.97):  # load strap rails
        b.box((-0.7, y, 1.02), (3.2, 0.06, 0.06), "yellow_deep", seg=0)
    b.box((-2.3, 0, 0.42), (0.08, 1.8, 0.08), "yellow", seg=0)
    b.box((-2.32, 0, 0.66), (0.02, 0.44, 0.12), "cream", seg=0)
    b.to_object(MATS, parent=r)
    lamps(r, -2.32, 90)
    wheels(r, 85)
    anchor("bed", (-0.7, 0, 1.12), r)
    anchor("seat", (1.5, -0.42, 1.0), r)
    return r


MATS = None


def build(mats):
    global MATS
    MATS = mats
    top = root("trucks")
    lorry(top)
    flatbed(top)
    return top, {"kind": "vehicle", "budget_kib": 220}
