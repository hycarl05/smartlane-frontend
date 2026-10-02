import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MonitoringDialog from './MonitoringDialog';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import CctvModal from './CctvModal';
import VmsBoardPreview from './VmsBoardPreview';
import { formatTimestamp, isStale } from '../equipment';
import { PHASE_NAMES } from '../operationPolicy';
import { PANEL_CAPABILITIES, placementForDevice, validateVmsDraft } from '../phase6';
import { fullVmsEditorPath, isVmsDevice, quickTemplateSaveAction, updateVmsQuickDraft, vmsQuickDraft } from '../vmsQuickDetailsModel';

const shortTime = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'Not available';
const roleLabel = role => ({ Start: 'Start / Entry', Entry: 'Start / Entry', Mid: 'Intermediate', End: 'End / Exit', Exit: 'End / Exit' })[role] || role;

function VmsQuickDetails({ device, locationId, phase = 0, templates = {}, editable = false, onSaveTemplate, onClose }) {
  const resolved = useMemo(() => vmsQuickDraft({ device, locationId, phase, templates }), [device, locationId, phase, templates]);
  const [draft, setDraft] = useState(resolved);
  const [editing, setEditing] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  useEffect(() => { setDraft(resolved); setEditing(false); }, [resolved]);
  useEffect(() => setConfirmation(''), [device.id, phase]);
  if (!resolved) return <MonitoringDialog title="Device unavailable" onClose={onClose} hideAccessTest><p>This VMS does not belong to the selected location.</p></MonitoringDialog>;
  const role = placementForDevice(device).role;
  const errors = validateVmsDraft({ ...draft, role: 'Intermediate' }, PANEL_CAPABILITIES[device.type] || {});
  const save = () => {
    const action = quickTemplateSaveAction({ device, locationId, phase, draft });
    if (!action || errors.length || !onSaveTemplate) return;
    onSaveTemplate(action);
    setEditing(false);
    setConfirmation('Template saved for this device and phase. No message was sent to roadside equipment.');
  };
  const cancel = () => { setDraft(resolved); setEditing(false); setConfirmation(''); };
  return <MonitoringDialog title={device.demoLabel || device.name} onClose={onClose} hideAccessTest className="vms-quick-dialog">
    <div className="vms-quick-heading"><div><strong>{roleLabel(role)}</strong><span><EquipmentStatusBadge device={device} field="connectivity" /><EquipmentStatusBadge device={device} /></span></div><small>Last updated: {shortTime(device.updatedAt)}</small></div>
    {device.health !== 'Good' && <p className="vms-quick-warning">{device.explanation || 'Inspection recommended.'}</p>}
    <dl className="vms-quick-context"><div><dt>Current phase</dt><dd>{PHASE_NAMES[phase] || PHASE_NAMES[0]}</dd></div><div><dt>Message type</dt><dd>Configured template</dd></div></dl>
    <section className="vms-quick-preview"><h3>Configured message for current phase</h3><VmsBoardPreview compact line1={draft.line1} line2={draft.line2} label={`${device.demoLabel || device.name} configured message`} /><small>Frontend preview — message is not confirmed on roadside equipment.</small></section>
    {editing && <div className="vms-quick-fields"><label>Message Line 1<input value={draft.line1} onChange={event => setDraft(current => updateVmsQuickDraft(current, 'line1', event.target.value))} /></label><label>Message Line 2<input value={draft.line2} onChange={event => setDraft(current => updateVmsQuickDraft(current, 'line2', event.target.value))} /></label>{errors.map(error => <p role="alert" key={error}>{error}</p>)}</div>}
    <div className="vms-quick-actions">{editable && !editing && <button type="button" onClick={() => { setEditing(true); setConfirmation(''); }}>Edit Message</button>}{editable && editing && <><button type="button" onClick={cancel}>Cancel</button><button type="button" className="vms-quick-save" disabled={errors.length > 0} onClick={save}>Save Template</button></>}<Link to={fullVmsEditorPath(locationId, device.id, phase)}>Open Full VMS Editor</Link></div>
    {confirmation && <p className="vms-save-confirmation" role="status">{confirmation}</p>}
    <details className="vms-technical-details"><summary>Technical Details</summary><dl className="equipment-details-grid"><div><dt>Internal Device ID</dt><dd>{device.id}</dd></div><div><dt>Location</dt><dd>{device.location}</dd></div><div><dt>Device type</dt><dd>{device.type}</dd></div><div><dt>Description</dt><dd>{device.description}</dd></div><div><dt>Exact timestamp</dt><dd>{formatTimestamp(device.updatedAt)}</dd></div><div><dt>Data provenance</dt><dd>{device.placementProvenance || device.inventoryClass || 'Not supplied'}</dd></div>{device.configuration && <><div><dt>Configuration state</dt><dd>{device.configuration.enabled ? 'Enabled' : 'Disabled'}</dd></div><div><dt>Model / IP</dt><dd>{device.configuration.model || 'Not configured'} / {device.configuration.ip || 'Not configured'}</dd></div><div><dt>Coordinates</dt><dd>{device.configuration.latitude || 'Not configured'} / {device.configuration.longitude || 'Not configured'}</dd></div><div><dt>Credentials</dt><dd>{device.configuration.credentialsConfigured ? 'Configured — dummy flag only' : 'Not configured'}</dd></div></>}</dl><details><summary>Recent Status</summary><ul className="equipment-history">{device.history.slice(0, 3).map((entry, index) => <li key={`${entry.at}-${index}`}><time>{formatTimestamp(entry.at)}</time><EquipmentStatusBadge device={entry} /><EquipmentStatusBadge device={entry} field="connectivity" /><p>{entry.note}</p></li>)}</ul></details></details>
  </MonitoringDialog>;
}

