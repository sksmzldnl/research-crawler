import {naverTypes,type NaverType} from './api-types.js';
export const naverHubUrl='https://naverapihub.apigw.ntruss.com/search/v1/';
export function naverEndpoint(type:NaverType){if(!naverTypes.includes(type))throw Error('검색 대상을 선택하세요.');return new URL(naverHubUrl+type);}
