import bpy, bmesh, math
from pathlib import Path
scene=bpy.context.scene
body=bpy.data.objects['Worker_skinned_mesh']
assert not body.get('pilot_refined'), 'Refinement has already been applied'
helmet_indices={i for i,m in enumerate(body.data.materials) if m.name=='Safety helmet'}
orange_indices={i for i,m in enumerate(body.data.materials) if m.name=='Safety orange fabric'}
helmet_verts={vi for p in body.data.polygons if p.material_index in helmet_indices for vi in p.vertices}
orange_verts={vi for p in body.data.polygons if p.material_index in orange_indices for vi in p.vertices}
for i in helmet_verts:
    v=body.data.vertices[i];v.co.z=max(v.co.z,1.707)-.028
for i in orange_verts:
    v=body.data.vertices[i];v.co.z=1.414+(v.co.z-1.414)*.22
# Close the cropped anatomical neck inside the padded collar.
verts=[];faces=[]
for z,r in [(1.42,.060),(1.49,.062),(1.545,.062)]:
    for i in range(16):
        a=i*math.tau/16;verts.append((r*math.cos(a),.018+r*math.sin(a),z))
for j in range(2):
    for i in range(16):faces.append((j*16+i,j*16+(i+1)%16,(j+1)*16+(i+1)%16,(j+1)*16+i))
mesh=bpy.data.meshes.new('Neck transition');mesh.from_pydata(verts,[],faces);mesh.update()
neck=bpy.data.objects.new('Neck transition',mesh);scene.collection.objects.link(neck);neck.matrix_world=body.matrix_world.copy()
neck.data.materials.append(bpy.data.materials['Skin'])
for p in neck.data.polygons:p.use_smooth=True
vg=neck.vertex_groups.new(name='head');vg.add(list(range(len(verts))),1,'REPLACE')
bpy.ops.object.select_all(action='DESELECT');neck.select_set(True);body.select_set(True);bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
body['pilot_refined']=True
skin=bpy.data.materials['Skin'].node_tree.nodes['Principled BSDF'];skin.inputs['Base Color'].default_value=(.36,.185,.10,1)
# Resolve reversed vertical UV orientation on outward-facing packaging labels.
for name in ['Lift_carriage','Pallet_load_LOD0']:
    for o in bpy.data.objects[name].children_recursive:
        if o.type!='MESH' or not o.data.uv_layers.active:continue
        if not any(m.name in ['warning','shipping'] for m in o.data.materials):continue
        uv=o.data.uv_layers.active.data
        for p in o.data.polygons:
            n=o.matrix_world.to_3x3()@p.normal
            if n.y>.5:
                for li in p.loop_indices:uv[li].uv=(1-uv[li].uv.x,1-uv[li].uv.y)
bpy.data.objects['02 / Forklift detail'].data.lens=43
result={'helmet_fit':'corrected','neck':'closed','label_orientation':'corrected'}
