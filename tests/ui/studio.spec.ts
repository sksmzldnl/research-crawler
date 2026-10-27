import {test,expect} from '@playwright/test';
test('single workspace edits bundles and keeps search setup/results together with only two menus',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'검색해서 모으고, 한곳에서 정리하세요.'})).toBeVisible();await expect(page.getByRole('navigation',{name:'주 메뉴'}).getByRole('button')).toHaveCount(2);await expect(page.getByRole('heading',{name:'수집 결과',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'＋ 번들 추가',exact:true}).click();await page.getByLabel('번들 이름',{exact:true}).fill('세척 경험');await page.getByLabel('검색 논리식',{exact:true}).fill('재사용 AND (불편 OR 세척) NOT 광고');await page.getByRole('button',{name:'실행 검색어 확인',exact:true}).click();await expect(page.getByText('엔진별 실행 검색어:',{exact:false})).toContainText('"재사용" "세척"');await page.getByRole('button',{name:'번들 저장',exact:true}).click();await expect(page.getByText('세척 경험',{exact:true})).toBeVisible();
 await expect(page.getByLabel('Google · 기존 계정',{exact:true})).toBeDisabled();await expect(page.getByLabel('Reddit · 승인 계정',{exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'자동 검색·수집 시작',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'설정에서 API 연결',exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/unified-workspace.png',fullPage:true});
});
test('imports CSV, preserves original columns on export and reveals AI actions only when expanded',async({page})=>{
 await page.goto('/');await page.getByText('CSV·텍스트·RSS·URL 직접 가져오기',{exact:true}).click();await page.getByLabel('자료 모음 이름',{exact:true}).fill('통합 화면 CSV');await page.getByLabel('CSV 내용 (첫 행은 열 이름)',{exact:true}).fill('제목,본문,기존열\n원문 A,"My cup is hard to wash.",keep\n원문 B,Another experience,=1+1');await page.getByRole('button',{name:'열 확인·미리보기',exact:true}).click();await expect(page.getByRole('heading',{name:'2행 · 3열'})).toBeVisible();await page.getByRole('button',{name:'자료 가져오기',exact:true}).click();await expect(page.getByRole('button',{name:'원문 A',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'검색해서 모으고, 한곳에서 정리하세요.'})).toBeVisible();
 await page.getByLabel('표시한 행 모두 선택',{exact:true}).check();await page.getByText('선택 2건 번역·CSV 정리',{exact:true}).click();await expect(page.getByRole('button',{name:'선택 2건 AI 처리 실행',exact:true})).toBeDisabled();const download=page.waitForEvent('download');await page.getByRole('button',{name:'↓ 파일로 저장',exact:true}).click();const file=await download;const {readFile}=await import('node:fs/promises');const csv=await readFile((await file.path())!,'utf8');expect(csv).toContain('original_column:기존열');expect(csv).toContain("'=1+1");await page.getByRole('button',{name:'원문 A',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('My cup is hard to wash.');await page.getByRole('button',{name:'자료 상세 닫기',exact:true}).click();await page.screenshot({path:'test-results/unified-results.png',fullPage:true});
});
test('settings is the sole secondary menu; appearance persists and narrow windows remain usable',async({page})=>{
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'설정',exact:true}).click();await expect(page.getByRole('heading',{name:'Google Gemini',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'네이버 API Hub',exact:true})).toBeVisible();await expect(page.getByText('Custom Search JSON API는 신규 고객에게 제공되지 않으며',{exact:false})).toBeVisible();await page.getByRole('navigation').getByRole('button',{name:'수집 작업실',exact:true}).click();await page.getByRole('button',{name:'투명도 줄이기',exact:true}).click();await expect(page.locator('.app')).toHaveClass(/reduced-glass/);await page.getByRole('button',{name:'고대비',exact:true}).click();await page.reload();await expect(page.locator('.app')).toHaveClass(/high-contrast/);await page.getByRole('button',{name:'수집 자료 검색 열기',exact:true}).click();await expect(page.getByLabel('자료 검색',{exact:true})).toBeFocused();
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await expect(page.getByRole('button',{name:'자동 검색·수집 시작',exact:true})).toBeVisible();await page.screenshot({path:'test-results/unified-mobile.png',fullPage:true});
});
test('Hub setup needs only keys and scope, enables Naver search and clears stale connection results',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('studio.settingsDraft.v6',JSON.stringify({naverUrl:'https://wrong.example',naverAuth:'naver',naverType:'webkr'})));
 let connections=0;
 await page.route('**/api/call',async route=>{
  const request=route.request().postDataJSON();
  if(request?.method==='connection.test'&&request.args==='naver'){
   connections++;await route.fulfill({json:{result:{message:'API 인증·응답 형식 확인 · 1건 응답 (화면 테스트 응답)',models:[]}}});return;
  }
  await route.continue();
 });
 await page.goto('/');await page.getByRole('navigation').getByRole('button',{name:'설정',exact:true}).click();
 const card=page.locator('section.provider-card').filter({has:page.getByRole('heading',{name:'네이버 API Hub',exact:true})});
 await expect(card.getByLabel('네이버 검색 요청 URL',{exact:true})).toHaveCount(0);await expect(card.getByLabel('네이버 인증 형식',{exact:true})).toHaveCount(0);await expect(card).not.toContainText('지원 준비 중');
 for(const [label,value] of [['Client ID','fixture-id'],['Client Secret','fixture-secret']]){
  const field=card.getByLabel('네이버 API Hub '+label,{exact:true});await field.fill(value);await field.locator('..').locator('..').getByRole('button',{name:'등록',exact:true}).click();await expect(field).toHaveValue('');
 }
 await card.getByLabel('네이버 검색 종류',{exact:true}).selectOption('cafearticle');await card.getByRole('button',{name:'설정 저장·연결 테스트',exact:true}).click();
 await expect(card.getByRole('status')).toContainText('화면 테스트 응답');
 const state=()=>page.evaluate(async()=>{
  const response=await fetch('/api/call',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Client':'local-ui'},body:JSON.stringify({method:'state'})});
  const {result}=await response.json();return {settings:result.settings,credentials:result.credentials};
 });
 await expect.poll(async()=>{const s=await state();return {type:s.settings.naverType,auth:s.settings.naverAuth,url:s.settings.naverUrl,id:s.credentials.naverId,secret:s.credentials.naverSecret};}).toEqual({type:'cafearticle',auth:'gateway',url:'',id:true,secret:true});
 await card.getByLabel('네이버 검색 종류',{exact:true}).selectOption('blog');await expect(card.getByRole('status')).toHaveCount(0);
 await card.getByRole('button',{name:'설정 저장·연결 테스트',exact:true}).click();await expect.poll(()=>connections).toBe(2);await expect(card.getByRole('status')).toContainText('화면 테스트 응답');
 const secret=card.getByLabel('네이버 API Hub Client Secret',{exact:true});await secret.fill('fixture-rotated');await secret.locator('..').locator('..').getByRole('button',{name:'등록',exact:true}).click();await expect(secret).toHaveValue('');await expect(card.getByRole('status')).toHaveCount(0);
 await page.getByRole('navigation').getByRole('button',{name:'수집 작업실',exact:true}).click();await expect(page.getByLabel('네이버 API Hub',{exact:true})).toBeEnabled();await page.getByLabel('네이버 API Hub',{exact:true}).check();await page.getByLabel('다음 (Kakao)',{exact:true}).uncheck();await expect(page.getByRole('button',{name:'자동 검색·수집 시작',exact:true})).toBeEnabled();
 await page.getByRole('navigation').getByRole('button',{name:'설정',exact:true}).click();await card.getByText('기존 NAVER Developers 검색 키',{exact:true}).click();await card.getByLabel('기존 NAVER Developers에서 발급받은 검색 키를 사용합니다.',{exact:true}).check();await page.getByRole('button',{name:'설정 저장',exact:true}).click();await expect.poll(async()=>(await state()).settings.naverAuth).toBe('naver');
});
test('blocks cross-origin or headerless mutations',async({request})=>{const r=await request.post('http://127.0.0.1:4317/api/call',{data:{method:'data.delete',args:'DELETE ALL'}});expect(r.status()).toBe(403);});
