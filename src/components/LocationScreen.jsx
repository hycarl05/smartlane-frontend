import React, { useState } from 'react';
import Topbar from './Topbar';
import Schedule from './Schedule';
import VmsEditor, { VmsEditorSection, DEFAULT_ROLE_TEMPLATES, getDynamicVmsMessage } from './VmsEditor';
import CctvModal from './CctvModal';
import AuditLogDisplay from './AuditLogDisplay';
import RoadLayoutDesigner from './RoadLayoutDesigner';
import RoadSchematicView from './RoadSchematicView';
import MapView from './MapView';
import {
  fmtElapsed,
  SCHEDULE_ITEMS,
  WEEK_DAYS,
  LOG_ENTRIES,
  REPORT_TYPES,
  RECENT_REPORTS
} from '../data';

export default function LocationScreen({
  loc,
  locations = [],
  auditLogs = [],
  onSelectLocation,
  activeTab,
  setActiveTab,
  onBack,
  time,
  date,
  user,
  onLogout,
  onUpdateLoc,
  onShowToast,
  hideTopbars = false
}) {
  const [extendMin, setExtendMin] = useState(0);
  const [showPausePopover, setShowPausePopover] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [reportType, setReportType] = useState(0);
  const [reportPeriod, setReportPeriod] = useState('Weekly');
  const [logState, setLogState] = useState(LOG_ENTRIES);
  const [showPhaseReportModal, setShowPhaseReportModal] = useState(false);

  // VMS Editor Modal State
  const [showVmsEditor, setShowVmsEditor] = useState(false);
  const [vmsModuleType, setVmsModuleType] = useState('vms'); // 'vms' | 'miniVms'

  // CCTV Inspection Modal State
  const [selectedCctv, setSelectedCctv] = useState(null);

  const handleOpenVmsEditor = (type = 'vms') => {
    setVmsModuleType(type);
    setShowVmsEditor(true);
  };

  if (!loc) return null;

  const isActive = loc.status === 'active';
  const isPending = loc.status === 'pending';

  const addLogEntry = (sev, event, user = 'admin') => {
    const now = new Date();
    const tStr = now.toLocaleTimeString('en-GB', { hour12: false });
    setLogState(prev => [
      { time: tStr, sev, mod: 'SMARTLANE', event, user },
      ...prev
    ]);
  };

  const handleTogglePrimary = () => {
    handleStartPhase1();
  };

  const handleDismissPrompt = () => {
    onUpdateLoc(loc.id, {
      status: 'inactive',
      phase: 0,
      phaseLabel: 'Standby'
    });
    addLogEntry('operation', `Dismissed activation recommendation for ${loc.name}`);
    onShowToast('Activation recommendation dismissed');
  };

  const handleStartPhase1 = () => {
    // Phase 1: Pre-Activation (Initiates 3-min pre-activation cycle)
    onUpdateLoc(loc.id, {
      status: 'active',
      phase: 1,
      phaseLabel: 'Phase 1: Pre-Activation (Warning Cycle)',
      phaseTimer: 180, // 3-minute warning cycle
      elapsedSeconds: 0,
      ps: time,
      pe: 'Scheduled',
      timestamps: {
        ...(loc.timestamps || {}),
        p1PreActivation: time
      }
    });
    addLogEntry('operation', `Initiated Phase 1: Pre-Activation cycle (3 min warning) for ${loc.name}`);
    onShowToast(`Phase 1 Pre-Activation started (3 min countdown)`);
  };

  const handleStartPhase2Now = () => {
    // Skip directly to Phase 2: Active Operation
    const updatedLCS = loc.lcs.map(item => ({ ...item, open: true }));
    onUpdateLoc(loc.id, {
      status: 'active',
      phase: 2,
      phaseLabel: 'Phase 2: Active Operation',
      phaseTimer: 0,
      lcs: updatedLCS,
      timestamps: {
        ...(loc.timestamps || {}),
        p2Activation: time
      }
    });
    addLogEntry('operation', `Phase 2 Active Operation confirmed — Emergency Lane OPEN on ${loc.name}`);
    onShowToast(`Phase 2 Active: Emergency Lane OPEN`);
  };

  const handleStartPhase3Deactivation = () => {
    // Phase 3: Pre-Deactivation (Initiates 3-min pre-deactivation cycle)
    onUpdateLoc(loc.id, {
      status: 'active',
      phase: 3,
      phaseLabel: 'Phase 3: Pre-Deactivation (Closure Warning)',
      phaseTimer: 180, // 3-minute deactivation cycle
      timestamps: {
        ...(loc.timestamps || {}),
        p3PreDeactivation: time
      }
    });
    addLogEntry('operation', `Initiated Phase 3: Pre-Deactivation cycle (3 min warning) for ${loc.name}`);
    onShowToast(`Phase 3 Pre-Deactivation started (3 min countdown)`);
  };

  const handleDeactivatePhase4And5 = () => {
    // Phase 4: Deactivation (Revert LCS to Red X) -> Phase 5 (Post-Activation)
    const updatedLCS = loc.lcs.map(item => ({ ...item, open: false }));
    onUpdateLoc(loc.id, {
      status: 'inactive',
      phase: 4,
      phaseLabel: 'Phase 4: Deactivation (LCS Red X)',
      phaseTimer: 5,
      lcs: updatedLCS,
      timestamps: {
        ...(loc.timestamps || {}),
        p4Deactivation: time
      }
    });
    addLogEntry('operation', `Phase 4 Deactivation: Smartlane CLOSED on ${loc.name}`);
    onShowToast(`Phase 4 Deactivated: Smartlane CLOSED`);
  };

  const handleStartPhase5Report = () => {
    onUpdateLoc(loc.id, {
      status: 'inactive',
      phase: 5,
      phaseLabel: 'Phase 5: Post-Activation & Reporting',
      phaseTimer: 0,
      timestamps: {
        ...(loc.timestamps || {}),
        p5PostDeactivation: time
      }
    });
    addLogEntry('operation', `Entered Phase 5: Post-Activation Report for ${loc.name}`);
    onShowToast(`Phase 5: Operational Report Ready`);
    setShowPhaseReportModal(true);
  };

  const handlePauseReason = (reason) => {
    setShowPausePopover(false);
    onUpdateLoc(loc.id, {
      status: 'inactive',
      phase: 0,
      phaseLabel: 'Standby'
    });
    addLogEntry('warning', `Intervention: ${reason}`);
    onShowToast(`Intervention logged: ${reason}`);
  };

  const handleToggleLCS = (idx) => {
    const newLCS = [...loc.lcs];
    newLCS[idx] = { ...newLCS[idx], open: !newLCS[idx].open };
    onUpdateLoc(loc.id, { lcs: newLCS });
    addLogEntry('operation', `Toggled LCS ${newLCS[idx].km} to ${newLCS[idx].open ? 'OPEN' : 'CLOSED'}`);
    onShowToast(`LCS ${newLCS[idx].km} set to ${newLCS[idx].open ? 'OPEN' : 'CLOSED'}`);
  };

  const handleMatchLCS = () => {
    const shouldOpen = loc.status === 'active';
    const newLCS = loc.lcs.map(item => ({ ...item, open: shouldOpen }));
    onUpdateLoc(loc.id, { lcs: newLCS });
    addLogEntry('operation', `Matched all LCS tiles to ${shouldOpen ? 'OPEN' : 'CLOSED'}`);
    onShowToast(`All LCS tiles matched to lane state (${shouldOpen ? 'OPEN' : 'CLOSED'})`);
  };

  const handleToggleThreshold = () => {
    const nextVal = !loc.thresholdArmed;
    onUpdateLoc(loc.id, { thresholdArmed: nextVal });
    addLogEntry('operation', `Traffic threshold monitor ${nextVal ? 'ARMED' : 'DISARMED'}`);
    onShowToast(`Threshold monitor ${nextVal ? 'ARMED' : 'DISARMED'}`);
  };

  const handleSetMode = (mode) => {
    onUpdateLoc(loc.id, { mode });
    addLogEntry('operation', `Mode changed to ${mode.toUpperCase()}`);
    onShowToast(`Mode set to ${mode.toUpperCase()}`);
  };

  const handleExtend = (delta) => {
    const next = Math.max(0, extendMin + delta);
    setExtendMin(next);
    onShowToast(`Operation extended by +${next} min`);
  };

  const filteredLogs = logState.filter(l => {
    if (logFilter === 'all') return true;
    return l.sev === logFilter;
  });

  const isOverviewOrCorridor = activeTab === 'overview' || activeTab === 'corridor';

  return (
    <div className="screen active unified-location-shell">
      {!hideTopbars && (
        <>
          <div className="topbar">
            <button className="back-btn" onClick={onBack}>← All Locations</button>
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

          <div className="tabbar">
            <button
              className={`tab-btn ${activeTab === 'overview' || activeTab === 'corridor' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              Schedule
            </button>
            <button
              className={`tab-btn ${activeTab === 'log' ? 'active' : ''}`}
              onClick={() => setActiveTab('log')}
            >
              Alarms &amp; Log
              {loc.alarms?.length > 0 && <span className="badge">{loc.alarms.length}</span>}
            </button>
            <button
              className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              Reports
            </button>
            <button
              className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              Settings
            </button>
            <button
              className={`tab-btn ${activeTab === 'designer' ? 'active' : ''}`}
              onClick={() => setActiveTab('designer')}
            >
              🎨 Road Studio
            </button>
            <button
              className={`tab-btn ${activeTab === 'vms' ? 'active' : ''}`}
              onClick={() => setActiveTab('vms')}
            >
              📺 VMS Editor
            </button>
            <button
              className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
            >
              🗺️ GIS Map
            </button>
          </div>
        </>
      )}

      <div className="tab-panels">
        {/* OVERVIEW / CORRIDOR TAB */}
        {isOverviewOrCorridor && (
          <div className="tab-panel active">
            {/* Prompt Banner if Pending */}
            {isPending && (
              <div className="prompt-banner">
                <div>
                  <div className="pt1">⚠ Congestion threshold reached</div>
                  <div className="pt2">{loc.phaseLabel || 'Congestion threshold exceeded'} — system recommends activating Smart Lane now.</div>
                </div>
                <div className="prompt-actions">
                  <button className="accept" onClick={handleStartPhase1}>Accept &amp; Activate</button>
                  <button className="dismiss" onClick={handleDismissPrompt}>Dismiss</button>
                </div>
              </div>
            )}

            {/* 1. HERO BAND */}
            <div className={`hero-band ${loc.status}`}>
              <div className="hero-left">
                <div className="hero-status">
                  <div className="big-dot"></div>
                  <div className="hero-status-text">
                    {loc.status === 'active' ? 'SMART LANE ACTIVE' : loc.status === 'pending' ? 'PENDING DECISION' : 'SMART LANE INACTIVE'}
                    <small>
                      {loc.status === 'active'
                        ? `Phase ${loc.phase || 2} of 5 · ${loc.phaseLabel || 'Activation'}`
                        : loc.status === 'pending'
                        ? loc.phaseLabel
                        : `Mode: ${(loc.mode || 'scheduled').charAt(0).toUpperCase() + (loc.mode || 'scheduled').slice(1)}`}
                    </small>
                  </div>
                </div>

                <div className="hero-facts">
                  <div className="hfact">
                    <div className="lbl">Elapsed</div>
                    <div className="val">{isActive ? fmtElapsed(loc.elapsedSeconds || 0) : '—'}</div>
                  </div>
                  <div className="hfact">
                    <div className="lbl">Planned start</div>
                    <div className="val">{loc.ps || '—'}</div>
                  </div>
                  <div className="hfact">
                    <div className="lbl">Planned end</div>
                    <div className="val">{loc.pe || '—'}</div>
                  </div>
                  <div className="hfact">
                    <div className="lbl">Level of service</div>
                    <div className="val">{loc.los || 'A'}</div>
                  </div>
                </div>
              </div>

              <div className="hero-controls">
                {isActive ? (
                  <button className="primary-toggle to-deactivate" onClick={handleStartPhase3Deactivation}>
                    Deactivate Smart Lane
                  </button>
                ) : (
                  <button className="primary-toggle to-activate" onClick={handleStartPhase1}>
                    Activate Smart Lane
                  </button>
                )}

                <div style={{ position: 'relative' }}>
                  <button
                    className="mini-btn warn-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPausePopover(!showPausePopover);
                    }}
                  >
                    Pause / Manual
                  </button>
                  {showPausePopover && (
                    <div className="popover show" style={{ top: '110%', right: 0 }}>
                      <div className="ptitle">Reason for intervention</div>
                      <button onClick={() => handlePauseReason('Breakdown / accident — obstructing lane')}>
                        Breakdown/accident — obstructing
                      </button>
                      <button onClick={() => handlePauseReason('Breakdown / accident — not obstructing lane')}>
                        Breakdown/accident — not obstructing
                      </button>
                      <button onClick={() => handlePauseReason('Vehicle towed — resuming operation')}>
                        Vehicle towed — resuming
                      </button>
                      <button className="cancel" onClick={() => setShowPausePopover(false)}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div className="extend-group">
                  <button className="sq-btn" onClick={() => handleExtend(-15)}>−</button>
                  <div className="extend-val">+{extendMin} min</div>
                  <button className="sq-btn" onClick={() => handleExtend(15)}>+</button>
                </div>

                <div className="switch-group">
                  <span className="lbl">Threshold</span>
                  <div
                    className={`switch ${loc.thresholdArmed ? 'on' : ''}`}
                    onClick={handleToggleThreshold}
                  >
                    <div className="knob"></div>
                  </div>
                </div>

                <div className="mode-row">
                  {['manual', 'scheduled', 'automated'].map((m) => (
                    <div
                      key={m}
                      className={`mode-chip ${(loc.mode || 'scheduled') === m ? 'on' : ''}`}
                      onClick={() => handleSetMode(m)}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. LIVE ROUTE TIMELINE (SIGNATURE HIGHWAY TRACK) */}
            <div className="route-card">
              <div className="route-head">
                <div className="route-title">
                  Live Route Timeline<span className="sub"> — {loc.direction || 'Northbound'}</span>
                </div>
                <button className="match-btn" onClick={handleMatchLCS}>
                  Match LCS to lane state
                </button>
              </div>

              <div className="route-track-wrap">
                <div className={`route-road ${isActive ? 'active' : ''}`}>
                  <div className="dashes"></div>
                  <div className="flow-overlay"></div>
                </div>

                <div className="stems">
                  {(loc.gantries || [
                    { km: 'KM1.95NB', type: 'CCTV', status: 'ok' },
                    { km: 'ET1.72@STA', type: 'CCTV', status: 'ok' },
                    { km: 'STA I/C', type: 'CCTV', status: 'ok' },
                    { km: 'KM4.5SB', type: 'CCTV', status: 'ok' },
                    { km: 'KM5.9NB', type: 'CCTV', status: 'ok' },
                    { km: 'KM7.0NB', type: 'CCTV', status: 'ok' },
                    { km: 'KM8.2NB', type: 'CCTV', status: 'off' }
                  ]).map((g, i) => {
                    const lcsItem = (loc.lcs || [])[i];
                    const trafficItem = (loc.traffic || [])[i];
                    const isOff = g.status === 'off';

                    return (
                      <div key={i} className="stem">
                        <div className={`stem-icon ${isOff ? 'off' : 'ok'}`}>
                          {isOff ? '✕' : '◉'}
                        </div>
                        <div className="stem-km">{g.km}</div>
                        {lcsItem && (
                          <div
                            className={`stem-lcs ${lcsItem.open ? 'open' : 'closed'}`}
                            onClick={() => handleToggleLCS(i)}
                            title="Click to toggle LCS sign"
                          >
                            {lcsItem.open ? '↑ OPEN' : '✕ SHUT'}
                          </div>
                        )}
                        {trafficItem && (
                          <div className="stem-traffic">
                            <span><b>{trafficItem.spd}</b>kmh</span>
                            <span><b>{trafficItem.vol}</b>v</span>
                            <span><b>{trafficItem.occ}%</b></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                <div className="card-title">Live Cameras</div>
                <div className="cam-grid cam-grid-4">
                  {(loc.cctv || ['KM1.95NB', 'ET1.72@STA', 'STA I/C', 'KM4.5SB']).slice(0, 4).map((cam, idx) => (
                    <div
                      key={idx}
                      className="cam-tile clickable-cam-tile"
                      onClick={() => setSelectedCctv({ km: cam, status: 'ok', type: 'CCTV' })}
                      title={`Click to enlarge ${cam} feed`}
                    >
                      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
                        <polygon points="40,60 60,60 54,0 46,0" fill="#3b4a70" />
                        <line x1="50" y1="0" x2="50" y2="60" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                      </svg>
                      <div className="cam-hover-zoom-hint">🔍 Enlarge</div>
                      <div className="cam-label">
                        <span>{cam}</span>
                        <span className="rec-dot"></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Stack of VMS Messages, System Status, & Audit Log */}
              <div className="side-stack">
                {/* 1. Mini VMS Messages */}
                <div className="vms-card">
                  <div className="card-title">Mini VMS Messages</div>
                  <div>
                    {(loc.vmsBoards || [
                      { km: 'KM4.91NB', msg: 'HATI-HATI KETIKA MEMANDU' },
                      { km: 'KM6.0NB', msg: 'JALUR KECEMASAN DIBUKA SEMENTARA' }
                    ]).map((b, idx) => (
                      <div key={idx} className="vms-msg-row">
                        <span className="vms-msg">{b.msg}</span>
                        <span className="vms-km">{b.km}</span>
                      </div>
                    ))}
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
                      <span className={`tag ${(loc.alarms || []).length === 0 ? 'good' : 'bad'}`}>
                        {(loc.alarms || []).length}
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



        {/* GIS LIVE MAP TAB */}
        {activeTab === 'map' && (
          <div className="tab-panel active" style={{ padding: 0, height: 'calc(100vh - 130px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 20px', background: 'var(--panel-bg, #1e293b)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>🗺️ Live GIS Map — {loc.name}</span>
                <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}>Real-time location &amp; gantry maplibre visualization</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: loc.status === 'active' ? '#10b98122' : '#64748b22', color: loc.status === 'active' ? '#10b981' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '600' }}>
                  Status: {loc.status.toUpperCase()}
                </span>
                <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '6px', background: '#2563eb22', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)', fontWeight: '600' }}>
                  Direction: {loc.direction}
                </span>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
              <MapView
                center={loc.coordinates || [101.7650, 2.8910]}
                zoom={13}
                locations={[loc]}
                interactive={true}
                containerStyle={{ borderRadius: 0 }}
              />
            </div>
          </div>
        )}

        {/* VMS CONTROL & EDITOR TAB */}
        {activeTab === 'vms' && (
          <VmsEditorSection
            loc={loc}
            locations={locations}
            onUpdateLoc={onUpdateLoc}
            onShowToast={onShowToast}
          />
        )}

        {/* ROAD LAYOUT DESIGNER TAB */}
        {activeTab === 'designer' && (
          <div className="tab-panel active" style={{ padding: 0, height: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <RoadLayoutDesigner
              initialLoc={loc}
              onSaveLayout={(updatedLoc) => {
                onUpdateLoc(loc.id, updatedLoc);
                addLogEntry('operation', `Road path and equipment layout re-configured for ${updatedLoc.name}`);
              }}
              onShowToast={onShowToast}
            />
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <Schedule loc={loc} onShowToast={onShowToast} />
        )}

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="tab-panel active">
            <AuditLogDisplay
              auditLogs={auditLogs}
              locations={locations}
              user={user}
              onShowToast={onShowToast}
              currentLocationFilter={loc.name}
            />
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div className="tab-panel active">
            <div className="reports-grid">
              <div className="panel" style={{ minHeight: 0 }}>
                <div className="panel-title">Generate Report</div>
                <div className="report-types">
                  {REPORT_TYPES.map((r, idx) => (
                    <div
                      key={idx}
                      className={`rtype ${reportType === idx ? 'sel' : ''}`}
                      onClick={() => setReportType(idx)}
                    >
                      <div className="t1">{r.title}</div>
                      <div className="t2">{r.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="period-row">
                  {['Weekly', 'Monthly', 'Annual'].map(p => (
                    <div
                      key={p}
                      className={`period-chip ${reportPeriod === p ? 'on' : ''}`}
                      onClick={() => setReportPeriod(p)}
                    >
                      {p}
                    </div>
                  ))}
                </div>

                <button
                  className="gen-btn"
                  onClick={() => onShowToast(`Generated ${REPORT_TYPES[reportType].title} (${reportPeriod})`)}
                >
                  Generate PDF
                </button>
              </div>

              <div className="panel" style={{ minHeight: 0 }}>
                <div className="panel-title">Recently Generated</div>
                <div className="recent-reports">
                  {RECENT_REPORTS.map((r, idx) => (
                    <div key={idx} className="rrow">
                      <span className="name">{r.name}</span>
                      <a
                        href="#"
                        className="dl"
                        onClick={(e) => {
                          e.preventDefault();
                          onShowToast(`Downloading ${r.name}`);
                        }}
                      >
                        Download PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="tab-panel active">
            <div className="settings-grid">
              <div className="panel" style={{ minHeight: 0 }}>
                <div className="panel-title">
                  Equipment Configuration —{' '}
                  <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>
                    {loc.name}
                  </span>
                </div>
                <div className="eq-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Equipment ID</th>
                        <th>Type</th>
                        <th>Location (KM)</th>
                        <th>IP Address</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {loc.gantries.map((g, idx) => (
                        <tr key={idx}>
                          <td className="mono">EQ-{loc.id.toUpperCase()}-0{idx + 1}</td>
                          <td>{g.type}</td>
                          <td className="mono">{g.km}</td>
                          <td className="mono">10.180.4.{10 + idx}</td>
                          <td>
                            <span className={`pill-status ${g.status === 'ok' ? 'good' : 'bad'}`}>
                              {g.status === 'ok' ? 'ONLINE (24/7 REC)' : 'HARDWARE FAULT'}
                            </span>
                          </td>
                          <td>
                            {g.type === 'CCTV' ? (
                              <button
                                className="mini-btn good-btn"
                                style={{ padding: '2px 8px', fontSize: '11px' }}
                                onClick={() => setSelectedCctv(g)}
                              >
                                📹 Stream Feed
                              </button>
                            ) : (
                              <a
                                href="#"
                                className="edit-link"
                                onClick={(e) => {
                                  e.preventDefault();
                                  onShowToast(`Configure EQ-${loc.id.toUpperCase()}-0${idx + 1}`);
                                }}
                              >
                                Configure
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* VMS & MINI VMS MESSAGE TEMPLATE EDITOR MODAL */}
      <VmsEditor
        isOpen={showVmsEditor}
        onClose={() => setShowVmsEditor(false)}
        moduleType={vmsModuleType}
        loc={loc}
        locations={locations}
        onUpdateLoc={onUpdateLoc}
        onShowToast={onShowToast}
      />

      {/* CCTV LIVE STREAM & INSPECTION MODAL */}
      {selectedCctv && (
        <CctvModal
          cctv={selectedCctv}
          locName={loc.name}
          onClose={() => setSelectedCctv(null)}
          onLogAudit={addLogEntry}
          onShowToast={onShowToast}
        />
      )}

      {/* PHASE 5 OPERATIONAL SUMMARY REPORT MODAL */}
      {showPhaseReportModal && (
        <div className="modal-overlay show" onClick={() => setShowPhaseReportModal(false)}>
          <div className="modal-content phase-report-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Phase 5 Operational Summary Report</h2>
              <button className="close-btn" onClick={() => setShowPhaseReportModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="report-header-card">
                <div className="report-loc-name">{loc.name}</div>
                <div className="report-direction">Direction: <b>{loc.direction}</b></div>
                <div className="report-status-badge phase-5">Phase 5 Complete</div>
              </div>

              <div className="report-metrics-grid">
                <div className="metric-box">
                  <span className="lbl">Total Active Duration</span>
                  <span className="val">{fmtElapsed(loc.elapsedSeconds || 10800)}</span>
                </div>
                <div className="metric-box">
                  <span className="lbl">Traffic Processed</span>
                  <span className="val">14,250 veh</span>
                </div>
                <div className="metric-box">
                  <span className="lbl">Avg Speed in Lane</span>
                  <span className="val">76.8 km/h</span>
                </div>
                <div className="metric-box">
                  <span className="lbl">Level of Service</span>
                  <span className="val good">LOS {loc.los || 'A'}</span>
                </div>
              </div>

              <div className="report-section-title">⏱️ Operational Phase Timestamps</div>
              <div className="report-timestamps-list">
                <div className="t-row">
                  <span>Phase 1 (Pre-Start Warning):</span>
                  <b>{loc.timestamps?.p1PreActivation || '14:00:00'}</b>
                </div>
                <div className="t-row">
                  <span>Phase 2 (Start / Active Operation):</span>
                  <b>{loc.timestamps?.p2Activation || '14:03:00'}</b>
                </div>
                <div className="t-row">
                  <span>Phase 3 (Pre-Stop Closure Warning):</span>
                  <b>{loc.timestamps?.p3PreDeactivation || '17:27:00'}</b>
                </div>
                <div className="t-row">
                  <span>Phase 4 (Stop / LCS Red X):</span>
                  <b>{loc.timestamps?.p4Deactivation || '17:30:00'}</b>
                </div>
                <div className="t-row">
                  <span>Phase 5 (Post-Activation Report):</span>
                  <b>{loc.timestamps?.p5PostDeactivation || time}</b>
                </div>
              </div>

              <div className="report-section-title">📡 Connected Equipment Telemetry Audit</div>
              <div className="report-equip-status">
                <div className="eq-item">LCS Gantries: <b className="good">100% Operational (Synced to Red X on Close)</b></div>
                <div className="eq-item">VMS Displays: <b className="good">100% Synced (Broadcast Phase 1-5 Messages)</b></div>
                <div className="eq-item">CCTV Feed: <b className="good">No Emergency Obstructions Detected</b></div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="action-btn secondary" onClick={() => setShowPhaseReportModal(false)}>Close</button>
              <button className="action-btn primary" onClick={() => {
                onShowToast('Phase 5 Operational Report exported to PDF');
                setShowPhaseReportModal(false);
              }}>🖨️ Export PDF / Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
