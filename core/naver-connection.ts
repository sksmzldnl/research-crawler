import type {ApiOptions} from './api-types.js';

// Verified legacy Search API contract. These are not API Hub endpoints.
// https://developers.naver.com/docs/serviceapi/search/blog/blog.md
export const naverLegacyUrl='https://openapi.naver.com/v1/search/{type}.json';

// The uploaded Application guide confirms the Hub's gateway headers, but neither
// supplied PDF specifies its Search endpoint. Keep Hub requests unavailable until
// the official service contract is verified; never send Hub keys to a guessed URL.
export const naverHubPending='네이버 API Hub 자동 연결은 아직 지원 준비 중입니다. 키는 저장할 수 있으며, 연결 지원이 완료된 앱 업데이트가 필요합니다.';

export function naverConnectionIssue(options:Pick<ApiOptions,'naverAuth'|'naverUrl'>){
  return options.naverAuth==='gateway'&&!options.naverUrl.trim()?naverHubPending:'';
}

export function migrateNaverSettings<T extends Pick<ApiOptions,'naverAuth'|'naverUrl'>>(settings:T):T{
  // 0.5.0 defaulted to legacy authentication even for new Hub users. An empty
  // address could never start collection, so it is safe to move that unused
  // configuration to Hub mode. Existing configured accounts/snapshots stay intact.
  return settings.naverUrl.trim()?settings:{...settings,naverAuth:'gateway'};
}
