// CC0 photographic sources. Run this, then pack-ultra-textures.py to rebuild assets.
import fs from 'node:fs/promises';
const sources={concrete:'concrete_floor',wall:'painted_plaster_wall',wood:'plywood'};
await fs.mkdir('assets/ultra/source',{recursive:true});
const manifest={license:'CC0-1.0',licenseURL:'https://polyhaven.com/license',sources:{}};
for(const [kind,id] of Object.entries(sources)){
 const response=await fetch(`https://api.polyhaven.com/files/${id}`);if(!response.ok)throw Error(`${id}: ${response.status}`);
 const files=await response.json();const entry={asset:id,page:`https://polyhaven.com/a/${id}`,files:{}};
 for(const [name,key] of [['map','Diffuse'],['normalMap','nor_gl'],['roughnessMap','Rough']]){
  const file=files[key]?.['1k']?.jpg;if(!file)throw Error(`${id}: missing ${key}`);
  const r=await fetch(file.url);if(!r.ok)throw Error(`${file.url}: ${r.status}`);
  await fs.writeFile(`assets/ultra/source/${kind}-${name}.jpg`,Buffer.from(await r.arrayBuffer()));entry.files[name]=file.url;
 }
 manifest.sources[kind]=entry;console.log(`Downloaded ${kind}: ${id}`);
}
await fs.writeFile('assets/ultra/sources.json',JSON.stringify(manifest,null,2)+'\n');
