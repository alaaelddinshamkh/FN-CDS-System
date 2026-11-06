# Dynamic reassessment and accountable follow-up

Open **Dynamic reassessment** in the clinical navigation/mobile dashboard, or follow the link from any patient record. The stable route is `/#dynamic`. The original workbook, 20 teaching scenarios, entered assessments and 10 new worked examples share their existing patient identities.

## What is implemented

- New observations and patient-matched result imports are compared with current entered data. Changes display the before/after pathway, medicines requiring review, source, observation/availability/receipt/detection times, and responsible review deadline.
- Older observations do not overwrite newer fields. Corrected reports retain previous report versions and their decisions. Acknowledgment is distinct from a clinical decision.
- Input/protocol changes retain the previously accepted plan and recorded dose/action history, while requiring current physician and pharmacy review before new dose documentation. Recent instability and positive cultures prevent an automatic outpatient downgrade.
- Actions have an owner role/label, due time, explicit approval, start/completion status, actual completion time and evidence. Deferrals and cancellations require reasons; neither is counted as a completed action.
- Tests track request, collection, receipt, preliminary/final/amended report, acknowledgment and culture-to-treatment decision. Missing collection/receipt times remain missing when a report arrives without that history.
- Local hospital protocols have immutable prior versions, scope, references, formulary codes, escalation team, change-review and antibiotic timing targets. Physician and pharmacy reviews activate a training version. Editing creates a new draft. Existing reference dose algorithms are retained; excluded formulary drugs are held for individual review, not silently substituted. Applying a version to an episode requires plan reapproval. New entered assessments use the selected active policy, and the live input panel labels it.
- Recorded-use process measurements and scripted simulation evidence are displayed separately. No actual clinical improvement, financial saving or pre/post effect is invented.

## Entry points and examples

**New Assessment → 10 worked examples** loads a prefilled fictional assessment. Its input data and history can be reviewed and saved normally. **Dynamic reassessment → Open the 10 entered examples** opens the corresponding episode; **Release next fictional event** reveals only the next stage.

| Example | Initial presentation | Follow-up challenge |
|---|---|---|
| DYN-01 | Low-risk candidate | Hypotension, then reassessment after instability |
| DYN-02 | Older stable low-risk candidate | Updated ANC and stable observed reassessment |
| DYN-03 | CKD with verified CrCl 45 | New verified CrCl 20 |
| DYN-04 | Advanced CKD | Changing clearance; maintenance estimate withheld |
| DYN-05 | Pneumonia / new hypoxia | Oxygenation improves; MRSA report arrives |
| DYN-06 | Suspected line infection | Preliminary growth, final report, corrected phenotype |
| DYN-07 | Immediate drug allergy | Newly verified severe cutaneous reaction |
| DYN-08 | Prior ESBL infection | Newly documented KPC mechanism and AST |
| DYN-09 | Breakthrough fever on FQ prophylaxis | New hypoxia and escalation review |
| DYN-10 | Persistent fever on existing therapy | Renal update and fungal marker; no duplicate initial dose |

Example baseline laboratory values are explicitly fictional source fixtures. Future culture/AST is not revealed before its stage. Loading an example never records actual treatment. The validation lab separately runs declared fictional staff actions and times; those records never enter measured staff-use rates.

All existing registry patients receive a linked baseline episode; unavailable source fields remain unknown. A workbook without triage timestamps has no claimed clinical first-hour baseline. Linked baselines are not themselves counted as staff use: recorded-use denominators require a changed-data event or documented staff interaction. Results already present at the fictional baseline are attached without manufacturing a new change or completed care.

## Shared versus local workflows

Local episodes are stored in IndexedDB to avoid exhausting the existing registry's localStorage quota. Local role selection is explicitly self-attested rehearsal. Old local registry edits and the original dataset are retained.

**Load shared workspace** uses existing application sign-in and approved team membership. Enroll an existing shared visit to use server-persisted dynamic follow-up. Nursing/physician/pharmacy permissions, workspace isolation, optimistic revision checks and audit records are enforced server-side. Existing Connected demo plan/pharmacy/dose handoffs update the same dynamic ledger.

Local entered-case edits and local file imports do not silently overwrite another shared visit. Shared observations/results are received through the shared follow-up operations. There is no live hospital LIS/EHR connector or background emergency dispatch. Clinical rules remain educational drafts requiring institutional validation and authorized clinical judgment.

Storage reuses `team_visits.snapshot.dynamic`; local protocol records reuse separate snapshots with `recordType: protocol`, excluded from clinical visit queues. No new tables, public grants or SQL-catalog entries are introduced. Protocol application resolves the reviewed server version; client-supplied approval metadata is not trusted. Event and episode size limits require export/new follow-up rather than silently deleting history.

## Process measurement definitions

| Measure | Definition |
|---|---|
| Receipt to detection | Median detection timestamp minus application receipt timestamp; clock resolution is shown, not a throughput benchmark |
| Availability to receipt | Delay between the reported availability time and application receipt; may include operator entry delay |
| Detection to review | Median first acknowledgment time minus detection time, among reviewed changes |
| Change review rate | Reviewed changes / detected changes; pending and overdue counts shown separately |
| Action completion | Required non-cancelled actions with explicit completion, actual time and evidence / all required non-cancelled actions |
| On-time completion | Completed actions at/before recorded due time / completed actions with known due times |
| Current report review | Acknowledged latest non-cancelled reports / latest non-cancelled reports |
| Culture decision closure | Latest cultures with clinician decisions / latest non-cancelled culture reports |

Undefined denominators display unavailable. Cancelled actions are reported separately; deferred actions remain incomplete. Corrected reports require new acknowledgment and a current-report decision; old decisions remain in the audit.

The deterministic 10-case validation currently produces 16 detected changes, a 7-minute median scripted review delay, 55/98 completed actions (56.1%), 43/55 on-time completions (78.2%), 4/4 current reports acknowledged and 3/3 current culture decisions. Some tasks are intentionally left open. These are computed invented training events, not a trial demonstrating improved patient outcomes. A zero receipt-to-detection value reflects the runner's timestamp resolution and must not be presented as a real-world performance claim.

## Validation and maintenance

`node --test tests/*.test.cjs` runs 28 test files. New tests cover stale/duplicate events, dose-history retention, current-plan gates, role permissions, test transitions, result amendments, protocol version governance, isolation, concurrency, metric denominators and independent scenario expectations. The worker build recomputes `dynamic-validation.json` and fails if expected pathways do not match.

Core: `dist/dynamic-core.js`. UI: `dist/dynamic-ui.js` / `.css`. Worked cases: `dist/dynamic-examples.json`. Deterministic runner: `dist/dynamic-validation.js`. Shared persistence: `worker/dynamic.mjs` with `worker/team.mjs` integration.

Clinical workflow references: ONC 2025 SAFER Test Results Reporting and Follow-Up; ASCO/IDSA FN outpatient guidance; dose-specific references in the existing assessment engine. Software checks are not clinical validation.
