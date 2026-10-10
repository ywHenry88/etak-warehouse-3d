"""Author correctly encoded, restrained PBR actor maps. No AI imagery required."""
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

out = Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010/textures/realism')
out.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(261010)
size = 512
y, x = np.mgrid[:size, :size]
grain = rng.random((size, size))-.5
low = np.array(Image.fromarray(np.uint8(rng.random((32,32))*255)).resize((size,size), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(8)))/255-.5
# Explicit sRGB values avoid baking a linear material factor into encoded pixels.
surfaces = {
    'Insulated navy fabric': ('fabric', (57,75,91)),
    'Safety orange fabric': ('fabric', (214,103,39)),
    'Powder coated steel': ('paint', (49,55,60)),
    'Moulded rubber': ('rubber', (37,40,42)),
    'Seat upholstery': ('seat', (44,47,49)),
    'Vehicle enamel': ('paint', (183,37,40)),
}
for name, (kind, colour) in surfaces.items():
    if kind == 'fabric':
        weave = np.sin(x*np.pi/2)*np.sin(y*np.pi/2)
        h = .012*weave+.014*grain
        variation = 1+low*.10+grain*.035+weave*.015
        rough = .87+low*.07+grain*.025
    elif kind == 'paint':
        h = grain*.005+low*.01
        variation = 1+low*.032+grain*.008
        rough = .43+low*.10+grain*.015
    elif kind == 'seat':
        h = grain*.035+low*.022
        variation = 1+low*.10+grain*.06
        rough = .73+low*.1+grain*.025
    else:
        h = grain*.021+low*.02
        variation = 1+low*.11+grain*.07
        rough = .90+low*.08+grain*.02
    albedo = np.uint8(np.clip(np.array(colour)[None,None,:]*variation[:,:,None],0,255))
    dx=(np.roll(h,-1,1)-np.roll(h,1,1))*2
    dy=(np.roll(h,-1,0)-np.roll(h,1,0))*2
    norm=np.sqrt(dx*dx+dy*dy+1)
    normal=np.uint8(np.stack((.5-dx/norm*.5,.5+dy/norm*.5,.5+.5/norm),axis=-1)*255)
    for key,data in [('map',albedo),('normalMap',normal),('roughnessMap',np.uint8(np.clip(rough,0,1)*255))]:
        Image.fromarray(data).save(out/(name+'_'+key+'.png'))
print(out)
