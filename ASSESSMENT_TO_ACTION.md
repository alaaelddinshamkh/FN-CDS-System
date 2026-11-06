# Patient assessment to action · A2A-1.0

This release adds 20 fictional adult cancer-associated febrile neutropenia scenarios. Open **Assessment to action** from the desktop navigation or mobile dashboard. The original workbook remains accessible through **Workbook assessments**.

## Workflow

Choose a case, edit the structured assessment, then apply it. The engine explains FN criteria, MASCC components, high-risk overrides, assessment gaps, outpatient eligibility, initial antibacterial references, subsequent renal dosing references and first-hour proposed tasks. Narrative history is context; it is not automatically parsed into findings.

The simulation clock reveals only results available at the selected time. Prior organism history is explicitly separate from current cultures. Later susceptibility does not rewrite the initial decision; it prompts reassessment. Laboratory fixtures and the teaching timeline remain the original fictional case if the assessment is edited. Teaching events never count as actual treatment or quality outcomes.

Task checkboxes select proposed draft items. Local review and action documentation are self-attested training records. They are invalidated when inputs or selected items change. Antibiotic administration requires the shared role workflow and an explicitly entered regimen and time.

**Load my shared workspace** connects to existing staff membership. Nurse/admin can create a shared synthetic visit. Nurse/physician/admin can update its structured assessment. Updating an unfinished visit resets physician/pharmacy review. Completed visits preserve administration records; reassessment uses a new visit. Physician → pharmacist → nurse transitions retain the existing server role, revision, origin and audit checks. Administrators can rehearse each role, logged as administrators.

The full structured assessment and task exclusions are saved inside the existing `team_visits.snapshot.a2a` JSON. Existing private Supabase storage, access guards and fixed parameterized SQL are reused. No schema or query-catalog changes are required. Unsaved exploration is device-local.

## Cases

| ID | Presentation |
|---|---|
| A2A-01 | Stable solid tumour, outpatient candidate |
| A2A-02 | Older stable outpatient candidate |
| A2A-03 | AML with profound prolonged neutropenia |
| A2A-04 | Severe symptoms during inpatient chemotherapy |
| A2A-05 | Stable CKD, CrCl 45 |
| A2A-06 | Advanced CKD, CrCl 20 |
| A2A-07 | Intermittent haemodialysis |
| A2A-08 | Changing renal function / AKI |
| A2A-09 | Hypotension and acute confusion |
| A2A-10 | Pneumonia with new hypoxia |
| A2A-11 | Suspected line infection and prior MRSA |
| A2A-12 | Recent ESBL bloodstream infection |
| A2A-13 | Prior susceptible KPC isolate |
| A2A-14 | Immediate penicillin hypersensitivity |
| A2A-15 | Severe cutaneous drug reaction |
| A2A-16 | Suspected neutropenic enterocolitis |
| A2A-17 | Urinary-source presentation |
| A2A-18 | Breakthrough fever on FQ prophylaxis |
| A2A-19 | Persistent fever during existing therapy |
| A2A-20 | Incomplete initial assessment |

## Evidence and clinical limits

Draft educational reference only. Clinical validation, institutional adoption, local formulary/antibiogram and prescriber/pharmacist approval remain pending. These 20 examples do not cover all patients or permit autonomous prescribing. No clinical orders are transmitted. Paediatrics, pregnancy-specific regimens, obesity dosing, complex renal replacement and other resistance mechanisms require individualized review.

“High risk + urgent instability” describes escalation, not a separately validated MASCC class. Physiologic red flags and clinical overrides take precedence over a reassuring score. Missing safety information blocks automated numeric selection. Changing renal function does not produce an invented maintenance interval. Existing antibiotic therapy does not generate a duplicate first dose. SCAR and complex renal/allergy scenarios require urgent specialist selection.

Sources and dose-specific links are in `dist/action-core.js` and displayed beside each draft. References checked 4 November 2026 include IDSA FN guidance, ASCO/IDSA outpatient guidance, the July 2025 FDA cefepime label, IDSA AMR guidance, UCSF drug references, MD Anderson outpatient algorithm, AVYCAZ and vancomycin product labels. The cefepime HD reference deliberately follows the FDA label rather than mixing institutional HD regimens. Infusion start within 60 minutes is distinct from completion of a long infusion.

## Verification and extension

