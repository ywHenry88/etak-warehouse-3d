from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
OUT=Path('C:/Users/Henry/Desktop/Etak/Blender_Prototype_20261010/textures')
font='C:/Windows/Fonts/arialbd.ttf'
def label(name,text,size,pt):
    im=Image.new('RGBA',size,(255,255,255,0));d=ImageDraw.Draw(im)
    f=ImageFont.truetype(font,pt);box=d.textbbox((0,0),text,font=f);w,h=box[2]-box[0],box[3]-box[1]
    d.text(((size[0]-w)/2,(size[1]-h)/2-box[1]),text,font=f,fill=(229,232,226,255))
    im.save(OUT/f'{name}.png')
label('nichiyu','NICHIYU',(1024,192),156)
im=Image.new('RGBA',(512,256),(255,255,255,0));d=ImageDraw.Draw(im)
d.text((30,22),'SICOS',font=ImageFont.truetype(font,55),fill='#e9e9df')
d.text((30,93),'AC 15',font=ImageFont.truetype(font,105),fill='#e9e9df')
im.save(OUT/'sicos.png')
im=Image.new('RGBA',(512,128),(255,255,255,0));d=ImageDraw.Draw(im)
d.text((16,12),'NICHIYU',font=ImageFont.truetype(font,65),fill='#e9e9df');d.text((340,40),'electric',font=ImageFont.truetype(font,29),fill='#e9e9df')
im.save(OUT/'nichiyu_electric.png')
print('Prepared NICHIYU markings from the supplied visual reference')
