import {JSDOM} from 'jsdom';
export function clean(value:unknown){const dom=new JSDOM(`<body>${String(value??'')}</body>`);try{const doc=dom.window.document;doc.querySelectorAll('script,style').forEach(e=>e.remove());return doc.body.textContent?.replace(/\s+/g,' ').trim()||'';}finally{dom.window.close();}}
