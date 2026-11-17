"""Low-poly geometry builder.

A Part collects primitives (boxes, cylinders, spheres, extruded profiles) in
asset space, metres, Blender axes: X right, -Y front (towards the game camera),
Z up. Each primitive carries a palette colour, a material slot and, for the
worker, a bone name and a palette-texture slot. Part.to_object() turns it into
one mesh object, so a machine is a handful of objects, not hundreds.
"""
import math
import random

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

from .palette import lin

PAINT, METAL, LAMP, WORKER = 0, 1, 2, 3


def _mat(loc=(0, 0, 0), rot=(0, 0, 0)):
    return Matrix.Translation(Vector(loc)) @ Euler([math.radians(a) for a in rot], "XYZ").to_matrix().to_4x4()


class Part:
    def __init__(self, name, seed=1):
        self.name = name
        self.bm = bmesh.new()
        self.col = self.bm.loops.layers.float_color.new("base")
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.grp = self.bm.verts.layers.int.new("grp")
        self.groups = []
        self.rng = random.Random(seed)

    # ------------------------------------------------------------------ merge
    def _merge(self, tmp, color, mat=PAINT, group=None, slot=None, jitter=0.035,
               dirt=0.0, smooth_fn=None, nslots=16):
        base = Vector(lin(color)) if isinstance(color, str) else Vector(color)
        gi = 0
        if group is not None:
            if group not in self.groups:
                self.groups.append(group)
            gi = self.groups.index(group)
        vmap = {}
        for v in tmp.verts:
            nv = self.bm.verts.new(v.co)
            nv[self.grp] = gi
            vmap[v] = nv
        uv = ((slot + 0.5) / nslots, 0.5) if slot is not None else (0.5, 0.5)
        # one tint per primitive, so coplanar faces stay weldable after export
        k = 1.0 + (self.rng.random() - 0.5) * 2 * jitter
        for f in tmp.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:  # duplicate face; skip
                continue
            nf.material_index = mat
            nf.smooth = smooth_fn(f) if smooth_fn else f.smooth
            for loop in nf.loops:
                z = loop.vert.co.z
                d = 1.0 - dirt * max(0.0, 1.0 - z / 1.0)  # grime near the floor
                c = base * k * d
                loop[self.col] = (c.x, c.y, c.z, 1.0)
                loop[self.uv].uv = uv
        tmp.free()

    # -------------------------------------------------------------- primitives
    def box(self, center, size, color, mat=PAINT, rot=(0, 0, 0), bevel=0.0, seg=0.7, **kw):
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=1.0)
        sx, sy, sz = size
        for v in tmp.verts:
            v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz))
        if seg:
            for axis, length in ((0, sx), (1, sy), (2, sz)):
                cuts = min(3, max(0, math.ceil(length / seg) - 1))
                if not cuts:
                    continue
                edges = [e for e in tmp.edges
                         if abs((e.verts[0].co - e.verts[1].co)[axis]) > length * 0.5]
                bmesh.ops.subdivide_edges(tmp, edges=edges, cuts=cuts, use_grid_fill=True)
        if bevel:
            sharp = [e for e in tmp.edges if len(e.link_faces) == 2
                     and e.link_faces[0].normal.angle(e.link_faces[1].normal) > 0.5]
            verts = list({v for e in sharp for v in e.verts})
            bmesh.ops.bevel(tmp, geom=sharp + verts, offset=bevel, segments=1,
                            affect="EDGES", profile=0.5, clamp_overlap=True)
        for f in tmp.faces:
            f.smooth = False
        bmesh.ops.transform(tmp, matrix=_mat(center, rot), verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    def cyl(self, center, radius, depth, color, mat=PAINT, axis="Z", segs=12, radius2=None,
            rot=(0, 0, 0), caps=True, smooth=True, **kw):
        tmp = bmesh.new()
        bmesh.ops.create_cone(tmp, cap_ends=caps, cap_tris=False, segments=segs,
                              radius1=radius, radius2=radius if radius2 is None else radius2, depth=depth)
        tmp.normal_update()
        rim = []
        for f in tmp.faces:
            side = abs(f.normal.z) < 0.7
            f.smooth = smooth and side
        for e in tmp.edges:
            if len(e.link_faces) == 2 and e.link_faces[0].smooth != e.link_faces[1].smooth:
                rim.append(e)
        if rim:
            bmesh.ops.split_edges(tmp, edges=rim)
        pre = {"Z": (0, 0, 0), "X": (0, 90, 0), "Y": (90, 0, 0)}[axis]
        m = _mat(center, rot) @ _mat((0, 0, 0), pre)
        bmesh.ops.transform(tmp, matrix=m, verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    def sphere(self, center, radius, color, mat=PAINT, segs=(10, 7), scale=(1, 1, 1),
               rot=(0, 0, 0), smooth=True, **kw):
        tmp = bmesh.new()
        bmesh.ops.create_uvsphere(tmp, u_segments=segs[0], v_segments=segs[1], radius=radius)
        for v in tmp.verts:
            v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        for f in tmp.faces:
            f.smooth = smooth
        bmesh.ops.transform(tmp, matrix=_mat(center, rot), verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    def dome(self, center, radius, color, mat=PAINT, segs=(10, 4), scale=(1, 1, 1), **kw):
        """Upper half sphere with a flat underside (hard hats, tank ends)."""
        tmp = bmesh.new()
        bmesh.ops.create_uvsphere(tmp, u_segments=segs[0], v_segments=segs[1] * 2, radius=radius)
        bmesh.ops.delete(tmp, geom=[v for v in tmp.verts if v.co.z < -1e-4], context="VERTS")
        edges = [e for e in tmp.edges if e.is_boundary]
        if edges:
            bmesh.ops.holes_fill(tmp, edges=edges, sides=0)
        tmp.normal_update()
        for v in tmp.verts:
            v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        for f in tmp.faces:
            f.smooth = f.normal.z > -0.9
        bmesh.ops.transform(tmp, matrix=_mat(center), verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    def prism(self, pts, depth, color, mat=PAINT, plane="XZ", offset=0.0, rot=(0, 0, 0),
              center=(0, 0, 0), **kw):
        """Extrude a 2D outline. plane 'XZ' extrudes along Y, 'YZ' along X, 'XY' along Z."""
        tmp = bmesh.new()

        def p3(u, v, w):
            if plane == "XZ":
                return Vector((u, w, v))
            if plane == "YZ":
                return Vector((w, u, v))
            return Vector((u, v, w))

        front = [tmp.verts.new(p3(u, v, offset - depth / 2)) for u, v in pts]
        back = [tmp.verts.new(p3(u, v, offset + depth / 2)) for u, v in pts]
        tmp.faces.new(front)
        tmp.faces.new(list(reversed(back)))
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            tmp.faces.new([front[j], front[i], back[i], back[j]])
        bmesh.ops.recalc_face_normals(tmp, faces=tmp.faces)
        for f in tmp.faces:
            f.smooth = False
        bmesh.ops.transform(tmp, matrix=_mat(center, rot), verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    def gear(self, center, radius, teeth, depth, thick, color, mat=METAL, axis="Y", **kw):
        pts = []
        n = teeth * 2
        for i in range(n):
            a = i / n * math.tau
            r = radius if i % 2 else radius - depth
            pts.append((math.cos(a) * r, math.sin(a) * r))
        plane = {"Y": "XZ", "X": "YZ", "Z": "XY"}[axis]
        self.prism(pts, thick, color, mat, plane=plane, center=center, **kw)

    def beam(self, a, b, thick, color, mat=METAL, **kw):
        """Square bar from point a to point b."""
        a, b = Vector(a), Vector(b)
        d = b - a
        length = d.length
        tmp = bmesh.new()
        bmesh.ops.create_cube(tmp, size=1.0)
        for v in tmp.verts:
            v.co = Vector((v.co.x * thick, v.co.y * thick, v.co.z * length))
        for f in tmp.faces:
            f.smooth = False
        rot = d.normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        bmesh.ops.transform(tmp, matrix=Matrix.Translation((a + b) / 2) @ rot, verts=tmp.verts)
        self._merge(tmp, color, mat, **kw)

    # ----------------------------------------------------------------- output
    def tris(self):
        return sum(len(f.verts) - 2 for f in self.bm.faces)

    def to_object(self, materials, pivot=(0, 0, 0), parent=None, collection=None):
        mesh = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(mesh)
        self.bm.free()
        mesh.transform(Matrix.Translation(-Vector(pivot)))
        for m in materials:
            mesh.materials.append(m)
        obj = bpy.data.objects.new(self.name, mesh)
        (collection or bpy.context.scene.collection).objects.link(obj)
        obj.location = pivot
        if parent is not None:
            obj.parent = parent
        if self.groups:
            vgs = [obj.vertex_groups.new(name=g) for g in self.groups]
            buckets = {}
            for i, d in enumerate(mesh.attributes["grp"].data):
                buckets.setdefault(d.value, []).append(i)
            for gi, idx in buckets.items():
                vgs[gi].add(idx, 1.0, "REPLACE")
        if "grp" in mesh.attributes:
            mesh.attributes.remove(mesh.attributes["grp"])
        return obj
