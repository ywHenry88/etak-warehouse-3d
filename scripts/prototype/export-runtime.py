"""Export only production actors from the live MCP pilot; leave pilot untouched."""
import bpy, json, base64
from pathlib import Path

out = Path('C:/github/etak-warehouse-3d/assets/actors')
out.mkdir(parents=True, exist_ok=True)
scene = bpy.context.scene
copies = []
roots = []

def duplicate(source, name):
    original = bpy.data.objects[source]
    mapping = {}
    for o in [original] + list(original.children_recursive):
        n = o.copy()
        if o.data: n.data = o.data.copy()
        scene.collection.objects.link(n)
        n.hide_render = False
        n.hide_set(False)
        mapping[o] = n
        copies.append(n)
    for o, n in mapping.items():
        n.parent = mapping.get(o.parent)
        n.name = name if o == original else name + '__' + o.name
        if n.animation_data: n.animation_data_clear()
        for mod in n.modifiers:
            if mod.type == 'ARMATURE': mod.object = mapping[mod.object]
        if n.type == 'ARMATURE':
            for b in n.pose.bones: b.matrix_basis.identity()
    root = mapping[original]
    root.location = (0, 0, 0)
    root.rotation_euler = (0, 0, 0)
    roots.append(root)
    return root

try:
    for lod in [0, 1]: duplicate('Forklift_LOD'+str(lod), 'Nichiyu_LOD'+str(lod))
    duplicate('Pallet_truck_LOD0', 'PalletTruck')
    for name, warm, seated in [('WorkerCold',False,False), ('WorkerWarm',True,False), ('DriverCold',False,True), ('DriverWarm',True,True)]:
        root = duplicate('Worker_LOD1', name)
        body = next(o for o in root.children_recursive if o.type == 'MESH')
        spine = body.vertex_groups['spine']
        for v in body.data.vertices:
            if not any(g.group == spine.index and g.weight > .5 for g in v.groups): continue
            z = v.co.z
            if warm and z < 1.04:
                # Short work jacket, including zipper and lower reflective band.
                v.co.z = .89 + (z-.70) * (.15/.34)
                v.co.x *= .89
            elif seated and z < .90:
                # The long insulated hem follows both thighs across the driver's lap.
                amount = min(1, max(0, (.90-z)/.17))
                spine.add([v.index], 1-amount, 'REPLACE')
                for side in ['L','R']:
                    body.vertex_groups['thigh.'+side].add([v.index], amount*.5, 'REPLACE')
        body.data.update()
    bpy.ops.object.select_all(action='DESELECT')
    for o in copies: o.select_set(True)
    bpy.context.view_layer.objects.active = roots[0]
    bpy.context.view_layer.update()
    target = out/'warehouse-actors.glb'
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', use_selection=True,
        use_active_scene=True, export_image_format='JPEG', export_jpeg_quality=88,
        export_animations=False, export_yup=True)
    (out/'embedded.json').write_text(json.dumps(base64.b64encode(target.read_bytes()).decode('ascii')))
    result = {'bytes':target.stat().st_size, 'roots':[r.name for r in roots]}
finally:
    for o in reversed(copies): bpy.data.objects.remove(o, do_unlink=True)
