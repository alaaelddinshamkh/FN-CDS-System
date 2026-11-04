# FN Clinical CDS — prototype 0.1
Installable browser-local educational prototype for Group 2. Synthetic data only.

## Run
Serve `dist/` over localhost, for example `python -m http.server 8000 --directory dist`. Open http://localhost:8000. For installation use HTTPS hosting. iPhone: Safari → Share → Add to Home Screen. Installation/offline behavior must be verified on the target device. No EXE or native mobile package is included.

## Test
`node tests/rules.test.cjs`
200 MASCC score and 200 final pathway comparisons match the workbook. Missing-assessment and BP boundary checks pass. Agreement with a supplied workbook does not establish clinical accuracy.

## Sources and rule mapping
- FN_MASCC_Simulated_Patients.xlsx, Patients and MASCC Index sheets: imported 200 synthetic records; seven MASCC components; score threshold 21; workbook SBP points awarded only when SBP >90. Final pathway also uses listed high-risk flags, CrCl <30 and inpatient status at fever onset. Source workbook remains unchanged.
- Febrile_Neutropenia_Adult_Clinical_Pathway(1).pdf, pages 1–4: recognition, assessment, follow-up and governance context. Recommendations need reconciliation with an approved institutional guideline. No dose engine implemented.
- Group2_FN_CDS_Capstone_Plan_v2(1).docx, sections 1, 2, 5, 7: pull-based CDS, first-hour metric, review/audit and synthetic-only scope.
- Poster: supplied project context; no additional executable rules extracted.

## Current capabilities
Search/filter patient registry, workbook-derived risk engine, explanation of flags, local checklist timestamps, contextual alerts, acknowledgment, local audit history, JSON export, browser print, qualitative FMEA, human factors, proposed stakeholder grid and alert registry.

## Limitations / next backlog
Read-only imported clinical inputs; no new-patient form or live Excel upload. No Arabic translation. No medication recommendations, signatures or transmission. No triage/administration dataset for KPI baseline. No shared backend, authenticated roles, hospital connection or background notifications. Local browser storage is editable and device-specific, not a clinical audit service. Acknowledging an alert does not resolve it. Browser cache may retain this synthetic cohort on shared devices. Do not enter real patient data.

## Proposed integration
FHIR Patient/Encounter, Observation, AllergyIntolerance, MedicationRequest/MedicationAdministration and AuditEvent; mapping only, no live endpoints.

## GitHub
Create an empty private repository and push these project files. For Pages, deploy dist via Actions subject to plan availability. The existing Sites remote is managed separately; do not overwrite it unintentionally. No secrets belong in a repository.

## v0.2 result workspace
Compact registry (8 per page); patient tabs separate baseline, lab results, cultures, vital trends and checklist. Explicitly synthetic scenario generator and validated JSON event import. See downloadable JSON template in Integration. Patient IDs must exist in cohort; unknown units, missing numeric values and duplicate event IDs are rejected. Latest report for an accession/code supersedes earlier reports; cancelled results do not trigger alerts. Numeric alerts use latest observation per code to reduce duplicates; cultures retain accession context. Baseline workbook classification is never silently presented as a refreshed clinical assessment. No automatic medication advice. Local result reviews are not clinical read-back or LIS acknowledgments.
Run `node tests/integration.test.cjs` for import, correction and alert tests.

## v0.3 actionable interface
Overview metrics are accessible action cards: all/high/low filter the registry; results opens all received events. Integration status opens a dialog with template download and inbox actions. Local allergy review supports unknown/none reported/known with required substance and reaction for a reported allergy; audit records the change without altering the original workbook. Result review is idempotent and assigned to its actual patient. Demo culture/vitals loading preserves the active tab. Decorative symbols are part of their parent controls, not independent actions. Live hospital features remain explicitly unavailable.

