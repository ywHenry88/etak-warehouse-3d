"""Prepare offline PBR and markings for the Blender/WebGL pilot."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import base64, io, json, random, shutil
ROOT=Path(__file__).resolve().parents[2]
OUT=Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010')
TEX=OUT/'textures';TEX.mkdir(parents=True,exist_ok=True)
for kind,maps in json.loads((ROOT/'assets/ultra/textures.json').read_text()).items():
    for name,url in maps.items():
        image=Image.open(io.BytesIO(base64.b64decode(url.split(',')[1]))).convert('RGB')
        image.save(TEX/f'{kind}_{name}.jpg',quality=92)
r=random.Random(810)
for kind in ['paint','rubber','cloth','carton']:
    size=512
    im=Image.new('RGB',(size,size));pixels=im.load()
    for y in range(size):
        for x in range(size):
            v=round((236 if kind=='paint' else 219 if kind=='cloth' else 227)+r.random()*18)
            if kind=='cloth':v-=14 if (x%4<2)^(y%4<2) else 0
            pixels[x,y]=(v,v,v)
    d=ImageDraw.Draw(im)
    if kind=='paint':
        for _ in range(50):
            x,y=r.randrange(size),r.randrange(size);d.line((x,y,x+r.randrange(3,35),y+r.randrange(-2,3)),fill=(194,194,194),width=1)
    if kind=='rubber':
        for y in range(-size,size*2,40):d.line((0,y,size,y+size//2),fill=(125,125,125),width=5)
    if kind=='carton':
        d.rectangle((2,2,509,509),outline=(162,162,162),width=2)
        for _ in range(2400):
            x,y=r.randrange(size),r.randrange(size);d.line((x,y,x+3,y+1),fill=(203,203,203))
    im.save(TEX/f'{kind}_map.jpg',quality=90)
    # G channel: glTF metallic/roughness-compatible roughness image.
    rough=Image.new('RGB',(size,size));rp=rough.load()
    for y in range(size):
        for x in range(size):
            v=pixels[x,y][0];roughness=(.39 if kind=='paint' else .89 if kind=='rubber' else .92)+(255-v)/255*.24
            q=min(255,int(roughness*255));rp[x,y]=(q,q,q)
    rough.save(TEX/f'{kind}_roughnessMap.jpg',quality=85)
    gray=im.convert('L').filter(ImageFilter.GaussianBlur(.4));p=gray.load();n=Image.new('RGB',(size,size));np=n.load()
    for y in range(size):
        for x in range(size):
            dx=(p[(x+1)%size,y]-p[(x-1)%size,y])*.30;dy=(p[x,(y+1)%size]-p[x,(y-1)%size])*.30
            np[x,y]=(int(128-dx),int(128+dy),254)
    n.save(TEX/f'{kind}_normalMap.png')
fontpath='C:/Windows/Fonts/arial.ttf'
bold='C:/Windows/Fonts/arialbd.ttf'
def font(n):return ImageFont.truetype(fontpath,n)
def label(name,size,bg,draw):
    im=Image.new('RGB',size,bg);d=ImageDraw.Draw(im);draw(d);im.save(TEX/f'{name}.png')
def equipment(d):
    d.rectangle((0,0,1023,255),outline='#c3c5c6',width=9)
    d.text((32,18),'ETAK',font=ImageFont.truetype(bold,83),fill='#eceee9')
    d.text((35,118),'ELECTRIC  /  FL-01',font=font(36),fill='#dbdfde')
    d.text((35,175),'1.8 t   |   48 V   |   COLD CHAIN',font=font(28),fill='#b4bebd')
label('equipment_label',(1024,256),'#242b30',equipment)
def warning(d):
    d.polygon([(70,12),(13,111),(127,111)],fill='#efbd43',outline='#202424',width=5)
    d.text((59,29),'!',font=ImageFont.truetype(bold,62),fill='#1b2227')
    d.text((146,24),'CAUTION',font=ImageFont.truetype(bold,42),fill='#202424')
    d.text((146,77),'KEEP CLEAR OF MAST',font=font(22),fill='#202424')
label('warning',(512,128),'#dedfd5',warning)
def shipping(d):
    d.rectangle((2,2,1021,509),outline='#bbb7ad',width=6)
    d.text((42,25),'ETAK  /  COLD CHAIN',font=ImageFont.truetype(bold,58),fill='#303b3d')
    d.text((44,112),'FROZEN GOODS    -18 C',font=font(41),fill='#404848')
    d.text((44,174),'KEEP DRY    |    THIS SIDE UP',font=font(29),fill='#404848')
    x=45
    while x<620:
        w=r.randrange(2,8);d.rectangle((x,256,x+w,409),fill='#303638');x+=w+r.randrange(2,7)
    d.text((45,431),'ETK  001824  /  LOT 261010',font=font(31),fill='#404848')
    d.rectangle((740,264,938,404),outline='#41494b',width=7)
    d.line((764,299,764,359),fill='#41494b',width=10);d.line((833,299,833,359),fill='#41494b',width=10)
    for x in [764,833]:d.polygon([(x,281),(x-17,306),(x+17,306)],fill='#41494b')
label('shipping',(1024,512),'#e8e5da',shipping)
shutil.copy2('C:/Users/Henry/Desktop/Etak/Blender_Sample_20261006/human_base.obj',OUT/'human_base.obj')
(OUT/'ASSET_SOURCES.md').write_text('''# Pilot asset sources

Warehouse appearance: owner supplied CCTV C06/C10/C13/C14 (2026-09-28).
Forklift, clothes, pallet truck, pallet and packaging: newly authored for this pilot.
Anatomical face: MakeHuman hm08 base mesh, CC0 (source header retained in human_base.obj).
https://raw.githubusercontent.com/makehumancommunity/makehuman/master/makehuman/data/3dobjs/base.obj
Photographic concrete, plaster and plywood: Poly Haven, CC0.
https://polyhaven.com/a/concrete_floor
https://polyhaven.com/a/painted_plaster_wall
https://polyhaven.com/a/plywood
Markings are illustrative demonstration markings, not product certification.
''',encoding='utf-8')
print(OUT)
