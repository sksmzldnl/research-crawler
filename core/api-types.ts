export const naverTypes=['blog','cafearticle','kin'] as const;
export type NaverType=typeof naverTypes[number];
export const naverLabels:Record<NaverType,string>={blog:'네이버 블로그',cafearticle:'네이버 카페',kin:'네이버 지식인'};

export const searchTypes=[...naverTypes,'reddit'] as const;
export type SearchType=typeof searchTypes[number];
export const searchLabels:Record<SearchType,string>={...naverLabels,reddit:'Reddit · Google 검색'};
