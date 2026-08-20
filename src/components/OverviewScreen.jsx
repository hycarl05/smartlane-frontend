import React from 'react';
import { fmtElapsed } from '../data';

export default function OverviewScreen({
  locations,
  onSelectLocation,
  setActiveLocId,
  onNavigateTab,
}) {
  const activeCount = locations.filter(l => l.status === 'active').length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;
  const totalAlarms = locations.reduce((sum, l) => sum + (l.alarms ? l.alarms.length : 0), 0);

  const allAlarms = [];
  locations.forEach(l => {
    (l.alarms || []).forEach(a => {
      allAlarms.push({ ...a, loc: l.name, locId: l.id });
    });
  });

  const handleOpenCorridor = (locId) => {
    if (setActiveLocId) setActiveLocId(locId);
    if (onSelectLocation) onSelectLocation(locId);
    if (onNavigateTab) onNavigateTab('corridor');
  };

  const getLosTheme = (los) => {
    switch (los) {
      case 'A': return { color: '#10B981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)', text: 'Optimal' };
      case 'B': return { color: '#34D399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)', text: 'Stable' };
      case 'C': return { color: '#FBBF24', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', text: 'Moderate' };
      case 'D': return { color: '#F97316', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.4)', text: 'Heavy' };
      case 'E': return { color: '#EF4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', text: 'Congested' };
      default: return { color: '#38BDF8', bg: 'rgba(56,189,248,0.15)', border: 'rgba(56,189,248,0.4)', text: 'Normal' };
    }
  };

  return (
    <div className="ov-clean-master-root">

      {/* ── 1. CLEAN HEADER (GIS Map & Draw Layout REMOVED) ─────────── */}
      <div className="ov-master-top-bar">
        <div className="ov-title-block">
          <div className="ov-headline">
            <span className="ov-live-radar-dot"></span>
            <h1>All Smartlane Locations</h1>
          </div>
          <p className="ov-subheadline">
            Central Command &amp; Multi-Corridor Operational Roster — Select any corridor to launch its real-time telemetry dashboard.
          </p>
        </div>

        {/* Quick Summary Pill */}
        <div className="ov-network-pulse-pill">
          <span className="pulse-tag">NETWORK STATUS</span>
          <span className="pulse-val"><b>{activeCount}</b> / {locations.length} Corridors Active</span>
        </div>
      </div>

      {/* ── 2. TOP 4 SUMMARY STAT CARDS ──────────────────────────────── */}
      <div className="ov-stat-deck-row">
        
        <div className="ov-stat-pill-box box-total">
          <div className="stat-pill-icon blue">📊</div>
          <div className="stat-pill-data">
            <span className="stat-pill-num">{locations.length}</span>
            <span className="stat-pill-lbl">Total Locations</span>
          </div>
        </div>

        <div className="ov-stat-pill-box box-active">
          <div className="stat-pill-icon green">▶</div>
          <div className="stat-pill-data">
            <span className="stat-pill-num">{activeCount}</span>
            <span className="stat-pill-lbl">Active Now (Phase 2)</span>
          </div>
        </div>

        <div className="ov-stat-pill-box box-pending">
          <div className="stat-pill-icon amber">!</div>
          <div className="stat-pill-data">
            <span className="stat-pill-num">{pendingCount}</span>
            <span className="stat-pill-lbl">Needs Attention</span>
          </div>
        </div>

        <div className="ov-stat-pill-box box-alarms">
          <div className="stat-pill-icon red">⚠️</div>
          <div className="stat-pill-data">
            <span className="stat-pill-num">{totalAlarms}</span>
            <span className="stat-pill-lbl">Open Alarms</span>
          </div>
        </div>

      </div>

      {/* ── 3. LIVE ALARMS BANNER STRIP ──────────────────────────────── */}
      {allAlarms.length > 0 && (
        <div className="ov-ticker-alarms-bar">
          <div className="ticker-badge">🚨 ACTIVE ALERTS</div>
          <div className="ticker-scroll-content">
            {allAlarms.map((alarm, idx) => (
              <div
                key={idx}
                className="ticker-event-pill"
                onClick={() => handleOpenCorridor(alarm.locId)}
                title="Click to view corridor"
              >
                <span className={`event-sev-dot ${alarm.sev === 'critical' ? 'crit' : 'warn'}`}></span>
                <span className="event-title">{alarm.title || alarm.msg}</span>
                <span className="event-corridor">({alarm.loc} • {alarm.time || '14:31'})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. REDESIGNED HIGH-INTEREST CORRIDOR CARDS (ZERO SCROLL) ──── */}
      <div className="ov-corridors-deck">
        {locations.map((loc) => {
          const alarmCount = loc.alarms ? loc.alarms.length : 0;
          const isActive = loc.status === 'active';
          const isPending = loc.status === 'pending';
          const losTheme = getLosTheme(loc.los || 'A');

          // Equipment calculation
          const cctv = loc.equipment?.cctv || [13, 14];
          const avds = loc.equipment?.avds || [9, 10];
          const lcs = loc.equipment?.lcs || [12, 12];
          const vms = loc.equipment?.vms || [2, 2];

          // Speed and traffic simulation based on status
          const speedVal = isActive ? (loc.trafficFlow?.includes('Congested') ? 68 : 84) : 88;
          const volumeVal = isActive ? 5420 : (loc.trafficFlow?.includes('Congested') ? 4980 : 3200);

          return (
            <div
              key={loc.id}
              className={`ov-rich-corridor-card state-${loc.status}`}
              onClick={() => handleOpenCorridor(loc.id)}
            >
              {/* Left Accent Glow Bar */}
              <div className={`card-accent-rail state-${loc.status}`}></div>

              {/* 1. Identity Column */}
              <div className="card-col-identity">
                <div className="identity-title-row">
                  <span className={`identity-live-dot ${isActive ? 'online' : isPending ? 'pending' : 'standby'}`}></span>
                  <h3 className="corridor-heading">{loc.name}</h3>
                </div>
                <div className="identity-tags-row">
                  <span className="chainage-tag">🛣️ KM {loc.distKm || '8.4'} • {loc.direction || 'NORTHBOUND'}</span>
                  <span className={`phase-status-pill ${isActive ? 'active' : isPending ? 'pending' : 'standby'}`}>
                    {isActive ? `PHASE ${loc.phase || 2}: ACTIVE OPERATION` : isPending ? 'PHASE 1: PRE-ACTIVATION' : 'STANDBY / INACTIVE'}
                  </span>
                </div>
              </div>

              {/* 2. Level of Service & Speed Deck */}
              <div className="card-col-traffic">
                <div className="los-badge-container" style={{ background: losTheme.bg, borderColor: losTheme.border }}>
                  <span className="los-label">LOS</span>
                  <span className="los-value" style={{ color: losTheme.color }}>{loc.los || 'A'}</span>
                </div>

                <div className="traffic-stats-box">
                  <div className="speed-flow-row">
                    <span className="speed-big mono">{speedVal} <small>km/h</small></span>
                    <span className="traffic-state-text" style={{ color: losTheme.color }}>
                      {loc.trafficFlow || 'Normal Flow'}
                    </span>
                  </div>
                  <div className="volume-sub mono">{volumeVal.toLocaleString()} veh/h Total Volume</div>
                </div>
              </div>

              {/* 3. Animated Highway Schematic Glyph & Equipment Chips */}
              <div className="card-col-visual">
                <div className="mini-highway-track-wrap">
                  <svg className="mini-highway-svg" viewBox="0 0 180 20" preserveAspectRatio="none">
                    <line className="highway-bed" x1="4" y1="10" x2="176" y2="10" />
                    <line className={`highway-flow ${isActive ? 'flowing' : ''}`} x1="4" y1="10" x2="176" y2="10" />
                    {[20, 55, 90, 125, 160].map(x => (
                      <circle
                        key={x}
                        className={`highway-dot ${isActive ? 'on' : isPending ? 'pending' : ''}`}
                        cx={x}
                        cy="10"
                        r="2.5"
                      />
                    ))}
                  </svg>
                </div>

                <div className="equipment-chips-deck">
                  <span className="eq-mini-chip" title="CCTV Cameras">📹 {cctv[0]}/{cctv[1]}</span>
                  <span className="eq-mini-chip" title="AVDS Detectors">📡 {avds[0]}/{avds[1]}</span>
                  <span className="eq-mini-chip" title="Lane Control Signs">🚥 {lcs[0]}/{lcs[1]}</span>
                  <span className="eq-mini-chip" title="Variable Message Signs">📺 {vms[0]}/{vms[1]}</span>
                </div>
              </div>

              {/* 4. Operations Timer / Next Run Schedule */}
              <div className="card-col-schedule">
                <div className="schedule-lbl">{isActive ? 'OPERATION ELAPSED' : 'NEXT SCHEDULED RUN'}</div>
                <div className={`schedule-val mono ${isActive ? 'timer-green' : ''}`}>
                  {isActive ? `⏱️ ${fmtElapsed(loc.elapsedSeconds || 0)}` : (loc.nextRun || 'Awaiting Schedule')}
                </div>
                <div className="schedule-rule">Peak-Hour Autonomous Engine</div>
              </div>

              {/* 5. Alarms & Launch Action */}
              <div className="card-col-actions">
                <div className={`alarm-indicator-badge ${alarmCount > 0 ? 'has-alarm' : 'clean'}`}>
                  {alarmCount > 0 ? (
                    <>
                      <span className="alarm-dot-pulse"></span>
                      <b>{alarmCount}</b> {alarmCount === 1 ? 'Open Alarm' : 'Open Alarms'}
                    </>
                  ) : (
                    <>
                      <span className="clean-check">✓</span> 0 Alarms
                    </>
                  )}
                </div>

                <button
                  className="card-launch-dashboard-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCorridor(loc.id);
                  }}
                >
                  Open Dashboard →
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
