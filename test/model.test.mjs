import test from 'node:test';import assert from 'node:assert/strict';
import {votesFor,nextUnanswered,winners} from '../src/model.mjs';import {questions} from '../src/questions.mjs';
test('each friend progresses independently, including arrivals after completion',()=>{
 const rows=questions.map(q=>({question:q.id,voter:'a',candidate:'b'}));
 assert.equal(nextUnanswered(rows,'a'),questions.length);assert.equal(nextUnanswered(rows,'b'),0);
 rows.push({question:questions[0].id,voter:'b',candidate:'a'});
 assert.equal(nextUnanswered(rows,'b'),1);assert.equal(nextUnanswered(rows,'a'),questions.length);
 assert.deepEqual(votesFor(rows,questions[0].id),{a:'b',b:'a'});
});
test('reopening skips all answered questions and preserves ties',()=>{
 const rows=[{question:questions[0].id,voter:'a',candidate:'b'},{question:questions[1].id,voter:'a',candidate:'c'}];
 assert.equal(nextUnanswered(JSON.parse(JSON.stringify(rows)),'a'),2);
 assert.deepEqual(winners({a:'b',b:'c'}),['b','c']);assert.deepEqual(winners({}),[]);
});

test('custom packs use their own question count',()=>{const pack=[{id:'q1'}];assert.equal(nextUnanswered([{question:'q1',voter:'a',candidate:'b'}],'a',pack),1);});
