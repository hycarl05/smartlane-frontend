export const REPORT_TYPES = Object.freeze([
  { id: 'health', label: 'Equipment Health Report', title: 'Smartlane Equipment Health Report' },
  { id: 'activation', label: 'Smartlane Activation Report', title: 'Smartlane Activation Report' },
  { id: 'audit', label: 'Audit Trail Report', title: 'Audit Trail Report' },
]);

export const REPORT_PERIODS = Object.freeze(['Weekly', 'Monthly', 'Annual']);
export const REPORT_FORMATS = Object.freeze(['PDF', 'Excel']);
export const EMPTY_REPORT_MESSAGE = 'No records found for the selected report period.';

export const REPORT_COLUMNS = Object.freeze({
  health: [
    ['equipmentId', 'Equipment ID'], ['description', 'Equipment Description'], ['timestamp', 'Timestamp'],
    ['status', 'Status'], ['remarks', 'Remarks'],
  ],
  activation: [
    ['operationId', 'Operation ID'], ['operationMode', 'Operation Mode'], ['requestTimestamp', 'Request Timestamp'],
    ['preActivationTimestamp', 'Pre-Activation Timestamp'], ['activationTimestamp', 'Activation Timestamp'],
    ['preDeactivationTimestamp', 'Pre-Deactivation Timestamp'], ['deactivationTimestamp', 'Deactivation Timestamp'],
    ['postDeactivationTimestamp', 'Post-Deactivation Timestamp'], ['equipmentStatus', 'Equipment Status'],
    ['radarVehicleVolume', 'Radar Vehicle Volume'], ['result', 'Result'], ['remarks', 'Remarks'],
  ],
  audit: [
    ['timestamp', 'Timestamp'], ['user', 'User'], ['module', 'Module'], ['activity', 'Activity'],
    ['location', 'Smartlane Location'], ['equipmentId', 'Equipment ID'], ['result', 'Operation Result'],
  ],
});

