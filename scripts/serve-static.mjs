// Standalone production-file verification server; no Vite or SPA fallback.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const root=resolve(process.argv[2]??'dist'),prefix=process.argv[3]??'/apex/';
const types={'.html':'text/html; charset=utf-8','.txt':'text/plain; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.ttf':'font/ttf','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    if(!path.startsWith(prefix)){res.writeHead(404).end();return}
    const file=resolve(root,path.slice(prefix.length)||'index.html');
    if(!file.startsWith(root+sep)&&file!==root){res.writeHead(403).end();return}
    const target=(await stat(file)).isDirectory()?resolve(file,'index.html'):file;
    const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]??'application/octet-stream','Cache-Control':'no-store'}).end(body);
  }catch{res.writeHead(404).end()}
});
server.listen(0,'127.0.0.1',()=>console.log(`http://127.0.0.1:${server.address().port}${prefix}`));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