## v0.4 editable assessments
New synthetic case and edit-assessment forms cover presentation, MASCC and additional risk features. Unknown values remain null; an incomplete additional-risk screen cannot produce a low-risk pathway. Adult age and safe synthetic identifiers are validated. Source cohort stays read-only, and local overrides plus before/after snapshots persist separately. Patient detail exposes assessment history and original Excel record. FN criteria state distinguishes incomplete data from entered criteria not establishing FN; it is not diagnostic confirmation. New laboratory events remain separately reviewed; this release does not automatically overwrite the clinician-entered assessment from a feed.
Verification: `node tests/assessment.test.cjs` plus existing rule and integration suites. Browser QA could not complete in this environment for v0.4 because browser initialization timed out.

## v0.5 built-in walkthrough
Three fictional editable cases appear as quick-open buttons: WALK-LOW-01 (MASCC 26, low), WALK-HIGH-01 (MASCC 11, high), WALK-MISSING-01 (unknown/incomplete). Seven clearly labelled synthetic laboratory/culture/temperature events belong to the high-risk case. Seed once per browser, retain edits, never modify original workbook. Source-install audit and assessment history are recorded. `node tests/demo-cases.test.cjs` verifies expected scores, incomplete data, seeded event counts, idempotence and preservation of edits. Browser inspection confirmed dashboard shortcuts, high-risk assessment and three result-linked alerts.

## v0.6 reversible review workflow
Each result opens review options: mark reviewed, mark unreviewed/undo, leave unchanged, or defer with a reason. Status changes are logged and undo returns the event to the unreviewed queue. Review is distinct from clinical resolution. Finish case review is a demo workflow gate: source-critical pending results hard-block only completion; other pending contextual alerts allow documented deferral (soft stop). Patient navigation remains available. Reopening a result invalidates stored completion; completion is rechecked on access. No treatment/discharge approval is implied. Critical gating is a prototype policy for user testing, not an institutionally approved protocol. Test: `node tests/review.test.cjs`.

## v0.7 care episodes and fictional names
All 200 workbook patients have distinct deterministic fictional display names, with source IDs retained. Name search is supported. Care checklist no longer extracts markup recursively: it renders nine explicit steps with pending/done/deferred/not-applicable status, event time, role and note; edits/undo append to care history and audit. Original Excel patients start with no care actions documented. Three walkthroughs seed fictional care histories once without replacing user edits. Low-risk walkthrough includes a recorded oral regimen, observation, discharge context and scheduled follow-up; high-risk walkthrough includes a recorded IV regimen, admission and inpatient review. Medication examples are historical synthetic documentation, not recommendations, and contain no doses. Sources linked in the UI: IDSA 2010 and ASCO/IDSA 2018; supplied pathway requires local reconciliation/approval. Names/episodes are fictional. Treatment record, actual administration, disposition and follow-up are editable separately from checklist completion. High/unknown risk discharge documentation is blocked in this demo form; this is a prototype guard, not a clinical disposition engine. New assessment input does not rewrite old care history.
Checks: tests/care.test.cjs plus all existing suites passed. Browser inspection confirmed populated checklist, names, recorded treatment, discharge and follow-up.

## v0.8 proactive safety, escalation simulation and audit reflection
Safety checks derive current gaps from recorded hypotension (historical baseline explicitly labelled), unknown assessments/allergies, unreviewed results, missing administration documentation, discharge/follow-up gaps and risk/disposition conflicts. Foreground in-app monitoring can be enabled to show only newly introduced urgent flags; no background execution or remote sending is claimed.
Escalation center records one open local incident per patient, reason/route, configurable demo acknowledgment window, simulated physician acknowledgment/ICU escalation, outcome and event history. Timeout is derived from wall time while inspecting the app; it is not a server escalation service. Severity alone never dispatches Code Blue. Prototype checks and time windows require institutional governance.
Local OS notification is a user-initiated, permission-based test with minimal message content, via service-worker notification where supported. Phone action opens the dialer for a locally configured authorized test number; no call completion is claimed. Watch, remote push, voice provider, corridor beacon and nurse-call hardware are NOT CONNECTED. A visual red beacon preview and downloadable proposed integration contract are provided. No external dispatch, recipient message or hardware action was performed.
Real integration requires authenticated backend/queue, verified on-call roster, provider credentials held server-side, delivery receipts distinct from clinician acknowledgment, backup routing, monitored timers, hospital authorization and hardware validation. Native watch support/forwarding must be tested on target devices.
Audit feedback counts local events/reversals/deferrals/escalations and current gaps with suggested process reviews; it is not causal performance evidence. Browser logs are editable, device-local and not authenticated or immutable.
Verification: tests/safety.test.cjs plus all existing suites passed. Browser QA confirmed escalation creation and queue display. OS notification permission in the test browser is denied; external notification delivery was not tested.

