import {expect} from '@playwright/test';
import {_electron as electron} from 'playwright';
import {mkdtemp,mkdir,rm,appendFile,writeFile,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const data=await mkdtemp(join(tmpdir(),'studio-api-'));
const args=process.env.STUDIO_EXECUTABLE_PATH?[]:['.'];
if(process.env.STUDIO_DESKTOP_HEADLESS==='1')args.unshift('--no-sandbox','--ozone-platform=headless','--disable-gpu');
const hubHeaders={'X-NCP-APIGW-API-KEY-ID':'fixture-naver-id','X-NCP-APIGW-API-KEY':'fixture-naver-secret'};
const item=(word,id,text)=>({link:'https://example.com/'+word.replaceAll(' ','-')+'-'+id,title:word+' '+id,description:text,postdate:'20261001'});
const body=(word,second)=>({total:101,items:second?[item(word,'second',word+' second actual experience')]:[item(word,'first',word+' first actual experience'),...Array.from({length:99},()=>word==='FAIL'?item(word,'first',word+' first actual experience'):item(word,'ad',word+' 협찬 제공받음'))]});
const routes=[
 {host:'naverapihub.apigw.ntruss.com',path:'/search/v1/cafearticle',params:{query:'제로웨이스트',start:'1',format:'json'},headers:hubHeaders,status:200,body:{total:0,items:[]}},
 ...[{q:'"A" "B"',word:'A B'},{q:'"FAIL"',word:'FAIL'}].flatMap(({q,word})=>[1,101].map(start=>({host:'naverapihub.apigw.ntruss.com',path:'/search/v1/cafearticle',params:{query:q,start:String(start),format:'json',display:'100',sort:'date'},headers:hubHeaders,status:word==='FAIL'&&start===101?401:200,body:body(word,start===101)}))),
 {host:'dapi.kakao.com',path:'/v2/search/web',params:{query:'제로웨이스트',page:'1'},headers:{Authorization:'KakaoAK fixture-kakao'},status:200,body:{meta:{is_end:true},documents:[{url:'https://example.com/daum-test',title:'연결 확인',contents:'다음 검색 응답',datetime:'2026-10-01T12:00:00+09:00'}]}},
];
const fixturePath=join(data,'api-fixtures.json'),logPath=join(data,'api-requests.jsonl');
await writeFile(fixturePath,JSON.stringify(routes));let app;
const requests=async()=>((await readFile(logPath,'utf8')).trim().split('\n').filter(Boolean).map(s=>JSON.parse(s)));
try{
 await mkdir('test-results',{recursive:true});
 app=await electron.launch({executablePath:process.env.STUDIO_EXECUTABLE_PATH||undefined,args,timeout:20000,env:{...process.env,STUDIO_TEST_DATA_DIR:data,STUDIO_TEST_API_FIXTURES:'1'}});
 app.process().stderr?.on('data',chunk=>{void appendFile('test-results/desktop-stderr.log',chunk).catch(()=>{});});
 const win=await app.firstWindow();await win.getByRole('heading',{name:'검색해서 모으고, 한곳에서 정리하세요.'}).waitFor();
 assert.equal(await win.getByRole('navigation',{name:'주 메뉴'}).getByRole('button').count(),2);
 await win.getByRole('navigation').getByRole('button',{name:'설정',exact:true}).click();
 const naver=win.locator('section.provider-card').filter({has:win.getByRole('heading',{name:'네이버 API Hub',exact:true})});
 assert.equal(await naver.getByLabel('네이버 검색 요청 URL',{exact:true}).count(),0);assert.equal(await naver.getByLabel('네이버 인증 형식',{exact:true}).count(),0);await expect(naver).not.toContainText('지원 준비 중');
 for(const [label,value] of [['Client ID','fixture-naver-id'],['Client Secret','fixture-naver-secret']]){
  const field=naver.getByLabel('네이버 API Hub '+label,{exact:true});await field.fill(value);await field.locator('..').locator('..').getByRole('button',{name:'등록',exact:true}).click();await expect(field).toHaveValue('');
 }
 await naver.getByLabel('네이버 검색 종류',{exact:true}).selectOption('cafearticle');
 await naver.getByRole('button',{name:'설정 저장·연결 테스트',exact:true}).click();await naver.getByRole('status').filter({hasText:'API 인증·응답 형식 확인'}).waitFor();
 const savedNaver=await win.evaluate(async()=>{const s=await window.studio.call('state');return {id:s.credentials.naverId,secret:s.credentials.naverSecret,auth:s.settings.naverAuth,url:s.settings.naverUrl,type:s.settings.naverType};});
 assert.deepEqual(savedNaver,{id:true,secret:true,auth:'gateway',url:'',type:'cafearticle'});
 const naverCalls=(await requests()).filter(r=>r.host==='naverapihub.apigw.ntruss.com');assert.equal(naverCalls.length,1);assert.ok(naverCalls[0].authenticated);assert.equal(naverCalls[0].path,'/search/v1/cafearticle');assert.equal(naverCalls[0].params.format,'json');
 await naver.screenshot({path:'test-results/desktop-naver-settings.png'});
 const card=win.locator('section.provider-card').filter({has:win.getByRole('heading',{name:'다음 (Kakao)',exact:true})});
 await card.getByLabel('다음 (Kakao) REST API 키',{exact:true}).fill('fixture-kakao');await card.getByRole('button',{name:'등록',exact:true}).click();await card.getByRole('button',{name:'설정 저장·연결 테스트',exact:true}).click();await card.getByRole('status').filter({hasText:'API 인증·응답 형식 확인'}).waitFor();
 await win.getByRole('navigation').getByRole('button',{name:'수집 작업실',exact:true}).click();
 await win.evaluate(async()=>{const s=await window.studio.call('state');await window.studio.call('bundle.save',{...s.bundles[0],expression:'A AND B'});});await win.getByText('A AND B',{exact:true}).waitFor();
 await win.getByLabel('네이버 API Hub',{exact:true}).check();await win.getByLabel('다음 (Kakao)',{exact:true}).uncheck();
 await win.getByLabel('수집 이름',{exact:true}).fill('네이버 자동 수집 검증');await win.getByLabel('목표 유효 자료',{exact:true}).fill('2');await win.getByLabel('검색어당 최대 요청 페이지',{exact:true}).fill('2');
 await win.getByRole('button',{name:'자동 검색·수집 시작',exact:true}).click();await win.getByText('수집 완료',{exact:true}).waitFor({timeout:20000});
 const result=await win.evaluate(async()=>{const s=await window.studio.call('state');return {valid:s.researches[0].valid,excluded:s.researches[0].excluded,records:s.records.length,ai:s.records.some(r=>r.ai_provider),engine:s.records[0].source_platform,endpoint:s.researches[0].apiSearch.apiOptions.naverUrl};});
 assert.deepEqual(result,{valid:2,excluded:1,records:3,ai:false,engine:'naver_cafearticle',endpoint:'https://naverapihub.apigw.ntruss.com/search/v1/{type}'});
 const calls=(await requests()).filter(r=>r.params.query==='"A" "B"');assert.equal(calls.length,2);assert.ok(calls.every(c=>c.authenticated&&c.host==='naverapihub.apigw.ntruss.com'&&c.path==='/search/v1/cafearticle'));assert.deepEqual(calls.map(c=>c.params.start),['1','101']);assert.equal(app.windows().length,1);
 const pausedId=await win.evaluate(async()=>{const s=await window.studio.call('state'),b=await window.studio.call('bundle.save',{...s.bundles[0],expression:'FAIL'});return (await window.studio.call('search.start',{name:'인증 오류 재개 검증',engines:['naver'],bundleIds:[b.id],sites:[],target:2,pages:2,startDate:'',endDate:'',includeUnknownDate:true,removeAds:true,fetchOriginal:false})).id;});
 await expect.poll(()=>win.evaluate(async id=>(await window.studio.call('state')).researches.find(r=>r.id===id)?.status,pausedId),{timeout:15000}).toBe('paused');
 routes.find(r=>r.params.query==='"FAIL"'&&r.params.start==='101').status=200;await writeFile(fixturePath,JSON.stringify(routes));await win.evaluate(id=>window.studio.call('search.resume',id),pausedId);
 await expect.poll(()=>win.evaluate(async id=>(await window.studio.call('state')).researches.find(r=>r.id===id)?.status,pausedId),{timeout:15000}).toBe('completed');
 const resumed=await win.evaluate(async id=>{const s=await window.studio.call('state');return s.records.filter(r=>r.research_id===id).length;},pausedId);assert.equal(resumed,2);
 assert.deepEqual((await requests()).filter(r=>r.params.query==='"FAIL"').map(r=>r.params.start),['1','101','101']);
 const imported=await win.evaluate(async()=>{const r=await window.studio.call('import.save',{name:'CSV 검증',kind:'csv',text:'title,text,custom\n자료,hello world,original'});const row=(await window.studio.call('state')).records.find(x=>x.research_id===r.id);return {text:row.original_full_text,original:row.imported_fields.custom,ai:row.ai_provider};});assert.deepEqual(imported,{text:'hello world',original:'original',ai:''});
 await win.screenshot({path:'test-results/desktop.png'});
 console.log('PASS: Naver API Hub key-only setup + gateway connection fixture + query-bundle automatic search + real start cursors 1/101 + filtering + 401 pause/resume + no AI collection + Daum connection + CSV preservation. Responses are fixtures; live vendor account calls are unverified.');
}catch(error){
 console.error('Desktop smoke failure:',error.message);if(app)for(const [i,w] of app.windows().entries()){try{console.error(await w.locator('body').innerText());await w.screenshot({path:`test-results/desktop-failure-${i}.png`});}catch{}}throw error;
}finally{if(app)await app.close();await rm(data,{recursive:true,force:true,maxRetries:10,retryDelay:200});}
