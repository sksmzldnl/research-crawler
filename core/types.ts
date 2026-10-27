import type {NaverType} from './api-types.js';
export const sources = ['naver_blog','naver_cafearticle'] as const;
export type Source = typeof sources[number];
export type Mode = 'demo'|'live';
export interface Bundle { id:string; name:string; expression:string; exclusions:string; priority:number; suggestions:string[]; aiApproved?:string[]; }
export interface ResearchConfig { name:string; mode:Mode; bundleIds:string[]; sources:Source[]; startDate:string; endDate:string; target:number; removeAds:boolean; deduplicate:boolean; semanticDedupe:boolean; fetchOriginal:boolean; ai:boolean; aiProvider:'openai'|'gemini'; aiModel:string; aiInputPrice:number; aiOutputPrice:number; }
export interface SearchConfig {version:'naver-csv-v1';name:string;naverType:NaverType;bundleIds:string[];target:number;pages:number;startDate:string;endDate:string;includeUnknownDate:boolean;removeAds:boolean;}
export interface Research {browserSearch?:Record<string,unknown>; apiSearch?:SearchConfig; id:string; config:ResearchConfig; bundles:Bundle[]; status:'running'|'paused'|'stopped'|'completed'|'failed'; stage:string; createdAt:string; updatedAt:string; processed:number; totalTasks:number; valid:number; excluded:number; errors:string[]; notes:string[]; usage:{input:number;output:number;cost:number}; cursors:Record<string,number|string>; }
export interface RecordItem { record_id:string; research_id:string; query_bundle_name:string; query_expression:string; matched_keywords:string[]; excluded_keywords:string[]; source_search_engine:string; source_platform:string; source_url:string; title:string; published_at:string|null; published_at_confidence:string; collected_at:string; original_language:string; original_full_text:string; korean_full_translation:string; korean_summary:string; ai_insight?:string; insight_category:string[]; pain_point:string; improvement_request:string; user_behavior:string; workaround:string; sentiment:string; relevance_score:number|null; relevance_reason:string; advertisement_flag:boolean; duplicate_flag:boolean; content_status:'full_text'|'snippet_only'; ai_provider:string; ai_model:string; processing_status:string; review_status:'pending'|'included'|'excluded'; mode:Mode; kind:'post'|'comment'; parent_id:string|null; native_id:string; discovery_paths:string[]; exclusion_reasons:string[]; evidence:string[]; ai_error:string; ai_chunks:string[]; imported_fields?:Record<string,string>; }
export interface Candidate { id:string; url:string; title:string; text:string; date:string|null; language?:string; full?:boolean; kind?:'post'|'comment';parent?:string|null; }
export const aiProviders=['openai','gemini'] as const;
export type AiProvider=typeof aiProviders[number];
export const aiModels:Record<AiProvider,string>={openai:'gpt-4.1-mini',gemini:'gemini-flash-latest'};
export interface ProviderSettings {aiProvider:AiProvider;aiModel:string;}
export interface LocalJob {id:string;researchId?:string;kind:string;status:'running'|'completed'|'partial'|'cancelled'|'failed';total:number;processed:number;failed:number;message:string;lastError?:string;}
export interface State { localJob?:LocalJob; bundles:Bundle[]; researches:Research[]; records:RecordItem[]; settings:ProviderSettings; credentials:Record<string,boolean>; secureStorage:boolean; }
export type ExportRequest={researchId:string;ids?:string[]};
export interface Bridge { call<T=unknown>(method:string,args?:unknown):Promise<T>; }
