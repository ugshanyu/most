import {soloKey,cleanSoloName,readSoloAnswers,nextSoloQuestion,soloAnswer} from './solo.mjs';
import {questions,legacyQuestions,colors} from './questions.mjs';
import {votesFor,nextUnanswered,winners} from './model.mjs';
const root=document.querySelector('main');
const strings={en:{intro:'Play solo or vote with your group. Create public or private packs; show voters or just percentages. Revisit results in Records.',voterVisibility:'Group results',showVoters:'Show voters',hideVoters:'Hide voters',voterHint:'Hide who picked whom. Show percentages only. Fixed once created.',hiddenResults:'Voters hidden · percentages only',finishFirst:'Finish this pack to see percentages.',solo:'Play solo',back:'← Go back',answerName:'Enter a name',nameHint:'Who comes to mind?',soloResults:'Your answers',saveError:'Couldn’t save your answer. Try Next again.',nameError:'Enter a name (1–60 characters).',soloLoadError:'Couldn’t load your solo answers. Try again.',packs:'Question packs',create:'Create a pack',packName:'Pack name',visibility:'Who can see this pack?',private:'Private',public:'Public',question:'Question',addQuestion:'Add question',savePack:'Save pack',remove:'Remove',packError:'Use a name and 1–30 different questions (8–180 characters each).',questionCount:'questions',records:'Records',continue:'Continue playing',home:'Home',noRecords:'No games yet',more:'Load more',loading:'Loading…',invite:'Play with friends',ready:'Ready',unready:'Not ready',start:'Let’s go',next:'Next question',replay:'Play again',waiting:'Waiting for friends…',hostWait:'Waiting for the host…',votes:'voted',skip:'Continue without absent players',offline:'Reconnecting…',error:'Couldn’t connect. Tap Retry.',retry:'Retry',you:'You',stamp:'MY PICK',finish:'The group has spoken 👀',large:'This group is too large. Invite a smaller group to play.',local:'Open Манай Хамгийн Хамгийн in Usions to invite friends.',chat:'Chat',send:'Send',phrases:['Really? 👀','Definitely you 😂','Explain yourself','I knew it','No way','That’s fair 🤝'],absent:'Away',late:'You can vote on the next question',empty:'No votes'},mn:{intro:'Ганцаараа эсвэл найзуудтайгаа тогло. Нээлттэй, хаалттай багц үүсгэж, хэн санал өгснийг эсвэл зөвхөн хувийг харуул. Үр дүнгээ Түүхээс үзээрэй.',voterVisibility:'Хамт тоглох үеийн үр дүн',showVoters:'Санал өгсөн хүнийг харуулах',hideVoters:'Санал өгсөн хүнийг нуух',voterHint:'Хэн хэнийг сонгосныг нууж, зөвхөн хувийг харуулна. Үүсгэсний дараа өөрчлөхгүй.',hiddenResults:'Санал өгсөн хүн нууц · зөвхөн хувь',finishFirst:'Хувийг харахын тулд багцын бүх асуултад хариулаарай.',solo:'Ганцаараа тоглох',back:'← Буцах',answerName:'Нэр оруулах',nameHint:'Хэн санаанд орж байна?',soloResults:'Таны хариултууд',saveError:'Хариултыг хадгалж чадсангүй. Дараагийн асуулт товчийг дахин дарна уу.',nameError:'Нэрээ оруулна уу (1–60 тэмдэгт).',soloLoadError:'Хариултуудыг ачаалж чадсангүй. Дахин оролдоно уу.',packs:'Асуултын багцууд',create:'Багц үүсгэх',packName:'Багцын нэр',visibility:'Багцыг хэн харах вэ?',private:'Хаалттай',public:'Нийтэд нээлттэй',question:'Асуулт',addQuestion:'Асуулт нэмэх',savePack:'Багц хадгалах',remove:'Хасах',packError:'Нэр болон 8–180 тэмдэгттэй, давхардаагүй 1–30 асуулт оруулна уу.',questionCount:'асуулт',records:'Түүх',continue:'Үргэлжлүүлэн тоглох',home:'Нүүр',noRecords:'Тоглосон тоглоом алга',more:'Цааш үзэх',loading:'Уншиж байна…',invite:'Найзуудтайгаа тоглох',ready:'Бэлэн',unready:'Бэлэн биш',start:'Эхэлцгээе',next:'Дараагийн асуулт',replay:'Дахин тоглох',waiting:'Найзуудаа хүлээж байна…',hostWait:'Эхлүүлэхийг хүлээж байна…',votes:'санал өгсөн',skip:'Байхгүй тоглогчгүйгээр үргэлжлүүлэх',offline:'Дахин холбогдож байна…',error:'Холбогдож чадсангүй. Дахин оролдоорой.',retry:'Дахин оролдох',you:'Чи',stamp:'МИНИЙ СОНГОЛТ',finish:'Найзууд ингэж бодож байна 👀',large:'Бүлэг хэт том байна. Цөөн хүнтэй бүлгээр тоглоорой.',local:'Найзуудаа урихын тулд Usions-д нээгээрэй.',chat:'Чат',send:'Илгээх',phrases:['Нээрээ юу? 👀','Яг чи 😂','Тайлбарлаарай','Мэдэж байсан','Үгүй байлгүй','Зөв өө 🤝'],absent:'Түр гарсан',late:'Дараагийн асуултаас санал өгнө',empty:'Санал алга'}};
let sdk,me='',lang='en',room='',people=[],rows=[],round=0,loaded=false,online=true,busy=false,error='',pendingPick='',loading=false,lastRefresh=0;
let activePack={id:'friends-v1',title:'Who is',titleMn:'Хэн бэ',questions},questionSet=questions,catalog=[],packsLoading=false,recordsOnly=false,draft=null;
let resultCounts={};
let soloAnswers={},soloName='',soloLoading=false,soloEpoch=0;
const isSoloView=()=>view==='solo'||view==='solo-results';
const canPlaySolo=()=>!room&&sdk?.getLaunchParams?.().mode!=='multiplayer';
let view='packs',recordList=[],nextOffset=null,recordsLoading=false,review=false;
const t=k=>strings[lang][k],state=()=>({round,phase:round===questionSet.length?'done':'question',candidates:people,votes:votesFor(rows,questionSet[round]?.id),history:questionSet.filter(q=>activePack.id!=='legacy'||Object.keys(votesFor(rows,q.id)).length).map(q=>({questionId:q.id,votes:votesFor(rows,q.id)}))});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=id=>people.find(p=>p.id===id)||state().candidates.find(p=>p.id===id)||{id,name:'Player'};
const active=()=>people.filter(p=>p.joined&&p.connected).map(p=>p.id).slice(0,16);
function avatar(p,small=false){const url=typeof p.avatar==='string'&&/^https:\/\//.test(p.avatar)?p.avatar:'';return `<span class="avatar ${small?'small':''}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${esc(p.name?.slice(0,1)||'?')}${url?`<img src="${esc(url)}" alt="" draggable="false" referrerpolicy="no-referrer">`:''}</span>`;}
function button(label,action,disabled=false,cls='primary'){return `<button type="button" class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;}
function voteAvatars(votes,candidate){return Object.entries(votes).filter(([,pick])=>pick===candidate).map(([id])=>avatar(person(id),true)).join('');}
function resultRows(votes,aggregates){
 const hidden=activePack.voter_visibility==='hide';
 const counts=hidden?{...(aggregates||{})}:{};if(!hidden)for(const id of Object.values(votes))counts[id]=(counts[id]||0)+1;
 const total=Object.values(counts).reduce((a,b)=>a+b,0);if(!total)return `<p>${t('empty')}</p>`;
 return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([id,count])=>{
  const percent=Math.round(count/total*100),p=person(id);
  return `<div class="vote-result">${avatar(p)}<div class="vote-content"><div class="vote-heading"><strong title="${esc(p.name)}">${esc(p.name)}</strong><span>${percent}%</span></div><div class="vote-line"><div class="vote-track" role="meter" aria-label="${esc(p.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${count/total*100}%"></span></div>${hidden?'':`<div class="voters" aria-label="${t('votes')}">${voteAvatars(votes,id)}</div>`}</div></div></div>`;
 }).join('');
}
let lastRendered='',renderPending=false;
const pressedPointers=new Set();
root.addEventListener('pointerdown',e=>pressedPointers.add(e.pointerId));
function releasePointer(e){
 pressedPointers.delete(e.pointerId);
 // Let the browser dispatch click before applying a queued live update.
 setTimeout(()=>{if(!pressedPointers.size&&renderPending)render();},0);
}
window.addEventListener('pointerup',releasePointer);
window.addEventListener('pointercancel',releasePointer);
window.addEventListener('blur',()=>{pressedPointers.clear();if(renderPending)render();});
function render(){
 if(pressedPointers.size){renderPending=true;return;}renderPending=false;
 const s=state(),locked=Object.hasOwn(s.votes,me),pick=s.votes[me]??pendingPick;
 root.dataset.view=view;root.style.setProperty('--progress',`${Math.min(100,(round+1)/questionSet.length*100)}%`);document.documentElement.lang=lang;document.body.style.setProperty('--bg',colors[s.round%colors.length]);root.className=['records','packs','create'].includes(view)?'records-page':view==='selected'?'entry':'';
 let html='';
 if(view==='packs'){
  const shown=recordsOnly?catalog.filter(p=>p.answererCount>0):catalog.filter(p=>!p.legacy);
  html=`<h1>${recordsOnly?'📖 '+t('records'):t('packs')}</h1>${!recordsOnly?`<p class="pack-intro">${t('intro')}</p>`:''}<div class="pack-list">${shown.map(p=>`<button class="pack-card" data-pack="${esc(p.id)}"><span class="pack-emblem" aria-hidden="true">${esc(p.title?.match(/\p{Extended_Pictographic}/gu)?.at(-1)||p.questions?.[0]?.emoji||'📜')}</span><strong>${esc(packTitle(p))}</strong><span class="pack-count">${p.questions?.length||legacyQuestions.length} ${t('questionCount')}</span><span class="pack-arrow" aria-hidden="true">›</span><div class="pack-answerers">${(p.answerers||[]).map(p=>avatar(p,true)).join('')}${p.answererCount>16?`<span>+${p.answererCount-16}</span>`:''}</div></button>`).join('')}${packsLoading?`<p class="status">${t('loading')}</p>`:!shown.length?`<p class="status">${t('noRecords')}</p>`:''}</div><div class="actions">${!recordsOnly?button('＋ '+t('create'),'create',busy,'secondary'):''}${button('📖 '+t('records'),'records',busy,'secondary')}</div>`;
 }else if(view==='create'){
  html=`<h1>${t('create')}</h1><form class="pack-form" data-pack-form><fieldset class="pack-visibility"><legend>${t('visibility')}</legend>${['private','public'].map(v=>`<label class="visibility-option"><input type="radio" name="visibility" value="${v}" ${draft.visibility===v?'checked':''} required><span>${v==='private'?'🔒':'🌍'} ${t(v)}</span></label>`).join('')}</fieldset><fieldset class="pack-visibility"><legend>${t('voterVisibility')}</legend>${['show','hide'].map(v=>`<label class="visibility-option"><input type="radio" name="voter_visibility" value="${v}" ${draft.voter_visibility===v?'checked':''} required><span>${t(v==='show'?'showVoters':'hideVoters')}</span></label>`).join('')}<p class="setting-hint">${t('voterHint')}</p></fieldset><label>${t('packName')}<input name="title" maxlength="60" minlength="2" required value="${esc(draft.title)}"></label>${draft.questions.map((q,i)=>`<label>${t('question')} ${i+1}<textarea name="q${i}" minlength="8" maxlength="180" required rows="2">${esc(q)}</textarea>${draft.questions.length>1?`<button type="button" class="remove-question" data-remove="${i}" aria-label="${t('remove')} ${i+1}">×</button>`:''}</label>`).join('')}<div class="actions">${button('＋ '+t('addQuestion'),'add-question',draft.questions.length>=30,'secondary')}<button class="primary" type="submit" ${busy?'disabled':''}>${t('savePack')}</button>${button(t('packs'),'packs',busy,'secondary')}</div></form>`;
 }else if(view==='selected'){
  html=`<h1>${esc(packTitle(activePack))}</h1><div class="actions">${canPlaySolo()?button(t('solo'),'solo',busy):''}${button(t('invite'),'invite',busy,canPlaySolo()?'secondary':'primary')}${button(t('back'),'packs',busy,'secondary')}</div>`;
 }else if(view==='solo'){
  const q=questionSet[round];
  html=`<div class="top"><span>${t('solo')}</span><span>${round+1} / ${questionSet.length}</span></div><h1><span class="emoji">${q.emoji}</span>${esc(q[lang])}</h1><form class="pack-form solo-form" data-solo-form><label for="solo-name">${t('answerName')}<input id="solo-name" name="soloName" maxlength="60" required autocomplete="off" placeholder="${t('nameHint')}" value="${esc(soloName)}" ${busy?'disabled':''}></label><div class="actions"><button class="primary" type="submit" ${busy||!cleanSoloName(soloName)?'disabled':''}>${t('next')}</button></div></form>`;
 }else if(view==='solo-results'){
  html=`<h1>${t('soloResults')}</h1><div class="actions">${button(t('back'),'solo-back',busy,'secondary')}${button(t('replay'),'solo-replay',busy,'secondary')}</div><div class="results">${questionSet.map(q=>`<article class="result"><h2>${q.emoji} ${esc(q[lang])}</h2><p class="solo-answer">${esc(soloAnswers[q.id]||'')}</p></article>`).join('')}</div>`;
 }else if(view==='records'){
  html=`<h1>📖 ${t('records')}</h1>${button(t('packs'),'packs',false,'secondary')}<div class="results">${recordList.map(r=>`<button class="record-link result" data-record="${esc(r.id)}"><span class="people">${r.participants.map(p=>avatar(p,true)).join('')}</span><strong>${esc(r.participants.map(p=>p.id===me?t('you'):p.name||'Player').join(', '))}</strong><time>${r.createdAt?esc(new Date(r.createdAt).toLocaleString(lang,{dateStyle:'medium',timeStyle:'short'})):''}</time></button>`).join('')}${!recordList.length?`<p class="status">${t(recordsLoading?'loading':'noRecords')}</p>`:''}</div>${nextOffset!==null?button(t('more'),'more',recordsLoading,'secondary'):''}`;
 }else
 if(room&&!loaded){html=`<h1>Манай Хамгийн Хамгийн</h1>`;}
 else if(!room){html=`<h1>Манай Хамгийн Хамгийн</h1><div class="actions">${button(t('invite'),'invite',busy)}${button('📖 '+t('records'),'records',busy,'secondary')}</div>`;}
 else if(s.phase==='done'||review){
  html=`<h1>${t('records')}</h1><div class="actions">${activePack.id!=='legacy'?button(t('continue'),'continue',busy):''}${button(t('packs'),'packs',busy,'secondary')}</div>${activePack.voter_visibility==='hide'?`<p class="pack-intro">${t(round<questionSet.length?'finishFirst':'hiddenResults')}</p>`:''}<div class="results">${s.history.map(row=>{const q=questionSet.find(q=>q.id===row.questionId);return `<article class="result"><h2>${q.emoji} ${esc(q[lang])}</h2>${resultRows(row.votes,resultCounts[row.questionId])}</article>`;}).join('')}</div>`;
 }else{
  const q=questionSet[s.round];
  html=`<div class="top"><span>${activePack.voter_visibility==='hide'?t('hideVoters'):t('showVoters')}</span><span>${s.round+1} / ${questionSet.length}</span></div><h1><span class="emoji">${q.emoji}</span>${esc(q[lang])}</h1><div class="grid">${s.candidates.filter(p=>p.id!==me).map(p=>`<button class="person ${pick===p.id?'selected':''}" data-choice="${esc(p.id)}" ${p.id===me||locked||busy||!online?'disabled':''}>${pick===p.id?`<span class="stamp">✓ ${t('stamp')}</span>`:''}${avatar(p)}<strong class="name">${esc(p.name)}</strong><span class="voters" aria-hidden="true"></span></button>`).join('')}</div><div class="footer"><p class="progress" aria-hidden="true">&nbsp;</p>${pick?button(t('next'),'next',busy||!online):''}</div>`;
 }
 html+=`<p class="status" role="status">${esc(isSoloView()?error:!online?t('offline'):error)}</p>${error?button(t('retry'),'retry',busy,'secondary'):''}`;
 if(html!==lastRendered){
  const focused=document.activeElement?.id==='solo-name',selection=focused?[document.activeElement.selectionStart,document.activeElement.selectionEnd]:null;
  root.innerHTML=html;lastRendered=html;
  if(focused&&!busy){const input=root.querySelector('#solo-name');input?.focus({preventScroll:true});if(input&&selection)input.setSelectionRange(...selection);}
 }
}
function soloStorage(){
 if(sdk){if(!sdk.storage?.get||!sdk.storage?.set)throw Error('STORAGE_UNAVAILABLE');return sdk.storage;}
 return {get:async key=>JSON.parse(localStorage.getItem(key)||'null'),set:async(key,value)=>localStorage.setItem(key,JSON.stringify(value))};
}
async function openSolo(){
 if(!canPlaySolo())return;
 const epoch=++soloEpoch,packId=activePack.id,user=me;soloLoading=true;error='';
 try{
  const saved=await soloStorage().get(soloKey(packId));
  if(epoch!==soloEpoch||activePack.id!==packId||me!==user||!canPlaySolo())return;
  soloAnswers=readSoloAnswers(saved,packId,questionSet);round=nextSoloQuestion(soloAnswers,questionSet);soloName='';
  view=round===questionSet.length?'solo-results':'solo';
 }catch{if(epoch===soloEpoch)error=t('soloLoadError');}finally{soloLoading=false;}
}
async function submitSolo(){
 if(view!=='solo'||busy||!canPlaySolo())return;
 const epoch=soloEpoch,packId=activePack.id,user=me,q=questionSet[round];
 let saved;try{saved=soloAnswer(soloAnswers,packId,q.id,soloName);}catch{error=t('nameError');render();return;}
 busy=true;error='';render();
 try{
  await soloStorage().set(soloKey(packId),saved);
  if(epoch!==soloEpoch||activePack.id!==packId||me!==user||!canPlaySolo())return;
  soloAnswers=saved.answers;soloName='';round=nextSoloQuestion(soloAnswers,questionSet);
  if(round===questionSet.length)view='solo-results';window.scrollTo(0,0);
 }catch{if(epoch===soloEpoch)error=t('saveError');}finally{busy=false;render();}
}
async function replaySolo(){
 if(!canPlaySolo())return;
 const epoch=soloEpoch,packId=activePack.id,user=me;
 await soloStorage().set(soloKey(packId),{version:1,packId,answers:{}});
 if(epoch!==soloEpoch||activePack.id!==packId||me!==user||!canPlaySolo())return;
 soloAnswers={};soloName='';round=0;view='solo';error='';
}
async function api(path='',body,global=false){
 const target=room,targetPack=activePack.id;
 for(let attempt=0;attempt<5;attempt++){
  const token=sdk.user.getToken();
  if(!token&&attempt<4){await new Promise(r=>setTimeout(r,500));continue;}
  const response=await fetch(String(sdk.config.apiUrl).replace(/\/$/,'')+(global?'/games/most'+path:'/games/rooms/'+encodeURIComponent(target)+'/most'+path),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401&&attempt<4){await new Promise(r=>setTimeout(r,500));continue;}
  if(!response.ok)throw Error('HTTP '+response.status);
  const value=await response.json();if(!global&&(room!==target||activePack.id!==targetPack))throw Error('Room changed');return value;
 }
}
const packTitle=p=>p.id==='friends-v1'?(lang==='mn'?'Хэн бэ':'Who is'):lang==='mn'?(p.titleMn||p.title):p.title;
async function showPacks(background=false){
 if(background&&(view!=='packs'||packsLoading||busy))return;
 const targetRoom=room;
 if(!background){view='packs';error='';}packsLoading=true;if(!background)render();
 if(!sdk){catalog=[activePack];packsLoading=false;render();return;}
 try{const d=await api('/packs'+(room?'?room_id='+encodeURIComponent(room):''),undefined,true);if(view==='packs'&&room===targetRoom)catalog=d.packs;}
 catch{if(!background)error=t('error');}finally{packsLoading=false;if(view==='packs'&&room===targetRoom)render();}
}
async function openPack(id){
 ++soloEpoch;
 const p=catalog.find(p=>p.id===id)||activePack;if(p.id!==id)return;
 pendingPick='';activePack=p;questionSet=p.questions||(p.id==='legacy'?legacyQuestions:questions);round=0;loaded=false;rows=[];resultCounts={};
 if(!room){view='selected';return;}
 if(!recordsOnly&&id!=='legacy')await api('/pack',{pack_id:id});
 review=recordsOnly||id==='legacy';view='play';await refresh();
}
async function showRecords(more=false){
 view='records';recordsLoading=true;error='';if(!more){recordList=[];nextOffset=null;}render();
 try{const d=await api('/records?offset='+(more?nextOffset:0),undefined,true);recordList=more?[...recordList,...d.records]:d.records;nextOffset=d.nextOffset;}
 catch{error=t('error');}finally{recordsLoading=false;render();}
}
async function openRecord(id){room=id;review=true;recordsOnly=true;await showPacks();}
async function refresh(){
 if(!room||loading||view!=='play')return;loading=true;
 try{const d=await api('?pack_id='+encodeURIComponent(activePack.id));people=d.participants;rows=d.votes;resultCounts=d.results||{};if(d.pack)activePack={...activePack,...d.pack};if(!loaded){round=nextUnanswered(rows,me,questionSet);loaded=true;}lastRefresh=Date.now();error='';}
 catch{error=t('error');}finally{loading=false;render();}
}
async function enter(id,start=false){
 ++soloEpoch;
 if(room!==id){people=[];rows=[];pendingPick='';loaded=false;round=0;room=id;}
 await sdk.game.connect();await sdk.game.join(room);
 if(start)await openPack(activePack.id);else{
  await showPacks();
  try{const pending=JSON.parse(sessionStorage.getItem('most-pending-pack')||'null');if(pending?.user===me&&catalog.some(p=>p.id===pending.id)){sessionStorage.removeItem('most-pending-pack');await openPack(pending.id);}}catch{}
 }
}
function wire(){
 sdk.game.onRoomAssigned(d=>{if(room!==d.roomId){const wasSolo=isSoloView()||soloLoading;++soloEpoch;people=[];rows=[];pendingPick='';loaded=false;round=0;room=d.roomId;if(wasSolo){view='packs';void enter(d.roomId).catch(()=>{error=t('error');render();});}}});
 sdk.game.onJoined(()=>{online=true;void refresh();});
 sdk.game.onPlayerJoined(()=>void refresh());
 sdk.game.onPlayerLeft(()=>void refresh());
 sdk.game.onConnectionState(s=>{online=s==='connected'||s==='reconnected';if(online)void refresh();render();});
 sdk.game.onError(()=>{error=t('error');render();});
}
root.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove();},true);
root.addEventListener('input',e=>{if(view==='solo'&&e.target.name==='soloName'){soloName=e.target.value;const next=root.querySelector('[data-solo-form] [type=submit]');if(next)next.disabled=busy||!cleanSoloName(soloName);return;}if(view==='create'&&draft){if(e.target.name==='voter_visibility')draft.voter_visibility=e.target.value;else if(e.target.name==='visibility')draft.visibility=e.target.value;else if(e.target.name==='title')draft.title=e.target.value;else if(e.target.name?.startsWith('q'))draft.questions[Number(e.target.name.slice(1))]=e.target.value;}});
root.addEventListener('submit',async e=>{e.preventDefault();if(e.target.matches('[data-solo-form]')){await submitSolo();return;}if(!e.target.matches('[data-pack-form]'))return;if(busy)return;busy=true;error='';
 try{const p=await api('/packs',{request_id:draft.id,title:draft.title,questions:draft.questions,visibility:draft.visibility,voter_visibility:draft.voter_visibility},true);if(room)await api('/pack',{pack_id:p.id});activePack=p;draft=null;recordsOnly=false;await showPacks();}catch{error=t('packError');}finally{busy=false;render();}
});
root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled||busy||(b.closest('form')&&b.type==='submit'&&!b.dataset.action))return;busy=true;let scrollToTop=false;
 try{
  const a=b.dataset.action;
  if(b.dataset.pack){await openPack(b.dataset.pack);}
  else if(a==='packs'){++soloEpoch;recordsOnly=false;await showPacks();}
  else if(a==='solo'){await openSolo();}
  else if(a==='solo-back'){++soloEpoch;error='';view='selected';scrollToTop=true;}
  else if(a==='solo-replay'){await replaySolo();scrollToTop=true;}
  else if(a==='create'){if(!sdk){error=t('local');}else{draft={id:crypto.randomUUID(),title:'',questions:[''],visibility:'private',voter_visibility:'show'};view='create';}}
  else if(a==='add-question'){if(draft.questions.length<30)draft.questions.push('');}
  else if(b.dataset.remove!==undefined)draft.questions.splice(Number(b.dataset.remove),1);
  else if(b.dataset.record)await openRecord(b.dataset.record);
  else if(a==='records'||a==='more'){if(!sdk)error=t('local');else await showRecords(a==='more');}
  else if(a==='home'){room='';review=false;recordsOnly=false;await showPacks();}
  else if(a==='review'){review=true;await refresh();}
  else if(a==='continue'){recordsOnly=false;round=nextUnanswered(rows,me,questionSet);if(round===questionSet.length)round=0;review=false;await enter(room,true);}
  else if(b.dataset.choice&&b.dataset.choice!==me){pendingPick=b.dataset.choice;error='';}
  else if(a==='invite'){if(!sdk)error=t('local');else{sessionStorage.setItem('most-pending-pack',JSON.stringify({id:activePack.id,user:me}));const r=await sdk.game.invite({maxPlayers:16});sessionStorage.removeItem('most-pending-pack');if(r.success){await enter(r.roomId,true);await api('/invitees',{invited:r.invited||[]});await refresh();}}}
  else if(a==='replay')round=0;
  else if(a==='next'){
   const question=questionSet[round]?.id;if(!question)return;
   if(!Object.hasOwn(votesFor(rows,question),me)){
    if(!pendingPick)return;
    const candidate=pendingPick;render();
    await api('/vote',{question,candidate,pack_id:activePack.id});
    const saved=await api('?pack_id='+encodeURIComponent(activePack.id));rows=saved.votes;people=saved.participants;resultCounts=saved.results||{};if(saved.pack)activePack={...activePack,...saved.pack};
   }
   pendingPick='';error='';round=Math.min(questionSet.length,round+1);scrollToTop=true;
  }
  else if(a==='retry'){if(view==='solo'){busy=false;await submitSolo();}else if(view==='solo-results')await replaySolo();else if(view==='selected'&&error===t('soloLoadError'))await openSolo();else if(view==='records')await showRecords();else if(view==='packs')await showPacks();else await refresh();}
 }catch(e){error=t(e.message==='GROUP_TOO_LARGE'?'large':'error');}finally{busy=false;render();if(scrollToTop)window.scrollTo(0,0);}
});
let pulse=Date.now();setInterval(()=>{if(room&&view==='play'){if(Date.now()-lastRefresh>=1800)void refresh();else render();}if(sdk&&view==='packs')void showPacks(true);pulse=Date.now();},2000);
function boot(c){++soloEpoch;me=String(c.userId||'');lang=String(sdk?.getLanguage()||navigator.language).startsWith('mn')?'mn':'en';if(sdk){wire();if(sdk.getLaunchParams().mode==='multiplayer')void enter(c.roomId).catch(()=>{error=t('error');render();});else void showPacks();}else{catalog=[activePack];}render();}
if(window.Usion){sdk=window.Usion;sdk.init(boot);}else boot({});
