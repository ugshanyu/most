import {readFile,mkdir} from 'node:fs/promises';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const html=await readFile(new URL('../public/index.html',import.meta.url));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const errors=[];const rows=[];const people=['a','b','c'].map(id=>({id,name:id}));
await context.route('**/sdk/**',route=>route.fulfill({contentType:'text/javascript',body:`window.Usion={config:{apiUrl:'https://test.invalid'},user:{getToken:()=>new URLSearchParams(location.search).get('player')},getLanguage:()=> 'en',getLaunchParams:()=>({mode:'multiplayer'}),init:cb=>cb({userId:new URLSearchParams(location.search).get('player'),roomId:'r'}),game:{connect:async()=>{},join:async()=>{},onRoomAssigned:()=>{},onJoined:()=>{},onPlayerJoined:()=>{},onPlayerLeft:()=>{},onConnectionState:()=>{},onRealtime:()=>{},onError:()=>{}}};`}));
await context.route('https://test.invalid/**',async route=>{const req=route.request();if(req.method()==='POST'){const d=req.postDataJSON(),voter=req.headers().authorization.split(' ')[1];if(!rows.some(v=>v.voter===voter&&v.question===d.question))rows.push({...d,voter});}await route.fulfill({json:{participants:people,votes:rows}});});
try{
 const a=await context.newPage();a.on('pageerror',e=>errors.push(e.message));await a.goto(`http://127.0.0.1:${server.address().port}/?player=a`);
 const before=await a.locator('[data-choice="b"]').boundingBox();
 for(let i=0;i<15;i++){await a.locator('[data-choice="b"]').click();await a.locator('.stamp').waitFor();assert.equal(await a.locator('.stamp').count(),1);if(i===0){const after=await a.locator('[data-choice="b"]').boundingBox();assert.equal(before.height,after.height);}await a.getByRole('button',{name:'Next question',exact:true}).click();}
 await a.locator('.results').waitFor();assert.equal(rows.length,15);
 await a.reload();await a.locator('.results').waitFor();
 // Nobody else was online during A's entire game. B joins later at question 1.
 const b=await context.newPage();b.on('pageerror',e=>errors.push(e.message));await b.goto(`http://127.0.0.1:${server.address().port}/?player=b`);
 await b.locator('[data-choice="a"]').click();await b.getByRole('button',{name:'Next question',exact:true}).click();
 await b.reload();await b.getByText('2 / 15',{exact:true}).waitFor();
 await a.waitForTimeout(5500);assert.equal(await a.locator('article').first().locator('summary').textContent(),'2 voted');
 assert.equal(rows.length,16);assert.deepEqual(errors,[]);
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});await b.screenshot({path:new URL('../artifacts/most-async.png',import.meta.url).pathname});
 console.log('PASS: independent completion, late join, persistent progress, updated results, one stamp, fixed card height.');
}finally{await browser.close();server.close();}
