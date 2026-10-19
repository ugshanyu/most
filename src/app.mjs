import {questions,colors} from './questions.mjs';
import {votesFor,nextUnanswered,winners} from './model.mjs';
const root=document.querySelector('main');
const strings={en:{records:'Records',continue:'Continue playing',home:'Home',noRecords:'No games yet',more:'Load more',loading:'Loading…',invite:'Play with friends',ready:'Ready',unready:'Not ready',start:'Let’s go',next:'Next question',replay:'Play again',waiting:'Waiting for friends…',hostWait:'Waiting for the host…',votes:'voted',skip:'Continue without absent players',offline:'Reconnecting…',error:'Couldn’t connect. Tap Retry.',retry:'Retry',you:'You',stamp:'MY PICK',finish:'The group has spoken 👀',large:'This group is too large. Invite a smaller group to play.',local:'Open Most in Usions to invite friends.',chat:'Chat',send:'Send',phrases:['Really? 👀','Definitely you 😂','Explain yourself','I knew it','No way','That’s fair 🤝'],absent:'Away',late:'You can vote on the next question',empty:'No votes'},mn:{records:'Түүх',continue:'Үргэлжлүүлэн тоглох',home:'Нүүр',noRecords:'Тоглосон тоглоом алга',more:'Цааш үзэх',loading:'Уншиж байна…',invite:'Найзуудтайгаа тоглох',ready:'Бэлэн',unready:'Бэлэн биш',start:'Эхэлцгээе',next:'Дараагийн асуулт',replay:'Дахин тоглох',waiting:'Найзуудаа хүлээж байна…',hostWait:'Эхлүүлэхийг хүлээж байна…',votes:'санал өгсөн',skip:'Байхгүй тоглогчгүйгээр үргэлжлүүлэх',offline:'Дахин холбогдож байна…',error:'Холбогдож чадсангүй. Дахин оролдоорой.',retry:'Дахин оролдох',you:'Чи',stamp:'МИНИЙ СОНГОЛТ',finish:'Найзууд ингэж бодож байна 👀',large:'Бүлэг хэт том байна. Цөөн хүнтэй бүлгээр тоглоорой.',local:'Найзуудаа урихын тулд Usions-д нээгээрэй.',chat:'Чат',send:'Илгээх',phrases:['Нээрээ юу? 👀','Яг чи 😂','Тайлбарлаарай','Мэдэж байсан','Үгүй байлгүй','Зөв өө 🤝'],absent:'Түр гарсан',late:'Дараагийн асуултаас санал өгнө',empty:'Санал алга'}};
let sdk,me='',lang='en',room='',people=[],rows=[],round=0,loaded=false,online=true,busy=false,error='',chatOpen=false,loading=false,lastRefresh=0;
let view='play',recordList=[],nextOffset=null,recordsLoading=false,review=false;
const away=new Map(),chatTimes=new Map();let lastChat=0;
const t=k=>strings[lang][k],state=()=>({round,phase:round===questions.length?'done':'question',candidates:people,votes:votesFor(rows,questions[round]?.id),history:questions.map(q=>({questionId:q.id,votes:votesFor(rows,q.id)}))});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=id=>people.find(p=>p.id===id)||state().candidates.find(p=>p.id===id)||{id,name:'Player'};
const active=()=>people.filter(p=>p.joined&&p.connected).map(p=>p.id).slice(0,16);
function avatar(p,small=false){const url=typeof p.avatar==='string'&&/^https:\/\//.test(p.avatar)?p.avatar:'';return `<span class="avatar ${small?'small':''}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${esc(p.name?.slice(0,1)||'?')}${url?`<img src="${esc(url)}" alt="" draggable="false" referrerpolicy="no-referrer">`:''}</span>`;}
function button(label,action,disabled=false,cls='primary'){return `<button class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;}
function voteAvatars(votes,candidate){return Object.entries(votes).filter(([,pick])=>pick===candidate).map(([id])=>avatar(person(id),true)).join('');}
function resultRows(votes){
 const total=Object.keys(votes).length;if(!total)return `<p>${t('empty')}</p>`;
 const counts={};for(const id of Object.values(votes))counts[id]=(counts[id]||0)+1;
 return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([id,count])=>{
  const percent=Math.round(count/total*100),p=person(id);
  return `<div class="vote-result">${avatar(p)}<div class="vote-content"><div class="vote-heading"><strong title="${esc(p.name)}">${esc(p.name)}</strong><span>${percent}%</span></div><div class="vote-line"><div class="vote-track" role="meter" aria-label="${esc(p.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${count/total*100}%"></span></div><div class="voters" aria-label="${t('votes')}">${voteAvatars(votes,id)}</div></div></div></div>`;
 }).join('');
}
function render(){
 const s=state(),locked=Object.hasOwn(s.votes,me);
 document.documentElement.lang=lang;document.body.style.setProperty('--bg',colors[s.round%colors.length]);root.className=view==='records'?'records-page':!room?'entry':'';
 let html='';
 if(view==='records'){
  html=`<h1>📖 ${t('records')}</h1>${button(t('home'),'home',false,'secondary')}<div class="results">${recordList.map(r=>`<button class="record-link result" data-record="${esc(r.id)}"><span class="people">${r.participants.map(p=>avatar(p,true)).join('')}</span><strong>${esc(r.participants.map(p=>p.id===me?t('you'):p.name||'Player').join(', '))}</strong><time>${r.createdAt?esc(new Date(r.createdAt).toLocaleString(lang,{dateStyle:'medium',timeStyle:'short'})):''}</time></button>`).join('')}${!recordList.length?`<p class="status">${t(recordsLoading?'loading':'noRecords')}</p>`:''}</div>${nextOffset!==null?button(t('more'),'more',recordsLoading,'secondary'):''}`;
 }else
 if(room&&!loaded){html=`<h1>Most 👀</h1>`;}
 else if(!room){html=`<h1>Most 👀</h1>${button(t('invite'),'invite',busy)}${button('📖 '+t('records'),'records',busy,'secondary')}`;}
 else if(s.phase==='done'||review){
  html=`<h1>${t('records')}</h1>${button(t('continue'),'continue',busy)}${button('📖 '+t('records'),'records',busy,'secondary')}<div class="results">${s.history.map(row=>{const q=questions.find(q=>q.id===row.questionId);return `<article class="result"><h2>${q.emoji} ${esc(q[lang])}</h2>${resultRows(row.votes)}</article>`;}).join('')}</div>`;
 }else{
  const q=questions[s.round];
  html=`<div class="top"><button class="records-icon" data-action="review" aria-label="${t('records')}">📖</button><span>${s.round+1} / 15</span></div><h1><span class="emoji">${q.emoji}</span>${esc(q[lang])}</h1><div class="grid">${s.candidates.map(p=>`<button class="person ${s.votes[me]===p.id?'selected':''}" data-choice="${esc(p.id)}" ${locked||busy||!online?'disabled':''}>${s.votes[me]===p.id?`<span class="stamp">✓ ${t('stamp')}</span>`:''}${avatar(p)}<strong class="name">${esc(p.name)}</strong><span class="voters">${voteAvatars(s.votes,p.id)}</span></button>`).join('')}</div><div class="footer"><p class="progress" aria-live="polite">${Object.keys(s.votes).length} ${t('votes')}</p>${locked?button(t('next'),'next',busy):''}</div>`;
 }
 html+=`<p class="status" role="status">${esc(!online?t('offline'):error)}</p>${error?button(t('retry'),'retry',busy,'secondary'):''}`;
 if(room&&view!=='records'&&!review)html+=`<button class="chat-toggle" data-action="chat" aria-label="${t('chat')}">💬</button>${chatOpen?`<div class="chat-panel"><div class="phrases">${t('phrases').map((v,i)=>button(v,'phrase-'+i,false,'secondary')).join('')}</div><form><input maxlength="80" aria-label="${t('chat')}"><button class="secondary">${t('send')}</button></form></div>`:''}`;
 root.innerHTML=html;
}
async function api(path='',body,global=false){
 const target=room;
 for(let attempt=0;attempt<5;attempt++){
  const token=sdk.user.getToken();
  if(!token&&attempt<4){await new Promise(r=>setTimeout(r,500));continue;}
  const response=await fetch(String(sdk.config.apiUrl).replace(/\/$/,'')+(global?'/games/most'+path:'/games/rooms/'+encodeURIComponent(target)+'/most'+path),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
  if(response.status===401&&attempt<4){await new Promise(r=>setTimeout(r,500));continue;}
  if(!response.ok)throw Error('HTTP '+response.status);
  const value=await response.json();if(!global&&room!==target)throw Error('Room changed');return value;
 }
}
async function showRecords(more=false){
 view='records';recordsLoading=true;error='';if(!more){recordList=[];nextOffset=null;}render();
 try{const d=await api('/records?offset='+(more?nextOffset:0),undefined,true);recordList=more?[...recordList,...d.records]:d.records;nextOffset=d.nextOffset;}
 catch{error=t('error');}finally{recordsLoading=false;render();}
}
async function openRecord(id){
 room=id;review=true;loaded=false;view='play';people=[];rows=[];render();await refresh();
}
async function refresh(){
 if(!room||loading)return;loading=true;
 try{const d=await api();people=d.participants;rows=d.votes;if(!loaded){round=nextUnanswered(rows,me);loaded=true;}lastRefresh=Date.now();error='';}
 catch{error=t('error');}finally{loading=false;render();}
}
async function enter(id){view='play';review=false;if(room!==id){people=[];rows=[];loaded=false;round=0;room=id;}await sdk.game.connect();await sdk.game.join(room);await refresh();}
function wire(){
 sdk.game.onRoomAssigned(d=>{if(room!==d.roomId){people=[];rows=[];loaded=false;round=0;room=d.roomId;}void refresh();});
 sdk.game.onJoined(()=>{online=true;void refresh();});
 sdk.game.onPlayerJoined(()=>void refresh());
 sdk.game.onPlayerLeft(()=>void refresh());
 sdk.game.onConnectionState(s=>{online=s==='connected'||s==='reconnected';if(online)void refresh();render();});
 sdk.game.onRealtime(d=>{if(!review&&view!=='records'&&d.action_type==='quick_chat'&&people.some(p=>p.id===d.player_id))bubble(d.player_id,d.action_data?.phrase);});
 sdk.game.onError(()=>{error=t('error');render();});
}
let bubbleTimer;
function bubble(id,text){if(typeof text!=='string'||text.length>80||Date.now()-(chatTimes.get(id)||0)<700)return;chatTimes.set(id,Date.now());document.querySelector('.bubble')?.remove();const el=document.createElement('div');el.className='bubble';el.textContent=person(id).name+': '+text;document.body.append(el);clearTimeout(bubbleTimer);bubbleTimer=setTimeout(()=>el.remove(),3000);}
function sendChat(text){if(!text.trim()||text.length>80||Date.now()-lastChat<700)return;lastChat=Date.now();sdk.game.realtime('quick_chat',{phrase:text.trim()});bubble(me,text.trim());chatOpen=false;render();}
root.addEventListener('error',e=>{if(e.target.tagName==='IMG')e.target.remove();},true);
root.addEventListener('submit',e=>{e.preventDefault();sendChat(e.target.querySelector('input').value);});
root.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b||b.disabled||busy)return;busy=true;
 try{
  const a=b.dataset.action;
  if(b.dataset.record)await openRecord(b.dataset.record);
  else if(a==='records'||a==='more'){if(!sdk)error=t('local');else await showRecords(a==='more');}
  else if(a==='home'){room='';view='play';review=false;}
  else if(a==='review'){review=true;await refresh();}
  else if(a==='continue'){round=nextUnanswered(rows,me);if(round===questions.length)round=0;await enter(room);}
  else if(b.dataset.choice){await api('/vote',{question:questions[round].id,candidate:b.dataset.choice});await refresh();}
  else if(a==='invite'){if(!sdk)error=t('local');else{const r=await sdk.game.invite({maxPlayers:16});if(r.success){await enter(r.roomId);await api('/invitees',{invited:r.invited||[]});await refresh();}}}
  else if(a==='replay')round=0;
  else if(a==='next')round=Math.min(questions.length,round+1);
  else if(a==='retry'){if(view==='records')await showRecords();else await refresh();}
  else if(a==='chat')chatOpen=!chatOpen;
  else if(a?.startsWith('phrase-'))sendChat(t('phrases')[Number(a.slice(7))]);
 }catch(e){error=t(e.message==='GROUP_TOO_LARGE'?'large':'error');}finally{busy=false;render();}
});
let pulse=Date.now();setInterval(()=>{if(room&&view!=='records'){if(Date.now()-lastRefresh>=1800)void refresh();else render();}pulse=Date.now();},2000);
function boot(c){me=String(c.userId||'');lang=String(sdk?.getLanguage()||navigator.language).startsWith('mn')?'mn':'en';if(sdk){wire();if(sdk.getLaunchParams().mode==='multiplayer')void enter(c.roomId).catch(()=>{error=t('error');render();});}render();}
if(window.Usion){sdk=window.Usion;sdk.init(boot);}else boot({});
