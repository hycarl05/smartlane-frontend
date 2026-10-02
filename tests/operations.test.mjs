import test from 'node:test';
import assert from 'node:assert/strict';
import { initialOperations, operationReducer as reduce, projectLocation, operationAudit, PRE_ACTIVATION_DELAY_OPTIONS } from '../src/operations.js';
import { DEMO_OPERATION_POLICY as P, INTERVENTION_REASONS } from '../src/operationPolicy.js';
import { buildEquipment } from '../src/equipment.js';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { operationVmsMessages } from '../src/vmsMessages.js';
import { draftForVmsDevice } from '../src/vmsEditorModel.js';

const start = Date.parse('2026-09-30T08:00:00Z');
const seed = () => initialOperations(INITIAL_LOCATIONS, start);
const id = INITIAL_LOCATIONS[0].id;
const send = (state, action, now = state.now) => reduce(state, { locationId: id, actor: 'Demo test operator', now, ...action });
const request = (state, kind, args = {}) => send(state, { type: 'REQUEST', kind, ...args });
const confirm = (state, args = {}) => send(state, { type: 'CONFIRM', requestId: state.byId[id].pendingDecision.id, ...args });
function active(mode = 'Manual') {
  let state = send(seed(), { type: 'MODE', mode });
  state = confirm(request(state, 'Activate', { durationMinutes: 30 }));
  return send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
}

test('activation acknowledgement starts Phase 1 and the deadline completes Phase 2', () => {
  let state = request(seed(), 'Activate');
  assert.equal(state.byId[id].phase, 0);
  state = send(state, { type: 'CONFIRM', requestId: 'wrong' });
  assert.equal(state.byId[id].phase, 0);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 1);
  assert.equal(state.byId[id].phaseTransitionAt, start + 5000);
  state = send(state, { type: 'TICK' }, start + 4999);
  assert.equal(state.byId[id].phase, 1);
  state = send(state, { type: 'TICK' }, start + 5000);
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[id].warningDeadline, null);
  assert.equal(state.byId[id].command.status, 'Simulated success');
  state = request(state, 'Deactivate');
  assert.equal(state.byId[id].phase, 2);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 3);
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  assert.equal(state.byId[id].phase, 4);
  state = send(state, { type: 'TICK' }, state.byId[id].postAt);
  assert.equal(state.byId[id].phase, 5);
  assert.equal(state.byId[id].warningDeadline, null);
  assert.deepEqual(state.events.filter(event => event.action === 'Transition').map(event => [event.previousPhase, event.newPhase]), [[4, 5], [3, 4], [1, 2]]);
});

test('only activation and deactivation are acknowledgement gates; intermediate phases advance without repeat acknowledgement', () => {
  let state = request(seed(), 'Activate', { vmsMessages: operationVmsMessages(INITIAL_LOCATIONS[0], 'Activate') });
  assert.equal(state.byId[id].pendingDecision.requiresAcknowledgement, true);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 1);
  assert.equal(state.byId[id].pendingDecision, null);
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  state = send(state, { type: 'INTERVENE', reason: INTERVENTION_REASONS[0] });
  assert.equal(state.byId[id].pendingDecision, null);
  assert.equal(state.byId[id].intervention.reason, INTERVENTION_REASONS[0]);
});

test('acknowledgement audit captures actor, location, operation type, selected VMS messages and result', () => {
  const messages = operationVmsMessages(INITIAL_LOCATIONS[0], 'Activate');
  let state = request(seed(), 'Activate', { vmsMessages: messages });
  const requestId = state.byId[id].pendingDecision.id;
  state = send(state, { type: 'CONFIRM', requestId, selectedVmsMessages: messages.slice(0, 1) });
  const row = operationAudit(state.events, INITIAL_LOCATIONS).find(event => event.acknowledgement === 'Acknowledged');
  assert.equal(row.user, 'Demo test operator');
  assert.equal(row.locationId, id);
  assert.equal(row.operationType, 'Activate');
  assert.deepEqual(row.selectedVmsMessages, messages);
  assert.equal(row.result, 'Simulated');
});

