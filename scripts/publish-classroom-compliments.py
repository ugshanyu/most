"""Publish the separate 19-question compliments pack; dry run unless --apply."""
import argparse,json
from datetime import datetime,timezone
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient
p=argparse.ArgumentParser();p.add_argument('--env',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
s=json.loads((Path(__file__).resolve().parents[1]/'packs/manai-angiin-magtaal-mn-v1.json').read_text())
assert len(s['questions'])==19 and len({q['mn'] for q in s['questions']})==19
assert [q['id'] for q in s['questions']]==[f'q{i}' for i in range(1,20)]
assert all(8<=len(q['mn'])<=180 and q['emoji'] and q['mn']==q['en'] for q in s['questions'])
v=dotenv_values(a.env);client=MongoClient(v['DATABASE_URL']);db=client[v['DATABASE_NAME']]
service=db.services.find_one({'id':'most'})
owner=db.users.find_one({'id':service['creator_id'],'username':'ugshanyu'});assert owner
pack={k:s[k] for k in ('id','title','visibility','questions')}|{'creator_id':owner['id']}
existing=db.most_packs.find_one({'id':pack['id']})
if existing:
 assert all(existing[k]==value for k,value in pack.items() if k!='title'),'Existing pack differs'
 assert existing['title'] in ('Манай ангийн хамгийн хамгийн — Магтаал 🌟',pack['title']),'Unexpected title'
print(json.dumps({'id':pack['id'],'title':pack['title'],'questions':19,'visibility':'public'},ensure_ascii=False))
if a.apply:
 if not existing:
  assert db.most_packs.count_documents({'creator_id':owner['id']})<100
  db.most_packs.update_one({'id':pack['id']},{'$setOnInsert':pack|{'created_at':datetime.now(timezone.utc)}},upsert=True)
 if existing:
  result=db.most_packs.update_one({'id':pack['id'],'creator_id':owner['id'],'title':existing['title']},{'$set':{'title':pack['title']}})
  assert result.matched_count==1
 saved=db.most_packs.find_one({'id':pack['id']})
 assert all(saved[k]==value for k,value in pack.items())
 print('Published and verified separate public compliments pack.')
client.close()
