const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../dist/account-access.js'),'utf8');
const approved={signedIn:true,status:'approved',role:'physician',email:'fictional@example.test',account:{label:'Fictional clinician'}};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function harness({mobile=false,role='physician'}={}){
 class Element{
  constructor(){this.style={};this.hidden=false;this.nodes=new Map();this.writes=0;this.value='';this.scrollTop=0}
  set innerHTML(html){this.html=html;this.nodes.clear();this.writes++}
  get innerHTML(){return this.html||''}
  setAttribute(){} focus(){} append(){}
  querySelector(selector){if(selector.startsWith('#')&&!this.innerHTML.includes('id="'+selector.slice(1)+'"'))return null;if(!this.nodes.has(selector))this.nodes.set(selector,new Element());return this.nodes.get(selector)}
  querySelectorAll(){return []}
 }
 const events={window:{},document:{}},aside=new Element(),main=new Element(),top=new Element(),screen=new Element(),calls=[];
 main.innerHTML='<h1>Assessment → suggested pathway</h1><input id="draft">';main.scrollTop=420;main.querySelector('#draft').value='Unfinished history';
 const document={hidden:false,body:{append(){}},createElement(tag){return tag==='section'?screen:new Element()},querySelector:s=>({aside,main,'.top':top}[s]),addEventListener:(type,fn)=>events.document[type]=fn};
 const context={document,location:{hash:''},esc:String,matchMedia:()=>({matches:mobile}),setInterval(){},teamSession:{cached:true},teamData:{cached:true},teamWorkspaceId:'workspace',teamVisitId:'visit',go(){throw Error('Tab restoration must not navigate')},fnMessages:{reset(){}},addEventListener:(type,fn)=>events.window[type]=fn};
 let response={...approved,role},failure=null,pending=null;
 context.fetch=async url=>{calls.push(url);if(url.endsWith('/session')){if(pending)return pending;if(failure)throw failure;return Response.json(response,{status:response?200:401})}if(url.endsWith('/request-summary'))return Response.json({pending:0});return Response.json({ok:true})};
 context.window=context;vm.runInNewContext(source,context);
 return {context,screen,aside,main,calls,events,setResponse:value=>response=value,setFailure:value=>failure=value,setPending:value=>pending=value,async ready(){await settle();assert.equal(screen.hidden,true)},fire(type,target='window'){return events[target][type]()}};
}
test('desktop and mobile tab returns preserve the workspace, draft and scroll without account-screen flashes',async()=>{
 for(const mobile of [false,true])for(const role of ['physician','superadmin']){
  const h=harness({mobile,role});await h.ready();const writes=h.screen.writes,mainWrites=h.main.writes,draft=h.main.querySelector('#draft');
  h.context.document.hidden=true;h.fire('visibilitychange','document');await h.fire('focus');
  assert.equal(h.screen.writes,writes);
  h.context.document.hidden=false;const a=h.fire('focus'),b=h.fire('visibilitychange','document');await Promise.all([a,b]);await settle();
  assert.equal(h.calls.filter(x=>x.endsWith('/session')).length,2,'Focus and visibility events share one request');
  assert.equal(h.screen.hidden,true);assert.equal(h.aside.inert,false);assert.equal(h.main.inert,false);assert.equal(h.screen.writes,writes);assert.equal(h.main.writes,mainWrites);assert.equal(h.main.querySelector('#draft'),draft);assert.equal(draft.value,'Unfinished history');assert.equal(h.main.scrollTop,420);
 }
});
test('temporary failures preserve the page and a reconnect rechecks access',async()=>{
 const h=harness();await h.ready();const writes=h.screen.writes;
 h.setFailure(Error('Offline'));await h.fire('focus');assert.equal(h.screen.hidden,true);assert.equal(h.screen.writes,writes);
 h.setFailure(null);h.setResponse({...approved,status:'suspended'});await h.fire('online');assert.equal(h.screen.hidden,false);assert.match(h.screen.innerHTML,/Account suspended/);assert.equal(h.main.inert,true);
});
test('confirmed expiry blocks access, while role changes open the appropriate account screen',async()=>{
 const expired=harness();await expired.ready();expired.setResponse(null);await expired.fire('focus');assert.match(expired.screen.innerHTML,/Welcome back/);assert.equal(expired.context.teamSession,null);assert.equal(expired.main.inert,true);
 const changed=harness();await changed.ready();changed.setResponse({...approved,role:'nurse'});await changed.fire('focus');assert.equal(changed.screen.hidden,false);assert.match(changed.screen.innerHTML,/Your workspace/);assert.equal(changed.context.teamData,null);
});
test('an old background response cannot overwrite sign-out or an explicit account refresh',async()=>{
 for(const action of ['signout','load']){
  const h=harness();await h.ready();let resolve;h.setPending(new Promise(r=>resolve=r));const check=h.fire('focus');h.setPending(null);
  if(action==='signout')await h.context.fnAccount.signout();else{h.setResponse({...approved,status:'suspended'});await h.context.fnAccount.load()}
  const html=h.screen.innerHTML;resolve(Response.json(approved));await check;
  assert.equal(h.screen.innerHTML,html);assert.equal(h.screen.hidden,false);
 }
});
test('identity-provider outages are retryable and are not reported as expired sessions',async()=>{
 const {accessApi,accessGuard}=await import('../worker/access.mjs');
 for(const status of [429,500,503]){
  const env={SUPABASE_URL:'https://auth.example.test',SUPABASE_PUBLISHABLE_KEY:'test',FN_SUPERADMIN_UID:'owner',DB:{},AUTH_FETCH:async()=>Response.json({error:'Unavailable'},{status})};
  const request=new Request('https://fn.test/api/access/session',{headers:{Cookie:'__Host-fn_session=fictional'}});
  assert.equal((await accessApi(request,env)).status,503);
  await assert.rejects(()=>accessGuard(request,env),/temporarily unavailable/);
 }
});

test('approved staff enter the app directly and account has one application entry',async()=>{
 const h=harness();await h.ready();assert.equal(h.screen.hidden,true);assert.equal(h.aside.inert,false);await h.context.fnAccount.load();assert.equal(h.screen.hidden,false);assert.match(h.screen.innerHTML,/Open application/);assert.doesNotMatch(h.screen.innerHTML,/Open team workspace|Open synthetic clinical workspace/);h.screen.querySelector('#open-application').onclick();assert.equal(h.screen.hidden,true);
});