## v0.9 capstone scope reconciliation
Reviewed user-supplied Pasted markdown(1).md as a project specification, not a clinical guideline. Scope & evidence exposes the actual coverage and remaining gaps: no live Drive database, no executable/signable order sets, no validated dose/renal engine, no formal primary/secondary quality metrics, no approved per-rule releases and no real hospital integration. Existing safety/escalation extensions are explicitly different from the original pull-only brief.
Extended assessment collects respiratory rate, SpO2, lactate, catheter presence, MRSA/ESBL/CRE history, prophylaxis, persistent fever/antibacterial days, oral tolerance/follow-up and metric exclusion indicators. Protocol review displays draft candidate modules and overlapping features without a clinically approved primary-subtype precedence or treatment selection. Lactate alone does not map to shock/instability; persistent-fever review requires context; low-risk outpatient eligibility remains conditional. Isolated ANC <0.1 capstone trigger is surfaced separately where it conflicts with preserved workbook risk. Source versions remain historical and pending current/local reconciliation. No NCCN full text was reviewed or encoded.
Test: tests/scope.test.cjs plus all previous suites. Browser QA confirmed requirements-coverage page and source register.

## v0.10 reviewable order sets, quality metrics and financial comparison
Six source-linked draft order templates support deliberate subtype selection (no low-risk default), inclusion/edit/add, version history, context-change review invalidation, labelled demo review, export and print. They are not executable, signed or transmitted prescriptions. Medication guidance is source-documented, not locally approved. Limited cefepime FDA 07/2025 FN initial/maintenance reference implements CrCl boundaries >60, 30–60, 11–29 and <11, gated by verified no-allergy, stable renal function and no dialysis. It is not an indication/selection engine; other drug doses and specialist pathways still require independent verification. Source: https://www.accessdata.fda.gov/drugsatfda_docs/label/2025/050817s012lbl.pdf sections 2.1, 2.3; IDSA 2010; ASCO/IDSA 2018.
Timing & quality captures history/exclusion review, triage, actual first appropriate antipseudomonal dose, regimen, reviewer/rationale and separate clinical response/readmission observations. Primary process metric credits <=60 minutes only with documented appropriateness; missing information in established eligible cases stays in denominator. Unknown eligibility/exclusion review is separately counted; this is the reviewed-cohort rate, not a hospital estimate. One current episode per patient is supported; multi-encounter longitudinal metrics are not yet implemented. Two walkthrough episodes seed explicitly fictional reviewer assumptions and 30-minute intervals, yielding 2/2 in that demo reviewed cohort with 201 eligibility-unknown cases. No observed improvement or clinical efficacy is claimed.
Secondary process indicators: MASCC documentation, generated-draft utilization, manual appropriateness and saved-form wall-clock duration (includes pauses). No automated validated concordance score or fixed-window clinical outcome rate.
Financial impact has independent user-entered periods, origin, currency, claims submitted/rejected, rejected values and consistently defined revenue. An opt-in invented example gives 15%->9% rejection (6 pp, 40% relative reduction), +80,000 EGP revenue (+8%) and 60,000 EGP lower rejected value. These quantities are not added together and causal CDS attribution is not established. No actual financial values were supplied in the clinical files.
Verification: tests/orders-metrics.test.cjs tests renal boundaries, missing/allergy/AKI/dialysis guards, 60-minute boundaries, exclusions/unknown populations, incomplete denominators and finance arithmetic; all previous suites pass. Browser QA confirmed metric denominators and financial example; order template view verified.

