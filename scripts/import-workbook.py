from pathlib import Path
import openpyxl,json,hashlib,shutil,re,sys
root=Path(__file__).resolve().parents[1]
if len(sys.argv)!=2:raise SystemExit('Usage: python scripts/import-workbook.py SOURCE.xlsx')
src=Path(sys.argv[1])
w=openpyxl.load_workbook(src,data_only=True);f=openpyxl.load_workbook(src,data_only=False)
rows=list(w['Patients'].values);headers=list(rows[1]);patients=[dict(zip(headers,r)) for r in rows[2:] if isinstance(r[0],str) and re.fullmatch(r'FN-\d+',r[0])]
srows=list(w['Scenarios'].values);scenarios=[dict(zip(srows[4],r)) for r in srows[5:] if isinstance(r[0],str) and re.fullmatch(r'[LHPU]\d+',r[0])]
index=w['MASCC Index'];points={'burden':{'None/mild':index['C4'].value,'Moderate':index['C5'].value,'Severe':index['C6'].value},'noHypotension':index['C7'].value,'noCOPD':index['C8'].value,'cancerFungal':index['C9'].value,'noDehydration':index['C10'].value,'outpatient':index['C11'].value,'age':index['C12'].value,'lowThreshold':index['C14'].value,'ageCutoff':index['C15'].value,'hypotensionThreshold':index['C16'].value,'max':index['C17'].value}
# Preserve raw cached cells and formula expressions separately. No formula is executed as code.
sheets={s.title:{'values':[list(r) for r in s.values],'formulas':{c.coordinate:c.value for row in f[s.title] for c in row if c.data_type=='f'}} for s in w}
steps={};active=None
for row in w['Scenario Pathways'].values:
 if isinstance(row[0],str) and re.match(r'^[LHPU]\d+ [—–-]',row[0]):active=row[0].split()[0];steps[active]=[]
 elif active and isinstance(row[0],int):steps[active].append({'step':row[0],'title':row[1],'action':row[2],'source':row[3]})
for c in scenarios:c['patientId']='WB-'+c['Scenario'];c['steps']=steps.get(c['Scenario'],[])
# Worksheet notes retain an older count (16). Actual extracted scenario count is authoritative.
out={'source':src.name,'sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'syntheticOnly':True,'version':'workbook-2026-11-10','index':points,'patients':patients,'scenarios':scenarios,'sheets':sheets,'counts':{'patients':len(patients),'scenarios':len(scenarios),'sheets':len(sheets)},'notes':['Source Data Dictionary describes 16 scenarios, while the attached Scenarios sheet contains 21.','Medication and renal dose text is imported teaching material, not clinically approved executable prescribing logic.']}
out['sourceKeys']={k:hashlib.sha256(('workbook-source:'+k).encode()).hexdigest()[:24] for k in [r['Patient ID'] for r in patients]+[c['patientId'] for c in scenarios]}
(root/'dist/workbook-data.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
# Canonical cohort file used by the existing patient registry.
(root/'dist/patients.json').write_text(json.dumps(patients,ensure_ascii=False,indent=2)+'\n')
shutil.copyfile(src,root/'dist/fn-source-workbook.xlsx')
print(out['counts'],out['index']);print('scenario step counts',[(c['Scenario'],len(c['steps'])) for c in scenarios])
