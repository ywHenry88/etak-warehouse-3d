"""Replace only the pilot forklift with the owner's NICHIYU three-wheel references.
Dimensions are visual estimates; this is not a manufacturer's CAD model.
"""
import bpy,math,json
from mathutils import Vector
from math import pi,sin,cos
from pathlib import Path
OUT=Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010');TEX=OUT/'textures'
scene=bpy.context.scene
old=bpy.data.objects['Forklift_LOD0'];old_location=old.location.copy();old_rotation=old.rotation_euler.copy()
for name in ['Forklift_LOD1','Forklift_LOD0']:
    o=bpy.data.objects.get(name)
    if o:
        for child in reversed([o]+list(o.children_recursive)):bpy.data.objects.remove(child,do_unlink=True)
def newmat(name,color,rough,metal=0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal;return m
red=bpy.data.materials['Vehicle enamel'];black=newmat('NICHIYU graphite',(.018,.022,.025),.48,.08)
rubber=bpy.data.materials['Moulded rubber'];steel=bpy.data.materials['Brushed steel'];seat=bpy.data.materials['Seat upholstery']
rim=newmat('NICHIYU dark wheel enamel',(.024,.027,.030),.48,.18)
rubberSide=newmat('Tyre sidewall',(.020,.021,.023),.92)
lamp=newmat('Worklamp lens',(.65,.73,.74),.19)
amber=bpy.data.materials['Amber beacon']
rearLight=newmat('Red rear lamp',(.32,.004,.005),.29)
def root(name,parent=None,loc=(0,0,0)):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);o.parent=parent;o.location=loc;return o
fork=root('Forklift_LOD0');fork['manufacturer']='NICHIYU';fork['reference_family']='FBT three-wheel / SICOS AC 15 markings';fork['wheel_layout']='two front wheels, central rear twin-tyre steering assembly';fork['dimensions']='Estimated from supplied photographs'
def attach(o,name,mat,parent):
    o.name=name;o.parent=parent;o.data.materials.append(mat);return o
def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def smooth(o,bevel=0):
    active(o)
    if bevel:
        mod=o.modifiers.new('Edge radii','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=True
    if bevel:
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=mod.name)
def box(name,loc,size,mat,parent=fork,bevel=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,name,mat,parent);smooth(o,bevel);return o
def cyl(name,a,b,r,mat,parent=fork,n=16,r2=None):
    a,b=Vector(a),Vector(b);bpy.ops.mesh.primitive_cone_add(vertices=n,radius1=r,radius2=r if r2 is None else r2,depth=(b-a).length,location=(a+b)*.5)
    o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();attach(o,name,mat,parent);smooth(o);return o
def sphere(name,loc,size,mat,parent=fork):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=loc);o=bpy.context.object;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,name,mat,parent);smooth(o);return o
def tube(name,pts,r,mat,parent=fork):
    cv=bpy.data.curves.new(name,'CURVE');cv.dimensions='3D';cv.bevel_depth=r;cv.bevel_resolution=1
    sp=cv.splines.new('POLY');sp.points.add(len(pts)-1)
    for p,v in zip(sp.points,pts):p.co=(*v,1)
    o=bpy.data.objects.new(name,cv);scene.collection.objects.link(o);attach(o,name,mat,parent);active(o);bpy.ops.object.convert(target='MESH');return bpy.context.object
def panel(name,profile,axis,a,b,mat,bevel=.012,parent=fork):
    # Extrude a silhouette in either yz (axis x) or xz (axis y).
    verts=[]
    for depth in [a,b]:
        for u,z in profile:verts.append((depth,u,z) if axis=='x' else (u,depth,z))
    n=len(profile);faces=[tuple(reversed(range(n))),tuple(range(n,n*2))]
    for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);attach(o,name,mat,parent)
    # Winding is normalized before smoothing to avoid mirrored panel normals.
    import bmesh
    bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
    smooth(o,bevel)
    uv=o.data.uv_layers.new()
    for poly in o.data.polygons:
        normal=poly.normal;ax=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=ax]
        for li in poly.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]],co[axes[1]])
    return o
