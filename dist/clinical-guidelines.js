/* Curated source registry. Summaries are project paraphrases, not local adoption. */
(function(root){
const checked='2026-11-12';
const sources={
 fn:{title:'IDSA adult febrile neutropenia guideline',version:'2010 update / published 2011',location:'Recommendations 9–19: initial therapy, allergy, risk and clinical / microbiology-guided modification',url:'https://www.idsociety.org/practice-guideline/neutropenic-patients-with-cancer/',scope:'Foundational adult cancer-associated FN selection guidance; interpret resistance recommendations with current AMR guidance.',status:'Foundational reference · local reconciliation required'},
 outpatient:{title:'ASCO/IDSA outpatient FN guideline',version:'2018',location:'Patient selection; initial therapy and observation; outpatient antimicrobial recommendations',url:'https://www.idsociety.org/practice-guideline/fever-and-neutropenia-in-adults-with-cancer/',scope:'Selected outpatient candidates; MASCC plus clinical and practical suitability. First empirical therapy within 1 hour and at least 4 hours observation before discharge.',status:'Guideline reference · local adoption pending'},
 agiho:{title:'AGIHO / DGHO adult neutropenic fever guideline',version:'2024 update / published 2025',location:'Risk stratification; first-line antimicrobial therapy; second-line treatment; duration',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC11836497/',scope:'Serial clinical reassessment, antipseudomonal therapy and local epidemiology. Persistent fever alone does not require automatic antibiotic escalation.',status:'Updated guideline · not a local protocol'},
 amr:{title:'IDSA antimicrobial-resistant Gram-negative infection guidance',version:'2026',location:'ESBL-E invasive infections; CRE / KPC treatment; mechanism and susceptibility',url:'https://www.idsociety.org/practice-guideline/amr-guidance/',scope:'Organism- and mechanism-specific treatment informed by susceptibility; reserve agents are not routine empirical FN therapy.',status:'Current AMR reference · ID review required'}
};
for(const s of Object.values(sources))s.checked=checked;
const applications=[
 {id:'inpatient',name:'High-risk / inpatient FN',summary:'An appropriate IV antipseudomonal backbone; clinical instability and local resistance guide selection. A risk score alone does not select a specific antibiotic.',sources:['fn','agiho']},
 {id:'outpatient',name:'Selected low-risk outpatient candidate',summary:'Review clinical stability, oral tolerance, support and return access. The oral combination is conditional; prior fluoroquinolone prophylaxis excludes that empirical pathway.',sources:['outpatient']},
 {id:'reassessment',name:'Dynamic reassessment',summary:'Review changing findings and microbiology. Reassess persistent fever and deterioration; avoid escalation solely because fever continues.',sources:['agiho']},
 {id:'resistance',name:'ESBL / KPC / other resistance',summary:'Confirm organism, resistance mechanism, susceptibility, source and recent exposure before selecting a resistance-specific regimen.',sources:['amr']},
 {id:'duration',name:'Antibiotic duration / stopping',summary:'Guidelines differ by scope and era. AGIHO permits selected empirical discontinuation after sustained defervescence and recovery irrespective of neutrophil count. Apply an approved local policy and clinician review; no automatic stop rule is encoded.',sources:['agiho','fn']}
];
const api={version:'FN-GUIDELINES-1.1',checked,sources,applications};root.FNClinicalGuidelines=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
