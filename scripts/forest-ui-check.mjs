import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const html=await readFile(new URL('../public/index.html',import.meta.url));
const forest=await readFile(new URL('../public/forest-clearing-20261029.webp',import.meta.url));
const packs=await Promise.all(['manai-angiinhan-mn-v2','manai-angiin-magtaal-mn-v1','manai-ajlyn-mn-v1','manai-khovguud-mn-v1','manai-okhid-mn-v1'].map(async name=>JSON.parse(await readFile(new URL('../packs/'+name+'.json',import.meta.url)))));
const server=createServer((req,res)=>{const asset=req.url?.startsWith('/forest-clearing-');res.setHeader('Content-Type',asset?'image/webp':'text/html');res.end(asset?forest:html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();const context=await browser.newContext();const errors=[];
await context.route('**/sdk/**',r=>r.fulfill({contentType:'text/javascript',body:`window.Usion={config:{apiUrl:'https://test.invalid'},user:{getToken:()=> 'test'},getLanguage:()=> 'mn',getLaunchParams:()=>({mode:new URLSearchParams(location.search).get('mode')||'single'}),init:cb=>cb({userId:'test',roomId:'visual-test'}),storage:{get:async()=>null,set:async()=>{}},game:{connect:async()=>{},join:async()=>{},onRoomAssigned:()=>{},onJoined:()=>{},onPlayerJoined:()=>{},onPlayerLeft:()=>{},onConnectionState:()=>{},onError:()=>{}}};`}));
await context.route('https://test.invalid/**',r=>r.fulfill({json:r.request().url().includes('/most/packs')?{packs}:{participants:[{id:'test',name:'You'},{id:'a',name:'Бат-Эрдэнэ'},{id:'b',name:'Номин'},{id:'c',name:'Мөнхцэцэг'},{id:'d',name:'Тэмүүлэн'}],votes:[]}}));
const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
const fit=async()=>{
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
 assert.deepEqual(await p.locator('button').evaluateAll(ns=>ns.filter(n=>n.offsetWidth>0&&(n.getBoundingClientRect().height<44||n.scrollWidth>n.clientWidth+2)).map(n=>n.textContent)),[],'button fit');
};
try{
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});
 for(const [w,h] of [[390,844],[320,640],[1024,768],[1440,900]]){
  await p.setViewportSize({width:w,height:h});await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('[data-pack]').first().waitFor();await fit();
  await p.screenshot({path:new URL(`../artifacts/forest-packs-${w}.png`,import.meta.url).pathname,fullPage:true});
  await p.locator('[data-pack]').first().click();await p.getByRole('button',{name:'Ганцаараа тоглох',exact:true}).click();await p.locator('#solo-name').waitFor();await fit();
  await p.screenshot({path:new URL(`../artifacts/forest-question-${w}.png`,import.meta.url).pathname,fullPage:true});
 }
 for(const [w,h] of [[390,844],[1440,900]]){
  await p.setViewportSize({width:w,height:h});await p.goto('http://127.0.0.1:'+server.address().port+'/?mode=multiplayer');await p.locator('[data-pack]').first().click();await p.locator('[data-choice="b"]').click();await p.locator('.stamp').waitFor();await fit();
  await p.screenshot({path:new URL(`../artifacts/forest-voting-${w}.png`,import.meta.url).pathname,fullPage:true});
 }
 assert.deepEqual(errors,[]);console.log('PASS forest UI: actual Mongolian packs/questions, 320/390/1024/1440 widths, 44px controls, no horizontal overflow or page errors.');
}finally{await browser.close();server.close();}
