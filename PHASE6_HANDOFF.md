# Smartlane Dashboard Phase 6 and final frontend traceability

## Scope

Phase 6 completes frontend prototype coverage for device-level GIS, a shared-inventory schematic, VMS/Mini VMS configuration and publish simulation, LCS/I/O monitoring, placement provenance, and Road Studio separation. It does not connect Laravel, field equipment, BVMS, Jetfile, AVDS, map infrastructure, or deployment services. The existing global UI and `ui-cleanup.css` were not redesigned.

Source of truth: `DRAFT - URS SMARTLANE - 20260822 - updated.docx`, especially URS_1.1.5–1.1.10, URS_1.1.18, URS_1.1.22, URS_2.1.1–2.1.7, and Appendix 8.1.

## Phase 6 implementation

- `src/phase6.js`: configured-coordinate partitioning, structured placement/provenance, stable route ordering, VMS validation/state/audit, per-device publish outcomes, LCS/I/O mismatch projection, and Road Studio runtime-field protection.
- `src/components/Phase6.jsx`: GIS map/fallback inventory, equipment schematic, LCS/I/O relationship panel, and VMS/Mini VMS workflow.
- `src/components/MapView.jsx`: reports basemap/style failures while the equipment fallback remains usable.
- `src/components/LocationScreen.jsx`: adds Equipment Schematic and connects GIS/VMS to the shared inventory and Phase 6 store.
- `src/App.jsx`: owns the Phase 6 reducer, authorization gate, and audit projection.
- `src/components/RoadLayoutDesigner.jsx`: no longer creates fixed AVDS observations on layout save.
- `src/phase6.css`: minimal local styles only.
- `tests/phase6.test.mjs`: ten focused Phase 6 and regression tests.

## Placement reconciliation

| Appendix location | URS direction/distance | Current prototype | Result |
|---|---|---|---|
| Putra Mahkota–Southville | Northbound, 3.2 km | Northbound; prototype absolute chainage labels and generic Road Studio geometry | Direction aligns; distance/layout is not declared approved. Southville VMS start/intermediate rule is represented by configurable placement roles but existing records remain illustrative. |
| Dato’ Onn–Pasir Gudang | Southbound, 2.5 km | Northbound | Unresolved direction discrepancy retained and documented. |
| Sungai Bakap–Jawi | Southbound, 3.4 km | Northbound | Unresolved direction discrepancy retained and documented. |
| Bertam–Sungai Dua | Southbound, 7.4 km | Northbound | Unresolved direction discrepancy retained and documented. |

Appendix placement drawings are not converted into invented coordinates or device counts. Existing stable device IDs and chainage strings are retained. Every schematic placement is labelled `Illustrative prototype placement` or `Missing placement information`. Geographic markers appear only after explicit Phase 4 latitude/longitude configuration.

## Final frontend URS traceability

“Covered” below means **Covered at frontend prototype level**, not system compliance.

