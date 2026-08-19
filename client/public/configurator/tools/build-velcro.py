"""
BOUWSCRIPT — Velcro-model (2e generatie, Meshy AI part-segmentation)
═══════════════════════════════════════════════════════════════════════════
Vervangt de vorige build-velcro.py (die voor het oude UV-eiland-gebaseerde
placeholder-model was): dit bronbestand komt al vooraf gesegmenteerd uit
Meshy AI, dus geen UV-island-detectie meer nodig — alleen hernoemen naar de
configurator-zone-namen (scene3d.js zoekt meshes puur op node-naam op) en
comprimeren voor web.

Bron: eigen 3D-scan/generatie van de klant via Meshy AI ("part-segmentation"-
export). BELANGRIJK: het aangeleverde bestand heette "...Steel Juggernaut
Helmet..._part-segmentation.glb" — een verkeerd gekoppelde exportnaam vanuit
Meshy. De geometrie zelf is onmiskenbaar een bokshandschoen, geverifieerd met
losstaande, geïsoleerde renders per mesh vóór dit script werd gebruikt.
Origineel (34,8MB) bewaard door de klant zelf buiten dit repo — niet
gecommit i.v.m. bestandsgrootte.

Gebruik:
  blender --background --python build-velcro.py -- <bron.glb> <doel.glb> [--debug]

Mapping (bevestigd met geïsoleerde renders per mesh, zie analyse-artifact):
  mesh_5           -> front-panel
  mesh_6           -> back-panel   (nieuw — dit bronmodel heeft ook een
                                     volledig apart, herkleurbaar rugpaneel)
  mesh_4           -> thumb        (nieuw, ongesplitst — dit model heeft geen
                                     apart outer/inner-duim zoals Lace-Up)
  mesh_7           -> wrist        (manchet + trekluspje al één geheel mesh)
  mesh_3           -> piping       (bies onderrand manchet — dekt alleen die
                                     ene rand, geen bies rond front/duim)
  mesh_1 + mesh_2  -> stitching    (twee losse naadfragmentjes bij de duim,
                                     samengevoegd tot één zone zoals gevraagd)
  mesh_0           -> palm         (verreweg de grootste mesh: een volledige,
                                     gesloten basisschil van de hele
                                     handschoen. Er is geen apart palm-mesh —
                                     front/back/thumb/wrist liggen er als
                                     losse panelen bovenop. Het herkleuren van
                                     'palm' kleurt dus de palm plus wat verder
                                     nergens door een ander paneel gedekt
                                     wordt. Zie het rapport voor de volledige
                                     toelichting.)

GEEN vormwijziging: alleen hernoemen/samenvoegen (join = puur administratief,
geen geometrie-bewerking) + Decimate ter compressie (zelfde aanpak als de
oorspronkelijke build-velcro.py voor de 'lining'). Decimate-ratio's gekozen om
het zichtbare quilt-/stiksel-reliëf te behouden terwijl de bestandsgrootte
richting de bestaande ~600KB–1,2MB-modellen gaat (bron is 34,8MB, veel te
dicht voor web) — plus EXT_meshopt_compression bij export (zelfde decoder die
scene3d.js al vendored heeft voor Lace-Up/het oude Velcro-model).
"""
import bpy, sys, os

argv = sys.argv[sys.argv.index("--") + 1:]
GLB_IN, GLB_OUT = argv[0], argv[1]
DEBUG = "--debug" in argv

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB_IN)
src = {o.name: o for o in bpy.context.scene.objects if o.type == 'MESH'}

def decimate(obj, ratio):
    bpy.context.view_layer.objects.active = obj
    before = len(obj.data.polygons)
    d = obj.modifiers.new("dec", 'DECIMATE')
    d.ratio = ratio
    bpy.ops.object.modifier_apply(modifier=d.name)
    print(f"[DECIMATE] {obj.name}: {before} -> {len(obj.data.polygons)} faces (ratio={ratio})")

def rename(obj, new_name):
    obj.name = new_name
    obj.data.name = new_name
    return obj

def join_objs(objs, new_name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    rename(obj, new_name)
    return obj

DEBUG_COLORS = {
    "front-panel": (0.90, 0.15, 0.15, 1), "back-panel": (0.15, 0.35, 0.90, 1),
    "thumb": (0.90, 0.85, 0.10, 1), "wrist": (0.90, 0.45, 0.85, 1),
    "piping": (0.95, 0.55, 0.05, 1), "stitching": (0.20, 0.90, 0.90, 1),
    "palm": (0.30, 0.85, 0.35, 1),
}
NEUTRAL = (0.30, 0.30, 0.32, 1)

def set_debug_material(obj, zone):
    obj.data.materials.clear()
    mat = bpy.data.materials.new(zone)
    mat.use_nodes = True
    b = mat.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = DEBUG_COLORS[zone] if DEBUG else NEUTRAL
    b.inputs["Roughness"].default_value = 0.45
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True

# ── 1. Front Panel ──────────────────────────────────────────────────────
front = rename(src["mesh_5"], "front-panel")
decimate(front, 0.05)
set_debug_material(front, "front-panel")

# ── 2. Back Panel (nieuw) ───────────────────────────────────────────────
back = rename(src["mesh_6"], "back-panel")
decimate(back, 0.05)
set_debug_material(back, "back-panel")

# ── 3. Thumb (nieuw, ongesplitst) ───────────────────────────────────────
thumb = rename(src["mesh_4"], "thumb")
decimate(thumb, 0.06)
set_debug_material(thumb, "thumb")

# ── 4. Wrist / Velcro Strap (manchet + trekluspje, al één mesh) ────────
wrist = rename(src["mesh_7"], "wrist")
decimate(wrist, 0.05)
set_debug_material(wrist, "wrist")

# ── 5. Piping (bies onderrand manchet) ──────────────────────────────────
piping = rename(src["mesh_3"], "piping")
decimate(piping, 0.2)
set_debug_material(piping, "piping")

# ── 6. Stitching — TWEE meshes samengevoegd tot één zone ───────────────
stitching = join_objs([src["mesh_1"], src["mesh_2"]], "stitching")
decimate(stitching, 0.3)
set_debug_material(stitching, "stitching")

# ── 7. Palm (basisschil — zie toelichting in module-docstring) ─────────
palm = rename(src["mesh_0"], "palm")
decimate(palm, 0.025)
set_debug_material(palm, "palm")

created = [front, back, thumb, wrist, piping, stitching, palm]
print("[INFO] eindobjecten:", [(o.name, len(o.data.polygons)) for o in created])

bpy.ops.object.select_all(action='DESELECT')
for o in created:
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT, export_format='GLB', use_selection=True, export_apply=True,
    export_meshopt_compression_enable=True,
)
size_mb = os.path.getsize(GLB_OUT) / 1024 / 1024
print(f"[INFO] geëxporteerd: {GLB_OUT} ({size_mb:.2f} MB)")
print("[DONE]")