## v0.11 CEO hypothetical quarterly business case
Financial impact and Clinical quality default to a clearly labelled independent Q2/Q3 2026 scenario (latest two fully completed quarters at Nov 2026). It assumes a fictional July rollout, not the real app timeline. Existing manual finance inputs and current-patient episode audit remain accessible. All counts/outcomes/amounts are invented; no causal or statistical claim is made.
Fixed scenario: 200 eligible FN episodes per quarter; 120 high/80 low; 140 admitted/60 discharged. 1000 unique claim submissions per quarter, 5000 EGP each. Six mutually exclusive primary non-acceptance reasons sum to 150 before/70 after. Technical returns: 50/20; adjudicated denials: 100/50. Headlines combine both and distinguish stages. An RCM+CDS workflow bundle is assumed, not a claim that this CDS implements payer/coding/authorization services.
Revenue bridge: 5m billed each quarter, 750k/350k initially non-accepted value; 40% modeled recovery (300k/140k); modeled eventual collectible 4.55m/4.79m; uplift 240k (+5.2747%). Not actual period cash. Accepted claims assumed fully collectible; discounts/tax/financing/disruption not modeled. First post-quarter upfront 120k + operating45k =165k; net75k, ROI45.4545%; recurring net195k; simple even-month payback1.84615 months; break-even realization68.75%. Realization sensitivity 25%/50%/100% includes negative cases and is editable.
Capacity only: LOS6.5/5.5 days among140 admissions, beddays910/770; 140 released days*800=112k resource value; 80 fewer nonaccepted claims*250=20k effort capacity; combined132k excluded from cash ROI. No additional sepsis/ICU savings are added, avoiding overlapping outcomes.
Clinical hypothetical counts include timely antibiotic120/200->176/200, sepsis40/200->24/200, shock12->8, ICU20->12, mortality8->6, follow-up42/60->57/60 and 30-day readmission12/60->6/60. Standardized definitions and complete fictional follow-up are described; no clinical prediction, measured improvement or causality is implied. Enhanced detection may increase recorded sepsis.
Export: model JSON and 2000 explicitly synthetic claim CSV rows reconcile exactly to the two revenue bridges. Model assumptions (cost, recovery, realization, resource values) are adjustable. Print CEO view available. Tests/quarter.test.cjs verifies reconciliations, stages, rates, LOS, ROI, payback and sensitivity; all previous tests pass. Browser QA verified both dashboards.

## CEO print-layout repair
Print CEO view opens a dedicated report tab from a snapshot of current scenario assumptions, rather than printing the responsive app shell. A4 landscape with fixed column widths, repeated table headings, non-splitting rows, explicit page divisions and synthetic-scenario labels on every page. Financial report: 3 designed pages; clinical report: 2. No navigation, controls, sidebar or mobile grid is printed. Print-ready preview offers Print / Save as PDF. Tests/print.test.cjs checks report sections/totals. Independent WeasyPrint PDF rendering verified actual 3/2 A4 landscape pages, and rendered pages were visually inspected for clipping/overflow. Browser print dialog itself is unavailable in the cloud test browser. Paper/device preferences can override browser CSS; use A4 landscape and default/100% scale if needed.

## Hospital escalation backend 0.13

The Site now packages a Worker with the existing frontend assets and a D1 database. Server API routes under `/api/escalation/` require Sites authenticated identity and enforce per-account ownership. Mutations require a same-origin Origin header. Roster and server alert records are separate from the browser-only simulation.