const dash = value => value == null || value === '' ? '—' : value;
const timestampValue = value => {
  if (!value) return NaN;
  const parsed = Date.parse(String(value).replace(' ', 'T'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

export function periodStart(period, now = Date.now()) {
  const date = new Date(now);
  if (period === 'Weekly') date.setDate(date.getDate() - 7);
  else if (period === 'Monthly') date.setMonth(date.getMonth() - 1);
  else if (period === 'Annual') date.setFullYear(date.getFullYear() - 1);
  else return NaN;
  return date.getTime();
}

const withinPeriod = (value, period, now) => {
  const timestamp = timestampValue(value);
  return Number.isFinite(timestamp) && timestamp >= periodStart(period, now) && timestamp <= now;
};

export function equipmentHealthRows(devices, locationId) {
  return devices.filter(device => device.locationId === locationId).map(device => ({
    equipmentId: device.id,
    description: device.description || device.name || '—',
    timestamp: dash(device.updatedAt || device.lastObservedAt || device.observedAt),
    status: dash(device.health || device.status),
    remarks: dash(device.explanation || device.statusReason || 'Frontend prototype observation'),
  }));
}

const phaseTimestamp = (events, phase) => events.find(event => event.newPhase === phase)?.timestamp;

export function activationRows(operations, devices, locationId, period, now = Date.now()) {
  const events = (operations?.events || []).filter(event => event.locationId === locationId && event.operationId);
  const groups = new Map();
  events.forEach(event => {
    const group = groups.get(event.operationId) || [];
    group.push(event);
    groups.set(event.operationId, group);
  });
  const current = operations?.byId?.[locationId];
  if (current?.operationId && !groups.has(current.operationId)) groups.set(current.operationId, []);
  const volume = devices.filter(device => device.locationId === locationId && device.type === 'AVDS').map(device => device.volume).filter(Number.isFinite);
  return [...groups.entries()].map(([operationId, group]) => {
    const sorted = [...group].sort((a, b) => timestampValue(a.timestamp) - timestampValue(b.timestamp));
    const operation = current?.operationId === operationId ? current : null;
    const request = sorted.find(event => event.action === 'Activate');
    const latest = sorted.at(-1);
    const referenceTimestamp = request?.timestamp || phaseTimestamp(sorted, 2) || operation?.startedAt;
    return {
      referenceTimestamp,
      operationId,
      operationMode: dash(operation?.mode || sorted.find(event => event.mode)?.mode),
      requestTimestamp: dash(request?.timestamp),
      preActivationTimestamp: dash(phaseTimestamp(sorted, 1)),
      activationTimestamp: dash(phaseTimestamp(sorted, 2) || (operation?.phase === 2 && operation.startedAt ? new Date(operation.startedAt).toISOString() : null)),
      preDeactivationTimestamp: dash(phaseTimestamp(sorted, 3)),
      deactivationTimestamp: dash(phaseTimestamp(sorted, 4)),
      postDeactivationTimestamp: dash(phaseTimestamp(sorted, 5)),
      equipmentStatus: dash(operation?.lastResult),
      radarVehicleVolume: volume.length && operation ? volume.reduce((sum, value) => sum + value, 0) : '—',
      result: dash(latest?.outcome || operation?.command?.status),
      remarks: group.length ? 'Reconstructed from frontend operation audit events.' : 'Frontend prototype snapshot; historical phase events are unavailable.',
    };
  }).filter(row => withinPeriod(row.referenceTimestamp, period, now)).map(row => {
    const result = { ...row };
    delete result.referenceTimestamp;
    return result;
  });
}

export function auditTrailRows(auditLogs, locationId, period, now = Date.now()) {
  return auditLogs.filter(log => log.locationId === locationId && withinPeriod(log.timestamp, period, now)).map(log => ({
    timestamp: dash(log.timestamp),
    user: dash(log.initiator || log.actor || log.user),
    module: dash(log.module),
    activity: dash(log.activity || log.action),
    location: dash(log.location),
    equipmentId: dash(log.equipmentId),
    result: dash(log.result || log.outcome),
  }));
}

export function buildReportRows({ type, locationId, period, now, devices = [], operations, auditLogs = [] }) {
  if (type === 'health') return equipmentHealthRows(devices, locationId);
  if (type === 'activation') return activationRows(operations, devices, locationId, period, now);
  if (type === 'audit') return auditTrailRows(auditLogs, locationId, period, now);
  return [];
}

export const reportColumns = type => REPORT_COLUMNS[type] || [];
export const reportType = type => REPORT_TYPES.find(item => item.id === type) || REPORT_TYPES[0];

export function reportFilename(type, location, period, format, generatedAt = Date.now()) {
  const prefix = { health: 'equipment-health', activation: 'smartlane-activation', audit: 'audit-trail' }[type] || 'smartlane-report';
  const locationSlug = String(location?.name || location?.id || 'location').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().replace(/-interchange$/, '');
  const date = new Date(generatedAt).toISOString().slice(0, 10);
  return `${prefix}_${locationSlug}_${period.toLowerCase()}_${date}.${format === 'Excel' ? 'xlsx' : 'pdf'}`;
}

export function createReportSnapshot({ type, period, format, location, actorId, now = Date.now(), devices, operations, auditLogs }) {
  const rows = buildReportRows({ type, locationId: location.id, period, now, devices, operations, auditLogs });
  return {
    type, title: reportType(type).title, period, format,
    locationId: location.id, location: location.name, direction: location.direction,
    generatedBy: actorId || 'Unknown user', generatedAt: new Date(now).toISOString(),
    totalRecords: rows.length, snapshotNotice: type === 'health' ? 'Frontend prototype snapshot' : null,
    columns: reportColumns(type), rows,
    filename: reportFilename(type, location, period, format, now),
  };
}
