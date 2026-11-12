import '../dist/action-core.js';
import '../dist/intake-core.js';
import '../dist/clinical-guidelines.js';
import '../dist/antibiotic-orders-core.js';
import '../dist/antibiotic-selection-core.js';
import '../dist/therapy-review-core.js';
import '../dist/task-guidance-core.js';
import '../dist/dynamic-core.js';
const json=(v,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function dynamicApi(request,{db,team,user,membership,route}){
 try{const bodyText=await request.text();if(bodyText.length>24000)throw Error('Payload too large');const r=JSON.parse(bodyText),now=new Date().toISOString();
 if(!/^[0-9a-f-]{36}$/i.test(r.id||'')||!Number.isInteger(r.revision)||!r.operation?.operationKey)throw Error('Visit ID, revision and operation key required');
 const visit=await db.prepare('SELECT * FROM team_visits WHERE id=? AND team_id=?').bind(r.id,team).first();if(!visit)return json({error:'Shared visit not found'},404);if(visit.last_operation===r.operation.operationKey)return json({ok:true,duplicate:true});if(visit.revision!==r.revision)return json({error:'Shared record changed; refresh before continuing.'},409);
 const s=JSON.parse(visit.snapshot),actor={id:user,role:membership.role},op=r.operation;let next=visit.stage;
 if(route==='protocol'){
  if(s.recordType!=='protocol')throw Error('Not a protocol record');if(op.action==='edit'){if(membership.role!=='admin')return json({error:'Administrator required to configure hospital protocol'},403);s.protocol=FNDynamic.protocolEdit(s.protocol,op.protocol,actor,Date.now())}else if(op.action==='approve'){if(!['admin',op.asRole].includes(membership.role))return json({error:'Assigned clinical/pharmacy role required'},403);s.protocol=FNDynamic.protocolApprove(s.protocol,op.version,op.asRole,actor,Date.now(),op.note)}else throw Error('Unknown protocol operation');next=s.protocol.versions.at(-1).status==='active'?'protocol_active':'protocol_draft';
 }else{
  if(s.recordType==='protocol')throw Error('Select a clinical visit');if(!['admin','nurse','physician','pharmacist'].includes(membership.role))return json({error:'Staff role required'},403);
  if(!s.dynamic){if(op.action!=='enroll')throw Error('Enroll the shared visit first');if(!['admin','nurse','physician'].includes(membership.role))return json({error:'Nurse or physician enrollment required'},403);const input=s.a2a?.input||r.input;if(!input)throw Error('Structured assessment required');s.dynamic=FNDynamic.initialize({patientId:visit.case_code,label:op.label||visit.case_code,input,triageAt:s.triageAt,mode:'recorded'},Date.now());
  }else{
   if(op.action==='apply_protocol'){const rec=await db.prepare('SELECT * FROM team_visits WHERE id=? AND team_id=?').bind(op.protocolId,team).first();if(!rec)throw Error('Local protocol not found');const ps=JSON.parse(rec.snapshot);if(ps.recordType!=='protocol')throw Error('Invalid local protocol record');const p=ps.protocol.versions.find(p=>p.version===op.version);if(!p||p.status!=='active')throw Error('Protocol version not active');op.protocol=p;}
   const previous=s.dynamic.revision;s.dynamic=FNDynamic.mutate(s.dynamic,op,actor,Date.now());if(s.dynamic.revision!==previous){s.plan=null;s.pharmacy=null;next='physician_review';if(s.a2a)s.a2a.input=s.dynamic.input;s.measurements={age:s.dynamic.input.age,temperature:s.dynamic.input.temp,anc:s.dynamic.input.anc,systolic:s.dynamic.input.sbp,crcl:s.dynamic.input.crcl};}
  }
 }
 const result=await db.batch([db.prepare('UPDATE team_visits SET stage=?,revision=revision+1,snapshot=?,last_operation=?,updated_at=? WHERE id=? AND team_id=? AND revision=? AND stage=?').bind(next,JSON.stringify(s),op.operationKey,now,visit.id,team,r.revision,visit.stage),db.prepare('INSERT INTO team_events (id,team_id,visit_id,actor_id,actor_role,performed_role,action,note,at) SELECT ?,?,?,?,?,?,?,?,? FROM team_visits WHERE id=? AND last_operation=?').bind(crypto.randomUUID(),team,visit.id,user,membership.role,membership.role,'DYNAMIC_'+op.action,String(op.note||'Synthetic follow-up event').slice(0,800),now,visit.id,op.operationKey)]);if(!result[0].meta?.changes)return json({error:'Concurrent change; refresh. Nothing overwritten.'},409);return json({ok:true,stage:next});
 }catch(e){return json({error:String(e.message||'Dynamic operation failed').slice(0,300)},400)}
}
export async function createProtocol(request,{db,team,user,membership}){
 if(membership.role!=='admin')return json({error:'Administrator required'},403);try{const raw=await request.text();if(raw.length>24000)throw Error('Payload too large');const r=JSON.parse(raw);if(!/^[0-9a-f-]{36}$/i.test(r.requestKey||''))throw Error('Request key required');const old=await db.prepare('SELECT id FROM team_visits WHERE id=? AND team_id=?').bind(r.requestKey,team).first();if(old)return json({id:old.id,duplicate:true});const p=FNDynamic.protocolEdit(null,r.protocol,{id:user,role:membership.role},Date.now()),now=new Date().toISOString(),snapshot={recordType:'protocol',syntheticOnly:true,protocol:p};await db.prepare('INSERT INTO team_visits (id,team_id,case_code,stage,revision,snapshot,last_operation,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(r.requestKey,team,'SIM-LOCAL-PROTOCOL','protocol_draft',1,JSON.stringify(snapshot),r.requestKey,now,now).run();return json({id:r.requestKey},201)}catch(e){return json({error:String(e.message).slice(0,300)},400)}
}
