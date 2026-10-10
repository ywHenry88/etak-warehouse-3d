"""Prepare reusable LODs and a deduplicated GLB through Blender MCP."""
import bpy, json, time
from pathlib import Path
from mathutils import Vector
OUT=Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010')
scene=bpy.context.scene
names=['Forklift_LOD0','Worker_LOD0','Pallet_load_LOD0','Pallet_truck_LOD0','Surface_sample']
originals={name:bpy.data.objects[name] for name in names}
def children(root):return [root]+list(root.children_recursive)
# Only replace LOD copies authored by this pilot, so regeneration is repeatable.
for name in ['Forklift_LOD1','Worker_LOD1','Pallet_load_LOD1']:
    old=bpy.data.objects.get(name)
    if old:
        for o in reversed(children(old)):bpy.data.objects.remove(o,do_unlink=True)
def stats(root):
    meshes=[o for o in children(root) if o.type=='MESH']
    for o in meshes:o.data.calc_loop_triangles()
    return {'triangles':sum(len(o.data.loop_triangles) for o in meshes),'primitives':sum(len(o.data.materials) for o in meshes)}
def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
def export(objects,path):
    select(objects)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_image_format='JPEG',export_jpeg_quality=88,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_yup=True)
lods={}
for name in names[:3]:
    original=originals[name];mapping={}
    for o in children(original):
        new=o.copy()
        if o.data:new.data=o.data.copy()
        scene.collection.objects.link(new);mapping[o]=new
    for o,new in mapping.items():
        new.parent=mapping.get(o.parent);new.name=o.name.replace('LOD0','LOD1') if 'LOD0' in o.name else o.name+'_LOD1'
        for mod in new.modifiers:
            if mod.type=='ARMATURE':mod.object=mapping.get(mod.object,mod.object)
        if new.type=='MESH' and len(new.data.polygons)>80:
            select([new]);d=new.modifiers.new('Distance detail reduction','DECIMATE');d.ratio=.44 if name.startswith('Worker') else .48;d.use_collapse_triangulate=True
            while list(new.modifiers).index(d)>0:bpy.ops.object.modifier_move_up(modifier=d.name)
            bpy.ops.object.modifier_apply(modifier=d.name)
    duplicate=mapping[original];lods[duplicate.name]=duplicate
allroots={**originals,**lods}
positions={n:(o.location.copy(),o.rotation_euler.copy()) for n,o in allroots.items()}
report={'blender':bpy.app.version_string,'transport':'interactive Blender MCP','assets':{}}
for name,obj in allroots.items():
    obj.location=(0,0,0);obj.rotation_euler=(0,0,0)
    export(children(obj),OUT/(name+'.glb'))
    report['assets'][name]={**stats(obj),'bytes':(OUT/(name+'.glb')).stat().st_size}
export([o for r in allroots.values() for o in children(r)],OUT/'ETAK_Pilot_Web.glb')
report['combined_bytes']=(OUT/'ETAK_Pilot_Web.glb').stat().st_size
for name,obj in allroots.items():
    obj.location,obj.rotation_euler=positions[name]
    if name in lods:
        for o in children(obj):o.hide_render=True;o.hide_set(True)
# Front three-quarter views show mast, controls, tyres and anatomy.
for name,loc,target,lens in [
    ('01 / Asset pilot',(7.3, -7.7,4.7),(0,.15,1.03),48),
    ('02 / Forklift detail',(2.6,2.25,2.65),(-1.45,.65,1.25),35),
    ('03 / Worker and goods',(3.4,-4.5,2.23),(1.1,-.52,1.1),60)]:
    cam=bpy.data.objects[name];cam.location=loc;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=lens
scene.camera=bpy.data.objects['01 / Asset pilot']
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.view_settings.exposure=-.45
scene.frame_set(1)
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ETAK_Asset_Pilot.blend'))
result=report
