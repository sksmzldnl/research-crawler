import {it,expect} from 'vitest';
import {extractOriginal,extractCafeResponse,OriginalReader} from '../core/original.js';
import {Network} from '../core/network.js';
const url='https://blog.naver.com/test/1';
const article='<span class="se_publishDate">2026.04.15</span><div class="se-main-container"><h2>제로웨이스트 후기</h2><p>제로웨이스트는 계속 사용합니다. #제로웨이스트 #한글_태그 #zero_waste ＃재사용 #붙임#태그</p><a href="/tag/linked"><span>#</span><span>링크태그</span></a><p>C# / C++ https://example.org/page#fragment www.example.org/#fragment</p><a href="https://example.org/page#fragment">참고 문서</a><pre>#코드유지</pre><code>#인라인코드</code><div class="banner-ad">배너광고</div></div>';
it('keeps hashtags by default and removes whole hashtag words only when selected',()=>{
 const original=extractOriginal(article,url,false),cleaned=extractOriginal(article,url,false,true);
 for(const tag of ['#제로웨이스트','#한글_태그','#zero_waste','＃재사용','#붙임','#태그','#링크태그']){expect(original.text).toContain(tag);expect(cleaned.text).not.toContain(tag);expect(cleaned.markdown).not.toContain(tag);}
 expect(cleaned.text).toContain('제로웨이스트는 계속 사용합니다.');expect(cleaned.text).toContain('배너광고');expect(cleaned.markdown).not.toContain('/tag/linked');expect(cleaned.date).toBe(original.date);
});
it('preserves Markdown headings, normal links, URL fragments and literal code',()=>{
 const cleaned=extractOriginal(article,url,true,true);
 expect(cleaned.markdown).toContain('## 제로웨이스트 후기');expect(cleaned.markdown).toContain('[참고 문서](https://example.org/page#fragment)');
 for(const value of ['C# / C++','https://example.org/page#fragment','www.example.org/#fragment','#코드유지','#인라인코드'])expect(cleaned.text).toContain(value);
 expect(cleaned.text).not.toContain('배너광고');
});
it('applies the option to both Knowledge questions and answers while preserving generated headings',()=>{
 const body=extractOriginal('<div class="question-content"><div class="c-heading__content">질문 본문 #질문태그</div></div><div class="answerDetail">답변 본문 #답변태그</div>','https://kin.naver.com/qna/detail.naver?docId=493851945',true,true);
 expect(body.markdown).toContain('## 질문');expect(body.markdown).toContain('## 답변 1');expect(body.text).toContain('질문 본문');expect(body.text).toContain('답변 본문');expect(body.text).not.toContain('태그');
});
it('applies the option to the public Cafe JSON response and preserves its publication date',()=>{
 const cafe='https://cafe.naver.com/test/15641',data={result:{article:{id:15641,contentHtml:'<p>카페 본문 #카페태그</p>',writeDate:'2026-04-15'}}};
 expect(extractCafeResponse(data,cafe,true)?.text).toContain('#카페태그');const cleaned=extractCafeResponse(data,cafe,true,true)!;expect(cleaned.text).toBe('카페 본문');expect(cleaned.markdown).toBe('카페 본문');expect(cleaned.date).toContain('2026-04-15');
});
it('carries the option through embedded Cafe article data and blog frames',async()=>{
 const cafe='https://cafe.naver.com/test/15641',data={result:{article:{id:15641,contentHtml:'<p>카페 본문 #카페태그</p>',writeDate:'2026-04-15'}}};
 const embedded=new OriginalReader(new Network(async()=>new Response('<script type="application/json">'+JSON.stringify(data)+'</script>')));
 expect((await embedded.read(cafe,true,new AbortController().signal,true)).text).toBe('카페 본문');
 const framed=new OriginalReader(new Network(async raw=>new Response(raw.includes('PostView')?article:'<iframe id="mainFrame" src="/PostView.naver?blogId=test&logNo=1"></iframe>')));
 expect((await framed.read(url,true,new AbortController().signal,true)).text).not.toContain('#제로웨이스트');
});
