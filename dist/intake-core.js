/* Unknown-first assessment inputs and a reviewable action track. No orders are executed. */
(function(root){
const action=root.FNAction||(typeof require==='function'?require('./action-core.js'):null);
function blank(){const p={};for(const k of Object.keys(action.ranges))p[k]=null;for(const k of action.bools)p[k]=null;for(const k of Object.keys(action.enums))p[k]='Unknown';p.cancer='';p.chemo='';p.localProtocol='Draft training reference; local clinical approval pending';return p}
const statuses=['Not documented','Not requested','Requested / pending','Available'];
function cleanContext(raw={},now=Date.now()){
 const sourcePatientId=String(raw.sourcePatientId||'');if(sourcePatientId&&!/^(?:FN-[0-9]{3}|WB-[LHPU][0-9]+)$/.test(sourcePatientId))throw Error('Invalid source patient ID');
 const out={sourcePatientId,alias:String(raw.alias||'').trim().slice(0,80),history:String(raw.history||'').trim().slice(0,800),priorRegimen:String(raw.priorRegimen||'').trim().slice(0,200)};
 for(const k of ['triageAt','onsetAt','lastDoseAt']){const v=raw[k];if(v&&!Number.isFinite(Date.parse(v)))throw Error('Invalid '+k);if(v&&Date.parse(v)>now+60000)throw Error(k+' cannot be in the future');out[k]=v?new Date(v).toISOString():null}
 for(const k of ['cbcStatus','renalStatus','liverStatus']){const v=raw[k]||'Not documented';if(!statuses.includes(v))throw Error('Invalid '+k);out[k]=v}
 out.cultureStatus=raw.cultureStatus||'Not documented';if(!['Not documented','Not collected','Collected / pending','Result available'].includes(out.cultureStatus))throw Error('Invalid culture status');
 return out;
}
function evaluate(input,context={},now=Date.now()){
 const p=action.cleanInput(input),meta=cleanContext(context,now),r=action.calculate(p,{},0),suspected=r.fn==='Criteria supported'||typeof p.temp==='number'&&p.temp>=38&&p.category!=='Unknown';
 const minute=meta.triageAt?Math.max(0,(now-Date.parse(meta.triageAt))/60000):null;
 const required=[...r.missing];if(!meta.triageAt)required.push('Triage time for the first-hour clock');if(p.priorAntibiotic===true&&!meta.priorRegimen)required.push('Current antimicrobial regimen');if(p.priorAntibiotic===true&&!meta.lastDoseAt)required.push('Last antimicrobial dose time');
 const tasks=[{code:'clinical',phase:'Now',owner:'Physician / nurse',text:r.risk.includes('instability')?'Immediate bedside assessment and urgent senior / critical-care escalation':'Current bedside assessment: instability, infection focus and previous treatment',state:'Required for review'}];
 for(const [key,title]of [['cbcStatus','CBC with differential / ANC'],['renalStatus','Renal function, electrolytes and dosing clearance'],['liverStatus','Liver tests (including albumin) and inflammatory assessment']])tasks.push({code:key,phase:'First assessment',owner:'Physician / nurse',text:title,state:meta[key]==='Available'?'Reported available — review and verify values':meta[key]==='Requested / pending'?'Requested / pending — follow up':'Suggested: request / verify'});
 tasks.push({code:'culture',phase:'Before treatment, if feasible',owner:'Nurse / physician',text:'Blood cultures: peripheral and line samples when indicated; never delay urgent antibiotics',state:['Collected / pending','Result available'].includes(meta.cultureStatus)?meta.cultureStatus+' — verify collection and review; do not repeat automatically':'Suggested: collect / verify collection'});
 if(suspected)tasks.push({code:'perfusion',phase:'Now',owner:'Physician',text:'Assess perfusion and lactate within suspected neutropenic sepsis work-up; review local protocol',state:'Suggested assessment'});
 if(p.pneumonia===true)tasks.push({code:'chest',phase:'Source-directed',owner:'Physician',text:'Chest imaging and respiratory sampling when clinically indicated',state:'Suggested assessment'});
 if(p.abdomen===true)tasks.push({code:'abdomen',phase:'Urgent source assessment',owner:'Physician / ID',text:'Assess possible enterocolitis; consider abdominal imaging and source-control needs',state:'Suggested assessment'});
 if(p.lineInfection===true)tasks.push({code:'line',phase:'Urgent source assessment',owner:'Physician / ID',text:'Assess line site, obtain paired cultures when feasible and review source control',state:'Suggested assessment'});
 tasks.push({code:'therapy',phase:p.priorAntibiotic===true?'Now: verify existing regimen':'First hour',owner:'Prescriber → pharmacist → nurse',text:p.priorAntibiotic===true?'Review active antibiotic, last dose, next due time and response; no duplicate initial dose':suspected?'Urgent empirical antibacterial review; initial treatment within 60 min of triage where FN is suspected':'Clarify FN criteria promptly; clinical concern may still require immediate treatment',state:p.priorAntibiotic===true?'Existing therapy reported':r.meds.length?'Draft suggestions only — awaiting review':'Clinician selection required; no numeric draft released'});
 tasks.push({code:'reassess',phase:r.risk.includes('instability')?'Immediate / frequent reassessment':'By 60 min, sooner if deteriorating',owner:'Physician / nurse',text:'Reassess vitals, perfusion, response and escalation responsibility',state:'Suggested reassessment'});
 tasks.push({code:'destination',phase:r.outpatient?'After observed reassessment (at least 4h)':'After initial stabilization / review',owner:'Physician',text:r.outpatient?'Outpatient eligibility review: observed stability, support, transport and follow-up; no automatic discharge':r.risk.startsWith('High')?'Inpatient management review; urgent escalation if unstable':'Continue urgent assessment until a safe disposition can be determined',state:'Decision pending'});
 return {...r,input:p,context:meta,required:[...new Set(required)],tasks,suspected,elapsedMinutes:minute,antibioticClock:minute===null?'Triage time not entered':p.priorAntibiotic===true?'Existing treatment: verify next dose':minute>60?'First-hour target elapsed — verify administration now':Math.ceil(60-minute)+' min to first-hour target',clinicallyValidated:false};
}
// Field-level UI feedback reuses the same validation and clinical verification rules.
function validation(input,context={},now=Date.now()){
 const issues=[],safe={...input},meta={...context},empty=blank();
 const add=(field,message,kind='invalid')=>{if(!issues.some(x=>x.field===field&&x.message===message))issues.push({field,message,kind})};
 for(const [key,value]of Object.entries(input)){
  try{action.cleanInput({...empty,[key]:value})}catch(e){add(key,action.ranges[key]?`Enter a number from ${action.ranges[key][0]} to ${action.ranges[key][1]}.`:'Choose a valid value.');safe[key]=empty[key]}
 }
 for(const [key,value]of Object.entries(context)){
  try{cleanContext({[key]:value},now)}catch(e){add('ctx_'+key,/future/.test(e.message)?'Time cannot be in the future.':'Enter a valid value.');delete meta[key]}
 }
 const gaps={
 'Symptom burden':['burden'],'Systolic pressure':['sbp'],'COPD':['copd'],
 'Cancer / prior fungal history':safe.category==='Haematological'?['priorFungal']:['category'],
 'Dehydration':['dehydration'],'Setting':['setting'],'Age':['age'],'Adult age':['age'],
 'Temperature':['temp'],'Verified oral temperature / clinical FN assessment':['method'],
 'Duration of fever':['feverHours'],'ANC / anticipated neutropenia':['anc','expectedDecline'],
 'Verified drug allergy history':['allergy'],'Renal dosing assessment':['crcl'],'Dialysis status':['dialysis'],
 'Renal trajectory':['renalState'],'Specific allergy drug':['allergyDrug'],
 'Allergy phenotype / culprit conflict':['allergy','allergyDrug'],
 'Triage time for the first-hour clock':['ctx_triageAt'],
 'Current antimicrobial regimen':['ctx_priorRegimen'],'Last antimicrobial dose time':['ctx_lastDoseAt']};
 try{for(const gap of evaluate(safe,meta,now).required){const keys=gaps[gap]||(gap.startsWith('Verify ')?[gap.slice(7)]:[gap]);for(const key of keys)if(!issues.some(x=>x.field===key))add(key,gap==='Allergy phenotype / culprit conflict'?'Allergy type and culprit drug must agree.':key==='method'?'Verify oral temperature or obtain clinical FN assessment.':'Required information / verification: '+gap.replace(/^Verify /,''), 'verification')}}catch{}
 return issues;
}
function makeCase(id,input,context,now=Date.now()){
 if(!/^USR-[a-f0-9]{24}$/.test(id))throw Error('Invalid entered assessment ID');const r=evaluate(input,context,now);
 return {id,patientId:r.context.sourcePatientId||'SIM-'+id,displayName:r.context.alias||'Entered assessment '+id.slice(-6),title:'Entered assessment · suggested pathway',syntheticOnly:true,userEntered:true,simulationStartedAt:r.context.triageAt||new Date(now).toISOString(),history:r.context.history||'Operator-entered training assessment. No sample-case laboratory or culture results are attached.',input:r.input,intakeContext:r.context,labs:[],cultures:[],imaging:[],teaching:[],priorMicrobiology:'Review the explicitly entered resistance / MRSA flags; no microbiology report has been generated.',expectedPathway:r.risk};
}
function restoreCase(meta,input,now=Date.now()){if(!meta||!/^USR-[a-f0-9]{24}$/.test(meta.id))throw Error('Invalid entered assessment metadata');return makeCase(meta.id,input,meta.intakeContext||{},now)}
const api={blank,cleanContext,evaluate,makeCase,restoreCase,statuses,validation};root.FNIntakeCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
