"""Apply only this game's name/icon. Commit and push before running --apply."""
import argparse, hashlib, json
from pathlib import Path
from datetime import datetime, timezone
import boto3
from dotenv import dotenv_values
from pymongo import MongoClient

p=argparse.ArgumentParser()
p.add_argument('--env', required=True)
p.add_argument('--apply', action='store_true')
a=p.parse_args()
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'assets/branding.json').read_text())
v=dotenv_values(a.env)
db=MongoClient(v['DATABASE_URL'])[v['DATABASE_NAME']]
s=db.services.find_one({'id':m['id']})
assert s and s['iframe_url'].rstrip('/')=='https://usion-most.vercel.app'
print(json.dumps({k:s.get(k) for k in ['id','name','image','image_thumb']},ensure_ascii=False))
urls={}
for label,f in m['files'].items():
 data=(root/f['path']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==f['sha256']
 bucket=v.get('AWS_S3_BUCKET','mongolgpt-messenger');region=v.get('AWS_S3_REGION','ap-southeast-1')
 urls[label]=f'https://{bucket}.s3.{region}.amazonaws.com/{f["key"]}'
 if a.apply:
  client=boto3.client('s3',aws_access_key_id=v['AWS_ACCESS_KEY_ID'],aws_secret_access_key=v['AWS_SECRET_ACCESS_KEY'],region_name=region)
  client.put_object(Bucket=bucket,Key=f['key'],Body=data,ContentType='image/webp',CacheControl='public, max-age=31536000, immutable')
fields={'name':m['name'],'image':urls['icon'],'image_thumb':urls['thumb'],'image_original':urls['icon'],'image_optimized':urls['icon']}
print(json.dumps(fields,ensure_ascii=False))
if a.apply:
 fields['image_optimized_at']=datetime.now(timezone.utc)
 r=db.services.update_one({'id':m['id'],'name':s['name'],'image':s['image']},{'$set':fields})
 assert r.matched_count==1,'Concurrent change: stop and re-read'
 print('Updated one service; invalidate svclist:* caches and verify public bytes.')
