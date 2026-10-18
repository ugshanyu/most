import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const relay=await readFile(new URL('../test/relay.js',import.meta.url),'utf8');
const reliability=(await readFile(new URL('../test/vendor/game-reliability.mjs',import.meta.url),'utf8')).replace('export function','function');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
await context.route('https://usions.com/usion-sdk.js',r=>r.fulfill({contentType:'text/javascript',body:relay+'\n'+reliability+'\napplyGameReliability(window.Usion.game, window.Usion);'}));
const pages=new Map(),joined=new Set(),connected=new Set(),actions=[],errors=[];let checkpoint;
const people=[{id:'a',name:'Alex'},{id:'b',name:'Sam'},{id:'c',name:'Jamie'},{id:'d',name:'River'}];
const dispatch=async(type,data)=>{await Promise.all([...pages.entries()].filter(([id])=>connected.has(id)).map(([,p])=>p.evaluate(({type,data})=>window.testEmit(type,data),{type,data})));};
const snapshot=()=>({host_id:'a',player_ids:[...joined],game_state:checkpoint,actions:actions.filter(a=>a.sequence>(checkpoint?.seq||0)),sequence:actions.length});
await context.exposeBinding('relay',async({page},kind,id,data)=>{
 if(kind==='join'){pages.set(id,page);joined.add(id);connected.add(id);return snapshot();}
 if(kind==='directory')return {roomId:'test-room',hostId:'a',source:'group',participants:people.map(p=>({...p,joined:joined.has(p.id),connected:connected.has(p.id)}))};
 if(kind==='sync')return snapshot();
 if(kind==='checkpoint'){if(!checkpoint||data.seq>=checkpoint.seq)checkpoint=data;return {success:true};}
 if(kind==='action'){const a={player_id:id,action_type:data.type,action_data:data.data,sequence:actions.length+1};actions.push(a);await dispatch('action',a);return {success:true,sequence:a.sequence};}
 if(kind==='realtime'){await dispatch('realtime',{player_id:id,action_type:data.type,action_data:data.data});return {success:true};}
});
try{
 for(const id of ['a','b','c']){const p=await context.newPage();await p.clock.install();p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://127.0.0.1:${server.address().port}/?player=${id}`);}
 await dispatch('playerJoined',{player_id:'c'});
 const [a,b,c]=['a','b','c'].map(id=>pages.get(id));
 for(const p of [a,b,c])await p.getByRole('button',{name:'Ready',exact:true}).click();
 await a.getByRole('button',{name:'Let’s go',exact:true}).click();
 for(const p of [a,b,c])await p.locator('[data-choice="a"]').waitFor();
 const before=await a.locator('[data-choice="a"]').boundingBox();
 await a.locator('[data-choice="d"]').click();
 await b.locator('[data-choice="d"] .small').waitFor();
 assert.equal(await a.locator('.stamp').count(),1);
 await b.locator('[data-choice="a"]').click();await c.locator('[data-choice="a"]').click();
 await a.getByRole('button',{name:'Next question',exact:true}).waitFor();
 const after=await a.locator('[data-choice="a"]').boundingBox();assert.equal(before.height,after.height);
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});await a.screenshot({path:new URL('../artifacts/most-votes.png',import.meta.url).pathname});
 await c.reload();await c.locator('.stamp').waitFor();assert.equal(await c.locator('.small').count(),3);
 for(let i=1;i<15;i++){await a.getByRole('button',{name:'Next question',exact:true}).click();for(const p of [a,b,c])await p.locator('[data-choice="b"]').click();}
 await a.getByRole('button',{name:'Next question',exact:true}).click();
 for(const p of [a,b,c]){await p.getByRole('heading',{name:'The group has spoken 👀'}).waitFor();assert.equal(await p.locator('article.result').count(),15);}
 await a.screenshot({path:new URL('../artifacts/most-results.png',import.meta.url).pathname});
 await a.getByRole('button',{name:'Play again',exact:true}).click();
 for(const p of [a,b,c])await p.getByRole('button',{name:'Ready',exact:true}).waitFor();
 for(const p of [a,b,c])await p.getByRole('button',{name:'Ready',exact:true}).click();
 await a.getByRole('button',{name:'Let’s go',exact:true}).click();
 const d=await context.newPage();await d.goto(`http://127.0.0.1:${server.address().port}/?player=d`);
 await d.getByText('You can vote on the next question').waitFor();
 await dispatch('playerJoined',{player_id:'d'});
 await b.locator('[data-choice="d"]').click();await c.locator('[data-choice="c"]').click();
 connected.delete('a');await dispatch('playerLeft',{player_id:'a'});
 await Promise.all([b,c].map(p=>p.clock.fastForward(25000)));
 await b.getByRole('button',{name:'Continue without absent players',exact:true}).click();
 await b.getByRole('button',{name:'Next question',exact:true}).click();
 await d.locator('[data-choice="a"]:not([disabled])').waitFor();
 assert.equal(checkpoint.state.host,'b');assert.equal(checkpoint.state.history[0].votes.a,undefined);
 assert.deepEqual(checkpoint.state.history[0].skipped,['a']);
 assert.deepEqual(errors,[]);console.log('PASS: 3 clients, immediate reveal, one stamp, fixed card size, reload recovery, 15 rounds, results, replay, late join, host transfer and absence grace.');
}finally{await browser.close();server.close();}
