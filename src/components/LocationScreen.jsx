import React, { useState } from 'react';
import Topbar from './Topbar';
import Schedule from './Schedule';
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
    if (isPending) {
      const updatedLCS = loc.lcs.map(item => ({ ...item, open: true }));
      onUpdateLoc(loc.id, {
        status: 'active',
        phase: 1,
        phaseLabel: 'Activation',
        elapsedSeconds: 0,
        ps: time,
        pe: 'Manual',
        los: 'C',
        trafficFlow: 'Congested (Active)',
        lcs: updatedLCS
      });
      addLogEntry('operation', `Accepted threshold prompt — activated ${loc.name}`);
      onShowToast(`Activated ${loc.name}`);
    } else if (isActive) {
      const updatedLCS = loc.lcs.map(item => ({ ...item, open: false }));
      onUpdateLoc(loc.id, {
        status: 'inactive',
        phase: 0,
        phaseLabel: 'Standby',
        elapsedSeconds: 0,
        ps: '—',
        pe: '—',
        los: 'B',
        trafficFlow: 'Normal',
        lcs: updatedLCS
      });
      addLogEntry('operation', `Deactivated ${loc.name}`);
      onShowToast(`Deactivated ${loc.name}`);
    } else {
      const updatedLCS = loc.lcs.map(item => ({ ...item, open: true }));
      onUpdateLoc(loc.id, {
        status: 'active',
        phase: 1,
        phaseLabel: 'Activation',
        elapsedSeconds: 0,
        ps: time,
        pe: 'Manual',
        los: 'B',
        trafficFlow: 'Normal',
        lcs: updatedLCS
      });
      addLogEntry('operation', `Activated ${loc.name}`);
      onShowToast(`Activated ${loc.name}`);
    }
  };

  const handleDismissPrompt = () => {
    onUpdateLoc(loc.id, {
      status: 'inactive',
      phase: 0,
      phaseLabel: 'Standby'
    });
    addLogEntry('operation', `Dismissed threshold activation prompt for ${loc.name}`);
    onShowToast('Prompt dismissed');
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
        <div className="loc-crumb">
          <span>SMARTLANE · </span>
          <span>{loc.name}</span>
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

                <div className={`op-status ${loc.status}`}>
                  <div className="big-dot"></div>
                  <div className="op-status-text">
                    {isActive ? 'ACTIVE' : isPending ? 'PENDING DECISION' : 'INACTIVE'}
                    <small>{loc.phaseLabel}</small>
                  </div>
                </div>

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

                <button
                  className={`primary-toggle ${isActive ? 'to-deactivate' : 'to-activate'}`}
                  onClick={handleTogglePrimary}
                >
                  {isActive ? 'DEACTIVATE SMARTLANE' : 'ACTIVATE SMARTLANE NOW'}
                </button>

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
                    <div className="name"><span className="sw good"></span>VMS Display Boards</div>
                    <div className="count"><b>{loc.equipment.vms[0]}</b> / {loc.equipment.vms[1]}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ROW */}
            <div className="bottom-row">
              <div className="vms-boards-wrap">
                {loc.vmsBoards.map((b, idx) => (
                  <div key={idx} className="vms-board">
                    <div className="vms-msg">{b.msg}</div>
                    {b.msg2 && <div className="vms-msg small">{b.msg2}</div>}
                    <div className="km-tag">{b.km}</div>
                  </div>
                ))}
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
    </div>
  );
}
