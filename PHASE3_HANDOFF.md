# Phase 3 — schedules, exceptions and All Locations

This is frontend prototype coverage only. No backend, production scheduler,
equipment commands, dependency installation or Phase 4 work was introduced.
Phase 2 timing constants in `src/operationPolicy.js` are unchanged.

## Requirements checked

Source: `DRAFT - URS SMARTLANE - 20260822 - updated.docx`.

| URS | Exact obligation relevant to this phase | Frontend result |
| --- | --- | --- |
| 1.1.18 | Unified management of four locations, location selection, independent configuration | Stable location IDs; shared schedules/exceptions survive tab navigation; selectors on overview and location pages. |
| 1.1.19 | Per-location mode, phase, faults, pending schedules; consolidated alarms; quick activation/deactivation | Existing equipment/operation sources retained; computed next schedule and suppressed/conflicting context; quick actions enter Phase 2 acknowledgement. |
| 1.1.20 | Separate scheduling page; one-time/weekly rules; calendar/list; conflict detection; activation log; state/location independence | Schedule CRUD, enabled state, validation, effective calendar and occurrence history; explicit simulation request with operation/audit references. |
| 1.1.21 | Separate exception module; Public Holiday, Special Exception Day, Recurring Exception; CSV/Excel import; per-location calendar; state-specific applicability | All three categories, location/state scope, CRUD, recurrence, suppress/override, CSV preview/errors/duplicate detection/confirmed import. Excel binary parsing is unavailable and explicitly labelled; CSV conversion is the working fallback. |
| 1.1.4 — Scheduled Operation / acknowledgement | Scheduled activation/deactivation cycle and mandatory acknowledgement | Explicit demo request only, through the existing shared Phase 2 reducer. No activation from calendar ticks; warnings/acknowledgement remain mandatory. |

Authorization is not implemented: these are demo editing capabilities, not security
enforcement. A standalone audit report was not found in the repository; the defects
and acceptance criteria supplied in the phase requests were used alongside source inspection.

## Implementation and files

- `src/scheduling.js`: timezone/date arithmetic, recurrence expansion, overlap validation,
  exception scope/precedence, effective occurrences, next occurrence, shared-record CRUD,
  CSV parsing/preview and simulation eligibility.
- `src/components/Schedule.jsx`: rewritten to consume shared records; used by separate
  Scheduling and Holidays & Exceptions navigation views. Includes editors, review/discard
  decisions, import preview, calendar, details and history.
- `src/scheduling.css`: responsive forms, calendar and table containers.
- `src/operations.js`: shared schedule store and atomic simulation request reservation;
  Phase 2 mode/request transitions reused; occurrence IDs attached to operation events.
- `src/App.jsx`: supplies shared state and calculated summaries; overview quick actions.
- `src/components/LocationScreen.jsx`: dedicated exception navigation, shared scheduling
  props and dynamic next-run text. Scheduling views are separate from the operation panel;
  pending operation decisions remain available through the global inbox.
- `src/components/OverviewScreen.jsx`: next effective schedules, affected context,
  location selector and location-specific quick activation/deactivation requests.
- `src/components/MonitoringDialog.jsx`: focusable textarea support and exclusion of
  disabled controls, retaining the accessible modal used in Phases 1/2.
- `tests/scheduling.test.mjs`: focused scheduling/regression tests.

No equipment IDs, health mapping, operation policy constants or unrelated package-lock
changes were modified in this phase. Historical Phase 2 handoff remains unchanged;
its statement that Schedule is not connected is superseded only by the explicit
simulation request described here.

## Demo assumptions and open questions

1. **Timezone:** all schedule dates/times use Asia/Kuala_Lumpur (UTC+08:00), driven by
   the same epoch time as the Phase 2 demo clock. No browser-local timezone is used
   to decide schedule days. The operating clock can still be advanced from the
   operation panel; moving calendar months does not move the clock.
2. **State assignment:** no site boundary is guessed. Each location initially has an
   unassigned state. Select a demo state in Scheduling or Exceptions before using
   state-scoped exceptions. Assignments apply shared state rules only to assigned
   locations. Confirm actual site/state boundaries and required state catalogue.
3. **Schedule scope:** each schedule belongs to one explicit location. State applicability
   is represented by that location's independent state assignment and state exceptions;
   there is no implicit nationwide schedule or holiday scope.
4. **Recurrence:** schedule rules are one-time or weekly. Exception recurrence supports
   one-time, weekly and annual Gregorian month/day, since the URS names recurring
   exceptions without defining recurrence syntax. Feb 29 runs only in leap years.
   Annual public holidays are not calculated from lunar/religious calendars. No monthly,
   nth-weekday or external holiday feed is implied.
5. **Overnight rules:** rejected; end must be after start on the same day. Stakeholders
   must specify cross-midnight behaviour before adding it. Adjacent intervals are allowed.
