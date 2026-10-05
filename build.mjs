import { build } from 'esbuild';
import fs from 'node:fs';
const result=await build({entryPoints:['src/main.js'],bundle:true,minify:true,format:'iife',write:false,legalComments:'none'});
const image=fs.readFileSync('assets/floorplan.png').toString('base64');
const html=fs.readFileSync('index.template.html','utf8').replace('__PLAN_IMAGE__','data:image/png;base64,'+image).replace('__BUNDLE__',()=>result.outputFiles[0].text.replaceAll('</script','<\\/script')).replace(/[ \t]+$/gm,'');
fs.writeFileSync('index.html',html);
fs.writeFileSync('ETAK_Warehouse_3D.html',html);
console.log('Built standalone HTML:',(Buffer.byteLength(html)/1024/1024).toFixed(2),'MB');