test('duplicate/invalid requests and duplicate confirms do not create events or transitions', () => {
  let state = send(seed(), { type: 'REQUEST', kind: 'Deactivate' });
  assert.equal(state.events.length, 0);
  state = request(state, 'Activate');
  const requestId = state.byId[id].pendingDecision.id;
  const count = state.events.length;
  state = request(state, 'Activate');
  assert.equal(state.events.length, count);
  state = confirm(state);
  const confirmedCount = state.events.length;
  state = send(state, { type: 'CONFIRM', requestId });
  assert.equal(state.events.length, confirmedCount);
  assert.equal(state.byId[id].phase, 1);
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  assert.equal(state.byId[id].phase, 2);
});

test('cancelled or expired acknowledgement cannot be replayed even before a browser tick', () => {
  let state = request(seed(), 'Activate');
  const requestId = state.byId[id].pendingDecision.id;
  state = send(state, { type: 'CONFIRM', requestId }, start + P.acknowledgementMs);
  assert.equal(state.byId[id].phase, 0);
  assert.equal(state.byId[id].pendingDecision, null);
  assert.equal(state.byId[id].command.status, 'Expired');
  assert.equal(state.events[0].outcome, 'Cancelled');
  assert.equal(state.events[0].acknowledgement, 'Missing');
  state = request(state, 'Activate');
  state = send(state, { type: 'CANCEL', requestId: state.byId[id].pendingDecision.id });
  assert.equal(state.byId[id].phase, 0);
});

test('locations own independent operations, request IDs and event attribution', () => {
  const other = INITIAL_LOCATIONS[1].id;
  let state = request(seed(), 'Activate');
  const requestId = state.byId[id].pendingDecision.id;
  state = send(state, { type: 'CONFIRM', locationId: other, requestId });
  assert.equal(state.byId[other].phase, 0);
  assert.equal(state.byId[id].phase, 0);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 1);
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[other].pendingDecision, null);
  assert.ok(state.events.every(e => e.locationId === id));
});

test('extension validates duration, previews base and changes shared deadline once', () => {
  let state = active('Scheduled');
  const original = state.byId[id].plannedEnd;
  state = send(state, { type: 'EXTEND', minutes: -1 });
  assert.equal(state.byId[id].plannedEnd, original);
  state = send(state, { type: 'EXTEND', minutes: 20 });
  assert.equal(state.byId[id].plannedEnd, original + 20 * 60_000);
  state = send(state, { type: 'EXTEND', minutes: -1 });
  assert.equal(state.byId[id].plannedEnd, original + 20 * 60_000);
  assert.equal(state.events[0].extensionMinutes, 20);
});

test('manual operation has no fabricated deadline and does not automatically stop', () => {
  let state = active();
  state = send(state, { type: 'TICK' }, state.now + 4 * 60 * 60_000);
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[id].plannedEnd, null);
  state = request(state, 'Extend');
  assert.equal(state.byId[id].pendingDecision, null);
});

test('all intervention reasons require a decision, preserve operation identity, and resume explicitly', () => {
  for (const reason of INTERVENTION_REASONS) {
    let state = active('Scheduled');
    const before = state.byId[id];
    state = send(state, { type: 'INTERVENE', reason: 'invalid' });
    assert.equal(state.byId[id].intervention, null);
    state = send(state, { type: 'INTERVENE', reason });
    assert.equal(state.byId[id].phase, 2);
    assert.equal(state.byId[id].intervention.reason, reason);
    const projected = projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now);
    assert.ok(projected.lcs.every(sign => !sign.open));
    assert.ok(buildEquipment([projected]).filter(d => d.type === 'LCS').every(d => d.indication === 'Awaiting approved policy'));
    state = send(state, { type: 'RESUME' });
    assert.equal(state.byId[id].intervention, null);
    assert.equal(state.byId[id].operationId, before.operationId);
    assert.equal(state.byId[id].startedAt, before.startedAt);
    assert.equal(state.byId[id].plannedEnd, before.plannedEnd);
  }
});

