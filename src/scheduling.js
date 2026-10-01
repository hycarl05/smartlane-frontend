// Prototype recurrence and precedence only; not an execution scheduler.
export const SCHEDULE_ZONE = 'Asia/Kuala_Lumpur';
export const REGIONS = [{ id: 'MY-01', name: 'Johor' }, { id: 'MY-07', name: 'Penang' },
  { id: 'MY-10', name: 'Selangor' }, { id: 'MY-05', name: 'Negeri Sembilan' }];
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const CATEGORIES = ['Public Holiday', 'Special Exception Day', 'Recurring Exception'];
const DAY = 86400000;
export const dateKey = ms => new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
export const atTime = (date, time) => Date.parse(`${date}T${time}:00+08:00`);
export const displayTime = ms => new Date(ms).toLocaleString('en-GB', { timeZone: SCHEDULE_ZONE });
export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
export const weekday = date => DAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
export function monthDates(month) {
  const [year, m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}
export function createScheduleStore(locations) {
  return { schedules: [], exceptions: [], regions: Object.fromEntries(locations.map(l => [l.id, ''])),
    sequence: 0, attempts: {}, feedback: null };
}
export function occursOn(rule, date) {
  const recurrence = rule.recurrence || rule.type;
  if (recurrence === 'weekly') return (rule.days || []).includes(weekday(date));
  if (recurrence === 'annual') return rule.date?.slice(5) === date.slice(5);
  return rule.date === date;
}
export function appliesTo(rule, locationId, store) {
  return rule.scope === 'location' ? rule.scopeId === locationId :
    rule.scope === 'state' && !!store.regions[locationId] && rule.scopeId === store.regions[locationId];
}
const timeValid = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '');
const dateValid = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
const overlaps = (a, b) => a.startTime < b.endTime && b.startTime < a.endTime;
function rulesShareDate(a, b) {
  const ar = a.recurrence || a.type, br = b.recurrence || b.type;
  if (!['weekly', 'annual'].includes(ar)) return occursOn(b, a.date);
  if (!['weekly', 'annual'].includes(br)) return occursOn(a, b.date);
  if (ar === 'weekly' && br === 'weekly') return a.days.some(d => b.days.includes(d));
  if (ar === 'annual' && br === 'annual') return a.date.slice(5) === b.date.slice(5);
  return true; // A fixed annual date eventually intersects any nonempty weekday set.
}
export function validateRule(rule, kind, store, now, locationIds) {
  const errors = [];
  const exception = kind === 'exceptions';
  if (!rule.name?.trim()) errors.push('Name is required.');
  if (typeof rule.enabled !== 'boolean') errors.push('Enabled must be true or false.');
  if (exception) {
    if (!CATEGORIES.includes(rule.category)) errors.push('Select an exception category.');
    if (!rule.reason?.trim()) errors.push('Reason is required.');
    if (!['suppress', 'override'].includes(rule.action)) errors.push('Select suppress or override.');
    if (!['location', 'state'].includes(rule.scope) || !(rule.scope === 'location' ? locationIds : REGIONS.map(r => r.id)).includes(rule.scopeId)) errors.push('Select a valid location or state scope.');
    if (!['once', 'weekly', 'annual'].includes(rule.recurrence)) errors.push('Select once, weekly or annual recurrence.');
  } else {
    if (!locationIds.includes(rule.locationId)) errors.push('Select a valid location.');
    if (!['once', 'weekly'].includes(rule.type)) errors.push('Select one-time or weekly.');
  }
  const recurrence = exception ? rule.recurrence : rule.type;
  if (recurrence === 'weekly' && (!rule.days?.length || rule.days.some(d => !DAYS.includes(d)))) errors.push('Select at least one valid weekday.');
  if (recurrence !== 'weekly' && !dateValid(rule.date)) errors.push('A valid date is required.');
  if (!exception || rule.action === 'override') {
    if (!timeValid(rule.startTime) || !timeValid(rule.endTime)) errors.push('Start and end times are required (HH:mm).');
    else if (rule.startTime >= rule.endTime) errors.push('End must follow start on the same day. Overnight rules are not supported in this demo.');
  }
  if (recurrence === 'once' && dateValid(rule.date)) {
    if (!exception && atTime(rule.date, rule.startTime) <= now) errors.push('One-time start must be in the future of the demo clock.');
    if (exception && rule.date < dateKey(now)) errors.push('One-time exception date cannot be in the past.');
  }
  if (!errors.length && rule.enabled) {
    for (const other of store[kind].filter(r => r.id !== rule.id && r.enabled)) {
      const sameScope = exception ? rule.scope === other.scope && rule.scopeId === other.scopeId : rule.locationId === other.locationId;
      if (sameScope && rulesShareDate(rule, other) && (exception || overlaps(rule, other))) errors.push(`Conflict with ${other.name} (${other.id}). Resolve overlapping rules in this scope.`);
    }
  }
  return errors;
}

