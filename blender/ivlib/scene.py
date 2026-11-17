"""Scene reset, shared materials, asset roots and anchor points."""
import bpy

from .palette import lin


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"
    scene.render.fps = 30
    if scene.world is None:
        scene.world = bpy.data.worlds.new("World")
    return scene


def _vc_material(name, rough, metal, image=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if image is None:
        ca = nt.nodes.new("ShaderNodeVertexColor")
        ca.layer_name = "Col"
        nt.links.new(ca.outputs["Color"], bsdf.inputs["Base Color"])
    else:
        # Palette texture -> base colour. COLOR_0 (baked occlusion) is exported
        # separately and three.js multiplies it with the texture.
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Closest"
        nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    return m


def materials(worker_image=None):
    """Material slots, matching geo.PAINT, METAL, LAMP, WORKER."""
    paint = _vc_material("IV_Paint", 0.78, 0.08)
    metal = _vc_material("IV_Metal", 0.42, 0.65)
    lamp = bpy.data.materials.new("IV_Lamp")
    lamp.use_nodes = True
    b = lamp.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*lin("lamp"), 1)
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Emission Color"].default_value = (*lin("lamp"), 1)
    b.inputs["Emission Strength"].default_value = 1.0
    out = [paint, metal, lamp]
    if worker_image is not None:
        out.append(_vc_material("IV_Worker", 0.85, 0.0, worker_image))
    return out


def root(name):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = "PLAIN_AXES"
    bpy.context.scene.collection.objects.link(e)
    return e


def anchor(name, loc, parent):
    """Named empty exported as a glTF node. The game reads these instead of
    hard-coding operator spots, output bins and issue badges."""
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.15
    e.location = loc
    e.parent = parent
    bpy.context.scene.collection.objects.link(e)
    return e
