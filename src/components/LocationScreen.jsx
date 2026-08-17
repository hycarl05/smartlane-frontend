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
  onShowToast
}) {
  const [extendMin, setExtendMin] = useState(0);
  const [showPausePopover, setShowPausePopover] = useState(false);
  const [logFilter, setLogFilter] = useState('all');
  const [reportType, setReportType] = useState(0);
  const [reportPeriod, setReportPeriod] = useState('Weekly');
  const [logState, setLogState] = useState(LOG_ENTRIES);

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

  return (
    <div className="screen active" style={{ position: 'relative' }}>
      <div className="loc-topbar">
        <button className="back-btn" onClick={onBack}>← All Locations</button>

        <div className="loc-dropdown-wrap">
          <span className="loc-label-prefix">LOCATION:</span>
          <select
            className="loc-select-dropdown"
            value={loc.id}
            onChange={(e) => {
              if (onSelectLocation) {
                onSelectLocation(e.target.value, activeTab);
              }
            }}
          >
            {locations.map(l => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.direction})
              </option>
            ))}
          </select>
        </div>

        <div className="topbar-right" style={{ marginLeft: 'auto' }}>
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
        {['overview', 'map', 'vms', 'designer', 'schedule', 'log', 'reports', 'settings'].map(tabKey => (
          <button
            key={tabKey}
            className={`tab-btn ${activeTab === tabKey ? 'active' : ''}`}
            onClick={() => setActiveTab(tabKey)}
          >
            {tabKey === 'map'
              ? '🗺️ GIS Live Map'
              : tabKey === 'vms'
              ? '📺 VMS Control & Editor'
              : tabKey === 'designer'
              ? '🎨 Road Layout Designer'
              : tabKey === 'log'
              ? 'Alarms & Log'
              : tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
            {tabKey === 'log' && loc.alarms.length > 0 && (
              <span className="badge">{loc.alarms.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-panels">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="tab-panel active">
            <div className="ov-wrapper">

              {/* ── LEFT COLUMN ─────────────────────────────────────── */}
              <div className="ov-left-col">

                {/* 1. Operation Control */}
                <div className="panel" style={{ position: 'relative' }}>
                  <div className="panel-title">
                    <span>Operation Control</span>
                    <span className={`op-phase-badge phase-${loc.phase || 0}`}>
                      {loc.phase === 1 ? 'Phase 1' :
                        loc.phase === 2 ? 'Phase 2' :
                          loc.phase === 3 ? 'Phase 3' :
                            loc.phase === 4 ? 'Phase 4' :
                              loc.phase === 5 ? 'Phase 5' : 'Standby'}
                    </span>
                  </div>

                  {isPending && (
                    <div className="prompt-banner">
                      <div className="t1">⚠ Congestion threshold reached</div>
                      <div className="t2">System recommends activating Smartlane now.</div>
                      <div className="prompt-actions">
                        <button className="accept" onClick={handleTogglePrimary}>Accept & Activate</button>
                        <button className="dismiss" onClick={handleDismissPrompt}>Dismiss</button>
                      </div>
                    </div>
                  )}

                  {/* STATUS DISPLAY */}
                  <div className={`op-status ${loc.status}`}>
                    <div className="big-dot"></div>
                    <div className="op-status-text">
                      {loc.phase === 1 ? 'PHASE 1: PRE-ACTIVATION' :
                        loc.phase === 2 ? 'PHASE 2: ACTIVE OPERATION' :
                          loc.phase === 3 ? 'PHASE 3: PRE-DEACTIVATION' :
                            loc.phase === 4 ? 'PHASE 4: DEACTIVATING' :
                              loc.phase === 5 ? 'PHASE 5: POST-ACTIVATION' : 'STANDBY / INACTIVE'}
                      <small>{loc.phaseLabel || 'Standby Mode'}</small>
                    </div>
                  </div>

                  {(loc.phase === 1 || loc.phase === 3) && (loc.phaseTimer > 0) && (
                    <div className="phase-timer-banner">
                      <span className="timer-icon">⏳</span>
                      <span>Automated Cycle: <b>{Math.floor(loc.phaseTimer / 60)}m {loc.phaseTimer % 60}s</b> remaining</span>
                    </div>
                  )}

                  <div className="op-facts">
                    <div className="op-fact">
                      <div className="lbl">Elapsed</div>
                      <div className="val">{isActive ? fmtElapsed(loc.elapsedSeconds) : '—'}</div>
                    </div>
                    <div className="op-fact">
                      <div className="lbl">Level of Service</div>
                      <div className="val">{loc.los}</div>
                    </div>
                    <div className="op-fact">
                      <div className="lbl">Planned Start</div>
                      <div className="val">{loc.ps}</div>
                    </div>
                    <div className="op-fact">
                      <div className="lbl">Planned End</div>
                      <div className="val">{loc.pe}</div>
                    </div>
                  </div>

                  {/* ACTION CONTROLS — Single sequential button for current phase step */}
                  <div className="phase-actions-group">
                    {(!isActive && (loc.phase === 0 || !loc.phase)) && (
                      <button className="primary-toggle to-activate" onClick={handleStartPhase1}>
                        ▶ INITIATE PHASE 1 (PRE-ACTIVATION WARNING)
                      </button>
                    )}
                    {loc.phase === 1 && (
                      <button className="primary-toggle to-activate" onClick={handleStartPhase2Now}>
                        ✅ CONFIRM PHASE 2 (OPEN EMERGENCY LANE)
                      </button>
                    )}
                    {loc.phase === 2 && (
                      <button className="primary-toggle to-deactivate" onClick={handleStartPhase3Deactivation}>
                        ⚠️ INITIATE PHASE 3 (PRE-DEACTIVATION WARNING)
                      </button>
                    )}
                    {loc.phase === 3 && (
                      <button className="primary-toggle to-deactivate" onClick={handleDeactivatePhase4And5}>
                        🛑 CONFIRM PHASE 4 (CLOSE EMERGENCY LANE)
                      </button>
                    )}
                    {loc.phase === 5 && (
                      <button className="mini-btn neutral-btn" style={{ width: '100%' }} onClick={() => onShowToast('Compiling Smart Lane Activation Report...')}>
                        📄 Compile Phase 5 Activation Report
                      </button>
                    )}
                  </div>

                  <div className="row-btns">
                    <button
                      className="mini-btn warn-btn"
                      onClick={() => setShowPausePopover(!showPausePopover)}
                    >
                      Pause / Manual
                    </button>
                  </div>

                  {showPausePopover && (
                    <div className="popover show" style={{ top: '160px', left: '10px' }}>
                      <div className="ptitle">Reason for intervention</div>
                      <button onClick={() => handlePauseReason('Breakdown / accident obstructing lane')}>
                        Breakdown/accident — obstructing
                      </button>
                      <button onClick={() => handlePauseReason('Breakdown / accident not obstructing lane')}>
                        Breakdown/accident — not obstructing
                      </button>
                      <button onClick={() => handlePauseReason('Vehicle towed, resuming operation')}>
                        Vehicle towed — resuming
                      </button>
                      <button className="cancel" onClick={() => setShowPausePopover(false)}>
                        Cancel
                      </button>
                    </div>
                  )}

                  <div className="extend-row">
                    <button className="sq-btn" onClick={() => handleExtend(-15)}>−</button>
                    <div className="val">+{extendMin} min</div>
                    <button className="sq-btn" onClick={() => handleExtend(15)}>+</button>
                  </div>

                  <div className="toggle-line">
                    <div className="lbl">Traffic threshold monitor</div>
                    <div
                      className={`switch ${loc.thresholdArmed ? 'on' : ''}`}
                      onClick={handleToggleThreshold}
                    >
                      <div className="knob"></div>
                    </div>
                  </div>

                  <div className="next-run">
                    Next scheduled run: <b>{loc.nextRun}</b>
                  </div>
                </div>

                {/* 2. System Status & Equipment Health */}
                <div className="panel">
                  <div className="compact-panel-title">⚡ System Status &amp; Equipment</div>
                  <div className="status-list" style={{ marginBottom: '8px' }}>
                    <div className="status-item">
                      <span className="lbl">Traffic flow</span>
                      <span className={`tag ${loc.trafficFlow.includes('Congested') ? 'warn' : 'good'}`}>
                        {loc.trafficFlow}
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="lbl">Active alarms</span>
                      <span className={`tag ${loc.alarms.length > 0 ? 'bad' : 'good'}`}>
                        {loc.alarms.length} open
                      </span>
                    </div>
                    <div className="status-item">
                      <span className="lbl">Incidents</span>
                      <span className="tag neutral">{loc.incidents} reported</span>
                    </div>
                    <div className="status-item">
                      <span className="lbl">Level of service</span>
                      <span className={`tag ${loc.los === 'A' || loc.los === 'B' ? 'good' : 'warn'}`}>
                        LOS {loc.los}
                      </span>
                    </div>
                  </div>

                  <div className="compact-panel-title" style={{ marginTop: '6px' }}>Equipment Health</div>
                  <div className="equip-list">
                    {[
                      { name: 'CCTV Cameras', val: loc.equipment.cctv },
                      { name: 'AVDS Detectors', val: loc.equipment.avds },
                      { name: 'LCS Signs', val: loc.equipment.lcs },
                      { name: 'Entry/Exit VMS', val: loc.equipment.vms || [2, 2] },
                      { name: 'Mini VMS', val: loc.equipment.miniVms || [2, 2] },
                    ].map((eq, i) => {
                      const pct = Math.round((eq.val[0] / eq.val[1]) * 100);
                      return (
                        <div key={i} className="equip-row-bar">
                          <div className="equip-bar-top">
                            <span className="equip-bar-name">{eq.name}</span>
                            <span className="equip-bar-count"><b>{eq.val[0]}</b>/{eq.val[1]}</span>
                          </div>
                          <div className="equip-bar-track">
                            <div
                              className="equip-bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: pct === 100 ? 'var(--accent)' : pct > 60 ? 'var(--amber)' : 'var(--red)'
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Audit Log Feed */}
                <div className="panel ov-audit-panel">
                  <div className="compact-panel-title">🛡️ Audit Log</div>
                  <AuditLogDisplay
                    auditLogs={auditLogs}
                    locations={locations}
                    user={user}
                    onShowToast={onShowToast}
                    currentLocationFilter={loc.name}
                    compact={true}
                  />
                </div>

              </div>

              {/* ── RIGHT COLUMN ────────────────────────────────────── */}
              <div className="ov-right-col">

                {/* 1. Live Schematic Map */}
                <RoadSchematicView
                  loc={loc}
                  onSelectCctv={setSelectedCctv}
                  onOpenDesigner={() => setActiveTab('designer')}
                />

                {/* 2. Lane Control Signs & Traffic Metrics */}
                <div className="panel lcs-panel">
                  <div className="lcs-head">
                    <span style={{ fontSize: '10.5px', color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      Lane Control Signs
                    </span>
                    <button className="activate-all" onClick={handleMatchLCS}>
                      Match to lane state
                    </button>
                  </div>

                  <div className="lcs-row">
                    {loc.lcs.map((tile, idx) => (
                      <div
                        key={idx}
                        className={`lcs-tile ${tile.open ? 'open' : ''}`}
                        onClick={() => handleToggleLCS(idx)}
                      >
                        <div className="sym">{tile.open ? '↓' : '✕'}</div>
                        <div className="km">{tile.km}</div>
                      </div>
                    ))}
                  </div>

                  <div className="traffic-strip">
                    {loc.traffic.map((t, idx) => (
                      <div key={idx} className="tcard">
                        <div className="km">{t.km}</div>
                        <div className="metric"><span>Speed</span><b>{t.spd} km/h</b></div>
                        <div className="metric"><span>Volume</span><b>{t.vol} v/m</b></div>
                        <div className="metric"><span>Occ</span><b>{t.occ}%</b></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. VMS Panels */}
                <div className="ov-vms-row">
                  <div className="panel ov-vms-panel">
                    <div className="compact-panel-title">
                      <span>📡 Entry &amp; Exit VMS</span>
                      <button className="mini-edit-btn" onClick={() => handleOpenVmsEditor('vms')}>✏️ Edit</button>
                    </div>
                    <div className="vms-boards-wrap">
                      {(loc.vms || []).map((b) => {
                        const tpl = getDynamicVmsMessage(b, loc.phase || 0);
                        return (
                          <div
                            key={b.id || b.km}
                            className="vms-board"
                            onClick={() => handleOpenVmsEditor('vms')}
                            title="Click to edit VMS message template"
                          >
                            <div className="vms-badge">{b.type || 'VMS'}</div>
                            <div className="vms-msg">{tpl.msg}</div>
                            <div className="vms-footer">
                              <span className={`vms-health ${b.status ? b.status.toLowerCase() : 'good'}`}>● {b.status || 'Good'}</span>
                              <span className="km-tag">{b.km}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="panel ov-vms-panel">
                    <div className="compact-panel-title">
                      <span>📱 Mini VMS</span>
                      <button className="mini-edit-btn" onClick={() => handleOpenVmsEditor('miniVms')}>✏️ Edit</button>
                    </div>
                    <div className="vms-boards-wrap">
                      {(loc.miniVms || []).map((b) => {
                        const tpl = getDynamicVmsMessage(b, loc.phase || 0);
                        return (
                          <div
                            key={b.id || b.km}
                            className="vms-board"
                            onClick={() => handleOpenVmsEditor('miniVms')}
                            title="Click to edit Mini VMS message template"
                          >
                            <div className="vms-badge">{b.type || 'Mini VMS'}</div>
                            <div className="vms-msg">{tpl.msg}</div>
                            <div className="vms-footer">
                              <span className={`vms-health ${b.status ? b.status.toLowerCase() : 'good'}`}>● {b.status || 'Good'}</span>
                              <span className="km-tag">{b.km}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 3. Live Cameras (CCTV) Strip */}
                <div className="panel ov-cctv-strip">
                  <div className="compact-panel-title">📷 Live Cameras</div>
                  <div className="cctv-strip-grid">
                    {(loc.cctv || []).map((cam, idx) => (
                      <div key={idx} className="cctv-tile">
                        <svg className="cctv-road-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <polygon points="42,0 58,0 75,100 25,100" fill="#2a3a5a" opacity="0.9" />
                        </svg>
                        <div className="cctv-label">
                          <span className="cam-name">{cam}</span>
                          <span className="rec-dot"></span>
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
          <div className="tab-panel active" style={{ padding: 0, height: 'calc(100vh - 120px)' }}>
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
    </div>
  );
}
