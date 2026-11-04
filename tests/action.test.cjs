const assert=require('node:assert/strict'),a=require('../dist/action-core.js'),cases=require('../dist/action-cases.json');
const p=n=>structuredClone(cases[n-1].input),calc=(n,patch={})=>a.calculate({...p(n),...patch},cases[n-1],0);
assert.equal(cases.length,20);assert.equal(new Set(cases.map(x=>x.id)).size,20);
for(const c of cases){a.cleanInput(c.input);const r=a.calculate(c.input,c,0);assert.equal(r.risk,c.expectedPathway,c.id);assert.equal(r.cultures.length,0,c.id+' future culture leak');assert.ok(c.syntheticOnly);assert.ok(r.reviewRequired);assert.ok(c.teaching.every(t=>t.at>=0));assert.ok(!r.checks.some(t=>t.completed));}
assert.deepEqual(calc(1).meds.map(x=>x.code),['ciprofloxacin','amoxicillin-clavulanate']);
for(const [crcl,maintenance] of [[61,'2 g IV every 8h'],[60,'2 g IV every 12h'],[30,'2 g IV every 12h'],[29,'2 g IV every 24h'],[11,'2 g IV every 24h'],[10,'1 g IV every 24h']]){const r=calc(5,{crcl});assert.equal(r.meds[0].first,'2 g IV initial dose once');assert.equal(r.meds[0].maintenance,maintenance);}
assert.match(calc(7).meds[0].first,/1 g/);assert.match(calc(8).meds[0].maintenance,/Withheld/);
assert.equal(calc(9,{renalState:'Changing / AKI'}).meds.length,0,'AKI must not extrapolate renal schedules for unstable combinations');
assert.match(calc(8,{crcl:30}).meds[0].maintenance,/Withheld/);
assert.equal(calc(8,{allergy:'Unknown'}).meds.length,0,'AKI must not bypass allergy gap');
assert.deepEqual(calc(9).meds.map(x=>x.code),['meropenem','vancomycin']);assert.match(calc(9).meds[1].first,/1500 mg/);
assert.equal(calc(9,{weight:180}).meds[1].blocked,true,'Do not extrapolate dosing weight to obesity');
assert.equal(calc(1,{spo2:88}).risk,'High risk + urgent instability','Objective hypoxia must override low score');
assert.equal(calc(1,{rr:32}).risk,'High risk + urgent instability');
assert.equal(calc(12).meds[0].code,'meropenem');assert.equal(calc(13).meds[0].code,'ceftazidime-avibactam');
assert.deepEqual(calc(14).meds.map(x=>x.code),['aztreonam','vancomycin']);
assert.equal(calc(14,{allergyDrug:'Ceftazidime'}).meds[0].blocked,true);assert.equal(calc(15).meds.length,0);
assert.equal(calc(16).meds[0].code,'piperacillin-tazobactam');assert.equal(calc(16,{crcl:15}).meds[0].blocked,true);
assert.equal(calc(1,{fqProphylaxis:true}).outpatient,false);assert.equal(calc(1,{support:false}).outpatient,false);
assert.equal(calc(19).meds.length,0,'Never duplicate active first dose');assert.ok(calc(19).alerts.some(x=>x.includes('antifungal')));
assert.equal(calc(20).meds.length,0);assert.equal(calc(1,{category:'Unknown'}).mascc.score,null);
for(const k of ['newHypoxia','priorAntibiotic','confusion','allergy','crcl'])assert.equal(calc(1,{[k]:null}).meds.length,0,k+' unknown must stop numeric output');
const first=a.calculate(p(12),cases[11],0),late=a.calculate(p(12),cases[11],2880);assert.equal(first.cultures.length,0);assert.ok(late.cultures.some(c=>c.organism));assert.ok(late.cultures.every(c=>c.at<=2880));assert.deepEqual(first.meds,late.meds,'Later AST cannot retroactively rewrite initial decision');
assert.throws(()=>a.cleanInput({...p(1),age:3}));assert.throws(()=>a.cleanInput({...p(1),newHypoxia:'false'}));assert.throws(()=>a.cleanInput({...p(1),extra:'injected'}));assert.throws(()=>a.cleanInput({age:45}));
console.log('PASS: 20 expected pathways; independent dose boundaries, HD/AKI/allergy/obesity guards, objective instability, outpatient exclusion, no duplicate dose, no future-result leakage or generated completion');
