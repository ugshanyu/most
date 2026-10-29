// Solo answers are private strings, never participant IDs or multiplayer votes.
export const soloKey=packId=>'most-solo-v1:'+packId;
export const cleanSoloName=value=>String(value??'').normalize('NFC').replace(/\s+/gu,' ').trim();
export function readSoloAnswers(saved,packId,questions){
 if(saved?.version!==1||saved.packId!==packId||!saved.answers||typeof saved.answers!=='object')return {};
 return Object.fromEntries(questions.flatMap(q=>{
  const value=saved.answers[q.id];if(typeof value!=='string')return [];
  const name=cleanSoloName(value);return name&&name.length<=60?[[q.id,name]]:[];
 }));
}
export const nextSoloQuestion=(answers,list)=>{const n=list.findIndex(q=>!Object.hasOwn(answers,q.id));return n<0?list.length:n;};
export function soloAnswer(saved,packId,questionId,name){
 const value=cleanSoloName(name);if(!value||value.length>60)throw Error('INVALID_SOLO_NAME');
 return {version:1,packId,answers:{...saved,[questionId]:value}};
}
