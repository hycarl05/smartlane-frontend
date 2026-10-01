# Phase 4 — equipment configuration, groups and users

Frontend prototype only. No real authentication, AD access, secret storage, equipment
provisioning, backend integration or Phase 5 implementation. Refresh resets all new
administration records. Existing login behaviour is unchanged; the persona toolbar is
an independent demonstration of presentation capabilities, not a security boundary.

## Requirement review and coverage

Source: `DRAFT - URS SMARTLANE - 20260822 - updated.docx`.

| URS reference | Relevant requirement | Frontend coverage |
| --- | --- | --- |
| URS_1.1.3 — Settings and Configuration of Equipment | IP, credentials, type, model, coordinates and equipment parameters/status configuration | Dedicated Equipment Configuration view, separate from monitoring. Validated metadata editing keyed by existing device IDs; configuration enabled is explicitly separate from observed health/connectivity. |
| URS_1.1.3 — Group Setting; URS_1.1.6–9 | Group setting is vaguely described; equipment can be managed individually/by group | Location-scoped organizational equipment groups with valid member IDs, search, membership review, create/edit and confirmed delete. No operational group targets are changed. |
| URS_1.1.3 — User Management | Create/edit/delete users, assign roles and associate AD users | Global mock user administration; create/edit, role/location assignment, simulated directory association, deactivate/reactivate. Deletion remains unresolved because URS_1.1.12 instead specifies deactivation. |
| URS_1.1.12 | AD association; create, modify roles, deactivate; Overview/Operation/System Administrator/Management | All four categories, fictional directory search/select/review, duplicate identity checks including inactive accounts, explicit confirmation. No AD verification is claimed. |
| URS_1.1.15 | Location access based on role and assigned permissions | Shared capability mapping controls visible locations/modules, read-only/editable VMS, quick actions, operation/schedule/admin mutation callbacks, and no-authorized-location state. Presentation preview only. |
| URS_1.1.18 | Independent location configuration | Config/group records use stable location/device IDs; cross-location group membership and equipment relocation/type changes are blocked. |
| URS_1.1.3 — Audit Trail | Record operations, actor and timestamp | Non-sensitive administration events join the existing main mock audit table, with actor, reference, location/global context, action, summary and Simulated outcome. |
| URS_1.1.10 | Configured AVDS retrieval interval | Optional proposed polling-interval metadata; no readings are generated and no collection loop is changed. |

Prior handoffs were read; no separate Phase 1 handoff or standalone audit-report file
was present. Phase 1 components and the audit defects supplied in the phase requests
were inspected directly. Existing Phase 2 timing and Phase 3 recurrence/precedence
remain unchanged.

## Files

- New `src/administration.js`: separate administration reducer, validated metadata,
  users/groups, fictional directory records, credential flags and redacted audit adapter.
- New `src/access.js` and `src/accessContext.js`: one role/location capability map and
  shared presentation context.
- New `src/components/Administration.jsx`: configuration/group/user tables, editors,
  directory association, credential workflow, confirmations and mock data states.
- New `src/components/AccessPreview.jsx`: persona selector and access-context notices.
- New `src/administration.css`: administration layout, responsive presentation and
  explicit hidden-navigation styling.
- `src/App.jsx`: separate admin state, metadata overlay onto the existing inventory,
  shared audit aggregation, persona/location filtering and guarded UI action callbacks.
- `src/components/LocationScreen.jsx`, `OverviewScreen.jsx`, `OperationControls.jsx`,
  `Schedule.jsx`, `VmsEditor.jsx`: consistent module/action presentation and mutation
  guards; existing operation/schedule stores retained.
- `src/components/MonitoringDialog.jsx`: reviewable access-change scenario; closes
  unsafe old-context forms without resetting shared operation state.
- `src/components/DeviceDetails.jsx`: configured metadata displayed alongside, and
  distinctly from, observations; configured LCS labels resolve through stable I/O links.
- `src/components/AuditLogDisplay.jsx`: administration provenance/reference display;
  global user-administration events are available alongside location events.
- New `tests/administration.test.mjs`: focused configuration, relationship, credential,
  grouping, directory, capability and audit tests.

## Capability preview

| Role | Read | Edit/action capabilities |
| --- | --- | --- |
| Overview | Dashboard, maps and equipment status at assigned locations | None |
| Operation | Dashboard/status; VMS templates read-only | Operations and schedules/exceptions at assigned locations |
| System Administrator | All applicable modules | Operations, schedules, equipment configuration, groups, users and existing VMS/layout editors |
| Management | Dashboard/status, reports and audit | No operation, schedule or configuration editing |

The role module matrix comes from URS_1.1.3. VMS template editing is treated as
equipment configuration (administrator only); Operation gets read-only template
preview. This interpretation needs confirmation. User administration is global for
an active administrator with access to the selected administration location.

The fixed **Preview administrator (demo tool)** is outside managed user records and
allows recovery after experimenting with account deactivation/empty assignments.
It is deliberately labelled as a test facility, not an authenticated master account.
Managed users can also be selected as personas. Inactive/no-location users see the
empty access state. Saved operations continue under the existing demo clock.

Changing persona, role, active state or location access changes the presentation key,
closes open dialogs and discards unsaved/credential entry state with an explanatory
notice. Submission callbacks check the latest context; the admin reducer also checks
the current managed actor before saving. The dialog's **Demo access-change test**
lets reviewers trigger this while a form is open. These are UI safeguards, not server
authorization. State-scoped schedule edits are blocked if they would also affect a
location outside the persona's assignments. Advancing the global demo clock is an
administrator-preview facility because it affects all locations.

