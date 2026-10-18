import {questions} from './questions.mjs';
export const blank=()=>({phase:'lobby',session:'',round:0,host:'',ready:{},candidates:[],voters:[],votes:{},skipped:[],history:[]});
const ids=a=>Array.isArray(a)&&a.length>=2&&a.length<=16&&a.every(x=>typeof x==='string')&&new Set(a).size===a.length;
export const complete=s=>s.voters.every(id=>Object.hasOwn(s.votes,id)||s.skipped.includes(id));
export function winners(votes){const counts={};for(const id of Object.values(votes))counts[id]=(counts[id]||0)+1;const max=Math.max(0,...Object.values(counts));return Object.keys(counts).filter(id=>counts[id]===max);}
// Only sequenced server echoes enter this reducer. Identity is the relay's
// playerId, never a user ID supplied inside the action payload.
export function reduce(s,{playerId:id,type,data:d={}},roomHost){
 if(type==='ready'&&s.phase==='lobby'&&typeof d.ready==='boolean')return {...s,ready:{...s.ready,[id]:d.ready}};
 if(type==='start'&&s.phase==='lobby'&&id===roomHost&&ids(d.voters)&&d.voters.includes(id)&&d.voters.every(p=>s.ready[p])&&typeof d.session==='string'&&d.session&&Array.isArray(d.candidates)&&d.candidates.length>=2&&d.candidates.length<=500){
  const candidates=d.candidates.filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').map(p=>({id:p.id,name:p.name.slice(0,60),avatar:typeof p.avatar==='string'?p.avatar:null}));
  if(candidates.length!==d.candidates.length||new Set(candidates.map(p=>p.id)).size!==candidates.length)return s;
  return {...blank(),phase:'question',session:d.session,host:id,candidates,voters:d.voters};
 }
 if(d.session!==s.session)return s;
 if(type==='host'&&s.phase!=='lobby'&&id===roomHost)return {...s,host:id};
 if(type==='restart'&&s.phase==='done'&&id===s.host)return blank();
 if(s.phase!=='question'||d.round!==s.round)return s;
 if(type==='vote'&&s.voters.includes(id)&&!s.skipped.includes(id)&&!Object.hasOwn(s.votes,id)&&s.candidates.some(p=>p.id===d.candidate))return {...s,votes:{...s.votes,[id]:d.candidate}};
 if(type==='skip'&&id===s.host&&Array.isArray(d.players))return {...s,skipped:[...new Set([...s.skipped,...d.players.filter(p=>s.voters.includes(p)&&!Object.hasOwn(s.votes,p))])]};
 if(type==='next'&&id===s.host&&complete(s)&&ids(d.voters)){
  const round=s.round+1;
  return {...s,round,phase:round===questions.length?'done':'question',voters:d.voters,votes:{},skipped:[],history:[...s.history,{questionId:questions[s.round].id,votes:s.votes,skipped:s.skipped}]};
 }
 return s;
}
