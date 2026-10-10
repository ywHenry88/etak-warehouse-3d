"""Refine temporary production copies only; executed by export-runtime.py."""
import bpy, bmesh, math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree

tex = Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010/textures/realism')
runtime_materials = {}

def continuous_workwear(body):
    """Replace disconnected sleeve/trouser sections with blended joint loops."""
    bpy.context.view_layer.update()
    mesh=body.data
    navy=next(i for i,m in enumerate(mesh.materials) if m.name=='Insulated navy fabric')
    group_names={g.index:g.name for g in body.vertex_groups}
    cloth={vi for p in mesh.polygons if p.material_index==navy for vi in p.vertices}
    remove={v.index for v in mesh.vertices if v.index in cloth and any(group_names[g.group].startswith(('upper_arm','forearm','thigh','shin')) for g in v.groups)}
    bm=bmesh.new();bm.from_mesh(mesh);bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[bm.verts[i] for i in remove],context='VERTS')
    bm.to_mesh(mesh);bm.free()
    vertices=[];faces=[];weights=[]
    def limb(side,arm):
        rings=[(1.405,.208,.092,.09),(1.35,.25,.088,.083),(1.25,.28,.078,.076),(1.16,.297,.075,.073),(1.10,.300,.074,.074),(1.04,.304,.068,.067),(.95,.310,.061,.060),(.87,.315,.052,.052)] if arm else [(.90,.115,.098,.105),(.83,.115,.098,.105),(.70,.115,.091,.10),(.59,.115,.084,.092),(.53,.115,.080,.09),(.49,.115,.079,.089),(.45,.115,.079,.084),(.36,.115,.077,.079),(.24,.115,.065,.070),(.115,.115,.058,.065)]
        start=len(vertices);segments=16
        for z,cx,rx,ry in rings:
            cy=-.052*max(0,min(1,(1.1-z)/.25)) if arm else .004*math.sin(z*9)
            t=max(0,min(1,((1.16 if arm else .555)-z)/.13));t=t*t*(3-2*t)
            suffix='L' if side==1 else 'R'
            w={('upper_arm.' if arm else 'thigh.')+suffix:1-t,('forearm.' if arm else 'shin.')+suffix:t}
            for i in range(segments):
                a=i*math.tau/segments
                fold=1+.018*math.sin(a*3+z*48)
                vertices.append((side*cx+rx*math.cos(a)*fold,cy+ry*math.sin(a)*fold,z));weights.append(w)
        for j in range(len(rings)-1):
            for i in range(segments):
                a=start+j*segments+i;b=start+j*segments+(i+1)%segments
                faces.append((a,a+segments,b+segments,b))
        faces.append(tuple(start+i for i in range(segments)))
        faces.append(tuple(start+(len(rings)-1)*segments+i for i in reversed(range(segments))))
    for side in [-1,1]:limb(side,True);limb(side,False)
    data=bpy.data.meshes.new('Continuous sleeves and trousers');data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new('Temporary workwear',data);bpy.context.scene.collection.objects.link(obj)
    obj.matrix_world=body.matrix_world.copy();data.materials.append(mesh.materials[navy])
    for p in data.polygons:p.use_smooth=True
    uv=data.uv_layers.new(name='UVMap')
    for p in data.polygons:
        for li in p.loop_indices:
            v=data.vertices[data.loops[li].vertex_index].co;uv.data[li].uv=(v.x/.20,v.z/.20)
    for name in {n for w in weights for n in w}:obj.vertex_groups.new(name=name)
    for i,w in enumerate(weights):
        for name,value in w.items():
            if value>0:obj.vertex_groups[name].add([i],value,'REPLACE')
    bpy.ops.object.select_all(action='DESELECT');body.select_set(True);obj.select_set(True)
    bpy.context.view_layer.objects.active=body;bpy.ops.object.join()

def linear(rgb):
    return tuple((v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4) for v in rgb)

def material(original):
    if original.name in runtime_materials: return runtime_materials[original.name]
    m=original.copy();m.name=original.name+' / runtime'
    b=m.node_tree.nodes.get('Principled BSDF');links=m.node_tree.links
    for key,socket in [('map','Base Color'),('normalMap','Normal'),('roughnessMap','Roughness')]:
        path=tex/(original.name+'_'+key+'.png')
        if not path.exists(): continue
        for link in list(b.inputs[socket].links):links.remove(link)
        t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(path),check_existing=True)
        t.image.colorspace_settings.name='sRGB' if key=='map' else 'Non-Color'
        if key=='normalMap':
            n=m.node_tree.nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.65
            links.new(t.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],b.inputs[socket])
        else:links.new(t.outputs['Color'],b.inputs[socket])
    name=original.name
    if name=='Skin':
        b.inputs['Base Color'].default_value=(*linear((184,139,111)),1)
        b.inputs['Roughness'].default_value=.69
    if name in ['NICHIYU graphite','NICHIYU dark wheel enamel']:
        b.inputs['Base Color'].default_value=(*linear((55,61,65)),1)
        b.inputs['Roughness'].default_value=.48;b.inputs['Metallic'].default_value=0
    if name=='Tyre sidewall':
        b.inputs['Base Color'].default_value=(*linear((39,42,44)),1)
    if name=='Safety helmet':
        b.inputs['Base Color'].default_value=(*linear((218,180,75)),1);b.inputs['Roughness'].default_value=.48
    if name=='Reflective webbing':
        b.inputs['Base Color'].default_value=(*linear((168,178,174)),1);b.inputs['Roughness'].default_value=.55
    if name=='Brushed steel':b.inputs['Roughness'].default_value=.34
    runtime_materials[original.name]=m
    return m

