import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment } from '../src/equipment.js';
import { INITIAL_PHASE6, phase6Reducer } from '../src/phase6.js';
import { fullVmsEditorPath, isVmsDevice, quickTemplateSaveAction, updateVmsQuickDraft, vmsQuickDraft } from '../src/vmsQuickDetailsModel.js';

const devices = buildEquipment(INITIAL_LOCATIONS);
const locationId = 'pms';
const mini = devices.filter(device => device.locationId === locationId && device.type === 'Mini VMS');

test('Mini VMS and VMS use quick details while other equipment retains generic details', () => {
  assert.equal(isVmsDevice(mini[0]), true);
  assert.equal(isVmsDevice({ type: 'VMS' }), true);
  for (const type of ['CCTV', 'AVDS', 'LCS', 'LCS I/O Module']) assert.equal(isVmsDevice({ type }), false);
});
test('quick details resolves the clicked stable device and friendly label remains available', () => { assert.equal(mini[1].demoLabel, 'Mini VMS 02'); assert.ok(vmsQuickDraft({ device: mini[1], locationId, phase: 2 })); });
test('internal ID is not required as the friendly title', () => assert.notEqual(mini[1].demoLabel, mini[1].id));
test('current phase selects Phase 1, 2, 3 and 4 templates independently', () => {
  const templates = Object.fromEntries([1, 2, 3, 4].map(phase => [`${locationId}|${mini[0].id}|${phase}`, { line1: `PHASE ${phase}`, line2: `MESSAGE ${phase}` }]));
  for (const phase of [1, 2, 3, 4]) assert.equal(vmsQuickDraft({ device: mini[0], locationId, phase, templates }).line1, `PHASE ${phase}`);
});
test('an open quick view derives a new message when operation phase changes', () => {
  assert.notDeepEqual(vmsQuickDraft({ device: mini[0], locationId, phase: 1 }), vmsQuickDraft({ device: mini[0], locationId, phase: 2 }));
});
test('line edits update only their controlled preview field', () => {
  const original = vmsQuickDraft({ device: mini[0], locationId, phase: 2 });
  const line1 = updateVmsQuickDraft(original, 'line1', 'lane open');
  const line2 = updateVmsQuickDraft(original, 'line2', 'use shoulder');
  assert.equal(line1.line1, 'LANE OPEN'); assert.equal(line1.line2, original.line2);
  assert.equal(line2.line2, 'USE SHOULDER'); assert.equal(line2.line1, original.line1);
});
test('Save Template targets only the selected device and phase', () => {
  const draft = { ...vmsQuickDraft({ device: mini[1], locationId, phase: 3 }), line1: 'SELECTED ONLY' };
  const action = quickTemplateSaveAction({ device: mini[1], locationId, phase: 3, draft });
  const state = phase6Reducer(INITIAL_PHASE6, { ...action, actorId: 'operator', now: 1 });
  assert.equal(state.templates[`${locationId}|${mini[1].id}|3`].line1, 'SELECTED ONLY');
  assert.equal(state.templates[`${locationId}|${mini[0].id}|3`], undefined);
});
test('discarding a local edit restores the shared saved template without a dispatch', () => {
  const templates = { [`${locationId}|${mini[0].id}|2`]: { line1: 'SAVED', line2: 'VALUE' } };
  const saved = vmsQuickDraft({ device: mini[0], locationId, phase: 2, templates });
  updateVmsQuickDraft(saved, 'line1', 'unsaved');
  assert.equal(vmsQuickDraft({ device: mini[0], locationId, phase: 2, templates }).line1, 'SAVED');
});
test('closing with an unsaved draft cannot alter shared templates', () => {
  const templates = { [`${locationId}|${mini[0].id}|2`]: { line1: 'SAVED', line2: 'VALUE' } };
  updateVmsQuickDraft(vmsQuickDraft({ device: mini[0], locationId, phase: 2, templates }), 'line1', 'temporary');
  assert.equal(templates[`${locationId}|${mini[0].id}|2`].line1, 'SAVED');
});
test('full editor route preserves location, stable device ID and phase', () => assert.equal(fullVmsEditorPath(locationId, mini[1].id, 3), `/locations/pms/vms-editor?device=${encodeURIComponent(mini[1].id)}&phase=3`));
test('another location device cannot resolve or produce a save action', () => {
  const other = devices.find(device => device.locationId === 'dopg' && device.type === 'Mini VMS');
  assert.equal(vmsQuickDraft({ device: other, locationId, phase: 2 }), null);
  assert.equal(quickTemplateSaveAction({ device: other, locationId, phase: 2, draft: {} }), null);
});
test('message-only quick save retains configured placement role', () => {
  const action = quickTemplateSaveAction({ device: mini[1], locationId, phase: 2, draft: { line1: 'A', line2: 'B', role: 'Start/entry' } });
  assert.equal(action.draft.role, 'Intermediate');
  assert.equal(action.messageOnly, true);
});
