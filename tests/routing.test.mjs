import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryRouter } from 'react-router-dom';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment, recordsForLocation } from '../src/equipment.js';
import { capabilities, moduleAllowed } from '../src/access.js';
import { initialOperations } from '../src/operations.js';
import { LOCATION_NAVIGATION, locationPath, resolveRoute } from '../src/routing.js';

const ids = INITIAL_LOCATIONS.map(location => location.id);
const first = ids[0];

test('root resolves to the replace redirect target', () => assert.deepEqual(resolveRoute('/', ids), { kind: 'redirect', to: '/locations' }));
test('All Locations has its own route', () => assert.deepEqual(resolveRoute('/locations', ids), { kind: 'locations' }));
test('selecting a location produces its overview URL', () => assert.equal(locationPath(first), `/locations/${first}/overview`));
test('direct overview URL resolves the correct stable location', () => assert.equal(resolveRoute(locationPath(first), ids).locationId, first));
test('direct schedule URL resolves Schedule', () => assert.equal(resolveRoute(locationPath(first, 'schedule'), ids).navigation.key, 'schedule'));
test('direct audit URL resolves Alarms & Audit', () => assert.equal(resolveRoute(locationPath(first, 'log'), ids).navigation.key, 'log'));
test('changing tabs preserves the selected location ID', () => assert.ok(['schedule', 'exceptions', 'log'].every(key => resolveRoute(locationPath(first, key), ids).locationId === first)));
test('memory history back and forward changes the route-derived active tab', async () => {
  const router = createMemoryRouter([{ path: '/locations' }, { path: '/locations/:locationId/:page' }], { initialEntries: ['/locations', locationPath(first), locationPath(first, 'schedule')], initialIndex: 2 });
  await router.navigate(-1);
  assert.equal(resolveRoute(router.state.location.pathname, ids).navigation.key, 'overview');
  await router.navigate(1);
  assert.equal(resolveRoute(router.state.location.pathname, ids).navigation.key, 'schedule');
  router.dispose();
});
test('deep-link initialization derives the page from the URL', () => assert.equal(resolveRoute(locationPath(first, 'equipment'), ids).navigation.key, 'equipment'));
test('invalid location IDs never resolve another location', () => assert.deepEqual(resolveRoute('/locations/not-real/overview', ids), { kind: 'location-not-found', locationId: 'not-real' }));
test('unknown routes resolve Not Found', () => assert.deepEqual(resolveRoute('/unrelated/page', ids), { kind: 'not-found' }));
test('route resolution does not recreate or mutate operation state', () => { const operations = initialOperations(INITIAL_LOCATIONS, 1); const before = operations.byId[first]; resolveRoute(locationPath(first, 'schedule'), ids); assert.equal(operations.byId[first], before); });
test('location-scoped device records stay isolated under routed IDs', () => { const records = buildEquipment(INITIAL_LOCATIONS); assert.ok(recordsForLocation(records, first).every(device => device.locationId === first)); });
test('route mapping retains existing permission checks', () => { const persona = { id: 'reader', role: 'Overview', active: true, locationIds: [first] }; assert.equal(capabilities(persona, first).read, true); assert.equal(moduleAllowed(persona, 'schedule', first), false); });
test('every visible selected-location page has a unique semantic route', () => { assert.equal(LOCATION_NAVIGATION.length, 16); assert.equal(new Set(LOCATION_NAVIGATION.map(item => item.path)).size, LOCATION_NAVIGATION.length); assert.ok(LOCATION_NAVIGATION.every(item => /^[a-z]+(?:-[a-z]+)*$/.test(item.path))); });
test('Housekeeping is not exposed as a location page', () => { assert.equal(LOCATION_NAVIGATION.some(item => item.key === 'housekeeping'), false); assert.deepEqual(resolveRoute(`/locations/${first}/housekeeping`, ids), { kind: 'not-found' }); });
