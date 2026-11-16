// Two Reformations — static knowledge-base engine.
// Answer provider is pluggable: replace/extend `providers` with an AI backend later
// (e.g. a Netlify Function at /api/ask returning the same topic JSON shape).
(()=>{
const $=s=>document.querySelector(s), out=$('#out'), qi=$('#q');
let KB=[], tab='calvin', current=null, alts=[];
const STOP=new Set('a an the of to in on is are was were be do does did what whats how why who which when where can could should would will i me my we our you your about and or for with as by it this that there their them they he his god s t vs versus difference between teach teaches believe believes view views think say says calvin calvinist calvinism calvinists reformed luther lutheran lutherans lutheranism doctrine christian christians bible biblical according mean meaning explain tell'.split(' '));
const stem=w=>w.replace(/'s$/,'').replace(/(ies)$/,'y').replace(/(ing|edly|ed|es|s)$/,'');
const toks=s=>s.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9' -]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w));
function lev(a,b){if(Math.abs(a.length-b.length)>2)return 9;const d=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=d[0];d[0]=i;for(let j=1;j<=b.length;j++){const t=d[j];d[j]=Math.min(d[j]+1,d[j-1]+1,p+(a[i-1]===b[j-1]?0:1));p=t}}return d[b.length]}
function index(){KB.forEach(t=>{t._phr=[t.title,...t.keywords].map(k=>k.toLowerCase());t._w=new Map();
  const add=(w,s)=>{w=stem(w);if(w.length<2||STOP.has(w))return;t._w.set(w,Math.max(t._w.get(w)||0,s))};
  t.keywords.forEach(k=>toks(k).forEach(w=>add(w,3)));toks(t.title).forEach(w=>add(w,3));
  t.questions.forEach(q=>toks(q).forEach(w=>add(w,1)));toks(t.summary).forEach(w=>add(w,.5));});}
function score(q){const ql=' '+q.toLowerCase().replace(/[’]/g,"'")+' ';const qt=toks(q).map(stem).filter(w=>w.length>1);
  return KB.map(t=>{let s=0;t._phr.forEach(p=>{if(p.includes(' ')&&ql.includes(p))s+=6+p.length/6;});
    qt.forEach(w=>{if(t._w.has(w))s+=t._w.get(w);else if(w.length>=5){for(const [k,v] of t._w){if(k.length>=5&&lev(w,k)<=1){s+=v*.7;break}}}});
    return {t,s}}).sort((a,b)=>b.s-a.s);}
const providers=[q=>{const r=score(q);return {best:r[0].s>=3?r[0].t:null,alts:r.filter(x=>x.s>0).slice(0,5).map(x=>x.t)}}];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function verses(vs){return vs.map(v=>`<div class="verse"><b>${esc(v.ref)}</b> <span class="note">KJV</span><p>${v.v.map(x=>(v.v.length>1?`<sup>${x[1]}</sup>`:'')+esc(x[2])).join(' ')}</p></div>`).join('')}
function quotes(qs){return qs.map(q=>`<blockquote>“${esc(q.text)}”<cite>${q.url?`<a href="${esc(q.url)}" target="_blank" rel="noopener">${esc(q.cite)}</a>`:esc(q.cite)} — <span>${esc(q.work)}</span></cite></blockquote>`).join('')}
function side(t,k){const S=t[k];const lab=k==='calvin'?'Calvinist (Reformed) answer':'Lutheran answer';
  return `<section class="card answer"><h3 class="${k==='calvin'?'cal':'lut'}">${lab}</h3>${S.answer.split('\n\n').map(p=>`<p>${esc(p)}</p>`).join('')}
  ${S.points.length?`<ul class="pts">${S.points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul>`:''}</section>
  ${S.quotes.length?`<section class="card"><h3>From the sources</h3>${quotes(S.quotes)}</section>`:''}
  ${S.refs&&S.refs.length?`<section class="card"><h3>Further reading (paraphrased, not quoted)</h3><ul class="pts">${S.refs.map(r=>`<li>${esc(r)}</li>`).join('')}</ul></section>`:''}
  <section class="card"><h3>Scriptures cited (KJV)</h3>${verses(S.verses)}</section>`}
function compare(t){const C=t.compare;return `<section class="card"><h3 class="cmp" style="color:var(--cmp)">In summary</h3><p>${esc(C.summary)}</p></section>
  <div class="grid2"><section class="card"><h3>Where they agree</h3><ul class="pts">${C.agree.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>
  <section class="card"><h3>Where they differ</h3><ul class="pts">${C.differ.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section></div>
  <section class="card"><h3>Side by side</h3><table><tr><th></th><th class="cal">Calvinist</th><th class="lut">Lutheran</th></tr>${C.table.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</table></section>`}
function head(t){return `<section class="card"><p class="kicker">${esc(t.category)}</p><h2 class="topic">${esc(t.title)}</h2><p class="summary">${esc(t.summary)}</p>
  ${alts.length?`<p class="also">Not quite? Also see: ${alts.map(a=>`<button data-id="${a.id}">${esc(a.title)}</button>`).join('')}</p>`:''}</section>`}
function render(){if(!current)return home();out.innerHTML=head(current)+(tab==='compare'?compare(current):side(current,tab));
  out.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>show(KB.find(x=>x.id===b.dataset.id),[]));}
function chips(list){return `<div class="chips">${list.map(t=>`<button class="chip" data-q="${esc(t.questions[0])}" data-id="${t.id}">${esc(t.questions[0])}</button>`).join('')}</div>`}
function home(msg){const pick=['predestination','lords-supper','baptism','justification','free-will','perseverance','law-gospel','christology'].map(id=>KB.find(t=>t.id===id)).filter(Boolean);
  out.innerHTML=(msg||`<section class="card"><h2 class="topic">Ask a question</h2><p class="summary">Type any theological question. You’ll get the Calvinist answer from Calvin’s <i>Institutes</i>, the Lutheran answer from the Book of Concord and Luther, the KJV verses each tradition uses, and a side-by-side comparison.</p></section>`)+
  `<section class="card"><h3>Try asking</h3>${chips(pick.length?pick:KB.slice(0,8))}</section>
  <section class="card"><h3>All ${KB.length} topics</h3><div class="chips">${KB.map(t=>`<button class="chip" data-id="${t.id}">${esc(t.title)}</button>`).join('')}</div></section>`;
  out.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{if(b.dataset.q)qi.value=b.dataset.q;show(KB.find(x=>x.id===b.dataset.id),[])});}
function show(t,a){current=t;alts=a||[];render();history.replaceState(null,'','#'+t.id);window.scrollTo({top:0,behavior:'smooth'})}
function ask(q){q=q.trim();if(!q){current=null;return home()}const r=providers[0](q);
  if(r.best)show(r.best,r.alts.filter(x=>x!==r.best).slice(0,3));
  else{current=null;history.replaceState(null,'','#');home(`<section class="card"><h2 class="topic">No exact match yet</h2><p class="summary">This edition covers ${KB.length} core topics. ${r.alts.length?'These look closest to your question:':'Try one of the topics below, or rephrase with a key term (e.g. “baptism”, “election”, “Lord’s Supper”).'}</p>${r.alts.length?chips(r.alts):''}</section>`)}}
$('#f').onsubmit=e=>{e.preventDefault();qi.blur();ask(qi.value)};
document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;document.querySelectorAll('.tabs button').forEach(x=>x.classList.toggle('on',x===b));render()});
fetch('data/topics.json').then(r=>r.json()).then(d=>{KB=d.topics;index();window.__kb={KB,score,ask};const h=location.hash.slice(1);const t=KB.find(x=>x.id===h);t?show(t,[]):home();});
})();
