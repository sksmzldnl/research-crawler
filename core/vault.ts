import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
export const credentialNames=['naverId','naverSecret','kakaoKey','redditAccess','redditRefresh','openaiKey','geminiKey','braveKey','googleKey','serpApiKey','redditClientId','redditClientSecret'] as const;
export type CredentialName=typeof credentialNames[number];
export interface Vault { available:boolean; get(name:string):string; set(name:string,value:string):void; clear():void; status():Record<string,boolean>; }
export class MemoryVault implements Vault {available=false;private values:Record<string,string>={};get(n:string){return this.values[n]||'';}set(n:string,v:string){if(!credentialNames.includes(n as CredentialName))throw Error('지원하지 않는 키 이름');this.values[n]=v;}clear(){this.values={};}status(){return Object.fromEntries(credentialNames.map(n=>[n,!!this.get(n)]));}}
export class EncryptedVault implements Vault {
  available=true;private values:Record<string,string>={};
  constructor(private path:string,private crypto:{encryptString(s:string):Buffer;decryptString(b:Buffer):string}){if(existsSync(path))this.values=JSON.parse(crypto.decryptString(readFileSync(path)));}
  get(n:string){return this.values[n]||'';}
  set(n:string,v:string){if(!credentialNames.includes(n as CredentialName))throw Error('지원하지 않는 키 이름');this.values[n]=v;this.persist();}
  clear(){this.values={};this.persist();}
  status(){return Object.fromEntries(credentialNames.map(n=>[n,!!this.get(n)]));}
  private persist(){mkdirSync(dirname(this.path),{recursive:true,mode:0o700});writeFileSync(this.path,this.crypto.encryptString(JSON.stringify(this.values)),{mode:0o600});}
}
