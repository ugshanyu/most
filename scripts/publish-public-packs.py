"""Publish the approved public question packs; dry run unless --apply.

The old unused classroom pack is archived, not rewritten. Abort if it gained
votes or room references. New IDs prevent stale clients from relabeling votes.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient

p=argparse.ArgumentParser()
p.add_argument('--env', required=True)
p.add_argument('--apply', action='store_true')
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
files=['manai-angiinhan-mn-v2','manai-khovguud-mn-v1','manai-okhid-mn-v1','manai-ajlyn-mn-v1']
sources=[json.loads((root/'packs'/f'{f}.json').read_text()) for f in files]
v=dotenv_values(a.env)
client=MongoClient(v['DATABASE_URL']);db=client[v['DATABASE_NAME']]
service=db.services.find_one({'id':'most'})
owner=db.users.find_one({'id':service['creator_id'],'username':'ugshanyu'})
assert owner, 'Unexpected owner'
packs=[]
for source in sources:
    qs=source['questions']
    assert len(qs)==30 and len({q['mn'] for q in qs})==30
    assert [q['id'] for q in qs]==[f'q{i}' for i in range(1,31)]
    assert all(8<=len(q['mn'])<=180 and q['emoji'] and q['en']==q['mn'] for q in qs)
    packs.append({k:source[k] for k in ('id','title','visibility','questions')} | {'creator_id':owner['id']})
old_id=sources[0]['replaces']

def check(session=None):
    old=db.most_packs.find_one({'id':old_id},session=session)
    if old:
        assert old['creator_id']==owner['id']
        assert db.most_votes.count_documents({'pack_id':old_id},session=session)==0, 'Old pack has votes: preserve it'
        assert db.game_rooms.count_documents({'most_pack_ids':old_id},session=session)==0, 'Old pack has live rooms: preserve it'
        assert db.game_rooms_archive.count_documents({'most_pack_ids':old_id},session=session)==0, 'Old pack has archived rooms: preserve it'
    for pack in packs:
        existing=db.most_packs.find_one({'id':pack['id']},session=session)
        if existing:
            assert all(existing.get(k)==value for k,value in pack.items() if k!='title'), 'Immutable pack differs'
            previous=next(s.get('previous_title') for s in sources if s['id']==pack['id'])
            assert existing['title'] in (pack['title'],previous), 'Unexpected title change'
    return old

check()
print(json.dumps([{'id':x['id'],'title':x['title'],'questions':30,'visibility':'public'} for x in packs],ensure_ascii=False))
if a.apply:
    def publish(session):
        old=check(session)
        new_count=sum(db.most_packs.count_documents({'id':pack['id']},session=session)==0 for pack in packs)
        assert db.most_packs.count_documents({'creator_id':owner['id']},session=session)+new_count<=100
        now=datetime.now(timezone.utc)
        for pack in packs:
            existing=db.most_packs.find_one({'id':pack['id']},session=session)
            if existing:
                result=db.most_packs.update_one({'id':pack['id'],'creator_id':owner['id'],'title':existing['title']},{'$set':{'title':pack['title']}},session=session)
                assert result.matched_count==1
            else:
                db.most_packs.insert_one({**pack,'created_at':now},session=session)
        if old:
            db.most_pack_archives.update_one({'id':old_id},{'$setOnInsert':{**old,'retired_at':now,'replaced_by':packs[0]['id']}},upsert=True,session=session)
            result=db.most_packs.delete_one({'_id':old['_id'],'creator_id':owner['id'],'questions':old['questions']},session=session)
            assert result.deleted_count==1
    with client.start_session() as session:
        session.with_transaction(publish)
    for pack in packs:
        saved=db.most_packs.find_one({'id':pack['id']})
        assert all(saved[k]==value for k,value in pack.items())
    assert db.most_packs.find_one({'id':old_id}) is None
    assert db.most_pack_archives.find_one({'id':old_id,'replaced_by':packs[0]['id']})
    print('Published four public packs (120 questions); existing answers and question IDs preserved. Verify the deployed HTTPS catalog.')
client.close()
