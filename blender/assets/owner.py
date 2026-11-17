"""The factory owner, the character the player walks: flat cap, waistcoat
over a white shirt, red tie, watch chain, handlebar moustache, bare hands.
Same rig and clips as the workers; one body mesh plus a clipboard for inspections.
"""
from ivlib import render

from assets import character as C
from assets.character import S, W, WHITE

OWNER = {
    "skin": "#e8b48c", "hair": "#3a2a1e", "shirt": "#f1ece0", "suit": "#7a4f2c",
    "pants": "#4a4540", "boots": "#5a3820", "hat": "#6a5a48", "eyes": "#1a1a1a",
    "metal": "#d8b24e", "stache": "#3a2a1e", "belt": "#2a2420", "glove": "#e8b48c",
    "spare1": "#b0302a",
}


def palette_image():
    return C.palette_image(OWNER, "owner_palette")


def body(p):
    C.legs(p, shoe="boots", boot_h=0.04)
    p.sphere((0, 0, 0.47), 0.14, WHITE, segs=(10, 6), scale=(1.12, 0.85, 0.62), slot=S["pants"], group="hips", **W)
    p.cyl((0, 0, 0.505), 0.148, 0.03, WHITE, segs=12, slot=S["belt"], group="hips", **W)
    # a comfortable belly in a waistcoat, shirt at the shoulders
    p.sphere((0, -0.01, 0.6), 0.165, WHITE, segs=(12, 8), scale=(1.06, 0.88, 0.78), slot=S["suit"], group="spine", **W)
    p.sphere((0, 0, 0.705), 0.168, WHITE, segs=(12, 8), scale=(1.0, 0.74, 0.68), slot=S["shirt"], group="spine", **W)
    for x in (-1, 1):  # waistcoat fronts leave a V of shirt and tie
        p.box((x * 0.07, -0.105, 0.665), (0.12, 0.03, 0.17), WHITE, bevel=0.02, seg=0, rot=(-6, 0, x * -10),
              slot=S["suit"], group="spine", **W)
    p.box((0, -0.122, 0.69), (0.032, 0.01, 0.14), WHITE, bevel=0.004, seg=0, slot=S["spare1"], group="spine", **W)
    p.box((0, -0.122, 0.77), (0.045, 0.02, 0.03), WHITE, bevel=0.006, seg=0, slot=S["spare1"], group="spine", **W)
    for z in (0.6, 0.64, 0.68):
        p.sphere((0.024, -0.128, z), 0.009, WHITE, segs=(6, 4), slot=S["metal"], group="spine", **W)
    p.beam((0.025, -0.13, 0.62), (0.1, -0.12, 0.6), 0.008, WHITE, mat=0, slot=S["metal"], group="spine", jitter=0, nslots=C.NSLOTS)
    p.box((0, -0.1, 0.795), (0.13, 0.05, 0.035), WHITE, bevel=0.012, seg=0, slot=S["shirt"], group="spine", **W)
    C.arms(p, hand="skin")
    C.head(p, nose=0.036)
    H = dict(group="head", **W)
    C.hair_short(p)
    for x in (-1, 1):  # handlebar moustache
        p.box((x * 0.05, -0.162, 0.918), (0.085, 0.032, 0.03), WHITE, bevel=0.013, seg=0, rot=(0, x * 16, 0),
              slot=S["stache"], **H)
        p.sphere((x * 0.1, -0.15, 0.94), 0.016, WHITE, segs=(6, 4), slot=S["stache"], **H)
    # flat cap
    p.dome((0, -0.005, 1.07), 0.182, WHITE, segs=(14, 4), scale=(1.06, 1.12, 0.48), slot=S["hat"], **H)
    p.box((0, -0.19, 1.075), (0.24, 0.1, 0.02), WHITE, bevel=0.009, seg=0, rot=(6, 0, 0), slot=S["hat"], **H)
    p.sphere((0, -0.03, 1.155), 0.014, WHITE, segs=(6, 4), slot=S["hat"], **H)


def build(mats):
    return C.build_character(mats, "owner", body, {"clipboard": C.clipboard}, budget=150)
