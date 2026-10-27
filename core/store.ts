import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import {aiModels,type Bundle,type ProviderSettings,type RecordItem,type Research} from './types.js';
export const defaultSettings:ProviderSettings={aiProvider:'openai',aiModel:'gpt-4.1-mini'};
export class Store {
  db:DatabaseSync;
  constructor(public path:string){if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});this.db=new DatabaseSync(path);this.db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; CREATE TABLE IF NOT EXISTS bundles(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS researches(id TEXT PRIMARY KEY,data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY,research_id TEXT NOT NULL,data TEXT NOT NULL,FOREIGN KEY(research_id) REFERENCES researches(id) ON DELETE CASCADE); CREATE INDEX IF NOT EXISTS research_records ON records(research_id); CREATE TABLE IF NOT EXISTS settings(id TEXT PRIMARY KEY,data TEXT NOT NULL);');if(path!==':memory:')chmodSync(path,0o600);
    for(const r of this.list<Research>('researches'))if(r.status==='running'){r.status='paused';r.stage='앱 종료 후 복원 · 재개 가능';this.put('researches',r);}
    if(!this.list('bundles').length)this.put('bundles',{id:randomUUID(),name:'제로웨이스트 생활 경험',expression:'(제로웨이스트 OR "zero waste" OR 재사용) AND (불편 OR 후기 OR 문제 OR 경험) NOT 광고',exclusions:'',priority:1,suggestions:[]});
  }
  list<T>(table:'bundles'|'researches'|'records'):T[]{return this.db.prepare(`SELECT data FROM ${table} ORDER BY rowid DESC`).all().map(r=>JSON.parse(r.data as string));}
  put(table:'bundles'|'researches',value:Bundle|Research){this.db.prepare(`INSERT INTO ${table}(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data`).run(value.id,JSON.stringify(value));}
  record(r:RecordItem){this.db.prepare('INSERT INTO records(id,research_id,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(r.record_id,r.research_id,JSON.stringify(r));}
  records(id:string){return this.db.prepare('SELECT data FROM records WHERE research_id=? ORDER BY rowid').all(id).map(r=>JSON.parse(r.data as string) as RecordItem);}
  research(id:string){return this.list<Research>('researches').find(r=>r.id===id);}
  remove(table:'bundles'|'researches'|'records',id:string){this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(id);}
  settings():ProviderSettings{const r=this.db.prepare("SELECT data FROM settings WHERE id='main'").get();const saved=r?JSON.parse(r.data as string):{};return {aiProvider:saved.aiProvider==='gemini'?'gemini':'openai',aiModel:typeof saved.aiModel==='string'&&saved.aiModel.trim()?(saved.aiProvider==='gemini'&&saved.aiModel==='gemini-2.5-flash'?aiModels.gemini:saved.aiModel):aiModels[saved.aiProvider==='gemini'?'gemini':'openai']};}
  saveSettings(s:ProviderSettings){this.db.prepare("INSERT INTO settings(id,data) VALUES('main',?) ON CONFLICT(id) DO UPDATE SET data=excluded.data").run(JSON.stringify(s));}
  async backup(path:string){const {backup}=await import('node:sqlite');await backup(this.db,path);chmodSync(path,0o600);}
  close(){this.db.close();}
}
