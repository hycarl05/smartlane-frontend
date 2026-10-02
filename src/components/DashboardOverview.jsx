import EquipmentStatusBadge from './EquipmentStatusBadge';
import { equipmentAlarms, eventsForLocation, isStale, summarizeEquipment } from '../equipment';
import { getDynamicVmsMessage } from '../vmsMessages';

const physical = device => device.type !== 'LCS I/O Module';
const markerIcon = device => ({ CCTV: 'CAM', VMS: 'VMS', 'Mini VMS': 'mVMS', AVDS: 'AVDS', LCS: device.indication === 'Green Arrow' ? '↓' : '×' })[device.type] || '•';
const healthClass = device => `health-${device.health.toLowerCase().replace(' ', '-')}`;
const connectivityLabel = value => ({ Active: 'Online', Inactive: 'Offline' }[value] || value);

function DeviceMarker({ device, ioModules, phase, onSelect }) {
  const message = ['VMS', 'Mini VMS'].includes(device.type) ? getDynamicVmsMessage(device.sign || {}, phase) : null;
  return <article className={`road-device ${healthClass(device)}${message ? ' road-device--message' : ''}`}>
    <button type="button" className="road-device-main" onClick={() => onSelect(device.id)} title={`${device.demoLabel} · ${device.health} · ${connectivityLabel(device.connectivity)}`}>
      <span className="road-device-icon" aria-hidden="true">{markerIcon(device)}</span>
      <span className="road-device-copy"><b>{device.demoLabel}</b><small>{message ? [message.msg, message.msg2].filter(Boolean).join(' / ') : device.type === 'LCS' ? device.indication : connectivityLabel(device.connectivity)}</small></span>
      <span className="road-device-health" aria-label={device.health} />
    </button>
    {ioModules.map(io => <button type="button" className="lcs-io-chip" key={io.id} onClick={() => onSelect(io.id)} title={`Open ${io.demoLabel} details`}><span className={healthClass(io)} />I/O</button>)}
  </article>;
}

function Route({ devices, operation, onSelect }) {
  const visible = devices.filter(physical);
  const above = visible.filter((_, index) => index % 2 === 0);
  const below = visible.filter((_, index) => index % 2 === 1);
  const ioByLcs = devices.filter(device => !physical(device)).reduce((map, io) => ({ ...map, [io.associatedLcsId]: [...(map[io.associatedLcsId] || []), io] }), {});
  const phase = operation?.intervention ? -1 : operation?.phase || 0;
  const row = items => <div className="road-device-row" style={{ '--marker-count': items.length }}>{items.map(device => <DeviceMarker key={device.id} device={device} ioModules={ioByLcs[device.id] || []} phase={phase} onSelect={onSelect} />)}</div>;
  return <section className="smartlane-schematic" aria-label={`Illustrative road schematic showing ${visible.length} physical devices`}>
    <header><div><b>Smartlane road schematic</b><span>Illustrative layout — not to scale</span></div><div className="schematic-key"><i className="good" />Good <i className="warn" />Warning <i className="bad" />Offline</div></header>
    {row(above)}
    <div className="road-zone-labels"><span>START</span><span>MID</span><span>END</span></div>
    <div className="road-illustration"><div className="main-carriageway"><b>Main carriageway</b><span>→   →   →</span></div><div className={`smartlane-lane ${[2, 3].includes(operation?.phase) && !operation?.intervention ? 'active' : ''}`}><b>Smartlane / emergency lane</b><span>→   →   →</span></div></div>
    {row(below)}
  </section>;
}

const eventTime = event => event.time || (event.timestamp ? String(event.timestamp).slice(11, 19) : '') || '—';
const eventDescription = event => event.activity || event.event || event.action || event.issue || 'Recorded event';
const eventStamp = event => Date.parse(event.timestamp || event.raisedAt || `${event.date || ''}T${event.time || ''}`) || 0;

export default function DashboardOverview({ loc, devices, operation, auditLogs, canReadVms, onSelectDevice, onOpenEquipment, onOpenAudit, onOpenVms }) {
  const counts = summarizeEquipment(devices);
  const alarms = equipmentAlarms(devices);
  const stale = devices.filter(device => isStale(device)).length;
  const cameras = devices.filter(device => device.type === 'CCTV');
  const physicalCount = devices.filter(physical).length;
  const ioCount = devices.length - physicalCount;
  const recentEvents = eventsForLocation(auditLogs || [], loc.id).sort((a, b) => eventStamp(b) - eventStamp(a)).slice(0, 4);
  return <div className="tab-panel active compact-dashboard">
    <section className="health-strip" aria-label="Equipment and system summary"><button onClick={onOpenEquipment}><b>{physicalCount} devices · {ioCount} I/O modules</b><span>Health totals: all {counts.total} monitoring records, including I/O</span></button><span className="health-good"><b>{counts.Good}</b> good</span><span className="health-warn"><b>{counts.Warning + counts.Degraded}</b> warning</span><span className="health-bad"><b>{counts.Offline}</b> offline</span><span><b>{counts.Unknown}</b> unknown</span><span className="freshness-summary"><b>{stale ? `${stale} stale` : 'Fresh'}</b> observations</span><span>LOS <b>{loc.los || 'A'}</b></span><button className={alarms.length ? 'alarm-link active' : 'alarm-link'} onClick={onOpenAudit}><b>{alarms.length}</b><span>Alarms &amp; audit</span></button></section>
    <Route devices={devices} operation={operation} onSelect={onSelectDevice} />
    <div className="dashboard-lower-row">
      <section className="camera-strip"><header><div><b>CCTV previews</b><span>{cameras.length} configured · simulated</span></div><button disabled={!canReadVms} onClick={onOpenVms}>VMS details</button></header><div className="compact-camera-grid" style={{ '--camera-count': cameras.length }}>{cameras.map(cam => <button type="button" key={cam.id} className="compact-camera" onClick={() => onSelectDevice(cam.id)}><svg viewBox="0 0 100 55" preserveAspectRatio="xMidYMid slice"><polygon points="38,55 62,55 55,0 45,0" fill="#3b4a70"/><line x1="50" y1="0" x2="50" y2="55" stroke="#cbd5e1" strokeDasharray="4 4"/></svg><span>{cam.demoLabel}<EquipmentStatusBadge device={cam} field="connectivity" /></span></button>)}</div></section>
      <section className="dashboard-event-log" aria-label={`Latest events for ${loc.name}`}><header><b>Latest location events</b><button onClick={onOpenAudit}>Alarms &amp; Audit →</button></header>{recentEvents.length ? <ol>{recentEvents.map(event => <li key={event.id}><time>{eventTime(event)}</time><span title={eventDescription(event)}>{eventDescription(event)}</span></li>)}</ol> : <p>No events recorded for this location.</p>}</section>
    </div>
  </div>;
}
