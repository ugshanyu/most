import {questions,colors} from './questions.mjs';
import {blank,complete,reduce,winners} from './model.mjs';
const root=document.querySelector('main');
const strings={en:{invite:'Play with friends',ready:'Ready',unready:'Not ready',start:'Let’s go',next:'Next question',replay:'Play again',waiting:'Waiting for friends…',hostWait:'Waiting for the host…',votes:'voted',skip:'Continue without absent players',offline:'Reconnecting…',error:'Couldn’t connect. Tap Retry.',retry:'Retry',you:'You',stamp:'MY PICK',finish:'The group has spoken 👀',large:'This group is too large. Invite a smaller group to play.',local:'Open Most in Usions to invite friends.',chat:'Chat',send:'Send',phrases:['Really? 👀','Definitely you 😂','Explain yourself','I knew it','No way','That’s fair 🤝'],absent:'Away',late:'You can vote on the next question',empty:'No votes'},mn:{invite:'Найзуудтайгаа тоглох',ready:'Бэлэн',unready:'Бэлэн биш',start:'Эхэлцгээе',next:'Дараагийн асуулт',replay:'Дахин тоглох',waiting:'Найзуудаа хүлээж байна…',hostWait:'Эхлүүлэхийг хүлээж байна…',votes:'санал өгсөн',skip:'Байхгүй тоглогчгүйгээр үргэлжлүүлэх',offline:'Дахин холбогдож байна…',error:'Холбогдож чадсангүй. Дахин оролдоорой.',retry:'Дахин оролдох',you:'Чи',stamp:'МИНИЙ СОНГОЛТ',finish:'Найзууд ингэж бодож байна 👀',large:'Бүлэг хэт том байна. Цөөн хүнтэй бүлгээр тоглоорой.',local:'Найзуудаа урихын тулд Usions-д нээгээрэй.',chat:'Чат',send:'Илгээх',phrases:['Нээрээ юу? 👀','Яг чи 😂','Тайлбарлаарай','Мэдэж байсан','Үгүй байлгүй','Зөв өө 🤝'],absent:'Түр гарсан',late:'Дараагийн асуултаас санал өгнө',empty:'Санал алга'}};
let sdk,me='',lang='en',room='',shared,people=[],roomHost='',online=true,busy=false,error='',chatOpen=false,loading=false,lastRefresh=0;
const away=new Map(),chatTimes=new Map();let lastChat=0;
const t=k=>strings[lang][k],state=()=>shared?.get()||blank();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const person=id=>people.find(p=>p.id===id)||state().candidates.find(p=>p.id===id)||{id,name:'Player'};
const active=()=>people.filter(p=>p.joined&&p.connected).map(p=>p.id).slice(0,16);
function avatar(p,small=false){const url=typeof p.avatar==='string'&&/^https:\/\//.test(p.avatar)?p.avatar:'';return `<span class="avatar ${small?'small':''}" title="${esc(p.name)}" aria-label="${esc(p.name)}">${esc(p.name?.slice(0,1)||'?')}${url?`<img src="${esc(url)}" alt="" draggable="false" referrerpolicy="no-referrer">`:''}</span>`;}
function button(label,action,disabled=false,cls='primary'){return `<button class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;}
function voteAvatars(votes,candidate){return Object.entries(votes).filter(([,pick])=>pick===candidate).map(([id])=>avatar(person(id),true)).join('');}
function render(){
 const s=state(),players=active(),isHost=me===(s.host||roomHost),locked=Object.hasOwn(s.votes,me)||!s.voters.includes(me)||s.skipped.includes(me);
 document.documentElement.lang=lang;document.body.style.setProperty('--bg',colors[s.round%colors.length]);root.className=!room?'entry':s.phase==='lobby'?'lobby':'';
 let html='';
 if(!room){html=`<h1>Most 👀</h1>${button(t('invite'),'invite',busy)}`;}
 else if(s.phase==='lobby'){
  html=`<h1>Most 👀</h1><div class="grid">${people.filter(p=>p.joined).map(p=>`<div class="person">${avatar(p)}<strong class="name">${esc(p.id===me?t('you'):p.name)}</strong><span class="ready">${!p.connected?t('absent'):s.ready[p.id]?'✓ '+t('ready'):t('unready')}</span></div>`).join('')}</div>${button(t(s.ready[me]?'unready':'ready'),'ready',busy||!online||loading,'secondary')}${isHost?button(t('start'),'start',busy||loading||!online||players.length<2||!players.every(id=>s.ready[id])):`<p class="status">${t('hostWait')}</p>`}<p class="status">${players.length<2?t('waiting'):''}</p>${button(t('invite'),'invite',busy,'secondary')}`;
 }else if(s.phase==='done'){
  html=`<h1>${t('finish')}</h1>${isHost?button(t('replay'),'replay',busy||!online):`<p class="status">${t('hostWait')}</p>`}<div class="results">${s.history.map(row=>{const q=questions.find(q=>q.id===row.questionId);return `<article class="result"><h2>${q.emoji} ${esc(q[lang])}</h2><div class="people">${winners(row.votes).map(id=>`<div>${avatar(person(id))}<p><strong>${esc(person(id).name)}</strong></p><div class="voters">${voteAvatars(row.votes,id)}</div></div>`).join('')||t('empty')}</div><details><summary>${Object.keys(row.votes).length} ${t('votes')}</summary>${Object.entries(row.votes).map(([v,c])=>`<p>${esc(person(v).name)} → ${esc(person(c).name)}</p>`).join('')}</details></article>`;}).join('')}</div>`;
 }else{
  const q=questions[s.round];
  html=`<div class="top"><span>Most 👀</span><span>${s.round+1} / 15</span></div><h1><span class="emoji">${q.emoji}</span>${esc(q[lang])}</h1><div class="grid">${s.candidates.map(p=>`<button class="person ${s.votes[me]===p.id?'selected':''}" data-choice="${esc(p.id)}" ${locked||busy||!online?'disabled':''}>${s.votes[me]===p.id?`<span class="stamp">✓ ${t('stamp')}</span>`:''}${avatar(p)}<strong class="name">${esc(p.name)}</strong><span class="voters">${voteAvatars(s.votes,p.id)}</span></button>`).join('')}</div><div class="footer"><p class="progress" aria-live="polite">${Object.keys(s.votes).length} / ${s.voters.length-s.skipped.length} ${t('votes')}</p>${!s.voters.includes(me)?`<p>${t('late')}</p>`:''}${isHost&&complete(s)?button(t('next'),'next',busy||!online):isHost&&canSkip().length?button(t('skip'),'skip',busy||!online,'secondary'):''}</div>`;
 }
 html+=`<p class="status" role="status">${esc(!online?t('offline'):error)}</p>${error&&room?button(t('retry'),'retry',busy,'secondary'):''}`;
 if(room)html+=`<button class="chat-toggle" data-action="chat" aria-label="${t('chat')}">💬</button>${chatOpen?`<div class="chat-panel"><div class="phrases">${t('phrases').map((v,i)=>button(v,'phrase-'+i,false,'secondary')).join('')}</div><form><input maxlength="80" aria-label="${t('chat')}"><button class="secondary">${t('send')}</button></form></div>`:''}`;
 root.innerHTML=html;
}
function canSkip(){return state().voters.filter(id=>!Object.hasOwn(state().votes,id)&&!state().skipped.includes(id)&&away.has(id)&&Date.now()-away.get(id)>=20000);}
async function refresh(){
 if(!room||loading)return;loading=true;
 try{const d=await sdk.game.getParticipants();if(d.roomId!==room)return;people=d.participants;roomHost=d.hostId;lastRefresh=Date.now();for(const pid of new Set([...people.map(p=>p.id),...state().voters])){if(active().includes(pid))away.delete(pid);else if(!away.has(pid))away.set(pid,Date.now());}error='';
 // A disconnected host gets a grace period; remaining players elect the first
 // active seat in the stable directory. The action is sequenced like votes.
 const s=state(),previous=s.host||d.hostId;if(active().includes(previous)){roomHost=previous;}else{if(!away.has(previous))away.set(previous,Date.now());if(Date.now()-away.get(previous)>=20000){roomHost=active()[0]||previous;if(s.host&&s.host!==roomHost&&roomHost===me)await commit('host',{previousHost:s.host});}}
 }catch{error=t('error');}finally{loading=false;render();}
}
function setup(){if(shared)return;shared=sdk.game.syncedState(blank(),{reduce:(s,a)=>reduce(s,a,roomHost),checkpointEvery:1,authority:'all'});shared.onChange(()=>{error='';render();});}
async function commit(type,data={}){const s=state();const r=await shared.commit(type,{...data,session:s.session,round:s.round},{queueOffline:false});if(r?.success===false)throw Error(r.error||'Failed');}
async function enter(id){if(room!==id){shared?.destroy();shared=null;people=[];room=id;setup();}await sdk.game.connect();await sdk.game.join(room);await refresh();}
function wire(){
 sdk.game.onRoomAssigned(d=>{if(room!==d.roomId){shared?.destroy();shared=null;people=[];room=d.roomId;setup();}render();});
 sdk.game.onJoined(d=>{roomHost=d.host_id||d.player_ids?.[0]||roomHost;online=true;void refresh();});
 sdk.game.onPlayerJoined(()=>void refresh());
 sdk.game.onPlayerLeft(d=>{if(!away.has(d.player_id))away.set(d.player_id,Date.now());people=people.map(p=>p.id===d.player_id?{...p,connected:false}:p);render();void refresh();});
 sdk.game.onPlayerConnection(d=>{if(d.state==='connected')away.delete(d.player_id);else if(!away.has(d.player_id))away.set(d.player_id,Date.now());void refresh();});
 sdk.game.onConnectionState(s=>{online=s==='connected'||s==='reconnected';if(online){sdk.game.requestSync(shared?.getSequence()||0);void refresh();}render();});
 sdk.game.onRealtime(d=>{if(d.action_type==='quick_chat'&&people.some(p=>p.id===d.player_id&&p.joined))bubble(d.player_id,d.action_data?.phrase);});
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
  if(b.dataset.choice)await commit('vote',{candidate:b.dataset.choice});
  else if(a==='invite'){if(!sdk)error=t('local');else{const r=await sdk.game.invite({maxPlayers:16});if(r.success)await enter(r.roomId);}}
  else if(a==='ready')await commit('ready',{ready:!state().ready[me]});
  else if(a==='start'){await refresh();if(active().length<2)return;if(new TextEncoder().encode(JSON.stringify(people)).length>35000)throw Error('GROUP_TOO_LARGE');await shared.commit('start',{session:crypto.randomUUID(),candidates:people,voters:active()},{queueOffline:false});}
  else if(a==='next'){await refresh();await commit('next',{voters:active().length>=2?active():state().voters});}
  else if(a==='skip')await commit('skip',{players:canSkip()});
  else if(a==='replay')await commit('restart');
  else if(a==='retry'){await enter(room);sdk.game.requestSync(shared?.getSequence()||0);}
  else if(a==='chat')chatOpen=!chatOpen;
  else if(a?.startsWith('phrase-'))sendChat(t('phrases')[Number(a.slice(7))]);
 }catch(e){error=t(e.message==='GROUP_TOO_LARGE'?'large':'error');}finally{busy=false;render();}
});
let pulse=Date.now();setInterval(()=>{if(room){if(Date.now()-pulse>15000)sdk.game.requestSync(shared?.getSequence()||0);if(Date.now()-lastRefresh>5000)void refresh();else render();}pulse=Date.now();},5000);
function boot(c){me=String(c.userId||'');lang=String(sdk?.getLanguage()||navigator.language).startsWith('mn')?'mn':'en';if(sdk){wire();if(sdk.getLaunchParams().mode==='multiplayer')void enter(c.roomId).catch(()=>{error=t('error');render();});}render();}
if(window.Usion){sdk=window.Usion;sdk.init(boot);}else boot({});