def decalmat(name):
    m=newmat('NICHIYU decal '+name,(1,1,1),.65);nt=m.node_tree;n=nt.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(str(TEX/(name+'.png')),check_existing=True)
    nt.links.new(n.outputs['Color'],nt.nodes['Principled BSDF'].inputs['Base Color']);nt.links.new(n.outputs['Alpha'],nt.nodes['Principled BSDF'].inputs['Alpha'])
    m.surface_render_method='DITHERED';return m
logos={n:decalmat(n) for n in ['nichiyu','sicos','nichiyu_electric']}
def decal(name,loc,w,h,mat,rotation,parent=fork):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc);o=bpy.context.object;o.scale=(w,h,1);o.rotation_euler=rotation;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);attach(o,name,mat,parent);return o
# Low chassis with a curved rear wheel cut-out, not a four-wheel counterweight.
profile=[(-1.015,.19),(-1.07,.40),(-1.055,.94),(-.95,1.065),(-.33,1.10),(.02,1.00),(.055,.48),(.32,.39),(.37,.21)]
for side in [-1,1]:
    panel('Formed red side panel',profile,'x',side*.49,side*.558,red,.025)
    # Battery-door seam and moulded upper graphite sill.
    tube('Battery access seam',[(side*.560,-.31,.26),(side*.560,-.31,.90),(side*.538,-.33,1.056)],.0028,black)
    tube('Side sill seam',[(side*.559,-.99,.25),(side*.559,-.40,.25),(side*.559,-.32,.29)],.0025,black)
    panel('Graphite shoulder trim',[(-1.055,.973),(-.95,1.105),(-.34,1.143),(.04,1.024),(.04,.985),(-.35,1.10),(-.96,1.06)],'x',side*.47,side*.569,black,.012)
    box('Battery latch',(side*.569,-.62,.858),(.009,.047,.024),black,bevel=.006)
    decal('SICOS AC 15',(side*.573,-.12,.838),.24,.12,logos['sicos'],(pi/2,0,side*pi/2))
    decal('NICHIYU side',(side*.571,-.80,.80),.30,.056,logos['nichiyu'],(pi/2,0,side*pi/2))
    box('Step well',(side*.46,.24,.30),(.22,.39,.055),black,bevel=.007)
    for k in range(5):box('Footplate tread',(side*.46,.1+k*.054,.331),(.19,.014,.006),rubber,bevel=.001)
    # Front fender follows the tyre rather than covering it with a solid block.
    arch=[(.58+.345*cos(a),.323+.345*sin(a)) for a in [i*pi/10 for i in range(11)]]
    arch+=list(reversed([(.58+.376*cos(a),.323+.376*sin(a)) for a in [i*pi/10 for i in range(11)]]))
    panel('Front wheel arch',arch,'x',side*.43,side*.69,red,.009)
rearProfile=[(-.52,.27),(-.52,.95),(-.45,1.07),(.45,1.07),(.52,.95),(.52,.27),(.225,.27),(.20,.43),(.12,.49),(-.12,.49),(-.20,.43),(-.225,.27)]
panel('Rear counterweight with wheel recess',rearProfile,'y',-1.055,-.88,red,.027)
decal('Rear NICHIYU branding',(0,-1.087,.80),.65,.121,logos['nichiyu'],(pi/2,0,0))
box('Rear latch recess',(0,-1.09,.625),(.15,.015,.07),black,bevel=.015)
box('Battery compartment',(0,-.29,.80),(.94,1.08,.40),red,bevel=.022)
box('Dark battery top',(0,-.38,1.075),(1.06,1.07,.057),black,bevel=.035)
box('Front bulkhead',(0,.20,.64),(.66,.25,.63),black,bevel=.045)
box('Operator footwell',(0,.46,.39),(.80,.54,.073),black,bevel=.014)
box('Pedal',(0,.59,.46),(.12,.19,.027),rubber,bevel=.004).rotation_euler.x=.18
# Black seat with raised bolsters and a shallow moulded seat back.
box('Seat suspension',(0,-.48,1.138),(.46,.44,.10),black,bevel=.023)
box('Seat base',(0,-.43,1.207),(.51,.46,.10),seat,bevel=.04)
box('Seat back',(0,-.67,1.44),(.49,.115,.47),seat,bevel=.057).rotation_euler.x=-.13
box('Seat back inset',(0,-.595,1.45),(.35,.026,.30),seat,bevel=.04)
for side in [-1,1]:
    tube('Seat arm bolster',[(side*.23,-.54,1.25),(side*.245,-.36,1.30),(side*.245,-.19,1.28)],.035,seat)
    cyl('Seat tilt adjuster',(side*.25,-.57,1.21),(side*.30,-.57,1.21),.035,black,n=12)
