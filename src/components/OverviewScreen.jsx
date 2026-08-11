import React from 'react';
import Topbar from './Topbar';
import { fmtElapsed } from '../data';

export default function OverviewScreen({ locations, onSelectLocation, time, date, user, onLogout }) {
  const activeCount = locations.filter(l => l.status === 'active').length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;
  const totalAlarms = locations.reduce((sum, l) => sum + l.alarms.length, 0);

  const getSeverityWorst = (loc) => {
    if (loc.alarms.some(a => a.sev === 'critical')) return 'critical';
    if (loc.alarms.some(a => a.sev === 'warning')) return 'warning';
    return 'none';
  };

  const allAlarms = [];
  locations.forEach(l => {
    l.alarms.forEach(a => {
      allAlarms.push({ ...a, loc: l.name, locId: l.id });
    });
  });

  return (
    <div className="screen active">
      <Topbar time={time} date={date} user={user} onLogout={onLogout} />

      <div className="overview-header">
        <div>
          <div className="overview-title">All Smartlane Locations</div>
          <div className="overview-sub">Select a location to open its live dashboard and controls</div>
        </div>
      </div>

      <div className="overview-body-full">
        {/* TOP STAT CARDS BAR */}
        <div className="stat-cards-row">
          <div className="stat-card">
            <div className="stat-icon icon-blue">📊</div>
            <div className="stat-info">
              <span className="stat-num">{locations.length}</span>
              <span className="stat-lbl">Total locations</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-green">▶</div>
            <div className="stat-info">
              <span className="stat-num">{activeCount}</span>
              <span className="stat-lbl">Active now</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-amber">!</div>
            <div className="stat-info">
              <span className="stat-num">{pendingCount}</span>
              <span className="stat-lbl">Needs attention</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-red">⚠️</div>
            <div className="stat-info">
              <span className="stat-num">{totalAlarms}</span>
              <span className="stat-lbl">Open alarms</span>
            </div>
          </div>
        </div>

        {/* ALARMS BANNER STRIP */}
        {allAlarms.length > 0 && (
          <div className="alarms-banner-strip">
            {allAlarms.map((a, idx) => (
              <div
                key={idx}
                className="alarm-banner-item"
                onClick={() => onSelectLocation(a.locId, 'log')}
              >
                <span className={`banner-indicator ${a.sev === 'critical' ? 'crit' : 'warn'}`}></span>
                <div className="banner-content">
                  <b>{a.title}</b>
                  <span>{a.loc} · {a.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FULL-WIDTH HORIZONTAL LOCATION ROWS */}
        <div className="loc-rows-list">
          {locations.map(loc => {
            const cnt = loc.alarms.length;
            const isActive = loc.status === 'active';
            const isPending = loc.status === 'pending';

            return (
              <div
                key={loc.id}
                className={`loc-row-card is-${loc.status}`}
                onClick={() => onSelectLocation(loc.id)}
              >
                <div className={`loc-accent-stripe is-${loc.status}`}></div>

                {/* LOC NAME */}
                <div className="row-col-name">
                  <div className="loc-name">{loc.name}</div>
                  <div className="loc-dir">{loc.direction}</div>
                </div>

                {/* CENTERED SCHEMATIC */}
                <div className="row-col-glyph">
                  <svg className="row-road-glyph" viewBox="0 0 220 34" preserveAspectRatio="none">
                    <line className="track" x1="6" y1="17" x2="214" y2="17" />
                    <line className="flow" x1="6" y1="17" x2="214" y2="17" />
                    {[26, 66, 106, 146, 186].map(x => (
                      <circle
                        key={x}
                        className={`marker ${isActive || isPending ? 'on' : ''}`}
                        cx={x}
                        cy="17"
                        r="3"
                      />
                    ))}
                  </svg>
                </div>

                {/* METRICS */}
                <div className="row-col-metrics">
                  <div className="loc-meta">
                    <div className="lbl">LEVEL OF SERVICE</div>
                    <div className={`val ${loc.los === 'A' || loc.los === 'B' ? 'good' : loc.los === 'C' || loc.los === 'D' ? 'warn' : 'crit'}`}>
                      {loc.los}
                    </div>
                  </div>
                  <div className="loc-meta">
                    <div className="lbl">TRAFFIC FLOW</div>
                    <div className="val">{loc.trafficFlow}</div>
                  </div>
                  <div className="loc-meta">
                    <div className="lbl">{isActive ? 'ELAPSED' : 'NEXT RUN'}</div>
                    <div className="val">{isActive ? fmtElapsed(loc.elapsedSeconds) : loc.nextRun}</div>
                  </div>
                </div>

                {/* STATUS & ACTIONS */}
                <div className="row-col-actions">
                  <div className={`status-pill ${loc.status}`}>
                    <span className="dot"></span>
                    {isActive ? `ACTIVE · P${loc.phase}` : isPending ? 'ATTENTION' : 'INACTIVE'}
                  </div>

                  <div className={`alarm-tag ${cnt === 0 ? 'none' : ''}`}>
                    <b>{cnt}</b> {cnt === 1 ? 'alarm' : 'alarms'}
                  </div>

                  <button
                    className="open-btn"
                    onClick={(e) => { e.stopPropagation(); onSelectLocation(loc.id); }}
                  >
                    Open Dashboard →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
