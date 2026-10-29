import {readFile,mkdir} from 'node:fs/promises';import {createServer} from 'node:http';import assert from 'node:assert/strict';
import {questions} from '../src/questions.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const html=await readFile(new URL('../public/index.html',import.meta.url));
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});const errors=[],rows=[],people=['a','b','c','d','e','f','g','h','i'].map(id=>({id,name:id}));
let failNextVote=false;
const shared=new Set();
const packs=[{id:'friends-v1',title:'The friend test 👀',questions}];
await context.route('**/sdk/**',route=>route.fulfill({contentType:'text/javascript',body:`window.Usion={config:{apiUrl:'https://test.invalid'},user:{getToken:()=>new URLSearchParams(location.search).get('player')},getLanguage:()=>new URLSearchParams(location.search).get('lang')||'en',getLaunchParams:()=>({mode:new URLSearchParams(location.search).get('mode')||'multiplayer'}),init:cb=>cb({userId:new URLSearchParams(location.search).get('player'),roomId:'r'}),game:{connect:async()=>{},join:async()=>{},invite:async()=>({success:true,roomId:'r',invited:['b']}),onRoomAssigned:()=>{},onJoined:()=>{},onPlayerJoined:()=>{},onPlayerLeft:()=>{},onConnectionState:()=>{},onRealtime:()=>{},onError:()=>{}}};`}));
await context.route('https://test.invalid/**',async route=>{
 const req=route.request(),url=new URL(req.url()),d=req.method()==='POST'?req.postDataJSON():null,voter=req.headers().authorization.split(' ')[1];let json;
 if(url.pathname==='/games/most/packs'){
  if(d){const p={id:'custom-'+d.request_id.replaceAll('-',''),title:d.title,creator_id:voter,visibility:d.visibility||'private',voter_visibility:d.voter_visibility||'show',questions:d.questions.map((text,i)=>({id:'q'+(i+1),emoji:'👀',en:text,mn:text}))};packs.push(p);json=p;}
  else json={packs:packs.filter(p=>p.id==='friends-v1'||p.creator_id===voter||p.visibility==='public'||(shared.has(p.id)&&people.some(person=>person.id===voter))).map(p=>{const ids=[...new Set(rows.filter(r=>r.pack_id===p.id).map(r=>r.voter))];return {...p,answerers:p.voter_visibility==='hide'?[]:people.filter(p=>ids.includes(p.id)),answererCount:ids.length};})};
 }else if(url.pathname.endsWith('/records'))json={records:[{id:'r',createdAt:'2026-10-19T00:00:00Z',participants:people}],nextOffset:null};
 else if(url.pathname.endsWith('/vote')){if(failNextVote){failNextVote=false;await route.fulfill({status:503,json:{error:'Retry'}});return;}if(!rows.some(v=>v.voter===voter&&v.question===d.question&&v.pack_id===d.pack_id))rows.push({...d,voter});json={success:true};}
 else if(d){if(url.pathname.endsWith('/pack'))shared.add(d.pack_id);json={success:true};}
 else {
  const pack=packs.find(p=>p.id===url.searchParams.get('pack_id')),ballots=rows.filter(r=>r.pack_id===pack?.id),own=ballots.filter(r=>r.voter===voter),results={};
  if(pack?.voter_visibility==='hide'&&pack.questions.every(q=>own.some(r=>r.question===q.id)))for(const r of ballots){results[r.question]??={};results[r.question][r.candidate]=(results[r.question][r.candidate]||0)+1;}
  json={participants:people,pack,votes:pack?.voter_visibility==='hide'?own:ballots,results};
 }
 await route.fulfill({json});
});
const open=async(id,mode='multiplayer',lang='en')=>{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/?player=${id}&mode=${mode}&lang=${lang}`);return page;};
try{
 await mkdir(new URL('../artifacts',import.meta.url),{recursive:true});
 const a=await open('a');await a.getByRole('button',{name:/Who is/}).waitFor();assert.equal(await a.getByRole('button',{name:'Home',exact:true}).count(),0);await a.locator('[data-pack="friends-v1"]').click();
 assert.equal(await a.locator('[data-choice="a"]').count(),0);
 assert.equal(await a.locator('[data-action="chat"],.chat-toggle,.chat-panel').count(),0);
 const before=await a.locator('[data-choice="b"]').boundingBox();
 await a.locator('[data-choice="c"]').click();await a.locator('[data-choice="c"] .stamp').waitFor();
 await a.waitForTimeout(2200);assert.equal(rows.length,0);
 await a.locator('[data-choice="b"]').click();await a.locator('[data-choice="b"] .stamp').waitFor();
 assert.equal(await a.locator('[data-choice="c"] .stamp').count(),0);assert.equal(rows.length,0);
 failNextVote=true;await a.getByRole('button',{name:'Next question',exact:true}).click();
 await a.getByRole('button',{name:'Retry',exact:true}).waitFor();assert.equal(rows.length,0);
 await a.getByText('1 / 14',{exact:true}).waitFor();
 for(let i=0;i<14;i++){await a.locator('[data-choice="b"]').click();await a.locator('.stamp').waitFor();assert.equal(await a.locator('.stamp').count(),1);if(i===0){const after=await a.locator('[data-choice="b"]').boundingBox();assert.equal(before.height,after.height);await a.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));assert.ok(await a.evaluate(()=>window.scrollY)>0);}await a.getByRole('button',{name:'Next question',exact:true}).click();if(i<13){await a.getByText(`${i+2} / 14`,{exact:true}).waitFor();assert.equal(await a.evaluate(()=>window.scrollY),0);}}
 await a.locator('.results').waitFor();assert.equal(rows.length,14);
 await a.reload();await a.locator('[data-pack="friends-v1"] .avatar').first().waitFor();await a.locator('[data-pack="friends-v1"]').click();await a.locator('.results').waitFor();
 const b=await open('b');await b.locator('[data-pack="friends-v1"]').click();
 assert.equal(await b.locator('.grid .voters .avatar').count(),0);
 assert.equal(await b.locator('[data-action="review"]').count(),0);
 await b.locator('[data-choice="a"]').click();
 assert.equal(await b.locator('.grid .voters .avatar').count(),0);
 const next=b.getByRole('button',{name:'Next question',exact:true});
 await next.scrollIntoViewIfNeeded();
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
 await b.reload();await b.locator('[data-pack="friends-v1"]').waitFor();
 // Create and play a custom pack without changing any previous votes.
 await home.getByRole('button',{name:'Question packs',exact:true}).click();await home.getByRole('button',{name:'＋ Create a pack',exact:true}).click();
 await home.locator('input[name="title"]').fill('Weekend crew');await home.locator('textarea[name="q0"]').fill('Who would plan the best road trip?');
 await home.getByRole('button',{name:'＋ Add question',exact:true}).click();await home.locator('textarea[name="q1"]').fill('Who would forget their suitcase?');
 assert.equal(await home.locator('input[name="title"]').inputValue(),'Weekend crew');assert.equal(await home.locator('textarea[name="q0"]').inputValue(),'Who would plan the best road trip?');
 await home.screenshot({path:new URL('../artifacts/most-pack-create.png',import.meta.url).pathname});
 await home.getByRole('button',{name:'Save pack',exact:true}).click();await b.getByRole('button',{name:/Weekend crew/}).waitFor();await home.getByRole('button',{name:/Weekend crew/}).click();
 await home.getByText('1 / 2',{exact:true}).waitFor();await home.locator('[data-choice="c"]').click();await home.locator('.stamp').waitFor();assert.equal(rows.length,15);await home.getByRole('button',{name:'Next question',exact:true}).click();await home.getByText('2 / 2',{exact:true}).waitFor();assert.equal(rows.length,16);
 await home.reload();await home.getByRole('button',{name:/Weekend crew/}).click();await home.getByRole('button',{name:'Play with friends',exact:true}).click();await home.getByText('2 / 2',{exact:true}).waitFor();
 await home.locator('[data-choice="b"]').click();await home.getByRole('button',{name:'Next question',exact:true}).click();await home.locator('.results').waitFor();assert.equal(await home.locator('article').count(),2);
 await home.getByRole('button',{name:'Question packs',exact:true}).click();assert.equal(await home.getByRole('button',{name:/Weekend crew/}).locator('.avatar').count(),1);
 await home.getByText('Loading…',{exact:true}).waitFor({state:'hidden'});
 await home.screenshot({path:new URL('../artifacts/most-packs.png',import.meta.url).pathname});
 const outsider=await open('outsider','single');await outsider.getByRole('button',{name:/Who is/}).waitFor();
 assert.equal(await outsider.getByRole('button',{name:/Weekend crew/}).count(),0);
 await home.getByRole('button',{name:'＋ Create a pack',exact:true}).click();
 assert.equal(await home.locator('[name="visibility"][value="private"]').isChecked(),true);
 await home.locator('[name="visibility"][value="public"]').check();
 await home.locator('[name="title"]').fill('Everyone can play');
 await home.locator('[name="q0"]').fill('Who would bake the best cake?');
 await home.getByRole('button',{name:'＋ Add question',exact:true}).click();
 assert.equal(await home.locator('[name="visibility"][value="public"]').isChecked(),true);
 await home.locator('[name="q1"]').fill('Who would win a dance contest?');
 await home.screenshot({path:new URL('../artifacts/most-public-pack-create.png',import.meta.url).pathname});
 await home.getByRole('button',{name:'Save pack',exact:true}).click();
 await outsider.getByRole('button',{name:/Everyone can play/}).waitFor();
 assert.equal(packs.find(p=>p.title==='Everyone can play').visibility,'public');
 assert.equal(await outsider.getByRole('button',{name:/Weekend crew/}).count(),0);
 // Hidden mode survives form changes, completion, reload, and Records.
 await home.getByRole('button',{name:'＋ Create a pack',exact:true}).click();
 assert.equal(await home.locator('[name="voter_visibility"][value="show"]').isChecked(),true);
 await home.locator('[name="voter_visibility"][value="hide"]').check();
 await home.locator('[name="title"]').fill('Hidden picks');await home.locator('[name="q0"]').fill('Who laughs the loudest?');
 await home.getByRole('button',{name:'＋ Add question',exact:true}).click();
 assert.equal(await home.locator('[name="voter_visibility"][value="hide"]').isChecked(),true);
 await home.locator('[name="q1"]').fill('Who tells the best stories?');
 await home.screenshot({path:new URL('../artifacts/most-hidden-create.png',import.meta.url).pathname});
 await home.getByRole('button',{name:'Save pack',exact:true}).click();
 const hidden=packs.find(p=>p.title==='Hidden picks');assert.equal(hidden.voter_visibility,'hide');
 rows.push(...hidden.questions.map(q=>({pack_id:hidden.id,question:q.id,voter:'b',candidate:'a'})));
 await home.getByRole('button',{name:/Hidden picks/}).click();
 for(let i=0;i<2;i++){await home.locator('[data-choice="b"]').click();await home.getByRole('button',{name:'Next question',exact:true}).click();}
 await home.locator('.results').waitFor();
 assert.equal(await home.locator('.results .voters').count(),0);
 assert.deepEqual(await home.locator('article').first().locator('[role="meter"]').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-valuenow'))),['50','50']);
 await home.screenshot({path:new URL('../artifacts/most-hidden-results.png',import.meta.url).pathname});
 await home.reload();await home.getByRole('button',{name:'📖 Records',exact:true}).click();await home.locator('[data-record="r"]').click();
 assert.equal(await home.getByRole('button',{name:/Hidden picks/}).locator('.avatar').count(),0);
 await home.getByRole('button',{name:/Hidden picks/}).click();await home.locator('.results').waitFor();
 assert.equal(await home.locator('.results .voters').count(),0);
 assert.equal(await home.locator('article').first().locator('[role="meter"]').count(),2);
 assert.equal(rows.filter(v=>v.pack_id==='friends-v1').length,15);assert.deepEqual(errors,[]);
 const mn=await open('a','single','mn');await mn.getByRole('button',{name:'＋ Багц үүсгэх',exact:true}).click();
 await mn.setViewportSize({width:320,height:740});
 await mn.locator('[name="voter_visibility"][value="hide"]').check();
 assert.equal(await mn.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await mn.screenshot({path:new URL('../artifacts/most-hidden-create-mn.png',import.meta.url).pathname});
 console.log('PASS: 14-question pack, independent progress, percentage results, private records, answerer icons, custom creation, invite and reload, isolated votes.');
}finally{await browser.close();server.close();}
