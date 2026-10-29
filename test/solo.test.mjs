import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanSoloName,readSoloAnswers,nextSoloQuestion,soloAnswer} from '../src/solo.mjs';
const qs=[{id:'q1'},{id:'q2'}];
test('solo answers resume only the matching pack and valid question IDs',()=>{
 const saved={version:1,packId:'one',answers:{q1:'  Бат  ',q2:42,old:'Someone'}};
 assert.deepEqual(readSoloAnswers(saved,'two',qs),{});
 const answers=readSoloAnswers(saved,'one',qs);assert.deepEqual(answers,{q1:'Бат'});
 assert.equal(nextSoloQuestion(answers,qs),1);
 const next=soloAnswer(answers,'one','q2','Сараа');assert.deepEqual(answers,{q1:'Бат'});
 assert.equal(nextSoloQuestion(next.answers,qs),2);
});
test('names reject empty and overlong answers without mutating previous answers',()=>{
 assert.equal(cleanSoloName('  Бат\n  Эрдэнэ  '),'Бат Эрдэнэ');
 for(const name of ['  ','x'.repeat(61)])assert.throws(()=>soloAnswer({},'one','q1',name));
 assert.equal(soloAnswer({},'one','q1','x'.repeat(60)).answers.q1.length,60);
 assert.deepEqual(readSoloAnswers({version:1,packId:'one',answers:{q1:'x'.repeat(61)}},'one',qs),{});
});
