// LOCAL TEST TRANSPORT. Never imported into the production bundle.
const testId=new URLSearchParams(location.search).get('player')||'a';
const listeners={},handlers={};
const emit=(type,data)=>{handlers[type]?.(data);for(const f of listeners[type]||[])f(data);};
window.testEmit=emit;
const game={playerId:testId,roomId:'test-room',on(event,f){(listeners[event]||=[]).push(f);return()=>listeners[event]=listeners[event].filter(x=>x!==f);},_dispatch:emit,_setHandler(event,f){handlers[event]=f;return()=>delete handlers[event];},connect:async()=>({success:true}),join:async()=>{const d=await window.relay('join',testId);emit('joined',d);return d;},action:(type,data)=>window.relay('action',testId,{type,data}),setState:state=>window.relay('checkpoint',testId,state),requestSync:async()=>emit('sync',await window.relay('sync',testId)),getParticipants:()=>window.relay('directory',testId),invite:async()=>({success:true,roomId:'test-room'}),realtime:(type,data)=>window.relay('realtime',testId,{type,data})};
for(const [api,event] of Object.entries({onRoomAssigned:'roomAssigned',onJoined:'joined',onPlayerJoined:'playerJoined',onPlayerLeft:'playerLeft',onPlayerConnection:'playerConnection',onRealtime:'realtime',onError:'error'}))game[api]=f=>game._setHandler(event,f);
window.Usion={game,log:console.log,user:{getId:()=>testId},init:f=>f({userId:testId,roomId:'test-room',playerIds:['a','b','c']}),getLanguage:()=>new URLSearchParams(location.search).get('lang')||'en',getLaunchParams:()=>({mode:'multiplayer'})};