6. **Precedence:** enabled location exceptions outrank enabled state exceptions. Multiple
   applicable exceptions at the same priority are unresolved, not arbitrarily chosen.
   Same-scope rule conflicts are rejected on save/import. Lower-priority rules remain
   visible in occurrence details. No scope is inferred from location names.
7. **Overrides:** replace the time window of each existing occurrence on an applicable
   date. They do not create a run on a day with no base schedule. Overriding multiple
   base schedules into the same window can produce effective conflicts: these are
   previewed before save, remain visible and block simulation until resolved.
8. **Preview horizon:** next effective occurrence and editor conflict preview look ahead
   366 days. Calendar navigation can inspect other months. A missing next occurrence
   means none in that horizon, not proof that a distant rule never occurs.
9. **Simulation eligibility:** enabled, normal/overridden, not elapsed, not already
   requested, and location in standby/Post Activation without a pending decision.
   Future occurrences can be rehearsed immediately by explicit operator action.
10. **Phase 2 timing preserved:** simulation selects the existing 30/60-minute demo
    duration, counted from activation completion. Calendar planned/override start/end
    remain reference windows; they do not replace operation deadlines. Integrating
    exact schedule deadlines with warning/acknowledgement timing needs stakeholder
    agreement. There is no automatic scheduled activation or deactivation in Phase 3.
11. **Deduplication:** one request per stable schedule ID/date per session, including
    cancelled/expired requests. Editing a rule does not erase its consumed occurrence.
    A future retry policy is an open question. Request snapshots survive edits/deletion
    of the rule and link to generated operation/audit IDs.
12. **Import:** CSV supports quoted commas/newlines, row errors and duplicates. Only
    validated rows are applied after explicit confirmation; other rows are skipped.
    Commit revalidates the accepted batch atomically. The import is restricted to the
    selected location/assigned state. `.xlsx`/`.xls` selection reports unavailable parsing;
    no file is claimed imported. Excel support remains a partial URS gap.
13. **Persistence/history:** records and simulation requests live in the shared in-memory
    prototype. Refresh resets them. No seed claims successful executions. Passing a
    calendar date displays “Elapsed — execution unverified”. Generated simulation
    events remain distinct from real equipment execution.
14. **Unsaved edits:** editors use the accessible modal, blocking background location/tab
    changes. Close/Escape/backdrop requests a discard decision if modified; the operator
    must save or explicitly discard before changing location. Import content has the
    same discard safeguard.

## Manual review checklist

1. Create a future one-time schedule and a weekly rule. Check required fields, missing
   days, past dates, overnight rejection, enabled/disabled state, edit and confirmed delete.
2. Add identical times at another location: allowed. Add overlapping times at the same
   location: rejected. Switch tabs/locations and confirm saved records remain separate.
3. Assign two locations the same demo state and a third a different state. Add a state
   suppression and verify only matching locations change. Add a location override and
   inspect precedence, original schedule and applied/ignored exception IDs.
4. Navigate months; check weekly/annual recurrence and Feb 29. Create two non-overlapping
   weekly schedules, then override both into one window: review conflict warning and
   confirm both calendar outcomes block simulation.
5. In Exceptions, load the CSV sample. Add a duplicate, invalid time and wrong-scope row.
   Check row errors and confirm import of valid rows only. Try an Excel file: expect
   the explicit unsupported-format message, not a success claim.
6. Open a future calendar occurrence and simulate. Use the global decisions inbox to
   reach Phase 2 acknowledgement. Verify no opening before acknowledge/warning, and
   repeat triggering is blocked after cancellation as well as confirmation.
7. Compare All Locations next-run text, mode/phase, faults and affected-rule context
   with detail screens. Quick activation/deactivation must identify the target and
   reuse acknowledgement, including automated minimum-duration restrictions.
8. Inspect occurrence history and audit references; elapsed dates alone must not say
   executed. Edit/delete a requested rule and inspect the retained request snapshot.
9. Edit without saving, press Escape or click the backdrop: keep-editing/discard choice
   must appear. Check Tab/Shift+Tab, textarea focus and return focus.
10. Review laptop/tablet/phone layouts and rerun existing Equipment Status and operation
    flows. Browser visual inspection was unavailable in the implementation environment.

## Verification

Final checks:
- `node --test tests/equipment.test.mjs tests/operations.test.mjs tests/scheduling.test.mjs`:
  **32/32 passed** (8 equipment, 11 operations, 13 scheduling tests).
- Vite production build passed. Existing MapLibre default-import and large-bundle
  warnings remain.
- Oxlint exited 0 with 27 existing warnings; none in the new scheduling module/UI/tests.
- `git diff --check` passed (line-ending conversion notices only).
- `package-lock.json` hash remained unchanged during this phase; pre-existing edits
  were preserved. No dependencies were installed.

The browser tool returned no enabled apps/browsers, so visual and end-to-end UI
verification remain pending. No production-compliance claim is made.
