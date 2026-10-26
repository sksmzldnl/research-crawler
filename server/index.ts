import { createServer } from 'node:http';
import { join } from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Store } from '../core/store.js';
import { MemoryVault } from '../core/vault.js';
import { Service } from '../core/service.js';
const service=new Service(new Store(join(process.env.STUDIO_DATA_DIR||'.local','studio.sqlite')),new MemoryVault());
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST'||req.url!=='/api/call'){res.writeHead(404);res.end('{}');return;}
  if(req.headers.origin!=='http://127.0.0.1:5173'||req.headers['x-studio-client']!=='local-ui'||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(403);res.end(JSON.stringify({error:'로컬 UI에서만 요청할 수 있습니다.'}));return;}
  try{let body='';for await(const chunk of req){body+=chunk;if(body.length>1_000_000)throw Error('요청 크기 초과');}const {method,args}=JSON.parse(body);let result:unknown;
    if(method==='backup'){const dir=await mkdtemp(join(tmpdir(),'studio-backup-'));try{const path=join(dir,'backup.sqlite');await service.store.backup(path);result={filename:'studio-backup.sqlite',mime:'application/vnd.sqlite3',data:(await readFile(path)).toString('base64')};}finally{await rm(dir,{recursive:true,force:true});}}
    else result=await service.call(method,args);res.end(JSON.stringify({result}));
  }catch(e){res.writeHead(400);res.end(JSON.stringify({error:(e as Error).message}));}
});
server.listen(4317,'127.0.0.1',()=>console.log('Studio local API ready on port 4317. Browser credentials are session-only; desktop uses OS encryption.'));
async function shutdown(){service.close();await service.engine.idle();server.close();service.store.close();process.exit(0);}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
