import { getDynamicVmsMessage } from './vmsMessages.js';
import { placementForDevice } from './phase6.js';

export const vmsDevicesForLocation = (devices, locationId, module) => devices.filter(device => device.locationId === locationId && device.type === module);

export function preferredVmsModule(devices, locationId, requested = 'VMS') {
  if (vmsDevicesForLocation(devices, locationId, requested).length) return requested;
  const alternative = requested === 'VMS' ? 'Mini VMS' : 'VMS';
  return vmsDevicesForLocation(devices, locationId, alternative).length ? alternative : requested;
}

export function normalizedVmsRole(device) {
  const role = placementForDevice(device).role;
  return ({ Start: 'Start/entry', Entry: 'Start/entry', Mid: 'Intermediate', End: 'Final/exit', Exit: 'Final/exit' })[role] || (role === 'Unresolved' ? 'Start/entry' : role);
}

const ROLE_PRIORITY = { 'Start/entry': 0, 'Final/exit': 1, Intermediate: 2 };

export function operationalMiniVmsDevices(devices, locationId) {
  return vmsDevicesForLocation(devices, locationId, 'Mini VMS')
    .map(device => ({ device, role: normalizedVmsRole(device), chainageKm: placementForDevice(device).chainageKm }))
    .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9)
      || (a.chainageKm ?? Infinity) - (b.chainageKm ?? Infinity)
      || a.device.id.localeCompare(b.device.id))
    .slice(0, 2)
    .map(item => item.device);
}

export function draftForVmsDevice({ templates = {}, locationId, device, phase }) {
  if (!device) return { line1: '', line2: '', role: 'Start/entry', remainingDistanceMeters: '' };
  const saved = templates[`${locationId}|${device.id}|${phase}`];
  if (saved) return { line1: saved.line1 || '', line2: saved.line2 || '', role: normalizedVmsRole(device), remainingDistanceMeters: saved.remainingDistanceMeters || '' };
  const message = getDynamicVmsMessage(device.sign, phase);
  return { line1: message.msg || '', line2: message.msg2 || '', role: normalizedVmsRole(device), remainingDistanceMeters: '' };
}

export function draftsForVmsDevices({ templates = {}, locationId, devices, phase }) {
  return Object.fromEntries(devices.map(device => [device.id, draftForVmsDevice({ templates, locationId, device, phase })]));
}

export const updateVmsDraftLine = (draft, field, value) => ({ ...draft, [field]: value.toUpperCase() });

export function updateDeviceDraft(drafts, deviceId, field, value) {
  return { ...drafts, [deviceId]: updateVmsDraftLine(drafts[deviceId], field, value) };
}

export function vmsTemplateSaveActions({ locationId, devices, phase, drafts }) {
  return devices.map(device => ({
    type: 'VMS_TEMPLATE_SAVE', locationId, deviceId: device.id, deviceType: device.type, phase, draft: drafts[device.id],
  }));
}
