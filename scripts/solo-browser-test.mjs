import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const html=await readFile(new URL('../public/index.html',import.meta.url));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
const questions=[{id:'q1',emoji:'😂',en:'Who laughs first?',mn:'Хэн түрүүлж инээх вэ?'},{id:'q2',emoji:'🍟',en:'Who eats your fries?',mn:'Хэн чиний шарсан төмсийг идэх вэ?'}];
const packs=[{id:'test-solo',title:'Манай ангийнхан 🏫',questions},{id:'test-other',title:'Other pack',questions}];
let writes=0,gameWrites=0;const errors=[];
await context.route('**/sdk/**',route=>route.fulfill({contentType:'text/javascript',body:`
const params=new URLSearchParams(location.search);window.callbacks={};
window.Usion={config:{apiUrl:'https://test.invalid'},user:{getToken:()=>params.get('user')||'owner'},getLanguage:()=>params.get('lang')||'en',getLaunchParams:()=>({mode:params.get('mode')||'single'}),init:cb=>cb({userId:params.get('user')||'owner',roomId:'r'}),
storage:{get:async key=>{if(window.failRead)throw Error('read failed');return JSON.parse(localStorage.getItem((params.get('user')||'owner')+key)||'null')},set:async(key,value)=>{if(window.failSave)throw Error('save failed');await fetch('https://test.invalid/save',{method:'POST'});localStorage.setItem((params.get('user')||'owner')+key,JSON.stringify(value))}},
game:{connect:async()=>{},join:async()=>{},invite:async()=>({success:true,roomId:'r'}),onRoomAssigned:cb=>window.callbacks.assigned=cb,onJoined:()=>{},onPlayerJoined:()=>{},onPlayerLeft:()=>{},onConnectionState:cb=>window.callbacks.connection=cb,onError:()=>{}}};`}));
await context.route('https://test.invalid/**',route=>{
 const path=new URL(route.request().url()).pathname;
 if(path==='/save'){writes++;return route.fulfill({json:{ok:true}});}
 if(route.request().method()==='POST')gameWrites++;
 return route.fulfill({json:path.endsWith('/packs')?{packs}:path.endsWith('/records')?{records:[],nextOffset:null}:{participants:[{id:'owner',name:'Owner'},{id:'friend',name:'Friend'}],votes:[]}});
});
const open=async query=>{const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${server.address().port}/?${query}`);await p.locator('[data-pack="test-solo"]').waitFor();return p;};
try{
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});
 const p=await open('');await p.locator('[data-pack="test-solo"]').click();
 await p.getByRole('button',{name:'Play solo',exact:true}).waitFor();
 assert.equal(await p.getByRole('button',{name:'Question packs',exact:true}).count(),0);
 await p.screenshot({path:new URL('../artifacts/solo-selected.png',import.meta.url).pathname});
 await p.getByRole('button',{name:'← Go back',exact:true}).click();await p.locator('[data-pack="test-solo"]').click();
 await p.evaluate(()=>window.failRead=true);await p.getByRole('button',{name:'Play solo',exact:true}).click();await p.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(await p.locator('#solo-name').count(),0);
 await p.evaluate(()=>window.failRead=false);await p.getByRole('button',{name:'Retry',exact:true}).click();
 const input=p.getByLabel('Enter a name');await input.waitFor();
 assert.equal(await p.getByRole('button',{name:'Next question',exact:true}).isDisabled(),true);
 await input.fill('  Бат  ');await p.evaluate(()=>window.callbacks.connection('disconnected'));
 assert.equal(await input.inputValue(),'  Бат  ');assert.equal(await input.evaluate(n=>n===document.activeElement),true);
 await p.evaluate(()=>window.failSave=true);await p.getByRole('button',{name:'Next question',exact:true}).click();await p.getByRole('button',{name:'Retry',exact:true}).waitFor();
 assert.equal(await input.inputValue(),'  Бат  ');assert.equal(writes,0);await p.getByText('1 / 2',{exact:true}).waitFor();
 await p.evaluate(()=>window.failSave=false);await p.getByRole('button',{name:'Retry',exact:true}).click();await p.getByText('2 / 2',{exact:true}).waitFor();assert.equal(writes,1);assert.equal(await input.inputValue(),'');
 await p.reload();await p.locator('[data-pack="test-solo"]').click();await p.getByRole('button',{name:'Play solo',exact:true}).click();await p.getByText('2 / 2',{exact:true}).waitFor();
 await input.fill('<img src=x onerror=alert(1)>');await p.getByRole('button',{name:'Next question',exact:true}).click();await p.getByRole('heading',{name:'Your answers'}).waitFor();
 assert.deepEqual(await p.locator('.solo-answer').allTextContents(),['Бат','<img src=x onerror=alert(1)>']);assert.equal(await p.locator('.solo-answer img').count(),0);assert.equal(gameWrites,0);
 await p.reload();await p.locator('[data-pack="test-solo"]').click();await p.getByRole('button',{name:'Play solo',exact:true}).click();await p.getByRole('heading',{name:'Your answers'}).waitFor();
 await p.getByRole('button',{name:'Play again',exact:true}).click();await p.getByText('1 / 2',{exact:true}).waitFor();
 await input.fill('Бат-Эрдэнэ');await p.screenshot({path:new URL('../artifacts/solo-answer-mobile.png',import.meta.url).pathname});
 await p.setViewportSize({width:320,height:640});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await p.evaluate(()=>window.callbacks.assigned({roomId:'r'}));await p.locator('[data-pack="test-solo"]').waitFor();await p.locator('[data-pack="test-solo"]').click();await p.locator('[data-choice="friend"]').waitFor();assert.equal(await p.locator('#solo-name').count(),0);assert.equal(await p.getByRole('button',{name:'Play solo',exact:true}).count(),0);
 const mn=await open('user=other&lang=mn');await mn.locator('[data-pack="test-solo"]').click();await mn.getByRole('button',{name:'Ганцаараа тоглох',exact:true}).click();await mn.getByText('1 / 2',{exact:true}).waitFor();await mn.getByLabel('Нэр оруулах').fill('Сараа');await mn.screenshot({path:new URL('../artifacts/solo-answer-mn.png',import.meta.url).pathname});
 await mn.getByRole('button',{name:'← Буцах',exact:true}).click();await mn.getByRole('button',{name:'← Буцах',exact:true}).click();await mn.locator('[data-pack="test-other"]').click();await mn.getByRole('button',{name:'Ганцаараа тоглох',exact:true}).click();await mn.getByText('1 / 2',{exact:true}).waitFor();assert.equal(await mn.getByLabel('Нэр оруулах').inputValue(),'');
 const mp=await open('mode=multiplayer');await mp.locator('[data-pack="test-solo"]').click();await mp.locator('[data-choice="friend"]').waitFor();assert.equal(await mp.locator('#solo-name,[data-action="solo"]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS solo: typed names, save rejection/retry, resume, replay, per-pack/user isolation, escaping, EN/MN, mobile layout, room promotion, multiplayer restriction.');
}finally{await browser.close();server.close();}
