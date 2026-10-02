import test from 'node:test';
import assert from 'node:assert/strict';
import { initialOperations, operationReducer as reduce, projectLocation, operationAudit } from '../src/operations.js';
import { DEMO_OPERATION_POLICY as P, INTERVENTION_REASONS } from '../src/operationPolicy.js';
import { buildEquipment } from '../src/equipment.js';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { operationVmsMessages } from '../src/vmsMessages.js';

const start = Date.parse('2026-09-30T08:00:00Z');
const seed = () => initialOperations(INITIAL_LOCATIONS, start);
const id = INITIAL_LOCATIONS[0].id;
const send = (state, action, now = state.now) => reduce(state, { locationId: id, actor: 'Demo test operator', now, ...action });
const request = (state, kind, args = {}) => send(state, { type: 'REQUEST', kind, ...args });
const confirm = (state, args = {}) => send(state, { type: 'CONFIRM', requestId: state.byId[id].pendingDecision.id, ...args });
function active(mode = 'Manual') {
  let state = send(seed(), { type: 'MODE', mode });
  return confirm(request(state, 'Activate', { durationMinutes: 30 }));
}

test('activation and deactivation require acknowledgement then complete immediately in design simulation', () => {
  let state = request(seed(), 'Activate');
  assert.equal(state.byId[id].phase, 0);
  state = send(state, { type: 'CONFIRM', requestId: 'wrong' });
  assert.equal(state.byId[id].phase, 0);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[id].warningDeadline, null);
  assert.equal(state.byId[id].command.status, 'Simulated success');
  state = request(state, 'Deactivate');
  assert.equal(state.byId[id].phase, 2);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 5);
  assert.equal(state.byId[id].warningDeadline, null);
  assert.deepEqual(state.events.filter(event => event.action === 'Transition').map(event => [event.previousPhase, event.newPhase]), [[4, 5], [3, 4], [1, 2]]);
});

test('only activation and deactivation are acknowledgement gates; intermediate phases advance without repeat acknowledgement', () => {
  let state = request(seed(), 'Activate', { vmsMessages: operationVmsMessages(INITIAL_LOCATIONS[0], 'Activate') });
  assert.equal(state.byId[id].pendingDecision.requiresAcknowledgement, true);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 2);
  assert.equal(state.byId[id].pendingDecision, null);
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
  const state = confirm(request(seed(), 'Activate'));
  const projected = INITIAL_LOCATIONS.map(l => projectLocation(l, state.byId[l.id], state.now));
  assert.ok(projected[0].lcs.every(s => s.open));
  assert.deepEqual(buildEquipment(projected).map(d => [d.id, d.health, d.connectivity]), before);
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
