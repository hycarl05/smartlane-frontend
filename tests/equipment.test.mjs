import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment, deviceId, normalizeStatus, EQUIPMENT_TYPES, HEALTH_STATES, EMPTY_FILTERS, queryEquipment, equipmentAlarms, summarizeEquipment, isStale, monitoringScenario } from '../src/equipment.js';

const records = buildEquipment(INITIAL_LOCATIONS);
test('every location has all required types and IDs are globally unique', () => {
  assert.equal(new Set(records.map(d => d.id)).size, records.length);
  for (const location of INITIAL_LOCATIONS) {
    const scoped = records.filter(d => d.locationId === location.id);
    assert.deepEqual([...new Set(scoped.map(d => d.type))].sort(), [...EQUIPMENT_TYPES].sort());
    assert.ok(scoped.every(d => d.location === location.name && d.illustrative));
  }
  assert.ok(HEALTH_STATES.every(health => records.some(d => d.health === health)));
});
test('legacy faults never become healthy, missing status stays unknown, connection is distinct', () => {
  for (const status of ['fault', 'off', 'offline']) {
    assert.deepEqual(normalizeStatus({ status, health: 'Good' }), { health: 'Offline', connectivity: 'Inactive' });
  }
  assert.deepEqual(normalizeStatus({}), { health: 'Unknown', connectivity: 'Unknown' });
  assert.deepEqual(normalizeStatus({ health: 'Warning' }), { health: 'Warning', connectivity: 'Active' });
  const camera = records.find(d => d.id === deviceId('sbj', 'CCTV', { km: 'KM46.2NB' }));
  assert.equal(camera.health, 'Offline');
});
test('device IDs and LCS I/O associations survive reordering', () => {
  const reordered = buildEquipment(INITIAL_LOCATIONS.map(l => ({ ...l, gantries: [...l.gantries].reverse(), lcs: [...l.lcs].reverse(), traffic: [...l.traffic].reverse() })));
  assert.deepEqual(reordered.map(d => d.id).sort(), records.map(d => d.id).sort());
  for (const io of records.filter(d => d.type === 'LCS I/O Module')) {
    assert.ok(records.some(d => d.id === io.associatedLcsId && d.locationId === io.locationId && d.type === 'LCS'));
  }
});
test('filters combine scope, type, health, connectivity, search and inclusive timestamp range', () => {
  const target = records.find(d => d.type === 'CCTV' && d.health === 'Offline');
  const matches = queryEquipment(records, { ...EMPTY_FILTERS, location: target.locationId, type: 'CCTV', health: 'Offline', connectivity: 'Inactive', search: target.id, from: target.updatedAt, to: target.updatedAt });
  assert.deepEqual(matches.map(d => d.id), [target.id]);
  assert.equal(queryEquipment(records, { ...EMPTY_FILTERS, search: 'no-such-device-xyz' }).length, 0);
  assert.equal(queryEquipment(records, { ...EMPTY_FILTERS, from: '2099-01-01' }).length, 0);
});
test('sorting is reversible and pagination does not duplicate or omit filtered records', () => {
  const filters = { ...EMPTY_FILTERS, location: 'pms' };
  const asc = queryEquipment(records, filters, { field: 'name', direction: 'asc' });
  const desc = queryEquipment(records, filters, { field: 'name', direction: 'desc' });
  assert.deepEqual(desc.map(d => d.id), asc.map(d => d.id).reverse());
  const pages = Array.from({ length: Math.ceil(asc.length / 10) }, (_, p) => asc.slice(p * 10, (p + 1) * 10));
  assert.deepEqual(pages.flat().map(d => d.id), asc.map(d => d.id));
});
test('summary and alarms use the same scoped records, without changing audit or source fixtures', () => {
  const original = JSON.stringify(INITIAL_LOCATIONS);
  for (const loc of INITIAL_LOCATIONS) {
    const scoped = records.filter(d => d.locationId === loc.id);
    const counts = summarizeEquipment(scoped);
    const alarms = equipmentAlarms(scoped);
    assert.equal(counts.total, scoped.length);
    assert.equal(alarms.length, counts.Warning + counts.Degraded + counts.Offline);
    assert.ok(alarms.every(a => a.locationId === loc.id && scoped.some(d => d.id === a.deviceId)));
  }
  assert.equal(JSON.stringify(INITIAL_LOCATIONS), original);
});
test('empty/stale scenarios are read-only and missing timestamps do not imply fresh health', () => {
  assert.deepEqual(monitoringScenario(records, 'empty'), []);
  assert.ok(monitoringScenario(records, 'stale').every(d => isStale(d)));
  assert.ok(isStale({ updatedAt: null }));
  const unknownTime = buildEquipment([{ id: 'test', name: 'Test', gantries: [{ type: 'CCTV', km: 'X', status: 'fault', updatedAt: null }] }])[0];
  assert.equal(unknownTime.updatedAt, null);
  assert.equal(unknownTime.health, 'Offline');
  assert.equal(monitoringScenario([unknownTime], 'stale')[0].updatedAt, null);
});

test('new inventory without observations never inherits healthy demo fixtures', () => {
  const additions = buildEquipment([{ id: 'new-location', name: 'Unconfirmed',
    lcs: [{ km: 'X', open: true }], traffic: [{ km: 'Y', spd: 50 }] }]);
  assert.ok(additions.length === 3 && additions.every(d => d.health === 'Unknown'));
});
