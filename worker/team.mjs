import {deliverEncounterAlerts} from './encounter-alerts.mjs';
import {dynamicApi,createProtocol} from './dynamic.mjs';
import '../dist/action-core.js';
import '../dist/intake-core.js';
import actionCases from '../dist/action-cases.json' with {type:'json'};
/* Shared synthetic hospital workflow. Platform identity + server-side membership. */
const teamJSON=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const teamRoles=['nurse','physician','pharmacist'];
const teamTransitions={submit_plan:{role:'physician',from:'physician_review',to:'pharmacy_review'},pharmacy_review:{role:'pharmacist',from:'pharmacy_review',to:'nursing_dose'},request_changes:{role:'pharmacist',from:'pharmacy_review',to:'physician_review'},record_dose:{role:'nurse',from:'nursing_dose',to:'complete'}};
const teamClean=(v,n=800)=>typeof v==='string'?v.trim().slice(0,n):'';
async function teamBody(request){const t=await request.text();if(t.length>16000)throw Error('Payload too large');return JSON.parse(t)}
async function teamHash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
function teamEvent(db,team,visit,actor,role,performed,action,note,at,conditional=null){const sql=conditional?'INSERT INTO team_events (id,team_id,visit_id,actor_id,actor_role,performed_role,action,note,at) SELECT ?,?,?,?,?,?,?,?,? FROM team_visits WHERE id=? AND last_operation=?':'INSERT INTO team_events (id,team_id,visit_id,actor_id,actor_role,performed_role,action,note,at) VALUES (?,?,?,?,?,?,?,?,?)';const args=[crypto.randomUUID(),team,visit,actor,role,performed,action,note,at];if(conditional)args.push(visit,conditional);return db.prepare(sql).bind(...args)}
const teamTimeOK=t=>Number.isFinite(Date.parse(t))&&Date.parse(t)<=Date.now()+60000;
const teamUUID=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
export async function teamApi(request,env){
 const u=new URL(request.url),route=u.pathname.replace('/api/team/',''),user=request.headers.get('oai-authenticated-user-id');
 if(!user)return teamJSON({error:'Sign in with your application account to use the shared workspace.'},401);
 if(!['GET'].includes(request.method)&&request.headers.get('Origin')!==u.origin)return teamJSON({error:'Same-origin request required'},403);
 if(!env.DB)return teamJSON({error:'Central database is unavailable.'},503);const db=env.DB;
 try{
 const profile=await db.prepare('SELECT username,requested_role,created_at FROM app_profiles WHERE user_id=?').bind(user).first();
 if(route==='profile'&&request.method==='GET')return teamJSON({signedIn:true,profile});
 if(route==='profile'&&request.method==='POST'){
  if(profile)return teamJSON({error:'Profile already exists. Role changes require administrator review.'},409);
  const r=await teamBody(request),username=teamClean(r.username,40).toLowerCase();
  if(!/^[a-z][a-z0-9_.-]{2,31}$/.test(username)||!['physician','nurse','pharmacist','patient','administrator'].includes(r.requestedRole)||r.syntheticOnly!==true)return teamJSON({error:'Use a 3–32 character username starting with a letter, select a role and confirm synthetic data only.'},400);
  if(await db.prepare('SELECT user_id FROM app_profiles WHERE username=?').bind(username).first())return teamJSON({error:'Username unavailable.'},409);
  await db.prepare('INSERT INTO app_profiles (user_id,username,requested_role,created_at) VALUES (?,?,?,?)').bind(user,username,r.requestedRole,new Date().toISOString()).run();return teamJSON({ok:true},201);
 }
 if(profile?.requested_role==='patient')return route==='session'&&request.method==='GET'?teamJSON({signedIn:true,userId:user,workspaces:[],syntheticOnly:true}):teamJSON({error:'Patient accounts cannot access staff workspaces or clinical actions.'},403);
 if(route==='session'&&request.method==='GET'){const rows=(await db.prepare('SELECT t.id,t.name,m.role,m.label FROM demo_teams t JOIN team_members m ON m.team_id=t.id WHERE m.user_id=? ORDER BY t.created_at DESC').bind(user).all()).results;return teamJSON({signedIn:true,userId:user,workspaces:rows,syntheticOnly:true})}
 if(route==='workspaces'&&request.method==='POST'){
  const r=await teamBody(request),name=teamClean(r.name,100),label=teamClean(r.label,100);if(!name||!label||r.syntheticOnly!==true)return teamJSON({error:'Enter workspace and operator labels, and confirm synthetic data only.'},400);
  const count=await db.prepare('SELECT COUNT(*) AS n FROM demo_teams WHERE created_by=?').bind(user).first();if(count.n>=3)return teamJSON({error:'Maximum three demo workspaces per account.'},409);
  const id=crypto.randomUUID(),now=new Date().toISOString();await db.batch([db.prepare('INSERT INTO demo_teams (id,name,created_by,created_at) VALUES (?,?,?,?)').bind(id,name,user,now),db.prepare('INSERT INTO team_members (id,team_id,user_id,label,role,joined_at) VALUES (?,?,?,?,?,?)').bind(crypto.randomUUID(),id,user,label,'admin',now)]);return teamJSON({id,role:'admin'},201);
 }
 if(route==='join'&&request.method==='POST'){
  const r=await teamBody(request),token=teamClean(r.code,100),label=teamClean(r.label,100);if(!label||!/^[0-9a-f]{64}$/.test(token))return teamJSON({error:'Enter an operator label and valid invitation code.'},400);
  const invite=await db.prepare('SELECT * FROM team_invites WHERE token_hash=?').bind(await teamHash(token)).first(),now=new Date().toISOString();if(!invite||invite.used_by||invite.expires_at<=now)return teamJSON({error:'Invitation invalid, expired or already used.'},409);
  const old=await db.prepare('SELECT role FROM team_members WHERE team_id=? AND user_id=?').bind(invite.team_id,user).first();if(old)return teamJSON({error:'Already a member of this workspace.'},409);
  await db.batch([db.prepare('INSERT INTO team_members (id,team_id,user_id,label,role,invite_id,joined_at) SELECT ?,team_id,?,?,role,id,? FROM team_invites WHERE id=? AND used_by IS NULL AND expires_at>?').bind(crypto.randomUUID(),user,label,now,invite.id,now),db.prepare('UPDATE team_invites SET used_by=? WHERE id=? AND used_by IS NULL AND EXISTS (SELECT 1 FROM team_members WHERE invite_id=? AND user_id=?)').bind(user,invite.id,invite.id,user)]);
  const joined=await db.prepare('SELECT role FROM team_members WHERE team_id=? AND user_id=?').bind(invite.team_id,user).first();if(!joined)return teamJSON({error:'Invitation was used concurrently. Request another code.'},409);return teamJSON({id:invite.team_id,role:joined.role},201);
 }
 const team=u.searchParams.get('workspace');if(!team)return teamJSON({error:'Select a workspace.'},400);
 const membership=await db.prepare('SELECT * FROM team_members WHERE team_id=? AND user_id=?').bind(team,user).first();if(!membership)return teamJSON({error:'Workspace membership required.'},403);
 if(['dynamic','protocol'].includes(route)&&request.method==='POST')return dynamicApi(request,{db,team,user,membership,route,env});
 if(route==='protocol-create'&&request.method==='POST')return createProtocol(request,{db,team,user,membership});
 if(route==='workspace'&&request.method==='GET'){
  const [visits,events,members]=await Promise.all([db.prepare('SELECT * FROM team_visits WHERE team_id=? ORDER BY updated_at DESC LIMIT 100').bind(team).all(),db.prepare('SELECT e.*,m.label AS actor_label FROM team_events e LEFT JOIN team_members m ON m.team_id=e.team_id AND m.user_id=e.actor_id WHERE e.team_id=? ORDER BY e.at DESC LIMIT 150').bind(team).all(),db.prepare('SELECT label,role,joined_at FROM team_members WHERE team_id=? ORDER BY joined_at').bind(team).all()]);return teamJSON({membership:{role:membership.role,label:membership.label},visits:visits.results.map(v=>({...v,snapshot:JSON.parse(v.snapshot)})).filter(v=>v.snapshot.recordType!=='protocol'),protocols:visits.results.map(v=>({...v,snapshot:JSON.parse(v.snapshot)})).filter(v=>v.snapshot.recordType==='protocol'),events:events.results,members:members.results,serverTime:new Date().toISOString()});
 }
 if(route==='invite'&&request.method==='POST'){
  if(membership.role!=='admin')return teamJSON({error:'Workspace administrator required.'},403);const r=await teamBody(request);if(!teamRoles.includes(r.role))return teamJSON({error:'Choose nurse, physician or pharmacist.'},400);const code=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),expires=new Date(Date.now()+86400000).toISOString();await db.prepare('INSERT INTO team_invites (id,team_id,token_hash,role,expires_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),team,await teamHash(code),r.role,expires).run();return teamJSON({code,role:r.role,expiresAt:expires,singleUse:true},201);
 }
 if(route==='visits'&&request.method==='POST'){
  if(!['admin','nurse'].includes(membership.role))return teamJSON({error:'Nurse role required to create a visit.'},403);const r=await teamBody(request);if(r.syntheticOnly!==true||!teamUUID(r.requestKey)||! /^(FN-\d{3}|WALK-[A-Z-]+\d{2}|SIM-[A-Za-z0-9_-]{1,50})$/.test(r.caseCode)||!teamTimeOK(r.triageAt))return teamJSON({error:'Select a synthetic case, valid triage time and synthetic-only confirmation.'},400);
  const old=await db.prepare('SELECT id FROM team_visits WHERE id=? AND team_id=?').bind(r.requestKey,team).first();if(old)return teamJSON({...old,duplicate:true});
  const s=r.measurements||{},spec={age:[18,120],temperature:[30,45],anc:[0,100],systolic:[30,300],crcl:[0,250]},measurements={};for(const [key,[min,max]]of Object.entries(spec)){const v=s[key];if(v===null||v===undefined||v===''){measurements[key]=null;continue}if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)return teamJSON({error:'Invalid '+key},400);measurements[key]=v}
  const now=new Date().toISOString(),snapshot={syntheticOnly:true,measurements,triageAt:new Date(r.triageAt).toISOString(),plan:null,pharmacy:null,dose:null};
  if(r.actionCaseId){const custom=r.actionCaseId?.startsWith('USR-')?globalThis.FNIntakeCore.restoreCase({...r.actionCase,intakeContext:{...r.actionCase?.intakeContext,triageAt:r.triageAt}},r.actionInput):null;const c=actionCases.find(c=>c.id===r.actionCaseId)||custom;if(!c||c.id!==r.actionCaseId||r.caseCode!=='SIM-'+c.id)return teamJSON({error:'Invalid action case'},400);const input=globalThis.FNAction.cleanInput(r.actionInput);const checks=globalThis.FNAction.calculate(input,c,0).checks,exclusions=Array.isArray(r.actionExclusions)?r.actionExclusions:[];if(exclusions.some(x=>!checks.some(t=>t.code===x)))return teamJSON({error:'Invalid task selection'},400);snapshot.a2a={caseId:c.id,caseMeta:c.userEntered?{id:c.id,intakeContext:c.intakeContext}:null,input,exclusions:[...new Set(exclusions)],version:'A2A-1.0',savedAt:now,by:user};snapshot.measurements={age:input.age,temperature:input.temp,anc:input.anc,systolic:input.sbp,crcl:input.crcl};}
  await db.batch([db.prepare('INSERT INTO team_visits (id,team_id,case_code,stage,revision,snapshot,last_operation,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(r.requestKey,team,r.caseCode,'physician_review',1,JSON.stringify(snapshot),r.requestKey,now,now),teamEvent(db,team,r.requestKey,user,membership.role,membership.role==='admin'?'nurse':membership.role,'VISIT_CREATED','Synthetic triage recorded; physician review requested.',now)]);return teamJSON({id:r.requestKey},201);
 }
 if(route==='assessment-action'&&request.method==='POST'){
  if(!['admin','nurse','physician'].includes(membership.role))return teamJSON({error:'Assessment editing requires nurse or physician role.'},403);
  const r=await teamBody(request);if(!teamUUID(r.operationKey)||!Number.isInteger(r.revision))return teamJSON({error:'Revision and operation key required.'},400);
  const visit=await db.prepare('SELECT * FROM team_visits WHERE id=? AND team_id=?').bind(r.id,team).first();if(!visit)return teamJSON({error:'Visit not found.'},404);if(visit.last_operation===r.operationKey)return teamJSON({ok:true,duplicate:true});if(visit.stage==='complete')return teamJSON({error:'Completed visits retain their administration record. Create a new synthetic visit for reassessment.'},409);if(visit.revision!==r.revision)return teamJSON({error:'Visit changed on another device. Refresh before continuing.'},409);
  const snapshot=JSON.parse(visit.snapshot),c=actionCases.find(c=>c.id===snapshot.a2a?.caseId)||(snapshot.a2a?.caseMeta?globalThis.FNIntakeCore.restoreCase(snapshot.a2a.caseMeta,snapshot.a2a.input):null);if(!c)return teamJSON({error:'Not an assessment-to-action case.'},400);
  const input=globalThis.FNAction.cleanInput(r.input),updatedCase=c.userEntered&&r.actionCase?globalThis.FNIntakeCore.restoreCase(r.actionCase,input):c;if(updatedCase.id!==c.id)return teamJSON({error:'Assessment identity cannot be changed'},400);if(updatedCase.userEntered){updatedCase.intakeContext.triageAt=updatedCase.intakeContext.triageAt||snapshot.triageAt;snapshot.triageAt=updatedCase.intakeContext.triageAt;}const result=globalThis.FNAction.calculate(input,c,0),now=new Date().toISOString();
  const exclusions=Array.isArray(r.exclusions)?r.exclusions:[];if(exclusions.some(x=>!result.checks.some(t=>t.code===x)))return teamJSON({error:'Invalid task selection'},400);
  snapshot.a2a={caseId:c.id,caseMeta:updatedCase.userEntered?{id:updatedCase.id,intakeContext:updatedCase.intakeContext}:null,input,exclusions:[...new Set(exclusions)],version:result.version,savedAt:now,by:user};snapshot.measurements={age:input.age??null,temperature:input.temp??null,anc:input.anc??null,systolic:input.sbp??null,crcl:input.crcl??null};snapshot.plan=null;snapshot.pharmacy=null;snapshot.dose=null;
  const op=r.operationKey,resultDB=await db.batch([db.prepare('UPDATE team_visits SET stage=?,revision=revision+1,snapshot=?,last_operation=?,updated_at=? WHERE id=? AND team_id=? AND revision=? AND stage=?').bind('physician_review',JSON.stringify(snapshot),op,now,visit.id,team,r.revision,visit.stage),teamEvent(db,team,visit.id,user,membership.role,membership.role,'ASSESSMENT_UPDATED','Assessment changed; plan, pharmacy review and dose documentation reset for new revision.',now,op)]);if(!resultDB[0].meta?.changes)return teamJSON({error:'Concurrent change detected. Refresh; nothing was overwritten.'},409);return teamJSON({ok:true});
 }
 if(route==='transition'&&request.method==='POST'){
  const r=await teamBody(request),rule=teamTransitions[r.action],note=teamClean(r.note);if(!rule||!teamUUID(r.operationKey)||!Number.isInteger(r.revision)||!note)return teamJSON({error:'Action, revision, operation key and rationale are required.'},400);
  if(membership.role!=='admin'&&membership.role!==rule.role)return teamJSON({error:rule.role+' role required.'},403);
  const visit=await db.prepare('SELECT * FROM team_visits WHERE id=? AND team_id=?').bind(r.id,team).first();if(!visit)return teamJSON({error:'Visit not found.'},404);if(visit.last_operation===r.operationKey)return teamJSON({ok:true,duplicate:true});if(visit.revision!==r.revision||visit.stage!==rule.from)return teamJSON({error:'Visit changed on another device. Refresh before continuing.'},409);
  const snapshot=JSON.parse(visit.snapshot),now=new Date().toISOString();
  if(r.action==='submit_plan'){const plan=teamClean(r.plan,4000);if(!plan)return teamJSON({error:'Enter a draft plan. No executable orders are transmitted.'},400);snapshot.plan={text:plan,note,by:user,at:now};snapshot.pharmacy=null}
  if(r.action==='pharmacy_review'||r.action==='request_changes')snapshot.pharmacy={decision:r.action==='pharmacy_review'?'Reviewed for demo handoff':'Changes requested',note,by:user,at:now};
  if(r.action==='record_dose'){if(!teamTimeOK(r.administeredAt)||Date.parse(r.administeredAt)<Date.parse(snapshot.triageAt)||!teamClean(r.regimen,300))return teamJSON({error:'Enter a synthetic regimen and actual dose time between triage and now.'},400);snapshot.dose={regimen:teamClean(r.regimen,300),administeredAt:new Date(r.administeredAt).toISOString(),note,by:user,at:now};}
  if(snapshot.dynamic){const actor={id:user,role:membership.role},when=Date.now(),key=r.operationKey;
   if(r.action==='submit_plan')snapshot.dynamic=FNDynamic.mutate(snapshot.dynamic,{action:'propose_plan',operationKey:key+'-plan',plan:r.plan,note},actor,when);
   if(r.action==='pharmacy_review'||r.action==='request_changes')snapshot.dynamic=FNDynamic.mutate(snapshot.dynamic,{action:'pharmacy_plan',operationKey:key+'-pharmacy',decision:r.action==='pharmacy_review'?'approve':'changes',note},actor,when);
   if(r.action==='record_dose')snapshot.dynamic=FNDynamic.mutate(snapshot.dynamic,{action:'record_dose',operationKey:key+'-dose',actualAt:r.administeredAt,regimen:r.regimen,note},actor,when);
  }
  const next=rule.to,op=r.operationKey;const result=await db.batch([db.prepare('UPDATE team_visits SET stage=?,revision=revision+1,snapshot=?,last_operation=?,updated_at=? WHERE id=? AND team_id=? AND revision=? AND stage=?').bind(next,JSON.stringify(snapshot),op,now,visit.id,team,r.revision,rule.from),teamEvent(db,team,visit.id,user,membership.role,rule.role,r.action,note,now,op)]);if(!result[0].meta?.changes)return teamJSON({error:'Concurrent change detected. Refresh; nothing was overwritten.'},409);const delivery=await deliverEncounterAlerts(env,{db,team,user,visitId:visit.id,operationKey:op,before:JSON.parse(visit.snapshot).dynamic,after:snapshot.dynamic});return teamJSON({ok:true,stage:next,delivery});
 }
 return teamJSON({error:'Unknown endpoint.'},404);
 }catch{return teamJSON({error:'Request could not be completed. Refresh to check server state before retrying.'},400)}
}
