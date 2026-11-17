"""Iron Valley palette. One place for every colour the models use.

Values are sRGB hex as picked from the mockups and build 0.2; Blender and glTF
store vertex colours in linear space, so everything goes through lin().
"""

HEX = {
    # paint
    "olive": "#5d6b3a", "olive_dark": "#4a5630", "blue": "#3f6c94", "blue_dark": "#30567a",
    "yellow": "#e3a52a", "yellow_deep": "#a87615", "brick": "#8e3b2f", "red": "#b3261e",
    "cream": "#d9d0b8", "orange": "#d9772b",
    # metals
    "steel": "#8d939a", "steel_dark": "#2c2f33", "grey": "#5b6168", "chrome": "#c9ced3",
    "gunmetal": "#3a3d41", "brass": "#b8913a",
    # materials
    "rust": "#7c5a3c", "rust_light": "#96603a", "wood": "#a8794a", "wood_dark": "#7d5530",
    "rubber": "#1b1b1b", "black": "#161616", "paper": "#ece6d6", "glass": "#4f6a78",
    "concrete": "#77746c",
    # status lamp base (the game drives its emissive colour)
    "lamp": "#3a3f45",
}

# Worker palette slots. Character meshes are UV-mapped into a 32x1 texture,
# one texel per slot, so the game can recolour anyone with one tiny texture.
WORKER_SLOTS = ["skin", "hair", "shirt", "suit", "pants", "boots", "hat", "eyes",
                "metal", "stache", "belt", "glove", "spare1", "spare2", "spare3", "spare4",
                "vest", "stripe", "tool", "board", "paper", "lens", "muff", "cord",
                "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8"]

WORKER_DEFAULT = {
    "skin": "#e0ac85", "hair": "#4b3424", "shirt": "#c9b28a", "suit": "#3f6c94",
    "pants": "#2f3b52", "boots": "#1b1814", "hat": "#e3a52a", "eyes": "#161616",
    "metal": "#8d939a", "stache": "#4b3424", "belt": "#3b2a1c", "glove": "#8a6a3e",
    "spare1": "#a8322a", "spare2": "#f4efe6", "spare3": "#e2967f", "spare4": "#2a2420",
    "vest": "#f2c230", "stripe": "#dfe3e6", "tool": "#c23b2a", "board": "#8a6440",
    "paper": "#f1ede2", "lens": "#9fd0e6", "muff": "#c23b2a", "cord": "#1d1d1d",
    "x1": "#ffffff", "x2": "#ffffff", "x3": "#ffffff", "x4": "#ffffff",
    "x5": "#ffffff", "x6": "#ffffff", "x7": "#ffffff", "x8": "#ffffff",
}
# spare1 = tie, spare2 = whites of the eyes, spare3 = cheeks, spare4 = soles

# Role colour swaps. Same rig, same mesh, different texture; hard-hat colours
# follow site convention (white = management, blue = electrical).
ROLES = {
    "operator":    {"suit": "#3f6c94", "hat": "#e3a52a", "muff": "#c23b2a"},
    "loader":      {"suit": "#5d6b3a", "hat": "#d9772b", "vest": "#f2c230"},
    "electrician": {"suit": "#2b3f5c", "hat": "#2f7fd0", "shirt": "#b8c9d8", "tool": "#e8c02a"},
    "mechanic":    {"suit": "#b9562b", "hat": "#2c2f33", "tool": "#c23b2a"},
    "supervisor":  {"suit": "#3a3d41", "hat": "#f4f1ea", "shirt": "#f1ece0", "vest": "#f07a22"},
}


def _s2l(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def srgb(hexstr):
    h = hexstr.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lin(name_or_hex):
    """Linear RGB tuple for a palette name or a '#rrggbb' string."""
    hx = HEX.get(name_or_hex, name_or_hex)
    return tuple(_s2l(c) for c in srgb(hx))
