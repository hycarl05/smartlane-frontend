import { INITIAL_LOCATIONS } from './data.js';

// Monitoring-only adapter. Existing prototype placements are not approved inventory.
export const EQUIPMENT_TYPES = ['CCTV', 'VMS', 'Mini VMS', 'AVDS', 'LCS', 'LCS I/O Module'];
export const HEALTH_STATES = ['Good', 'Warning', 'Degraded', 'Offline'];
export const STATUS_STYLE = {
  Good: { tone: 'good', icon: '●' }, Warning: { tone: 'warn', icon: '!' },
  Degraded: { tone: 'warn', icon: '△' }, Offline: { tone: 'bad', icon: '×' },
  Unknown: { tone: 'unknown', icon: '?' },
};
export const MOCK_OBSERVED_AT = new Date().toISOString();
export const STALE_AFTER_MS = 15 * 60 * 1000;

export function deviceId(locationId, type, item) {
  return `${locationId}:${type}:${item.deviceId || item.id || item.km}`;
}

// Explicit observations for the original demo inventory only. Newly added devices
// without observations remain Unknown rather than inheriting a healthy default.
const DEMO_OBSERVATIONS = new Map(INITIAL_LOCATIONS.flatMap(loc => [
  ...(loc.lcs || []).flatMap(sign => {
    const id = deviceId(loc.id, 'LCS', sign);
    return [[id, 'Good'], [deviceId(loc.id, 'LCS I/O Module', { id: `io-${id}` }), 'Good']];
  }),
  ...(loc.traffic || []).map(sensor => [deviceId(loc.id, 'AVDS', sensor),
    loc.id === 'pms' && sensor.km === 'KM7.5NB' ? 'Degraded' : 'Good']),
]));

export function normalizeStatus(value = {}) {
  const legacy = String(value.status ?? '').toLowerCase();
  const raw = ['fault', 'offline', 'off'].includes(legacy) ? legacy : String(value.health ?? value.status ?? '').toLowerCase();
  const health = ({ ok: 'Good', good: 'Good', warning: 'Warning', degraded: 'Degraded',
    fault: 'Offline', offline: 'Offline', off: 'Offline' })[raw] || 'Unknown';
  const explicit = ['Active', 'Inactive'].includes(value.connectivity) ? value.connectivity : null;
  // Fault/offline must never inherit a healthy style or active connection.
  const connectivity = health === 'Offline' ? 'Inactive' : explicit || (health === 'Unknown' ? 'Unknown' : 'Active');
  return { health, connectivity };
}

export function isStale(device, now = Date.now()) {
  const timestamp = Date.parse(device.updatedAt);
  return !Number.isFinite(timestamp) || now - timestamp > STALE_AFTER_MS;
}

export function formatTimestamp(value) {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('en-GB') : 'Not available';
}

