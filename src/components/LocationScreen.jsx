import React, { useState } from 'react';
import Topbar from './Topbar';
import Schedule from './Schedule';
import VmsEditor from './VmsEditor';
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
        {['overview', 'schedule', 'log', 'reports', 'settings'].map(tabKey => (
          <button
            key={tabKey}
            className={`tab-btn ${activeTab === tabKey ? 'active' : ''}`}
            onClick={() => setActiveTab(tabKey)}
          >
            {tabKey === 'log' ? 'Alarms & Log' : tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
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
            <div className="ov-grid">
              {/* LEFT PANEL */}
              <div className="panel" style={{ position: 'relative' }}>
                <div className="panel-title">Operation Control</div>

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

                {/* 5-PHASE STATUS DISPLAY */}
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

                {/* PHASE COUNTDOWN TIMER BANNER */}
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

                {/* 5-PHASE OPERATOR ACTION CONTROLS */}
                <div className="phase-actions-group">
                  {(!isActive && (loc.phase === 0 || !loc.phase || loc.phase === 5)) && (
                    <div className="phase-btn-row">
                      <button className="primary-toggle to-activate" onClick={handleStartPhase1}>
                        ▶ START PHASE 1 (PRE-ACTIVATION CYCLE)
                      </button>
                      <button className="mini-btn good-btn" onClick={handleStartPhase2Now}>
                        ⚡ Direct Open (Phase 2)
                      </button>
                    </div>
                  )}

                  {loc.phase === 1 && (
                    <div className="phase-btn-row">
                      <button className="primary-toggle to-activate" onClick={handleStartPhase2Now}>
                        ✅ CONFIRM PHASE 2 (OPEN EMERGENCY LANE NOW)
                      </button>
                    </div>
                  )}

                  {loc.phase === 2 && (
                    <div className="phase-btn-row">
                      <button className="primary-toggle to-deactivate" onClick={handleStartPhase3Deactivation}>
                        ⚠️ INITIATE PHASE 3 (PRE-DEACTIVATION WARNING)
                      </button>
                      <button className="mini-btn bad-btn" onClick={handleDeactivatePhase4And5}>
                        🛑 Immediate Close (Phase 4)
                      </button>
                    </div>
                  )}

                  {loc.phase === 3 && (
                    <div className="phase-btn-row">
                      <button className="primary-toggle to-deactivate" onClick={handleDeactivatePhase4And5}>
                        🛑 CONFIRM PHASE 4 (CLOSE EMERGENCY LANE NOW)
                      </button>
                    </div>
                  )}

                  {loc.phase === 5 && (
                    <div className="phase-btn-row">
                      <button className="mini-btn neutral-btn" onClick={() => onShowToast('Compiling Smart Lane Activation Report...')}>
                        📄 Compile Phase 5 Activation Report
                      </button>
                    </div>
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

                <div className="mode-chips">
                  {['manual', 'scheduled', 'automated'].map(m => (
                    <div
                      key={m}
                      className={`mode-chip ${loc.mode === m ? 'on' : ''}`}
                      onClick={() => handleSetMode(m)}
                    >
                      {m.charAt(0).toUpperCase() + m.slice(1)}
                    </div>
                  ))}
                </div>

                <div className="next-run">
                  Next scheduled run: <b>{loc.nextRun}</b>
                </div>
              </div>

              {/* CENTER PANEL */}
              <div className="panel schematic-wrap">
                <div className="panel-title">
                  Live Schematic{' '}
                  <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    ({loc.direction})
                  </span>
                </div>

                <div className={`lane-banner ${loc.status}`}>
                  LANE STATE: {loc.status.toUpperCase()} — {loc.phaseLabel.toUpperCase()}
                </div>

                <div className="gantry-row">
                  {loc.gantries.map((g, idx) => (
                    <div key={idx} className="gantry">
                      <div className={`gantry-icon ${g.status}`}>{g.type === 'CCTV' ? '📷' : '🚦'}</div>
                      <div className="gantry-label">{g.km}</div>
                    </div>
                  ))}
                </div>

                <div className={`lane-visual ${isActive ? 'active' : ''}`}>
                  <div className="fill"></div>
                  <div className="flow-fill"></div>
                </div>

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

              {/* RIGHT PANEL */}
              <div className="panel">
                <div className="panel-title">System Status</div>
                <div className="status-list">
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

                <div className="panel-title" style={{ marginBottom: '2px' }}>Equipment Health</div>
                <div className="equip-list">
                  <div className="equip-row">
                    <div className="name"><span className="sw good"></span>CCTV Cameras</div>
                    <div className="count"><b>{loc.equipment.cctv[0]}</b> / {loc.equipment.cctv[1]}</div>
                  </div>
                  <div className="equip-row">
                    <div className="name"><span className="sw good"></span>AVDS Detectors</div>
                    <div className="count"><b>{loc.equipment.avds[0]}</b> / {loc.equipment.avds[1]}</div>
                  </div>
                  <div className="equip-row">
                    <div className="name"><span className="sw good"></span>LCS Signs</div>
                    <div className="count"><b>{loc.equipment.lcs[0]}</b> / {loc.equipment.lcs[1]}</div>
                  </div>
                  <div className="equip-row">
                    <div className="name"><span className="sw good"></span>Entry/Exit VMS (Standard)</div>
                    <div className="count"><b>{loc.equipment.vms ? loc.equipment.vms[0] : 2}</b> / {loc.equipment.vms ? loc.equipment.vms[1] : 2}</div>
                  </div>
                  <div className="equip-row">
                    <div className="name"><span className="sw good"></span>Mini VMS (Intermediate)</div>
                    <div className="count"><b>{loc.equipment.miniVms ? loc.equipment.miniVms[0] : 2}</b> / {loc.equipment.miniVms ? loc.equipment.miniVms[1] : 2}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: Dynamic Standard VMS & Mini VMS Display Modules */}
            <div className="bottom-row">
              <div className="vms-modules-container">
                {/* 1. ENTRY & EXIT VMS (Standard Panels) */}
                <div className="vms-group-box">
                  <div className="vms-group-title">
                    <span>📡 Entry &amp; Exit VMS (Standard)</span>
                    <button
                      className="mini-edit-btn"
                      onClick={() => handleOpenVmsEditor('vms')}
                    >
                      ✏️ Edit VMS Templates
                    </button>
                  </div>
                  <div className="vms-boards-wrap">
                    {(loc.vms || []).map((b) => {
                      let dynamicMsg = b.msg;
                      let dynamicMsg2 = b.msg2;

                      if (loc.phase === 1) {
                        dynamicMsg = b.position === 'Entry' ? 'PERHATIAN: BERSEDIA' : 'PERHATIAN: BERSEDIA';
                        dynamicMsg2 = b.position === 'Entry' ? 'SMARTLANE AKAN DIBUKA' : 'SMARTLANE AKAN DIBUKA';
                      } else if (loc.phase === 2) {
                        dynamicMsg = b.position === 'Entry' ? 'SMARTLANE BERMULA' : 'SMARTLANE TAMAT';
                        dynamicMsg2 = b.position === 'Entry' ? 'GUNAKAN LORONG KECEMASAN' : 'MASUK KE LORONG UTAMA';
                      } else if (loc.phase === 3) {
                        dynamicMsg = b.position === 'Entry' ? 'SMARTLANE AKAN DITUTUP' : 'KOSONGKAN LORONG KECEMASAN';
                        dynamicMsg2 = b.position === 'Entry' ? 'BERSEDIA MASUK LORONG UTAMA' : 'SEGERA MASUK LORONG UTAMA';
                      } else {
                        dynamicMsg = b.msg || 'SMARTLANE DITUTUP';
                        dynamicMsg2 = b.msg2 || 'GUNA LORONG UTAMA SAHAJA';
                      }

                      return (
                        <div
                          key={b.id || b.km}
                          className="vms-board standard-vms"
                          onClick={() => handleOpenVmsEditor('vms')}
                          title="Click to edit VMS message template"
                        >
                          <div className="vms-badge">{b.type}</div>
                          <div className="vms-msg">{dynamicMsg}</div>
                          <div className="vms-msg small">{dynamicMsg2}</div>
                          <div className="vms-footer">
                            <span className={`vms-health ${b.status ? b.status.toLowerCase() : 'good'}`}>● {b.status || 'Good'}</span>
                            <span className="km-tag">{b.km}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. MINI VMS (Intermediate Panels) */}
                <div className="vms-group-box">
                  <div className="vms-group-title">
                    <span>📱 Mini VMS (Intermediate)</span>
                    <button
                      className="mini-edit-btn"
                      onClick={() => handleOpenVmsEditor('miniVms')}
                    >
                      ✏️ Edit Mini VMS Templates
                    </button>
                  </div>
                  <div className="vms-boards-wrap">
                    {(loc.miniVms || []).map((mb) => {
                      let miniMsg = mb.msg;
                      let miniMsg2 = mb.msg2;

                      if (loc.phase === 2) {
                        miniMsg = mb.msg;
                        miniMsg2 = mb.msg2;
                      } else if (loc.phase === 1 || loc.phase === 3) {
                        miniMsg = 'PATUHI ARAHAN';
                        miniMsg2 = 'PERHATIKAN ISYARAT LCS';
                      } else {
                        miniMsg = mb.msg || 'LORONG KECEMASAN';
                        miniMsg2 = mb.msg2 || 'DITUTUP';
                      }

                      return (
                        <div
                          key={mb.id || mb.km}
                          className="vms-board mini-vms"
                          onClick={() => handleOpenVmsEditor('miniVms')}
                          title="Click to edit Mini VMS message template"
                        >
                          <div className="vms-badge mini">Mini VMS</div>
                          <div className="vms-msg">{miniMsg}</div>
                          <div className="vms-msg small">{miniMsg2}</div>
                          <div className="vms-footer">
                            <span className={`vms-health ${mb.status ? mb.status.toLowerCase() : 'good'}`}>● {mb.status || 'Good'}</span>
                            <span className="km-tag">{mb.km}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="cctv-strip">
                {loc.cctv.map((cam, idx) => (
                  <div key={idx} className="cctv-tile">
                    <div className="cctv-road"></div>
                    <div className="cctv-label">
                      <span>{cam}</span>
                      <span className="rec-dot"></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SCHEDULE TAB */}
        {activeTab === 'schedule' && (
          <Schedule loc={loc} onShowToast={onShowToast} />
        )}

        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="tab-panel active">
            <div className="log-grid">
              <div className="filter-chips">
                {['all', 'critical', 'warning', 'operation'].map(f => (
                  <div
                    key={f}
                    className={`fchip ${logFilter === f ? 'on' : ''}`}
                    onClick={() => setLogFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </div>
                ))}
              </div>

              <div className="log-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Severity</th>
                      <th>Module</th>
                      <th>Event</th>
                      <th>User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((l, idx) => (
                      <tr key={idx}>
                        <td>{l.time}</td>
                        <td>
                          <span className={`sev-dot ${l.sev === 'critical' ? 'crit' : 'warn'}`}></span>
                          {l.sev.toUpperCase()}
                        </td>
                        <td>{l.mod}</td>
                        <td>{l.event}</td>
                        <td>{l.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                              {g.status.toUpperCase()}
                            </span>
                          </td>
                          <td>
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
    </div>
  );
}
