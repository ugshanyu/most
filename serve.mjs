import http from 'node:http';
import {readFile} from 'node:fs/promises';
http.createServer(async(req,res)=>{try{
 const u=new URL(req.url,'http://localhost');
 const asset=/^\/[a-zA-Z0-9_-]+\.(webp|png|svg)$/.test(u.pathname);
 const file=asset?'public'+u.pathname:'public/index.html';
 const body=await readFile(new URL(file,import.meta.url));
 res.writeHead(200,{'Content-Type':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('Not found; run npm run build first');}
}).listen(Number(process.env.PORT||3050),'127.0.0.1',()=>console.log('Most: http://localhost:3050'));