| URS reference | Requirement | Screen/component and evidence | Status | Simulated? | Remaining dependency or decision |
|---|---|---|---|---|---|
| 1.1.1–1.1.2 | Login and dashboard access | `LoginScreen.jsx`, `App.jsx`, `OverviewScreen.jsx` | Partially covered | Yes | Laravel authentication/session policy and production identity provider. |
| 1.1.3 | Equipment settings, groups, roles/location access | `Administration.jsx`, `administration.js`, `access.js` | Covered at frontend prototype level | Yes | Server authorization, directory integration, persistence, protocol settings and secret handling. |
| 1.1.4 | Manual/scheduled/automated operation, acknowledgement, phases, intervention and timing | `OperationControls.jsx`, `operations.js`, `operationPolicy.js` | Covered at frontend prototype level | Yes | Approved timing/override policy, command transport and equipment responses. |
| 1.1.5 | Per-device connectivity, health, traffic status, tables and alarms | `EquipmentMonitoring.jsx`, `DeviceDetails.jsx`, `equipment.js` | Covered at frontend prototype level | Yes | Live telemetry, server paging, PDF/XLSX generation and alarm delivery. |
| 1.1.6 | VMS health/connectivity, phase editor, individual/group management, map marker, independent roles/messages | `Phase6.jsx` (`VmsWorkflow`, `EquipmentGIS`), `phase6.js` | Covered at frontend prototype level | Yes | Approved Shah Alam/location catalogue, panel capability data and Jetfile adapter. |
| 1.1.7 | Mini VMS monitoring, phase messages, individual/group management, placement roles and panel resolution | `Phase6.jsx`, `PANEL_CAPABILITIES` in `phase6.js` | Partially covered | Yes | 208×256/10 mm specification is labelled subject to final approval; pixel/colour/alignment tests require hardware. Exact start/end placement for three sites and Southville start/intermediate placement require approved site records. |
| 1.1.8 / 2.1.4 | LCS Red X/Green Arrow, monitoring, alarms, individual/group/location control | `EquipmentSchematic`, `lcsIoState`, `operations.js` | Partially covered | Yes | Monitoring and Match LCS simulation exist; a standalone individual command simulator was not added because required command/approval semantics remain unclear. Real indication and fault inputs required. |
| 1.1.9 / 2.1.1 | CCTV status, map/schematic presence and dashboard preview | `EquipmentGIS`, `EquipmentSchematic`, `DeviceDetails` | Covered at frontend prototype level | Yes | BVMS stream/PTZ/capability/licensing and 12-camera commissioning are not verifiable. |
| 1.1.10 / 2.1.3 | AVDS monitoring, traffic analytics, location display and retention | `EquipmentGIS`, `EquipmentSchematic`, `Phase5.jsx`, `phase5.js` | Partially covered | Yes | Lane mapping, configured thresholds, continuous exceedance, completed-operation comparison and two-year storage need backend/telemetry. |
| 1.1.11 | Health, activation and audit reports; required periods/fields; PDF/XLSX | `Phase5.jsx`, `phase5.js` | Partially covered | Yes | Report workflow/preview is present; native PDF/XLSX generator and durable jobs require Laravel. |
| 1.1.12–1.1.13 | Alarm/notification presentation and retention/storage | `OperationControls.jsx`, global decision inbox, `Housekeeping` | Partially covered | Yes | Audible/system notifications, database retention, CCTV storage and archive verification require integration/infrastructure. |
| 1.1.14 | Protected searchable/filterable audit with acknowledgement outcomes and exports | `AuditLogDisplay.jsx`, shared event adapters | Partially covered | Yes | UI cannot prove immutability/encryption; PDF/XLSX and server audit store are missing. |
| 1.1.15 | System integration | Cross-module shared state and stable IDs | Not verifiable without backend/equipment | Yes | Laravel APIs, vendor interfaces and end-to-end response correlation. |
| 1.1.16 | Server/system/equipment maintenance with remarks/actions/completion | `Phase5.jsx` Maintenance/System Health | Covered at frontend prototype level | Yes | Asset registry, live metrics, persistence and workflow approvals. |
| 1.1.17 | Configuration import and retention-aware archive/offload | `Phase5.jsx`, `administration.js`, `phase5.js` | Partially covered | Yes | Bounded JSON configuration import only; durable import, storage and archive execution require Laravel. |
| 1.1.18 | Four locations, independent selection/configuration and unified monitoring | `App.jsx`, `LocationScreen.jsx`, shared reducers | Covered at frontend prototype level | Yes | Location master data and appendix direction/distance discrepancies need stakeholder correction. |
| 1.1.19 | Consolidated location status, schedules, alarms and quick operation | `OverviewScreen.jsx` | Covered at frontend prototype level | Yes | Live backend feeds and production authorization. |
| 1.1.20–1.1.21 | Schedules and exceptions, recurrence, precedence, conflict/import workflows | `Schedule.jsx`, `scheduling.js` | Covered at frontend prototype level | Yes | Production scheduler, holiday source and binary Excel parsing. |
| 1.1.22 / 2.1.7 | Start/final VMS (Southville start/intermediate), per-phase independent messages, group, health, configurable remaining distance | `VmsWorkflow`, `validateVmsDraft`, placement roles | Covered at frontend prototype level | Yes | Approved placement, message text, distance values, hardware capabilities and Jetfile integration. |
| 7.1.13 / Appendix 8.1 | GIS and proposed ITS placement for four sites | `EquipmentGIS`, `EquipmentSchematic`, `placementForDevice` | Partially covered | Yes | Exact appendix coordinates/counts/roles and three direction discrepancies require approved structured site data. |
| 2.1.5 | LCS I/O identity, linked LCS, channels, connectivity and control/report state | `EquipmentSchematic`, `lcsIoState`, `equipment.js` stable associations | Covered at frontend prototype level | Yes | Approved wiring/channel catalogue, protocol and field feedback. |
| 2.1.6 | RAID 5 CCTV storage and 30-day retention | System Health/Housekeeping presentation | Outside frontend scope | Yes | Storage infrastructure, BVMS configuration and capacity evidence. |

## Remaining gaps by category

### Missing frontend design

- No approved site-placement import/reconciliation tool; the current model can represent resolved and unresolved placement but appendix diagrams require authoritative structured data.
- No standalone individual LCS command workflow. Add it only after command/acknowledgement and authorization semantics are approved.
- AVDS contextual navigation reaches analytics but does not preselect the originating device because Phase 5 analytics does not expose route/filter state.
- VMS group selection uses location/type scope. Named Phase 4 equipment groups are not yet offered as VMS publish targets.

### Backend/integration dependency

- Durable configuration/templates, report/export files, audit immutability, authentication/authorization, server paging, GIS data endpoints, notifications, archive execution, and operation/equipment response correlation.
- BVMS, Jetfile, AVDS and LCS I/O protocol adapters.

### Hardware/infrastructure requirement

- Actual panel character/line/color capabilities, Mini VMS approval, pixel tests, LCS channel wiring, device coordinates, CCTV licences/PTZ/streams, RAID 5 and retention evidence.

### Stakeholder clarification

- Approved location directions, distances, device counts/IDs, chainages, start/intermediate/final roles, Southville arrangement, remaining-distance values and message catalogue.
- VMS group semantics and publish retry/partial-success policy.
- Individual LCS command approval and failure/rollback behavior.

## Verification

- Full suite: `node --test tests\*.test.mjs` — **66/66 passed**.
- Production build passed. Existing MapLibre default-export and large-bundle warnings remain.
- Oxlint exited 0. Existing warnings remain; Phase 6 warnings were corrected.
- `git diff --check` passed with line-ending notices only.
- Browser tooling exposed no browser, so Phase 6 visual verification remains pending.

No dependencies were installed, no backend work began, and no global UI redesign was performed.
