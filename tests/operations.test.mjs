import test from 'node:test';
import assert from 'node:assert/strict';
import { initialOperations, operationReducer as reduce, projectLocation, operationAudit } from '../src/operations.js';
import { DEMO_OPERATION_POLICY as P, INTERVENTION_REASONS } from '../src/operationPolicy.js';
import { buildEquipment } from '../src/equipment.js';
import { INITIAL_LOCATIONS } from '../src/data.js';

const start = Date.parse('2026-09-30T08:00:00Z');
const seed = () => initialOperations(INITIAL_LOCATIONS, start);
const id = INITIAL_LOCATIONS[0].id;
const send = (state, action, now = state.now) => reduce(state, { locationId: id, actor: 'Demo test operator', now, ...action });
const request = (state, kind, args = {}) => send(state, { type: 'REQUEST', kind, ...args });
const confirm = (state, args = {}) => send(state, { type: 'CONFIRM', requestId: state.byId[id].pendingDecision.id, ...args });
function active(mode = 'Manual') {
  let state = send(seed(), { type: 'MODE', mode });
  state = confirm(request(state, 'Activate', { durationMinutes: 30 }));
  return send(state, { type: 'TICK' }, state.now + P.warningMs + P.transitionMs);
}

test('activation and deactivation are gated by acknowledgement and full warning', () => {
  let state = request(seed(), 'Activate');
  assert.equal(state.byId[id].phase, 0);
  state = send(state, { type: 'CONFIRM', requestId: 'wrong' });
  assert.equal(state.byId[id].phase, 0);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 1);
  state = send(state, { type: 'TICK' }, state.now + P.warningMs);
  assert.equal(state.byId[id].phase, 1);
  assert.equal(state.byId[id].command.status, 'Transition pending');
  state = send(state, { type: 'TICK' }, state.now + P.transitionMs);
  assert.equal(state.byId[id].phase, 2);
  state = request(state, 'Deactivate');
  assert.equal(state.byId[id].phase, 2);
  state = confirm(state);
  assert.equal(state.byId[id].phase, 3);
  state = send(state, { type: 'TICK' }, state.now + P.warningMs + P.transitionMs);
  assert.equal(state.byId[id].phase, 4);
  state = send(state, { type: 'TICK' }, state.now + P.postActivationMs);
  assert.equal(state.byId[id].phase, 5);
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
  state = request(state, 'Deactivate');
  assert.equal(state.events.length, confirmedCount);
  assert.equal(state.byId[id].phase, 1);
});

test('cancelled or expired acknowledgement cannot be replayed even before a browser tick', () => {
  let state = request(seed(), 'Activate');
  const requestId = state.byId[id].pendingDecision.id;
  state = send(state, { type: 'CONFIRM', requestId }, start + P.acknowledgementMs);
  assert.equal(state.byId[id].phase, 0);
  assert.equal(state.byId[id].pendingDecision, null);
  assert.equal(state.byId[id].command.status, 'Expired');
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
  assert.equal(state.byId[other].pendingDecision, null);
  assert.ok(state.events.every(e => e.locationId === id));
});

test('extension validates duration, previews base and changes shared deadline once', () => {
  let state = active('Scheduled');
  const original = state.byId[id].plannedEnd;
  state = request(state, 'Extend');
  state = confirm(state, { minutes: -1 });
  assert.equal(state.byId[id].plannedEnd, original);
  const requestId = state.byId[id].pendingDecision.id;
  state = confirm(state, { minutes: 20 });
  assert.equal(state.byId[id].plannedEnd, original + 20 * 60_000);
  state = send(state, { type: 'CONFIRM', requestId, minutes: 20 });
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
    state = request(state, 'Intervene');
    state = confirm(state, { reason: 'invalid' });
    assert.equal(state.byId[id].intervention, null);
    state = confirm(state, { reason });
    assert.equal(state.byId[id].phase, 2);
    assert.equal(state.byId[id].intervention.reason, reason);
    const projected = projectLocation(INITIAL_LOCATIONS[0], state.byId[id], state.now);
    assert.ok(projected.lcs.every(sign => !sign.open));
    assert.ok(buildEquipment([projected]).filter(d => d.type === 'LCS').every(d => d.indication === 'Awaiting approved policy'));
    state = confirm(request(state, 'Resume'));
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
  state = confirm(request(state, 'Intervene'), { reason: INTERVENTION_REASONS[0] });
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

test('pre-activation Match LCS cannot open signs and operations preserve equipment health/connectivity', () => {
  const before = buildEquipment(INITIAL_LOCATIONS).map(d => [d.id, d.health, d.connectivity]);
  let state = confirm(request(seed(), 'Activate'));
  state = send(state, { type: 'MATCH_LCS' });
  assert.match(state.events[0].decision, /Red X/);
  const projected = INITIAL_LOCATIONS.map(l => projectLocation(l, state.byId[l.id], state.now));
  assert.ok(projected[0].lcs.every(s => !s.open));
  assert.deepEqual(buildEquipment(projected).map(d => [d.id, d.health, d.connectivity]), before);
});

test('all operator and clock events reach structured main audit adapter with unique IDs', () => {
  const state = active();
  const rows = operationAudit(state.events, INITIAL_LOCATIONS);
  assert.equal(new Set(rows.map(e => e.id)).size, rows.length);
  for (const row of rows) {
    assert.ok(row.timestamp && row.locationId && row.actor);
    assert.ok(Object.hasOwn(row, 'operationId'));
    if (row.action !== 'Mode') assert.ok(row.operationId);
    assert.equal(row.result, 'Simulated');
    assert.ok(row.action && row.decision && row.outcome && row.activity);
  }
  assert.ok(rows.some(row => row.action === 'Transition' && row.newPhase === 2));
});