test('recurring reviews and intervention reminders persist and deduplicate on repeated ticks', () => {
  let state = active();
  state = send(state, { type: 'TICK' }, state.now + P.recurringDecisionMs);
  const notification = state.byId[id].notification;
  const eventCount = state.events.length;
  state = send(state, { type: 'TICK' }, state.now + 1);
  assert.deepEqual(state.byId[id].notification, notification);
  assert.equal(state.events.length, eventCount);
  state = send(state, { type: 'CONTINUE_MANUAL' });
  assert.equal(state.byId[id].notification, null);
  state = send(state, { type: 'INTERVENE', reason: INTERVENTION_REASONS[0] });
  state = send(state, { type: 'TICK' }, state.now + P.interventionReminderMs);
  assert.equal(state.byId[id].notification.kind, 'Intervention reminder');
  const count = state.events.length;
  state = send(state, { type: 'TICK' }, state.now + 1000);
  assert.equal(state.events.length, count);
  state = send(state, { type: 'KEEP_INTERVENTION' });
  assert.equal(state.byId[id].notification, null);
  assert.ok(state.byId[id].intervention);
});

test('automated demo minimum is 30 minutes and planned ends never bypass acknowledgement', () => {
  let state = active('Automated');
  state = send(state, { type: 'TICK' }, state.now + 20 * 60_000);
  state = request(state, 'Deactivate');
  assert.equal(state.byId[id].pendingDecision, null);
  assert.equal(state.byId[id].notification, null);
  state = send(state, { type: 'TICK' }, state.now + 10 * 60_000);
  assert.equal(state.byId[id].phase, 2);
  assert.ok(state.byId[id].notification);
  state = request(state, 'Deactivate');
  assert.equal(state.byId[id].pendingDecision.kind, 'Deactivate');
});

test('completed activation synchronizes LCS while preserving equipment health/connectivity', () => {
  const before = buildEquipment(INITIAL_LOCATIONS).map(d => [d.id, d.health, d.connectivity]);
  let state = confirm(request(seed(), 'Activate'));
  const preparing = projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now);
  assert.ok(preparing.lcs.every(s => !s.open));
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  const projected = INITIAL_LOCATIONS.map(l => projectLocation(l, state.byId[l.id], state.now));
  assert.ok(projected[0].lcs.every(s => s.open));
  assert.deepEqual(buildEquipment(projected).map(d => [d.id, d.health, d.connectivity]), before);
});

test('delay choices are exact, location-scoped and default to five seconds', () => {
  let state = seed();
  assert.deepEqual(PRE_ACTIVATION_DELAY_OPTIONS, [5, 10, 30]);
  assert.equal(state.byId[id].preActivationDelaySeconds, 5);
  assert.equal(state.byId[id].preDeactivationDelaySeconds, 5);
  for (const seconds of PRE_ACTIVATION_DELAY_OPTIONS) {
    state = send(state, { type: 'SET_PRE_ACTIVATION_DELAY', seconds });
    assert.equal(state.byId[id].preActivationDelaySeconds, seconds);
  }
  assert.equal(state.byId[INITIAL_LOCATIONS[1].id].preActivationDelaySeconds, 5);
});

test('pre-activation and pre-deactivation delay settings remain independent', () => {
  let state = send(seed(), { type: 'SET_PRE_ACTIVATION_DELAY', seconds: 30 });
  assert.equal(state.byId[id].preActivationDelaySeconds, 30);
  assert.equal(state.byId[id].preDeactivationDelaySeconds, 5);
  state = confirm(request(state, 'Activate'));
  state = send(state, { type: 'TICK' }, state.byId[id].phaseTransitionAt);
  state = send(state, { type: 'SET_PRE_DEACTIVATION_DELAY', seconds: 10 });
  assert.equal(state.byId[id].preActivationDelaySeconds, 30);
  assert.equal(state.byId[id].preDeactivationDelaySeconds, 10);
});

test('each pre-deactivation delay keeps Phase 3 open until Phase 4 starts once', () => {
  for (const seconds of PRE_ACTIVATION_DELAY_OPTIONS) {
    let state = send(active(), { type: 'SET_PRE_DEACTIVATION_DELAY', seconds });
    assert.equal(state.byId[id].preDeactivationDelaySeconds, seconds);
    state = request(state, 'Deactivate');
    const requestId = state.byId[id].pendingDecision.id;
    assert.equal(state.byId[id].pendingDecision.preDeactivationDelaySeconds, seconds);
    state = confirm(state);
    const due = state.now + seconds * 1000;
    assert.equal(state.byId[id].phase, 3);
    assert.equal(state.byId[id].phaseTransitionAt, due);
    assert.equal(state.byId[id].pendingDecision, null);
    assert.ok(projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now).lcs.every(sign => sign.open));
    state = send(state, { type: 'TICK' }, due - 1);
    assert.equal(state.byId[id].phase, 3);
    state = send(state, { type: 'TICK' }, due);
    assert.equal(state.byId[id].phase, 4);
    assert.ok(projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now).lcs.every(sign => !sign.open));
    const transitions = state.events.filter(event => event.previousPhase === 3 && event.newPhase === 4);
    assert.equal(transitions.length, 1);
    state = send(state, { type: 'TICK' }, due + 1);
    assert.equal(state.events.filter(event => event.previousPhase === 3 && event.newPhase === 4).length, 1);
    assert.equal(requestId.startsWith('OP-EVT-'), true);
  }
});

