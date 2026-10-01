import test from 'node:test';
import assert from 'node:assert/strict';
import { createScheduleStore, dateKey, atTime, occursOn, occurrences, nextSchedule, validateRule, changeSchedules, previewImport, CSV_HEADER, monthDates } from '../src/scheduling.js';
import { initialOperations, operationReducer } from '../src/operations.js';
import { DEMO_OPERATION_POLICY as POLICY } from '../src/operationPolicy.js';

const now = atTime('2026-09-30', '08:00');
const locations = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }, { id: 'c', name: 'C' }];
const ids = locations.map(l => l.id);
const fresh = () => createScheduleStore(locations);
const schedule = (extra = {}) => ({ id: 's1', name: 'Weekly peak', locationId: 'a', type: 'weekly', date: '', days: ['Thu'], startTime: '09:00', endTime: '10:00', enabled: true, ...extra });
const exception = (extra = {}) => ({ id: 'e1', name: 'Holiday', category: 'Public Holiday', scope: 'location', scopeId: 'a', recurrence: 'once', date: '2026-10-01', days: [], action: 'suppress', startTime: '', endTime: '', reason: 'Demo closure', enabled: true, ...extra });
const fixture = () => ({ ...fresh(), schedules: [schedule()] });

test('timezone conversion is explicit and calendar months include leap days', () => {
  assert.equal(dateKey(Date.parse('2026-09-30T16:00:00Z')), '2026-10-01');
  assert.equal(atTime('2026-10-01', '00:00'), Date.parse('2026-09-30T16:00:00Z'));
  assert.equal(monthDates('2028-02').length, 29);
  assert.equal(monthDates('2027-02').length, 28);
});

test('one-time, weekly and annual recurrence expand actual dates', () => {
  assert.ok(occursOn(schedule(), '2026-10-01'));
  assert.ok(!occursOn(schedule(), '2026-10-02'));
  assert.ok(occursOn(exception({ recurrence: 'annual', date: '2024-02-29' }), '2028-02-29'));
  assert.ok(!occursOn(exception({ recurrence: 'annual', date: '2024-02-29' }), '2027-02-28'));
  const rows = occurrences(fixture(), 'a', '2026-10-01', '2026-10-31', now);
  assert.deepEqual(rows.map(r => r.date), ['2026-10-01', '2026-10-08', '2026-10-15', '2026-10-22', '2026-10-29']);
});

test('same-location overlaps detected; identical times at other locations allowed', () => {
  const store = fixture();
  assert.ok(validateRule(schedule({ id: null }), 'schedules', store, now, ids).some(e => e.includes('Conflict')));
  assert.deepEqual(validateRule(schedule({ id: null, locationId: 'b' }), 'schedules', store, now, ids), []);
  assert.deepEqual(validateRule(schedule({ id: null, startTime: '10:00', endTime: '11:00' }), 'schedules', store, now, ids), []);
  assert.deepEqual(validateRule(schedule(), 'schedules', store, now, ids), []);
  assert.ok(validateRule(schedule({ id: null, type: 'once', date: '2026-10-01', days: [] }), 'schedules', store, now, ids).length);
});

test('required fields, weekdays, dates and overnight/past times are validated', () => {
  for (const patch of [{ name: '' }, { days: [] }, { startTime: '25:00' }, { startTime: '22:00', endTime: '01:00' },
    { type: 'once', date: '2026-02-30' }, { type: 'once', date: '2026-09-29' }]) {
    assert.ok(validateRule(schedule(patch), 'schedules', fresh(), now, ids).length);
  }
});

test('state exceptions affect only assigned locations and local rules take precedence', () => {
  const store = { ...fixture(), regions: { a: 'MY-07', b: 'MY-07', c: 'MY-01' },
    schedules: ids.map(locationId => schedule({ id: `s-${locationId}`, locationId })),
    exceptions: [exception({ scope: 'state', scopeId: 'MY-07' }), exception({ id: 'local', action: 'override', startTime: '11:00', endTime: '12:00' })] };
  const row = id => occurrences(store, id, '2026-10-01', '2026-10-01', now)[0];
  assert.equal(row('a').outcome, 'Overridden');
  assert.equal(row('a').start, atTime('2026-10-01', '11:00'));
  assert.deepEqual(row('a').ignoredExceptionIds, ['e1']);
  assert.equal(row('b').outcome, 'Suppressed');
  assert.equal(row('c').outcome, 'Normal');
});

test('same-priority exceptions are rejected, while unresolved stored conflicts remain visible', () => {
  const store = { ...fixture(), exceptions: [exception()] };
  const other = exception({ id: 'e2', name: 'Other' });
  assert.ok(validateRule(other, 'exceptions', store, now, ids).some(e => e.includes('Conflict')));
  store.exceptions.push(other);
  assert.equal(occurrences(store, 'a', '2026-10-01', '2026-10-01', now)[0].outcome, 'Conflicting');
});

test('effective overrides can reveal collisions and next occurrence skips suppressed/conflicting rows', () => {
  let store = { ...fixture(), exceptions: [exception()] };
  assert.equal(nextSchedule(store, 'a', now).next.date, '2026-10-08');
  assert.equal(nextSchedule(store, 'a', now).affected.outcome, 'Suppressed');
  store = { ...fixture(), schedules: [schedule(), schedule({ id: 's2', startTime: '12:00', endTime: '13:00' })], exceptions: [exception({ action: 'override', startTime: '14:00', endTime: '15:00' })] };
  assert.ok(occurrences(store, 'a', '2026-10-01', '2026-10-01', now).every(o => o.outcome === 'Conflicting'));
});

