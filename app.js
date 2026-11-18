// Reformed Thinking — curated topics + full-text search (rag.js) + on-device AI summaries.
(()=>{
const $=s=>document.querySelector(s), out=$('#out'), qi=$('#q');
let KB=[], tab='calvin', current=null, alts=[], lastQ='', curAI=null;
const STOP=new Set('a an the of to in on is are was were be do does did what whats how why who which when where can could should would will i me my we our you your about and or for with as by it this that there their them they he his god s t vs versus difference between teach teaches believe believes view views think say says calvin calvinist calvinism calvinists reformed luther lutheran lutherans lutheranism doctrine christian christians bible biblical according mean meaning explain tell'.split(' '));
const stem=w=>w.replace(/'s$/,'').replace(/(ies)$/,'y').replace(/(ing|edly|ed|es|s)$/,'');
const toks=s=>s.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' -]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w));
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[b.length]}
function index(){KB.forEach(t=>{t._phr=[t.title,...t.keywords].map(k=>k.toLowerCase());t._w=new Map();
  const add=(w,s)=>{w=stem(w);if(w.length<2||STOP.has(w))return;t._w.set(w,Math.max(t._w.get(w)||0,s))};
  t.keywords.forEach(k=>{const w=toks(k);w.forEach(x=>add(x,w.length>1?2:3))});toks(t.title).forEach(w=>add(w,3));
  t.questions.forEach(q=>toks(q).forEach(w=>add(w,1)));toks(t.summary).forEach(w=>add(w,.5));});}
function score(q){const ql=' '+q.toLowerCase().replace(/[’]/g,"'")+' ';const qt=toks(q).map(stem).filter(w=>w.length>1);
  return KB.map(t=>{let s=0;t._phr.forEach(p=>{if(p.includes(' ')&&ql.includes(p))s+=6+p.length/6;});
    qt.forEach(w=>{if(t._w.has(w))s+=t._w.get(w);else if(w.length>=5){for(const [k,v] of t._w){if(k.length>=5&&lev(w,k)<=1){s+=v*.7;break}}}});
    return {t,s}}).sort((a,b)=>b.s-a.s);}
const providers=[q=>{const r=score(q);return {best:r[0].s>=2?r[0].t:null,alts:r.filter(x=>x.s>0&&x.s>=r[0].s*0.4).slice(0,5).map(x=>x.t)}}];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const SUGGEST=['Does God choose who will be saved?','Is Christ really present in the Lord’s Supper?','Should infants be baptized?','Can a true believer lose salvation?','What is justification by faith?','Should Christians swear oaths?','Is it wrong to charge interest?','What is the role of the Holy Spirit?'];
const getRecent=()=>{try{return JSON.parse(localStorage.getItem('rt_recent')||'[]')}catch(_){return []}};
function addRecent(q){const r=getRecent().filter(x=>x.toLowerCase()!==q.toLowerCase());r.unshift(q);localStorage.setItem('rt_recent',JSON.stringify(r.slice(0,6)))}
const SIDE={calvin:{name:'Calvin',src:'Calvin’s Institutes',cls:'cal',miss:'Calvin doesn’t address this directly',none:'Calvin’s Institutes don’t discuss this'},lutheran:{name:'Lutheran',src:'Book of Concord & Luther',cls:'lut',miss:'The Book of Concord and Luther don’t address this directly',none:'The Book of Concord and Luther don’t discuss this'}};
function vchips(vs){if(!vs||!vs.length)return '';return `<div class="vchips">${vs.map(v=>`<details class="vd"><summary>${esc(v.ref)}</summary><p>${v.vs.map(x=>(v.vs.length>1?`<sup>${x[0]}</sup>`:'')+esc(x[1])).join(' ')}</p></details>`).join('')}</div>`}
const curVerses=S=>(S.verses||[]).map(v=>({ref:v.ref,vs:v.v.map(x=>[x[1],x[2]])}));
function quotes(qs){return qs.map(q=>`<blockquote>“${esc(q.text)}”<cite>${q.url?`<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.cite)}</a>`:esc(q.cite)}</cite></blockquote>`).join('')}
const fold=(label,n,body,open)=>`<details class="fold"${open?' open':''}><summary>${label}${n!=null?` <span class="count">${n}</span>`:''}</summary><div class="fbody">${body}</div></details>`;
const isSac=t=>!!(t&&(t.category==='Sacraments'||t.sac));
const SACRX=/\b(sacrament|baptis|lord'?s supper|supper|communion|eucharist)/i;
let mode='simple';
const seg=()=>`<div class="seg" role="group" aria-label="Detail level"><button data-mode="simple" class="${mode==='simple'?'on':''}">Simple</button><button data-mode="advanced" class="${mode==='advanced'?'on':''}">Advanced</button></div>`;
function more(){return `${alts.length?`<p class="also">Not quite? ${alts.map(a=>`<button data-id="${a.id}">${esc(a.title)}</button>`).join('')}</p>`:''}${lastQ?`<p class="also"><button data-full="1">Search the full texts instead</button></p>`:''}`}
// ---------- AI block ----------
function linkRefs(t,side){return esc(t).replace(/\[([CL]?)(\d+)\]/g,(m,p,n)=>{const s=p==='C'?'calvin':p==='L'?'lutheran':side;return `<button class="ref" data-ref="p-${s}-${n}" aria-label="Go to source ${n}">${n}</button>`})}
function aiBlock(kind,ctx,P,weak,side){const A=RAG.AI;const id='ai-'+kind+(weak?'-w':'');if(!ctx||!P||!P.length)return '';
  if(A.state==='ready'){setTimeout(()=>{if(!document.getElementById(id))return;RAG.generate(kind,ctx.q,ctx.cal,ctx.lut,(txt,done)=>{const e=document.getElementById(id);if(!e)return;
      const c=RAG.clean(txt,P,{max:kind==='advanced'?4:3});
      if(done&&(c.notAddressed||!c.text)){e.closest('.aibox').innerHTML=weak?'':`<p class="note">No reliable AI summary for this one. The sources are below.</p>`;return}
      e.innerHTML=c.text?linkRefs(c.text,side):'<span class="note">Writing…</span>';e.classList.toggle('streaming',!done)},weak)},0);
    return `<div class="aibox"><span class="aitag">AI summary</span><p id="${id}" class="aitext streaming"><span class="note">Reading the sources…</span></p></div>`}
  if(A.state==='loading')return `<div class="aibox"><span class="aitag">AI summary loading <b id="aipct">${Math.round((A.pct||0)*100)}%</b></span><div class="bar"><i style="width:${Math.round((A.pct||0)*100)}%"></i></div><p class="note small">First time only: a free AI model downloads to your phone (~0.7 GB, use Wi-Fi).</p></div>`;
  if(A.state==='unsupported'||A.state==='error')return '';
  return `<div class="aibox"><span class="aitag">AI summary starting…</span><div class="bar"><i style="width:0%"></i></div></div>`}
// ---------- Curated topics ----------
function curatedSide(t,k){const S=t[k];const ctx=curAI&&curAI.t===t?curAI:null;const P=ctx&&ctx[k==='calvin'?'cal':'lut'];const weak=ctx&&ctx.w[k];
  const vs=curVerses(S);
  return `<section class="card answer"><p class="kicker ${SIDE[k].cls}">${k==='calvin'?'Calvinist answer':'Lutheran answer'}</p><h2 class="topic">${esc(t.title)}</h2>${S.answer.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('')}
   ${S.points&&S.points.length?`<ul class="pts">${S.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}
   ${ctx&&!weak?aiBlock(k,ctx,P,false,k):''}</section>
   ${S.quotes.length?fold('Quotes from '+(k==='calvin'?'Calvin':'the Lutheran sources'),S.quotes.length,quotes(S.quotes)+(S.refs&&S.refs.length?`<ul class="pts note">${S.refs.map(r=>`<li>${esc(r)} (paraphrased)</li>`).join('')}</ul>`:'')):''}
   ${vs.length?fold('Bible verses (KJV)',vs.length,vchips(vs)):''}
   ${ctx&&P&&P.length&&!weak?fold('More from the full texts',Math.min(P.length,6),passages(P,k)):''}
   ${more()}`}
function curatedCompare(t){const C=t.compare;const ctx=curAI&&curAI.t===t?curAI:null;const weak=ctx&&ctx.w.calvin&&ctx.w.lutheran;const P=ctx?ctx.cal.slice(0,3).concat(ctx.lut.slice(0,3)):null;
  if(mode==='simple')return seg()+`<section class="card answer"><p class="kicker" style="color:var(--cmp)">Simple comparison</p><h2 class="topic">${esc(t.title)}</h2><ul class="pts big">${C.simple.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${ctx&&!weak?aiBlock('simple',ctx,P,false,'calvin'):''}</section>`+more();
  return seg()+`<section class="card"><p class="kicker" style="color:var(--cmp)">Side by side</p><h2 class="topic">${esc(t.title)}</h2><table><tr><th></th><th class="cal">Calvinist</th><th class="lut">Lutheran</th></tr>${C.table.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></section>
  <section class="card"><h3 style="color:var(--cmp)">In summary</h3><p>${esc(C.summary)}</p>${ctx&&!weak?aiBlock('advanced',ctx,P,false,'calvin'):''}</section>
  ${fold('Where they agree',C.agree.length,`<ul class="pts">${C.agree.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,true)}
  ${fold('Where they differ',C.differ.length,`<ul class="pts">${C.differ.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`,true)}`+more()}
function syncTabs(){document.querySelectorAll('.tabs button').forEach(b=>{b.hidden=false;b.classList.toggle('on',b.dataset.tab===tab);b.setAttribute('aria-selected',b.dataset.tab===tab)});}
function render(){syncTabs();if(!current)return home();if(current.src)return renderSrc();
  out.innerHTML=tab==='compare'?curatedCompare(current):curatedSide(current,tab);}
function home(){const pick=SUGGEST;const rec=getRecent();syncTabs();
  out.innerHTML=`<section class="card intro"><h2 class="topic">Ask anything</h2><p class="summary">Get Calvin’s answer, the Lutheran answer, and how they compare — straight from the sources, with the KJV verses behind them.</p></section>
  ${rec.length?`<section class="card"><h3>Recent <button class="linkbtn" data-clear="1">Clear</button></h3><div class="chips">${rec.map(q=>`<button class="chip" data-q="${esc(q)}">↺ ${esc(q)}</button>`).join('')}</div></section>`:''}
  <section class="card"><h3>Try asking</h3><div class="chips">${pick.map(q=>`<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div></section>
  ${fold('Browse all '+KB.length+' topics',null,`<div class="chips">${KB.map(t=>`<button class="chip" data-id="${t.id}">${esc(t.title)}</button>`).join('')}</div>`)}`;}
function show(t,a){current=t;alts=a||[];curAI=null;const q=lastQ||t.questions[0];
  RAG.load().then(()=>{if(current!==t)return;const cal=RAG.search('calvin',q,6),lut=RAG.search('lutheran',q,6);curAI={t,q,cal,lut,w:{calvin:RAG.relevance('calvin',q,cal).weak,lutheran:RAG.relevance('lutheran',q,lut).weak}};RAG.enableAI();render()}).catch(()=>{});
  render();history.replaceState(null,'','#'+t.id);window.scrollTo({top:0,behavior:'smooth'})}
function ask(q){q=q.trim();lastQ=q;if(!q){current=null;return home()}addRecent(q);const sc=score(q);const r=providers[0](q);const n=toks(q).length;
  const strong=sc[0].s>=4||(n<=1&&sc[0].s>=2);
  if(strong)show(sc[0].t,r.alts.filter(x=>x!==sc[0].t).slice(0,3));
  else fullText(q,r.alts.filter(a=>a).slice(0,3));}
// ---------- Full-text mode ----------
function ptext(t){return esc(t).replace(/\{§(\d+)\}/g,'<sup>§$1</sup>')}
function snippet(t){const w=t.replace(/\{§\d+\}/g,'').split(/\s+/);return esc(w.slice(0,16).join(' '))+(w.length>16?'…':'')}
function passages(list,side,openFirst){return list.map((d,i)=>{const vs=RAG.kjvReady()?(d.r||[]).map(r=>RAG.verse(r)).filter(Boolean):[];
  return `<details class="passage" id="p-${side}-${i+1}"${openFirst&&i===0?' open':''}><summary><span class="pn">${i+1}</span><span class="pc">${esc(d.c)}</span><span class="ps">${snippet(d.t)}</span></summary>
  <blockquote>${ptext(d.t)}<cite>${d.u?`<a href="${esc(d.u)}" target="_blank" rel="noopener">${esc(d.c)}</a>`:esc(d.c)}${d.w?' — '+esc(d.w):''}</cite></blockquote>${vs.length?`<p class="kicker vlabel">Verses cited (KJV)</p>${vchips(vs)}`:(d.r&&d.r.length&&!RAG.kjvReady()?'<p class="note">Loading verses…</p>':'')}</details>`}).join('')}
function srcCard(side,list,n,open){if(!list.length)return '';const L=list.slice(0,n);return `<section class="card srcs"><h3 class="${SIDE[side].cls}">Sources · ${SIDE[side].src}</h3>${fold('Show sources',L.length,passages(L,side,false),open)}</section>`}
function sideAnswer(side){const c=current;const list=side==='calvin'?c.cal:c.lut;const rel=c.rel[side];const P=list.slice(0,4);const aiOK=RAG.AI.state!=='unsupported'&&RAG.AI.state!=='error';
  if(rel.none)return `<section class="card answer"><p class="kicker ${SIDE[side].cls}">${side==='calvin'?'Calvinist answer':'Lutheran answer'}</p><h2 class="topic">${esc(c.q)}</h2><p>${SIDE[side].none}. Try different wording, or one of the topics below.</p>${more()}</section>`;
  if(rel.weak)return `<section class="card answer"><p class="kicker ${SIDE[side].cls}">${side==='calvin'?'Calvinist answer':'Lutheran answer'}</p><h2 class="topic">${esc(c.q)}</h2><p class="lead">${SIDE[side].miss}, but here’s something that could help:</p>${aiOK?aiBlock(side,c,P,true,side):''}<p class="note">The closest passages are below — tap one to read it.</p></section>`;
  return `<section class="card answer"><p class="kicker ${SIDE[side].cls}">${side==='calvin'?'Calvinist answer':'Lutheran answer'}</p><h2 class="topic">${esc(c.q)}</h2>${aiOK?aiBlock(side,c,P,false,side):`<p class="note">Here’s what the sources say — tap a passage to read it.</p>`}</section>`}
function renderSrc(){const c=current;let h='';
  if(tab!=='compare'){h=sideAnswer(tab)+srcCard(tab,tab==='calvin'?c.cal:c.lut,6,true)}
  else{const bw=c.rel.calvin.weak&&c.rel.lutheran.weak,none=c.rel.calvin.none&&c.rel.lutheran.none;const P=c.cal.slice(0,3).concat(c.lut.slice(0,3));const aiOK=RAG.AI.state!=='unsupported'&&RAG.AI.state!=='error';
    const kind=mode==='simple'?'simple':'advanced';
    h=seg()+`<section class="card answer"><p class="kicker" style="color:var(--cmp)">${mode==='simple'?'Simple comparison':'Detailed comparison'}</p><h2 class="topic">${esc(c.q)}</h2>${none?`<p>Neither Calvin nor the Lutheran sources discuss this. Try different wording.</p>`:bw?`<p class="lead">Neither Calvin nor the Lutheran confessions address this directly, but here’s something that could help:</p>`:''}${!none&&aiOK?aiBlock(kind,c,P,bw,'calvin'):''}${!none&&!aiOK?`<p class="note">Compare the closest passages from each side below.</p>`:''}</section>`+
      srcCard('calvin',c.cal,mode==='simple'?2:4,mode==='advanced')+srcCard('lutheran',c.lut,mode==='simple'?2:4,mode==='advanced')}
  out.innerHTML=h+(current.alts&&current.alts.length?`<p class="also">Related topics: ${current.alts.map(a=>`<button data-id="${a.id}">${esc(a.title)}</button>`).join('')}</p>`:'');}
async function fullText(q,relAlts){alts=[];current=null;syncTabs();
  out.innerHTML=`<section class="card"><p class="kicker">Searching</p><h2 class="topic">${esc(q)}</h2><p class="summary" id="st">Loading the texts…</p></section>`;
  try{await RAG.load(s=>{const e=document.getElementById('st');if(e)e.textContent=s});}
  catch(e){out.innerHTML=`<section class="card"><h2 class="topic">Couldn’t load the texts</h2><p class="summary">${esc(e.message)} — check your connection and try again.</p></section>`;return}
  const r=providers[0](q);const cal=RAG.search('calvin',q,6),lut=RAG.search('lutheran',q,6);
  current={src:true,q,cal,lut,rel:{calvin:RAG.relevance('calvin',q,cal),lutheran:RAG.relevance('lutheran',q,lut)},alts:relAlts||r.alts.slice(0,3)};
  RAG.enableAI();history.replaceState(null,'','#q='+encodeURIComponent(q));render();window.scrollTo({top:0,behavior:'smooth'})}
// ---------- events ----------
RAG.AI.listeners.add(()=>{if(!current)return;const st=RAG.AI.state;if(st==='loading'&&document.querySelector('.aibox .bar')){const p=Math.round((RAG.AI.pct||0)*100);document.querySelectorAll('.aibox .bar i').forEach(b=>b.style.width=p+'%');const e=document.getElementById('aipct');if(e)e.textContent=p+'%';else render();return}
  if(!document.querySelector('.aitext.streaming:not(:empty)')||st!=='ready')render();});
document.addEventListener('kjv-ready',()=>{if(current&&current.src){const open=[...document.querySelectorAll('details[open]')].map(d=>d.id).filter(Boolean);render();open.forEach(id=>{const d=document.getElementById(id);if(d)d.open=true})}});
out.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  if(b.dataset.ref){const d=document.getElementById(b.dataset.ref);if(d){d.open=true;const f=d.closest('details.fold');if(f)f.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});d.classList.add('flash');setTimeout(()=>d.classList.remove('flash'),1200)}return}
  if(b.dataset.mode){mode=b.dataset.mode;render();return}
  if(b.dataset.full){fullText(lastQ);return}
  if(b.dataset.clear){localStorage.removeItem('rt_recent');home();return}
  if(b.dataset.q){qi.value=b.dataset.q;syncClear();ask(b.dataset.q);return}
  if(b.dataset.id){const t=KB.find(x=>x.id===b.dataset.id);if(t){if(!b.dataset.q){lastQ='';}show(t,[])}}});
const clr=$('#clr');function syncClear(){clr.hidden=!qi.value}
qi.addEventListener('input',syncClear);
clr.onclick=()=>{qi.value='';syncClear();qi.focus();current=null;lastQ='';history.replaceState(null,'',location.pathname);home()};
$('#f').onsubmit=e=>{e.preventDefault();qi.blur();ask(qi.value)};
qi.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();qi.blur();ask(qi.value)}});
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();const tb=$('.tabs');if(tb.getBoundingClientRect().top<=0)window.scrollTo({top:tb.offsetTop,behavior:'smooth'})});
fetch('data/topics.json').then(r=>r.json()).then(d=>{KB=d.topics;index();window.__kb={KB,score,ask};const h=location.hash.slice(1);if(h.startsWith('q=')){const q=decodeURIComponent(h.slice(2));qi.value=q;lastQ=q;syncClear();fullText(q);return}const t=KB.find(x=>x.id===h);t?show(t,[]):home();if(localStorage.getItem('tr_ai')==='1')RAG.enableAI();});
})();
