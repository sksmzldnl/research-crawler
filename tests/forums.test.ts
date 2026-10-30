import {it,expect,vi} from 'vitest';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {forumArticle,forumAllowed,type ForumBrowser,type ForumType} from '../core/forum.js';
import {forumDate} from '../core/forum-date.js';
import {googleForumUrl,parseGoogleForum,parseForumPage} from '../core/forum-page.js';
import {attachComments,mergeComments} from '../core/comments.js';
import {Service} from '../core/service.js';
import {Store} from '../core/store.js';
import {Network} from '../core/network.js';
import {MemoryVault} from '../core/vault.js';
import type {Bundle} from '../core/types.js';

const urls={mumsnet:'https://www.mumsnet.com/talk/housekeeping/5001001-refill-cleaning',mse:'https://forums.moneysavingexpert.com/discussion/6501001/refill-cleaning'};
const mumsPost=(id:string,text:string,date='15/04/2026 11:30')=>`<div class="post" id="post-${id}"><div class="bar"><span class="nickname"><span class="nick">reader${id}</span></span><span class="post_time">${date}</span></div><div class="message"><p>${text}</p><p>LAST PARAGRAPH ${id} #tag</p><div class="banner-ad">BANNER</div></div></div>`;
const mums=(page=1)=>`<link rel="canonical" href="${urls.mumsnet}"><h1>A B refill</h1><main><span data-reply-count="2"></span><div id="posts">${page===1?mumsPost('11','A B FULL ORIGINAL END'):mumsPost('11','A B FULL ORIGINAL END')}${mumsPost(page===1?'12':'13',page===1?'FIRST COMMENT':'SECOND COMMENT','16/04/2026 08:20')}</div>${page===1?'<div class="pagination"><a rel="next" href="?page=2">Next</a></div>':''}</main>`;
const msePost=(id:string,text:string,original=false)=>`<li class="${original?'ItemDiscussion Discussion':'ItemComment'}" id="${original?'Discussion':'Comment'}_${id}" ${original?'data-discussion-id="6501001"':''}><div class="Author"><a class="Username">reader${id}</a></div><span class="DateCreated"><time datetime="${original?'2026-04-15T11:30:00+01:00':'2026-04-16T11:00:00+01:00'}">Wrong display date</time></span><div class="Message userContent"><p>${text}</p><p>LAST PARAGRAPH ${id} #tag</p><blockquote>QUOTED COMMENT</blockquote><div class="Signature">SIGNATURE</div></div></li>`;
const mse=(page=1)=>`<h1>A B refill</h1><span class="CommentCount"><span class="Number">2</span></span>${msePost('6501001','A B FULL ORIGINAL END',true)}<ol class="Comments">${msePost(page===1?'12':'13',page===1?'FIRST COMMENT':'SECOND COMMENT')}</ol>${page===1?'<div class="Pager"><a rel="next" href="'+urls.mse+'/p2">Next</a></div>':''}`;