test('cancelled deactivation acknowledgement keeps Phase 2 active without a deadline', () => {
  let state = request(active(), 'Deactivate');
  state = send(state, { type: 'CANCEL', requestId: state.byId[id].pendingDecision.id });
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[id].phaseTransitionAt, null);
  assert.ok(projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now).lcs.every(sign => sign.open));
});

test('Phase 3 and Phase 4 use independent saved Mini VMS templates', () => {
  const mini = buildEquipment(INITIAL_LOCATIONS).filter(device => device.locationId === id && device.type === 'Mini VMS');
  const templates = Object.fromEntries(mini.flatMap((device, index) => [
    [`${id}|${device.id}|3`, { line1: `CLOSING ${index + 1}`, line2: 'PREPARE' }],
    [`${id}|${device.id}|4`, { line1: `CLOSED ${index + 1}`, line2: 'EXIT' }],
  ]));
  assert.deepEqual(mini.map(device => draftForVmsDevice({ templates, locationId: id, device, phase: 3 }).line1), ['CLOSING 1', 'CLOSING 2']);
  assert.deepEqual(mini.map(device => draftForVmsDevice({ templates, locationId: id, device, phase: 4 }).line1), ['CLOSED 1', 'CLOSED 2']);
  assert.deepEqual(operationVmsMessages(INITIAL_LOCATIONS[0], 'Deactivate', templates, mini), [
    `${mini[0].km}: CLOSING 1 / PREPARE`, `${mini[1].km}: CLOSING 2 / PREPARE`,
  ]);
});

test('stale Phase 3 deadline cannot close a newer operation or another location', () => {
  let state = confirm(request(active(), 'Deactivate'));
  const due = state.byId[id].phaseTransitionAt;
  state = { ...state, byId: { ...state.byId, [id]: { ...state.byId[id], operationId: 'NEWER' } } };
  state = send(state, { type: 'TICK' }, due);
  assert.equal(state.byId[id].phase, 3);
  assert.equal(state.byId[INITIAL_LOCATIONS[1].id].phase, 0);
  assert.equal(state.events.filter(event => event.previousPhase === 3 && event.newPhase === 4).length, 0);
});

test('Phase 3 countdown ticks create no audit records before one completion event', () => {
  let state = confirm(request(active(), 'Deactivate'));
  const due = state.byId[id].phaseTransitionAt;
  const count = state.events.length;
  for (const offset of [3000, 2000, 1000]) state = send(state, { type: 'TICK' }, due - offset);
  assert.equal(state.events.length, count);
  state = send(state, { type: 'TICK' }, due);
  assert.equal(state.events.length, count + 1);
  assert.match(operationAudit(state.events, INITIAL_LOCATIONS)[0].activity, /Demo delay: 5 seconds/);
});

test('each selectable delay keeps Phase 1 until its own deadline then transitions once', () => {
  for (const seconds of PRE_ACTIVATION_DELAY_OPTIONS) {
    let state = send(seed(), { type: 'SET_PRE_ACTIVATION_DELAY', seconds });
    state = confirm(request(state, 'Activate'));
    const due = start + seconds * 1000;
    assert.equal(state.byId[id].phaseTransitionAt, due);
    state = send(state, { type: 'TICK' }, due - 1);
    assert.equal(state.byId[id].phase, 1);
    state = send(state, { type: 'TICK' }, due);
    assert.equal(state.byId[id].phase, 2);
    const eventCount = state.events.length;
    state = send(state, { type: 'TICK' }, due + 1000);
    assert.equal(state.events.length, eventCount);
  }
});

