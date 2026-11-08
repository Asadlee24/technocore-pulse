"""Rebuild the original entrance and facade model with Blender 4.3.

Run from the repository root:
    blender -b -t 2 --python scripts/model-technocore-entry.py
"""
import bpy

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness, metallic=0, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Emission Color"].default_value = (*color, 1)
    shader.inputs["Emission Strength"].default_value = emission
    return mat


graphite = material("Beveled graphite concrete", (.065, .08, .093), .69)
titanium = material("Brushed titanium", (.24, .30, .33), .3, .75)
bronze = material("Satin bronze", (.30, .16, .074), .33, .7)
glass = material("Blue steel glazing", (.038, .095, .13), .19, .6)
warm = material("Warm canopy lights", (1, .49, .17), .29, emission=2.5)
cyan = material("Cyan entry marker", (.025, .53, .66), .32, emission=1.25)


def box(name, location, size, mat, edge=.04):
    # Express design coordinates in Three.js axes, then convert to Blender Z-up.
    x, y, z = location
    width, height, depth = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (width, depth, height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new("Edge highlights", "BEVEL")
    bevel.width = edge
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


# Nominal building dimensions are 7.4 × 7.2 × 25. The runtime scales the
# architecture to the room parcel. Entrance proportions are kept at eye level.
for side in (-1, 1):
    for face in (-1, 1):
        box("Deep outer pilaster", (side * 3.42, 8.35, face * 3.68),
            (.49, 11.5, .51), graphite, .075)
        box("Machined pilaster edge", (side * 3.42, 8.35, face * 3.97),
            (.065, 11.45, .072), titanium, .02)
        box("Upper crown fin", (.74 + side * 2.68, 19.9, face * 2.80),
            (.25, 7.6, .31), graphite)
    box("Portico pier", (side * 1.63, 1.37, 4.12), (.37, 2.29, .58), graphite, .08)
    box("Bronze pier insert", (side * 1.63, 1.37, 4.43), (.16, 2.1, .07), bronze)
    box("Return glazing", (side * 1.19, 1.32, 4.02), (.58, 1.94, .12), glass)
    box("Entry door", (side * .39, 1.30, 4.06), (.74, 1.94, .11), glass)
    box("Door stile", (side * .74, 1.30, 4.14), (.055, 1.96, .065), bronze)
    box("Pull handle", (side * .11, 1.26, 4.16), (.036, .38, .08), bronze, .015)
    box("Low wayfinding light", (side * 1.8, .35, 4.39), (.065, .20, .08), cyan, .02)
box("Cantilever canopy", (0, 2.53, 4.24), (3.96, .23, 1.44), graphite, .10)
box("Bronze canopy fascia", (0, 2.51, 4.96), (3.78, .11, .12), bronze)
for index in range(-2, 3):
    box("Recessed canopy strip", (index * .66, 2.405, 4.27),
        (.052, .045, .9), warm, .013)
box("Entry threshold", (0, .22, 4.43), (3.72, .07, .73), titanium, .025)
box("Roof crown", (.74, 25.02, 0), (5.82, .38, 5.65), graphite, .12)
box("Crown front louver", (.74, 25.04, 2.84), (5.41, .077, .08), titanium)

# One mesh per material keeps the bespoke detail to six draw calls.
for mat in (graphite, titanium, bronze, glass, warm, cyan):
    bpy.ops.object.select_all(action="DESELECT")
    objects = [obj for obj in bpy.context.scene.objects
               if obj.type == "MESH" and obj.data.materials[0] == mat]
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = mat.name
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")

bpy.ops.export_scene.gltf(
    filepath="src/assets/city/technocore-entry.glb", export_format="GLB",
    export_yup=True,
)
