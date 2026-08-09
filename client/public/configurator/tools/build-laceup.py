"""
Zet 'Back Cuff Padding Design.glb' om naar configurator-ready (8 zones).

Dit model is al netjes per onderdeel gescheiden door de 3D-artist; er hoeft
niets gesplitst te worden. Alleen: hernoemen naar onze zone-id's, het
verdwaalde duplicaat weggooien, en materialen klaarzetten.

LET OP — de namen van de artist zijn omgedraaid t.o.v. de intuïtie:
  Back_Palm  = de VOORKANT (slagvlak)      -> front-panel
  Front_Palm = de PALMZIJDE                -> palm
Geverifieerd met geïsoleerde renders per mesh.
"""
import bpy, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
GLB_IN, GLB_OUT, OUT_DIR = argv[0], argv[1], argv[2]
DEBUG = "--debug" in argv
os.makedirs(OUT_DIR, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# bronnaam -> zone-id (of None = statisch/niet kleurbaar, of 'DROP' = weg)
MAP = {
    "Back_Palm":       "front-panel",
    "Front_Palm":      "palm",
    "Back_Cuff":       "wrist",
    "Laces":           "laces",
    "Piping":          "piping",
    "Stitching":       "stitching",
    "Thumb_Outer":     "outer-thumb",
    "Thum_Inner":      "inner-thumb",   # typefout zit in het bronbestand
    "Inner_Strip":     None,
    "Inner_Black":     None,
    # Ligt ver buiten de handschoen (Y tot 2.12 terwijl de rest binnen ~0.6
    # blijft) en rendert niets zichtbaars: een vergeten duplicaat dat alleen
    # de bounding box scheeftrekt en daarmee het camerakader verpest.
    "Inner_Black.001": "DROP",
}

DEBUG_COLORS = {
    "front-panel": (0.90,0.15,0.15,1), "palm": (0.15,0.85,0.30,1),
    "wrist": (0.95,0.85,0.10,1),       "laces": (1.00,1.00,1.00,1),
    "piping": (0.10,0.55,0.95,1),      "stitching": (0.95,0.35,0.95,1),
    "outer-thumb": (0.60,0.30,0.95,1), "inner-thumb": (0.95,0.55,0.05,1),
}
NEUTRAL = (0.30,0.30,0.32,1)
STATIC  = (0.05,0.05,0.06,1)

statics = []
for obj in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    target = MAP.get(obj.name, None)
    if target == "DROP":
        print(f"[DROP] {obj.name} verwijderd (verdwaald duplicaat)")
        bpy.data.objects.remove(obj, do_unlink=True)
        continue

    zone = target
    obj.name = zone if zone else f"static_{len(statics)}"
    if not zone:
        statics.append(obj.name)

    obj.data.materials.clear()
    mat = bpy.data.materials.new(obj.name)
    mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    color = (DEBUG_COLORS.get(zone, NEUTRAL) if DEBUG else NEUTRAL) if zone else STATIC
    b.inputs["Base Color"].default_value = color
    b.inputs["Roughness"].default_value = 0.45

    # De glTF-exporteur laat UV's weg als geen enkel materiaal een textuur
    # gebruikt; de configurator projecteert artwork via die UV's. Een 1x1
    # placeholder houdt TEXCOORD_0 in het bestand.
    if obj.data.uv_layers:
        img = bpy.data.images.new(f"uvkeep_{obj.name}", width=1, height=1)
        img.generated_color = (1, 1, 1, 1)
        tn = mat.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img
        un = mat.node_tree.nodes.new("ShaderNodeUVMap"); un.uv_map = obj.data.uv_layers[0].name
        mat.node_tree.links.new(un.outputs["UV"], tn.inputs["Vector"])
        mat.node_tree.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    print(f"[ZONE] {obj.name}: {len(obj.data.polygons)} faces")

# Statische onderdelen samenvoegen tot één 'lining'
if statics:
    bpy.ops.object.select_all(action='DESELECT')
    objs = [bpy.data.objects[n] for n in statics]
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    lin = bpy.context.view_layer.objects.active
    lin.name = "lining"
    print(f"[ZONE] lining: {len(lin.data.polygons)} faces")

names = sorted(o.name for o in bpy.context.scene.objects if o.type == 'MESH')
print("[INFO] eindobjecten:", names)

wmn = Vector((1e9,)*3); wmx = Vector((-1e9,)*3)
for o in bpy.context.scene.objects:
    if o.type != 'MESH': continue
    for v in o.bound_box:
        wv = o.matrix_world @ Vector(v)
        wmn = Vector(map(min, wmn, wv)); wmx = Vector(map(max, wmx, wv))
print("[INFO] bbox na opschonen:", tuple(round(c,2) for c in wmn), tuple(round(c,2) for c in wmx))

bpy.ops.object.select_all(action='DESELECT')
for o in bpy.context.scene.objects:
    if o.type == 'MESH': o.select_set(True)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB',
                          use_selection=True, export_apply=True)
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
    ctr = (wmn+wmx)/2; sz = wmx-wmn; rad = max(sz.x,sz.y,sz.z)*1.85
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    bpy.context.collection.objects.link(cam); sc.camera = cam
    for nm, dv in {"warm":(0,-1,0.18),"front":(0,-1,0.18),"back":(0,1,0.18),"iso":(0.85,-0.8,0.5)}.items():
        d = Vector(dv).normalized()
        cam.location = ctr + d*rad
        cam.rotation_euler = (ctr-cam.location).to_track_quat('-Z','Y').to_euler()
        sc.render.filepath = os.path.join(OUT_DIR, f"lu_{nm}.png")
        bpy.ops.render.render(write_still=True)
    print("[INFO] renders klaar")

print("[DONE]")
