import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const css=await read('src/style.css');
const js=(await Promise.all(['questions','model','solo','app'].map(f=>read('src/'+f+'.mjs')))).map(s=>s.replace(/^import .*;\n/gm,'').replaceAll('export ','')).join('\n');
await mkdir(new URL('../public',import.meta.url),{recursive:true});
await writeFile(new URL('../public/index.html',import.meta.url),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="theme-color" content="#263e30"><title>Манай Хамгийн Хамгийн · Usions</title><link rel="icon" href="/manai-khamgiin-20261029-icon.webp"><script src="https://usions.com/sdk/v2/2.33.0-dev.3/usion-sdk.js"></script><style>${css}</style></head><body><main aria-label="Манай Хамгийн Хамгийн"></main><script type="module">${js}</script></body></html>`);
console.log('Built Most');