# Sloped steering pod and three hydraulic controls, as in the supplied images.
panel('Sloped instrument pod',[(.23,.58),(.50,.62),(.46,1.17),(.21,1.30),(.12,1.14)],'x',-.22,.20,black,.037)
box('Instrument screen',(0,.168,1.19),(.15,.012,.064),lamp,bevel=.009).rotation_euler.x=-.22
cyl('Steering shaft',(0,.26,.9),(0,.12,1.36),.028,black)
bpy.ops.mesh.primitive_torus_add(major_segments=28,minor_segments=6,major_radius=.183,minor_radius=.019,location=(0,.075,1.386))
o=bpy.context.object;o.rotation_euler.x=.29;attach(o,'Steering wheel',rubber,fork)
for a in [0,2*pi/3,4*pi/3]:cyl('Steering spoke',(0,.075,1.386),(.164*cos(a),.075+.164*sin(a),1.386),.008,black,n=8)
for i in range(3):
    cyl('Control lever',(.26+i*.065,.03,.98),(.26+i*.065,.12,1.31+i*.018),.010,steel,n=8)
    sphere('Control grip',(.26+i*.065,.12,1.31+i*.018),(.021,.025,.033),black)
# Rectangular guard uprights with the characteristic curved/sloped front knees.
for side in [-1,1]:
    for y in [-.88]:
        o=box('Rear overhead guard',(side*.47,y,1.64),(.055,.065,1.18),black,bevel=.007);o.rotation_euler.x=-.04
    front=[(.26,.96),(.42,1.18),(.37,1.67),(.19,2.03),(.03,2.17),(-.16,2.22),(-.16,2.15),(.005,2.10),(.12,1.97),(.30,1.66),(.34,1.19),(.20,.98)]
    panel('Sloping front overhead guard',front,'x',side*.45,side*.52,black,.006)
    box('Roof perimeter',(side*.49,-.37,2.225),(.071,1.23,.08),black,bevel=.009)
    tube('Grab handle',[(side*.48,.29,1.43),(side*.48,.39,1.48),(side*.48,.35,1.72),(side*.48,.25,1.77)],.014,black)
    box('Worklight housing',(side*.48,.235,1.97),(.115,.092,.105),black,bevel=.017)
    box('Worklight lens',(side*.48,.286,1.97),(.085,.009,.073),lamp,bevel=.008)
    box('Amber front indicator',(side*.48,.315,1.81),(.061,.027,.083),amber,bevel=.008)
    box('Rear lamp housing',(side*.35,-.996,2.223),(.15,.035,.067),black,bevel=.009)
    box('Rear red lamp',(side*.35,-1.018,2.223),(.085,.013,.047),rearLight,bevel=.003)
for y in [-.96,-.71,-.47,-.23,.015,.21]:box('Roof transverse guard',(0,y,2.24),(1.04,.047,.035),black,bevel=.007)
# Three-wheel layout. Rear assembly has two narrow tyres on a single centre steer axle.
wheelRoots=[]
def wheel(name,loc,r,w,parent):
    pivot=root(name,parent,loc);wheelRoots.append(pivot)
    cyl('Solid traction tyre',(-w*.44,0,0),(w*.44,0,0),r,rubber,pivot,n=32)
    for side in [-1,1]:
        cyl('Rounded tyre shoulder',(side*w*.43,0,0),(side*w*.53,0,0),r*.97,rubberSide,pivot,n=32,r2=r*.88)
        cyl('Tyre sidewall',(side*w*.535,0,0),(side*w*.546,0,0),r*.84,rubberSide,pivot,n=32)
        cyl('Dark steel rim',(side*w*.55,0,0),(side*w*.57,0,0),r*.55,rim,pivot,n=24)
        cyl('Axle centre',(side*w*.575,0,0),(side*w*.62,0,0),r*.19,black,pivot,n=12)
        for i in range(8):
            a=i*pi/4;cyl('Wheel nut',(side*w*.58,sin(a)*r*.36,cos(a)*r*.36),(side*w*.61,sin(a)*r*.36,cos(a)*r*.36),.012,steel,pivot,n=6)
    return pivot
