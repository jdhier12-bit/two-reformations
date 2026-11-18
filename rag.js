// Reformed Thinking — full-text retrieval (BM25) + optional in-browser AI (WebLLM, WebGPU).
// Everything runs on the device. No server, no accounts, no API keys.
(()=>{
const STOP=new Set('a an the of to in on is are was were be been being do does did doing what whats how why who whom which when where can could should would will shall may might must i me my mine we us our you your about and or nor for with as by it its this that these those there their them they he him his she her god s t vs versus than then so not no yes but if at from into upon unto also very more most such any all some each every other own same only just over under again further once here both few many much one two three teach teaches taught believe believes say says said think view views calvin calvinist calvinism calvinists reformed luther lutheran lutherans lutheranism doctrine christian christians bible biblical according mean meaning means explain tell thee thou thy ye hath doth unto shall saith yea go goes get gets got make made like way ways thing things really ok okay please question role roles purpose importance important nature place idea ideas concept opinion stance position allowed permitted acceptable wrong okay right regarding relation relationship'.split(' '));
const SYN={eucharist:['supper','sacrament','altar','body','blood'],communion:['supper','sacrament','altar'],lordssupper:['supper','sacrament','altar'],predestination:['predestinate','elect','election','decree'],election:['elect','predestination','chosen'],chosen:['elect','election'],salvation:['saved','justified','eternal','life'],saved:['salvation','justified'],baptism:['baptize','baptized','water'],infant:['infants','children','child','little'],babies:['infants','children'],baby:['infants','children'],faith:['believe','trust'],works:['work','merit'],grace:['mercy','favor','favour'],sin:['sins','sinner','corruption'],freewill:['will','choice','arbitrium'],hell:['damnation','torment'],heaven:['eternal','life','kingdom'],pope:['papacy','antichrist','roman','bishop'],mary:['virgin','mother'],saints:['saint','invocation','intercession'],prayer:['pray','prayers','petition'],law:['commandments','decalogue'],church:['congregation','church'],trinity:['persons','essence','father','son','spirit'],jesus:['christ'],spirit:['ghost'],holyspirit:['ghost','spirit'],government:['magistrate','magistrates','civil','rulers'],state:['magistrate','civil'],images:['image','idols','idolatry','pictures'],repentance:['repent','contrition','penitence'],confession:['absolution','confess','keys'],marriage:['marriage','wife','husband','matrimony'],divorce:['divorce','adultery'],money:['riches','wealth','usury'],angels:['angel','angels'],devil:['satan','devil'],death:['die','dead','death'],resurrection:['raise','risen','resurrection'],assurance:['certainty','assured','confidence'],atonement:['satisfaction','sacrifice','expiation','propitiation','cross'],cross:['crucified','death','satisfaction'],war:['wars','arms','sword','soldiers'],interest:['usury'],loans:['usury','lend'],loan:['usury','lend'],oath:['swear','swearing','oaths'],oaths:['swear','swearing','oath'],swear:['oath','oaths'],divorce:['adultery','marriage','divorce'],remarriage:['marriage','divorce'],fasting:['fast','fasts','fasting'],abortion:['murder','kill'],suicide:['kill','murder'],drinking:['drunkenness','wine'],alcohol:['drunkenness','wine'],sabbath:['holy','day','rest'],sunday:['sabbath','lords','day'],tithe:['tithes','alms'],gay:['sodomy'],homosexuality:['sodomy']};
const REL={pragmatism:['expedient','useful','utility','practical','philosophers','reason'],pragmatic:['expedient','useful','practical'],utilitarianism:['useful','utility','expedient'],relativism:['truth','certain','opinion'],postmodernism:['truth','certain','reason'],rationalism:['reason','philosophers','understanding'],reason:['reason','understanding','philosophers'],philosophy:['philosophers','philosophy','reason'],science:['knowledge','nature','philosophers','creation'],evolution:['creation','created','nature','six','days'],atheism:['ungodly','atheists','denied'],atheist:['ungodly','atheists'],agnosticism:['knowledge','doubt'],democracy:['magistrate','government','people','rulers'],capitalism:['riches','wealth','usury','property'],socialism:['property','goods','common','riches'],communism:['property','goods','common'],politics:['magistrate','government','civil'],psychology:['soul','mind','affections'],depression:['sorrow','afflictions','despair','temptation'],anxiety:['anxiety','fear','cares','trust'],mentalhealth:['sorrow','despair','afflictions'],technology:['arts','sciences','gifts'],environment:['creation','earth','creatures'],racism:['neighbour','love','nations'],feminism:['women','wife','husband'],equality:['equal','neighbour'],tolerance:['heretics','sword','magistrate'],ecumenism:['church','unity','schism'],mysticism:['contemplation','spirit','vision'],emotions:['affections','heart'],happiness:['blessed','blessedness','joy'],wealth:['riches','wealth','poverty'],success:['prosperity','blessing'],gambling:['lot','covetousness'],tattoos:['body','temple'],smoking:['body','temple'],music:['singing','psalms','songs'],dancing:['dances','pleasure','lust'],sports:['recreation','pleasure'],cremation:['burial','bodies','resurrection'],aliens:['creation','worlds'],dinosaurs:['creation','creatures','beasts'],cloning:['creation','life'],ivf:['children','marriage'],contraception:['marriage','children'],selfdefense:['sword','magistrate','kill'],guns:['sword','arms'],taxes:['tribute','taxes','magistrate'],vaccines:['means','physicians','providence'],medicine:['physicians','means','providence'],doctors:['physicians','means']};
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
function relTerms(q){const out=new Map();toks(q).forEach(w=>(REL[w]||REL[w.replace(/s$/,'')]||[]).forEach(s=>out.set(stem(s),0.8)));const j=toks(q).join('');(REL[j]||[]).forEach(s=>out.set(stem(s),0.8));return [...out]}
// How well do the top passages actually cover the question? weak => sources don't really address it.
function relevance(side,q,res){const ix=corpora[side];const prim=[...new Set(toks(q).map(stem))];if(!res.length||!prim.length)return {weak:true,none:!res.length};
  const top=res.slice(0,3);const grp=w=>{const s=new Set([w]);const raw=toks(q).find(x=>stem(x)===w);(SYN[raw]||SYN[(raw||'').replace(/s$/,'')]||[]).forEach(x=>s.add(stem(x)));return s};
  let cov=0,wsum=0,missRare=false;for(const w of prim){const df=ix.df.get(w)||0;const idf=Math.log(1+(ix.N-df+.5)/(df+.5));wsum+=idf;const g=grp(w);const hit=top.some(d=>[...g].some(x=>d.tf.has(x)));if(hit)cov+=idf;else if(df<ix.N*0.08)missRare=true}
  const c=wsum?cov/wsum:0;return {weak:c<0.55||missRare||res[0].score<3.5,cov:c,missRare,none:false,related:!!res[0].rel}}
function search(side,q,n=6){const ix=corpora[side];let qt=qterms(q);if(!qt.length)return [];
  if(!bm25(ix,qt).length){const rt=relTerms(q);if(rt.length){const r=bm25(ix,rt).slice(0,n).map(([s,d])=>({score:s,rel:true,...d}));return r}}
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
    try{AI.engine.setAppConfig&&0}catch(_){}
    AI.state='ready';localStorage.setItem('tr_ai','1');emit();
  }catch(e){AI.state='error';AI.error=String(e&&e.message||e);emit()}}
function fmtPassages(list,prefix){return list.map((d,i)=>`[${prefix}${i+1}] ${d.t.replace(/\{§\d+\}/g,'').split(' ').slice(0,130).join(' ')}`).join('\n\n')}
const RULES='Rules: Use ONLY the numbered passages. Do NOT quote; never use quotation marks. Paraphrase in your own plain words. Do not mention book, chapter, section or page numbers; refer to passages only by their bracket number like [1]. Do not add names, groups or ideas that are not in the passages. No introductions, no apologies, no "Sure", no "As an AI". If the passages do not address the question, reply exactly: NOT ADDRESSED';
function prompts(kind,q,cal,lut,weak){
  const n=kind==='advanced'?'3-4':'2-3';
  const task=weak?`The sources do not address "${q}" directly. In 1-2 short sentences, say what these passages teach that could still help someone thinking about it. Start with "Still, ".`:`Answer in ${n} short sentences. End each sentence with the bracket number it comes from.`;
  if(kind==='calvin'||kind==='lutheran'){const who=kind==='calvin'?'John Calvin (Institutes of the Christian Religion)':'Lutheran teaching (Book of Concord and Luther)';const P=(kind==='calvin'?cal:lut).slice(0,4);
    return [{role:'system',content:`You summarize ${who} for an ordinary reader. ${RULES}`},{role:'user',content:`Passages:\n${fmtPassages(P,'')}\n\nQuestion: ${q}\n${task}`}]}
  const both=`Calvin passages:\n${fmtPassages(cal.slice(0,3),'C')}\n\nLutheran passages:\n${fmtPassages(lut.slice(0,3),'L')}`;
  return [{role:'system',content:`You compare Calvinist and Lutheran teaching fairly for an ordinary reader. ${RULES.replace('[1]','[C1] or [L2]')}`},{role:'user',content:`${both}\n\nQuestion: ${q}\n${weak?task.replace('these passages teach','each side\'s passages teach'):`In ${n} short sentences: where do they agree and where do they differ? End each sentence with a bracket number like [C1] or [L2].`}`}]}
// ---------- Post-processing: strip anything not grounded in the retrieved passages ----------
const norm=s=>s.toLowerCase().replace(/[^a-z]+/g,' ').trim();
const CW=new Set('the and that this with from they their them which have has were what when where will would should could into upon unto shall about than then there these those also only such being been more most very some many much other others because therefore however passages passage calvin luther lutheran lutherans calvinist teaches teach taught says said according believe believed believes still sources source christians christian things thing people person directly address addresses think thinking someone help helps could'.split(' '));
function clean(text,P,opts){opts=opts||{};let t=String(text||'').replace(/\r/g,'');const max=opts.max||4;
  if(/NOT\s*ADDRESSED/i.test(t))return {text:'',notAddressed:true};
  const src=norm(P.map(d=>d.t+' '+d.c).join(' '));const srcW=new Set(src.split(' ').map(w=>stem(w)));
  const okRef=new Set();P.forEach(d=>{const m=d.c.match(/[IV]+\.\d+\.\d+/);if(m)okRef.add(m[0])});
  // quotations: keep only if verbatim in the passages; otherwise drop the sentence containing them
  t=t.replace(/\*\*|__|#+\s*/g,'').replace(/\b([IVX]+)\.(\d+)\.(\d+)/g,'$1\u2024$2\u2024$3');
  const sents=t.replace(/\s+/g,' ').match(/[^.!?]+(?:[.!?]+["”’)\]]*|$)(?:\s*\[[A-Z]?\d+\](?:\s*\[[A-Z]?\d+\])*)?/g)||[];
  const out=[],seen=new Set();
  for(let s of sents){s=s.trim();if(!s)continue;
    if(/^(sure|certainly|of course|okay|ok|here is|here's|i can|i can't|i cannot|i'm|i am|as an ai|as a language|unfortunately|based on the (provided |given )?passages,?\s*$)/i.test(s)||/as an ai|language model|i can only|brief answer|i don't have|provided passages do not/i.test(s))continue;
    let bad=false;s.replace(/[“"]([^”"]{3,})[”"]/g,(m,qt)=>{if(!src.includes(norm(qt)))bad=true;return m});if(bad)continue;
    
    // bogus locators
    s=s.replace(/\(?\b(?:in\s+)?(?:the\s+)?(?:Institutes,?\s*)?Book\s+[IVXLC\d]+(?:\s*,?\s*(?:Chapter|Ch\.?)\s*[IVXLC\d]+)?(?:\s*,?\s*(?:Section|Sect\.?|§)\s*[IVXLC\d]+)?\)?,?\s*/gi,'');
    s=s.replace(/\(?\b(?:Chapter|Section|Article|Sect\.?|§)\s*[IVXLC\d]+\)?,?\s*/gi,'');
    s=s.replace(/\(?\b(?:Institutes\s*)?([IVX]+)\u2024(\d+)\u2024(\d+)\)?/g,(m,a,b,c)=>okRef.has(a+'.'+b+'.'+c)?m.replace(/\u2024/g,'.'):'');
    s=s.replace(/\[([A-Z]?)(\d+)\]/g,(m,p,n)=>{n=+n;const lim=p?3:P.length;return n>=1&&n<=lim?m:''});
    s=s.replace(/\s{2,}/g,' ').replace(/\s+([,.;!?])/g,'$1').replace(/^[,;:\s]+/,'').trim();
    if(s.length<12)continue;
    // grounding: most content words must occur in the passages
    const cw=norm(s.replace(/\[[A-Z]?\d+\]/g,'')).split(' ').filter(w=>w.length>=5&&!CW.has(w));
    if(cw.length>=3){const hit=cw.filter(w=>srcW.has(stem(w))||src.includes(w.slice(0,6))).length;if(hit/cw.length<0.5)continue}
    const k=norm(s).slice(0,60);if(seen.has(k))continue;seen.add(k);
    s=s.charAt(0).toUpperCase()+s.slice(1);out.push(s);if(out.length>=max)break}
  return {text:out.join(' '),notAddressed:false}}
const cache=new Map();
function generate(kind,q,cal,lut,onText,weak){const key=kind+'|'+q+'|'+(weak?1:0);const c=cache.get(key);if(c&&c.done){onText(c.text,true);return}
  if(c){c.subs.add(onText);onText(c.text,false);return}
  const ent={text:'',done:false,subs:new Set([onText])};cache.set(key,ent);
  AI.busy=AI.busy.then(async()=>{try{const chunks=await AI.engine.chat.completions.create({messages:prompts(kind,q,cal,lut,weak),stream:true,temperature:0.1,top_p:0.8,frequency_penalty:0.5,presence_penalty:0.3,max_tokens:weak?90:(kind==='advanced'?200:140)});
      for await(const ch of chunks){ent.text+=ch.choices[0]?.delta?.content||'';ent.subs.forEach(f=>f(ent.text,false))}}
    catch(e){const m=String(e&&e.message||e);ent.text+=`\n[AI stopped: ${m.slice(0,160)}]`;if(/lost|Instance|memory|GPU/i.test(m)){AI.state='error';AI.error='The AI model ran out of GPU memory on this device ('+m.slice(0,80)+').';cache.delete(key);setTimeout(emit,50)}}
    ent.done=true;ent.subs.forEach(f=>f(ent.text,true))});}
window.RAG={load,search,relevance,clean,verse,AI,enableAI,gpuInfo,generate,ready:()=>!!corpora,kjvReady:()=>!!kjv};
})();
