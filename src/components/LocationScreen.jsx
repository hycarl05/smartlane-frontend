import React, { useState, useCallback, useEffect } from 'react';
import EquipmentMonitoring, { EquipmentSummary, EquipmentAlarms } from './EquipmentMonitoring';
import DeviceDetails from './DeviceDetails';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import { equipmentAlarms, isStale, recordsForLocation } from '../equipment';
import OperationControls from './OperationControls';
import Schedule from './Schedule';
import Administration from './Administration';
import { useAccess } from '../accessContext';
import { getDynamicVmsMessage } from '../vmsMessages';
import AuditLogDisplay from './AuditLogDisplay';
import RoadLayoutDesigner from './RoadLayoutDesigner';
import Phase5 from './Phase5';
import { EquipmentGIS, EquipmentSchematic, VmsWorkflow } from './Phase6';
import DashboardOverview from './DashboardOverview';
import { Link, NavLink } from 'react-router-dom';
import { LOCATION_NAVIGATION, locationPath } from '../routing';

export default function LocationScreen({
  loc,
  locations = [],
  auditLogs = [],
  equipmentRecords = [],
  operation,
  operationNow,
  onOperation,
  scheduleStore,
  operations,
  administration,
  onAdmin,
  administrationLocations,
  onSelectLocation,
  activeTab,
  setActiveTab,
  time,
  date,
  user,
  onLogout,
  onUpdateLoc,
  onShowToast,
  hideTopbars = false,
  phase5,
  onPhase5,
  phase6,
  onPhase6
}) {
  const { caps, allowed } = useAccess();



  // VMS Editor Modal State
  const [vmsModuleType, setVmsModuleType] = useState('vms'); // 'vms' | 'miniVms'

  // CCTV Inspection Modal State
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  useEffect(() => { setSelectedDeviceId(null); }, [loc?.id]);
  const closeDevice = useCallback(() => setSelectedDeviceId(null), []);
  const devices = recordsForLocation(equipmentRecords, loc?.id);
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);
  const currentEquipmentAlarms = equipmentAlarms(devices);
  const cameras = devices.filter(d => d.type === 'CCTV');

  const handleOpenVmsEditor = (type = 'vms') => {
    setVmsModuleType(type);
    setActiveTab('vms');
  };

  if (!loc) return null;

  const isActive = !operation?.intervention && [2, 3].includes(operation?.phase);
  const isOverviewOrCorridor = activeTab === 'overview' || activeTab === 'corridor';

  return (
    <div className="screen active unified-location-shell">
      {!hideTopbars && (
        <>
          <div className="topbar">
            <Link className="back-btn" to="/locations">← All Locations</Link>
            <div className="loc-crumb">
              <select
                className="loc-select-breadcrumb"
                value={loc.id}
                onChange={(e) => {
                  if (onSelectLocation) {
                    onSelectLocation(e.target.value, activeTab);
                  }
                }}
              >
                {locations.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span className="sub">{loc.direction || 'Northbound'}</span>
            </div>

            <div className="topbar-right">
              <div className="clock">
                <b>{time}</b>
                <span>{date}</span>
              </div>
              <div className="user-chip">
                <span className="user-dot"></span> {user ? user.username : 'admin'}
              </div>
              {onLogout && (
                <button className="logout-btn" onClick={onLogout} title="Sign Out">
                  Logout ↵
                </button>
              )}
            </div>
          </div>

          <nav className="tabbar" aria-label="Location pages">{LOCATION_NAVIGATION.map(item => allowed(item.permission) && <NavLink key={item.key} to={locationPath(loc.id, item.key)} className={({ isActive }) => `tab-btn ${isActive ? 'active' : ''}`}>{item.label}{item.key === 'log' && currentEquipmentAlarms.length > 0 && <span className="badge">{currentEquipmentAlarms.length}</span>}</NavLink>)}</nav>
        </>
      )}

      <div className="tab-panels">{!caps.operate && <p className="equipment-notice">Read-only operation status: {loc.phaseLabel} · {operation?.mode} · {operation?.intervention ? 'Intervention active' : operation?.pendingDecision ? 'Awaiting operator decision' : operation?.command.status}. Controls are unavailable for this demo persona.</p>}{caps.operate && !['schedule', 'exceptions', 'settings', 'groups', 'users', 'reports', 'analytics', 'maintenance', 'health', 'housekeeping'].includes(activeTab) && <OperationControls key={loc.id} loc={loc} op={operation} now={operationNow} dispatch={onOperation} />}
        {/* OVERVIEW / CORRIDOR TAB */}
        {isOverviewOrCorridor && <DashboardOverview
          loc={loc}
          devices={devices}
          operation={operation}
          auditLogs={auditLogs}
          canReadVms={caps.vmsRead}
          onSelectDevice={setSelectedDeviceId}
          onOpenEquipment={() => setActiveTab('equipment')}
          onOpenAudit={() => setActiveTab('log')}
          onOpenVms={() => handleOpenVmsEditor('vms')}
        />}
        {isOverviewOrCorridor && activeTab === '__legacy_overview' && (
          <div className="tab-panel active">
            <EquipmentSummary records={devices} onOpen={() => setActiveTab('equipment')} />
            {/* 2. LIVE ROUTE TIMELINE (SIGNATURE HIGHWAY TRACK) */}
            <div className="route-card">
              <div className="route-head">
                <div className="route-title">
                  Live Route Timeline<span className="sub"> — {loc.direction || 'Northbound'}</span>
                </div>
                <button className="match-btn" disabled={!caps.operate || !!operation?.intervention} onClick={() => onOperation({ type: 'MATCH_LCS', locationId: loc.id })}>
                  Simulate Match LCS to lane state
                </button>
              </div>

              <div className="route-track-wrap">
                <div className={`route-road ${isActive ? 'active' : ''}`}>
                  <div className="dashes"></div>
                  <div className="flow-overlay"></div>
                </div>

                <div className="stems">
                  {devices.filter(d => d.type !== 'LCS I/O Module').map(d => <div key={d.id} className="stem equipment-stem">
                    <button type="button" onClick={() => setSelectedDeviceId(d.id)} aria-label={`View ${d.name}`}><EquipmentStatusBadge device={d} /></button>
                    <div className="stem-km">{d.type} · {d.km}</div>
                    <EquipmentStatusBadge device={d} field="connectivity" />
                    {isStale(d) && <span className="equipment-stale-label">Stale observation</span>}
                    {d.type === 'LCS' && <span className="stem-lcs">{d.indication} · simulation only</span>}
                    {d.type === 'AVDS' && <div className="stem-traffic">{d.speed} km/h · {d.volume} veh/5 min · {d.occupancy}%</div>}
                  </div>)}
                </div>
              </div>

              <div className="next-run-tag" style={{ marginTop: '12px' }}>
                Next scheduled run: <b>{loc.nextRun || '—'}</b>
              </div>
            </div>

            {/* 3. BOTTOM TWO-COLUMN SECTION */}
            <div className="ov-bottom">
              {/* LEFT: 4 Small Live Cameras in 2x2 Grid with Click-to-Enlarge Modal */}
              <div className="cam-card">
                <div className="card-title">Cameras · simulated previews</div>
                <div className="cam-grid cam-grid-4">
                  {cameras.slice(0, 4).map(cam => (
                    <button type="button"
                      key={cam.id}
                      className="cam-tile clickable-cam-tile"
                      onClick={() => setSelectedDeviceId(cam.id)}
                      title={`View ${cam.name} details and simulated preview`}
                    >
                      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                        <polygon points="40,60 60,60 54,0 46,0" fill="#3b4a70" />
                        <line x1="50" y1="0" x2="50" y2="60" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                      </svg>
                      <div className="cam-hover-zoom-hint">🔍 Enlarge</div>
                      <div className="cam-label">
                        <span>{cam.km}</span>
                        <EquipmentStatusBadge device={cam} />
                        <EquipmentStatusBadge device={cam} field="connectivity" />
                        {isStale(cam) && <span className="equipment-stale-label">Stale observation</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RIGHT: Stack of VMS Messages, System Status, & Audit Log */}
              <div className="side-stack">
                {/* 1. VMS & MINI VMS MESSAGES */}
                <div className="vms-card">
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>VMS &amp; Mini VMS Messages</span>
                    <button
                      className="mini-edit-btn"
                      disabled={!caps.vmsRead} onClick={() => handleOpenVmsEditor('vms')}
                      title="Edit VMS Message Templates"
                    >
                      ✏️ Edit
                    </button>
                  </div>

                  <div className="vms-sections-container">
                    {/* Entry & Exit Main VMS */}
                    <div className="vms-group-section">
                      <div className="vms-group-title">📡 Entry &amp; Exit VMS</div>
                      {(loc.vms || [
                        { id: 'vms-entry', type: 'Entry VMS', km: 'KM3.5NB', position: 'Entry', msg: 'SMARTLANE BERMULA', msg2: 'MULA GUNAKAN LORONG KECEMASAN' },
                        { id: 'vms-exit', type: 'Exit VMS', km: 'KM8.6NB', position: 'Exit', msg: 'SMARTLANE TAMAT', msg2: 'MASUK KEMBALI KE LORONG UTAMA' }
                      ]).map((b, idx) => {
                        const dynamicMsg = getDynamicVmsMessage(b, operation?.intervention ? -1 : loc.phase || 0);
                        const displayText = dynamicMsg.msg2 ? `${dynamicMsg.msg} — ${dynamicMsg.msg2}` : dynamicMsg.msg;
                        return (
                          <div key={idx} className="vms-msg-row main-vms-row" disabled={!caps.vmsRead} onClick={() => handleOpenVmsEditor('vms')} title="Click to edit Entry/Exit VMS">
                            <span className="vms-type-tag">{b.type || (b.position === 'Entry' ? 'Entry VMS' : 'Exit VMS')}</span>
                            <span className="vms-msg">{displayText}</span>
                            <span className="vms-km">{b.km}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mini VMS */}
                    <div className="vms-group-section">
                      <div className="vms-group-title">📱 Mini VMS</div>
                      {(loc.miniVms || [
                        { id: 'mvms-1', type: 'Mini VMS', km: 'KM4.91NB', position: 'Intermediate', msg: 'HATI-HATI', msg2: 'KETIKA MEMANDU' },
                        { id: 'mvms-2', type: 'Mini VMS', km: 'KM6.0NB', position: 'Intermediate', msg: 'JALUR KECEMASAN', msg2: 'DIBUKA SEMENTARA' }
                      ]).map((b, idx) => {
                        const dynamicMsg = getDynamicVmsMessage(b, operation?.intervention ? -1 : loc.phase || 0);
                        const displayText = dynamicMsg.msg2 ? `${dynamicMsg.msg} — ${dynamicMsg.msg2}` : dynamicMsg.msg;
                        return (
                          <div key={idx} className="vms-msg-row mini-vms-row" disabled={!caps.vmsRead} onClick={() => handleOpenVmsEditor('miniVms')} title="Click to edit Mini VMS">
                            <span className="vms-type-tag mini">Mini VMS</span>
                            <span className="vms-msg">{displayText}</span>
                            <span className="vms-km">{b.km}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. System Status */}
                <div className="status-card">
                  <div className="card-title">System Status</div>
                  <div className="status-grid">
                    <div className="status-item">
                      <span className="lbl">Traffic flow</span>
                      <span className={`tag ${loc.trafficFlow === 'Normal' ? 'good' : loc.trafficFlow === 'Building' ? 'warn' : 'bad'}`}>
                        {loc.trafficFlow || 'Normal'}
                      </span>
                    </div>

                    <div className="status-item">
                      <span className="lbl">Active alarms</span>
                      <span className={`tag ${currentEquipmentAlarms.length === 0 ? 'good' : 'bad'}`}>
                        {currentEquipmentAlarms.length}
                      </span>
                    </div>

                    <div className="status-item">
                      <span className="lbl">Incidents</span>
                      <span className={`tag ${(loc.incidents || 0) === 0 ? 'good' : 'bad'}`}>
                        {loc.incidents || 0}
                      </span>
                    </div>

                    <div className="status-item">
                      <span className="lbl">Level of service</span>
                      <span className={`tag ${['A', 'B'].includes(loc.los) ? 'good' : ['C', 'D'].includes(loc.los) ? 'warn' : 'bad'}`}>
                        {loc.los || 'A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Audit Log Card (Replacing Equipment Health) */}
                <div className="ov-audit-feed-card">
                  <div className="card-title">Audit Log</div>
                  <div className="ov-audit-feed-list">
                    {(auditLogs && auditLogs.length > 0 ? auditLogs : [
                      { time: '14:31:02', sev: 'warning', mod: 'AVDS', ev: 'Sensor signal degraded — KM7.5NB', u: 'system' },
                      { time: '14:24:00', sev: 'operation', mod: 'SMARTLANE', ev: 'Activated manually by operator', u: 'admin' },
                      { time: '13:58:41', sev: 'critical', mod: 'CCTV', ev: 'Camera offline — KM46.2NB', u: 'system' },
                      { time: '12:10:15', sev: 'operation', mod: 'LCS', ev: 'Bulk state updated to MATCH_LANE', u: 'admin' }
                    ]).slice(0, 4).map((log, idx) => (
                      <div key={idx} className="ov-audit-feed-item">
                        <span className={`sev-dot-pill ${log.sev === 'critical' ? 'crit' : log.sev === 'warning' ? 'warn' : 'good'}`}></span>
                        <div className="audit-feed-main">
                          <span className="audit-feed-ev">{log.event || log.ev || log.action}</span>
                          <span className="audit-feed-meta">{log.user || log.u || 'admin'} • {log.time || '14:24:00'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* GIS EQUIPMENT MAP AND SCHEMATIC */}
        {activeTab === 'map' && <EquipmentGIS loc={loc} devices={equipmentRecords} onOpenAnalytics={() => setActiveTab('analytics')} />}
        {activeTab === 'schematic' && <EquipmentSchematic loc={loc} devices={equipmentRecords} />}
        {/* VMS CONTROL & EDITOR TAB */}
        {activeTab === 'vms' && (
          <VmsWorkflow loc={loc} devices={equipmentRecords} state={phase6} dispatch={onPhase6} editable={caps.vmsEdit} initialModule={vmsModuleType === 'miniVms' ? 'Mini VMS' : 'VMS'} />
        )}

        {/* ROAD LAYOUT DESIGNER TAB */}
        {activeTab === 'designer' && (
          <div className="tab-panel active" style={{ padding: 0, height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <RoadLayoutDesigner
              initialLoc={loc}
              onSaveLayout={(updatedLoc) => {
                onUpdateLoc(loc.id, updatedLoc);
              }}
              onShowToast={onShowToast}
            />
          </div>
        )}

        {/* SCHEDULE TAB */}
        {['schedule', 'exceptions'].includes(activeTab) && (
          <Schedule key={`${loc.id}:${activeTab}`} loc={loc} locations={locations} store={scheduleStore} now={operationNow} dispatch={onOperation} operations={operations} kind={activeTab === 'exceptions' ? 'exceptions' : 'schedules'} />
        )}

        {/* LOG TAB */}
        {activeTab === 'equipment' && <EquipmentMonitoring key={loc.id} locationId={loc.id} records={equipmentRecords} locations={locations} />}
        {activeTab === 'log' && (
          <div className="tab-panel active equipment-log-page">
            <EquipmentAlarms records={devices} onDetails={setSelectedDeviceId} />
            <h2>Historical audit records</h2>
            <AuditLogDisplay
              auditLogs={auditLogs}
              locations={locations}
              user={user}
              onShowToast={onShowToast}
              currentLocationFilter={loc.id}
            />
          </div>
        )}

        {['reports','analytics','maintenance','health','housekeeping'].includes(activeTab) && <div className="tab-panel active"><Phase5 kind={activeTab} loc={loc} devices={equipmentRecords} auditLogs={auditLogs} operations={operations} state={phase5} dispatch={onPhase5} onAdmin={onAdmin} actorId={user?.username || 'demo'} now={operationNow} editable={caps.maintenanceEdit} /></div>}

        {/* SETTINGS TAB */}
        {['settings', 'groups', 'users'].includes(activeTab) && caps.configure && <Administration key={`${loc.id}:${activeTab}`} kind={activeTab} loc={loc} locations={administrationLocations} devices={equipmentRecords} state={administration} dispatch={onAdmin} />}
      </div>

      {selectedDevice && <DeviceDetails key={selectedDevice.id} device={selectedDevice} onClose={closeDevice} />}

    </div>
  );
}
