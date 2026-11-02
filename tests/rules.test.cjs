const assert=require('node:assert/strict');
const {assess}=require('../dist/rules.js');
const patients=require('../dist/patients.json');
for(const p of patients){assert.equal(assess(p).score,p['MASCC score'],p['Patient ID']);assert.equal(assess(p).risk,p['Final risk group'],p['Patient ID']);}
assert.equal(assess({}).risk,'Unknown');
const p=patients[0];assert.equal(assess({...p,'Systolic BP (mmHg)':90}).score,assess({...p,'Systolic BP (mmHg)':91}).score-5);
console.log('402 comparisons passed; workbook agreement is not clinical validation.');
