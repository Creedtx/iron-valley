"""Small repeated props in one file, one root node each, every root at the
origin so the game can InstancedMesh them: prop_crate, prop_pipe,
prop_pipe_bundle, prop_pallet, prop_drum_red, prop_drum_blue, prop_drum_olive.
"""
import bpy

from ivlib.geo import METAL, PAINT, Part
from ivlib.scene import root

SPACING = 1.3


def crate(p, size=0.3):
    s = size
    p.box((0, 0, s / 2), (s, s, s), "wood", bevel=0.008, seg=0)
    for z in (0.06, 0.24):  # slats proud of the faces
        for y in (-1, 1):
            p.box((0, y * (s / 2 + 0.006), z * s / 0.3), (s * 0.96, 0.012, 0.05), "wood_dark", seg=0, jitter=0.05)
        for x in (-1, 1):
            p.box((x * (s / 2 + 0.006), 0, z * s / 0.3), (0.012, s * 0.96, 0.05), "wood_dark", seg=0, jitter=0.05)
    for x in (-1, 1):
        for y in (-1, 1):
            p.box((x * (s / 2 - 0.02), y * (s / 2 + 0.004), s / 2), (0.04, 0.012, s), "wood_dark", seg=0)


def pipe(p, length=0.9, r=0.06, x=0.0, y=0.0, z=None):
    z = r if z is None else z
    p.cyl((x, y, z), r, length, "steel", METAL, axis="X", segs=10)
    for e in (-1, 1):
        p.cyl((x + e * (length / 2 + 0.001), y, z), r * 0.72, 0.004, "steel_dark", METAL, axis="X", segs=10, smooth=False)


def pallet(p):
    for y in (-0.33, 0.0, 0.33):
        p.box((0, y, 0.12), (0.9, 0.2, 0.035), "wood", seg=0)
    for x in (-0.36, 0.0, 0.36):
        p.box((x, 0, 0.05), (0.1, 0.86, 0.1), "wood_dark", seg=0)
    for y in (-0.36, 0.36):
        p.box((0, y, 0.0125), (0.9, 0.1, 0.025), "wood", seg=0)


def drum(p, col):
    p.cyl((0, 0, 0.31), 0.21, 0.62, col, METAL, segs=14, dirt=0.25)
    for z in (0.18, 0.44):
        p.cyl((0, 0, z), 0.216, 0.025, col, METAL, segs=14)
    p.cyl((0.08, 0.05, 0.625), 0.03, 0.012, "steel_dark", METAL, segs=8)


ITEMS = {
    "prop_crate": crate,
    "prop_pipe": lambda p: pipe(p),
    "prop_pipe_bundle": lambda p: [pipe(p, 1.0, 0.06, 0, y, z) for y, z in
                                   ((-0.12, 0.06), (0, 0.06), (0.12, 0.06), (-0.06, 0.165), (0.06, 0.165))]
                                  + [p.box((x, 0, 0.11), (0.03, 0.32, 0.24), "black", seg=0) for x in (-0.3, 0.3)],
    "prop_pallet": pallet,
    "prop_drum_red": lambda p: drum(p, "#8a3b23"),
    "prop_drum_blue": lambda p: drum(p, "blue"),
    "prop_drum_olive": lambda p: drum(p, "olive"),
}


def build(mats):
    container = root("props")
    roots = []
    for i, (name, fn) in enumerate(ITEMS.items()):
        rt = root(name)
        rt.parent = container
        rt.location = ((i % 4) * SPACING, -(i // 4) * SPACING, 0)
        p = Part(name + "_mesh", seed=70 + i)
        fn(p)
        p.to_object(mats, parent=rt)
        roots.append(rt)

    def before_export(_root):
        for rt in roots:
            rt.location = (0, 0, 0)
        bpy.context.view_layer.update()

    return container, {"kind": "props", "budget_kib": 60, "before_export": before_export,
                       "bake": {"distance": 0.3}}