test('Phase 1 and Phase 2 resolve each Mini VMS device message independently', () => {
  const mini = buildEquipment(INITIAL_LOCATIONS).filter(device => device.locationId === id && device.type === 'Mini VMS');
  const templates = {
    [`${id}|${mini[0].id}|1`]: { line1: 'ENTRY PREPARE', line2: 'WAIT' },
    [`${id}|${mini[1].id}|1`]: { line1: 'MID PREPARE', line2: 'WAIT' },
    [`${id}|${mini[0].id}|2`]: { line1: 'ENTRY OPEN', line2: 'PROCEED' },
    [`${id}|${mini[1].id}|2`]: { line1: 'MID OPEN', line2: 'PROCEED' },
  };
  assert.deepEqual(mini.map(device => draftForVmsDevice({ templates, locationId: id, device, phase: 1 }).line1), ['ENTRY PREPARE', 'MID PREPARE']);
  assert.deepEqual(mini.map(device => draftForVmsDevice({ templates, locationId: id, device, phase: 2 }).line1), ['ENTRY OPEN', 'MID OPEN']);
});

test('request snapshots delay and active Phase 1 cannot be restarted or changed', () => {
  let state = send(seed(), { type: 'SET_PRE_ACTIVATION_DELAY', seconds: 10 });
  state = request(state, 'Activate');
  assert.equal(state.byId[id].pendingDecision.preActivationDelaySeconds, 10);
  state = send(state, { type: 'SET_PRE_ACTIVATION_DELAY', seconds: 30 });
  assert.equal(state.byId[id].preActivationDelaySeconds, 10);
  state = confirm(state);
  assert.equal(state.byId[id].phaseTransitionAt, start + 10_000);
  state = send(state, { type: 'SET_PRE_ACTIVATION_DELAY', seconds: 30 });
  assert.equal(state.byId[id].phaseTransitionAt, start + 10_000);
});

test('stale and cross-location timers cannot transition another operation', () => {
  const other = INITIAL_LOCATIONS[1].id;
  let state = confirm(request(seed(), 'Activate'));
  const due = state.byId[id].phaseTransitionAt;
  state = { ...state, byId: { ...state.byId, [id]: { ...state.byId[id], operationId: 'NEWER-OPERATION' } } };
  state = send(state, { type: 'TICK' }, due);
  assert.equal(state.byId[id].phase, 1);
  assert.equal(state.byId[other].phase, 0);
  assert.equal(state.events.filter(event => event.newPhase === 2).length, 0);
});

test('activation audit records only phase start and completion, not countdown seconds', () => {
  let state = confirm(request(seed(), 'Activate'));
  const due = state.byId[id].phaseTransitionAt;
  const count = state.events.length;
  state = send(state, { type: 'TICK' }, due - 3000);
  state = send(state, { type: 'TICK' }, due - 2000);
  state = send(state, { type: 'TICK' }, due - 1000);
  assert.equal(state.events.length, count);
  state = send(state, { type: 'TICK' }, due);
  assert.equal(state.events.length, count + 1);
  assert.equal(state.events[0].demoDelaySeconds, 5);
  assert.match(operationAudit(state.events, INITIAL_LOCATIONS)[0].activity, /Demo delay: 5 seconds/);
});

test('simulated device failure never reports a completed operation', () => {
  let state = request(seed(), 'Activate');
  state = send(state, { type: 'CONFIRM', requestId: state.byId[id].pendingDecision.id, simulationResult: 'Failed' });
  assert.equal(state.byId[id].phase, 1);
  assert.equal(state.byId[id].command.status, 'Failed');
  assert.equal(state.byId[id].startedAt, null);
  assert.equal(state.events[0].outcome, 'Failed');
});

test('all operator and clock events reach structured main audit adapter with unique IDs', () => {
  const state = active();
  const rows = operationAudit(state.events, INITIAL_LOCATIONS);
  assert.equal(new Set(rows.map(e => e.id)).size, rows.length);
  for (const row of rows) {
    assert.ok(row.timestamp && row.locationId && row.actor);
    assert.ok(Object.hasOwn(row, 'operationId'));
    if (row.action !== 'Mode') assert.ok(row.operationId);
    assert.ok(row.result);
    assert.ok(row.action && row.decision && row.outcome && row.activity);
  }
  assert.ok(rows.some(row => row.action === 'Transition' && row.newPhase === 2));
});
