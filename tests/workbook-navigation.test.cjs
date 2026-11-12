const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const data=JSON.parse(fs.readFileSync('dist/workbook-data.json','utf8'));
test('patient group navigation preserves the index, dictionary and full registry',async()=>{
 const app={innerHTML:''};let shown=[];
 const ctx={console,window:{scrollTo(){}},FNWorkbookCore:require('../dist/workbook-core.js'),
 state:{customPatients:[],results:[],assessments:{},customActionCases:[]},patients:[...data.patients,{'Patient ID':'A2A-01'}],view:'Overview',page:7,search:'',filter:'All',selected:null,
 id:p=>p['Patient ID'],esc:v=>String(v??''),header:(a,b)=>`<h1>${a}</h1><p>${b}</p>`,badge:v=>v,patientName:p=>p['Patient ID'],uiIcon:()=>'',
 assess:()=>({score:0,risk:'High'}),detail:()=>'',renderNavigation:()=>'',refreshRows(){shown=ctx.patients.map(ctx.id)},
 overview(){shown=ctx.patients.map(ctx.id);return '<p>registry</p>'},
 render(){ctx.patients=[...data.patients,{'Patient ID':'A2A-01'},...ctx.state.customPatients];app.innerHTML=ctx.view==='Overview'?ctx.overview():'';},
 go(v){ctx.view=v;ctx.render()},$:()=>app,fetch:async()=>({ok:true,json:async()=>data})};
 ctx.window=Object.assign(ctx.window,ctx);vm.createContext(ctx);vm.runInContext(fs.readFileSync('dist/workbook-ui.js','utf8'),ctx);
 await new Promise(setImmediate);
 const ui=ctx.window.fnWorkbook;
 assert.equal(shown.length,222);assert.match(app.innerHTML,/All patients/);
 for(const [scope,count] of [['primary',200],['secondary',22],['all',222]]){
 ui.scope(scope);assert.equal(ctx.page,0);assert.equal(shown.length,count);assert.equal(ctx.patients.length,222);
 ctx.refreshRows();assert.equal(shown.length,count);
 ui.tab('MASCC Index');assert.match(app.innerHTML,/Primary MASCC reference/);assert.match(app.innerHTML,/Maximum score/);
 ui.tab('Data Dictionary');assert.match(app.innerHTML,/Source data dictionary/);assert.match(app.innerHTML,/Result linkage/);
 }
 ui.scope('primary');ui.tab('Patients');assert.equal(ctx.view,'Overview');ui.tab('Scenarios');assert.equal(ctx.view,'Scenario library');ui.tab('MASCC Index');assert.match(app.innerHTML,/Primary MASCC reference/);
 assert.equal(new Set(ctx.patients.map(ctx.id)).size,222);
});
