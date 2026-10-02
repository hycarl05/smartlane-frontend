// URS_1.1.3 presentation preview only. This is not authorization enforcement.
export const ROLE_DESCRIPTIONS = {
  Overview: 'Dashboard and equipment status only.',
  Operation: 'Dashboard/status, operation controls and schedules/exceptions. VMS templates are read-only in this demo.',
  'System Administrator': 'Operations, schedules, equipment configuration, groups, users, reports and audit.',
  Management: 'Dashboard/status, reports and audit; no operational or configuration editing.',
};
export function capabilities(persona, locationId) {
  const available = !!persona?.active && Object.hasOwn(ROLE_DESCRIPTIONS, persona.role) && (!locationId || persona.locationIds.includes(locationId));
  const admin = available && persona.role === 'System Administrator';
  const operator = available && ['Operation', 'System Administrator'].includes(persona.role);
  return { read: available, operate: operator, schedule: operator, configure: admin,
    users: admin, vmsRead: operator, vmsEdit: admin, design: admin,
    reports: available && ['System Administrator', 'Management'].includes(persona.role),
    audit: available && ['System Administrator', 'Management'].includes(persona.role),
    analytics: available && ['Operation', 'System Administrator', 'Management'].includes(persona.role),
    maintenanceRead: available && ['System Administrator', 'Management'].includes(persona.role),
    maintenanceEdit: admin, housekeeping: admin };
}
export function moduleAllowed(persona, module, locationId) {
  const c = capabilities(persona, locationId);
  const required = { overview: 'read', corridor: 'read', equipment: 'read', map: 'read', schematic: 'read',
    schedule: 'schedule', exceptions: 'schedule', vms: 'vmsRead', settings: 'configure',
    groups: 'configure', users: 'users', reports: 'reports', log: 'audit', designer: 'design',
    analytics: 'analytics', maintenance: 'maintenanceRead', health: 'maintenanceRead', housekeeping: 'housekeeping' };
  return !!c[required[module]];
}
export function operationActionAllowed(persona, action, scheduleStore) {
  if (action.type === 'ADVANCE') return capabilities(persona).configure && persona.locationIds.length > 0;
  if (action.type.startsWith('SCHEDULE_') && action.type !== 'SCHEDULE_SIMULATE') {
    if (!capabilities(persona, action.locationId).schedule) return false;
    const records = action.records || (action.record ? [action.record] : action.id ? [scheduleStore?.exceptions.find(r => r.id === action.id)].filter(Boolean) : []);
    return records.every(r => r.scope !== 'state' || Object.entries(scheduleStore?.regions || {}).filter(([, state]) => state === r.scopeId).every(([id]) => capabilities(persona, id).schedule));
  }
  return capabilities(persona, action.locationId).operate;
}
export const accessKey = persona => JSON.stringify([persona?.id, persona?.role, persona?.active, persona?.locationIds]);
