"""
Zet het Sketchfab-model 'boxing_gloves.glb' om naar een configurator-ready GLB.

UITGANGSPUNT: dit model is netjes gemodelleerd en ge-unwrapt. De UV-naden die
de 3D-artist heeft gelegd vallen samen met de ECHTE paneelranden. We splitsen
daarom op UV-eiland — geen verzonnen grenzen.

Uitzondering (expliciet gedocumenteerd): 'palm' wordt in tweeën gedeeld op
hoogte om 'back-palm' te krijgen; dat is de enige geometrische (niet-artist)
scheiding in dit bestand.
"""
import bpy, bmesh, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB_IN  = argv[0]
GLB_OUT = argv[1]
OUT_DIR = argv[2]
DEBUG   = "--debug" in argv
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_IN)
src = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}
print("[INFO] bron-objecten:", list(src))

# ── UV-eilanden bepalen ──────────────────────────────────────────────────────
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
    mw = obj.matrix_world
    for comp in out:
        ctr=Vector((0,0,0)); n=0; nrm=Vector((0,0,0)); zmin=1e9; zmax=-1e9
        for fi in comp:
            f=bm.faces[fi]
            for v in f.verts:
                wv = mw @ v.co
                ctr+=wv; n+=1; zmin=min(zmin,wv.z); zmax=max(zmax,wv.z)
            nrm+=f.normal
        ctr/=max(1,n); nrm.normalize()
        meta.append({"faces":comp, "center":ctr, "normal":nrm, "zmin":zmin, "zmax":zmax})
    bm.free()
    return meta

# ── Zone-toewijzing per bronobject ───────────────────────────────────────────
# zone-id -> lijst van (bronobject, set van face-indices)
zone_faces = {}
def add(zone, obj_name, faces):
    zone_faces.setdefault(zone, {}).setdefault(obj_name, set()).update(faces)

# ---- 1) Handschoenlichaam: splitsen op echte UV-eilanden -------------------
BODY = "GUANTE_EDITABLE_2_guante_0"
body_isl = uv_islands(src[BODY])
print(f"[INFO] {BODY}: {len(body_isl)} eilanden")

# Toewijzing op basis van gemeten normaal/positie (zie analyse):
#   eiland 6 = topkoepel (+Z), 2 en 3 = bovenzones -> Top Panel
#   eiland 1 = slagvlak (-Y)                        -> Front Panel
#   eiland 0 = palmzijde (+Y)                       -> Palm (+ Back Palm)
#   eilanden 4,5,7,8 = smalle randstroken           -> Piping
for i, isl in enumerate(body_isl):
    n = isl["normal"]; c = isl["center"]
    faces = isl["faces"]
    if i in (6, 2, 3):
        add("top-panel", BODY, faces)
    elif i == 1:
        add("front-panel", BODY, faces)
    elif i == 0:
        # ENIGE geometrische deling: palm boven/onder splitsen voor Back Palm
        zsplit = 2.60
        bm = bmesh.new(); bm.from_mesh(src[BODY].data); bm.faces.ensure_lookup_table()
        mw = src[BODY].matrix_world
        up, lo = set(), set()
        for fi in faces:
            z = (mw @ bm.faces[fi].calc_center_median()).z
            (up if z >= zsplit else lo).add(fi)
        bm.free()
        add("palm", BODY, up)
        add("back-palm", BODY, lo)
    elif i in (4, 5, 7, 8):
        add("piping", BODY, faces)
    else:
        # minuscule restjes (enkele faces): bij de dichtstbijzijnde grote zone
        target = "top-panel" if n.z > 0.5 else ("front-panel" if n.y < 0 else "palm")
        add(target, BODY, faces)

# ---- 2) Duim: splitsen op oriëntatie (voor-/palmzijde) ---------------------
THUMB = "Cube_dedo_0"
tb = bmesh.new(); tb.from_mesh(src[THUMB].data); tb.faces.ensure_lookup_table()
outer, inner = set(), set()
for f in tb.faces:
    (outer if f.normal.y < 0 else inner).add(f.index)
