# Smartlane Dashboard Phase 5 handoff

## Scope and source requirements

This phase implements frontend prototypes for Reports, Audit browsing, AVDS Analytics, Maintenance/System Health, and Housekeeping. The source of truth was `DRAFT - URS SMARTLANE - 20260822 - updated.docx`:

- **URS_1.1.10 AVDS:** connectivity, speed, traffic volume, lane occupancy, configured intervals, profiling, per-location congestion thresholds, continuous-exceedance prompts, two-year data retention, before/during/after comparison, lane coverage, location display, and fault/communications events.
- **URS_1.1.11 Reports:** Equipment Health, Activation, and Audit Trail reports with the listed periods and minimum fields, in PDF and Excel.
- **URS_1.1.13 Storage:** permanent configuration unless authorized change/removal; at least two years for operational, AVDS, equipment, alarm, and audit data; at least 30 days for CCTV; location categorization.
- **URS_1.1.14 Audit:** system/user and monitoring events; required identifying fields; acknowledgement outcomes; date/user/module/activity/location/equipment filtering; paging/search/sort; PDF/Excel.
- **URS_1.1.16 Maintenance:** server/system/equipment work, capacity/performance/storage issues, remarks, actions, completion, location, and equipment.
- **URS_1.1.17 Housekeeping:** configuration import/management and retention-aware archive/offload categorized by location and type.

## Implemented frontend behavior

- Reports use the three URS templates. Requests retain immutable criteria/data snapshots and demonstrate Queued, Generating, Ready, Failed, Retry, and No data states. Preview fields follow the URS minimums. Browser print is honestly labelled as print/save-to-PDF; native PDF and Excel generation remains unavailable.
- Audit browsing supports inclusive date/time boundaries, actor, module, activity, authorized location, equipment ID, result, text search, timestamp sort, pagination, details, reset, filtered CSV, and browser print. The UI explicitly avoids claiming server-side immutability or encryption.
- AVDS analytics offers location/device/metric/interval filters, missing-data preservation, aggregation semantics (mean speed/occupancy and summed interval volume), an accessible table and SVG trend, sample provenance, and a clear blocked state for before/during/after analysis. Lane assignment and configured congestion thresholds are explicitly unavailable rather than invented.
- Maintenance records capture location, asset, remarks, actions, status, actor, and timestamps. System Health presents separate sample observations, including warning and unknown states; maintenance completion does not mutate health.
- Housekeeping supports a bounded equipment-configuration JSON schema, preview, field rejection, location/device validation, and atomic application through the Phase 4 administration reducer. Credentials and telemetry are excluded. Archive/offload uses two-year operational and 30-day CCTV rules, never makes configuration automatically eligible, snapshots counts/cutoffs, prevents duplicate jobs, and never deletes or moves data.
- Phase 5 mutations enter the shared audit stream. Administration imports create a redacted administration audit event.

## Proposed role mapping

The URS names roles but does not define every Phase 5 permission. This prototype therefore treats the mapping below as a proposal for backend authorization review:

| Capability | Overview | Operation | Management | System Administrator |
|---|---:|---:|---:|---:|
| AVDS analytics | No | Read | Read | Read |
| Reports / audit | No | No | Read/request | Read/request |
| Maintenance / system health | No | No | Read | Read/write |
| Housekeeping / configuration import | No | No | No | Read/write |

Every view remains limited to the selected persona's assigned locations. Laravel must enforce permissions independently; the React capability map is presentation behavior only.

## Recommended Laravel contracts

These are recommendations because the URS does not prescribe endpoint shapes.

- `GET /locations/{id}/avds/series?device_id&lane_id&from&to&interval`: timestamped speed, volume, occupancy, lane metadata, configured sampling interval, gaps, timezone, and provenance.
- `GET/PUT /locations/{id}/congestion-thresholds` and an alarm/event stream: versioned thresholds, duration rule, active exceedance, acknowledgement state, and optimistic-concurrency response.
- `POST /reports`, `GET /reports`, `GET /reports/{id}`, `POST /reports/{id}/retry`, and authorized download URLs: accepted criteria snapshot, status, row count, failure code, expiry, and PDF/XLSX content metadata.
- `GET /audit`: server-side scope, inclusive timestamp filters, actor/module/activity/location/equipment/result filters, stable sort, cursor/page metadata. `POST /audit-exports` should create PDF/XLSX jobs. Audit records need immutable IDs and acknowledgement/selected-VMS/result fields where applicable.
- Maintenance CRUD/status endpoints with asset references, capacity/performance/storage issue type, remarks, action, assignee, completion timestamps, actor, version, and validation/conflict responses.
- `GET /system-health`: observation timestamp, freshness, source, metric, unit, threshold, status, explanation, and explicit unavailable state.
- Configuration import validate/commit endpoints using an upload token or content hash. Commit must be atomic, version checked, idempotent, location-authorized, and audited without credentials.
- Archive plan/execute/status endpoints returning retention policy version, cutoff, eligible/ineligible counts, destination, idempotency key, progress, partial/failure details, verification result, and whether source deletion is separately authorized.

All operations need `401`, `403`, `404`, `409`, `422`, `429`, and `5xx` handling where applicable, plus stable error codes, correlation IDs, and server timestamps. Laravel should return only authorized locations and should re-check authorization on every mutation and download.

## Known limitations and next work

- All historical AVDS, health, retention counts, and job transitions are labelled sample/simulated. No telemetry, report generator, file store, archive destination, or notification channel is connected.
- The current inventory does not provide lane topology, emergency-lane mapping, configured AVDS sampling intervals, threshold configuration, or complete operation boundary events. Valid lane analytics and before/during/after comparisons must wait for those contracts.
- Annual/monthly/weekly date windows need a backend-owned timezone/calendar definition. The current report prototype snapshots rows visible to the client; production reports must be generated from server data at a consistent cutoff.
- CSV is offered as a truthful convenience export and is not presented as the required Excel workbook.
- Browser runtime interaction was unavailable in the automated environment; source, reducer, build, lint, and unit behavior were verified.

## Verification

- `npm run build`: passed. Existing MapLibre default-export and large-chunk warnings remain.
- `node --test tests\*.test.mjs`: 56/56 passed, including ten Phase 5 tests and atomic-import coverage.
- `npm run lint`: exited 0. Existing warnings in RoadSchematicView, MapView, VmsEditor, App, and RoadLayoutDesigner remain; Phase 5 added no lint warnings.
- No dependencies were installed and `package.json` / `package-lock.json` were not intentionally changed.
