import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { INITIAL_LOCATIONS } from '../src/data.js';
import { buildEquipment } from '../src/equipment.js';
import { initialDemoOperations, projectLocation } from '../src/operations.js';
import { REPORT_FORMATS, REPORT_PERIODS, REPORT_TYPES, activationRows, auditTrailRows, buildReportRows, createReportSnapshot, equipmentHealthRows, reportColumns, reportFilename } from '../src/reports.js';
import { generateExcelBytes, generatePdfBytes, reportTableRows } from '../src/reportFiles.js';
import { locationPath, resolveRoute } from '../src/routing.js';

const now = Date.parse('2026-10-02T03:00:00Z');
const operations = initialDemoOperations(INITIAL_LOCATIONS, now);
const locations = INITIAL_LOCATIONS.map(location => projectLocation(location, operations.byId[location.id], now));
const devices = buildEquipment(locations);
const putra = locations.find(location => location.id === 'pms');
const audits = [
  { id: 'a', timestamp: '2026-10-01T03:00:00.000Z', locationId: 'pms', initiator: 'operator', module: 'Operation', activity: 'Acknowledged activation', location: putra.name, equipmentId: 'DEMO-pms', result: 'Success' },
  { id: 'b', timestamp: '2026-10-01T03:00:00.000Z', locationId: 'dopg', initiator: 'operator', module: 'Operation', activity: 'Other location', location: 'Dato Onn', equipmentId: 'DEMO-dopg', result: 'Success' },
  { id: 'c', timestamp: '2026-10-01T03:00:00.000Z', initiator: 'system', module: 'System', activity: 'Global record', location: 'Global', equipmentId: 'N/A', result: 'Success' },
];

test('Reports route loads as a location-scoped page', () => assert.equal(resolveRoute('/locations/pms/reports', INITIAL_LOCATIONS.map(location => location.id)).navigation.key, 'reports'));
test('report location is derived from the routed stable location ID', () => assert.ok(equipmentHealthRows(devices, 'pms').every(row => row.equipmentId.startsWith('pms:'))));
test('exactly three report types are available', () => assert.deepEqual(REPORT_TYPES.map(type => type.label), ['Equipment Health Report', 'Smartlane Activation Report', 'Audit Trail Report']));
test('only Weekly, Monthly and Annual periods are available', () => assert.deepEqual(REPORT_PERIODS, ['Weekly', 'Monthly', 'Annual']));
test('only PDF and Excel formats are available', () => assert.deepEqual(REPORT_FORMATS, ['PDF', 'Excel']));
test('Equipment Health includes only selected-location equipment', () => assert.equal(equipmentHealthRows(devices, 'pms').some(row => row.equipmentId.startsWith('dopg:')), false));
test('Putra Equipment Health contains 13 monitoring records', () => assert.equal(equipmentHealthRows(devices, 'pms').length, 13));
test('Activation Report groups one row per operation ID', () => {
  const events = [{ locationId: 'pms', operationId: 'OP-1', timestamp: '2026-10-01T01:00:00Z', action: 'Activate', newPhase: 0 }, { locationId: 'pms', operationId: 'OP-1', timestamp: '2026-10-01T01:01:00Z', action: 'Transition', newPhase: 2 }];
  assert.equal(activationRows({ events, byId: {} }, devices, 'pms', 'Weekly', now).length, 1);
});
test('Audit Trail excludes other-location and unscoped records', () => assert.deepEqual(auditTrailRows(audits, 'pms', 'Weekly', now).map(row => row.activity), ['Acknowledged activation']));
test('preview columns change by report type', () => assert.notDeepEqual(reportColumns('health'), reportColumns('audit')));
test('an empty period produces no report rows', () => assert.equal(auditTrailRows(audits, 'pms', 'Weekly', Date.parse('2028-01-01')).length, 0));
test('generated filename is meaningful and filesystem-safe', () => assert.equal(reportFilename('health', putra, 'Weekly', 'PDF', now), 'equipment-health_putra-mahkota-southville_weekly_2026-10-02.pdf'));
test('PDF generation uses the same ordered rows as the preview', () => {
  const report = createReportSnapshot({ type: 'health', period: 'Weekly', format: 'PDF', location: putra, actorId: 'admin', now, devices, operations, auditLogs: audits });
  assert.equal(reportTableRows(report).length, report.rows.length);
  const bytes = generatePdfBytes(report), decoder = new TextDecoder();
  assert.equal(decoder.decode(bytes.slice(0, 5)), '%PDF-');
  assert.match(decoder.decode(bytes.slice(-16)), /%%EOF/);
});
test('Excel generation contains the same rows shown in preview', () => {
  const report = createReportSnapshot({ type: 'health', period: 'Weekly', format: 'Excel', location: putra, actorId: 'admin', now, devices, operations, auditLogs: audits });
  const bytes = generateExcelBytes(report), view = new Uint8Array(bytes); assert.equal(String.fromCharCode(...view.slice(0, 2)), 'PK');
  const workbook = XLSX.read(bytes, { type: 'array' });
  const sheetRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
  assert.deepEqual(sheetRows.slice(-report.rows.length), reportTableRows(report));
});
test('report generation does not mutate source records', () => {
  const before = JSON.stringify({ audits, operations });
  buildReportRows({ type: 'audit', locationId: 'pms', period: 'Weekly', now, devices, operations, auditLogs: audits });
  assert.equal(JSON.stringify({ audits, operations }), before);
});
test('existing overview route remains functional', () => assert.equal(resolveRoute(locationPath('pms', 'overview'), INITIAL_LOCATIONS.map(location => location.id)).navigation.key, 'overview'));