export function occurrences(store, locationId, from, through, now) {
  const result = [];
  for (let date = from; date <= through; date = addDays(date, 1)) {
    const rules = store.exceptions.filter(r => r.enabled && appliesTo(r, locationId, store) && occursOn(r, date));
    const local = rules.filter(r => r.scope === 'location');
    const effective = local.length ? local : rules;
    const originals = store.schedules.filter(s => s.locationId === locationId && s.enabled && occursOn(s, date));
    for (const schedule of originals) {
      const exception = effective.length === 1 ? effective[0] : null;
      const outcome = effective.length > 1 ? 'Conflicting' : exception?.action === 'suppress' ? 'Suppressed' : exception ? 'Overridden' : 'Normal';
      const times = outcome === 'Overridden' ? exception : schedule;
      const start = atTime(date, times.startTime), end = atTime(date, times.endTime);
      result.push({ id: `${schedule.id}@${date}`, scheduleId: schedule.id, name: schedule.name, locationId, date,
        originalStart: atTime(date, schedule.startTime), originalEnd: atTime(date, schedule.endTime), start, end,
        exceptionIds: effective.map(r => r.id), ignoredExceptionIds: rules.filter(r => !effective.includes(r)).map(r => r.id), outcome,
        explanation: effective.length > 1 ? 'Multiple exceptions at the same priority; no outcome chosen.' : exception ? `${exception.name} (${exception.id}), ${exception.scope} scope` : 'Original schedule',
        status: end <= now ? 'Elapsed — execution unverified' : start <= now ? 'In planned window — not automatically executed' : 'Upcoming' });
    }
  }
  for (const a of result) for (const b of result) {
    if (a.id !== b.id && a.date === b.date && a.outcome !== 'Suppressed' && b.outcome !== 'Suppressed' && a.start < b.end && b.start < a.end) {
      a.outcome = 'Conflicting'; a.explanation = `Effective times overlap ${b.scheduleId}; resolve rules before simulation.`;
    }
  }
  return result.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
}
export function nextSchedule(store, locationId, now) {
  const today = dateKey(now);
  // Weekly recurrence plus annual exceptions: bounded, disclosed 366-day preview.
  const rows = occurrences(store, locationId, today, addDays(today, 366), now);
  return { next: rows.find(o => o.start > now && ['Normal', 'Overridden'].includes(o.outcome)) || null,
    affected: rows.find(o => o.end > now && ['Suppressed', 'Conflicting'].includes(o.outcome)) || null };
}
export function simulationEligibility(store, occurrence, op, now) {
  if (!occurrence || !['Normal', 'Overridden'].includes(occurrence.outcome)) return 'Occurrence is suppressed, conflicting or unavailable.';
  if (occurrence.end <= now) return 'This occurrence has elapsed; execution is unverified.';
  if (store.attempts[occurrence.id]) return 'This occurrence already has a simulation request; retries are disabled in this demo.';
  if (!op || ![0, 5].includes(op.phase) || op.pendingDecision) return 'Location must be in standby/Post Activation with no pending decision.';
  return '';
}
export function changeSchedules(store, action, now, locationIds) {
  const feedback = (errors, message) => ({ ...store, feedback: { token: action.token, errors, message } });
  if (action.type === 'SCHEDULE_REGION') {
    if (!locationIds.includes(action.locationId) || !REGIONS.some(r => r.id === action.regionId)) return feedback(['Invalid demo state assignment.'], '');
    return { ...store, regions: { ...store.regions, [action.locationId]: action.regionId }, feedback: { message: 'Demo state assignment saved; effective rules recalculated.', errors: [] } };
  }
  const kind = action.kind;
  if (!['schedules', 'exceptions'].includes(kind)) return store;
  if (action.type === 'SCHEDULE_DELETE') {
    const record = store[kind].find(r => r.id === action.id);
    if (!record || (kind === 'schedules' ? record.locationId !== action.locationId : !appliesTo(record, action.locationId, store))) return feedback(['Record is outside the selected location/state.'], '');
    return { ...store, [kind]: store[kind].filter(r => r.id !== action.id), feedback: { token: action.token, message: `Deleted mock record ${action.id}.`, errors: [] } };
  }
  const incoming = action.type === 'SCHEDULE_IMPORT' ? action.records : [action.record];
  let updated = { ...store, [kind]: [...store[kind]] };
  for (const record of incoming || []) {
    const old = record.id && store[kind].find(r => r.id === record.id);
    if ((record.id && !old) || (old && (kind === 'schedules' ? old.locationId !== action.locationId : !appliesTo(old, action.locationId, store)))) return feedback(['Record ID/scope is invalid.'], '');
    if (kind === 'schedules' && record.locationId !== action.locationId) return feedback(['Schedule belongs to a different location.'], '');
    if (kind === 'exceptions' && !appliesTo(record, action.locationId, store)) return feedback(['Exception must apply to the selected location or its assigned state.'], '');
    const errors = validateRule(record, kind, updated, now, locationIds);
    if (errors.length) return feedback(errors, '');
    const id = record.id || `${kind === 'schedules' ? 'SCH' : 'EXC'}-${++updated.sequence}`;
    updated[kind] = [...updated[kind].filter(r => r.id !== id), { ...record, id }];
  }
  return { ...updated, feedback: { token: action.token, errors: [], message: 'Mock records saved. No operation was executed.' } };
}

