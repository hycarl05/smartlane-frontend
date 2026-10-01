import { useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import { normalizeStatus, formatTimestamp, isStale } from '../equipment';

// Monitoring preview only: no camera, recording, archive or PTZ connection.
export default function CctvModal({ cctv, locName, onClose }) {
  const [paused, setPaused] = useState(false);
  const status = normalizeStatus(cctv);
  const available = status.connectivity === 'Active' && status.health !== 'Unknown';
  return <MonitoringDialog title={`Simulated CCTV preview — ${cctv.name || cctv.km}`} onClose={onClose}>
    <p>{locName}</p>
    <p className="equipment-notice">Demo illustration only. No live camera, recording, archive or PTZ connection is active.</p>
    <div className="equipment-preview-status"><span>Connectivity: <EquipmentStatusBadge device={cctv} field="connectivity" /></span><span>Health: <EquipmentStatusBadge device={cctv} /></span></div>
    <p>Last observation: {formatTimestamp(cctv.updatedAt)} {isStale(cctv) && '· Stale / unknown freshness'}</p>
    <div className="equipment-camera-preview">
      {!available ? <p>Preview unavailable · {status.health}. {cctv.explanation || 'No healthy connection has been established.'}</p> : paused ? <p>Simulated preview paused</p> : <svg viewBox="0 0 600 260" role="img" aria-label="Static illustration of a highway, not a live camera feed">
        <rect width="600" height="260" fill="#1e293b" /><path d="M250 20 L350 20 L590 260 L10 260Z" fill="#475569" />
        <path d="M285 20 L200 260 M315 20 L400 260" stroke="#fff" strokeWidth="4" strokeDasharray="12 14" />
        <rect x="180" y="190" width="30" height="45" rx="5" fill="#38bdf8" /><rect x="370" y="160" width="30" height="45" rx="5" fill="#fbbf24" />
        <text x="20" y="35" fill="white" fontSize="18">SIMULATED PREVIEW</text>
      </svg>}
    </div>
    {available && <button type="button" onClick={() => setPaused(p => !p)}>{paused ? 'Resume simulated preview' : 'Pause simulated preview'}</button>}
  </MonitoringDialog>;
}
