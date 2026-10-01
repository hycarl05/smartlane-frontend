import { normalizeStatus, STATUS_STYLE } from '../equipment';

export default function EquipmentStatusBadge({ device, field = 'health' }) {
  const normalized = normalizeStatus(device);
  const label = normalized[field];
  const style = field === 'health' ? STATUS_STYLE[label] :
    { tone: label === 'Active' ? 'connection' : label === 'Inactive' ? 'bad' : 'unknown', icon: label === 'Active' ? '↔' : '?' };
  return <span className={`equipment-badge equipment-${style.tone}`}><span aria-hidden="true">{style.icon}</span> {label}</span>;
}
