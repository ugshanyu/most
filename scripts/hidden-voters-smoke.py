"""Verify hidden/revealed production results using disposable users and rooms."""
import asyncio,uuid
from datetime import datetime,timezone
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.security import create_access_token

async def main():
    prefix='test-most-hidden-'+uuid.uuid4().hex[:12]
    users=[prefix+'-'+c for c in 'abc'];room=prefix+'-room'
    client=AsyncIOMotorClient(settings.DATABASE_URL);db=client[settings.DATABASE_NAME]
    try:
        await db.users.insert_many([{'id':u,'name':'Privacy test '+str(i),'is_active':True} for i,u in enumerate(users)])
        await db.game_rooms.insert_one({'id':room,'service_id':'most','host_id':users[0],'player_ids':users[:2],'most_migrated':True,'status':'waiting','created_at':datetime.now(timezone.utc)})
        async with httpx.AsyncClient(timeout=30) as http:
            async def call(user,path,body=None,status=200):
                token=create_access_token({'sub':user,'purpose':'iframe','service_id':'most'})
                r=await http.request('GET' if body is None else 'POST','https://mobile.mongolai.mn/games'+path,headers={'Authorization':'Bearer '+token},**({'json':body} if body is not None else {}))
                assert r.status_code==status,(r.status_code,r.text)
                return r.json()
            base='/rooms/'+room+'/most'
            for mode in ['hide','show']:
                draft={'request_id':str(uuid.uuid4()),'title':'Disposable privacy check','questions':['Who laughs first?','Who cooks the best?'],'voter_visibility':mode}
                pack=await call(users[0],'/most/packs',draft);assert pack['voter_visibility']==mode
                # A retry cannot switch previously collected votes to reveal mode.
                retry=await call(users[0],'/most/packs',dict(draft,voter_visibility='show' if mode=='hide' else 'hide'))
                assert retry['voter_visibility']==mode
                await call(users[0],base+'/pack',{'pack_id':pack['id']})
                path=base+'?pack_id='+pack['id']
                await call(users[2],path,status=403)
                for q in ['q1','q2']:
                    await call(users[1],base+'/vote',{'pack_id':pack['id'],'question':q,'candidate':users[0]})
                before=await call(users[0],path)
                if mode=='hide':assert before['votes']==[] and before['results']=={}
                for q in ['q1','q2']:
                    await call(users[0],base+'/vote',{'pack_id':pack['id'],'question':q,'candidate':users[1]})
                for viewer in users[:2]:
                    saved=await call(viewer,path)
                    if mode=='hide':
                        assert len(saved['votes'])==2 and all(v['voter']==viewer for v in saved['votes'])
                        assert saved['results']=={q:{users[0]:1,users[1]:1} for q in ['q1','q2']}
                    else:assert len(saved['votes'])==4 and {v['voter'] for v in saved['votes']}==set(users[:2])
                    catalog=await call(viewer,'/most/packs?room_id='+room)
                    card=next(p for p in catalog['packs'] if p['id']==pack['id'])
                    assert card['answererCount']==2
                    if mode=='hide':assert card['answerers']==[]
                    else:assert {p['id'] for p in card['answerers']}==set(users[:2])
            print('PASS HTTPS: create/retry, both voters, unfinished privacy, 50/50 aggregates, records catalog, reveal compatibility, outsider rejection.')
    finally:
        await db.most_votes.delete_many({'room_id':room})
        await db.most_packs.delete_many({'creator_id':{'$in':users}})
        await db.game_rooms.delete_one({'id':room})
        await db.users.delete_many({'id':{'$in':users}})
        client.close()
        print('Disposable fixtures removed.')
asyncio.run(main())
