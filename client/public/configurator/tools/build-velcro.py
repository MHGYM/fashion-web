"""
Herbouwt het VELCRO-model (boxing_gloves.glb) naar dezelfde 8 zones als het
lace-up model, zodat beide modellen dezelfde configurator-UI delen.

Het bronmodel is netjes ge-unwrapt: er wordt gesplitst op UV-eiland (de naden
die de 3D-artist zelf legde), niet op verzonnen drempels.

'laces' ontbreekt bewust: dit is een velcro-handschoen zonder veters. Het
profiel markeert die zone als niet-beschikbaar.
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB_IN, GLB_OUT, OUT_DIR = argv[0], argv[1], argv[2]
DEBUG = "--debug" in argv
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_IN)
src = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}

def uv_islands(obj):
    bm = bmesh.new(); bm.from_mesh(obj.data); bm.faces.ensure_lookup_table()
    uv = bm.loops.layers.uv.active
    fu = {f.index: set((round(l[uv].uv.x,5), round(l[uv].uv.y,5)) for l in f.loops) for f in bm.faces}
    adj = {f.index: [] for f in bm.faces}
    for f in bm.faces:
        for e in f.edges:
            for lf in e.link_faces:
                if lf.index != f.index and len(fu[f.index] & fu[lf.index]) >= 2:
                    adj[f.index].append(lf.index)
    seen=set(); out=[]
    for f in bm.faces:
        if f.index in seen: continue
        comp=[]; st=[f.index]
        while st:
            fi=st.pop()
            if fi in seen: continue
            seen.add(fi); comp.append(fi)
            for nb in adj[fi]:
                if nb not in seen: st.append(nb)
        out.append(comp)
    out.sort(key=len, reverse=True)
    meta=[]
    for comp in out:
        n=Vector((0,0,0))
        for fi in comp: n += bm.faces[fi].normal
        meta.append({"faces": comp, "normal": n.normalized()})
    bm.free()
    return meta

zone_faces = {}
def add(zone, obj_name, faces):
    zone_faces.setdefault(zone, {}).setdefault(obj_name, set()).update(faces)

BODY="GUANTE_EDITABLE_2_guante_0"; THUMB="Cube_dedo_0"
CUFF="Tube_Mat.1_0"; PIPE="Tube_costura velcro_0"; STITCH="LINEA_COSTUA_costura_0"

# Eilanden: 1/2/3/6 = voorkant + bovenzijde, 0 = palmzijde, 4/5/7/8 = randstroken
for i, isl in enumerate(uv_islands(src[BODY])):
    if i == 0:                       add("palm", BODY, isl["faces"])
    elif i in (1, 2, 3, 6):          add("front-panel", BODY, isl["faces"])
    elif i in (4, 5, 7, 8):          add("piping", BODY, isl["faces"])
    else:
        add("front-panel" if isl["normal"].y < 0 else "palm", BODY, isl["faces"])

# Duim splitsen op oriëntatie: voorzijde vs palmzijde
tb = bmesh.new(); tb.from_mesh(src[THUMB].data); tb.faces.ensure_lookup_table()
add("outer-thumb", THUMB, {f.index for f in tb.faces if f.normal.y < 0})
add("inner-thumb", THUMB, {f.index for f in tb.faces if f.normal.y >= 0})
tb.free()

for name, zone in ((CUFF, "wrist"), (PIPE, "piping"), (STITCH, "stitching")):
    bm = bmesh.new(); bm.from_mesh(src[name].data)
    add(zone, name, {f.index for f in bm.faces}); bm.free()

LINING = [n for n in src if "adentro" in n]

ZONE_ORDER = ["front-panel","palm","wrist","piping","stitching","outer-thumb","inner-thumb"]
DEBUG_COLORS = {
    "front-panel": (0.90,0.15,0.15,1), "palm": (0.15,0.85,0.30,1),
    "wrist": (0.95,0.85,0.10,1),       "piping": (0.10,0.55,0.95,1),
    "stitching": (0.95,0.35,0.95,1),   "outer-thumb": (0.60,0.30,0.95,1),
    "inner-thumb": (0.95,0.55,0.05,1),
}
NEUTRAL = (0.30,0.30,0.32,1)

created = []
for zone in ZONE_ORDER:
    parts = zone_faces.get(zone)
    if not parts: print(f"[WARN] geen geometrie voor {zone}"); continue
    pieces = []
    for obj_name, faces in parts.items():
        s = src[obj_name]
        bm = bmesh.new(); bm.from_mesh(s.data); bm.faces.ensure_lookup_table()
        keep = set(faces)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
        me = bpy.data.meshes.new(f"{zone}__{obj_name}")
        bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(f"{zone}__{obj_name}", me)
        ob.matrix_world = s.matrix_world.copy()
        bpy.context.collection.objects.link(ob)
        pieces.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for p in pieces: p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    if len(pieces) > 1: bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = zone
    obj.data.materials.clear()
    mat = bpy.data.materials.new(zone); mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = DEBUG_COLORS[zone] if DEBUG else NEUTRAL
    b.inputs["Roughness"].default_value = 0.45
    # placeholder-texture houdt TEXCOORD_0 in de export (zie README)
    if obj.data.uv_layers:
        img = bpy.data.images.new(f"uvkeep_{zone}", width=1, height=1)
        img.generated_color = (1,1,1,1)
        tn = mat.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img
        un = mat.node_tree.nodes.new("ShaderNodeUVMap"); un.uv_map = obj.data.uv_layers[0].name
        mat.node_tree.links.new(un.outputs["UV"], tn.inputs["Vector"])
        mat.node_tree.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    created.append(obj)
    print(f"[ZONE] {zone}: {len(obj.data.polygons)} faces")

if LINING:
    bpy.ops.object.select_all(action='DESELECT')
    lo = [src[n] for n in LINING]
    for o in lo: o.select_set(True)
    bpy.context.view_layer.objects.active = lo[0]
    if len(lo) > 1: bpy.ops.object.join()
    lin = bpy.context.view_layer.objects.active
    lin.name = "lining"
    lin.data.materials.clear()
    lm = bpy.data.materials.new("lining"); lm.use_nodes = True
    lm.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.05,0.05,0.06,1)
    lin.data.materials.append(lm)
    for p in lin.data.polygons: p.use_smooth = True
    before = len(lin.data.polygons)
    d = lin.modifiers.new("dec", 'DECIMATE'); d.ratio = 0.12
    bpy.context.view_layer.objects.active = lin
    bpy.ops.object.modifier_apply(modifier=d.name)
    created.append(lin)
    print(f"[ZONE] lining: {before} -> {len(lin.data.polygons)} faces")

keep = {c.name for c in created}
for o in [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']:
    if o.name not in keep: bpy.data.objects.remove(o, do_unlink=True)

print("[INFO] eindobjecten:", sorted(o.name for o in bpy.context.scene.objects if o.type=='MESH'))

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB', use_selection=True, export_apply=True)
print("[INFO] geëxporteerd:", GLB_OUT)
print("[DONE]")
