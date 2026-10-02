import { draftForVmsDevice, normalizedVmsRole, updateVmsDraftLine } from './vmsEditorModel.js';

export const isVmsDevice = device => ['VMS', 'Mini VMS'].includes(device?.type);

export function vmsQuickDraft({ device, locationId, phase, templates = {} }) {
  if (!device || device.locationId !== locationId || !isVmsDevice(device)) return null;
  return draftForVmsDevice({ device, locationId, phase, templates });
}

export const updateVmsQuickDraft = (draft, field, value) => updateVmsDraftLine(draft, field, value);

export function quickTemplateSaveAction({ device, locationId, phase, draft }) {
  if (!device || device.locationId !== locationId || !isVmsDevice(device)) return null;
  return { type: 'VMS_TEMPLATE_SAVE', locationId, deviceId: device.id, deviceType: device.type, phase, draft: { ...draft, role: normalizedVmsRole(device) }, messageOnly: true };
}

export const fullVmsEditorPath = (locationId, deviceId, phase) => `/locations/${encodeURIComponent(locationId)}/vms-editor?device=${encodeURIComponent(deviceId)}&phase=${phase}`;
