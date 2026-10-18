import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const css=await read('src/style.css');
const js=(await Promise.all(['questions','model','app'].map(f=>read('src/'+f+'.mjs')))).map(s=>s.replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');
await mkdir(new URL('../public',import.meta.url),{recursive:true});
await writeFile(new URL('../public/index.html',import.meta.url),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#edb7cb"><title>Most · Usions</title><script src="https://usions.com/usion-sdk.js"></script><style>${css}</style></head><body><main aria-label="Most"></main><script type="module">${js}</script></body></html>`);
console.log('Built Most');
