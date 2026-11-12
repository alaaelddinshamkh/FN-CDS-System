/* Read-only workspace projections. No records, ownership or clinical completion are inferred. */
(function(root){
const millis=x=>x?Date.parse(x):NaN;
const active=t=>!['completed','cancelled'].includes(t.status);
function queue({episodes=[],visits=[],escalations=[],operator=null,now=Date.now()}){
 const tasks=[],reviews=[];
 const add=(d,visit)=>{if(!d||d.mode==='simulation')return;const context={patientId:d.patientId,visitId:visit?.id||'',scope:visit?'shared':'local'};
 for(const t of d.tasks||[])if(active(t))tasks.push({...t,...context,key:(visit?.id||'local:'+d.patientId)+':'+t.id,label:d.label||d.patientId,overdue:Number.isFinite(millis(t.dueAt))&&millis(t.dueAt)<now,mine:!!operator&&!!visit&&(operator.role==='admin'||t.ownerRole===operator.role)&&t.ownerLabel===operator.label});
 for(const a of d.alerts||[])if(!a.decision)reviews.push({...context,key:(visit?.id||d.patientId)+':'+a.id,title:a.reason,kind:a.review?'Decision required':'Changed data awaiting review',label:d.label||d.patientId,dueAt:a.dueAt});
 for(const t of d.tests||[])if(t.latest&&t.latest.status!=='cancelled'&&(!t.latest.ack||(t.latest.code==='culture'&&!t.latest.decision)))reviews.push({...context,key:(visit?.id||d.patientId)+':'+t.id,title:t.name,testId:t.id,kind:t.latest.ack?'Culture decision required':'Result awaiting review',label:d.label||d.patientId,dueAt:null});};
 for(const d of episodes)add(d,null);
 for(const v of visits){add(v.snapshot?.dynamic,v);if(v.stage!=='complete'&&!v.snapshot?.dynamic){const roles={physician_review:'physician',pharmacy_review:'pharmacist',nursing_dose:'nurse'},title={physician_review:'Review and propose care plan',pharmacy_review:'Review physician plan',nursing_dose:'Document actual dose'};tasks.push({key:'visit:'+v.id,patientId:v.case_code,visitId:v.id,scope:'shared',id:'handoff',title:title[v.stage]||v.stage,ownerRole:roles[v.stage]||'Unknown',ownerLabel:'Role queue - not individually assigned',status:'awaiting handoff',dueAt:null,overdue:false,mine:false,label:v.case_code});}}
 tasks.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||(millis(a.dueAt)||Infinity)-(millis(b.dueAt)||Infinity));
 return {tasks,reviews,escalations:escalations.filter(e=>e.status!=='closed'),counts:{mine:tasks.filter(t=>t.mine).length,review:reviews.length,overdue:tasks.filter(t=>t.overdue).length,escalation:escalations.filter(e=>e.status!=='closed').length}};
}
function results({source=[],episodes=[],visits=[],reviews={}}){const out=new Map();
 for(const r of source){const key='local:'+r.patientId+':'+r.accession+':'+r.code,old=out.get(key);if(!old||(millis(r.issuedAt)||0)>=(millis(old.issuedAt)||0))out.set(key,{...r,key,scope:'local',visitId:'',reviewed:!!reviews[r.eventId],reviewKind:'source',requiresReview:r.critical===true||r.code==='culture'&&r.value==='Positive'||r.code==='ANC'&&r.unit==='×10⁹/L'&&r.value<0.5||r.code==='temperature'&&r.unit==='°C'&&r.value>=38.3});}
 const add=(d,v)=>{if(!d||d.mode==='simulation')return;for(const t of d.tests||[]){const r=t.latest;if(!r)continue;const key=(v?'shared:'+v.id:'local:'+d.patientId)+':'+r.accession+':'+r.code;const old=out.get(key);if(old&&(millis(old.issuedAt)||0)>(millis(r.availableAt)||0))continue;out.set(key,{...r,key,patientId:d.patientId,visitId:v?.id||'',scope:v?'shared':'local',testId:t.id,eventId:old?.eventId||r.id,issuedAt:r.availableAt,observedAt:r.observedAt,reviewed:!!r.ack,reviewKind:'dynamic',requiresReview:r.status!=='cancelled',sourceReviewAt:old?.eventId?reviews[old.eventId]||null:null,reportId:r.id,decision:r.decision||null,source:r.source||'Recorded follow-up report'});}};
 for(const d of episodes)add(d,null);for(const v of visits)add(v.snapshot?.dynamic,v);
 return [...out.values()].sort((a,b)=>(millis(b.issuedAt)||0)-(millis(a.issuedAt)||0));
}
const api={queue,results};root.FNWorkspaceCore=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
