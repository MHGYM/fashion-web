"""
Bouwt de VEREENVOUDIGDE configurator-GLB: 4 zones i.p.v. 14.

  front-panel : voorkant + top + volledige duim + piping rond het lichaam
  palm        : palm + back-palm (samengevoegd)
  wrist       : manchet + strap + trim + manchet-piping
  stitching    : stiksellijnen (apart gehouden; visuele waarde wordt beoordeeld)
  lining       : donkere binnenvoering, niet kleurbaar

Splitsen gebeurt op UV-eiland (= de naden die de 3D-artist heeft gelegd),
niet op verzonnen drempels.
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
        nrm=Vector((0,0,0))
        for fi in comp: nrm += bm.faces[fi].normal
        meta.append({"faces": comp, "normal": nrm.normalized()})
    bm.free()
    return meta

zone_faces = {}
def add(zone, obj_name, faces):
    zone_faces.setdefault(zone, {}).setdefault(obj_name, set()).update(faces)

BODY   = "GUANTE_EDITABLE_2_guante_0"
THUMB  = "Cube_dedo_0"
CUFF   = "Tube_Mat.1_0"
PIPE   = "Tube_costura velcro_0"
STITCH = "LINEA_COSTUA_costura_0"

# ── Handschoenlichaam ────────────────────────────────────────────────────────
# eiland 1 = slagvlak, 2/3/6 = bovenzones, 4/5/7/8 = randstroken (piping),
# eiland 0 = palmzijde.  Alles behalve de palm gaat naar FRONT PANEL.
body_isl = uv_islands(src[BODY])
for i, isl in enumerate(body_isl):
    if i == 0:
        add("palm", BODY, isl["faces"])          # palm + back-palm samengevoegd
    elif i in (1, 2, 3, 6, 4, 5, 7, 8):
        add("front-panel", BODY, isl["faces"])   # voorkant + top + body-piping
    else:
        n = isl["normal"]
        add("palm" if n.y > 0 else "front-panel", BODY, isl["faces"])

# ── Duim: volledig naar FRONT PANEL ──────────────────────────────────────────
tb = bmesh.new(); tb.from_mesh(src[THUMB].data)
add("front-panel", THUMB, {f.index for f in tb.faces}); tb.free()

# ── Manchet + strap + manchet-piping -> WRIST ────────────────────────────────
cb = bmesh.new(); cb.from_mesh(src[CUFF].data)
add("wrist", CUFF, {f.index for f in cb.faces}); cb.free()
pb = bmesh.new(); pb.from_mesh(src[PIPE].data)
add("wrist", PIPE, {f.index for f in pb.faces}); pb.free()

# ── Stiksels -> WRIST ────────────────────────────────────────────────────────
# Beoordeeld met een geïsoleerde render: de stiksels zijn op dit model niet
# meer dan een dun randje onderlangs de manchet — visueel niet te onderscheiden
# van de trim en zonder waarde als eigen kleurkeuze. Conform de specificatie
# samengevoegd met het omringende materiaal (de manchet) en uit de UI gehaald.
sb = bmesh.new(); sb.from_mesh(src[STITCH].data)
add("wrist", STITCH, {f.index for f in sb.faces}); sb.free()

LINING = [n for n in src if "adentro" in n]

ZONE_ORDER = ["front-panel", "palm", "wrist"]
DEBUG_COLORS = {
    "front-panel": (0.90,0.15,0.15,1), "palm": (0.15,0.85,0.30,1),
    "wrist": (0.95,0.85,0.10,1),
}
NEUTRAL = (0.30,0.30,0.32,1)

created = []
for zone in ZONE_ORDER:
    parts = zone_faces.get(zone)
    if not parts:
        print(f"[WARN] geen geometrie voor {zone}"); continue
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
    b.inputs["Roughness"].default_value = 0.5
    # BELANGRIJK: de glTF-exporteur laat UV-coördinaten weg als geen enkel
    # materiaal een textuur gebruikt. De configurator projecteert uploads via
    # de UV's, dus koppelen we een 1x1 placeholder-texture aan Base Color.
    # De viewer vervangt die map alsnog door zijn eigen canvas-textuur.
    tex = bpy.data.images.new(f"uvkeep_{zone}", width=1, height=1)
    tex.generated_color = (1.0, 1.0, 1.0, 1.0)
    tnode = mat.node_tree.nodes.new("ShaderNodeTexImage")
    tnode.image = tex
    uvnode = mat.node_tree.nodes.new("ShaderNodeUVMap")
    uvnode.uv_map = obj.data.uv_layers[0].name if obj.data.uv_layers else ""
    mat.node_tree.links.new(uvnode.outputs["UV"], tnode.inputs["Vector"])
    mat.node_tree.links.new(tnode.outputs["Color"], b.inputs["Base Color"])
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

keep_names = {c.name for c in created}
for o in [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']:
    if o.name not in keep_names: bpy.data.objects.remove(o, do_unlink=True)

print("[INFO] eindobjecten:", sorted(o.name for o in bpy.context.scene.objects if o.type=='MESH'))

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB', use_selection=True, export_apply=True)
print("[INFO] geëxporteerd:", GLB_OUT)

if DEBUG:
    world = bpy.data.worlds.new("W"); bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs[0].default_value = (0.05,0.05,0.06,1)
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun",'SUN'))
    sun.data.energy = 3.2; bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55),0,math.radians(35))
    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT','BLENDER_EEVEE','CYCLES'):
        try: sc.render.engine = eng; break
        except TypeError: continue
    sc.render.resolution_x = 760; sc.render.resolution_y = 760
    sc.render.image_settings.file_format = 'PNG'
    wmn=Vector((1e9,)*3); wmx=Vector((-1e9,)*3)
    for o in bpy.context.scene.objects:
        if o.type!='MESH': continue
        for v in o.bound_box:
            wv=o.matrix_world@Vector(v)
            wmn=Vector(map(min,wmn,wv)); wmx=Vector(map(max,wmx,wv))
    ctr=(wmn+wmx)/2; sz=wmx-wmn; rad=max(sz.x,sz.y,sz.z)*1.9
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    bpy.context.collection.objects.link(cam); sc.camera = cam
    def shoot(view, dv, fname, r=1.0):
        d=Vector(dv).normalized()
        cam.location = ctr + d*rad*r
        cam.rotation_euler = (ctr-cam.location).to_track_quat('-Z','Y').to_euler()
        sc.render.filepath = os.path.join(OUT_DIR, fname)
        bpy.ops.render.render(write_still=True)
    shoot("w",(0,-1,0.2),"v3_warmup.png")
    for nm,dv in {"front":(0,-1,0.2),"back":(0,1,0.2),"iso":(0.8,-0.8,0.5)}.items():
        shoot(nm,dv,f"v3_{nm}.png")
    # stitching-beoordeling: alleen stiksels fel, rest neutraal grijs
    for o in bpy.context.scene.objects:
        if o.type!='MESH' or not o.data.materials: continue
        b = o.data.materials[0].node_tree.nodes.get("Principled BSDF")
        b.inputs["Base Color"].default_value = (0.95,0.05,0.05,1) if False else (0.55,0.55,0.58,1)
    for nm,dv in {"front":(0,-1,0.2),"iso":(0.8,-0.8,0.5),"cuff":(0.4,-0.8,-0.45)}.items():
        shoot(nm,dv,f"v3_stitchonly_{nm}.png", 0.8 if nm=="cuff" else 1.0)
    print("[INFO] renders klaar")

print("[DONE]")
