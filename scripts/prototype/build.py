"""Run through the interactive Blender MCP connection; preserves other scenes."""
import bpy, math, json, time, os
from pathlib import Path
from mathutils import Vector
from math import sin, cos, pi
OUT=Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010')
TEX=OUT/'textures'
started=time.perf_counter()
scene=bpy.data.scenes.new('ETAK / Blender asset pilot')
bpy.context.window.scene=scene
scene.unit_settings.system='METRIC'
scene.render.engine='CYCLES'
scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.cycles.max_bounces=5;scene.cycles.use_adaptive_sampling=True
scene.render.resolution_x=1440;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.fps=25;scene.frame_start=1;scene.frame_end=50
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
world=bpy.data.worlds.new('Pilot soft ambient');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.68,.82,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.25;scene.world=world
assets={};images={}
def image(path):
    path=str(path)
    if path not in images:images[path]=bpy.data.images.load(path,check_existing=True)
    return images[path]
def material(name,color,rough=.55,metal=0,surface=None):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    n=m.node_tree.nodes;l=m.node_tree.links;b=n.get('Principled BSDF')
    b.inputs['Base Color'].default_value=(*color,1);b.inputs['Roughness'].default_value=rough;b.inputs['Metallic'].default_value=metal
    if surface:
        for key,socket in [('map','Base Color'),('roughnessMap','Roughness'),('normalMap','Normal')]:
            path=TEX/f'{surface}_{key}.jpg'
            if not path.exists():path=TEX/f'{surface}_{key}.png'
            t=n.new('ShaderNodeTexImage');t.image=image(path)
            if key!='map':t.image.colorspace_settings.name='Non-Color'
            if key=='map':
                # Bake tint to an image, compatible with standard glTF PBR.
                tinted=TEX/f'{name.replace(" / ","_")}_albedo.png'
                # Image multiplication is prepared below via Blender pixels.
                src=t.image;dst=src.copy();dst.name=name+' albedo'
                px=list(src.pixels[:])
                # Blender pixels are linear; preserve correctly managed colour.
                for i in range(0,len(px),4):
                    for c in range(3):px[i+c]*=color[c]
                dst.pixels[:]=px;dst.filepath_raw=str(tinted);dst.file_format='PNG';dst.save();t.image=dst
                l.new(t.outputs['Color'],b.inputs[socket])
            elif key=='normalMap':
                normal=n.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.38
                l.new(t.outputs['Color'],normal.inputs['Color']);l.new(normal.outputs['Normal'],b.inputs[socket])
            else:l.new(t.outputs['Color'],b.inputs[socket])
    return m
red=material('Vehicle enamel',(.48,.038,.025),.46,0,'paint')
black=material('Powder coated steel',(.025,.031,.036),.47,.10,'paint')
steel=material('Brushed steel',(.46,.5,.53),.28,.85)
rubber=material('Moulded rubber',(.018,.022,.025),.93,0,'rubber')
seatmat=material('Seat upholstery',(.028,.032,.035),.91,0,'cloth')
navy=material('Insulated navy fabric',(.032,.060,.090),.93,0,'cloth')
hi=material('Safety orange fabric',(.73,.20,.025),.89,0,'cloth')
reflect=material('Reflective webbing',(.54,.59,.56),.38,.13)
skin=material('Skin',(.48,.275,.16),.61)
skin.node_tree.nodes['Principled BSDF'].inputs['Subsurface Weight'].default_value=.08
helmetmat=material('Safety helmet',(.85,.60,.12),.4)
eye=material('Eye sclera',(.65,.63,.57),.3)
iris=material('Iris',(.030,.020,.014),.35)
carton=material('Kraft cardboard',(.68,.49,.27),.94,0,'carton')
whitebox=material('White carton',(.86,.87,.84),.95,0,'carton')
tape=material('Packing tape',(.62,.46,.25),.37)
wood=material('Pallet timber',(.83,.77,.64),.86,0,'wood')
floor=material('Warehouse concrete',(.77,.80,.79),.83,0,'concrete')
wall=material('Painted wall',(.81,.83,.83),.85,0,'wall')
panel=material('Insulated panel',(.70,.76,.78),.43,.08)
blue=material('Rapid door PVC',(.017,.072,.39),.45)
yellow=material('Safety yellow',(.9,.6,.08),.51)
amber=material('Amber beacon',(.85,.22,.018),.28)
amber.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(1,.12,.005,1)
amber.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=.3
def decalmat(name):
    m=material(name,(1,1,1),.66);n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=image(TEX/f'{name}.png')
    m.node_tree.links.new(n.outputs['Color'],m.node_tree.nodes['Principled BSDF'].inputs['Base Color']);return m
