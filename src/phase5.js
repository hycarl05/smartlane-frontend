export const INITIAL_PHASE5 = { maintenance: [], archiveJobs: [], events: [], sequence: 0, feedback: null };
const copy = value => JSON.parse(JSON.stringify(value));
const event = (state, action, activity, reference, locationId, outcome = 'Simulated') => ({
  id: `P5-EVT-${state.sequence + 1}`, timestamp: new Date(action.now).toISOString(), actor: `Demo persona ${action.actorId}`,
  actorId: action.actorId, module: action.module || 'Phase 5', activity, reference, equipmentId: reference,
  locationId: locationId || null, result: outcome, outcome,
});

export function phase5Reducer(state, action) {
  if (action.type === 'MAINTENANCE_SAVE') {
    const r = action.record || {}, errors = [];
    if (!r.locationId || !r.assetId || !r.remarks?.trim() || !r.actions?.trim()) errors.push('Location, asset, remarks and actions are required.');
    if (!['Open', 'In progress', 'Completed'].includes(r.status)) errors.push('Select a valid completion status.');
    if (errors.length) return { ...state, feedback: errors.join(' ') };
    const id = r.id || `MNT-${state.sequence + 1}`, record = { ...copy(r), id, updatedAt: new Date(action.now).toISOString(), actorId: action.actorId };
    return { ...state, sequence: state.sequence + 1, maintenance: [record, ...state.maintenance.filter(x => x.id !== id)], events: [event(state, { ...action, module: 'Maintenance' }, `Maintenance record saved: ${record.status}`, record.assetId, record.locationId), ...state.events], feedback: `${id} saved in prototype state.` };
  }
  if (action.type === 'ARCHIVE_QUEUE') {
    if (!action.snapshot?.eligibleCount) return { ...state, feedback: 'No eligible records; no archive job was created.' };
    const fingerprint = JSON.stringify([action.snapshot.locationId, action.snapshot.category, action.snapshot.cutoff]);
    if (state.archiveJobs.some(j => j.fingerprint === fingerprint && !['Failed', 'Partial'].includes(j.status))) return { ...state, feedback: 'A matching archive job already exists.' };
    const id = `ARC-${state.sequence + 1}`, job = { id, fingerprint, status: 'Queued', createdAt: new Date(action.now).toISOString(), snapshot: copy(action.snapshot), destination: action.destination || 'External archive (not connected)' };
    return { ...state, sequence: state.sequence + 1, archiveJobs: [job, ...state.archiveJobs], events: [event(state, { ...action, module: 'Housekeeping' }, `Archive/offload queued for ${job.snapshot.eligibleCount} records`, id, job.snapshot.locationId), ...state.events], feedback: `${id} queued; no records were moved or deleted.` };
  }
  if (action.type === 'ARCHIVE_ADVANCE') {
    const found = state.archiveJobs.find(j => j.id === action.id); if (!found) return state;
    const status = found.status === 'Queued' ? 'Running' : found.status === 'Running' ? (action.outcome || 'Completed') : found.status;
    return { ...state, sequence: state.sequence + 1, archiveJobs: state.archiveJobs.map(j => j.id === action.id ? { ...j, status } : j), events: [event(state, { ...action, module: 'Housekeeping' }, `Archive/offload status changed to ${status}`, action.id, found.snapshot.locationId, status), ...state.events], feedback: `${action.id}: ${status}; simulation only.` };
  }
  return state;
}

export function aggregateAvds(points, intervalMinutes = 5) {
  const ms = intervalMinutes * 60000, groups = new Map();
  points.forEach(p => { const key = Math.floor(new Date(p.timestamp).getTime() / ms) * ms; const a = groups.get(key) || []; a.push(p); groups.set(key, a); });
  return [...groups].sort(([a], [b]) => a - b).map(([timestamp, rows]) => {
    const mean = key => { const values = rows.map(r => r[key]).filter(Number.isFinite); return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; };
    const volumes = rows.map(r => r.volume).filter(Number.isFinite);
    return { timestamp: new Date(timestamp).toISOString(), speed: mean('speed'), occupancy: mean('occupancy'), volume: volumes.length ? volumes.reduce((a, b) => a + b, 0) : null, observations: rows.length };
  });
}

export function sampleAvdsHistory(devices, now) {
  return devices.filter(d => d.type === 'AVDS').flatMap((d, di) => Array.from({ length: 25 }, (_, i) => ({
    deviceId: d.id, locationId: d.locationId, laneId: 'unassigned', laneLabel: 'Lane metadata not supplied',
    timestamp: new Date(now - (24 - i) * 5 * 60000).toISOString(),
    speed: i === 8 ? null : Math.max(18, 78 - ((i + di) % 9) * 5), volume: i === 8 ? null : 18 + ((i * 7 + di) % 31), occupancy: i === 8 ? null : 12 + ((i * 3 + di) % 48),
    provenance: 'Sample historical fixture',
  })));
}

export function archiveEligibility(records, category, now) {
  const retentionDays = category === 'CCTV' ? 30 : 730;
  if (category === 'Configuration') return { retentionDays: null, eligible: [], reason: 'Configuration is retained until an authorized update or removal.' };
  const cutoff = now - retentionDays * 86400000;
  return { retentionDays, cutoff: new Date(cutoff).toISOString(), eligible: records.filter(r => r.category === category && new Date(r.timestamp).getTime() <= cutoff), reason: '' };
}

export function auditInRange(log, from, to) {
  const time = new Date(String(log.timestamp).replace(' ', 'T')).getTime();
  const start = from ? new Date(from).getTime() : -Infinity, end = to ? new Date(to).getTime() : Infinity;
  return Number.isFinite(time) && time >= start && time <= end;
}

export function phase5Audit(events, locations) {
  return events.map(e => ({ ...e, initiator: e.actor, initiatorRole: 'Demo persona', location: locations.find(l => l.id === e.locationId)?.name || 'Global / System-Wide', activity: e.activity, equipmentId: e.reference, result: e.outcome }));
}
