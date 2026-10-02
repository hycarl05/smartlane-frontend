import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment } from '../src/equipment.js';
import { INITIAL_PHASE6, phase6Reducer } from '../src/phase6.js';
import { shouldShowOperationControls } from '../src/routing.js';
import { draftForVmsDevice, draftsForVmsDevices, normalizedVmsRole, operationalMiniVmsDevices, updateDeviceDraft, vmsDevicesForLocation, vmsTemplateSaveActions } from '../src/vmsEditorModel.js';

const devices = buildEquipment(INITIAL_LOCATIONS);
const locationId = 'pms';
const putraDevices = operationalMiniVmsDevices(devices, locationId);

test('operation controls render on Overview only', () => {
  assert.equal(shouldShowOperationControls('overview'), true);
  for (const tab of ['vms', 'reports', 'schedule', 'exceptions', 'log', 'equipment', 'gis', 'schematic']) assert.equal(shouldShowOperationControls(tab), false);
});
test('navigating away does not recreate operation state', () => { const state = { phase: 2, operationId: 'OP-1' }; shouldShowOperationControls('vms'); assert.deepEqual(state, { phase: 2, operationId: 'OP-1' }); });
test('both configured Mini VMS devices are selected simultaneously', () => assert.equal(putraDevices.length, 2));
test('first board uses configured Start/entry role', () => assert.equal(normalizedVmsRole(putraDevices[0]), 'Start/entry'));
test('Putra second board preserves configured Intermediate role', () => assert.equal(normalizedVmsRole(putraDevices[1]), 'Intermediate'));
test('normal locations use configured Start and Final roles', () => {
  for (const id of ['dopg', 'sbj', 'bsd']) assert.deepEqual(operationalMiniVmsDevices(devices, id).map(normalizedVmsRole), ['Start/entry', 'Final/exit']);
});
test('VMS candidates use the selected stable location ID', () => assert.ok(putraDevices.every(device => device.locationId === locationId && device.type === 'Mini VMS')));
test('device candidates exclude another location', () => assert.equal(vmsDevicesForLocation(devices, locationId, 'Mini VMS').some(device => device.locationId === 'dopg'), false));
test('editing the first device leaves the second draft unchanged', () => {
  const drafts = draftsForVmsDevices({ locationId, devices: putraDevices, phase: 1 });
  const updated = updateDeviceDraft(drafts, putraDevices[0].id, 'line1', 'lane open');
  assert.equal(updated[putraDevices[0].id].line1, 'LANE OPEN');
  assert.deepEqual(updated[putraDevices[1].id], drafts[putraDevices[1].id]);
});
test('editing the second device leaves the first draft unchanged', () => {
  const drafts = draftsForVmsDevices({ locationId, devices: putraDevices, phase: 1 });
  const updated = updateDeviceDraft(drafts, putraDevices[1].id, 'line2', 'use shoulder');
  assert.equal(updated[putraDevices[1].id].line2, 'USE SHOULDER');
  assert.deepEqual(updated[putraDevices[0].id], drafts[putraDevices[0].id]);
});
test('changing phase loads messages for both devices', () => {
  const first = draftsForVmsDevices({ locationId, devices: putraDevices, phase: 1 });
  const second = draftsForVmsDevices({ locationId, devices: putraDevices, phase: 2 });
  for (const device of putraDevices) assert.notDeepEqual(first[device.id], second[device.id]);
});
test('each device retains its independent saved message', () => {
  const templates = {
    [`${locationId}|${putraDevices[0].id}|2`]: { line1: 'FIRST', line2: 'ENTRY' },
    [`${locationId}|${putraDevices[1].id}|2`]: { line1: 'SECOND', line2: 'MIDDLE' },
  };
  const drafts = draftsForVmsDevices({ templates, locationId, devices: putraDevices, phase: 2 });
  assert.equal(drafts[putraDevices[0].id].line1, 'FIRST');
  assert.equal(drafts[putraDevices[1].id].line1, 'SECOND');
});
test('Save Both produces and stores two independent template records', () => {
  const drafts = draftsForVmsDevices({ locationId, devices: putraDevices, phase: 2 });
  const actions = vmsTemplateSaveActions({ locationId, devices: putraDevices, phase: 2, drafts });
  const state = actions.reduce((current, action, index) => phase6Reducer(current, { ...action, actorId: 'admin', now: index + 1 }), INITIAL_PHASE6);
  assert.equal(actions.length, 2);
  assert.equal(Object.keys(state.templates).length, 2);
  assert.notEqual(actions[0].deviceId, actions[1].deviceId);
});
test('two-device selection requires no target-device state or switch', () => assert.deepEqual(operationalMiniVmsDevices(devices, locationId).map(device => device.id), putraDevices.map(device => device.id)));
test('a missing second device is not replaced by a synthetic record', () => assert.deepEqual(operationalMiniVmsDevices([putraDevices[0]], locationId), [putraDevices[0]]));
test('more than two records select placement-priority operational devices only', () => {
  const extra = { ...putraDevices[1], id: 'pms:Mini VMS:extra', sign: { ...putraDevices[1].sign, position: 'Other' } };
  assert.deepEqual(operationalMiniVmsDevices([...putraDevices, extra], locationId).map(device => device.id), putraDevices.map(device => device.id));
});
test('saved templates cannot override configured placement role', () => {
  const device = putraDevices[0];
  const templates = { [`${locationId}|${device.id}|1`]: { line1: 'A', line2: 'B', role: 'Final/exit' } };
  assert.equal(draftForVmsDevice({ templates, locationId, device, phase: 1 }).role, 'Start/entry');
});
