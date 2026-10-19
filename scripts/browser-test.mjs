import {readFile,mkdir} from 'node:fs/promises';import {createServer} from 'node:http';import assert from 'node:assert/strict';
import {questions} from '../src/questions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const html=await readFile(new URL('../public/index.html',import.meta.url));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const errors=[],rows=[],people=['a','b','c'].map(id=>({id,name:id}));
const packs=[{id:'friends-v1',title:'The friend test 👀',questions}];
await context.route('**/sdk/**',route=>route.fulfill({contentType:'text/javascript',body:`window.Usion={config:{apiUrl:'https://test.invalid'},user:{getToken:()=>new URLSearchParams(location.search).get('player')},getLanguage:()=> 'en',getLaunchParams:()=>({mode:new URLSearchParams(location.search).get('mode')||'multiplayer'}),init:cb=>cb({userId:new URLSearchParams(location.search).get('player'),roomId:'r'}),game:{connect:async()=>{},join:async()=>{},invite:async()=>({success:true,roomId:'r',invited:['b']}),onRoomAssigned:()=>{},onJoined:()=>{},onPlayerJoined:()=>{},onPlayerLeft:()=>{},onConnectionState:()=>{},onRealtime:()=>{},onError:()=>{}}};`}));
await context.route('https://test.invalid/**',async route=>{
 const req=route.request(),url=new URL(req.url()),d=req.method()==='POST'?req.postDataJSON():null,voter=req.headers().authorization.split(' ')[1];let json;
 if(url.pathname==='/games/most/packs'){
  if(d){const p={id:'custom-'+d.request_id.replaceAll('-',''),title:d.title,questions:d.questions.map((text,i)=>({id:'q'+(i+1),emoji:'👀',en:text,mn:text}))};packs.push(p);json=p;}
  else json={packs:packs.map(p=>{const ids=[...new Set(rows.filter(r=>r.pack_id===p.id).map(r=>r.voter))];return {...p,answerers:people.filter(p=>ids.includes(p.id)),answererCount:ids.length};})};
 }else if(url.pathname.endsWith('/records'))json={records:[{id:'r',createdAt:'2026-10-19T00:00:00Z',participants:people}],nextOffset:null};
 else if(url.pathname.endsWith('/vote')){if(!rows.some(v=>v.voter===voter&&v.question===d.question&&v.pack_id===d.pack_id))rows.push({...d,voter});json={success:true};}
 else if(d)json={success:true};
 else json={participants:people,votes:rows.filter(r=>r.pack_id===url.searchParams.get('pack_id'))};
 await route.fulfill({json});
});
const open=async(id,mode='multiplayer')=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/?player=${id}&mode=${mode}`);return page;};
try{
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});
 const a=await open('a');await a.locator('[data-pack="friends-v1"]').click();
 assert.equal(await a.locator('[data-choice="a"]').isDisabled(),true);
 const before=await a.locator('[data-choice="b"]').boundingBox();
 for(let i=0;i<14;i++){await a.locator('[data-choice="b"]').click();await a.locator('.stamp').waitFor();assert.equal(await a.locator('.stamp').count(),1);if(i===0){const after=await a.locator('[data-choice="b"]').boundingBox();assert.equal(before.height,after.height);}await a.getByRole('button',{name:'Next question',exact:true}).click();}
 await a.locator('.results').waitFor();assert.equal(rows.length,14);
 await a.reload();await a.locator('[data-pack="friends-v1"] .avatar').first().waitFor();await a.locator('[data-pack="friends-v1"]').click();await a.locator('.results').waitFor();
 const b=await open('b');await b.locator('[data-pack="friends-v1"]').click();
 assert.equal(await b.locator('.grid .voters .avatar').count(),0);
 assert.equal(await b.locator('[data-action="review"]').count(),0);
 await b.locator('[data-choice="a"]').click();
 assert.equal(await b.locator('.grid .voters .avatar').count(),0);
 const next=b.getByRole('button',{name:'Next question',exact:true});
 const nextNode=await next.elementHandle(),box=await next.boundingBox();
 await b.mouse.move(box.x+box.width/2,box.y+box.height/2);await b.mouse.down();
 rows.push({pack_id:'friends-v1',question:questions[0].id,voter:'c',candidate:'a'});
 await b.waitForTimeout(2300); // A live-vote poll must not replace a button during a tap.
 assert.equal(await nextNode.evaluate(node=>node.isConnected),true);
 await b.mouse.up();await b.getByText('2 / 14',{exact:true}).waitFor();
 rows.splice(rows.findIndex(v=>v.voter==='c'),1);
 await b.reload();await b.locator('[data-pack="friends-v1"]').click();await b.getByText('2 / 14',{exact:true}).waitFor();
 await a.waitForTimeout(2500);assert.deepEqual(await a.locator('article').first().locator('[role="meter"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-valuenow'))),['50','50']);
 const home=await open('a','single');await home.locator('[data-pack="friends-v1"] .avatar').first().waitFor();assert.equal(await home.locator('[data-pack="friends-v1"] .avatar').count(),2);
 await home.getByRole('button',{name:'📖 Records',exact:true}).click();await home.locator('[data-record="r"]').click();await home.locator('[data-pack="friends-v1"]').click();await home.locator('.vote-result').first().waitFor();assert.equal(await home.locator('article').count(),14);
 assert.equal(await home.locator('article').first().locator('.vote-result .voters .avatar').count(),2);
 await home.screenshot({path:new URL('../artifacts/most-records.png',import.meta.url).pathname});
 // Create and play a custom pack without changing any previous votes.
 await home.getByRole('button',{name:'Question packs',exact:true}).click();await home.getByRole('button',{name:'＋ Create a pack',exact:true}).click();
 await home.locator('input[name="title"]').fill('Weekend crew');await home.locator('textarea[name="q0"]').fill('Who would plan the best road trip?');
 await home.getByRole('button',{name:'＋ Add question',exact:true}).click();await home.locator('textarea[name="q1"]').fill('Who would forget their suitcase?');
 assert.equal(await home.locator('input[name="title"]').inputValue(),'Weekend crew');assert.equal(await home.locator('textarea[name="q0"]').inputValue(),'Who would plan the best road trip?');
 await home.screenshot({path:new URL('../artifacts/most-pack-create.png',import.meta.url).pathname});
 await home.getByRole('button',{name:'Save pack',exact:true}).click();await home.getByRole('button',{name:/Weekend crew/}).click();
 await home.getByText('1 / 2',{exact:true}).waitFor();await home.locator('[data-choice="c"]').click();await home.locator('.stamp').waitFor();assert.equal(rows.length,16);
 await home.reload();await home.getByRole('button',{name:/Weekend crew/}).click();await home.getByRole('button',{name:'Play with friends',exact:true}).click();await home.getByText('2 / 2',{exact:true}).waitFor();
 await home.locator('[data-choice="b"]').click();await home.getByRole('button',{name:'Next question',exact:true}).click();await home.locator('.results').waitFor();assert.equal(await home.locator('article').count(),2);
 await home.getByRole('button',{name:'Question packs',exact:true}).click();assert.equal(await home.getByRole('button',{name:/Weekend crew/}).locator('.avatar').count(),1);
 await home.getByText('Loading…',{exact:true}).waitFor({state:'hidden'});
 await home.screenshot({path:new URL('../artifacts/most-packs.png',import.meta.url).pathname});
 assert.equal(rows.filter(v=>v.pack_id==='friends-v1').length,15);assert.deepEqual(errors,[]);
 console.log('PASS: 14-question pack, independent progress, percentage results, private records, answerer icons, custom creation, invite and reload, isolated votes.');
}finally{await browser.close();server.close();}
