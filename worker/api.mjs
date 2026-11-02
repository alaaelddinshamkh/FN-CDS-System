const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const channels=['phone','push','corridor'];
const uid=()=>crypto.randomUUID();
function ready(env){return {database:!!env.DB,gatewayConfigured:!!(env.HOSPITAL_GATEWAY_URL&&env.HOSPITAL_GATEWAY_TOKEN),dispatchEnabled:env.HOSPITAL_DISPATCH_ENABLED==='true',backgroundScheduler:false,watchVerified:false,corridorVerified:false,clinicalUseApproved:false}}
async function body(req){if(Number(req.headers.get('content-length')||0)>8192)throw Error('Request too large');const text=await req.text();if(text.length>8192)throw Error('Request too large');return JSON.parse(text)}
async function event(db,owner,id,action){await db.prepare('INSERT INTO remote_events (id,owner,escalation,action,at) VALUES (?,?,?,?,?)').bind(uid(),owner,id,action,new Date().toISOString()).run()}
function validRoster(r){return ['physician','icu'].includes(r.role)&&channels.includes(r.channel)&&/^[A-Za-z0-9_+@.:-]{2,100}$/.test(r.destination)&&typeof r.label==='string'&&r.label.trim().length>0&&r.label.length<=100&&Number.isFinite(Date.parse(r.starts))&&Number.isFinite(Date.parse(r.ends))&&Date.parse(r.ends)>Date.parse(r.starts)}
export async function api(request,env){
 const u=new URL(request.url),path=u.pathname.replace('/api/escalation',''),owner=request.headers.get('oai-authenticated-user-id');
 if(!owner)return json({error:'Sign in required'},401);
 if(request.method!=='GET'&&request.headers.get('Origin')!==u.origin)return json({error:'Same-origin request required'},403);
 if(path==='/status')return json({mode:'Hospital gateway adapter v1',...ready(env),limitations:['Hospital API contract and credentials pending','No unattended escalation scheduler connected','Not a validated emergency response service']});
 if(!env.DB)return json({error:'Persistent database unavailable'},503);
 const db=env.DB;
 try{
 if(path==='/roster'&&request.method==='GET')return json({rows:(await db.prepare('SELECT * FROM roster WHERE owner=? ORDER BY starts DESC LIMIT 100').bind(owner).all()).results});
 if(path==='/roster'&&request.method==='POST'){
  const r=await body(request);if(!validRoster(r))return json({error:'Enter role, channel, destination identifier, label and a valid shift window'},400);
  const id=uid();await db.prepare('INSERT INTO roster (id,owner,role,label,destination,channel,starts,ends) VALUES (?,?,?,?,?,?,?,?)').bind(id,owner,r.role,r.label.trim(),r.destination,r.channel,new Date(r.starts).toISOString(),new Date(r.ends).toISOString()).run();await event(db,owner,id,'ROSTER_CREATED');return json({id},201);
 }
 if(path==='/roster'&&request.method==='DELETE'){const r=await body(request);await db.prepare('DELETE FROM roster WHERE id=? AND owner=?').bind(r.id,owner).run();await event(db,owner,r.id,'ROSTER_REMOVED');return json({ok:true})}
 if(path==='/alerts'&&request.method==='GET'){
  const rows=(await db.prepare('SELECT id,case_ref,channel,recipient,state,created,due,gateway_ref,ack_at,ack_by,closed_at FROM remote_escalations WHERE owner=? ORDER BY created DESC LIMIT 100').bind(owner).all()).results;
  return json({rows:rows.map(r=>({...r,overdue:!r.ack_at&&!r.closed_at&&Date.parse(r.due)<Date.now()})),events:(await db.prepare('SELECT escalation,action,at FROM remote_events WHERE owner=? ORDER BY at DESC LIMIT 100').bind(owner).all()).results});
 }
 if(path==='/alerts'&&request.method==='POST'){
  const r=await body(request);if(! /^(TEST|SIM|WALK)-[A-Za-z0-9_-]{1,54}$/.test(r.caseRef)||!channels.includes(r.channel)||!['physician','icu'].includes(r.role)||!Number.isInteger(r.ackMinutes)||r.ackMinutes<1||r.ackMinutes>60||!/^[A-Za-z0-9_-]{8,100}$/.test(r.requestKey))return json({error:'Invalid opaque case reference, route, deadline or idempotency key'},400);
  const old=await db.prepare('SELECT id,state FROM remote_escalations WHERE owner=? AND request_key=?').bind(owner,r.requestKey).first();if(old)return json({...old,duplicate:true});
  const cfg=ready(env);if(!cfg.gatewayConfigured||!cfg.dispatchEnabled)return json({error:'Hospital dispatch is not connected or enabled. Nothing sent.',readiness:cfg},503);
  const gateway=new URL(env.HOSPITAL_GATEWAY_URL);if(gateway.protocol!=='https:'||gateway.username||gateway.password||gateway.search||gateway.hash)return json({error:'Invalid server gateway configuration'},503);
  const now=new Date().toISOString(),shift=await db.prepare('SELECT * FROM roster WHERE owner=? AND role=? AND channel=? AND starts<=? AND ends>? ORDER BY starts DESC LIMIT 2').bind(owner,r.role,r.channel,now,now).all();
  if(shift.results.length!==1)return json({error:shift.results.length?'Overlapping shifts; resolve roster before sending':'No active on-call recipient for this route'},409);
  const id=uid(),due=new Date(Date.now()+r.ackMinutes*60000).toISOString();
  try{await db.prepare('INSERT INTO remote_escalations (id,owner,case_ref,request_key,channel,recipient,state,created,due) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,owner,r.caseRef,r.requestKey,r.channel,shift.results[0].id,'dispatching',now,due).run()}catch{const existing=await db.prepare('SELECT id,state FROM remote_escalations WHERE owner=? AND request_key=?').bind(owner,r.requestKey).first();if(existing)return json({...existing,duplicate:true});throw Error('Unable to persist dispatch')}
  await event(db,owner,id,'DISPATCH_STARTED');
  try{
   const response=await fetch(new URL('messages',gateway.href.endsWith('/')?gateway.href:gateway.href+'/'),{method:'POST',redirect:'error',headers:{'Authorization':'Bearer '+env.HOSPITAL_GATEWAY_TOKEN,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({contract:'fn-escalation-v1',eventId:id,caseRef:r.caseRef,channel:r.channel,destination:shift.results[0].destination,priority:'urgent',acknowledgeBy:due,message:'Urgent clinical review requested. Open the approved clinical workspace. No patient details in this notification.'}),signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw Error('Gateway did not confirm acceptance');const result=await response.json();if(typeof result.messageId!=='string'||result.messageId.length>200||result.accepted!==true)throw Error('Invalid gateway acceptance');
   await db.prepare("UPDATE remote_escalations SET state='accepted',gateway_ref=? WHERE id=? AND owner=?").bind(result.messageId,id,owner).run();await event(db,owner,id,'GATEWAY_ACCEPTED_NOT_DELIVERED');return json({id,state:'accepted',message:'Gateway acceptance is not delivery or clinician acknowledgement.'},201);
  }catch{await db.prepare("UPDATE remote_escalations SET state='delivery_unknown' WHERE id=? AND owner=?").bind(id,owner).run();await event(db,owner,id,'DELIVERY_UNKNOWN_USE_APPROVED_MANUAL_FALLBACK');return json({id,state:'delivery_unknown',error:'Delivery is unconfirmed. Use the approved manual escalation route; do not assume success or automatically resend.'},502)}
 }
 if(path==='/action'&&request.method==='POST'){
  const r=await body(request),row=await db.prepare('SELECT * FROM remote_escalations WHERE id=? AND owner=?').bind(r.id,owner).first();if(!row)return json({error:'Alert not found'},404);
  if(r.action==='acknowledge'){
   if(row.closed_at)return json({error:'Alert already closed'},409);
   if(!row.ack_at){await db.prepare('UPDATE remote_escalations SET ack_at=?,ack_by=? WHERE id=? AND owner=? AND ack_at IS NULL').bind(new Date().toISOString(),owner,r.id,owner).run();await event(db,owner,r.id,'ACKNOWLEDGED_BY_SIGNED_IN_OPERATOR_NOT_DELIVERY_RECEIPT')}
  }else if(r.action==='close'){
   if(!row.ack_at)return json({error:'Acknowledge before closing'},409);
   if(!row.closed_at){await db.prepare('UPDATE remote_escalations SET closed_at=? WHERE id=? AND owner=?').bind(new Date().toISOString(),r.id,owner).run();await event(db,owner,r.id,'CLOSED_BY_OPERATOR_NOT_PROOF_OF_CLINICAL_RESOLUTION')}
  }else return json({error:'Unsupported action'},400);
  return json({ok:true});
 }
 return json({error:'Endpoint not found'},404);
 }catch{return json({error:'Request failed; no success assumed. Check backend configuration or input.'},400)}
}
