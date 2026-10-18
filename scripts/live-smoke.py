"""Explicit production smoke test using disposable test-only identities/room.
Run from configured backend directory with --backend-root. Never invites real users.
"""
import argparse, asyncio, sys, uuid
from datetime import datetime
p=argparse.ArgumentParser();p.add_argument('--backend-root',required=True);args=p.parse_args()
sys.path.insert(0,args.backend_root)
import httpx, socketio
from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings
from core.security import create_access_token
BASE='https://mobile.mongolai.mn'

async def main():
    prefix='test-most-'+uuid.uuid4().hex[:12]
    users=[prefix+'-'+x for x in 'abcd']
    group=prefix+'-group';room=prefix+'-room'
    dbclient=AsyncIOMotorClient(settings.DATABASE_URL)
    db=dbclient[settings.DATABASE_NAME];clients=[]
    try:
        await db.users.insert_many([{'id':u,'name':'Most smoke '+str(i+1),'is_active':True,'created_at':datetime.utcnow()} for i,u in enumerate(users)])
        await db.conversations.insert_one({'id':group,'type':'group','participant_ids':users,'admin_ids':[users[0]],'created_at':datetime.utcnow()})
        await db.game_rooms.insert_one({'id':room,'service_id':'most','game_id':'most','game_name':'Most smoke','game_type':'iframe','conversation_id':'','host_id':users[0],'player_ids':users[:3],'max_players':16,'min_players':2,'status':'playing','game_state':{},'sequence':0,'created_at':datetime.utcnow()})
        events=[[],[],[]]
        for i,u in enumerate(users[:3]):
            c=socketio.AsyncClient(reconnection=False)
            c.on('game:action',lambda d,i=i: events[i].append(d))
            await c.connect(BASE,auth={'token':create_access_token({'sub':u})},transports=['websocket'],socketio_path='/socket.io')
            clients.append(c)
            ack=await c.call('game:join',{'room_id':room},timeout=15)
            assert ack.get('success'), ack
        ack=await clients[0].call('group:message',{'conversation_id':group,'content':'','components':[{'type':'game_invite','room_id':room,'service_id':'most'}]},timeout=15)
        assert not ack.get('error'),ack
        stored=await db.game_rooms.find_one({'id':room})
        assert stored.get('participant_group_id')==group, 'Group invite lost its source'
        async with httpx.AsyncClient(timeout=20) as http:
            async def directory(user,service='most'):
                token=create_access_token({'sub':user,'purpose':'iframe','service_id':service})
                return await http.get(BASE+'/games/rooms/'+room+'/participants',headers={'Authorization':'Bearer '+token})
            result=await directory(users[0]);assert result.status_code==200,result.text
            data=result.json();assert data['source']=='group' and len(data['participants'])==4,data
            assert sum(p['connected'] for p in data['participants'])==3,data
            assert data['participants'][-1]['joined'] is False
            assert result.headers.get('cache-control')=='private, no-store'
            assert (await directory(users[0],'chemistry')).status_code==403
            assert (await directory(users[3])).status_code==403
        for i,c in enumerate(clients):
            ack=await c.call('game:action',{'room_id':room,'action_type':'vote','action_data':{'candidate':users[3],'round':0,'session':prefix}},timeout=15)
            assert ack.get('success'),ack
            await asyncio.sleep(.15)
        assert all(len(e)==3 for e in events),[len(e) for e in events]
        assert all({a['player_id'] for a in e}==set(users[:3]) for e in events)
        seq=events[0][-1]['sequence']
        state={'__usionSyncedState':1,'seq':seq,'state':{'smoke':prefix,'votes':{u:users[3] for u in users[:3]}}}
        ack=await clients[0].call('game:set_state',{'room_id':room,'state':state,'sequence':seq},timeout=15)
        assert ack.get('success'),ack
        await clients[2].disconnect()
        await clients[2].connect(BASE,auth={'token':create_access_token({'sub':users[2]})},transports=['websocket'],socketio_path='/socket.io')
        ack=await clients[2].call('game:join',{'room_id':room},timeout=15)
        assert ack.get('game_state')==state,ack
        print('PASS: production group invite source, scoped roster, 3 connected + 1 absent candidate, authorization denials, 3-player vote relay and reconnect checkpoint.')
    finally:
        for c in clients:
            if c.connected: await c.disconnect()
        # These exact random IDs were created above exclusively for this test.
        await db.game_rooms.delete_one({'id':room})
        await db.conversations.delete_one({'id':group})
        await db.users.delete_many({'id':{'$in':users}})
        await db.game_actions.delete_many({'room_id':room})
        dbclient.close()
        print('Disposable MongoDB test fixtures removed; transient relay keys expire normally.')

asyncio.run(main())