labels={s:decalmat(s) for s in ['equipment_label','warning','shipping']}
def root(name):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);assets[name]=o;return o
def attach(o,name,mat,parent=None):
    o.name=name
    if mat:o.data.materials.append(mat)
    if parent:o.parent=parent
    return o
def apply(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
def finish(o,bevel=0,smooth=False):
    if bevel:
        mod=o.modifiers.new('Manufactured edge radius','BEVEL');mod.width=bevel;mod.segments=2
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=smooth
    if bevel:
        mod=o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL');mod.keep_sharp=True
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def box(name,loc,size,mat,parent=None,bevel=.01):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=size;apply(o)
    attach(o,name,mat,parent);finish(o,bevel,bevel>0);return o
def uv_metres(o,scale=1):
    uv=o.data.uv_layers.active or o.data.uv_layers.new()
    for p in o.data.polygons:
        axis=max(range(3),key=lambda i:abs(p.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in p.loop_indices:
            co=o.data.vertices[o.data.loops[li].vertex_index].co
            uv.data[li].uv=(co[axes[0]]/scale,co[axes[1]]/scale)
def cylinder(name,a,b,r,mat,parent=None,vertices=16,r2=None):
    delta=Vector(b)-Vector(a);mid=(Vector(a)+Vector(b))*.5
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r if r2 is None else r2,depth=delta.length,location=mid)
    o=bpy.context.object;o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();attach(o,name,mat,parent);finish(o,0,True);return o
def sphere(name,loc,size,mat,parent=None,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.scale=size;apply(o);attach(o,name,mat,parent);finish(o,0,True);return o
def path(name,points,r,mat,parent):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=r;curve.bevel_resolution=1
    sp=curve.splines.new('POLY');sp.points.add(len(points)-1)
    for p,co in zip(sp.points,points):p.co=(*co,1)
    o=bpy.data.objects.new(name,curve);scene.collection.objects.link(o);attach(o,name,mat,parent)
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return bpy.context.object
def decal(name,loc,size,mat,parent,rotation=(pi/2,0,0)):
    bpy.ops.mesh.primitive_plane_add(size=1,location=loc);o=bpy.context.object;o.scale=(*size,1);o.rotation_euler=rotation
    apply(o);attach(o,name,mat,parent);return o
def hull(name,rings,mat,parent):
    # Cross-sections of a cast counterweight / folded steel bonnet.
    vertices=[(x,y,z) for z,outline in rings for x,y in outline];n=len(rings[0][1]);faces=[]
    faces.append(tuple(reversed(range(n))))
    for j in range(len(rings)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple((len(rings)-1)*n+i for i in range(n)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);attach(o,name,mat,parent)
    bpy.context.view_layer.objects.active=o;finish(o,.028,True);uv_metres(o,.8);return o
def descendants(o):return [o]+list(o.children_recursive)
def merge(parent):
    groups={}
    for o in list(parent.children):
        if o.type=='MESH' and not o.children and len(o.data.materials)==1:groups.setdefault(o.data.materials[0],[]).append(o)
    for mat,objects in groups.items():
        if len(objects)<2:continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objects:o.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=parent.name+' / '+mat.name

# Electric counterbalance truck: split cast rear shell, steel chassis and service lid.
fork=root('Forklift_LOD0')
outline=[(-.54,-1.10),(.54,-1.10),(.64,-.87),(.61,.53),(-.61,.53),(-.64,-.87)]
hull('Cast counterweight',[(.33,outline),(.66,[(x*.96,y) for x,y in outline]),(.87,[(x*.82,y+.05) for x,y in outline])],red,fork)
box('Lower bumper',(0,-.97,.32),(1.08,.28,.12),black,fork,.045)
box('Battery enclosure',(0,-.23,.60),(1.07,1.15,.49),red,fork,.045)
box('Battery lid',(0,-.27,.866),(1.055,1.05,.055),red,fork,.018)
box('Lid split line',(0,-.27,.838),(1.064,1.06,.008),black,fork,.003)
box('Operator floor',(0,.45,.39),(1.12,.66,.14),black,fork,.02)
for side in [-1,1]:
    box('Entry step',(side*.59,.29,.255),(.17,.48,.065),steel,fork,.009)
    for k in range(7):box('Anti-slip step grip',(side*.595,.12+k*.049,.293),(.14,.013,.007),rubber,fork,.002)
    box('Front fender',(side*.515,.66,.70),(.30,.68,.14),red,fork,.045)
    for k in range(7):box('Cooling louvre',(side*.558,-.55+k*.07,.65),(.009,.032,.13),black,fork,.004)
    decal('Capacity plate',(side*.552,-.20,.67),(.55,.138),labels['equipment_label'],fork,(pi/2,0,side*pi/2))
    for y,z in [(-.64,1.44),(.61,1.45)]:
        path('Overhead guard upright',[(side*.49,y,.81),(side*.49,y,z),(side*.48,y*.89,2.17)],.032,black,fork)
    box('Roof guard rail',(side*.49,0,2.205),(.067,1.36,.075),black,fork,.01)
for y in [-.65,-.38,-.12,.14,.40,.65]:box('Overhead protection slat',(0,y,2.215),(1.04,.075,.035),black,fork,.008)
box('Seat slide',(0,-.30,.95),(.49,.51,.07),steel,fork)
box('Contoured seat cushion',(0,-.25,1.015),(.52,.50,.135),seatmat,fork,.055)
back=box('Seat backrest',(0,-.51,1.25),(.50,.13,.47),seatmat,fork,.055);back.rotation_euler.x=-.12
for side in [-1,1]:
    box('Seat side bolster',(side*.20,-.28,1.095),(.08,.40,.10),seatmat,fork,.036)
    cylinder('Seat belt clip',(side*.29,-.20,.91),(side*.29,-.18,1.10),.024,black,fork)
path('Steering column',[(0,.44,.58),(0,.30,1.16),(0,.28,1.37)],.037,black,fork)
bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=6,location=(0,.23,1.43),major_radius=.19,minor_radius=.019)
o=bpy.context.object;o.rotation_euler.x=.32;attach(o,'Steering rim',rubber,fork)
for a in [0,2*pi/3,4*pi/3]:cylinder('Steering spoke',(0,.23,1.43),(.17*cos(a),.23+.17*sin(a),1.43),.008,steel,fork,8)
box('Instrument cluster',(0,.43,1.13),(.37,.16,.20),black,fork,.035)
box('Dashboard display',(0,.335,1.16),(.15,.007,.07),steel,fork,.004)
for i in range(3):
    cylinder('Hydraulic lever',(.29+i*.075,.13,.88),(.29+i*.075,.20,1.21+i*.02),.012,steel,fork,8)
    sphere('Lever knob',(.29+i*.075,.20,1.21+i*.02),(.026,.030,.034),rubber,fork,12,6)
cylinder('Beacon base',(0,-.45,2.24),(0,-.45,2.275),.070,black,fork)
cylinder('Amber safety beacon',(0,-.45,2.275),(0,-.45,2.39),.058,amber,fork,20,r2=.047)
for side in [-1,1]:
    for y,r in [(-.73,.29),(.68,.345)]:
        pivot=bpy.data.objects.new(f'Wheel_{side}_{y}',None);scene.collection.objects.link(pivot);pivot.parent=fork;pivot.location=(side*.61,y,r)
        cylinder('Solid tyre',(-.105,0,0),(.105,0,0),r,rubber,pivot,32)
        for sign in [-1,1]:
            cylinder('Tyre shoulder',(sign*.099,0,0),(sign*.119,0,0),r*.89,rubber,pivot,32,r2=r*.85)
            cylinder('Pressed steel rim',(sign*.116,0,0),(sign*.126,0,0),r*.48,steel,pivot,20)
            cylinder('Wheel hub',(sign*.127,0,0),(sign*.15,0,0),r*.19,black,pivot,16)
            for a in range(5):
                angle=a*2*pi/5;cylinder('Wheel stud',(sign*.13,sin(angle)*r*.31,cos(angle)*r*.31),(sign*.145,sin(angle)*r*.31,cos(angle)*r*.31),.013,steel,pivot,6)
        merge(pivot)
for side in [-1,1]:
    box('Outer mast channel',(side*.39,1.04,1.39),(.095,.19,2.53),black,fork,.008)
    box('Polished mast slide',(side*.326,1.04,1.40),(.025,.15,2.44),steel,fork,.003)
    cylinder('Lift ram barrel',(side*.23,1.025,.27),(side*.23,1.025,1.30),.047,black,fork)
    cylinder('Chromed piston',(side*.23,1.025,1.29),(side*.23,1.025,2.49),.024,steel,fork)
    for z in [i*.07+.35 for i in range(29)]:box('Lift chain link',(side*.16,1.15,z),(.022,.017,.048),steel,fork,.003)
    path('Hydraulic hose',[(side*.25,1.13,.35),(side*.29,1.15,1.8),(side*.27,1.16,2.40),(side*.19,1.16,2.46),(side*.12,1.16,2.38),(side*.12,1.16,1.72)],.010,rubber,fork)
    box('Worklamp housing',(side*.45,.72,1.88),(.14,.10,.105),black,fork,.02)
    box('Worklamp glass',(side*.45,.777,1.88),(.115,.01,.075),reflect,fork,.009)
box('Mast crossmember',(0,1.04,2.62),(.87,.19,.12),black,fork,.008)
carriage=bpy.data.objects.new('Lift_carriage',None);scene.collection.objects.link(carriage);carriage.parent=fork
for z in [.32,.65]:box('Carriage crossbar',(0,1.19,z),(.96,.10,.11),black,carriage,.008)
for x in [-.43,-.22,0,.22,.43]:box('Load backrest vertical',(x,1.13,1.10),(.025,.027,.93),black,carriage,.005)
for z in [.69,1.0,1.32,1.57]:box('Load backrest horizontal',(0,1.13,z),(.94,.032,.027),black,carriage,.005)
for side in [-1,1]:
    box('Forged fork shank',(side*.28,1.265,.43),(.12,.074,.61),steel,carriage,.008)
    box('Forged fork blade',(side*.28,1.83,.16),(.12,1.20,.065),steel,carriage,.007)
decal('Mast warning',(0,1.247,.67),(.39,.098),labels['warning'],carriage,(-pi/2,0,0))
merge(fork);merge(carriage)

# Wooden pallet and tidy cartons, with real thickness and shared printed labels.
load=root('Pallet_load_LOD0')
for y in [-.39,0,.39]:
    box('Lower runner',(0,y,.026),(1.20,.10,.047),wood,load,.006)
    for x in [-.49,0,.49]:box('Pallet block',(x,y,.075),(.135,.135,.105),wood,load,.007)
for x in [-.51,-.255,0,.255,.51]:box('Deck board',(x,0,.142),(.18,1.0,.030),wood,load,.005)
for level in range(3):
    for x in [-.284,.284]:
        for y in [-.236,.236]:
            z=.16+.16+level*.326;mat=carton if level!=1 else whitebox
            o=box('Corrugated carton',(x,y,z),(.55,.452,.31),mat,load,.009)
            box('Top sealing tape',(x,y,z+.157),(.057,.451,.005),tape,load,.001)
            for sy in [-1,1]:
                box('Tape folded onto face',(x,y+sy*.228,z+.080),(.057,.002,.15),tape,load,.001)
                decal('Shipping label',(x+.06,y+sy*.229,z-.012),(.258,.129),labels['shipping'],load,(pi/2 if sy<0 else -pi/2,0,0))
for x in [-.39,.39]:
    box('Load strap',(x,0,1.147),(.013,.96,.009),black,load,.001)
    for y in [-.477,.477]:box('Strap down face',(x,y,.65),(.013,.006,1.0),black,load,.001)
for o in load.children:
    if o.type=='MESH' and o.data.materials[0]==wood:uv_metres(o,.45)
merge(load)

cart=root('Pallet_truck_LOD0')
for side in [-1,1]:
    box('Pressed fork',(side*.25,.46,.104),(.17,1.38,.11),red,cart,.025)
    cylinder('Load roller',(side*.25-.065,.97,.085),(side*.25+.065,.97,.085),.071,rubber,cart,20)
box('Pump cover',(0,-.23,.26),(.52,.34,.37),red,cart,.085)
cylinder('Hydraulic jack',(0,-.24,.24),(0,-.24,.59),.060,steel,cart)
for side in [-1,1]:cylinder('Steering roller',(side*.10,-.27,.13),(side*.22,-.27,.13),.12,rubber,cart,20)
path('Tiller tube',[(0,-.27,.40),(0,-.43,.74),(0,-.66,1.03)],.030,black,cart)
path('Ergonomic handle',[(-.14,-.66,1.03),(-.20,-.67,1.09),(-.17,-.69,1.17),(0,-.69,1.18),(.17,-.69,1.17),(.20,-.67,1.09),(.14,-.66,1.03),(-.14,-.66,1.03)],.022,rubber,cart)
merge(cart)

# Tailored clothing uses connected rings, not overlapping ellipsoids.
worker=root('Worker_LOD0');weighted=[]
def weight(o,bone):weighted.append((o,bone));return o
def garment(name,rings,mat,bone,segments=20):
    vertices=[]
    for j,(cx,cy,z,rx,ry) in enumerate(rings):
        for i in range(segments):
            a=i*2*pi/segments;fold=1+.022*sin(i*3+j*2)+.010*cos(i*7-j)
            vertices.append((cx+rx*cos(a)*fold,cy+ry*sin(a)*fold,z))
    faces=[tuple(reversed(range(segments)))]
    for j in range(len(rings)-1):
        for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o);attach(o,name,mat,worker);uv_metres(o,.35);finish(o,0,True);return weight(o,bone)
garment('Insulated coat',[(0,0,.70,.245,.158),(0,0,.75,.245,.16),(0,0,.89,.215,.14),(0,0,1.04,.198,.135),(0,0,1.17,.215,.14),(0,0,1.34,.244,.146),(0,0,1.41,.22,.136),(0,0,1.47,.115,.096)],navy,'spine',24)
garment('High collar',[(0,0,1.41,.107,.092),(0,0,1.48,.095,.085),(0,0,1.51,.090,.079)],navy,'spine')
for side in [-1,1]:
    weight(box('Coat pocket',(side*.137,-.145,1.02),(.14,.025,.16),navy,worker,.012),'spine')
    weight(box('Pocket flap',(side*.137,-.167,1.09),(.145,.012,.041),navy,worker,.009),'spine')
    weight(box('Reflective chest strip',(side*.108,-.146,1.31),(.04,.006,.23),reflect,worker,.002),'spine')
    weight(box('Orange shoulder trim',(side*.16,-.106,1.414),(.11,.045,.045),hi,worker,.006),'spine')
weight(box('Coat zipper',(0,-.147,1.10),(.008,.008,.71),black,worker,.001),'spine')
weight(box('Zipper pull',(0,-.16,1.30),(.019,.008,.029),steel,worker,.003),'spine')
for z in [.84,1.175]:weight(box('Reflective waist band',(0,-.155,z),(.426,.006,.020),reflect,worker,.002),'spine')
for side in [-1,1]:
    label='L' if side==1 else 'R';x=side*.115
    garment('Trouser thigh '+label,[(x,0,.90,.10,.11),(x,0,.81,.098,.103),(x,-.005,.63,.087,.095),(x,0,.48,.076,.085)],navy,'thigh.'+label)
    garment('Trouser shin '+label,[(x,0,.50,.077,.085),(x,.01,.41,.083,.088),(x,.004,.24,.066,.071),(x,0,.115,.065,.066)],navy,'shin.'+label)
    weight(box('Boot sole '+label,(x,-.055,.035),(.16,.30,.053),rubber,worker,.020),'foot.'+label)
    weight(box('Leather safety boot '+label,(x,-.06,.092),(.15,.278,.12),rubber,worker,.032),'foot.'+label)
    weight(box('Boot toe cap '+label,(x,-.15,.088),(.15,.095,.093),rubber,worker,.026),'foot.'+label)
    garment('Upper sleeve '+label,[(side*.208,0,1.39,.093,.09),(side*.263,.003,1.32,.085,.085),(side*.286,.01,1.16,.075,.078),(side*.30,0,1.09,.071,.075)],navy,'upper_arm.'+label,16)
    garment('Fore sleeve '+label,[(side*.30,0,1.12,.073,.074),(side*.31,-.016,1.02,.072,.072),(side*.315,-.04,.90,.055,.058),(side*.315,-.052,.85,.052,.053)],navy,'forearm.'+label,16)
    garment('Glove '+label,[(side*.315,-.055,.875,.048,.043),(side*.315,-.068,.81,.054,.045),(side*.315,-.076,.747,.042,.031)],rubber,'hand.'+label,12)
    weight(sphere('Glove thumb '+label,(side*.27,-.093,.802),(.024,.028,.046),rubber,worker,12,6),'hand.'+label)

# Anatomical CC0 face and ears, cropped from MakeHuman's body group.
vs=[];faces=[];group=''
for line in (OUT/'human_base.obj').read_text().splitlines():
    if line.startswith('v '):vs.append(tuple(map(float,line.split()[1:])))
    elif line.startswith('g '):group=line[2:]
    elif line.startswith('f ') and group=='body':
        face=[int(t.split('/')[0])-1 for t in line.split()[1:]]
        if all(vs[i][1]>6.3 for i in face):faces.append(face)
ids=sorted({i for f in faces for i in f});remap={v:i for i,v in enumerate(ids)}
mesh=bpy.data.meshes.new('Anatomical face CC0');mesh.from_pydata([(vs[i][0]*.112,-(vs[i][2]*.112-.014),1.48+(vs[i][1]-6.3)*.113) for i in ids],[],[[remap[i] for i in f] for f in faces]);mesh.update()
o=bpy.data.objects.new('Anatomical face',mesh);scene.collection.objects.link(o);attach(o,o.name,skin,worker);finish(o,0,True);weight(o,'head')
for side in [-1,1]:
    p=(side*.0345,-.1255,1.5912)
    weight(sphere('Eye',p,(.013,.011,.010),eye,worker,12,6),'head')
    weight(sphere('Iris',(p[0],p[1]-.009,p[2]),(.005,.0025,.005),iris,worker,12,6),'head')
weight(sphere('Helmet shell',(0,.006,1.729),(.132,.15,.102),helmetmat,worker,24,10),'head')
weight(box('Helmet peak',(0,-.065,1.712),(.28,.25,.014),helmetmat,worker,.045),'head')
weight(box('Helmet crown ridge',(0,.004,1.820),(.027,.19,.016),helmetmat,worker,.008),'head')

arm=bpy.data.armatures.new('Worker skeleton');rig=bpy.data.objects.new('Worker_Rig',arm);scene.collection.objects.link(rig);rig.parent=worker
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig;bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
bone('root',(0,0,0),(0,0,.2));bone('spine',(0,0,.9),(0,0,1.43),'root');bone('head',(0,0,1.43),(0,0,1.78),'spine')
for side in [-1,1]:
    s='L' if side==1 else 'R';x=side*.115
    bone('thigh.'+s,(x,0,.90),(x,0,.49),'root');bone('shin.'+s,(x,0,.49),(x,0,.115),'thigh.'+s);bone('foot.'+s,(x,0,.115),(x,-.18,.06),'shin.'+s)
    bone('upper_arm.'+s,(side*.21,0,1.39),(side*.30,0,1.10),'spine');bone('forearm.'+s,(side*.30,0,1.10),(side*.315,-.052,.85),'upper_arm.'+s);bone('hand.'+s,(side*.315,-.052,.85),(side*.315,-.076,.747),'forearm.'+s)
bpy.ops.object.mode_set(mode='OBJECT')
for o,bname in weighted:
    vg=o.vertex_groups.new(name=bname);vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for o,_ in weighted:o.select_set(True)
bpy.context.view_layer.objects.active=weighted[0][0];bpy.ops.object.join();body=bpy.context.object;body.name='Worker_skinned_mesh';body.parent=rig
mod=body.modifiers.new('Skeleton deformation','ARMATURE');mod.object=rig
for p in rig.pose.bones:p.rotation_mode='XYZ'
for frame in range(1,51,2):
    phase=(frame-1)/48*2*pi
    for side in [-1,1]:
        s='L' if side==1 else 'R';p=phase+(pi if side==1 else 0)
        for name,angle in [('thigh',sin(p)*.30),('shin',max(0,cos(p))*.44),('upper_arm',-sin(p)*.20),('forearm',-.13)]:
            b=rig.pose.bones[name+'.'+s];b.rotation_euler.x=angle;b.keyframe_insert('rotation_euler',frame=frame)
    rig.pose.bones['spine'].location.y=abs(sin(phase))*.008;rig.pose.bones['spine'].keyframe_insert('location',frame=frame)
rig.animation_data.action.name='Worker_Walk'
scene.frame_set(1)

# Export each reusable asset in metres with its origin at floor contact.
def select_asset(obj):
    bpy.ops.object.select_all(action='DESELECT')
    for o in descendants(obj):o.select_set(True)
    bpy.context.view_layer.objects.active=obj
def stats(obj):
    meshes=[o for o in descendants(obj) if o.type=='MESH'];materials={m.name for o in meshes for m in o.data.materials}
    for o in meshes:o.data.calc_loop_triangles()
    return {'triangles':sum(len(o.data.loop_triangles) for o in meshes),'mesh_objects':len(meshes),'materials':len(materials),'draw_primitives':sum(len(o.data.materials) for o in meshes)}
report={'blender':bpy.app.version_string,'transport':'interactive Blender MCP','assets':{}}
for name,obj in list(assets.items()):
    select_asset(obj);filename=name+'.glb'
    bpy.ops.export_scene.gltf(filepath=str(OUT/filename),export_format='GLB',use_selection=True,use_active_scene=True,export_image_format='JPEG',export_jpeg_quality=88,export_animations=True,export_yup=True,export_texcoords=True,export_normals=True)
    report['assets'][name]={**stats(obj),'file':filename,'bytes':(OUT/filename).stat().st_size}

# Presentation scene, with the same finish used by the web assets.
fork.location=(-1.45,.55,0);fork.rotation_euler.z=-.16
load.location=(1.3,.6,0);cart.location=(1.3,.0,0)
worker.location=(1.15,-1.25,0);worker.rotation_euler.z=-.23
stage=root('Surface_sample')
o=box('Concrete floor',(0,0,-.12),(12,12,.24),floor,stage,.01);uv_metres(o,3.5)
o=box('Plastered structural wall',(-4.4,2.6,2.25),(.30,5.4,4.5),wall,stage,.014);uv_metres(o,2.5)
for x in [-3.6,-2.4,-1.2,0,1.2,2.4,3.6,4.8]:
    box('Insulated panel',(x,3.0,2.25),(1.184,.16,4.5),panel,stage,.008)
    box('Panel seam',(x+.595,2.907,2.25),(.012,.014,4.5),steel,stage,.002)
    box('Wall kickplate',(x,2.884,.33),(1.18,.027,.65),black,stage,.004)
box('Door curtain',(3.1,2.82,1.63),(2.35,.047,3.26),blue,stage,.008)
for x in [1.86,4.34]:box('Door guide',(x,2.80,1.7),(.13,.20,3.4),steel,stage,.01)
for z in [.5,1.25,2.0,2.75]:box('Door stiffener',(3.1,2.77,z),(2.32,.027,.023),reflect,stage,.003)
for x in [1.64,4.57]:
    cylinder('Dock bollard',(x,2.42,.07),(x,2.42,.83),.066,yellow,stage,20)
    box('Bollard base',(x,2.42,.035),(.22,.22,.05),black,stage,.008)
for x in [-3,-.1,2.8]:box('Floor joint',(x,0,.004),(.007,11,.002),black,stage,0)
for y in [-3,0,3]:box('Floor joint',(0,y,.004),(11,.007,.002),black,stage,0)
for x in [-3.8,4.8]:box('Safety floor marking',(x,-.3,.007),(.075,4.7,.003),yellow,stage,.001)
merge(stage)
select_asset(stage);bpy.ops.export_scene.gltf(filepath=str(OUT/'Surface_sample.glb'),export_format='GLB',use_selection=True,use_active_scene=True,export_image_format='JPEG',export_jpeg_quality=88,export_animations=False)
report['assets']['Surface_sample']={**stats(stage),'file':'Surface_sample.glb','bytes':(OUT/'Surface_sample.glb').stat().st_size}
def area(name,loc,target,power,size,color):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=color
    obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
area('Warehouse softbox',(-2,-1,5.5),(0,0,.5),1600,4,(.90,.95,1))
area('Dock daylight',(4,-3,4),(0,0,1),1150,4,(1,.89,.74))
area('Ceiling bounce',(0,2,4.3),(-1,0,1),950,3,(.75,.86,1))
def camera(name,loc,target,lens):
    data=bpy.data.cameras.new(name);data.lens=lens;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler();return obj
cam=camera('01 / Asset pilot',(7.8,-10.8,5.5),(0,.45,1.10),48)
camera('02 / Forklift detail',(1.9,-3.9,2.6),(-1.45,.55,1.10),52)
camera('03 / Worker and goods',(4.3,-5.3,2.9),(1.15,-.45,1.0),55)
scene.camera=cam;scene.render.filepath=str(OUT/'01_Asset_pilot.png')
for img in bpy.data.images:
    if img.source=='FILE' and img.has_data:
        try:img.pack()
        except RuntimeError:pass
report['build_seconds']=time.perf_counter()-started
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'ETAK_Asset_Pilot.blend'))
result=report