export function buildEquipment(locations) {
  return locations.flatMap(loc => {
    const records = new Map();
    const add = (type, item, extra = {}) => {
      const id = deviceId(loc.id, type, item);
      const hasObservation = ['status', 'health', 'connectivity'].some(key => Object.hasOwn(item, key));
      const status = normalizeStatus(hasObservation ? item : { status: DEMO_OBSERVATIONS.get(id) });
      records.set(id, {
        id, locationId: loc.id, location: loc.name, type, km: item.km,
        name: `${type} ${item.km || item.id}`, description: `${type} monitoring at ${item.km || 'demo station'}`,
        ...status, updatedAt: Object.hasOwn(item, 'updatedAt') ? item.updatedAt : MOCK_OBSERVED_AT,
        explanation: status.health === 'Offline' ? 'Mock communication fault: device unavailable.' :
          status.health === 'Unknown' ? 'No health observation supplied.' :
          status.health === 'Good' ? 'Mock observation: no equipment fault reported.' : 'Mock observation: inspection recommended.',
        illustrative: true, commandSimulation: !!loc.operation, ...extra,
      });
    };
    (loc.gantries || []).filter(g => g.type === 'CCTV').forEach(g => add('CCTV', g));
    (loc.cctv || []).forEach(km => {
      const item = { km };
      if (!records.has(deviceId(loc.id, 'CCTV', item))) add('CCTV', item);
    });
    for (const [field, type] of [['vms', 'VMS'], ['miniVms', 'Mini VMS']]) {
      (loc[field] || []).forEach(sign => add(type, sign, { sign, phase: loc.operation?.intervention ? -1 : loc.phase || 0 }));
    }
    (loc.lcs || []).forEach(sign => {
      const id = deviceId(loc.id, 'LCS', sign);
      add('LCS', sign, { indication: loc.operation?.intervention ? 'Awaiting approved policy' : sign.open ? 'Green Arrow' : 'Red X',
        observedIndication: Object.hasOwn(sign, 'observedOpen') ? (sign.observedOpen ? 'Green Arrow' : 'Red X') : null });
      add('LCS I/O Module', { id: `io-${id}`, km: sign.km }, {
        associatedLcsId: id, associatedLcsName: `LCS ${sign.km}`,
        channels: [{ name: 'Output 1 · Red X', state: loc.operation?.intervention ? 'Unconfirmed' : sign.open ? 'Off' : 'On' },
          { name: 'Output 2 · Green Arrow', state: loc.operation?.intervention ? 'Unconfirmed' : sign.open ? 'On' : 'Off' }],
        description: 'Illustrative I/O association and channels — not approved wiring',
      });
    });
    (loc.traffic || []).forEach(sensor => add('AVDS', sensor, {
      speed: sensor.spd, volume: sensor.vol, occupancy: sensor.occ,
      observedAt: Object.hasOwn(sensor, 'updatedAt') ? sensor.updatedAt : MOCK_OBSERVED_AT,
      description: 'Illustrative radar observation · volume per demo 5-minute interval',
    }));
    return [...records.values()].map(record => ({ ...record, history: [
      { at: record.updatedAt, health: record.health, connectivity: record.connectivity, note: record.explanation },
      { at: Number.isFinite(Date.parse(record.updatedAt)) ? new Date(Date.parse(record.updatedAt) - 300000).toISOString() : null, health: record.health,
        connectivity: record.connectivity, note: 'Illustrative earlier observation; not recorded telemetry.' },
    ] }));
  });
}

export function summarizeEquipment(records) {
  const counts = { total: records.length, Good: 0, Warning: 0, Degraded: 0, Offline: 0, Unknown: 0, stale: 0 };
  records.forEach(d => { counts[d.health]++; if (isStale(d)) counts.stale++; });
  return counts;
}

export function equipmentAlarms(records) {
  return records.filter(d => ['Warning', 'Degraded', 'Offline'].includes(d.health)).map(d => ({
    id: `alarm:${d.id}`, deviceId: d.id, device: d.name, locationId: d.locationId, location: d.location,
    issue: d.explanation, severity: d.health === 'Offline' ? 'Major' : 'Warning', raisedAt: d.updatedAt,
  }));
}

export const EMPTY_FILTERS = { location: 'all', type: 'all', health: 'all', connectivity: 'all', search: '', from: '', to: '' };
export function queryEquipment(records, filters, sort = { field: 'name', direction: 'asc' }) {
  const term = filters.search.trim().toLowerCase();
  return records.filter(d =>
    (filters.location === 'all' || d.locationId === filters.location) &&
    (filters.type === 'all' || d.type === filters.type) &&
    (filters.health === 'all' || d.health === filters.health) &&
    (filters.connectivity === 'all' || d.connectivity === filters.connectivity) &&
    (!term || [d.id, d.name, d.description, d.location, d.type].join(' ').toLowerCase().includes(term)) &&
    (!filters.from || Date.parse(d.updatedAt) >= Date.parse(filters.from)) &&
    (!filters.to || Date.parse(d.updatedAt) <= Date.parse(filters.to))
  ).sort((a, b) => {
    const comparison = sort.field === 'updatedAt' ? Date.parse(a.updatedAt) - Date.parse(b.updatedAt) :
      String(a[sort.field]).localeCompare(String(b[sort.field]), undefined, { numeric: true });
    return (comparison || a.id.localeCompare(b.id)) * (sort.direction === 'asc' ? 1 : -1);
  });
}

export function monitoringScenario(records, scenario) {
  if (scenario === 'empty') return [];
  if (scenario === 'stale') return records.map(d => {
    const earlier = value => Number.isFinite(Date.parse(value)) ? new Date(Date.parse(value) - 3600000).toISOString() : null;
    const updatedAt = earlier(d.updatedAt);
    return { ...d, updatedAt, observedAt: d.observedAt ? updatedAt : undefined,
      history: d.history.map(h => ({ ...h, at: earlier(h.at) })) };
  });
  return records;
}