- `GET status`: readiness without secret values.
- `GET/POST/DELETE roster`: account-scoped on-call shift records. Active overlaps block dispatch.
- `GET/POST alerts`: server alerts; POST requires a stable requestKey. Only TEST-, SIM- and WALK- opaque references are accepted.
- `POST action`: operator acknowledgement or record closure. Neither proves care delivery.

### Hospital adapter contract requiring IT agreement

Set `HOSPITAL_GATEWAY_URL` to the approved HTTPS base and `HOSPITAL_GATEWAY_TOKEN` as a server secret. Enable `HOSPITAL_DISPATCH_ENABLED=true` only after an authorized end-to-end test is arranged. No credentials or destination are preconfigured. Dispatch remains blocked otherwise.

The adapter sends `POST <base>/messages` with bearer authentication, JSON, and `Idempotency-Key` equal to the persisted escalation UUID. Fields: contract `fn-escalation-v1`, eventId, opaque caseRef, channel (`push`, `phone`, `corridor`), destination from the active roster, priority `urgent`, acknowledgeBy ISO time and a fixed generic message. No names, laboratory values or diagnoses are transmitted. The response must contain `accepted:true` and a string `messageId`. This is a proposed contract, not a claim of compatibility with an unseen hospital API. IT must map it to the actual service.

Requests are persisted before sending. Network timeouts or ambiguous gateway failures become `delivery_unknown`; retrying the same key does not resend. An accepted request remains `accepted`, never `delivered`, because authenticated delivery callbacks are not implemented. No external message has been sent during implementation. Unknown delivery requires the approved manual fallback and reconciliation, not blind retry.

### Remaining release gates

The backend is a synthetic test harness, not an approved clinical emergency service. Current roster/audit ownership is per signed-in account, not a shared institutional staffing directory. Missing: organization roles and clinician recipient authentication, shared shift authority, signed delivery callbacks, background scheduler/queue, automatic escalation to a backup recipient, channel-specific retry and cancellation policy, device reset/fail-safe, hospital network gateway, operating procedures and clinical/security approval. Deadlines are calculated on refresh only. Do not rely on open-browser timers for unattended paging. No web-push subscription/VAPID service, iPhone/watch end-to-end delivery or physical corridor light connection is implemented.

Build with `npm run db:generate` only for schema changes, then `npm run build`. Existing applied migrations must remain immutable. Hosting declares D1 `DB`. The Worker embeds existing files from dist and serves API routes with `Cache-Control: no-store`. Never cache API responses in the service worker. Tests use an in-memory SQLite database and a mocked gateway, not real recipients.

## Validation and knowledge workbench 0.14

Scope & evidence now contains four focused tabs: 15 synthetic fixtures, assessment data dictionary, rule/source register, and a structured medication review register. The package and test reports export JSON. Expected MASCC, FN state, modules, medication gate behavior and included review-item codes are stored independently of production calculation functions. Fixtures run through production FN/MASCC/pathway/renal functions and the same order metadata conditions used to generate drafts. A changed expected score is tested to produce a failure. These are author-defined software expectations, not a clinician-adjudicated gold standard. Immediate and severe delayed allergy scenarios currently share the conservative known-allergy gate; the system does not infer an allergy alternative.

FN treatment candidate modules are withheld unless numeric FN criteria are established; current instability may still surface urgent review independent of FN. This does not rule out infection or replace clinical judgement. Candidate modules remain overlapping and no clinically approved primary treatment precedence is claimed.

Each generated order item now has a stable code, type, reason, draft timing, source, location, condition status and knowledge version. Unmet conditions are shown unchecked, never silently treated as established. User inclusion, exclusion, text editing and additions require a reason; text changes/additions also require source or source-gap context. Changes preserve previous versions and invalidate review. Older drafts remain explicitly marked as legacy when metadata is missing. This remains a review-prompt system, not executable laboratory or medication orders.

