import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment } from '../src/equipment.js';
import { initialOperations } from '../src/operations.js';
import { initialAdministration, defaultConfig, validateConfig, validIp, validateGroup, validateUser, applyConfiguration, adminReducer, adminAudit, MOCK_DIRECTORY, previewAdministrator } from '../src/administration.js';
import { capabilities, moduleAllowed, operationActionAllowed, accessKey } from '../src/access.js';

const devices = buildEquipment(INITIAL_LOCATIONS);
const ids = INITIAL_LOCATIONS.map(l => l.id);
const device = devices.find(d => d.type === 'CCTV');
const now = Date.parse('2026-09-30T10:00:00Z');
const config = (extra = {}) => ({ ...defaultConfig(device), name: 'Demo camera A', description: 'Illustrative roadside camera', model: 'Demo model', ip: '192.0.2.10', latitude: '2.5', longitude: '101.5', ...extra });
const group = (extra = {}) => ({ name: 'Review group', description: 'Metadata only', locationId: device.locationId, deviceIds: [device.id], ...extra });
const user = (extra = {}) => ({ name: 'Fictional User', username: 'demo.new', role: 'Overview', active: true, locationIds: [ids[0]], directoryId: null, ...extra });
const seed = () => initialAdministration(INITIAL_LOCATIONS);
const send = (state, action) => adminReducer(state, { actorId: 'PREVIEW-ADMIN', locationId: device.locationId, devices, locationIds: ids, now, token: 'test', ...action });

test('configuration validates required fields, IPv4 and geographic coordinates', () => {
  assert.deepEqual(validateConfig(config(), devices, {}), []);
  for (const patch of [{ name: '' }, { description: '' }, { model: '' }, { ip: '256.1.1.1' }, { ip: '1.2.3' }, { latitude: '91' }, { longitude: '-181' }, { latitude: null }, { longitude: ' ' }]) {
    assert.ok(validateConfig(config(patch), devices, {}).length);
  }
  assert.ok(!validIp('001.2.3.4'));
  assert.ok(validIp('192.0.2.1'));
  assert.deepEqual(validateConfig(config({ latitude: 0, longitude: 0 }), devices, {}), []);
});

test('configuration locks location/type and detects duplicate assignments in the same location', () => {
  assert.ok(validateConfig(config({ locationId: ids[1] }), devices, {}).length);
  assert.ok(validateConfig(config({ type: 'VMS' }), devices, {}).length);
  const other = devices.find(d => d.id !== device.id && d.locationId === device.locationId);
  assert.ok(validateConfig(config(), devices, { [other.id]: config({ id: other.id }) }).some(e => e.includes('IP')));
  assert.deepEqual(validateConfig(config(), devices, { other: config({ id: 'other', locationId: ids[1] }) }), []);
});

test('configuration overlay preserves IDs, telemetry and shared operation deadlines', () => {
  const operations = initialOperations(INITIAL_LOCATIONS, now);
  const snapshot = JSON.stringify({ devices, operations });
  const state = send(seed(), { type: 'CONFIG_SAVE', record: config({ enabled: false }) });
  const projected = applyConfiguration(devices, state.configs);
  assert.deepEqual(projected.map(d => d.id), devices.map(d => d.id));
  for (let i = 0; i < devices.length; i++) for (const field of ['health', 'connectivity', 'updatedAt', 'speed', 'volume', 'occupancy', 'indication']) assert.deepEqual(projected[i][field], devices[i][field]);
  assert.equal(projected.find(d => d.id === device.id).configuration.enabled, false);
  assert.equal(projected.find(d => d.id === device.id).name, 'Demo camera A');
  assert.equal(JSON.stringify({ devices, operations }), snapshot);
});

test('I/O relationships retain stable device references while configured labels update', () => {
  const lcs = devices.find(d => d.type === 'LCS');
  const configured = applyConfiguration(devices, { [lcs.id]: { ...defaultConfig(lcs), name: 'Configured LCS name' } });
  const io = configured.find(d => d.associatedLcsId === lcs.id);
  assert.equal(io.associatedLcsId, lcs.id);
  assert.equal(io.associatedLcsName, 'Configured LCS name');
});

test('credential entries and injected secret fields never enter state or audit', () => {
  const secret = 'demo-secret-do-not-retain';
  let state = send(seed(), { type: 'CONFIG_SAVE', record: { ...config(), password: secret, username: secret, credentials: secret } });
  state = send(state, { type: 'CREDENTIAL_STATE', id: device.id, decision: 'configure', password: secret, username: secret });
  assert.equal(state.configs[device.id].credentialsConfigured, true);
  assert.ok(!JSON.stringify(state).includes(secret));
  assert.ok(!JSON.stringify(adminAudit(state.events, INITIAL_LOCATIONS)).includes(secret));
  state = send(state, { type: 'CREDENTIAL_STATE', id: device.id, decision: 'clear' });
  assert.equal(state.configs[device.id].credentialsConfigured, false);
});

test('groups reject missing/duplicate/cross-location members and duplicate names', () => {
  assert.deepEqual(validateGroup(group(), devices, [], ids), []);
  const elsewhere = devices.find(d => d.locationId !== device.locationId);
  for (const deviceIds of [[], ['missing'], [device.id, device.id], [elsewhere.id]]) assert.ok(validateGroup(group({ deviceIds }), devices, [], ids).length);
  assert.ok(validateGroup(group(), devices, [{ ...group(), id: 'g1' }], ids).length);
});

