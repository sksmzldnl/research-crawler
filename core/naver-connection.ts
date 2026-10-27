import type {ApiOptions} from './api-types.js';

// Hub protocol corroborated by three independent published clients; provenance
// and the distinction from live-account verification are in docs/NAVER_API_HUB.md.
export const naverHubUrl='https://naverapihub.apigw.ntruss.com/search/v1/{type}';
// Legacy Developers keys use a separate host, path and authentication contract.
export const naverLegacyUrl='https://openapi.naver.com/v1/search/{type}.json';

export function naverTemplate(auth:ApiOptions['naverAuth']){return auth==='naver'?naverLegacyUrl:naverHubUrl;}

export function migrateNaverSettings<T extends Pick<ApiOptions,'naverAuth'|'naverUrl'>>(settings:T):T{
  // 0.5.0's blank legacy default never collected anything. A nonempty legacy
  // setting represents the explicit old-account option. Replace old editable
  // addresses with the account preset so type changes use the corresponding API.
  // Saved research snapshots are not rewritten here.
  const legacy=settings.naverAuth==='naver'&&!!settings.naverUrl.trim();
  return {...settings,naverAuth:legacy?'naver':'gateway',naverUrl:legacy?naverLegacyUrl:''};
}
