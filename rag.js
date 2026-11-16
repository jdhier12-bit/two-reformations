// Two Reformations — full-text retrieval (BM25) + optional in-browser AI (WebLLM, WebGPU).
// Everything runs on the device. No server, no accounts, no API keys.
(()=>{
const STOP=new Set('a an the of to in on is are was were be been being do does did doing what whats how why who whom which when where can could should would will shall may might must i me my mine we us our you your about and or nor for with as by it its this that these those there their them they he him his she her god s t vs versus than then so not no yes but if at from into upon unto also very more most such any all some each every other own same only just over under again further once here both few many much one two three teach teaches taught believe believes say says said think view views calvin calvinist calvinism calvinists reformed luther lutheran lutherans lutheranism doctrine christian christians bible biblical according mean meaning means explain tell thee thou thy ye hath doth unto shall saith yea go goes get gets got make made like way ways thing things really ok okay please question'.split(' '));
const SYN={eucharist:['supper','sacrament','altar','body','blood'],communion:['supper','sacrament','altar'],lordssupper:['supper','sacrament','altar'],predestination:['predestinate','elect','election','decree'],election:['elect','predestination','chosen'],chosen:['elect','election'],salvation:['saved','justified','eternal','life'],saved:['salvation','justified'],baptism:['baptize','baptized','water'],infant:['infants','children','child','little'],babies:['infants','children'],baby:['infants','children'],faith:['believe','trust'],works:['work','merit'],grace:['mercy','favor','favour'],sin:['sins','sinner','corruption'],freewill:['will','choice','arbitrium'],hell:['damnation','torment'],heaven:['eternal','life','kingdom'],pope:['papacy','antichrist','roman','bishop'],mary:['virgin','mother'],saints:['saint','invocation','intercession'],prayer:['pray','prayers','petition'],law:['commandments','decalogue'],church:['congregation','church'],trinity:['persons','essence','father','son','spirit'],jesus:['christ'],spirit:['ghost'],holyspirit:['ghost','spirit'],government:['magistrate','magistrates','civil','rulers'],state:['magistrate','civil'],images:['image','idols','idolatry','pictures'],repentance:['repent','contrition','penitence'],confession:['absolution','confess','keys'],marriage:['marriage','wife','husband','matrimony'],divorce:['divorce','adultery'],money:['riches','wealth','usury'],angels:['angel','angels'],devil:['satan','devil'],death:['die','dead','death'],resurrection:['raise','risen','resurrection'],assurance:['certainty','assured','confidence'],atonement:['satisfaction','sacrifice','expiation','propitiation','cross'],cross:['crucified','death','satisfaction'],war:['wars','arms','sword','soldiers'],interest:['usury'],loans:['usury','lend'],loan:['usury','lend'],oath:['swear','swearing','oaths'],oaths:['swear','swearing','oath'],swear:['oath','oaths'],divorce:['adultery','marriage','divorce'],remarriage:['marriage','divorce'],fasting:['fast','fasts','fasting'],abortion:['murder','kill'],suicide:['kill','murder'],drinking:['drunkenness','wine'],alcohol:['drunkenness','wine'],sabbath:['holy','day','rest'],sunday:['sabbath','lords','day'],tithe:['tithes','alms'],gay:['sodomy'],homosexuality:['sodomy']};
function stem(w){if(w.length<=3)return w;w=w.replace(/'s$/,'');
  for(const [suf,rep] of [['ational','ate'],['fulness','ful'],['iveness','ive'],['ousness','ous'],['ization','ize'],['ation','ate'],['ities','ity'],['ness',''],['ments','ment'],['ingly',''],['edly',''],['ies','y'],['ing',''],['ed',''],['es',''],['s','']]){
    if(w.endsWith(suf)&&w.length-suf.length>=3){w=w.slice(0,-suf.length)+rep;break}}return w}
function toks(s){return (s.toLowerCase().replace(/[’']/g,"'").match(/[a-z][a-z']*/g)||[]).filter(w=>!STOP.has(w)&&w.length>1)}
const BOOST={boc:1.15,luther:1,calvin:1};
let corpora=null, kjv=null, loading=null;
function buildIndex(docs){const N=docs.length;const df=new Map();let tot=0;
  docs.forEach(d=>{const tf=new Map();const ws=toks(d.t+' '+d.c);d.len=ws.length;tot+=ws.length;ws.forEach(w=>{w=stem(w);tf.set(w,(tf.get(w)||0)+1)});d.tf=tf;tf.forEach((_,w)=>df.set(w,(df.get(w)||0)+1))});
  return {docs,df,N,avg:tot/N}}
function bm25(ix,qterms,k1=1.2,b=0.75){const res=[];const idf=new Map(qterms.map(([w,wt])=>[w,wt*Math.log(1+(ix.N-(ix.df.get(w)||0)+.5)/((ix.df.get(w)||0)+.5))]));
  for(const d of ix.docs){let s=0,hit=0;for(const [w] of qterms){const f=d.tf.get(w);if(f){hit++;s+=idf.get(w)*f*(k1+1)/(f+k1*(1-b+b*d.len/ix.avg))}}
    if(s>0)res.push([s*(1+0.35*(hit-1)),d])}
  return res.sort((a,b)=>b[0]-a[0])}
function qterms(q){const base=toks(q);const out=new Map();const joined=base.join('');
  base.forEach(w=>{out.set(stem(w),Math.max(out.get(stem(w))||0,1));(SYN[w]||SYN[w.replace(/s$/,'')]||[]).forEach(s=>{const k=stem(s);if(!out.has(k))out.set(k,0.5)})});
  for(let i=0;i<base.length-1;i++){const j=base[i]+base[i+1];(SYN[j]||[]).forEach(s=>{const k=stem(s);if(!out.has(k))out.set(k,0.6)})}
  return [...out]}
async function load(onStatus){if(corpora)return corpora;if(loading)return loading;
  loading=(async()=>{onStatus&&onStatus('Downloading the source texts (≈2 MB, one time)…');
    const get=f=>fetch('data/'+f).then(r=>{if(!r.ok)throw new Error(f+' '+r.status);return r.json()});
    const [c,b,l]=await Promise.all([get('src-calvin.json'),get('src-boc.json'),get('src-luther.json')]);
    onStatus&&onStatus('Indexing Calvin, the Book of Concord and Luther…');await new Promise(r=>setTimeout(r,30));
    c.forEach(d=>d.s='calvin');b.forEach(d=>d.s='boc');l.forEach(d=>d.s='luther');
    corpora={calvin:buildIndex(c),lutheran:buildIndex(b.concat(l))};
    get('kjv.json').then(k=>{kjv=k;document.dispatchEvent(new Event('kjv-ready'))}).catch(()=>{});
    return corpora})();
  return loading}
function search(side,q,n=6){const ix=corpora[side];const qt=qterms(q);if(!qt.length)return [];
  const r=bm25(ix,qt).map(([s,d])=>[s*(BOOST[d.s]||1),d]).sort((a,b)=>b[0]-a[0]);
  const out=[],seen=new Set();for(const [s,d] of r){const key=d.c.replace(/ \(part.*\)$/,'');if(seen.has(key+d.t.slice(0,20)))continue;seen.add(key+d.t.slice(0,20));out.push({score:s,...d});if(out.length>=n)break}
  return out}
function verse(r){if(!kjv)return null;const [bi,ch,a,z]=r;const B=kjv[bi];const C=B&&B[1][ch-1];if(!C)return null;
  const vs=[];for(let v=a;v<=z&&v<=C.length;v++)vs.push([v,C[v-1]]);return {ref:`${B[0]} ${ch}:${a}${z!==a?'-'+z:''}`,vs}}
// ---------- AI (WebLLM) ----------
const MODEL_F16='Llama-3.2-1B-Instruct-q4f16_1-MLC', MODEL_F32='Llama-3.2-1B-Instruct-q4f32_1-MLC';
const AI={state:'off',progress:'',engine:null,model:null,busy:Promise.resolve(),listeners:new Set(),error:''};
const emit=()=>AI.listeners.forEach(f=>f());
async function gpuInfo(){if(!('gpu' in navigator))return {ok:false,why:'This browser does not support WebGPU.'};
  try{const a=await navigator.gpu.requestAdapter();if(!a)return {ok:false,why:'WebGPU is present but no GPU adapter is available.'};return {ok:true,f16:a.features.has('shader-f16')}}catch(e){return {ok:false,why:'WebGPU error: '+e.message}}}
async function enableAI(){if(AI.state==='ready'||AI.state==='loading')return;
  const g=await gpuInfo();if(!g.ok){AI.state='unsupported';AI.error=g.why;emit();return}
  AI.state='loading';AI.progress='Starting…';emit();
  try{const webllm=await import('https://esm.run/@mlc-ai/web-llm@0.2.88');
    AI.model=g.f16?MODEL_F16:MODEL_F32;
    AI.engine=await webllm.CreateMLCEngine(AI.model,{initProgressCallback:p=>{AI.progress=p.text||'';AI.pct=p.progress;emit()}});
    AI.state='ready';localStorage.setItem('tr_ai','1');emit();
  }catch(e){AI.state='error';AI.error=String(e&&e.message||e);emit()}}
function fmtPassages(list,prefix){return list.map((d,i)=>`[${prefix}${i+1}] (${d.c}) ${d.t.replace(/\{§\d+\}/g,'').split(' ').slice(0,170).join(' ')}`).join('\n\n')}
function prompts(kind,q,cal,lut){
  const rules='Use ONLY the numbered passages below. Cite them in square brackets like [1]. Never invent quotations or facts not in the passages. If the passages do not really answer the question, say so plainly.';
  if(kind==='calvin')return [{role:'system',content:`You explain what John Calvin teaches, based on his Institutes of the Christian Religion. ${rules} Answer in 3-5 clear sentences.`},{role:'user',content:`Question: ${q}\n\nPassages from Calvin's Institutes:\n${fmtPassages(cal,'')}\n\nAnswer from Calvin's perspective, citing passages.`}];
  if(kind==='lutheran')return [{role:'system',content:`You explain Lutheran teaching, based on the Book of Concord and Luther's writings. ${rules} Answer in 3-5 clear sentences.`},{role:'user',content:`Question: ${q}\n\nPassages from the Book of Concord and Luther:\n${fmtPassages(lut,'')}\n\nAnswer from the Lutheran perspective, citing passages.`}];
  const both=`Calvinist passages (Calvin's Institutes):\n${fmtPassages(cal.slice(0,3),'C')}\n\nLutheran passages (Book of Concord / Luther):\n${fmtPassages(lut.slice(0,3),'L')}`;
  if(kind==='simple')return [{role:'system',content:`You compare Calvinist and Lutheran teaching for a beginner. ${rules.replace('[1]','[C1] or [L2]')} Write 2-4 very short, plain sentences with no jargon.`},{role:'user',content:`Question: ${q}\n\n${both}\n\nIn 2-4 simple sentences: what do they agree on and where do they differ?`}];
  return [{role:'system',content:`You compare Calvinist and Lutheran teaching carefully and fairly. ${rules.replace('[1]','[C1] or [L2]')}`},{role:'user',content:`Question: ${q}\n\n${both}\n\nWrite three short sections with these headings: "Agreement:", "Differences:", "Calvinist vs Lutheran in one line each:". Cite passages.`}]}
const cache=new Map();
function generate(kind,q,cal,lut,onText){const key=kind+'|'+q;const c=cache.get(key);if(c&&c.done){onText(c.text,true);return}
  if(c){c.subs.add(onText);onText(c.text,false);return}
  const ent={text:'',done:false,subs:new Set([onText])};cache.set(key,ent);
  AI.busy=AI.busy.then(async()=>{try{const chunks=await AI.engine.chat.completions.create({messages:prompts(kind,q,cal,lut),stream:true,temperature:0.2,max_tokens:kind==='simple'?160:380});
      for await(const ch of chunks){ent.text+=ch.choices[0]?.delta?.content||'';ent.subs.forEach(f=>f(ent.text,false))}}
    catch(e){ent.text+=`\n[AI error: ${e.message}]`}
    ent.done=true;ent.subs.forEach(f=>f(ent.text,true))});}
window.RAG={load,search,verse,AI,enableAI,gpuInfo,generate,ready:()=>!!corpora,kjvReady:()=>!!kjv};
})();
