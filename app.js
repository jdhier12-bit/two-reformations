// Two Reformations — curated topics + full-text search (rag.js) + optional on-device AI.
(()=>{
const $=s=>document.querySelector(s), out=$('#out'), qi=$('#q');
let KB=[], tab='calvin', current=null, alts=[], lastQ='';
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
function verses(vs){return vs.map(v=>`<div class="verse"><b>${esc(v.ref)}</b> <span class="note">KJV</span><p>${v.v.map(x=>(v.v.length>1?`<sup>${x[1]}</sup>`:'')+esc(x[2])).join(' ')}</p></div>`).join('')}
function quotes(qs){return qs.map(q=>`<blockquote>“${esc(q.text)}”<cite>${q.url?`<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.cite)}</a>`:esc(q.cite)} — <span>${esc(q.work)}</span></cite></blockquote>`).join('')}
function side(t,k){const S=t[k];const lab=k==='calvin'?'Calvinist (Reformed) answer':'Lutheran answer';
  return `<section class="card answer"><h3 class="${k==='calvin'?'cal':'lut'}">${lab}</h3>${S.answer.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('')}
  ${S.points.length?`<ul class="pts">${S.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}</section>
  ${S.quotes.length?`<section class="card"><h3>From the sources</h3>${quotes(S.quotes)}</section>`:''}
  ${S.refs&&S.refs.length?`<section class="card"><h3>Further reading (paraphrased, not quoted)</h3><ul class="pts">${S.refs.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></section>`:''}
  <section class="card"><h3>Scriptures cited (KJV)</h3>${verses(S.verses)}</section>`}
const isSac=t=>!!(t&&(t.category==='Sacraments'||t.sac));
const SACRX=/\b(sacrament|baptis|lord'?s supper|supper|communion|eucharist|real presence|bread and wine|transubstantiation|consubstantiation)/i;
function srcBlock(t,k){const S=t[k];const lab=k==='calvin'?'Calvinist view':'Lutheran view';const c=k==='calvin'?'cal':'lut';
  return `<section class="card answer"><h3 class="${c}">${lab}</h3>${S.answer.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('')}
  ${S.quotes.length?quotes(S.quotes):''}
  ${S.refs&&S.refs.length?`<ul class="pts note">${S.refs.map(r=>`<li>${esc(r)} (paraphrased)</li>`).join('')}</ul>`:''}
  <h3 style="margin-top:14px">Scriptures cited (KJV)</h3>${verses(S.verses)}</section>`}
let mode='simple';
function compare(t){const C=t.compare;const seg=`<div class="seg" role="group" aria-label="Detail level"><button data-mode="simple" class="${mode==='simple'?'on':''}">Simple</button><button data-mode="advanced" class="${mode==='advanced'?'on':''}">Advanced</button></div>`;
  if(mode==='simple')return seg+'\u0000'+`<section class="card simple"><h3 style="color:var(--cmp)">The simple version</h3><ul class="pts">${C.simple.map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="note">Tap <b>Advanced</b> for the side-by-side table, details, quotes and Bible verses.</p></section>`;
  return seg+'\u0000'+`<section class="card"><h3>Side by side</h3><table><tr><th></th><th class="cal">Calvinist</th><th class="lut">Lutheran</th></tr>${C.table.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></section>
  <section class="card"><h3 class="cmp" style="color:var(--cmp)">In summary</h3><p>${esc(C.summary)}</p></section>
  <div class="grid2"><section class="card"><h3>Where they agree</h3><ul class="pts">${C.agree.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
  <section class="card"><h3>Where they differ</h3><ul class="pts">${C.differ.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section></div>
  ${isSac(t)?srcBlock(t,'calvin')+srcBlock(t,'lutheran'):''}`}
function head(t){return `<section class="card"><p class="kicker">${esc(t.category)}</p><h2 class="topic">${esc(t.title)}</h2><p class="summary">${esc(t.summary)}</p>
  ${alts.length?`<p class="also">Not quite? Also see: ${alts.map(a=>`<button data-id="${a.id}">${esc(a.title)}</button>`).join('')}</p>`:''}
  ${lastQ?`<p class="also"><button data-full="1">Search the full texts for “${esc(lastQ)}”</button></p>`:''}</section>`}
function syncTabs(){const sac=isSac(current);document.querySelectorAll('.tabs button').forEach(b=>{if(b.dataset.tab!=='compare')b.hidden=sac});if(sac)tab='compare';else if(tab==='compare'&&window.__forced)tab='calvin';window.__forced=sac;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x.dataset.tab===tab));}
function render(){syncTabs();if(!current)return home();if(current.src)return renderSrc();out.innerHTML=(tab==='compare'?(([sg,bd])=>sg+head(current)+bd)(compare(current).split('\u0000')):head(current)+side(current,tab));
  out.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
  out.querySelectorAll('[data-full]').forEach(b=>b.onclick=()=>fullText(lastQ));
  out.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>show(KB.find(x=>x.id===b.dataset.id),[]));}
function chips(list){return `<div class="chips">${list.map(t=>`<button class="chip" data-q="${esc(t.questions[0])}" data-id="${t.id}">${esc(t.questions[0])}</button>`).join('')}</div>`}
function home(msg){const pick=['predestination','lords-supper','baptism','justification','free-will','perseverance','law-gospel','christology'].map(id=>KB.find(t=>t.id===id)).filter(Boolean);
  out.innerHTML=(msg||`<section class="card"><h2 class="topic">Ask a question</h2><p class="summary">Type any theological question. You’ll get the Calvinist answer from Calvin’s <i>Institutes</i>, the Lutheran answer from the Book of Concord and Luther, the KJV verses each tradition uses, and a side-by-side comparison.</p></section>`)+
  `<section class="card"><h3>Try asking</h3>${chips(pick.length?pick:KB.slice(0,8))}</section>
  <section class="card"><h3>All ${KB.length} topics</h3><div class="chips">${KB.map(t=>`<button class="chip" data-id="${t.id}">${esc(t.title)}</button>`).join('')}</div></section>`;
  out.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{if(b.dataset.q)qi.value=b.dataset.q;show(KB.find(x=>x.id===b.dataset.id),[])});}
function show(t,a){current=t;alts=a||[];render();history.replaceState(null,'','#'+t.id);window.scrollTo({top:0,behavior:'smooth'})}
function ask(q){q=q.trim();lastQ=q;if(!q){current=null;return home()}const sc=score(q);const r=providers[0](q);const n=toks(q).length;
  const strong=sc[0].s>=4||(n<=1&&sc[0].s>=2);
  if(strong)show(sc[0].t,r.alts.filter(x=>x!==sc[0].t).slice(0,3));
  else fullText(q,r.alts.filter(a=>a).slice(0,3));}
// ---------- Full-text mode (any question) ----------
const AIL='AI summary from the sources — check the cited passages';
function ptext(t){return esc(t).replace(/\{§(\d+)\}/g,'<sup>§$1</sup>')}
function vlist(d){if(!d.r||!d.r.length)return '';if(!RAG.kjvReady())return `<p class="note">Loading KJV verses…</p>`;
  return `<div class="pverses">${d.r.map(r=>RAG.verse(r)).filter(Boolean).map(v=>`<div class="verse"><b>${esc(v.ref)}</b> <span class="note">KJV</span><p>${v.vs.map(x=>(v.vs.length>1?`<sup>${x[0]}</sup>`:'')+esc(x[1])).join(' ')}</p></div>`).join('')}</div>`}
function passages(list,label,cls,n){if(!list.length)return `<section class="card"><h3 class="${cls}">${label}</h3><p class="note">No relevant passages found. Try different wording.</p></section>`;
  return `<section class="card"><h3 class="${cls}">${label}</h3><p class="note">Exact text, ranked by relevance to your question. Each passage is followed by the KJV verses it cites.</p>${list.slice(0,n||list.length).map((d,i)=>`<div class="passage"><blockquote><span class="pn">${i+1}</span> ${ptext(d.t)}<cite>${d.u?`<a href="${esc(d.u)}" target="_blank" rel="noopener">${esc(d.c)}</a>`:esc(d.c)} — ${esc(d.w||'')}</cite></blockquote>${vlist(d)}</div>`).join('')}</section>`}
function aiCard(kind){const A=RAG.AI;const id='ai-'+kind;
  if(A.state==='ready'){setTimeout(()=>{const el=document.getElementById(id);if(!el)return;RAG.generate(kind,current.q,current.cal,current.lut,(txt,done)=>{const e=document.getElementById(id);if(!e)return;e.textContent=txt||'Thinking…';e.classList.toggle('streaming',!done)})},0);
    return `<section class="card ai"><h3>✦ ${AIL}</h3><div id="${id}" class="aitext streaming">Reading the passages…</div><p class="note">Generated on your device by ${esc(A.model||'')} from the numbered passages below. Small models can misread; the passages are the authority.</p></section>`}
  if(A.state==='loading')return `<section class="card ai"><h3>✦ Loading the AI model…</h3><div class="bar"><i style="width:${Math.round((A.pct||0)*100)}%"></i></div><p class="note">${esc(A.progress||'')}</p><p class="note">One-time download; it’s cached for next time. The source passages are below meanwhile.</p></section>`;
  if(A.state==='unsupported'||A.state==='error')return `<section class="card ai"><h3>AI answers aren’t available on this device</h3><p class="note">${esc(A.error)} You still get the exact source passages and KJV verses below. AI answers need WebGPU (recent Chrome or Edge on a computer or Android phone; Safari 26 on newer iPhones/Macs may work).</p></section>`;
  return `<section class="card ai"><h3>✦ Want a written answer?</h3><p class="note">Turn on <b>AI answers</b> to have a free, open-source AI (Llama 3.2 1B) read these passages and summarize them with citations. It runs privately on your device: no account, no cost. One-time download of about 0.9 GB (use Wi-Fi). Needs WebGPU, so it may not work on older phones.</p><button class="btn" data-ai="1">Enable AI answers</button></section>`}
function srcHead(){const c=current;return `<section class="card"><p class="kicker">Searched the full texts</p><h2 class="topic">${esc(c.q)}</h2><p class="summary">Searched every section of Calvin’s <i>Institutes</i>, the Book of Concord, and Luther’s public-domain works for your question.</p>
  ${c.alts&&c.alts.length?`<p class="also">Related curated topics: ${c.alts.map(a=>`<button data-id="${a.id}">${esc(a.title)}</button>`).join('')}</p>`:''}</section>`}
function renderSrc(){const c=current;let h='';
  if(tab==='calvin')h=srcHead()+aiCard('calvin')+passages(c.cal,'Calvin’s Institutes','cal');
  else if(tab==='lutheran')h=srcHead()+aiCard('lutheran')+passages(c.lut,'Book of Concord & Luther','lut');
  else{const seg=`<div class="seg" role="group" aria-label="Detail level"><button data-mode="simple" class="${mode==='simple'?'on':''}">Simple</button><button data-mode="advanced" class="${mode==='advanced'?'on':''}">Advanced</button></div>`;
    if(mode==='simple')h=seg+srcHead()+aiCard('simple')+(RAG.AI.state==='ready'?'':`<section class="card simple"><h3 style="color:var(--cmp)">The simple version</h3><p class="note">No curated summary exists for this exact question, so turn on AI answers above for a plain-language comparison, or tap <b>Advanced</b> to read both sides’ best passages.</p></section>`)+`<div class="grid2">${passages(c.cal,'Calvin — top passages','cal',2)}${passages(c.lut,'Lutheran — top passages','lut',2)}</div>`;
    else h=seg+srcHead()+aiCard('advanced')+`<div class="grid2">${passages(c.cal,'Calvin’s Institutes','cal',c.sac?6:3)}${passages(c.lut,'Book of Concord & Luther','lut',c.sac?6:3)}</div>`}
  out.innerHTML=h;
  out.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;render()});
  out.querySelectorAll('[data-ai]').forEach(b=>b.onclick=()=>RAG.enableAI());
  out.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>show(KB.find(x=>x.id===b.dataset.id),[]));}
async function fullText(q,relAlts){alts=[];current=null;syncTabs();
  out.innerHTML=`<section class="card"><p class="kicker">Searching the full texts</p><h2 class="topic">${esc(q)}</h2><p class="summary" id="st">Loading…</p></section>`;
  try{await RAG.load(s=>{const e=document.getElementById('st');if(e)e.textContent=s});}
  catch(e){out.innerHTML=`<section class="card"><h2 class="topic">Couldn’t load the texts</h2><p class="summary">${esc(e.message)} — check your connection and try again.</p></section>`;return}
  const r=providers[0](q);
  current={src:true,q,sac:SACRX.test(q),cal:RAG.search('calvin',q,6),lut:RAG.search('lutheran',q,6),alts:relAlts||r.alts.slice(0,3)};
  history.replaceState(null,'','#q='+encodeURIComponent(q));render();window.scrollTo({top:0,behavior:'smooth'})}
RAG.AI.listeners.add(()=>{if(current&&current.src&&!document.querySelector('.aitext.streaming'))render();else if(current&&current.src){const b=document.querySelector('.bar i');if(b)b.style.width=Math.round((RAG.AI.pct||0)*100)+'%'}});
document.addEventListener('kjv-ready',()=>{if(current&&current.src)render()});

$('#f').onsubmit=e=>{e.preventDefault();qi.blur();ask(qi.value)};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));render()});
fetch('data/topics.json').then(r=>r.json()).then(d=>{KB=d.topics;index();window.__kb={KB,score,ask};const h=location.hash.slice(1);if(h.startsWith('q=')){const q=decodeURIComponent(h.slice(2));qi.value=q;lastQ=q;fullText(q);return}const t=KB.find(x=>x.id===h);t?show(t,[]):home();if(localStorage.getItem('tr_ai')==='1')RAG.enableAI();});
})();
