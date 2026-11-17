"""Bake ambient occlusion into vertex colours with Cycles.

The game draws these models with cheap materials and no real-time shadows on
low-end phones, so contact darkening has to live in the mesh. Final colour
attribute 'Col' = base colour x occlusion. A temporary floor is included so
machines darken where they meet the ground; it is deleted before export.
"""
import bpy
import numpy as np


def _corner_array(mesh, name):
    attr = mesh.attributes[name]
    arr = np.empty(len(attr.data) * 4, dtype=np.float32)
    attr.data.foreach_get("color", arr)
    return arr.reshape(-1, 4)


def bake_ao(objects, samples=64, distance=0.55, strength=0.72, floor=True, floor_z=0.0, groups=None):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.world.light_settings.distance = distance
    scene.render.bake.target = "VERTEX_COLORS"

    ground = None
    if floor:
        mesh = bpy.data.meshes.new("_bake_floor")
        s = 30
        mesh.from_pydata([(-s, -s, floor_z), (s, -s, floor_z), (s, s, floor_z), (-s, s, floor_z)], [], [(0, 1, 2, 3)])
        ground = bpy.data.objects.new("_bake_floor", mesh)
        scene.collection.objects.link(ground)

    meshes = [o for o in objects if o.type == "MESH"]
    for o in meshes:
        me = o.data
        if "ao" not in me.color_attributes:
            me.color_attributes.new("ao", "FLOAT_COLOR", "CORNER")
        me.color_attributes.active_color = me.color_attributes["ao"]

    if groups:
        # Bake each group's last mesh with only that group visible, so
        # optional parts (hats, hair) do not shadow each other.
        for g in groups:
            for o in meshes:
                o.hide_render = o not in g
            target = g[-1]
            bpy.ops.object.select_all(action="DESELECT")
            target.select_set(True)
            bpy.context.view_layer.objects.active = target
            bpy.ops.object.bake(type="AO")
        for o in meshes:
            o.hide_render = False
    else:
        bpy.ops.object.select_all(action="DESELECT")
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.bake(type="AO")

    for o in meshes:
        me = o.data
        base = _corner_array(me, "base")
        ao = _corner_array(me, "ao")[:, :1]
        occ = 1.0 - strength * (1.0 - ao)
        out = base.copy()
        out[:, :3] = base[:, :3] * occ
        out[:, 3] = 1.0
        col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
        col.data.foreach_set("color", out.ravel())
        for n in ("ao", "base"):
            me.color_attributes.remove(me.color_attributes[n])
        me.color_attributes.active_color = me.color_attributes["Col"]
        me.color_attributes.render_color_index = me.color_attributes.active_color_index

    if ground:
        bpy.data.objects.remove(ground, do_unlink=True)


def flat_color(objects):
    """No bake (fast mode): Col = base."""
    for o in objects:
        if o.type != "MESH":
            continue
        me = o.data
        base = _corner_array(me, "base")
        col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
        col.data.foreach_set("color", base.ravel())
        me.color_attributes.remove(me.color_attributes["base"])
        me.color_attributes.active_color = me.color_attributes["Col"]
