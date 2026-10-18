"""Owner-only Usions seed route. Run from the configured backend directory.
python /path/to/most/scripts/register.py --backend-root /path/to/backend
Uses backend environment credentials; never writes them into this repository.
"""
import argparse, asyncio, hashlib, json, sys, urllib.request
from pathlib import Path
from datetime import datetime, timezone
parser = argparse.ArgumentParser()
parser.add_argument('--backend-root', required=True)
args = parser.parse_args()
sys.path.insert(0, args.backend_root)
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from schemas.service import ServiceRegistrationCreate
from api.registry_validators import resolve_game_config
from services.miniapp_builder.types import BuildArtifact
from services.miniapp_builder.moderation import tier1_check
ROOT = Path(__file__).resolve().parents[1]
URL = 'https://usion-most.vercel.app'

def fetch(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Most-release-verification'}), timeout=30).read()

async def main():
    source = (ROOT/'public/index.html').read_bytes()
    check = tier1_check(BuildArtifact.from_map({'index.html': source.decode()}))
    if not check.ok:
        raise RuntimeError(str(check.issues))
    assert fetch(URL) == source, 'Deploy the committed bundle before registering'
    icon = (ROOT/'public/icon-v1.svg').read_bytes()
    assert fetch(URL+'/icon-v1.svg') == icon
    meta = json.loads((ROOT/'service.json').read_text())
    reg = ServiceRegistrationCreate(name='Most', description=meta['description'], iframe_url=URL,
        image=URL+'/icon-v1.svg', cost=0, service_type='game', genre='strategy',
        tags=['game','multiplayer','iframe','quiz','social','free'], is_published=True,
        visibility='public', max_players=16, realtime={'connection_mode':'platform','connection_transport':'websocket'},
        leaderboard=meta['leaderboard'], sdk={'major':2,'protocol':2,'version':'2.33.0-dev.3','capabilities':['game']})
    client = AsyncIOMotorClient(settings.DATABASE_URL, serverSelectionTimeoutMS=15000)
    try:
        db = client[settings.DATABASE_NAME]
        owner = await db.users.find_one({'username':'ugshanyu'}, {'id':1})
        assert owner, 'Owner account not found'
        old = await db.services.find_one({'id':'most'})
        if old and old.get('creator_id') != owner['id']:
            raise RuntimeError('Most already belongs to another creator')
        data = reg.model_dump(mode='json', exclude_none=True)
        data.pop('max_players', None)
        now = datetime.now(timezone.utc)
        data.update(creator_id=owner['id'], game_config=resolve_game_config(data['tags'],16),
            guest_access='none', is_system_default_service=False, requires_notif_permission=True,
            current_version=(old or {}).get('current_version',0)+1, updated_at=now,
            published_at=(old or {}).get('published_at',now), allowed_user_ids=[])
        await db.services.update_one({'id':'most','creator_id':owner['id']},
            {'$set':data,'$setOnInsert':{'id':'most','created_at':now,'usage_count':0,'rating':0,'review_count':0}}, upsert=True)
        # Listing caches expire within 60 seconds. Clear only service listing
        # cache entries, never gameplay/session data. Works with remote Redis.
        from services.redis.connection import get_redis
        try:
            redis = await get_redis()
            keys = [key async for key in redis.scan_iter(match='svclist:*',count=100)]
            if keys: await redis.delete(*keys)
        except Exception:
            print('Listing cache will refresh at its normal 60-second TTL.')
        receipt = {'id':'most','url':URL,'image':URL+'/icon-v1.svg','icon_sha256':hashlib.sha256(icon).hexdigest(),'sdk':'2.33.0-dev.3'}
        (ROOT/'release.json').write_text(json.dumps(receipt,indent=2)+'\n')
        print(json.dumps(receipt,indent=2))
    finally:
        client.close()

asyncio.run(main())