## Assumptions and unresolved questions

1. **Group Setting:** the URS description does not define group semantics or allowed
   type combinations. Groups here may contain mixed equipment types at one location,
   purely for organization. They are distinct from roles/location-access assignments.
   Empty groups, duplicate names per location, missing devices and cross-location
   memberships are rejected. Deleting a group removes metadata only, after confirmation.
2. **Existing targets:** no migration is required or performed. VMS individual scope
   still targets the selected sign; its existing group scope targets the location's
   VMS or Mini VMS collection; all-locations scope targets the locations available in
   the current preview. Match LCS remains location-wide. Newly saved groups never
   alter these sets, phases or command behaviour.
3. **User deletion:** URS_1.1.3 says delete while URS_1.1.12 explicitly lists deactivate.
   Deactivate/reactivate is implemented; hard deletion awaits stakeholder clarification.
   User IDs and past audit references remain intact. Duplicate usernames/directory
   associations remain reserved even for inactive accounts.
4. **Device identity/relationships:** location and type are read-only. Relocation or
   retyping needs explicit relationship migration/validation in a later instruction.
   There is no second device inventory or new-device provisioning in this phase.
5. **Configuration defaults:** model/IP/geographic coordinates start unconfigured;
   no real values are guessed. Config enabled defaults to true only as administrative
   metadata and never implies Active/Good. Saving disabled does not stop an operation
   or change observed status. IPv4 only is the demo restriction; IPv6 remains open.
   Duplicate IP/name assignments are blocked within one location; repeated IPs across
   locations are allowed under an assumed separate-network model. Confirm shared
   controller/I/O addressing and uniqueness policies before integration.
6. **Coordinates:** latitude/longitude are degrees, range checked, and deliberately
   separate from Road Studio canvas coordinates. Saving them does not reposition the
   road drawing or map. Confirm the final site coordinate convention before integration.
7. **Parameters:** non-sensitive notes are a recommended field. AVDS polling interval
   is optional metadata with a proposed 1–3600-second validation range. VMS phase
   parameters remain in the existing editor, LCS/I/O associations are retained, and
   CCTV preview stays simulated. The updated Jetfile requirement is labelled unverified;
   no protocol/provisioning implementation is claimed.
8. **Credentials:** enter invented values beginning `demo-`; passwords are masked and
   never prefilled/revealed. Both entry fields exist only in dialog state and are cleared
   on save/close/access change. No entry value is dispatched, persisted, exported or
   logged. Only a configured flag survives; explicit clear requires confirmation.
   No encryption or secret-storage claim is made. The reducer uses allowlists so even
   injected password/credential properties cannot become saved metadata or audit text.
9. **Directory:** all identities are fictional local samples. Search/no-result/duplicate
   states do not imply a network request. Directory selection requires profile review,
   role/location assignment and confirmed simulated association.
10. **Persistence and states:** saved configs/groups/users survive tab navigation in a
    separate in-memory reducer. Refresh resets them. Loading (one second), unavailable/
    retry and empty views are local demonstrations and do not erase records. Editors
    require explicit save/discard before normal location/tab navigation; access changes
    deliberately invalidate unsaved context instead.

## Verification and manual review

Automated regression suite: **45/45 passed** (13 administration + 32 existing tests).
Build passed after correcting an administration-table JSX syntax error. Existing
MapLibre default-import and bundle-size warnings remain. Lint exits 0 with the 27
existing warnings; no new administration/access warnings. No dependency was installed.

The browser tool returned no enabled apps/browsers. Visual, keyboard and responsive
end-to-end verification remain pending; source/build/tests do not establish those.

Manual checklist:

1. Under Preview administrator, open Equipment Configuration. Edit name/model/IP and
   geographic coordinates; try invalid IP/ranges/duplicates. Confirm that Equipment
   Status/details use the same ID/name while health/connectivity/readings remain unchanged.
2. Disable configuration during an active demo operation. Phase/deadlines must remain
   intact. Check that an offline device never becomes Good/Active because of saving.
3. Enter dummy credentials (`demo-` prefix), verify masking, confirm save, reopen and
   confirm blank entries. Clear the flag. Inspect audit history for absence of values.
4. Create/edit a group, inspect member IDs/types, try a duplicate name and confirm
   deletion. Verify devices and existing VMS/LCS targets remain unchanged.
5. Search the fictional directory, test no-results and duplicate associations, create
   a user, edit role/locations, deactivate and reactivate. Historical references remain.
6. Select each persona. Verify modules, location selectors, quick operations, schedule
   editing and read-only VMS use the same capabilities. Try the no-location/inactive
   cases and return via Preview administrator.
7. Open an editor, modify a value, then use its Demo access-change test. Verify the
   dialog closes with an explanation and the old edit cannot submit. Return to the
   administrator and confirm pending operations and saved schedules were retained.
8. Exercise loading, unavailable/retry, empty/search filters, save/delete feedback,
   unsaved-discard prompts, Tab/Shift+Tab/Escape, and laptop/tablet/phone layouts.
9. Recheck Phase 1 equipment monitoring, Phase 2 acknowledgements/intervention and
   Phase 3 schedules/exceptions. No Phase 5 work is included.
