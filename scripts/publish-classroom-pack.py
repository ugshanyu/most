"""Publish the approved immutable classroom pack using the owner seed route.

Dry run by default. Commit and push the JSON before --apply. Existing packs
must match exactly: never rewrite question IDs/text attached to saved ballots.
"""
import argparse
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import httpx
from jose import jwt
from dotenv import dotenv_values
from pymongo import MongoClient

p = argparse.ArgumentParser()
p.add_argument('--env', required=True)
p.add_argument('--apply', action='store_true')
a = p.parse_args()
root = Path(__file__).resolve().parents[1]
source = json.loads((root / 'packs/manai-angiinhan-mn-v1.json').read_text())
questions = [{k: q[k] for k in ('id', 'emoji', 'en', 'mn')} for q in source['questions']]
assert len(questions) == 30
assert len({q['mn'] for q in questions}) == 30
assert all(8 <= len(q['mn']) <= 180 and q['emoji'] for q in questions)
assert [q['id'] for q in questions] == ['q' + str(i) for i in range(1, 31)]
v = dotenv_values(a.env)
client = MongoClient(v['DATABASE_URL'])
db = client[v['DATABASE_NAME']]
service = db.services.find_one({'id': 'most'})
owner = db.users.find_one({'id': service['creator_id'], 'username': 'ugshanyu'})
assert owner, 'Confirm the intended service owner before publishing'
pack = {'id': source['id'], 'creator_id': owner['id'], 'title': source['title'],
        'visibility': 'public', 'questions': questions}
old = db.most_packs.find_one({'id': pack['id']})
if old:
    assert all(old.get(k) == value for k, value in pack.items()), 'Immutable pack differs: stop'
print(json.dumps({'id': pack['id'], 'title': pack['title'], 'visibility': 'public',
                  'question_count': len(questions), 'already_exists': bool(old)}, ensure_ascii=False))
if a.apply:
    if not old:
        assert db.most_packs.count_documents({'creator_id': owner['id']}) < 100
        db.most_packs.update_one({'id': pack['id']}, {'$setOnInsert': {
            **pack, 'created_at': datetime.now(timezone.utc)}}, upsert=True)
    saved = db.most_packs.find_one({'id': pack['id']})
    assert all(saved.get(k) == value for k, value in pack.items())
    # Read through the deployed endpoint using a short-lived, Most-scoped owner
    # token, following the repository's production verification pattern.
    token = jwt.encode({'sub': owner['id'], 'purpose': 'iframe', 'service_id': 'most',
                        'exp': datetime.now(timezone.utc) + timedelta(minutes=5)},
                       v['SECRET_KEY'], algorithm=v.get('ALGORITHM') or 'HS256')
    with httpx.Client(timeout=30, headers={'User-Agent': 'Mozilla/5.0',
                       'Authorization': 'Bearer ' + token}) as http:
        response = http.get('https://mobile.mongolai.mn/games/most/packs')
        response.raise_for_status()
        live = next(x for x in response.json()['packs'] if x['id'] == pack['id'])
        assert all(live[k] == value for k, value in pack.items())
        assert response.headers.get('cache-control') == 'private, no-store'
    print('Verified deployed pack catalog: public, 30 exact questions, all emoji fields preserved.')
client.close()
