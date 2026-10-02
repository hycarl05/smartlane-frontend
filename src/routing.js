export const LOCATION_NAVIGATION = [
  { key: 'overview', label: 'Overview', path: 'overview', permission: 'overview' },
  { key: 'schedule', label: 'Schedule', path: 'schedule', permission: 'schedule' },
  { key: 'exceptions', label: 'Holidays & Exceptions', path: 'holidays-exceptions', permission: 'exceptions' },
  { key: 'log', label: 'Alarms & Audit', path: 'alarms-audit', permission: 'log' },
  { key: 'users', label: 'User Management', path: 'user-management', permission: 'users' },
  { key: 'equipment', label: 'Equipment Status', path: 'equipment-status', permission: 'equipment' },
  { key: 'reports', label: 'Reports', path: 'reports', permission: 'reports' },
  { key: 'analytics', label: 'AVDS Analytics', path: 'avds-analytics', permission: 'analytics' },
  { key: 'health', label: 'System Health', path: 'system-health', permission: 'health' },
  { key: 'settings', label: 'Equipment Configuration', path: 'equipment-configuration', permission: 'settings' },
  { key: 'designer', label: 'Road Studio', path: 'road-studio', permission: 'designer' },
  { key: 'vms', label: 'VMS Editor', path: 'vms-editor', permission: 'vms' },
  { key: 'map', label: 'GIS Map', path: 'gis-map', permission: 'map' },
  { key: 'schematic', label: 'Equipment Schematic', path: 'equipment-schematic', permission: 'map' },
];

export const navigationForKey = key => LOCATION_NAVIGATION.find(item => item.key === key) || LOCATION_NAVIGATION[0];
export const navigationForPath = path => LOCATION_NAVIGATION.find(item => item.path === path) || null;
export const shouldShowOperationControls = tab => tab === 'overview';
export const locationPath = (locationId, key = 'overview') => `/locations/${encodeURIComponent(locationId)}/${navigationForKey(key).path}`;

export function resolveRoute(pathname, locationIds = []) {
  if (pathname === '/') return { kind: 'redirect', to: '/locations' };
  if (pathname === '/locations' || pathname === '/locations/') return { kind: 'locations' };
  const match = pathname.match(/^\/locations\/([^/]+)(?:\/([^/]+))?\/?$/);
  if (!match) return { kind: 'not-found' };
  const locationId = decodeURIComponent(match[1]);
  if (!locationIds.includes(locationId)) return { kind: 'location-not-found', locationId };
  if (!match[2]) return { kind: 'redirect', to: locationPath(locationId) };
  const navigation = navigationForPath(match[2]);
  return navigation ? { kind: 'location', locationId, navigation } : { kind: 'not-found' };
}
