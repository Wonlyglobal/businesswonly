const endpoint='https://plhverjihjilnuhlhlxi.supabase.co/functions/v1/business-company-intake';
let rows=[];
const $=s=>document.querySelector(s);
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
function render(){
 const q=$('#search').value.trim().toLowerCase(),matches=rows.filter(r=>[r.payload.company,r.domain,r.payload.country].join(' ').toLowerCase().includes(q));
 $('#companies').replaceChildren();
 for(const row of matches){
  const article=element('article','');article.append(element('h2',row.payload.company),element('small',`${row.domain} · ${row.payload.country} · 版本 ${row.version} · 更新 ${row.updated_at}`));
  const list=element('ol','');
  for(const f of row.payload.facts||[]){
   const li=element('li',f.value);li.append(element('small',`${f.verification==='official_self_report'?'官网自述':'提交人标记独立核验'} · 访问 ${f.accessed_at} · 事件日期 ${f.event_date||'未注明'}`));
   try{const url=new URL(f.source_url);if(url.protocol==='https:'&&!url.username&&!url.password){const a=element('a','打开证据来源 ↗');a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';li.append(a)}}catch{}
   list.append(li);
  }article.append(list);$('#companies').append(article);
 }
 $('#status').textContent=`已读取 ${rows.length} 家，当前匹配 ${matches.length} 家。`+(rows.length?'':' 当前暂无经审核入库记录，不代表历史库没有公司。');
}
async function load(){
 $('#refresh').disabled=true;$('#status').textContent='正在读取最新版本…';
 try{let next=0;const collected=[];do{const r=await fetch(endpoint+'?offset='+next,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('http');const data=await r.json();if(data.schema!=='business-public-research-v1'||!Array.isArray(data.companies))throw Error('schema');collected.push(...data.companies);next=data.next_offset;if(next!==null&&(!Number.isSafeInteger(next)||next>50000))throw Error('pagination');}while(next!==null);rows=collected;render()}catch{$('#status').textContent='新背调库读取失败，不能当作零条。请重试；历史库仍可从返回入口查看。'}finally{$('#refresh').disabled=false}
}
$('#search').addEventListener('input',render);$('#refresh').addEventListener('click',load);load();
