"""Verify asynchronous production voting with disposable identities only."""
import argparse, asyncio, sys, uuid
from datetime import datetime, timedelta
p=argparse.ArgumentParser();p.add_argument('--backend-root',required=True);args=p.parse_args();sys.path.insert(0,args.backend_root)
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.security import create_access_token
BASE='https://mobile.mongolai.mn'
async def main():
    prefix='test-most-'+uuid.uuid4().hex[:12]; room=prefix+'-room'; users=[prefix+'-'+c for c in 'ab']
    client=AsyncIOMotorClient(settings.DATABASE_URL);db=client[settings.DATABASE_NAME]
    try:
        await db.users.insert_many([{'id':u,'name':'Async smoke','is_active':True} for u in users])
        await db.game_rooms.insert_one({'id':room,'service_id':'most','game_id':'most','host_id':users[0],'player_ids':[users[0]],'max_players':16,'min_players':2,'status':'waiting','created_at':datetime.utcnow()-timedelta(days=365),'most_invitee_ids':[users[1]]})
        async with httpx.AsyncClient(timeout=25) as http:
            async def request(user,path='',body=None,expected=200):
                token=create_access_token({'sub':user,'purpose':'iframe','service_id':'most'})
                r=await http.request('POST' if body is not None else 'GET',BASE+'/games/rooms/'+room+path,headers={'Authorization':'Bearer '+token},**({'json':body} if body is not None else {}))
                assert r.status_code==expected,(r.status_code,r.text);return r.json()
            async def records(user):
                token=create_access_token({'sub':user,'purpose':'iframe','service_id':'most'})
                response=await http.get(BASE+'/games/most/records',headers={'Authorization':'Bearer '+token})
                assert response.status_code==200,response.text
                assert response.headers.get('cache-control')=='private, no-store'
                return response.json()['records']
            assert [r['id'] for r in await records(users[0])]==[room]
            assert await records(users[1])==[]
            questions='president tipsy funny influencer millionaire flirt married ex secret drama late karaoke abroad salary help'.split()
            for q in questions: await request(users[0],'/most/vote',{'question':q,'candidate':users[1]})
            # Old room stays live even with nobody connected and after cleanup.
            from services.game_cleanup_service import _archive_and_delete
            assert await _archive_and_delete(db,{'id':room})==0
            assert len((await request(users[0],'/most'))['votes'])==15
            await request(users[1],'/join',{})
            assert [r['id'] for r in await records(users[1])]==[room]
            await request(users[1],'/most/vote',{'question':'president','candidate':users[0]})
            await request(users[1],'/most/vote',{'question':'president','candidate':users[1]})
            data=await request(users[1],'/most');assert len(data['votes'])==16
            assert next(v for v in data['votes'] if v['voter']==users[1])['candidate']==users[0]
            assert len((await request(users[0],'/most'))['votes'])==16
            async def global_request(user,path,body=None,expected=200,service='most'):
                token=create_access_token({'sub':user,'purpose':'iframe','service_id':service})
                r=await http.request('POST' if body is not None else 'GET',BASE+'/games/most'+path,headers={'Authorization':'Bearer '+token},**({'json':body} if body is not None else {}))
                assert r.status_code==expected,(r.status_code,r.text)
                return r.json()
            catalog=await global_request(users[0],'/packs')
            builtin=next(p for p in catalog['packs'] if p['id']=='friends-v1')
            assert len(builtin['questions'])==14
            assert not {'tipsy','millionaire'} & {q['id'] for q in builtin['questions']}
            await global_request(users[0],'/packs',expected=403,service='chemistry')
            draft={'request_id':str(uuid.uuid4()),'title':'Smoke private pack','questions':['Who would plan the best trip?']}
            custom=await global_request(users[0],'/packs',draft)
            assert (await global_request(users[0],'/packs',draft))['id']==custom['id']
            assert custom['id'] not in [p['id'] for p in (await global_request(users[1],'/packs'))['packs']]
            await request(users[1],'/most?pack_id='+custom['id'],expected=403)
            await request(users[0],'/most/pack',{'pack_id':custom['id']})
            assert custom['id'] in [p['id'] for p in (await global_request(users[1],'/packs?room_id='+room))['packs']]
            for u in users:
                await request(u,'/most/vote',{'pack_id':custom['id'],'question':'q1','candidate':users[0]})
            assert len((await request(users[1],'/most?pack_id='+custom['id']))['votes'])==2
            catalog=await global_request(users[1],'/packs?room_id='+room)
            card=next(p for p in catalog['packs'] if p['id']==custom['id'])
            assert {p['id'] for p in card['answerers']}==set(users)
            for q in builtin['questions']:
                await request(users[0],'/most/vote',{'pack_id':'friends-v1','question':q['id'],'candidate':users[1]})
            assert len((await request(users[0],'/most?pack_id=friends-v1'))['votes'])==14
            assert len((await request(users[0],'/most'))['votes'])==16
            await request(users[0],'/most/vote',{'pack_id':'friends-v1','question':'tipsy','candidate':users[1]},expected=422)
            print('PASS: 14-question pack, custom creation/retry, private access, room sharing, answerer icons, pack-isolated ballots, removed-question rejection.')
        print('PASS: year-old invite, no connected players, 15 solo ballots, late join, immutable vote retry, durable result read, cleanup exclusion.')
    finally:
        await db.most_packs.delete_many({'creator_id':{'$in':users}});await db.most_votes.delete_many({'room_id':room});await db.game_rooms.delete_one({'id':room});await db.users.delete_many({'id':{'$in':users}})
        from services.redis.connection import get_redis
        redis=await get_redis();keys=[k async for k in redis.scan_iter(match='*'+prefix+'*')]
        if keys: await redis.delete(*keys)
        client.close();print('Disposable fixtures removed.')
asyncio.run(main())
