export const apiEngines=['naver','daum','brave','google','reddit'] as const;
export type ApiEngine=typeof apiEngines[number];
export const apiLabels:Record<ApiEngine,string>={naver:'네이버 API Hub',daum:'다음 (Kakao)',brave:'Brave 웹 검색',google:'Google · 기존 계정',reddit:'Reddit · 승인 계정'};
export interface ApiOptions {naverUrl:string;naverType:'blog'|'cafearticle'|'webkr';naverAuth:'naver'|'gateway';daumType:'web'|'blog'|'cafe';googleCx:string;googleExisting:boolean;redditApproved:boolean;redditClientId:string;redditComments:boolean;}
export function apiOptions(settings:ApiOptions):ApiOptions{const {naverUrl,naverType,naverAuth,daumType,googleCx,googleExisting,redditApproved,redditClientId,redditComments}=settings;return {naverUrl,naverType,naverAuth,daumType,googleCx,googleExisting,redditApproved,redditClientId,redditComments};}
export const apiDefaults:ApiOptions={naverUrl:'',naverType:'blog',naverAuth:'naver',daumType:'web',googleCx:'',googleExisting:false,redditApproved:false,redditClientId:'',redditComments:false};
