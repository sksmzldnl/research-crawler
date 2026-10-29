import type {ApiPage} from './search-api.js';
import type {OriginalSource} from './original.js';
export interface RedditBrowserState {available:boolean;busy:boolean;status:'idle'|'working'|'needs_user'|'ready';message:string;}
export interface RedditBrowser extends OriginalSource {
 state():RedditBrowserState;
 search(query:string,start:number,signal:AbortSignal,display?:number,community?:string):Promise<ApiPage>;
 open():Promise<void>;
 clear():Promise<void>;
 close():void;
}
export class BrowserAttentionError extends Error {}
