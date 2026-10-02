import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment } from '../src/equipment.js';
import { DEMO_ACTIVE_LOCATION_ID, initialDemoOperations, operationReducer, projectLocation } from '../src/operations.js';
import { activeLocationCount, isLocationOperating, locationActionState, locationCardClass } from '../src/overviewState.js';
import { locationPath, resolveRoute } from '../src/routing.js';
import { getDynamicVmsMessage } from '../src/vmsMessages.js';

const now = Date.parse('2026-10-02T02:00:00Z');
const seed = () => initialDemoOperations(INITIAL_LOCATIONS, now);
const projected = state => INITIAL_LOCATIONS.map(location => projectLocation(location, state.byId[location.id], state.now));
const byId = (locations, id) => locations.find(location => location.id === id);

test('Putra is initially the only active demo location', () => {
  const active = projected(seed()).filter(isLocationOperating);
  assert.deepEqual(active.map(location => location.id), [DEMO_ACTIVE_LOCATION_ID]);
});

for (const [id, name] of [['dopg', "Dato' Onn"], ['sbj', 'Sungai Bakap'], ['bsd', 'Bertam']]) {
  test(`${name} remains inactive`, () => assert.equal(isLocationOperating(byId(projected(seed()), id)), false));
}

test('active-location summary count is derived as one', () => assert.equal(activeLocationCount(projected(seed())), 1));

test('Putra receives the semantic active-card class', () => assert.match(locationCardClass(byId(projected(seed()), DEMO_ACTIVE_LOCATION_ID)), /location-card--active/));

test('inactive cards do not receive the active-card class', () => {
  assert.ok(projected(seed()).filter(location => location.id !== DEMO_ACTIVE_LOCATION_ID).every(location => !locationCardClass(location).includes('location-card--active')));
});

test('Putra projects the Active badge state', () => assert.equal(byId(projected(seed()), DEMO_ACTIVE_LOCATION_ID).status, 'active'));

test('Putra projects the operating phase rather than standby', () => {
  const putra = byId(projected(seed()), DEMO_ACTIVE_LOCATION_ID);
  assert.equal(putra.phase, 2);
  assert.match(putra.phaseLabel, /Activation \/ Operating/);
  assert.doesNotMatch(putra.phaseLabel, /Standby/);
});

test('Putra activation is unavailable while active', () => assert.equal(locationActionState(byId(projected(seed()), DEMO_ACTIVE_LOCATION_ID), now).activationDisabled, true));

test('Putra deactivation is available while active', () => assert.equal(locationActionState(byId(projected(seed()), DEMO_ACTIVE_LOCATION_ID), now).deactivationDisabled, false));

test('selected Putra dashboard projection uses the same active operation', () => {
  const state = seed();
  const dashboard = projectLocation(byId(INITIAL_LOCATIONS, DEMO_ACTIVE_LOCATION_ID), state.byId[DEMO_ACTIVE_LOCATION_ID], state.now);
  assert.equal(dashboard.status, 'active');
  assert.equal(dashboard.phase, 2);
});

test('active VMS and LCS presentation derives from Phase 2', () => {
  const state = seed();
  const putra = byId(projected(state), DEMO_ACTIVE_LOCATION_ID);
  const devices = buildEquipment([putra]);
  assert.ok(devices.filter(device => device.type === 'LCS').every(device => device.indication === 'Green Arrow'));
  const mini = devices.find(device => device.type === 'Mini VMS');
  assert.deepEqual(getDynamicVmsMessage(mini.sign, mini.phase), { msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' });
});

function deactivate(state) {
  state = operationReducer(state, { type: 'REQUEST', locationId: DEMO_ACTIVE_LOCATION_ID, kind: 'Deactivate', actor: 'Demo operator', now });
  state = operationReducer(state, { type: 'CONFIRM', locationId: DEMO_ACTIVE_LOCATION_ID, requestId: state.byId[DEMO_ACTIVE_LOCATION_ID].pendingDecision.id, actor: 'Demo operator', now });
  return operationReducer(state, { type: 'TICK', now: state.byId[DEMO_ACTIVE_LOCATION_ID].phaseTransitionAt, actor: 'Demo clock' });
}

test('acknowledged deactivation removes Putra active-card state', () => {
  const putra = byId(projected(deactivate(seed())), DEMO_ACTIVE_LOCATION_ID);
  assert.equal(isLocationOperating(putra), false);
  assert.doesNotMatch(locationCardClass(putra), /location-card--active/);
});

test('active count updates from state after deactivation', () => assert.equal(activeLocationCount(projected(deactivate(seed()))), 0));

test('Putra overview route remains functional', () => {
  const path = locationPath(DEMO_ACTIVE_LOCATION_ID, 'overview');
  assert.equal(path, '/locations/pms/overview');
  const route = resolveRoute(path, INITIAL_LOCATIONS.map(location => location.id));
  assert.equal(route.kind, 'location');
  assert.equal(route.locationId, 'pms');
  assert.equal(route.navigation.key, 'overview');
});
