const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');const {assess}=require('../dist/rules.js'),{cefepimeReference}=require('../dist/orders-metrics-core.js'),K=require('../dist/knowledge-core.js');
const ctx={assess,state:{},overview(){},detail(){},render(){},TABS:[],navs:[],cefepimeReference};vm.createContext(ctx);for(const f of ['assessment.js','scope-evidence.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
ctx.FNKnowledge=K;ctx.orderView=()=>'';const orderSource=fs.readFileSync('dist/orders-quality.js','utf8');vm.runInContext(orderSource.slice(orderSource.indexOf('const templates='),orderSource.indexOf('function orderContext')),ctx);vm.runInContext(fs.readFileSync('dist/traceable-orders.js','utf8'),ctx);
const result=K.cases.map(c=>K.evaluateCase(c,ctx));for(const r of result)assert.equal(r.pass,true,r.id+': '+JSON.stringify(r.differences));assert.equal(result.length,15);
const changed={...K.cases[0],expected:{...K.cases[0].expected,score:25}};assert.equal(K.evaluateCase(changed,ctx).pass,false);
console.log('PASS: 15 predefined fixtures compared against production FN, MASCC, pathway and renal functions; changed expected score produces failure');
// Exercise actual UI mutation handlers without accepting blank rationales.
let persisted=0,dialogClosed=0;const order={subtype:'FN-1',version:1,items:[{text:'Review allergy',include:true,changes:[]}],review:{reviewer:'prior'}};
const formCtx={state:{orderDrafts:{P:order},orderHistory:[]},selected:{'Patient ID':'P'},id:p=>p['Patient ID'],FNKnowledge:K,orderView(){return ''},templates:{'FN-1':{}},FormData:class{constructor(x){this.x=x}get(k){return this.x[k]}},closeDialog(){dialogClosed++},save(){persisted++},preserveOrderVersion(){this.state.orderHistory.unshift(JSON.parse(JSON.stringify(order)));order.version++;order.review=null;return order}};
// Use closure rather than receiver for the same browser-global call convention.
formCtx.preserveOrderVersion=()=>{formCtx.state.orderHistory.unshift(JSON.parse(JSON.stringify(order)));order.version++;order.review=null;return order};vm.createContext(formCtx);vm.runInContext(fs.readFileSync('dist/traceable-orders.js','utf8'),formCtx);
formCtx.applyOrderChange(0,false,{reason:'   '});assert.equal(order.items[0].include,true);assert.equal(persisted,0);
formCtx.applyOrderChange(0,false,{reason:'Synthetic duplicate review'});assert.equal(order.items[0].include,false);assert.equal(order.review,null);assert.equal(order.version,2);assert.equal(order.changes,undefined);assert.equal(order.items[0].changes[0].reason,'Synthetic duplicate review');assert.equal(formCtx.state.orderHistory[0].items[0].include,true);
formCtx.saveOrderItem(0,{text:'New item',reason:'',sourceNote:'section'});assert.equal(order.items[0].text,'Review allergy');
formCtx.saveOrderItem(0,{text:'New item',reason:'Context changed',sourceNote:'Draft review section'});assert.equal(order.items[0].text,'New item');assert.equal(order.version,3);
console.log('PASS: blank reasons block mutation; exclusion/edit retain history, rationale and source while invalidating review');
