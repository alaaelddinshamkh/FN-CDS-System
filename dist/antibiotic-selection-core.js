/* Explicit clinician-selected justification; never alters risk, dose or safety holds. */
(function(root){
const guidelines=root.FNClinicalGuidelines||(typeof require==='function'?require('./clinical-guidelines.js'):null);
const signature=o=>JSON.stringify({v:'ABX-SELECTION-1',guidelines:guidelines.version,risk:o.risk,fn:o.fn,mascc:o.mascc,context:o.selectionInput,items:o.items.map(m=>[m.code,m.initialDose,m.repeatDose,m.renalContext,m.status]),holds:o.holds,protocol:o.protocol?{name:o.protocol.name,version:o.protocol.version,status:o.protocol.status}:null});
function options(o){
 const rationale=[];const refs=new Map();const ref=(key,r)=>{if(r?.url)refs.set(key,{id:key,...r})};
 for(const [key,r]of Object.entries(guidelines.sources))ref(key,r);
 for(const m of o.items)for(const r of m.references)ref(r.key,r);
 const add=(id,text,sources)=>rationale.push({id,text,sources});
 if(o.items.some(m=>m.code==='ciprofloxacin'))add('outpatient','Selected oral combination after clinical and outpatient-suitability review; not a discharge decision.',['outpatient']);
 else if(o.risk.startsWith('High'))add('inpatient','High-risk findings support inpatient antipseudomonal treatment review.',['fn','agiho']);
 for(const m of o.items)add('drug:'+m.code,m.rationale,m.references.map(r=>r.key));
 if(o.holds.length)add('safety','The displayed safety gaps require clinician / pharmacy clarification before completing the regimen.',['fn']);
 if(o.status==='Reconcile ongoing therapy')add('ongoing','Reconcile existing therapy and actual dose times; do not duplicate the initial dose.',['fn']);
 add('reassessment','Reassess clinical changes and microbiology; persistent fever alone is not sufficient reason for automatic antibacterial escalation.',['agiho']);
 const used=new Set(rationale.flatMap(r=>r.sources));return {rationale,evidence:[...refs.values()].filter(r=>used.has(r.id))};
}
function resolve(o,raw={},requireComplete=false){
 if((requireComplete||raw.signature)&&raw.signature!==signature(o))throw Error('Assessment, regimen or protocol changed. Re-select the justification for the current findings.');
 const opts=options(o),ids=(values,list)=>{if(!Array.isArray(values)||values.some(x=>typeof x!=='string'||!list.some(y=>y.id===x)))throw Error('Select only evidence and rationale offered for this current assessment.');return [...new Set(values)]};
 const rationaleIds=ids(raw.rationaleIds||[],opts.rationale),evidenceIds=ids(raw.evidenceIds||[],opts.evidence),custom=typeof raw.custom==='string'?raw.custom.trim():'';
 if(custom.length>600)throw Error('Custom rationale is limited to 600 characters.');
 const rationale=opts.rationale.filter(x=>rationaleIds.includes(x.id)),evidence=opts.evidence.filter(x=>evidenceIds.includes(x.id));
 const gaps=rationale.filter(r=>!r.sources.some(k=>evidenceIds.includes(k)));
 const complete=(rationale.length>0||!!custom)&&evidence.length>0&&!gaps.length;
 if(requireComplete&&!complete)throw Error('Choose a rationale (or write your own) and supporting evidence for each selected suggestion.');
 return {schema:1,signature:signature(o),guidelineVersion:guidelines.version,rationaleIds,evidenceIds,custom,rationale,evidence,complete,status:'Clinician-selected justification · review pending'};
}
function selectedText(s){if(!s)return 'No rationale / evidence has been explicitly selected.';return ['SELECTED RATIONALE & EVIDENCE (not approval)',...s.rationale.map(x=>'- '+x.text),...(s.custom?['Custom rationale: '+s.custom]:[]),...s.evidence.map(x=>'- '+x.title+' · '+(x.version||'reference')+' · '+(x.location||'See source')+' · '+x.url),s.complete?'Supporting selections recorded; clinical review still required.':'Selection incomplete; choose rationale and supporting evidence.'].join('\n')}
const api={signature,options,resolve,selectedText};root.FNAntibioticSelection=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
