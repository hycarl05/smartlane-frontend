import React from 'react';
import Topbar from './Topbar';
import { fmtElapsed } from '../data';

export default function OverviewScreen({ locations, onSelectLocation, time, date }) {
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
      <Topbar time={time} date={date} />

      <div className="overview-header">
        <div>
          <div className="overview-title">All Smartlane Locations</div>
          <div className="overview-sub">Select a location to open its live dashboard and controls</div>
        </div>
        <div className="summary-chips">
          <div className="chip">
            <span className="swatch" style={{ background: 'var(--accent)' }}></span>
            {activeCount} active
          </div>
          <div className="chip">
            <span className="swatch" style={{ background: 'var(--amber)' }}></span>
            {pendingCount} pending
          </div>
          <div className="chip">
            <span className="swatch" style={{ background: totalAlarms ? 'var(--red)' : 'var(--green)' }}></span>
            <b>{totalAlarms}</b> open alarms
          </div>
        </div>
      </div>

      <div className="overview-body">
        <div className="loc-grid">
          {locations.map(loc => {
            const cnt = loc.alarms.length;
            const isActive = loc.status === 'active';
            const isPending = loc.status === 'pending';

            return (
              <div
                key={loc.id}
                className={`loc-card is-${loc.status}`}
                onClick={() => onSelectLocation(loc.id)}
              >
                <div className="loc-card-clickzone"></div>
                <div className="loc-card-top">
                  <div>
                    <div className="loc-name">{loc.name}</div>
                    <div className="loc-dir">{loc.direction}</div>
                  </div>
                  <div className={`status-pill ${loc.status}`}>
                    <span className="dot"></span>
                    {isActive ? `ACTIVE · P${loc.phase}` : isPending ? 'ATTENTION' : 'INACTIVE'}
                  </div>
                </div>

                <svg className="road-glyph" viewBox="0 0 220 34" preserveAspectRatio="none">
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

                <div className="loc-meta-row">
                  <div className="loc-meta">
                    <div className="lbl">Level of Service</div>
                    <div className={`val ${loc.los === 'A' || loc.los === 'B' ? 'good' : loc.los === 'C' || loc.los === 'D' ? 'warn' : 'crit'}`}>
                      {loc.los}
                    </div>
                  </div>
                  <div className="loc-meta">
                    <div className="lbl">Traffic flow</div>
                    <div className="val">{loc.trafficFlow}</div>
                  </div>
                  <div className="loc-meta">
                    <div className="lbl">{isActive ? 'Elapsed' : 'Next run'}</div>
                    <div className="val">{isActive ? fmtElapsed(loc.elapsedSeconds) : loc.nextRun}</div>
                  </div>
                </div>

                <div className="loc-card-bottom">
                  <div className={`alarm-tag ${cnt === 0 ? 'none' : ''}`}>
                    <b>{cnt}</b> {cnt === 1 ? 'alarm' : 'alarms'}
                  </div>
                  <button className="open-btn" onClick={(e) => { e.stopPropagation(); onSelectLocation(loc.id); }}>
                    Open Dashboard →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="alarm-dock">
          <div className="dock-head">
            <h3>CONSOLIDATED ALARMS</h3>
            <span>{allAlarms.length} open</span>
          </div>
          <div className="dock-list">
            {allAlarms.length === 0 ? (
              <div className="dock-empty">No active alarms across any location.</div>
            ) : (
              allAlarms.map((a, idx) => (
                <div
                  key={idx}
                  className="alarm-row"
                  onClick={() => onSelectLocation(a.locId, 'log')}
                >
                  <div className={`alarm-sev ${a.sev === 'critical' ? 'crit' : 'warn'}`}></div>
                  <div className="alarm-body">
                    <div className="t1">{a.title}</div>
                    <div className="t2">{a.loc} · {a.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