Patient Data provenance records optional per-field observation times separately from save time, a required source and evidence, with retained prior values. Original workbook measurement times are not fabricated. The generated dictionary states missing-data behavior and source/time policy for all assessment fields.

Medication review rows include source, route, dose coverage/gap, interval, reassessment, renal/allergy constraints and alternative-review status. The existing gated cefepime label reference is the only encoded dose calculator. Other rows deliberately do not invent doses. Pharmacy and oncology/ID can record structured draft findings and source locations; these notes are not executed as rules or clinical signatures. Knowledge records remain browser-local; server persistence still covers escalation only.

Validation: all 14 test suites pass, including 15 fixtures and rationale/version-history checks. UI preview verified the 15-case runner and an inclusion change producing a new version with a stored reason. Real clinician adjudication, institutional protocol/formulary approval, representative usability study and live external integration testing remain release gates. No hospital messages were sent by this work.

## Connected synthetic hospital 0.15

`Connected demo` is the first central team workflow, separate from the original device-local registry. Users sign in through Sites, create a fictional workspace, and receive the server-side administrator membership. Admins generate role-specific, single-use invitation codes for nurse, physician or pharmacist accounts. Codes expire after 24 hours and only their SHA-256 hashes are stored. The recipient signs in independently and joins using the code; client-supplied roles cannot elevate membership. No invitations are emailed or messaged automatically.

Central tables: demo_teams, team_members, team_invites, team_visits and team_events. All `/api/team/` routes require platform identity. Workspace routes require membership, mutations require same-origin requests and every stage transition checks the server-side role and current visit revision. Clinical records remain synthetic-only in this milestone.

Workflow: nurse creates a visit from a fictional case and triage time; physician submits a reviewable draft plan; pharmacist records demo review or requests changes; nurse documents a synthetic regimen and actual administration time. Completion denotes the first-dose handoff demonstration, not clinical resolution or discharge. The queue assigns responsibility to a role rather than a particular on-call person. Admin rehearsal can perform each action under one account, but audit records retain the actual admin identity and the performed workflow role. Separate staff-account authorization is independently tested.

Only source case code, five measurements, triage and handoff documentation persist centrally in this milestone. The old assessment, checklist, order-draft and governance modules remain device-local. A physician may explicitly copy a local draft into the central plan; this is not automatic clinical synchronization. External lab feeds, external messages, unattended escalation, real prescribing and discharge/follow-up integration remain future work.

Updates use optimistic revisions and idempotent operation keys. Server transitions and audit events commit in one D1 batch. Old revisions cannot overwrite concurrent updates. In-app refresh runs approximately every 10 seconds while the screen is visible, pauses for unsaved handoff edits and only redraws changed data. No background notification guarantee is made. Shared server events are append-only through the API, not a certified immutable institutional audit.

QA: `tests/team.test.cjs` runs real SQLite schema migrations and exercises workspace isolation, role-specific invitation/join, single-use codes, privilege rejection, the complete multi-role workflow, pharmacist change requests, invalid timestamps, revision conflicts, duplicate retries and audit consistency. The UI preview uses an explicit local-only test identity and an in-memory SQLite database. It is never used as production authentication. Browser QA completed create workspace, new visit, physician handoff, pharmacy handoff and nursing dose documentation. No external recipient was contacted.

To use the published app: open Connected demo, sign in, create a fictional hospital, then create a synthetic visit. Use the same signed-in account on another device to see that workspace, or issue a role-specific invitation for a separate test participant. Production cross-account/device QA still requires those participants to sign in. Do not publish invitation codes or use real patient data.

## Independent accounts (0.16)

Production API routes now ignore platform identity and require a Supabase-verified
session in a Secure, HttpOnly, SameSite=Lax host cookie. Passwords go only through
the same-origin authentication proxy to Supabase Auth; no password or token is
stored in browser storage or in D1. The session expires after at most one hour;
this release requires sign-in again rather than using refresh tokens.

