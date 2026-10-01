import { useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import CctvModal from './CctvModal';
import { formatTimestamp, isStale } from '../equipment';
import { getDynamicVmsMessage } from './VmsEditor';

export default function DeviceDetails({ device, onClose }) {
  const [preview, setPreview] = useState(false);
  if (preview) return <CctvModal cctv={device} locName={device.location} onClose={() => setPreview(false)} />;
  const message = device.sign ? getDynamicVmsMessage(device.sign, device.phase) : null;
  return <MonitoringDialog title={device.name} onClose={onClose}>
    <p className="equipment-notice">Simulated monitoring · illustrative demo inventory, not approved site placement.</p>
    <dl className="equipment-details-grid">
      <div><dt>Device ID</dt><dd>{device.id}</dd></div><div><dt>Type</dt><dd>{device.type}</dd></div>
      <div><dt>Location</dt><dd>{device.location}</dd></div><div><dt>Description</dt><dd>{device.description}</dd></div>
      <div><dt>Connectivity</dt><dd><EquipmentStatusBadge device={device} field="connectivity" /></dd></div>
      <div><dt>Health</dt><dd><EquipmentStatusBadge device={device} /></dd></div>
      <div><dt>Last updated</dt><dd>{formatTimestamp(device.updatedAt)} {isStale(device) && <strong>· Stale / unavailable timestamp</strong>}</dd></div>
      <div><dt>Status explanation</dt><dd>{device.explanation}</dd></div>
      {device.configuration && <><div><dt>Configuration state (not observed health)</dt><dd>{device.configuration.enabled ? 'Enabled' : 'Disabled'}</dd></div><div><dt>Configured model / IP</dt><dd>{device.configuration.model || 'Not configured'} / {device.configuration.ip || 'Not configured'}</dd></div><div><dt>Geographic latitude / longitude (not canvas X/Y)</dt><dd>{device.configuration.latitude === '' ? 'Not configured' : device.configuration.latitude} / {device.configuration.longitude === '' ? 'Not configured' : device.configuration.longitude}</dd></div><div><dt>Credential configuration</dt><dd>{device.configuration.credentialsConfigured ? 'Configured — dummy flag only' : 'Not configured'}</dd></div></>}
      {device.type === 'LCS' && <><div><dt>{device.commandSimulation ? 'Proposed indication (operation simulation)' : 'Mock displayed indication'}</dt><dd>{device.indication}</dd></div>{device.observedIndication && <div><dt>Original fixture observation — not current confirmation</dt><dd>{device.observedIndication}. No equipment acknowledgement received.</dd></div>}</>}
      {device.type === 'LCS I/O Module' && <><div><dt>Associated LCS</dt><dd>{device.associatedLcsName}<br />{device.associatedLcsId}</dd></div><div><dt>Mock channel states</dt><dd>{device.channels.map(c => <p key={c.name}>{c.name}: {c.state}</p>)}</dd></div></>}
      {device.type === 'AVDS' && <><div><dt>Speed / volume / occupancy</dt><dd>{device.speed ?? 'Unknown'} km/h · {device.volume ?? 'Unknown'} vehicles / demo 5 min · {device.occupancy ?? 'Unknown'}%</dd></div><div><dt>Observation time</dt><dd>{formatTimestamp(device.observedAt)}</dd></div></>}
      {message && <div><dt>{device.commandSimulation ? 'Proposed phase message — not confirmed on equipment' : 'Current mock displayed message'}</dt><dd>{message.msg}<br />{message.msg2}</dd></div>}
    </dl>
    {device.type === 'CCTV' && <button type="button" onClick={() => setPreview(true)}>Open simulated CCTV preview</button>}
    <h3>Recent status · illustrative history</h3>
    <ul className="equipment-history">{device.history.map((entry, i) => <li key={`${entry.at}-${i}`}><time>{formatTimestamp(entry.at)}</time><EquipmentStatusBadge device={entry} /><EquipmentStatusBadge device={entry} field="connectivity" /><p>{entry.note}</p></li>)}</ul>
  </MonitoringDialog>;
}
