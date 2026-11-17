"""GLB export and a size/complexity report read back from the written file."""
import json
import os
import struct

import bpy


def export_glb(root, path, animations=False):
    bpy.ops.object.select_all(action="DESELECT")
    for o in [root, *root.children_recursive]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=False,
        export_image_format="AUTO",
        export_cameras=False,
        export_lights=False,
        export_extras=False,
        export_animations=animations,
        export_animation_mode="ACTIONS",
        # Sampled LINEAR keys, never CUBICSPLINE: meshopt quantises animation
        # outputs to 16 bits, which wrecks spline tangents (build 0.4 idle swayed
        # the whole upper body by ~30 degrees because of it).
        export_force_sampling=True,
        export_frame_step=2,
        export_optimize_animation_size=True,
        export_skins=animations,
        export_def_bones=True,
        export_morph=False,
    )
    return path


def glb_report(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, _ver, _len = struct.unpack_from("<III", data, 0)
    assert magic == 0x46546C67, "not a GLB"
    jlen, _jtype = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20:20 + jlen])
    acc = gltf.get("accessors", [])
    tris = verts = prims = 0
    mats_used = set()
    for m in gltf.get("meshes", []):
        for p in m["primitives"]:
            prims += 1
            verts += acc[p["attributes"]["POSITION"]]["count"]
            if "indices" in p:
                tris += acc[p["indices"]]["count"] // 3
            if "material" in p:
                mats_used.add(p["material"])
    return {
        "bytes": len(data),
        "kib": round(len(data) / 1024, 1),
        "triangles": tris,
        "vertices": verts,
        "draw_calls": prims,
        "materials": len(mats_used),
        "nodes": [n.get("name", "") for n in gltf.get("nodes", [])],
        "animations": [a.get("name", "") for a in gltf.get("animations", [])],
        "images": len(gltf.get("images", [])),
    }
