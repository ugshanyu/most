"""Correct q11 wording without changing its ID, votes, or any other question."""
import argparse,json
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient
p=argparse.ArgumentParser();p.add_argument('--env',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
source=json.loads((Path(__file__).resolve().parents[1]/'packs/manai-angiinhan-mn-v2.json').read_text())
new=next(q for q in source['questions'] if q['id']=='q11')
old='Багштай маргалдаад өөрөө гэрийн даалгавар нэмүүлэх хүн хэн бэ?'
v=dotenv_values(a.env);db=MongoClient(v['DATABASE_URL'])[v['DATABASE_NAME']]
service=db.services.find_one({'id':'most'});pack=db.most_packs.find_one({'id':source['id'],'creator_id':service['creator_id']});assert pack
q=next(q for q in pack['questions'] if q['id']=='q11');assert q['mn'] in (old,new['mn']) and q['en'] in (old,new['en'])
print(new['mn'])
if a.apply:
 expected=[new if q['id']=='q11' else q for q in pack['questions']]
 result=db.most_packs.update_one({'id':source['id'],'creator_id':service['creator_id'],'questions':pack['questions']},{'$set':{'questions':expected}})
 assert result.matched_count==1,'Concurrent pack edit; re-read before retrying'
 after=db.most_packs.find_one({'id':source['id']})
 assert after==dict(pack,questions=expected)
 print('Verified: only q11 wording changed; question ID and other pack fields preserved.')
