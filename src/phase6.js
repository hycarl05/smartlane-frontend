import { isStale } from './equipment.js';

export const INITIAL_PHASE6 = { templates: {}, publishJobs: [], events: [], sequence: 0, feedback: null };
export const OPERATION_PHASES = [1, 2, 3, 4, 5];
export const PANEL_CAPABILITIES = {
  'Mini VMS': { lines: 2, charactersPerLine: null, resolution: '208 × 256 px (URS; subject to final approval)', provenance: 'URS_1.1.7 / URS_2.1.2' },
  VMS: { lines: null, charactersPerLine: null, resolution: null, provenance: 'Hardware capability metadata not supplied' },
};

export function geographicCoordinate(device) {
  const latitude = Number(device.configuration?.latitude), longitude = Number(device.configuration?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && String(device.configuration?.latitude).trim() !== '' && String(device.configuration?.longitude).trim() !== '' ? [longitude, latitude] : null;
}
export function partitionMappedDevices(devices) {
  const mapped = [], unmapped = [];
  devices.forEach(device => { const coordinates = geographicCoordinate(device); (coordinates ? mapped : unmapped).push(coordinates ? { ...device, coordinates } : device); });
  return { mapped, unmapped };
}
const chainage = value => { const n = Number.parseFloat(String(value || '').match(/[\d.]+/)?.[0]); return Number.isFinite(n) ? n : null; };
export function placementForDevice(device) {
  const km = chainage(device.km), explicitRole = device.sign?.position || device.configuration?.placementRole || null;
  return { locationId: device.locationId, direction: device.direction || null, deviceId: device.id, type: device.type,
    role: explicitRole || 'Unresolved', chainageKm: km, label: device.km || 'Placement not supplied',
    confidence: km != null || explicitRole ? 'Illustrative prototype placement' : 'Missing placement information',
    provenance: km != null || explicitRole ? 'Existing prototype inventory; appendix reconciliation pending' : 'Not supplied' };
}
export function orderedSchematic(devices) {
  return devices.map(device => ({ device, placement: placementForDevice(device) })).sort((a,b) => (a.placement.chainageKm ?? Infinity) - (b.placement.chainageKm ?? Infinity) || a.device.id.localeCompare(b.device.id));
}
export function lcsIoState(devices) {
  return devices.filter(d => d.type === 'LCS').map(lcs => {
    const io = devices.find(d => d.type === 'LCS I/O Module' && d.associatedLcsId === lcs.id);
    const commanded = lcs.indication || 'Unknown', reported = lcs.observedIndication || 'Unknown';
    const mismatch = ['Red X','Green Arrow'].includes(commanded) && ['Red X','Green Arrow'].includes(reported) && commanded !== reported;
    return { lcs, io, commanded, reported, mismatch, state: lcs.connectivity !== 'Active' || !io || io.connectivity !== 'Active' ? 'Offline/unknown' : mismatch ? 'Mismatch' : reported === 'Unknown' ? 'Command accepted by prototype; report unavailable' : 'Reported matches command' };
  });
}
export function validateVmsDraft(draft, capability = {}) {
  const errors = [], lines = [draft.line1, draft.line2].map(x => String(x || '').trim());
  if (!lines.some(Boolean)) errors.push('Enter message content.');
  if (capability.lines && lines.filter(Boolean).length > capability.lines) errors.push(`Panel supports ${capability.lines} text lines.`);
  if (capability.charactersPerLine && lines.some(x => x.length > capability.charactersPerLine)) errors.push(`A line exceeds the supplied ${capability.charactersPerLine}-character capability.`);
  if (draft.role === 'Final/exit' && (!Number.isFinite(Number(draft.remainingDistanceMeters)) || Number(draft.remainingDistanceMeters) <= 0)) errors.push('Enter a positive remaining distance for a final/exit VMS.');
  if (/[^A-Z0-9 .,/\-()]/i.test(lines.join(' '))) errors.push('Message contains unsupported prototype characters.');
  return errors;
}
const copy = value => JSON.parse(JSON.stringify(value));
export function phase6Reducer(state, action) {
  if (action.type === 'VMS_TEMPLATE_SAVE') {
    const validationDraft = action.messageOnly ? { ...action.draft, role: 'Intermediate' } : action.draft;
    const errors = validateVmsDraft(validationDraft, PANEL_CAPABILITIES[action.deviceType] || {});
    if (errors.length) return { ...state, feedback: { errors, message: '' } };
    const key = `${action.locationId}|${action.deviceId}|${action.phase}`;
    const template = { ...copy(action.draft), locationId: action.locationId, deviceId: action.deviceId, phase: action.phase, savedAt: new Date(action.now).toISOString(), actorId: action.actorId, approval: 'Prototype example; operational text not approved' };
    const evt = { id:`P6-EVT-${state.sequence+1}`,timestamp:template.savedAt,actor:`Demo persona ${action.actorId}`,locationId:action.locationId,module:'VMS Configuration',activity:`Saved mock template for ${action.deviceId}, phase ${action.phase}`,equipmentId:action.deviceId,result:'Simulated' };
    return { ...state, sequence:state.sequence+1, templates:{...state.templates,[key]:template},events:[evt,...state.events],feedback:{errors:[],message:'Mock template saved. Displayed equipment message is unchanged.'} };
  }
  if (action.type === 'VMS_PUBLISH_REQUEST') {
    if (!action.deviceIds?.length) return { ...state, feedback:{errors:['Select at least one target device.'],message:''} };
    const id=`PUB-${state.sequence+1}`, job={id,status:'Pending',scenario:action.scenario,locationId:action.locationId,deviceIds:[...action.deviceIds],phase:action.phase,requestedAt:new Date(action.now).toISOString(),results:[]};
    const evt={id:`P6-EVT-${state.sequence+1}`,timestamp:job.requestedAt,actor:`Demo persona ${action.actorId}`,locationId:action.locationId,module:'VMS Publish',activity:`Simulated publish requested for ${job.deviceIds.join(', ')}`,equipmentId:job.deviceIds.join(', '),result:'Pending'};
    return {...state,sequence:state.sequence+1,publishJobs:[job,...state.publishJobs],events:[evt,...state.events],feedback:{errors:[],message:'Publish request pending; no panel application is confirmed.'}};
  }
  if(action.type==='VMS_PUBLISH_RESOLVE'){
    const job=state.publishJobs.find(j=>j.id===action.id); if(!job||job.status!=='Pending') return state;
    const results=job.deviceIds.map((deviceId,i)=>({deviceId,outcome:job.scenario==='failed'?'Failed':job.scenario==='partial'&&i>0?'Failed':'Simulated success'}));
    const status=results.every(r=>r.outcome==='Simulated success')?'Simulated success':results.every(r=>r.outcome==='Failed')?'Failed':'Partial';
    const evt={id:`P6-EVT-${state.sequence+1}`,timestamp:new Date(action.now).toISOString(),actor:`Demo persona ${action.actorId}`,locationId:job.locationId,module:'VMS Publish',activity:`Publish ${job.id} resolved with per-device results`,equipmentId:job.deviceIds.join(', '),result:status};
    return {...state,sequence:state.sequence+1,publishJobs:state.publishJobs.map(j=>j.id===job.id?{...j,status,results,resolvedAt:evt.timestamp}:j),events:[evt,...state.events],feedback:{errors:[],message:`${job.id}: ${status}. Reported display observations remain unchanged.`}};
  }
  return state;
}
export function phase6Audit(events, locations){return events.map(e=>({...e,initiator:e.actor,initiatorRole:'Demo persona',location:locations.find(l=>l.id===e.locationId)?.name||'Global / System-Wide'}));}
export function equipmentMapStatus(device){return isStale(device)?'Stale':device.health;}
const LOCATION_RUNTIME_FIELDS = new Set(['status','mode','phase','phaseLabel','phaseTimer','elapsedSeconds','ps','pe','timestamps','operation','lcs','traffic','los','trafficFlow','incidents','thresholdArmed','nextRun','alarms']);
export function sanitizeLayoutUpdate(fields){return Object.fromEntries(Object.entries(fields).filter(([key])=>!LOCATION_RUNTIME_FIELDS.has(key)));}
