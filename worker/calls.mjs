import {accessPrincipal} from './access.mjs';
import {msgPeople} from './messaging.mjs';
const json=(v,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}});
export async function callsApi(req,env){
 const u=new URL(req.url),path=u.pathname.slice('/api/calls/'.length),db=env.DB;
 if(req.method!=='GET'&&req.headers.get('Origin')!==u.origin)return json({error:'Same-origin request required'},403);
 try{
 const p=await accessPrincipal(req,env);if(!p)return json({error:'Sign in required'},401);if(p.status!=='approved')return json({error:'Approved account required'},403);
 const now=Date.now();
 await db.batch([db.prepare("UPDATE voice_calls SET state='expired',offer=NULL,answer=NULL WHERE state IN ('ringing','accepted') AND expires<?").bind(now),db.prepare('DELETE FROM voice_locks WHERE expires<?').bind(now)]);
 if(path==='poll'&&req.method==='GET'){
 const people=await msgPeople(env,p),rows=(await db.prepare('SELECT * FROM voice_calls WHERE caller=? OR callee=? ORDER BY created DESC LIMIT 20').bind(p.id,p.id).all()).results;
 return json({me:p.id,contacts:people.filter(x=>x.id!==p.id),calls:rows.map(c=>({...c,offer:c.callee===p.id?c.offer:null,answer:c.caller===p.id?c.answer:null}))});
 }
 if(req.method!=='POST')return json({error:'Unknown endpoint'},404);
 const text=await req.text();if(text.length>64000)return json({error:'Request too large'},413);const r=JSON.parse(text);
 if(path==='start'){
 if(r.recipient===p.id||!(await msgPeople(env,p)).some(c=>c.id===r.recipient))return json({error:'Contact unavailable'},403);
 if(!valid(r.offer,'offer'))return json({error:'Invalid audio offer'},400);
 const n=await db.prepare('SELECT COUNT(*) AS n FROM voice_calls WHERE caller=? AND created>?').bind(p.id,now-3600000).first();if(n.n>=30)return json({error:'Call limit reached. Try later.'},429);
 const id=crypto.randomUUID();try{await db.batch([db.prepare('INSERT INTO voice_calls (id,caller,callee,state,offer,created,expires) VALUES (?,?,?,?,?,?,?)').bind(id,p.id,r.recipient,'ringing',JSON.stringify(r.offer),now,now+60000),... [p.id,r.recipient].map(x=>db.prepare('INSERT INTO voice_locks (user_id,call_id,expires) VALUES (?,?,?)').bind(x,id,now+60000))])}catch{return json({error:'You or your contact already has an active call'},409)}return json({id},201);
 }
 const c=await db.prepare('SELECT * FROM voice_calls WHERE id=? AND (caller=? OR callee=?)').bind(r.id,p.id,p.id).first();if(!c)return json({error:'Call not found'},404);
 const people=await msgPeople(env,p);if(!people.some(x=>x.id===(c.caller===p.id?c.callee:c.caller)))return json({error:'Contact no longer available'},403);
 if(path==='answer'){
 if(c.callee!==p.id)return json({error:'Only recipient may answer'},403);if(!valid(r.answer,'answer'))return json({error:'Invalid audio answer'},400);
 const result=await db.prepare("UPDATE voice_calls SET state='accepted',answer=?,expires=? WHERE id=? AND state='ringing'").bind(JSON.stringify(r.answer),now+45000,c.id).run();if(!result.meta.changes)return json({error:'Call is no longer ringing'},409);
 await db.prepare('UPDATE voice_locks SET expires=? WHERE call_id=?').bind(now+45000,c.id).run();return json({ok:true});
 }
 if(path==='heartbeat'&&c.state==='accepted'){
 await db.batch([db.prepare("UPDATE voice_calls SET expires=? WHERE id=? AND state='accepted'").bind(now+45000,c.id),db.prepare('UPDATE voice_locks SET expires=? WHERE call_id=?').bind(now+45000,c.id)]);return json({ok:true});
 }
 if(path==='end'){
 const state=c.state==='ringing'?(c.callee===p.id?'declined':'cancelled'):'ended';
 await db.batch([db.prepare("UPDATE voice_calls SET state=?,offer=NULL,answer=NULL WHERE id=? AND state IN ('ringing','accepted')").bind(state,c.id),db.prepare('DELETE FROM voice_locks WHERE call_id=?').bind(c.id)]);return json({ok:true});
 }
 return json({error:'Call action unavailable'},409);
 }catch{return json({error:'Call service unavailable. Check your connection.'},503)}
}
function valid(s,type){return s?.type===type&&typeof s.sdp==='string'&&s.sdp.length<30000&&s.sdp.includes('m=audio')&&!s.sdp.includes('m=video')}