test('group save/delete changes metadata only and does not recreate devices', () => {
  const source = JSON.stringify(devices);
  let state = send(seed(), { type: 'GROUP_SAVE', record: group() });
  const id = state.groups[0].id;
  state = send(state, { type: 'GROUP_SAVE', record: { ...state.groups[0], description: 'Changed' } });
  assert.equal(state.groups.length, 1);
  assert.equal(state.groups[0].id, id);
  const wrong = send(state, { type: 'GROUP_DELETE', id, locationId: ids[1] });
  assert.equal(wrong.groups.length, 1);
  state = send(state, { type: 'GROUP_DELETE', id });
  assert.equal(state.groups.length, 0);
  assert.equal(JSON.stringify(devices), source);
});

test('directory association and username duplicates include inactive users', () => {
  const identity = MOCK_DIRECTORY[0];
  const first = user({ directoryId: identity.id, username: identity.username, id: 'u1', active: false });
  const errors = validateUser(user({ directoryId: identity.id, username: identity.username }), [first], ids);
  assert.ok(errors.some(e => e.includes('Username')));
  assert.ok(errors.some(e => e.includes('Directory')));
  assert.ok(validateUser(user({ directoryId: identity.id, username: 'different' }), [], ids).length);
  assert.ok(validateUser(user({ name: '', locationIds: ['missing'] }), [], ids).length);
  assert.deepEqual(validateUser(user({ locationIds: [] }), [], ids), []);
});

test('deactivation/reactivation preserves user IDs and audit references', () => {
  let state = send(seed(), { type: 'USER_SAVE', record: user() });
  const saved = state.users.find(u => u.username === 'demo.new');
  state = send(state, { type: 'USER_ACTIVE', id: saved.id, active: false });
  assert.equal(state.users.find(u => u.id === saved.id).active, false);
  assert.ok(state.events.some(e => e.reference === saved.id));
  state = send(state, { type: 'USER_ACTIVE', id: saved.id, active: true });
  assert.equal(state.users.find(u => u.id === saved.id).active, true);
});

test('one capability map controls role modules, editing and authorized locations', () => {
  const persona = role => user({ id: 'test', role });
  assert.ok(moduleAllowed(persona('Overview'), 'equipment', ids[0]));
  assert.ok(!moduleAllowed(persona('Overview'), 'schedule', ids[0]));
  assert.ok(capabilities(persona('Operation'), ids[0]).operate);
  assert.ok(!capabilities(persona('Operation'), ids[0]).vmsEdit);
  assert.ok(moduleAllowed(persona('Management'), 'log', ids[0]));
  assert.ok(!capabilities(persona('Management'), ids[0]).operate);
  assert.ok(moduleAllowed(persona('System Administrator'), 'users', ids[0]));
  assert.ok(!moduleAllowed(persona('System Administrator'), 'users', ids[1]));
  assert.ok(!capabilities(user({ active: false }), ids[0]).read);
  assert.ok(!capabilities(user({ locationIds: [] }), ids[0]).read);
  assert.ok(!capabilities(user({ role: 'invented' }), ids[0]).read);
});

test('schedule/state and operation actions use the same location capability rules', () => {
  const operator = user({ role: 'Operation' });
  assert.ok(operationActionAllowed(operator, { type: 'REQUEST', locationId: ids[0] }));
  assert.ok(!operationActionAllowed(operator, { type: 'REQUEST', locationId: ids[1] }));
  const scheduleStore = { regions: { [ids[0]]: 'MY-07', [ids[1]]: 'MY-07' }, exceptions: [] };
  assert.ok(!operationActionAllowed(operator, { type: 'SCHEDULE_SAVE', locationId: ids[0], record: { scope: 'state', scopeId: 'MY-07' } }, scheduleStore));
  assert.ok(!operationActionAllowed(operator, { type: 'ADVANCE' }));
  assert.ok(operationActionAllowed(previewAdministrator(ids), { type: 'ADVANCE' }));
});

test('stale/deactivated administration actor cannot submit a prior edit', () => {
  let state = seed();
  const old = state.users.find(u => u.id === 'DEMO-ADMIN');
  state = send(state, { type: 'USER_ACTIVE', id: old.id, active: false });
  const denied = send(state, { type: 'CONFIG_SAVE', record: config(), actorId: old.id });
  assert.deepEqual(denied.configs, {});
  assert.ok(denied.feedback.errors.length);
  assert.notEqual(accessKey(old), accessKey(state.users.find(u => u.id === old.id)));
});

test('administrative events enter the shared audit table shape without operation claims', () => {
  const state = send(seed(), { type: 'CONFIG_SAVE', record: config() });
  const row = adminAudit(state.events, INITIAL_LOCATIONS)[0];
  assert.equal(row.module, 'Administration');
  assert.equal(row.result, 'Simulated');
  assert.equal(row.reference, device.id);
  assert.equal(row.locationId, device.locationId);
  assert.ok(row.actor && row.timestamp && row.activity);
  assert.match(row.activity, /health\/connectivity unchanged/);
  assert.equal(row.operationId, null);
});

test('configuration import is atomic and rejects forbidden fields', () => {
  const second = devices.find(d => d.id !== device.id && d.locationId === device.locationId);
  const state = send(seed(), { type: 'CONFIG_IMPORT', records: [config(), { ...config({ id: second.id }), credentials: 'secret' }] });
  assert.deepEqual(state.configs, {});
  assert.match(state.feedback.errors.join(' '), /unsupported fields/);
  assert.ok(!JSON.stringify(state).includes('secret'));
});