`node --test tests/*.test.cjs` runs 28 test files. New checks cover all 20 expected pathways, dose boundaries, missing-data and allergy guards, objective instability, no future microbiology leakage, shared input validation, role isolation, stale revisions, review invalidation and completed-dose preservation. These checks verify software behavior; they are not clinical validation.

- `dist/action-cases.json`: fictional case inputs, timed results, microbiology and teaching events.
- `dist/action-core.js`: shared pure decision logic and reference links, used by browser and Worker.
- `dist/action-ui.js` / `.css`: case library, editor, explanations, doses, task draft, clock and shared handoff.
- `worker/team.mjs`: structured assessment persistence using existing private storage and permissions.
- `tests/action*.test.cjs`: independent clinical-fixture expectations and shared workflow tests.

To add cases, provide a unique ID, complete structured input including explicit unknowns, realistic timestamped laboratory/culture fixtures, history, prior microbiology, a teaching timeline and independently reviewed expected outputs. Add tests and obtain clinical review before changing the draft status.

## Named patient registry and results integration

The 20 canonical scenarios now have fictional display names and stable `SIM-A2A-01` through `SIM-A2A-20` patient IDs. They join the 200 imported patients and the three walkthroughs in Overview (223 on an unmodified demo workspace). The original workbook is retained unchanged. **Show the 20 patients** filters their rows; search matches their names and IDs.

Each record opens the normal laboratory, culture and vital-sign tabs, with a link back to the same assessment-to-action scenario. The integration inbox supports a named patient selector, a group filter for these 20 patients, and result search. Uploaded result matching accepts the same canonical IDs.

`action-registry-core.js` projects the shared canonical case JSON into patient records and result events. No duplicate clinical dataset or new database schema is introduced. The canonical fixtures ship with the application; device-local assessment edits, result reviews and per-case simulation positions retain the existing local persistence. Saving a team visit continues to use Supabase through the existing shared workflow.

Only results released by each case's simulation clock enter the inbox. Current cultures begin as pending; reported growth and AST appear at their own release times. Rewinding removes later scenario-generated events without deleting unrelated imported results. Repeat refreshes use stable event IDs. Fictional result timestamps use an explicit simulation anchor and never document actual collection or administration.

## New assessment: observations to suggested pathway

The Assessment navigation and Overview primary action now open **New assessment**, a blank structured adult-oncology input workspace. The 20 teaching scenarios remain available through their own tab. Temperature, oral measurement method, fever duration, ANC, vital signs, MASCC components, clinical risk features, renal trajectory, allergy and prior treatment are entered explicitly. MASCC is calculated from components; no score is silently assigned.

A live panel explains the suggested track, missing verification, first-hour clock, actions to review now, work-up status, source-directed assessment, antibacterial references and reassessment/disposition. Existing collection or treatment status changes the suggested follow-up; it does not certify completed care. Unknown values remain unknown. Invalid numbers or future times withhold the displayed medication draft. Documented instability takes priority over completing the form.

Triage time is separate from reported fever onset. Fever duration is verified separately rather than inferred from onset. The first-hour display refreshes while the screen is visible; it is not background patient monitoring or an emergency notification service. Diagnostic work-up summaries reference NICE CG151 and timing/eligibility reference ASCO/IDSA. Existing drug references remain draft and require institutional approval.

Saving creates a `USR-…` entered assessment with the same core risk/dose logic and a stable `SIM-USR-…` registry ID. It has no invented laboratory values, cultures, or teaching timeline. It can be reopened, revised, exported or saved to the existing shared role workflow. Role authorization, optimistic revision checks, approval invalidation, completed-visit protection and private Supabase storage are retained. Shared encounter context and triage use one saved time. Local input/assessment storage and explicitly saved team visits remain separate.

Implementation: `dist/intake-core.js` (unknown-first input, context validation, task track), `dist/intake-ui.js` / `.css` (live form), and small registry/team extensions. `tests/intake*.test.cjs` verifies missing-data guards, independent stable/unstable expectations, clocks, existing treatment, no fabricated results, persistence, validation and stale revisions. This software verification is not clinical validation.

## Continuous follow-up

Open **Dynamic reassessment** from a patient record, or choose **10 worked examples** in New Assessment. See [DYNAMIC_REASSESSMENT.md](DYNAMIC_REASSESSMENT.md) for protocol governance, action/test lifecycles, role-enforced shared use and measurement definitions.