function DefaultDeviceDetails({ device, onClose }) {
  const [preview, setPreview] = useState(false);
  if (preview) return <CctvModal cctv={device} locName={device.location} onClose={() => setPreview(false)} />;
  return <MonitoringDialog title={device.name} onClose={onClose}>
    <p className="equipment-notice">Simulated monitoring · illustrative demo inventory, not approved site placement.</p>
    <dl className="equipment-details-grid">
      <div><dt>Device ID</dt><dd>{device.id}</dd></div><div><dt>Type</dt><dd>{device.type}</dd></div><div><dt>Location</dt><dd>{device.location}</dd></div><div><dt>Description</dt><dd>{device.description}</dd></div><div><dt>Connectivity</dt><dd><EquipmentStatusBadge device={device} field="connectivity" /></dd></div><div><dt>Health</dt><dd><EquipmentStatusBadge device={device} /></dd></div><div><dt>Last updated</dt><dd>{formatTimestamp(device.updatedAt)} {isStale(device) && <strong>· Stale / unavailable timestamp</strong>}</dd></div><div><dt>Status explanation</dt><dd>{device.explanation}</dd></div>
      {device.configuration && <><div><dt>Configuration state (not observed health)</dt><dd>{device.configuration.enabled ? 'Enabled' : 'Disabled'}</dd></div><div><dt>Configured model / IP</dt><dd>{device.configuration.model || 'Not configured'} / {device.configuration.ip || 'Not configured'}</dd></div><div><dt>Geographic latitude / longitude (not canvas X/Y)</dt><dd>{device.configuration.latitude === '' ? 'Not configured' : device.configuration.latitude} / {device.configuration.longitude === '' ? 'Not configured' : device.configuration.longitude}</dd></div><div><dt>Credential configuration</dt><dd>{device.configuration.credentialsConfigured ? 'Configured — dummy flag only' : 'Not configured'}</dd></div></>}
      {device.type === 'LCS' && <><div><dt>{device.commandSimulation ? 'Proposed indication (operation simulation)' : 'Mock displayed indication'}</dt><dd>{device.indication}</dd></div>{device.observedIndication && <div><dt>Original fixture observation — not current confirmation</dt><dd>{device.observedIndication}. No equipment acknowledgement received.</dd></div>}</>}
      {device.type === 'LCS I/O Module' && <><div><dt>Associated LCS</dt><dd>{device.associatedLcsName}<br />{device.associatedLcsId}</dd></div><div><dt>Mock channel states</dt><dd>{device.channels.map(channel => <p key={channel.name}>{channel.name}: {channel.state}</p>)}</dd></div></>}
      {device.type === 'AVDS' && <><div><dt>Speed / volume / occupancy</dt><dd>{device.speed ?? 'Unknown'} km/h · {device.volume ?? 'Unknown'} vehicles / demo 5 min · {device.occupancy ?? 'Unknown'}%</dd></div><div><dt>Observation time</dt><dd>{formatTimestamp(device.observedAt)}</dd></div></>}
    </dl>
    {device.type === 'CCTV' && <button type="button" onClick={() => setPreview(true)}>Open simulated CCTV preview</button>}
    <h3>Recent status · illustrative history</h3><ul className="equipment-history">{device.history.map((entry, index) => <li key={`${entry.at}-${index}`}><time>{formatTimestamp(entry.at)}</time><EquipmentStatusBadge device={entry} /><EquipmentStatusBadge device={entry} field="connectivity" /><p>{entry.note}</p></li>)}</ul>
  </MonitoringDialog>;
}

export default function DeviceDetails(props) {
  return isVmsDevice(props.device) ? <VmsQuickDetails {...props} locationId={props.locationId || props.device.locationId} phase={props.phase ?? props.device.phase ?? 0} /> : <DefaultDeviceDetails {...props} />;
}