test('CRUD checks location IDs and retains unrelated records and attempt snapshots', () => {
  const record = schedule({ id: undefined });
  let store = changeSchedules(fresh(), { type: 'SCHEDULE_SAVE', kind: 'schedules', locationId: 'a', record }, now, ids);
  const saved = store.schedules[0];
  assert.ok(saved.id);
  store = changeSchedules(store, { type: 'SCHEDULE_DELETE', kind: 'schedules', locationId: 'b', id: saved.id }, now, ids);
  assert.equal(store.schedules.length, 1);
  assert.ok(store.feedback.errors.length);
  store = changeSchedules(store, { type: 'SCHEDULE_SAVE', kind: 'schedules', locationId: 'a', record: { ...saved, enabled: false } }, now, ids);
  assert.equal(occurrences(store, 'a', '2026-10-01', '2026-10-01', now).length, 0);
  store = changeSchedules(store, { type: 'SCHEDULE_DELETE', kind: 'schedules', locationId: 'a', id: saved.id }, now, ids);
  assert.equal(store.schedules.length, 0);
});

test('CSV preview handles quoted commas, errors and duplicates; import is validated atomically', () => {
  const row = '"Holiday, sample",Public Holiday,location,a,annual,2026-10-01,,suppress,,,Demo,true';
  const preview = previewImport(`${CSV_HEADER}\n${row}\n${row}\nBad,Public Holiday,location,b,once,2026-10-02,,override,12:00,11:00,Wrong,true`, fresh(), now, ids, 'a');
  assert.equal(preview[0].record.name, 'Holiday, sample');
  assert.deepEqual(preview[0].errors, []);
  assert.ok(preview[1].errors.some(e => e.includes('Duplicate')));
  assert.ok(preview[2].errors.length > 0);
  const applied = changeSchedules(fresh(), { type: 'SCHEDULE_IMPORT', kind: 'exceptions', locationId: 'a', records: [preview[0].record] }, now, ids);
  assert.equal(applied.exceptions.length, 1);
  const invalid = changeSchedules(fresh(), { type: 'SCHEDULE_IMPORT', kind: 'exceptions', locationId: 'a', records: preview.map(r => r.record) }, now, ids);
  assert.equal(invalid.exceptions.length, 0);
  assert.throws(() => previewImport('wrong,header', fresh(), now, ids, 'a'));
});

test('elapsed calendar occurrences never fabricate executed history', () => {
  const row = occurrences(fixture(), 'a', '2026-10-01', '2026-10-01', atTime('2026-10-02', '12:00'))[0];
  assert.match(row.status, /execution unverified/);
  assert.equal(Object.keys(fixture().attempts).length, 0);
});

test('schedule simulation routes through Phase 2 acknowledgement, preserves timing, and deduplicates', () => {
  let state = initialOperations(locations, now);
  const dispatch = action => { state = operationReducer(state, { locationId: 'a', now, actor: 'Demo test', ...action }); };
  dispatch({ type: 'SCHEDULE_SAVE', kind: 'schedules', record: schedule({ id: undefined }) });
  const occurrenceId = `${state.scheduleStore.schedules[0].id}@2026-10-01`;
  const action = { type: 'SCHEDULE_SIMULATE', date: '2026-10-01', occurrenceId, durationMinutes: 30 };
  dispatch(action);
  assert.equal(state.byId.a.mode, 'Scheduled');
  assert.equal(state.byId.a.phase, 0);
  assert.equal(state.byId.a.pendingDecision.kind, 'Activate');
  assert.equal(state.byId.b.phase, 0);
  const requestId = state.byId.a.pendingDecision.id;
  const count = state.events.length;
  dispatch(action);
  assert.equal(state.events.length, count);
  dispatch({ type: 'CONFIRM', requestId });
  assert.equal(state.byId.a.phase, 1);
  assert.equal(state.byId.a.warningDeadline, now + POLICY.warningMs);
  assert.ok(state.events.some(e => e.occurrenceId === occurrenceId));
  dispatch({ type: 'TICK', now: now + POLICY.warningMs + POLICY.transitionMs });
  assert.equal(state.byId.a.phase, 2);
  assert.equal(state.byId.a.plannedEnd, state.byId.a.startedAt + 30 * 60000);
});

test('cancelled occurrence stays consumed, forged/suppressed requests cannot start operations', () => {
  let state = initialOperations(locations, now);
  state.scheduleStore = { ...fixture(), exceptions: [exception()] };
  const action = { type: 'SCHEDULE_SIMULATE', locationId: 'a', date: '2026-10-01', occurrenceId: 's1@2026-10-01', durationMinutes: 30, now };
  state = operationReducer(state, action);
  assert.equal(state.byId.a.pendingDecision, null);
  state.scheduleStore.exceptions = [];
  state = operationReducer(state, action);
  const requestId = state.byId.a.pendingDecision.id;
  state = operationReducer(state, { type: 'CANCEL', locationId: 'a', requestId, now });
  state = operationReducer(state, action);
  assert.equal(state.byId.a.pendingDecision, null);
  state = operationReducer(state, { ...action, locationId: 'b' });
  assert.equal(state.byId.b.pendingDecision, null);
});

test('calendar dates matching the clock never automatically activate an operation', () => {
  let state = initialOperations(locations, now);
  state.scheduleStore = fixture();
  state = operationReducer(state, { type: 'TICK', now: atTime('2026-10-01', '09:00') });
  assert.equal(state.byId.a.phase, 0);
  assert.equal(state.byId.a.pendingDecision, null);
});
