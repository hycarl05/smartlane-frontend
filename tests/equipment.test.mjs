import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment, deviceId, normalizeStatus, EQUIPMENT_TYPES, HEALTH_STATES, EMPTY_FILTERS, queryEquipment, equipmentAlarms, summarizeEquipment, isStale, monitoringScenario, recordsForLocation, eventsForLocation } from '../src/equipment.js';

const records = buildEquipment(INITIAL_LOCATIONS);
test('every location has all required types and IDs are globally unique', () => {
  assert.equal(new Set(records.map(d => d.id)).size, records.length);
  for (const location of INITIAL_LOCATIONS) {
    const scoped = records.filter(d => d.locationId === location.id);
    const expectedTypes = EQUIPMENT_TYPES.filter(type => type !== 'VMS');
    assert.deepEqual([...new Set(scoped.map(d => d.type))].sort(), [...expectedTypes].sort());
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
  const camera = records.find(d => d.id === deviceId('sbj', 'CCTV', { km: 'KM162.3SB' }));
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

test('documented location inventory is isolated by stable location ID', () => {
  const expected = { pms: 13, dopg: 13, sbj: 13, bsd: 13 };
  const physical = { pms: 10, dopg: 10, sbj: 10, bsd: 10 };
  for (const location of INITIAL_LOCATIONS) {
    const scoped = recordsForLocation(records, location.id);
    assert.equal(scoped.length, expected[location.id]);
    assert.equal(scoped.filter(device => device.type !== 'LCS I/O Module').length, physical[location.id]);
    assert.equal(scoped.filter(device => device.type === 'CCTV').length, 3);
    assert.equal(scoped.filter(device => device.type === 'Mini VMS').length, 2);
    assert.equal(scoped.filter(device => device.type === 'AVDS').length, 2);
    assert.equal(scoped.filter(device => device.type === 'LCS').length, 3);
    assert.equal(scoped.filter(device => device.type === 'LCS I/O Module').length, 3);
    assert.equal(new Set(scoped.map(device => device.demoLabel)).size, scoped.length);
    assert.ok(scoped.every(device => /^.+ \d{2}$/.test(device.demoLabel)));
    assert.ok(scoped.filter(device => device.type === 'LCS I/O Module').every(device =>
      scoped.some(parent => parent.id === device.associatedLcsId && parent.demoLabel === device.associatedLcsName)));
    assert.ok(scoped.every(device => device.locationId === location.id && device.direction === location.direction));
    assert.ok(scoped.every(device => !recordsForLocation(records, location.id === 'pms' ? 'dopg' : 'pms').some(other => other.id === device.id)));
  }
  assert.equal(INITIAL_LOCATIONS.find(location => location.id === 'pms').direction, 'Northbound');
  assert.ok(INITIAL_LOCATIONS.filter(location => location.id !== 'pms').every(location => location.direction === 'Southbound'));
  assert.equal(INITIAL_LOCATIONS.find(location => location.id === 'pms').excludedPrototypeInventory.cctv.length, 1);
  assert.equal(INITIAL_LOCATIONS.find(location => location.id === 'pms').excludedPrototypeInventory.vms.length, 1);
});

test('A to B to A selection never retains cross-location devices, alarms, or events', () => {
  const audit = [{ id: 'a', locationId: 'pms' }, { id: 'b', locationId: 'dopg' }, { id: 'global' }];
  const a1 = recordsForLocation(records, 'pms');
  const b = recordsForLocation(records, 'dopg');
  const a2 = recordsForLocation(records, 'pms');
  assert.deepEqual(a2.map(device => device.id), a1.map(device => device.id));
  assert.ok(a1.every(device => device.locationId === 'pms'));
  assert.ok(b.every(device => device.locationId === 'dopg'));
  assert.ok(!a1.some(device => b.some(other => other.id === device.id)));
  assert.ok(equipmentAlarms(a1).every(alarm => alarm.locationId === 'pms'));
  assert.deepEqual(eventsForLocation(audit, 'pms').map(event => event.id), ['a']);
  assert.deepEqual(eventsForLocation(audit, 'dopg').map(event => event.id), ['b']);
});
