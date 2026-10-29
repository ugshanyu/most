"""Replace three requested classroom questions while preserving IDs and votes."""
import argparse,json
from pathlib import Path
from dotenv import dotenv_values
from pymongo import MongoClient
p=argparse.ArgumentParser();p.add_argument('--env',required=True);p.add_argument('--apply',action='store_true');a=p.parse_args()
source=json.loads((Path(__file__).resolve().parents[1]/'packs/manai-angiinhan-mn-v2.json').read_text())
old={'q24': 'Хожвол чадвар, хожигдвол лаг гэх хүн хэн бэ?', 'q25': 'Ангийн дарга болоод найзуудыгаа танихаа болих хүн хэн бэ?', 'q27': '«Товчхон ярья» гэчихээд бүтэн завсарлага дуусгах хүн хэн бэ?'}
new={q["id"]:q for q in source["questions"] if q["id"] in old}
v=dotenv_values(a.env);db=MongoClient(v['DATABASE_URL'])[v['DATABASE_NAME']]
service=db.services.find_one({'id':'most'});pack=db.most_packs.find_one({'id':source['id'],'creator_id':service['creator_id']});assert pack
for q in pack['questions']:
 if q['id'] in old:
  assert q['mn'] in (old[q['id']],new[q['id']]['mn']) and q['en'] in (old[q['id']],new[q['id']]['en'])
  print(new[q['id']]['mn'])
if a.apply:
 expected=[new.get(q['id'],q) for q in pack['questions']]
 result=db.most_packs.update_one({'id':source['id'],'creator_id':service['creator_id'],'questions':pack['questions']},{'$set':{'questions':expected}})
 assert result.matched_count==1,'Concurrent pack edit; re-read before retrying'
 after=db.most_packs.find_one({'id':source['id']})
 assert after==dict(pack,questions=expected)
 print('Verified: only q24, q25, q27 changed; question ID and other pack fields preserved.')