// RFC4180-style quoted fields, commas and newlines; Excel binaries intentionally unsupported.
export function parseCsv(text) {
  const rows = []; let row = [], value = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(value); value = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ''; }
    else value += c;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field.');
  row.push(value); if (row.some(Boolean)) rows.push(row);
  return rows;
}
export const CSV_HEADER = 'name,category,scope,scopeId,recurrence,date,days,action,startTime,endTime,reason,enabled';
export function previewImport(text, store, now, locationIds, selectedLocation) {
  const [headers, ...rows] = parseCsv(text.replace(/^\uFEFF/, ''));
  if (!headers || headers.join(',') !== CSV_HEADER) throw new Error(`Expected header: ${CSV_HEADER}`);
  let staged = { ...store, exceptions: [...store.exceptions] };
  return rows.map((cells, index) => {
    const raw = Object.fromEntries(headers.map((h, i) => [h, cells[i] || '']));
    const record = { ...raw, days: raw.days.split('|').filter(Boolean), enabled: raw.enabled === 'true' ? true : raw.enabled === 'false' ? false : null };
    const duplicate = staged.exceptions.some(r => r.name === record.name && r.scope === record.scope && r.scopeId === record.scopeId && r.date === record.date && r.recurrence === record.recurrence && [...r.days].sort().join() === [...record.days].sort().join());
    const errors = validateRule(record, 'exceptions', staged, now, locationIds);
    if (cells.length !== headers.length) errors.push('Column count does not match the header.');
    if (!appliesTo(record, selectedLocation, store)) errors.push('Row is outside this location / assigned state.');
    if (duplicate) errors.push('Duplicate row or existing exception.');
    if (!errors.length) staged.exceptions.push({ ...record, id: `preview-${index}` });
    return { row: index + 2, record, errors };
  });
}