Runtime variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY (public client key),
FN_SUPERADMIN_UID (server-owned exact provider UID). No service-role key needed.
Never grant owner privileges from user metadata or first-signup order.

New users verify their email if required, sign in using email, then submit a
profile (name/alias, requested role and fictional staff/patient ID). They are
pending until the owner approves. Username login is available after enrollment.
The Super Admin assigns a workspace, role and optional synthetic patient visit.
Staff cannot create workspaces or use invitations to bypass approval. Approval,
rejection, suspension and reasons are recorded atomically with revision checks.
Patient accounts have a separate minimal endpoint and cannot access staff APIs.
Existing platform-identity records remain stored; approved Supabase identities
use an sb: namespace. The owner receives admin membership on existing demo teams.

The public static assets and fictional registry remain educational demo material,
not a secure store for real patient data. Device-local drafts/checklists are still
local simulation; server handoffs enforce actual roles. In-app approval inbox is
implemented; administrator email notifications are not wired. Outbound clinical
alerts are not activated by this authentication change.

Supabase project setup still needs: Email provider enabled, Site URL set to the
published app origin, appropriate confirmation redirect URLs, and SMTP configured
before general public signup (the default provider email restrictions apply).
Do not disable email verification to bypass email delivery problems. Password
recovery, refresh-token rotation and MFA enrollment UI are not implemented in
this iteration. Use provider administration for recovery until those flows exist.

## Messages, Web Push and phone handoff (0.17)

Approved users have personal direct-message inboxes and sent/read receipts. Owner
can contact all approved accounts; others are limited to the owner, themselves
and approved contacts in their assigned workspace (patients cannot see other
patients). D1 stores message content, immutable sender/recipient and an idempotency
key; message bodies must contain synthetic coordination data only. In-app badges
poll every 20 seconds; open inboxes use manual refresh to avoid losing drafts.

Users can save an E.164 phone number and explicitly share it with permitted
contacts. Numbers are self-reported, not SMS verified. Call opens a tel: URI in
the system dialer; audit records DIALER_REQUESTED, never a completed call. There
is no VoIP, PSTN gateway, automatic calling, SMS or WhatsApp integration.

Web Push uses @block65/webcrypto-web-push (AES128GCM + VAPID). Runtime variables:
VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (secret), VAPID_SUBJECT. Subscribe from a user
click on each device. The push endpoint allowlist prevents SSRF and redirects are
rejected. Maximum five devices per account. Signing out removes that account's
server subscriptions on all devices; enable again on desired devices after login.
Only generic lock-screen text is sent, never the message body, patient details or
sender name. The service worker opens /#messages, which still requires sign-in.
PUSH_ACCEPTED means provider acceptance, not device receipt or clinical response.
There is no unattended queue/retry worker: messages remain in the inbox even if
push fails. This is not a safety-critical emergency channel.

QA: test suite uses a real SQLite schema, real WebCrypto encryption and a mocked
push transport. Physical iPhone/laptop push receipt and carrier calls require
user device testing; no recipient was contacted by the implementation tests.

## Foreground internet audio calls
`Voice calls` opens approved contacts using the existing messaging visibility rules. Caller and recipient keep the app open. Audio-only WebRTC uses public STUN, no TURN subscription, no telephone dialing and no audio recording. It may fail on restrictive networks. Each participant grants microphone access; Accept is required before the recipient microphone opens. Audio playback can require the Play audio button on mobile.

D1 migration 0005 adds call metadata, ephemeral offer/answer signaling and unique per-user busy locks. Calls expire after 60 seconds ringing or 45 seconds without heartbeat; terminal/expired signaling is erased. Only participants can poll or mutate a call, only the recipient can answer, and approval/origin checks apply to every request. An accepted signaling state is not proof of connected audio. Browser connection state drives the connected indicator. Background ringing/push invitations and TURN are not implemented. Tests in calls.test.cjs use SQLite and mock identity, not microphone/media transport. Actual iPhone/laptop audio remains a device acceptance test.