for side in [-1,1]:wheel('Front_wheel_'+str(side),(side*.585,.58,.323),.323,.18,fork)
rear=root('Rear_steering_axle',fork,(0,-.87,.255))
for side in [-1,1]:wheel('Rear_twin_tyre_'+str(side),(side*.093,0,0),.255,.155,rear)
cyl('Rear axle',(-.20,0,0),(.20,0,0),.045,black,rear)
# Nested mast rails, chain return, lift rams and red fork heels.
for side in [-1,1]:
    box('Outer channel flange',(side*.39,.92,1.42),(.10,.145,2.67),black,bevel=.005)
    box('Channel recess',(side*.325,.92,1.43),(.020,.113,2.59),rim,bevel=.002)
    box('Inner mast slide',(side*.29,.948,1.40),(.060,.088,2.59),black,bevel=.004)
    box('Polished running edge',(side*.258,.996,1.40),(.016,.007,2.51),steel,bevel=.001)
    cyl('Lift cylinder',(side*.19,.89,.25),(side*.19,.89,1.36),.039,black)
    cyl('Chrome piston',(side*.19,.89,1.34),(side*.19,.89,2.61),.022,steel)
    for i in range(29):box('Chain link',(side*.14,1.008,.45+i*.072),(.020,.018,.049),steel,bevel=.002)
    tube('Hydraulic hose',[(side*.24,.975,.32),(side*.23,.98,2.40),(side*.19,.98,2.53),(side*.10,.98,2.55),(side*.06,.98,2.43),(side*.06,.98,1.45)],.008,rubber)
    cyl('Top chain pulley',(side*.14,.87,2.61),(side*.14,1.03,2.61),.065,black,n=20)
box('Mast crown',(0,.928,2.75),(.88,.16,.092),black,bevel=.005)
# NICHIYU vertical mast lettering reads correctly from the front.
o=decal('Vertical NICHIYU mast',(.394,1.0,1.89),.66,.124,logos['nichiyu'],(pi/2,0,pi))
o.rotation_euler.rotate_axis('Z',pi/2)
carriage=root('Lift_carriage',fork)
for z in [.34,.63]:box('Carriage crossmember',(0,1.08,z),(.93,.10,.105),black,carriage,.004)
for side in [-1,1]:box('Backrest side',(side*.50,1.105,.965),(.050,.060,1.12),black,carriage,.005)
for z in [.42,1.53]:box('Backrest perimeter',(0,1.105,z),(1.04,.060,.05),black,carriage,.005)
for x in [-.34,-.17,0,.17,.34]:box('Backrest bars',(x,1.105,.985),(.017,.029,1.07),black,carriage,.003)
box('Backrest crossbar',(0,1.105,1.0),(1,.036,.025),black,carriage,.004)
for side in [-1,1]:
    panel('Tapered forged fork',[(1.145,.75),(1.145,.135),(2.30,.135),(2.36,.113),(2.30,.083),(1.11,.083),(1.074,.125),(1.074,.75)],'x',side*.28-.055,side*.28+.055,red,.007,carriage)
    box('Polished fork wear face',(side*.28,1.77,.139),(.079,1.10,.0028),steel,carriage,.001)
    box('Fork mounting shoe',(side*.28,1.099,.77),(.135,.13,.087),black,carriage,.005)
def merge(parent):
    groups={}
    for o in list(parent.children):
        if o.type=='MESH' and len(o.data.materials)==1:groups.setdefault(o.data.materials[0],[]).append(o)
    for mat,objects in groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=parent.name+' / '+mat.name
for p in wheelRoots+[rear,carriage,fork]:merge(p)
fork.location=old_location;fork.rotation_euler=old_rotation
report={'manufacturer':'NICHIYU','type':'Three-wheel electric counterbalance','visual_markings':'SICOS AC 15','reference_files':[p.name for p in Path('C:/github/CreateVideo/tmp/forklift').iterdir() if p.is_file()],'estimated_dimensions_m':{'width':1.39,'body_length':1.92,'mast_height':2.80},'scope':'Visual reference reconstruction, not exact manufacturer CAD'}
(OUT/'nichiyu_reference.json').write_text(json.dumps(report,indent=2))
result=report
