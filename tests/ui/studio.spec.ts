import {test,expect} from '@playwright/test';
test('Korean demo workflow, review, CSV, query validation and navigation',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'경험을 듣고, 변화를 설계하세요.'})).toBeVisible();
 await page.getByRole('button',{name:'새 조사 시작',exact:false}).click();await page.getByLabel('조사 이름',{exact:true}).fill('브라우저 통합 테스트');await page.getByRole('button',{name:'데모 조사 시작 →',exact:true}).click();
 await expect(page.getByRole('heading',{name:'브라우저 통합 테스트'})).toBeVisible();await expect(page.getByText('저장 완료',{exact:true})).toBeVisible({timeout:15000});
 await page.getByRole('navigation',{name:'주 메뉴'}).getByRole('button',{name:'데이터 검토'}).click();await expect(page.getByRole('table')).toBeVisible();await page.getByRole('button',{name:'[합성 데모] 리필 가게에서 겪은 불편',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'한국어 전체 번역'})).toBeVisible();await page.getByRole('button',{name:'유효 자료로 포함'}).click();await page.getByRole('button',{name:'자료 상세 닫기'}).click();
 const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'↓ 파일로 저장'}).click();const file=await downloading;expect(file.suggestedFilename()).toMatch(/\.csv$/);
 await page.getByRole('navigation').getByRole('button',{name:'쿼리 번들'}).click();await page.getByLabel('검색 논리식',{exact:true}).fill('A OR NOT B');await page.getByRole('button',{name:'문법 검사·실행 쿼리 보기'}).click();await expect(page.getByRole('alert')).toContainText('긍정 검색어');await page.getByLabel('검색 논리식',{exact:true}).fill('(제로웨이스트 OR 재사용) AND 후기');await page.getByRole('button',{name:'문법 검사·실행 쿼리 보기'}).click();await expect(page.getByText('검증 완료 · 실제 API 검색어')).toBeVisible();
 await page.getByRole('navigation').getByRole('button',{name:'API 설정'}).click();await expect(page.getByText('현재 보안 저장소를 사용할 수 없어', {exact:false})).toBeVisible();await page.getByRole('navigation').getByRole('button',{name:'도움말'}).click();await expect(page.getByRole('heading',{name:'처음 시작하는 리서처를 위해'})).toBeVisible();await page.screenshot({path:'test-results/help.png',fullPage:true});
 await page.getByRole('navigation').getByRole('button',{name:'대시보드'}).click();await page.getByRole('status').getByRole('button',{name:'닫기',exact:true}).click();await page.setViewportSize({width:1600,height:1200});await page.evaluate(()=>{window.scrollTo(0,0);(document.activeElement as HTMLElement)?.blur();});await page.screenshot({path:'test-results/dashboard.png',fullPage:true});
});
test('blocks cross-origin or headerless mutations',async({request})=>{const r=await request.post('http://127.0.0.1:4317/api/call',{data:{method:'data.delete',args:'DELETE ALL'}});expect(r.status()).toBe(403);});

test('real dashboard statistics, calendar keyboard navigation, search shortcut and persistent appearance',async({page})=>{
 await page.goto('/');
 const progress=page.getByRole('progressbar',{name:'최근 조사 목표 자료 확보율'});
 await expect(progress).toHaveAttribute('aria-valuenow','23');
 await expect(page.getByRole('img',{name:'최근 7일 자료: 유효 7건, 제외 5건. 합성 데모 포함.'})).toBeVisible();
 await page.getByRole('tab',{name:'소스별 자료',exact:true}).click();
 await expect(page.getByRole('progressbar',{name:'네이버 블로그 유효 자료'})).toHaveAttribute('value','7');
 await page.getByRole('tab',{name:'수집 흐름',exact:true}).click();
 const calendar=page.getByRole('grid');const originalName=await calendar.getAttribute('aria-label');
 await page.getByRole('button',{name:'다음 달',exact:true}).click();await expect(calendar).not.toHaveAttribute('aria-label',originalName!);
 await page.getByRole('button',{name:'이전 달',exact:true}).click();await expect(calendar).toHaveAttribute('aria-label',originalName!);
 const firstDay=calendar.getByRole('button',{name:/-01, 시작한 조사/});await firstDay.focus();await page.keyboard.press('ArrowRight');await expect(calendar.getByRole('button',{name:/-02, 시작한 조사/})).toBeFocused();
 await page.getByRole('button',{name:'수집 자료 검색 열기'}).click();await expect(page.getByLabel('자료 검색',{exact:true})).toBeFocused();
 await page.getByRole('navigation').getByRole('button',{name:'대시보드',exact:true}).click();await page.keyboard.press('Control+k');await expect(page.getByLabel('자료 검색',{exact:true})).toBeFocused();
 await page.getByRole('navigation').getByRole('button',{name:'대시보드',exact:true}).click();
 await page.getByRole('button',{name:'투명도 줄이기',exact:true}).click();await expect(page.locator('.app')).toHaveClass(/reduced-glass/);
 await expect(page.locator('.panel').first()).toHaveCSS('backdrop-filter','none');await page.reload();await expect(page.locator('.app')).toHaveClass(/reduced-glass/);
 await page.getByRole('navigation').getByRole('button',{name:'데이터 검토',exact:true}).click();await page.getByRole('button',{name:'[합성 데모] 리필 가게에서 겪은 불편',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCSS('backdrop-filter','none');await page.getByRole('button',{name:'자료 상세 닫기'}).click();await page.getByRole('navigation').getByRole('button',{name:'대시보드',exact:true}).click();
 await page.getByRole('button',{name:'고대비',exact:true}).click();await expect(page.locator('.panel').first()).toHaveCSS('background-color','rgb(255, 255, 255)');await page.reload();await expect(page.locator('.app')).toHaveClass(/high-contrast/);
 await page.screenshot({path:'test-results/high-contrast.png',fullPage:true});
});

test('small window keeps navigation accessible and research fields usable without page overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 await page.getByRole('navigation').getByRole('button',{name:'새 조사',exact:true}).click();await expect(page.getByLabel('조사 이름',{exact:true})).toBeVisible();
 await page.getByLabel('조사 이름',{exact:true}).fill('좁은 창에서도 편집');await page.getByRole('navigation').getByRole('button',{name:'대시보드',exact:true}).click();
 await expect(page.getByRole('heading',{name:'경험을 듣고, 변화를 설계하세요.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 expect(await page.locator('.page').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.getByRole('button',{name:'고대비',exact:true}).click();await expect(page.locator('.app')).toHaveClass(/high-contrast/);
 await page.getByRole('button',{name:'고대비',exact:true}).click();await page.screenshot({path:'test-results/mobile-dashboard.png',fullPage:true});
 await page.getByRole('navigation').getByRole('button',{name:'새 조사',exact:true}).click();await expect(page.getByLabel('조사 이름',{exact:true})).toHaveValue('좁은 창에서도 편집');
 await page.setViewportSize({width:900,height:620});await expect(page.getByRole('button',{name:'고대비',exact:true})).toBeInViewport();await expect(page.getByRole('navigation').getByRole('button',{name:'도움말',exact:true})).toBeInViewport();
});