## Single-form registration and owner approval (v25)
New Sign up submissions now create an immediate `pending` approval request using the real email identity returned by Supabase. No second sign-in/enrollment form is needed. Confirmation of the email is still required before sign-in when enabled in Supabase; queuing a request grants no session, clinical access, or owner role. Obfuscated duplicate identities are not enqueued; existing requests cannot be overwritten by another signup. Legacy Auth accounts recover saved signup metadata on authenticated sign-in, with the enrollment screen retained only when metadata is missing or conflicts.

The owner sees a request counter and pending-first list, refreshed in the foreground every 15 seconds. Approve assigns the requested role and selected workspace, records the decision with revision protection, and preserves Review account for role changes, rejections, suspensions and patient linking. Only the owner can see counts or approve. A newly stored request attempts a generic owner-only Web Push alert; it contains no applicant details, uses the existing subscription/VAPID setup, and opens `/#requests` after authentication. Push permission/device delivery is not guaranteed. Email alerts remain unconfigured. Test signup-approval.test.cjs covers immediate pending records, no privilege/session grant, identity concealment, legacy metadata recovery, storage failure, owner counter/push and approval count changes. Browser QA uses a temporary mock fixture that is excluded from source and deployment; real Auth delivery and device Push still need user-device testing.

## Mobile dashboard (v26)
At widths up to 700px, including installed standalone PWAs, the workspace opens to a two-column launchpad of the existing sidebar routes, grouped into clinical, quality and governance sections. Account, messaging, voice and owner-only approval shortcuts appear above the tiles. A Dashboard button and the brand return to the launchpad. Existing route handlers and account guards remain in force; desktop navigation is unchanged. Safe-area padding supports notched phones. Browser QA at a 390px viewport verified tiles, navigation to Overview and return; actual iPhone standalone launch remains a device verification step.

## Supabase PostgreSQL data backend (v27)
The server supports `FN_DATABASE_MODE=supabase` with a server-only `FN_DATABASE_KEY`. The Worker sends fixed query IDs and bound parameters to the `fn-database` Edge Function; the function checks the credential hash, accepts only the compiled application query catalog, runs transactional batches under the restricted `fn_cds_backend` role, and stores records in the unexposed `fn_app` schema with RLS. Signup/session verification, account approval, workspace authorization and patient isolation remain in the application server. End users cannot use the database gateway with their publishable key or Auth token. No service-role key is shipped to the browser. Failure is closed; there is no automatic fallback to the old D1 copy.

`supabase/migrations/20261103195416_fn_application_postgres.sql` matches the cloud-applied migration version. It creates the private application schema, restricted backend role and separate `fn_app_test` schema; no production records or credentials are in Git. The migration filename uses the server-assigned version because CLI installation was unavailable in this environment. Never rerun it manually on the existing database. `scripts/generate-query-catalog.mjs` must run when backend SQL changes. Deploy the matching catalog and Edge Function BEFORE updating the Worker; query IDs must match on both sides. Supabase GitHub integration uses config.toml to deploy the Edge Function. Review migrations before merging to main.

Live PostgreSQL integration checks use mocked identity/email/push transport and an isolated test schema; they never send real signup email or call a real person. `scripts/run-postgres-check.mjs` takes test credentials over stdin and passes them only in process environment. Test-only query IDs are rejected in live mode. D1 is retained as the pre-migration checkpoint; after new writes in Supabase, simply switching back to D1 would lose those writes and is not a valid rollback. Restore/replay requires reconciliation. The migration pause blocks `/api/` while final source rows are copied and compared. The frontend and PWA remain hosted on Sites.

## Patient assessment to action

20 fictional adult FN scenarios, structured risk explanation, draft initial/renal dosing references, timed cultures and shared role handoff are documented in [ASSESSMENT_TO_ACTION.md](ASSESSMENT_TO_ACTION.md). Clinical validation remains pending.
