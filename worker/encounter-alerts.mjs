import {msgPush} from './messaging.mjs';
/* Dispatch only newly committed encounter notifications to verified staff memberships. */
export async function deliverEncounterAlerts(env,{db,team,user,visitId,operationKey,before,after}){
 const pending=(after?.encounter?.notifications||[]).filter(n=>!(before?.encounter?.notifications||[]).some(x=>x.id===n.id));
 if(!pending.length)return [];
 const output=[];
 try{
  const accounts=(await db.prepare("SELECT id,label,role,workspace_id FROM access_accounts WHERE status='approved'").all()).results;
  for(const n of pending){const recipients=[];for(const a of accounts){if(a.workspace_id!==team||!n.roles.includes(a.role))continue;const m=await db.prepare('SELECT * FROM team_members WHERE team_id=? AND user_id=?').bind(team,'sb:'+a.id).first();if(m&&n.roles.includes(m.role))recipients.push(a.id)}
   const results=await Promise.all(recipients.map(async id=>{try{return await msgPush(env||{},id,n.id,'clinical')}catch{return{accepted:0,failed:1,configured:false}}}));
   const record={notificationId:n.id,recipients:recipients.length,accepted:results.reduce((s,r)=>s+(r.accepted||0),0),failed:results.reduce((s,r)=>s+(r.failed||0),0),devices:results.reduce((s,r)=>s+(r.devices||0),0),configured:!!env?.VAPID_PUBLIC_KEY&&!!env?.VAPID_PRIVATE_KEY,state:!recipients.length?'no_matching_staff':results.some(r=>r.accepted)?'push_service_accepted':'in_app_only',notDeliveryConfirmation:true};
   await db.prepare('INSERT INTO team_events (id,team_id,visit_id,actor_id,actor_role,performed_role,action,note,at) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),team,visitId,user,'system','system','CLINICAL_ALERT_DELIVERY',JSON.stringify(record),new Date().toISOString()).run();output.push(record);
  }
 }catch{output.push({state:'delivery_unknown',notDeliveryConfirmation:true})}
 return output;
}