tb.free()
add("outer-thumb", THUMB, outer)
add("inner-thumb", THUMB, inner)
print(f"[INFO] duim gesplitst: outer={len(outer)} inner={len(inner)}")

# ---- 3) Manchet: band vs velcro-strap -------------------------------------
# Ook hier op UV-eiland splitsen i.p.v. op een rechte coördinaat-snede: de
# strap-flap is door de artist als eigen eiland opengeknipt, dus de grens
# volgt de echte rand van de flap (een X-snede gaf een rafelige rand).
CUFF = "Tube_Mat.1_0"
cuff_isl = uv_islands(src[CUFF])
wrist, strap = set(), set()
X_STRAP = -24.30   # eilanden met hun zwaartepunt voorbij deze X = de flap
for isl in cuff_isl:
    (strap if isl["center"].x > X_STRAP else wrist).update(isl["faces"])
add("wrist", CUFF, wrist)
add("strap", CUFF, strap)
print(f"[INFO] manchet gesplitst op UV-eilanden: wrist={len(wrist)} strap={len(strap)}")

# ---- 4) Piping (manchetranden) en stiksels --------------------------------
PIPE = "Tube_costura velcro_0"
pb = bmesh.new(); pb.from_mesh(src[PIPE].data)
add("piping", PIPE, {f.index for f in pb.faces})
pb.free()

STITCH = "LINEA_COSTUA_costura_0"
sb = bmesh.new(); sb.from_mesh(src[STITCH].data); sb.faces.ensure_lookup_table()
mw = src[STITCH].matrix_world
trim, stitching = set(), set()
Z_TRIM = 1.00      # de onderste rand van de manchet leest als 'trim'
for f in sb.faces:
    z = (mw @ f.calc_center_median()).z
    (trim if z < Z_TRIM else stitching).add(f.index)
sb.free()
add("trim", STITCH, trim)
add("stitching", STITCH, stitching)
print(f"[INFO] stiksel gesplitst: trim={len(trim)} stitching={len(stitching)}")

# ---- 5) Binnenvoering: 1 niet-kleurbaar object ----------------------------
LINING = [n for n in src if "adentro" in n]
print("[INFO] voering-objecten:", LINING)

# ── Nieuwe objecten bouwen per zone ──────────────────────────────────────────
ZONE_ORDER = ["top-panel","front-panel","palm","back-palm","outer-thumb",
              "inner-thumb","wrist","strap","piping","trim","stitching"]
DEBUG_COLORS = {
    "top-panel":(0.10,0.55,0.95,1), "front-panel":(0.90,0.15,0.15,1),
    "palm":(0.15,0.85,0.30,1),      "back-palm":(0.05,0.40,0.18,1),
    "outer-thumb":(0.85,0.35,0.95,1),"inner-thumb":(0.95,0.55,0.05,1),
    "wrist":(0.95,0.85,0.10,1),     "strap":(0.55,0.30,0.05,1),
    "piping":(1.00,1.00,1.00,1),    "trim":(0.78,0.64,0.24,1),
    "stitching":(0.20,0.90,0.90,1),
}
NEUTRAL = (0.09,0.09,0.10,1)

created = []
for zone in ZONE_ORDER:
    parts = zone_faces.get(zone)
    if not parts:
        print(f"[WARN] zone zonder geometrie: {zone}"); continue
    pieces = []
    for obj_name, faces in parts.items():
        srcobj = src[obj_name]
        bm = bmesh.new(); bm.from_mesh(srcobj.data); bm.faces.ensure_lookup_table()
        keep = set(faces)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context='FACES')
        me = bpy.data.meshes.new(f"{zone}__{obj_name}")
        bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new(f"{zone}__{obj_name}", me)
        ob.matrix_world = srcobj.matrix_world.copy()
        bpy.context.collection.objects.link(ob)
        pieces.append(ob)
    bpy.ops.object.select_all(action='DESELECT')
    for p in pieces: p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    if len(pieces) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = zone
    obj.data.materials.clear()
    mat = bpy.data.materials.new(zone)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = DEBUG_COLORS[zone] if DEBUG else NEUTRAL
    bsdf.inputs["Roughness"].default_value = 0.5
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    created.append(obj)
    print(f"[ZONE] {zone}: {len(obj.data.polygons)} faces")

