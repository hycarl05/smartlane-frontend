import { normalizeStatus, STATUS_STYLE } from '../equipment';

export default function EquipmentStatusBadge({ device, field = 'health' }) {
  const normalized = normalizeStatus(device);
  const value = normalized[field];
  const label = field === 'connectivity' ? ({ Active: 'Online', Inactive: 'Offline' }[value] || value) : value;
  const style = field === 'health' ? STATUS_STYLE[value] :
    { tone: value === 'Active' ? 'connection' : value === 'Inactive' ? 'bad' : 'unknown', icon: value === 'Active' ? '↔' : '?' };
  return <span className={`equipment-badge equipment-${style.tone}`}><span aria-hidden="true">{style.icon}</span> {label}</span>;
}
