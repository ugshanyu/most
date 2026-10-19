"""Update only Most's description after deploying its pack UI."""
import argparse, asyncio, json, sys
from datetime import datetime, timezone
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--backend-root',required=True);args=p.parse_args();sys.path.insert(0,args.backend_root)
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from services.redis.connection import get_redis
async def main():
    description=json.loads((Path(__file__).resolve().parents[1]/'service.json').read_text())['description']
    client=AsyncIOMotorClient(settings.DATABASE_URL);db=client[settings.DATABASE_NAME]
    try:
        owner=await db.users.find_one({'username':'ugshanyu'},{'id':1})
        assert owner
        result=await db.services.update_one({'id':'most','creator_id':owner['id']},{'$set':{'description':description,'updated_at':datetime.now(timezone.utc)},'$inc':{'current_version':1}})
        assert result.matched_count==1
        redis=await get_redis();keys=[k async for k in redis.scan_iter(match='svclist:*',count=100)]
        if keys: await redis.delete(*keys)
        print('Updated Most description; listing caches invalidated.')
    finally: client.close()
asyncio.run(main())
