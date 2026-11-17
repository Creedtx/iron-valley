"""Preview renders from the game's fixed camera angle (orthographic, 45 degrees
round, 35 degrees down), lit like the factory: warm low sun, cool fill."""
import math

import bpy
from mathutils import Vector

from .palette import lin

CAM_AZ, CAM_EL = 45.0, 35.0


def _bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != "MESH":
            continue
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = ev.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, w))
            hi = Vector(map(max, hi, w))
    return lo, hi


def render_preview(objs, path, size=720, samples=40, margin=1.18, floor_color="concrete"):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x = size
    scene.render.resolution_y = size
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"

    lo, hi = _bounds(objs)
    center = (lo + hi) / 2
    radius = (hi - lo).length / 2

    temp = []
    # floor
    me = bpy.data.meshes.new("_floor")
    s = 40
    me.from_pydata([(-s, -s, 0), (s, -s, 0), (s, s, 0), (-s, s, 0)], [], [(0, 1, 2, 3)])
    fm = bpy.data.materials.new("_floor")
    fm.use_nodes = True
    fb = fm.node_tree.nodes["Principled BSDF"]
    fb.inputs["Base Color"].default_value = (*lin(floor_color), 1)
    fb.inputs["Roughness"].default_value = 0.95
    me.materials.append(fm)
    fl = bpy.data.objects.new("_floor", me)
    scene.collection.objects.link(fl)
    temp.append(fl)

    # world: dim cool fill
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*lin("#2a3340"), 1)
    bg.inputs["Strength"].default_value = 1.6

    sun_d = bpy.data.lights.new("_sun", "SUN")
    sun_d.energy = 4.2
    sun_d.color = lin("#ffd6a2")
    sun_d.angle = math.radians(6)
    sun = bpy.data.objects.new("_sun", sun_d)
    sun.rotation_euler = (math.radians(52), 0, math.radians(-28))
    scene.collection.objects.link(sun)
    temp.append(sun)

    cam_d = bpy.data.cameras.new("_cam")
    cam_d.type = "ORTHO"
    cam_d.ortho_scale = radius * 2 * margin
    cam = bpy.data.objects.new("_cam", cam_d)
    az, el = math.radians(CAM_AZ), math.radians(CAM_EL)
    d = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.location = center + d * (radius * 4 + 5)
    cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    cam_d.clip_end = 200
    scene.collection.objects.link(cam)
    scene.camera = cam
    temp.append(cam)

    scene.render.filepath = path
    scene.render.image_settings.file_format = "PNG"
    bpy.ops.render.render(write_still=True)

    for o in temp:
        bpy.data.objects.remove(o, do_unlink=True)
    return path
