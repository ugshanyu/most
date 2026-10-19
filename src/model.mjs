import {questions} from './questions.mjs';
export const votesFor=(rows,question)=>Object.fromEntries(rows.filter(v=>v.question===question).map(v=>[v.voter,v.candidate]));
export const nextUnanswered=(rows,me,list=questions)=>{const n=list.findIndex(q=>!Object.hasOwn(votesFor(rows,q.id),me));return n<0?list.length:n;};
export function winners(votes){const counts={};for(const id of Object.values(votes))counts[id]=(counts[id]||0)+1;const max=Math.max(0,...Object.values(counts));return Object.keys(counts).filter(id=>counts[id]===max);}