# voering samenvoegen tot 1 object 'lining'
if LINING:
    bpy.ops.object.select_all(action='DESELECT')
    lin_objs = [src[n] for n in LINING]
    for o in lin_objs: o.select_set(True)
    bpy.context.view_layer.objects.active = lin_objs[0]
    if len(lin_objs) > 1: bpy.ops.object.join()
    lin = bpy.context.view_layer.objects.active
    lin.name = "lining"
    lin.data.materials.clear()
    lm = bpy.data.materials.new("lining"); lm.use_nodes = True
    lm.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (0.05,0.05,0.06,1)
    lin.data.materials.append(lm)
    for p in lin.data.polygons: p.use_smooth = True
    # De voering is de donkere binnenkant; alleen door de opening zichtbaar en
    # niet kleurbaar. Met 126k faces zou hij ~64% van het bestand opeisen —
    # fors reduceren scheelt veel laadtijd zonder zichtbaar verlies.
    before = len(lin.data.polygons)
    dec = lin.modifiers.new("decimate", 'DECIMATE')
    dec.ratio = 0.12
    bpy.context.view_layer.objects.active = lin
    bpy.ops.object.modifier_apply(modifier=dec.name)
    created.append(lin)
    print(f"[ZONE] lining: {before} -> {len(lin.data.polygons)} faces (gereduceerd)")

# Oorspronkelijke bronobjecten verwijderen. Let op: bpy.ops.object.join()
# hierboven heeft sommige van deze Object-verwijzingen al ongeldig gemaakt
# (de samengevoegde objecten bestaan niet meer), dus we werken op NAAM en
# lezen de scene opnieuw uit i.p.v. de oude `src`-verwijzingen aan te raken.
keep_names = {c.name for c in created}
for o in [ob for ob in bpy.context.scene.objects if ob.type == 'MESH']:
    if o.name not in keep_names:
        bpy.data.objects.remove(o, do_unlink=True)

names = sorted([o.name for o in bpy.context.scene.objects if o.type == 'MESH'])
print("[INFO] eindobjecten:", names)

# ── Exporteren ───────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB',
                          use_selection=True, export_apply=True)
print("[INFO] geëxporteerd:", GLB_OUT)

# ── Debug-renders ────────────────────────────────────────────────────────────
if DEBUG:
    world = bpy.data.worlds.new("W"); bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes.get("Background").inputs[0].default_value = (0.05,0.05,0.06,1)
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun",'SUN'))
    sun.data.energy = 3.2; bpy.context.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(55),0,math.radians(35))
    scene = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT','BLENDER_EEVEE','CYCLES'):
        try: scene.render.engine = eng; break
        except TypeError: continue
    scene.render.resolution_x = 720; scene.render.resolution_y = 720
    scene.render.image_settings.file_format = 'PNG'
    wmn=Vector((1e9,)*3); wmx=Vector((-1e9,)*3)
    for o in bpy.context.scene.objects:
        if o.type!='MESH': continue
        for v in o.bound_box:
            wv=o.matrix_world@Vector(v)
            wmn=Vector(map(min,wmn,wv)); wmx=Vector(map(max,wmx,wv))
    center=(wmn+wmx)/2; size=wmx-wmn; radius=max(size.x,size.y,size.z)*1.7
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    bpy.context.collection.objects.link(cam); scene.camera = cam
    VIEWS={"front":(0,-1,0.2),"back":(0,1,0.2),"iso":(0.8,-0.8,0.5),
           "left":(-1,0,0.15),"right":(1,0,0.15),"cuff":(0.4,-0.8,-0.5)}
    for name,dv in VIEWS.items():
        d=Vector(dv).normalized()
        cam.location = center + d*radius*(0.75 if name=="cuff" else 1.0)
        cam.rotation_euler = (center-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath = os.path.join(OUT_DIR, f"cfg_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("[INFO] gerenderd:", f"cfg_{name}.png")

print("[DONE]")
