import { ROLE_DESCRIPTIONS, capabilities } from './access.js';

export const MOCK_DIRECTORY = [
  { id: 'DIR-FICTION-01', username: 'demo.avery', name: 'Avery Example', department: 'Fictional Operations' },
  { id: 'DIR-FICTION-02', username: 'demo.blair', name: 'Blair Example', department: 'Fictional Management' },
  { id: 'DIR-FICTION-03', username: 'demo.casey', name: 'Casey Example', department: 'Fictional Overview' },
];
export const previewAdministrator = locationIds => ({ id: 'PREVIEW-ADMIN', name: 'Preview administrator (demo tool)', role: 'System Administrator', active: true, locationIds });
export const defaultConfig = device => ({ id: device.id, name: device.name, description: device.description,
  locationId: device.locationId, type: device.type, model: '', ip: '', latitude: '', longitude: '',
  enabled: true, credentialsConfigured: false, parameterNotes: '', pollingIntervalSeconds: '' });
export function initialAdministration(locations) {
  const ids = locations.map(l => l.id);
  return { configs: {}, groups: [], sequence: 0, events: [], feedback: null, users: [
    { id: 'DEMO-ADMIN', name: 'Demo Administrator', username: 'demo.admin', role: 'System Administrator', active: true, locationIds: ids, directoryId: null },
    { id: 'DEMO-OPERATOR', name: 'Demo Operator', username: 'demo.operator', role: 'Operation', active: true, locationIds: ids.slice(0, 2), directoryId: null },
    { id: 'DEMO-OVERVIEW', name: 'Demo Observer', username: 'demo.observer', role: 'Overview', active: true, locationIds: ids.slice(0, 1), directoryId: null },
    { id: 'DEMO-MANAGEMENT', name: 'Demo Management', username: 'demo.management', role: 'Management', active: true, locationIds: ids, directoryId: null },
    { id: 'DEMO-NO-LOCATION', name: 'Demo No Location Access', username: 'demo.empty', role: 'Overview', active: true, locationIds: [], directoryId: null },
  ] };
}
export function validIp(value) {
  // IPv4 demo restriction, explicitly labelled in the editor.
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(value) && value.split('.').every(n => Number(n) <= 255 && String(Number(n)) === n);
}
export function validateConfig(record, devices, configs) {
  const errors = [], device = devices.find(d => d.id === record.id);
  if (!device) return ['Device no longer exists in the monitoring inventory.'];
  if (record.locationId !== device.locationId || record.type !== device.type) errors.push('Location/type changes are blocked to preserve stable IDs and linked LCS/I/O, groups and operation targets.');
  if (!record.name?.trim() || !record.description?.trim() || !record.model?.trim()) errors.push('Name, description and model are required.');
  if (!validIp(record.ip || '')) errors.push('Enter a valid IPv4 address (four decimal octets, no leading zeros).');
  for (const [key, min, max] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
    if (record[key] == null || String(record[key]).trim() === '' || !Number.isFinite(Number(record[key])) || Number(record[key]) < min || Number(record[key]) > max) errors.push(`${key} must be between ${min} and ${max}.`);
  }
  if (typeof record.enabled !== 'boolean') errors.push('Configuration-enabled state is required.');
  if (device.type === 'AVDS' && record.pollingIntervalSeconds != null && record.pollingIntervalSeconds !== '' && (!Number.isInteger(Number(record.pollingIntervalSeconds)) || Number(record.pollingIntervalSeconds) < 1 || Number(record.pollingIntervalSeconds) > 3600)) errors.push('Proposed AVDS polling interval must be a whole number from 1 to 3600 seconds, or blank (not configured).');
  if (Object.values(configs).some(c => c.id !== record.id && c.locationId === record.locationId && c.ip === record.ip)) errors.push('This IP is assigned to another device at this location.');
  if (Object.values(configs).some(c => c.id !== record.id && c.locationId === record.locationId && c.name.trim().toLowerCase() === record.name?.trim().toLowerCase())) errors.push('Device configuration name must be unique within this location.');
  return errors;
}
export function validateGroup(record, devices, groups, locationIds) {
  if (!Array.isArray(record.deviceIds)) return ['Select member devices.'];
  const errors = [];
  if (!record.name?.trim() || !record.description?.trim()) errors.push('Group name and description are required.');
  if (!locationIds.includes(record.locationId)) errors.push('Select a valid location.');
  if (!record.deviceIds?.length) errors.push('Select at least one device.');
  if (new Set(record.deviceIds).size !== record.deviceIds.length) errors.push('Duplicate members are not allowed.');
  if (record.deviceIds.some(id => !devices.some(d => d.id === id && d.locationId === record.locationId))) errors.push('Every member must exist at the same location.');
  if (groups.some(g => g.id !== record.id && g.locationId === record.locationId && g.name.toLowerCase() === record.name?.trim().toLowerCase())) errors.push('Group name already exists at this location.');
  return errors;
}
export function validateUser(record, users, locationIds) {
  if (!Array.isArray(record.locationIds)) return ['Provide explicit location assignments (an empty list is allowed).'];
  const errors = [];
  if (!record.name?.trim() || !/^[a-z0-9][a-z0-9._@-]*$/i.test(record.username || '')) errors.push('Name and a valid username/directory identity are required.');
  if (!Object.hasOwn(ROLE_DESCRIPTIONS, record.role)) errors.push('Select a URS role.');
  if (typeof record.active !== 'boolean') errors.push('Select an active/inactive state.');
  if (record.locationIds.some(id => !locationIds.includes(id)) || new Set(record.locationIds).size !== record.locationIds.length) errors.push('Location assignments must be valid and unique.');
  if (users.some(u => u.id !== record.id && u.username.toLowerCase() === record.username?.trim().toLowerCase())) errors.push('Username is already associated, including inactive users.');
  if (record.directoryId) {
    const identity = MOCK_DIRECTORY.find(d => d.id === record.directoryId);
    if (!identity || identity.username !== record.username) errors.push('Select a valid sample directory identity; its username cannot be changed.');
    if (users.some(u => u.id !== record.id && u.directoryId === record.directoryId)) errors.push('Directory identity is already associated, including inactive users.');
  }
  return errors;
}
export function applyConfiguration(devices, configs) {
  return devices.map(device => {
    const config = configs[device.id];
    return config ? { ...device, name: config.name, description: config.description, configuration: config } : { ...device, configuration: defaultConfig(device) };
  }).map(device => device.associatedLcsId ? { ...device, associatedLcsName: configs[device.associatedLcsId]?.name || device.associatedLcsName } : device);
}
// Explicit allowlists: credentials and arbitrary input never enter saved state or audit.
const pick = (object, keys) => Object.fromEntries(keys.map(key => [key, object[key]]));
export function adminReducer(state, action) {
  const { devices = [], locationIds = [] } = action;
  const actor = action.actorId === 'PREVIEW-ADMIN' ? previewAdministrator(locationIds) : state.users.find(u => u.id === action.actorId);
  const fail = errors => ({ ...state, feedback: { token: action.token, errors, message: '' } });
  if (!capabilities(actor, action.locationId).configure) return fail(['Demo access changed or this action is unavailable. Reopen under an allowed persona.']);
  let record, errors = [], actionLabel, reference, locationId = action.locationId, next = { ...state };
  if (action.type === 'CONFIG_SAVE') {
    record = pick(action.record, ['id', 'name', 'description', 'locationId', 'type', 'model', 'ip', 'latitude', 'longitude', 'enabled', 'parameterNotes', 'pollingIntervalSeconds']);
    if (record.locationId !== action.locationId) return fail(['Location context changed.']);
    errors = validateConfig(record, devices, state.configs);
    record.credentialsConfigured = state.configs[record.id]?.credentialsConfigured || false;
    if (!errors.length) next.configs = { ...state.configs, [record.id]: record };
    actionLabel = 'Equipment configuration saved'; reference = record.id;
  } else if (action.type === 'CONFIG_IMPORT') {
    if (!Array.isArray(action.records) || !action.records.length) return fail(['Import contains no records.']);
    const staged = { ...state.configs }, prepared = [];
    for (const raw of action.records) {
      const importKeys = ['id','name','description','model','ip','latitude','longitude','enabled','parameterNotes','pollingIntervalSeconds'];
      const unknown = Object.keys(raw || {}).filter(key => !importKeys.includes(key));
      if (unknown.length) { errors.push(`${raw?.id || 'Unknown device'} contains unsupported fields: ${unknown.join(', ')}.`); continue; }
      const device = devices.find(d => d.id === raw.id && d.locationId === action.locationId);
      if (!device) errors.push(`${raw.id || 'Unknown device'} is unavailable at this location.`);
      else {
        const base = state.configs[raw.id] || defaultConfig(device);
        const candidate = pick({ ...base, ...raw, locationId: device.locationId, type: device.type }, ['id','name','description','locationId','type','model','ip','latitude','longitude','enabled','parameterNotes','pollingIntervalSeconds']);
        const rowErrors = validateConfig(candidate, devices, staged);
        if (rowErrors.length) errors.push(`${candidate.id}: ${rowErrors.join(' ')}`);
        else { candidate.credentialsConfigured = base.credentialsConfigured; staged[candidate.id] = candidate; prepared.push(candidate); }
      }
    }
    if (!errors.length) next.configs = staged;
    record = prepared; actionLabel = 'Equipment configuration import applied atomically'; reference = `${prepared.length} equipment records`;
  } else if (action.type === 'CREDENTIAL_STATE') {
    const device = devices.find(d => d.id === action.id && d.locationId === action.locationId);
    if (!device || !['configure', 'clear'].includes(action.decision)) return fail(['Invalid device or credential decision.']);
    record = { ...(state.configs[action.id] || defaultConfig(device)), credentialsConfigured: action.decision === 'configure' };
    next.configs = { ...state.configs, [action.id]: record };
    actionLabel = action.decision === 'configure' ? 'Dummy credentials marked configured (entry discarded)' : 'Dummy credentials cleared'; reference = action.id;
  } else if (action.type === 'GROUP_SAVE') {
    record = pick(action.record, ['id', 'name', 'description', 'locationId', 'deviceIds']);
    if (record.locationId !== action.locationId || (record.id && !state.groups.some(g => g.id === record.id && g.locationId === record.locationId))) return fail(['Group location/identity changed.']);
    errors = validateGroup(record, devices, state.groups, locationIds);
    if (!errors.length) { record.id ||= `DEMO-GROUP-${state.sequence + 1}`; next.groups = [...state.groups.filter(g => g.id !== record.id), record]; }
    actionLabel = 'Equipment group metadata/membership saved; operation targets unchanged'; reference = record.id;
  } else if (action.type === 'GROUP_DELETE') {
    const group = state.groups.find(g => g.id === action.id && g.locationId === action.locationId);
    if (!group) return fail(['Group is outside the current location.']);
    next.groups = state.groups.filter(g => g.id !== action.id);
    actionLabel = 'Equipment group deleted; devices and operation targets unchanged'; reference = action.id;
  } else if (action.type === 'USER_SAVE') {
    record = pick(action.record, ['id', 'name', 'username', 'role', 'active', 'locationIds', 'directoryId']);
    if (record.id && !state.users.some(u => u.id === record.id)) return fail(['User identity no longer exists.']);
    errors = validateUser(record, state.users, locationIds);
    if (!errors.length) { record.id ||= `DEMO-USER-${state.sequence + 1}`; next.users = [...state.users.filter(u => u.id !== record.id), record]; }
    actionLabel = 'User profile, role/location access and association saved'; reference = record.id; locationId = null;
  } else if (action.type === 'USER_ACTIVE') {
    const target = state.users.find(u => u.id === action.id);
    if (!target || typeof action.active !== 'boolean') return fail(['Invalid user/state.']);
    next.users = state.users.map(u => u.id === action.id ? { ...u, active: action.active } : u);
    actionLabel = action.active ? 'User reactivated' : 'User deactivated; historical references retained'; reference = action.id; locationId = null;
  } else return state;
  if (errors.length) return fail(errors);
  const sequence = state.sequence + 1;
  const event = { id: `ADMIN-EVT-${sequence}`, timestamp: new Date(action.now).toISOString(),
    actor: `Demo persona ${actor.id}`, actorId: actor.id, locationId, reference,
    action: actionLabel, decision: 'Confirmed', outcome: 'Simulated',
    summary: action.type === 'CONFIG_IMPORT' ? `Imported IDs: ${record.map(r => r.id).join(', ')}; credentials and telemetry excluded; health/connectivity unchanged.` :
      action.type === 'CONFIG_SAVE' ? `Configuration enabled: ${record.enabled}; health/connectivity unchanged.` :
      action.type === 'GROUP_SAVE' ? `Members: ${record.deviceIds.join(', ')}` :
      action.type === 'USER_SAVE' ? `Role: ${record.role}; active: ${record.active}; locations: ${record.locationIds.join(', ') || 'none'}; directory associated: ${!!record.directoryId}` : 'Mock metadata only; no external request.' };
  return { ...next, sequence, events: [event, ...state.events], feedback: { token: action.token, errors: [], message: `${actionLabel}. Simulated save only.` } };
}
export function adminAudit(events, locations) {
  return events.map(e => ({ ...e, module: 'Administration', initiator: e.actor, initiatorRole: 'Demo persona',
    location: locations.find(l => l.id === e.locationId)?.name || 'Global / User Administration',
    equipmentId: e.reference, result: 'Simulated', activity: `${e.action}. ${e.summary}`, operationId: null }));
}