for root in roots:
    for obj in root.children_recursive:
        if obj.type!='MESH':continue
        if root.name.startswith(('Worker','Driver')):
            continuous_workwear(obj)
            if root.name=='DriverCold':
                # Weight the coat hem only after replacing the limb surfaces.
                spine=obj.vertex_groups['spine']
                for v in obj.data.vertices:
                    if v.co.z>=.90 or not any(g.group==spine.index and g.weight>.5 for g in v.groups):continue
                    amount=min(1,max(0,(.90-v.co.z)/.17))
                    spine.add([v.index],1-amount,'REPLACE')
                    for side in ['L','R']:obj.vertex_groups['thigh.'+side].add([v.index],amount*.5,'REPLACE')
        for i,m in enumerate(obj.data.materials):obj.data.materials[i]=material(m)
        if not root.name.startswith(('Worker','Driver')):continue
        mesh=obj.data
        # Low amplitude folds sculpt the existing rings without adding triangles.
        groups={g.index:g.name for g in obj.vertex_groups}
        for v in mesh.vertices:
            if not v.groups:continue
            group=groups[max(v.groups,key=lambda g:g.weight).group]
            x,y,z=v.co
            if group=='head' and 1.475<z<1.505 and y<-.095:
                # Tuck the cropped jaw into the existing high collar.
                amount=min(1,(1.505-z)/.03)
                v.co.x*=1-.08*amount;v.co.y=.018+(y-.018)*(1-.12*amount)
            if group=='spine' and .72<z<1.42:
                taper=math.sin((z-.72)/.70*math.pi)**2
                wave=math.sin(z*53+x*11)*.0035+math.sin(z*27-x*14)*.003
                v.co.y+=(-1 if y<0 else 1)*wave*taper
            if group.startswith(('upper_arm','forearm','thigh','shin')):
                strength=.0045 if 'arm' in group else .006
                v.co.y+=math.sin(z*49+x*9)*strength*math.sin(z*13)**2
        # Subtle seam/cuff wear and face colour variation, shared vertex colours.
        colours=mesh.color_attributes.new(name='Workwear detail',type='FLOAT_COLOR',domain='POINT')
        assignments={i:set() for i in range(len(mesh.vertices))}
        for p in mesh.polygons:
            for vi in p.vertices:assignments[vi].add(mesh.materials[p.material_index].name)
        for v in mesh.vertices:
            x,y,z=v.co;names=assignments[v.index];value=(1,1,1)
            if any('navy fabric' in n for n in names):
                shade=.91+.07*(.5+.5*math.sin(z*31+x*15))
                value=(shade,shade,shade)
            if any(n.startswith('Skin') for n in names):
                cheek=math.exp(-((abs(x)-.066)/.035)**2-((z-1.57)/.037)**2)*max(0,min(1,-y*12))
                lip=math.exp(-(x/.039)**4-((z-1.543)/.009)**2)*max(0,min(1,-y*12))
                value=(1-.025*lip,1-.13*cheek-.20*lip,1-.11*cheek-.14*lip)
            colours.data[v.index].color=(*value,1)
        # Exporter includes the active vertex colour attribute in glTF.
        mesh.color_attributes.active_color=colours
        mesh.update()

# Bake restrained short-range contact shading into existing vertices. This adds
# depth around seat supports, garment folds and machinery without live lights,
# extra meshes or screen-space passes. Each moving assembly keeps its shading.
bpy.context.view_layer.update()
for root in roots:
    objects=[o for o in root.children_recursive if o.type=='MESH']
    points=[];triangles=[]
    for obj in objects:
        offset=len(points);obj.data.calc_loop_triangles()
        points.extend(obj.matrix_world@v.co for v in obj.data.vertices)
        triangles.extend(tuple(offset+i for i in p.vertices) for p in obj.data.loop_triangles)
    tree=BVHTree.FromPolygons(points,triangles,all_triangles=True)
    for obj in objects:
        mesh=obj.data;normals=obj.matrix_world.to_3x3().inverted().transposed()
        colours=mesh.color_attributes.active_color
        if not colours:
            colours=mesh.color_attributes.new(name='Contact shading',type='FLOAT_COLOR',domain='POINT')
            for c in colours.data:c.color=(1,1,1,1)
            mesh.color_attributes.active_color=colours
        for v in mesh.vertices:
            n=(normals@v.normal).normalized()
            tangent=n.cross(Vector((0,0,1)) if abs(n.z)<.9 else Vector((0,1,0))).normalized()
            bitangent=n.cross(tangent)
            origin=obj.matrix_world@v.co+n*.003
            occlusion=0
            reach=.16 if root.name.startswith(('Worker','Driver')) else .32
            for i in range(12):
                radial=math.sqrt((i+.5)/12);angle=i*2.399963
                direction=tangent*(radial*math.cos(angle))+bitangent*(radial*math.sin(angle))+n*math.sqrt(1-radial*radial)
                hit,_,_,distance=tree.ray_cast(origin,direction,reach)
                if hit is not None:occlusion+=1-distance/reach
            shade=1-.24*occlusion/12
            old=colours.data[v.index].color
            colours.data[v.index].color=(old[0]*shade,old[1]*shade,old[2]*shade,1)
