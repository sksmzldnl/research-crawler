const hosts=new Set(['blog.naver.com','m.blog.naver.com','cafe.naver.com','m.cafe.naver.com']);
export function publicNaverUrl(raw:string){const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||!hosts.has(u.hostname)||u.username||u.password||u.port)throw Error('네이버 블로그·카페의 공개 게시글 주소만 수집할 수 있습니다.');u.protocol='https:';u.hash='';return u.href;}