it('validates forum identities, canonicalizes page/tracking variants, and isolates navigation to its site',()=>{
 expect(forumArticle(urls.mumsnet+'?pg=2&utm_source=test#post-13')).toEqual({type:'mumsnet',id:'5001001',url:urls.mumsnet,page:2});expect(forumArticle(urls.mse+'/p2#Comment_13')).toEqual({type:'mse',id:'6501001',url:urls.mse,page:2});
 for(const url of ['http://www.mumsnet.com/talk/housekeeping/5001001-topic','https://www.mumsnet.com.evil.org/talk/housekeeping/5001001-topic','https://user:secret@www.mumsnet.com/talk/housekeeping/5001001-topic',urls.mse.replace('.com','.com:8443'),'https://forums.moneysavingexpert.com/discussion/comment/12345','https://www.mumsnet.com/talk','https://127.0.0.1/discussion/6501001/test'])expect(()=>forumArticle(url)).toThrow();
 expect(forumAllowed('mumsnet',urls.mumsnet)).toBe(true);expect(forumAllowed('mse',urls.mumsnet)).toBe(false);expect(forumAllowed('mse','https://accounts.google.com/')).toBe(true);expect(forumAllowed('mse','https://localhost/')).toBe(false);
});
it('uses UK day/month order, preserves date-only precision and handles British summer time without guessing relatives',()=>{
 expect(forumDate('15/04/2026 11:30')).toBe('2026-04-15T11:30:00+01:00');expect(forumDate('15 January 2026 at 11:30AM')).toBe('2026-01-15T11:30:00+00:00');expect(forumDate('15 Apr 2026 1:30 pm')).toBe('2026-04-15T13:30:00+01:00');expect(forumDate('2026-04-15')).toBe('2026-04-15');expect(forumDate('15/04/2026')).toBe('2026-04-15');expect(forumDate('2026-04-15T00:30:00+01:00')).toBe('2026-04-15T00:30:00+01:00');
 for(const value of ['Today 11:30','Yesterday','15 April at 11:30','31/02/2026','2026-02-30T10:00:00Z','15/04/2026 25:30','29/03/2026 01:30'])expect(forumDate(value)).toBeNull();expect(forumDate('25/10/2026 01:30')).toBe('2026-10-25');
});
for(const type of ['mumsnet','mse'] as const){
 it(`${type}: searches without API endpoints, restricts results to real threads, deduplicates and follows Google offsets`,()=>{
  const search=googleForumUrl(type,'"A" "B"',1),next=googleForumUrl(type,'"A" "B"',11),other=urls[type==='mumsnet'?'mse':'mumsnet'];const html=`<div id="search"><div class="g"><a href="${urls[type]}"><h3>A B thread</h3></a><p class="VwiC3b">SNIPPET</p></div><a href="${urls[type]}?utm_source=test"><h3>Duplicate</h3></a><a href="${other}"><h3>Other forum</h3></a><a href="https://www.mumsnet.com/talk"><h3>Category</h3></a></div><a id="pnnext" href="${next.replaceAll('&','&amp;')}">Next</a>`;
  expect(new URL(search).hostname).toBe('www.google.com');expect(parseGoogleForum(type,html,search)).toMatchObject({items:[{url:urls[type],text:'SNIPPET',date:null,language:'en'}],next:11});expect(parseGoogleForum(type,html,search)?.items).toHaveLength(1);expect(parseGoogleForum(type,'<h1>Unknown</h1>',search)).toBeNull();expect(parseGoogleForum(type,'<p>No results found</p>',search)).toEqual({items:[],next:null});
 });
 it(`${type}: joins all original paragraphs and paged comments, deduplicates repeated OP, preserves quotes and UK dates`,()=>{
  const html=type==='mumsnet'?mums:mse,page2=type==='mumsnet'?urls.mumsnet+'?page=2':urls.mse+'/p2',first=parseForumPage(type,html(1),urls[type],true,true)!,second=parseForumPage(type,html(2),page2,true,true,first.postId)!,comments=mergeComments(first.comments,second.comments),body=attachComments(first.original!,comments);
  expect(first.next).toBe(page2);expect(first.comments.status).toBe('partial');expect(comments.status).toBe('complete');expect(comments.items).toHaveLength(2);expect(body.text.indexOf('FULL ORIGINAL END')).toBeLessThan(body.text.indexOf('FIRST COMMENT'));expect(body.text).toContain('SECOND COMMENT');expect(body.text).toContain('LAST PARAGRAPH 13');expect(body.text).not.toContain('#tag');expect(body.text).not.toContain('BANNER');expect(body.text).not.toContain('SIGNATURE');expect(body.date).toBe('2026-04-15T11:30:00+01:00');expect(comments.items.every(c=>c.parentId===null)).toBe(true);
  if(type==='mse')expect(body.markdown).toContain('> QUOTED COMMENT');expect(parseForumPage(type,html(1).replace('data-reply-count="2"','data-reply-count="20"').replace('class="Number">2','class="Number">20'),urls[type])?.comments.status).toBe('partial');
 });
 it(`${type}: collects and checks through the same browser with no keys, preserves source, and exports one original-plus-comments file`,async()=>{
  const html=type==='mumsnet'?mums:mse,first=parseForumPage(type,html(),urls[type])!,second=parseForumPage(type,html(2),type==='mumsnet'?urls[type]+'?page=2':urls[type]+'/p2',true,false,first.postId)!,desktop:ForumBrowser={state:()=>({available:true,busy:false,status:'ready',message:''}),open:vi.fn(async()=>{}),clear:vi.fn(async()=>{}),close(){},search:vi.fn(async()=>({items:[{id:forumArticle(urls[type]).id,url:urls[type],title:'A B topic',text:'search snippet',date:null},{id:forumArticle(urls[type]).id,url:urls[type].replace('refill-cleaning','alternate-slug'),title:'A B duplicate',text:'search snippet',date:null}],next:null})),read:vi.fn(async()=>attachComments(first.original!,mergeComments(first.comments,second.comments)))},directory=await mkdtemp(join(tmpdir(),'forum-')),store=new Store(':memory:'),send=vi.fn(),service=new Service(store,new MemoryVault(),new Network(send),undefined,undefined,{[type]:desktop});
  try{service.selectDirectory=async()=>directory;await service.call('output.choose',undefined);const bundle=store.list<Bundle>('bundles')[0];store.put('bundles',{...bundle,expression:'A AND B'});const research=await service.call('search.start',{name:type,naverType:type,bundleIds:[bundle.id],target:2,pages:1,outputDirectory:directory,outputFormat:'json'}) as {id:string};await service.idle();expect(store.research(research.id)?.valid).toBe(1);expect(store.records(research.id)).toHaveLength(1);const row=store.records(research.id)[0],file=JSON.parse(await readFile(row.saved_path!,'utf8'));expect(file.body).toContain('SECOND COMMENT');expect(file.post_body).not.toContain('SECOND COMMENT');expect(file.platform).toBe(type);expect(row.original_language).toBe('en');expect(file.comments).toHaveLength(2);await service.call('connection.check',{provider:type});await service.idle();expect(service.state().connectionCheck?.scopes[0]).toMatchObject({type,search:'passed',original:'passed',comments:{count:2,status:'complete'}});await service.call('connection.check',{url:urls[type]});await service.idle();expect(service.state().connectionCheck?.scopes[0]).toMatchObject({type,manual:true,search:'skipped',original:'passed'});await service.call('community.browser.open',{provider:type});expect(desktop.open).toHaveBeenCalled();await service.call('community.browser.clear',{provider:type});expect(desktop.clear).toHaveBeenCalled();expect(service.state().connectionCheck).toBeUndefined();expect(send).not.toHaveBeenCalled();}finally{service.close();await service.idle();store.close();await rm(directory,{recursive:true,force:true});}
 });
}
it('rejects mismatched thread metadata and unrelated next links; a later-page comment is never an original',()=>{
 expect(parseForumPage('mumsnet',mums().replace(urls.mumsnet,urls.mumsnet.replace('5001001','5001002')),urls.mumsnet)).toBeNull();expect(parseForumPage('mse',mse().replace('data-discussion-id="6501001"','data-discussion-id="6501002"'),urls.mse)).toBeNull();expect(parseForumPage('mse',mse().replace(urls.mse+'/p2',urls.mse.replace('6501001','6501002')+'/p2'),urls.mse)?.next).toBeUndefined();
 const source='<div id="posts">'+mumsPost('12','ONLY A COMMENT')+'</div>';const later=parseForumPage('mumsnet',source,urls.mumsnet+'?page=2')!;expect(later.original).toBeUndefined();expect(later.comments.items).toHaveLength(1);expect(later.comments.status).toBe('partial');
});

it('ignores quoted and edited timestamps even when they occur before the actual publication metadata',()=>{
 const html=mse().replace('<span class="DateCreated">','<blockquote><time datetime="2000-01-01T00:00:00Z">quoted</time></blockquote><time itemprop="dateModified" datetime="2026-10-30T00:00:00Z">edited</time><span class="DateCreated">');expect(parseForumPage('mse',html,urls.mse)?.original?.date).toBe('2026-04-15T11:30:00+01:00');
});

it('does not promote a missing MSE original from a comment or count embedded quoted post markup as another comment',()=>{
 const onlyComment=msePost('12','ONLY COMMENT').replace('class="ItemComment"','class="ItemComment" data-discussion-id="6501001"');expect(parseForumPage('mse',onlyComment,urls.mse)?.original).toBeUndefined();
 const html=mums().replace('FIRST COMMENT','FIRST COMMENT<blockquote>'+mumsPost('99','QUOTED POST MARKUP')+'</blockquote>');expect(parseForumPage('mumsnet',html,urls.mumsnet)?.comments.items).toHaveLength(1);
});
