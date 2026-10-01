import React from 'react';
import Topbar from './Topbar';
import { fmtElapsed } from '../data';
import { equipmentAlarms } from '../equipment';
import { canDeactivate } from '../operations';
import { capabilities } from '../access';
import { useAccess } from '../accessContext';

export default function OverviewScreen({
  locations = [],
  equipmentRecords = [],
  operationNow,
  onQuickOperation,
  onSelectLocation,
  setActiveLocId,
  onNavigateTab,
  time,
  date,
  user,
  onLogout
}) {
  const { persona } = useAccess();
  const activeCount = locations.filter(l => !l.operation?.intervention && [2, 3].includes(l.phase)).length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;
  const allAlarms = equipmentAlarms(equipmentRecords).map(a => ({ ...a, sev: a.severity === 'Major' ? 'critical' : 'warning', title: `${a.device} — ${a.issue}`, loc: a.location, locId: a.locationId, time: new Date(a.raisedAt).toLocaleTimeString() }));
  const totalAlarms = allAlarms.length;

  const handleOpenCorridor = (locId) => {
    if (setActiveLocId) setActiveLocId(locId);
    if (onSelectLocation) onSelectLocation(locId, 'overview');
    if (onNavigateTab) onNavigateTab('corridor');
  };

  const getLosClass = (los) => {
    if (los === 'A' || los === 'B') return 'good';
    if (los === 'C' || los === 'D') return 'warn';
    return 'crit';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--canvas)' }}>
      <Topbar time={time} date={date} user={user} onLogout={onLogout} />
      <div className="ov-scroll">
        {/* ── 1. HEADER ──────────────────────────────────────────────── */}
        <div className="ov-head">
          <div>
            <div className="ov-title">All Smartlane Locations</div>
            <div className="ov-sub">Select a location to open its live dashboard and controls</div>
            <label>Open location<select aria-label="Open a Smartlane location" value="" onChange={e => handleOpenCorridor(e.target.value)}><option value="" disabled>Select location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          </div>
        </div>

      {/* ── 2. KPI STRIP (4 TILES) ─────────────────────────────────── */}
      <div className="kpi-strip">
        <div className="kpi-tile">
          <div className="kpi-icon blue">◧</div>
          <div>
            <div className="kpi-num">{locations.length}</div>
            <div className="kpi-lbl">Total locations</div>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-icon teal">▶</div>
          <div>
            <div className="kpi-num">{activeCount}</div>
            <div className="kpi-lbl">Active now</div>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-icon amber">!</div>
          <div>
            <div className="kpi-num">{pendingCount}</div>
            <div className="kpi-lbl">Needs attention</div>
          </div>
        </div>

        <div className="kpi-tile">
          <div className="kpi-icon red">⚠</div>
          <div>
            <div className="kpi-num">{totalAlarms}</div>
            <div className="kpi-lbl">Open alarms</div>
          </div>
        </div>
      </div>

      {/* ── 3. ALERT TICKER ────────────────────────────────────────── */}
      {allAlarms.length > 0 && (
        <div className="alert-ticker">
          {allAlarms.map((a, idx) => (
            <div
              key={idx}
              className={`ticker-chip ${a.sev === 'warning' ? 'warn' : ''}`}
              onClick={() => handleOpenCorridor(a.locId)}
            >
              <div>
                <div className="tt1">{a.title || a.msg}</div>
                <div className="tt2">{a.loc} · {a.time || '14:31:02'}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. LOCATIONS LIST ──────────────────────────────────────── */}
      <div className="loc-list">
        {locations.map((loc) => {
          const alarmCount = allAlarms.filter(a => a.locationId === loc.id).length;
          const isActive = !loc.operation?.intervention && [2, 3].includes(loc.phase);
          const isPending = loc.status === 'pending';

          return (
            <div
              key={loc.id}
              className={`loc-row is-${loc.status}`}
              onClick={() => handleOpenCorridor(loc.id)}
            >
              {/* ID & Mini Road Column */}
              <div className="loc-row-id">
                <div className="nm">{loc.name}</div>
                <div className="dr">{loc.direction || 'NORTHBOUND'}</div>
                <svg className="mini-road" viewBox="0 0 220 34" preserveAspectRatio="none">
                  <line className="track" x1="6" y1="17" x2="214" y2="17" />
                  <line className="flow" x1="6" y1="17" x2="214" y2="17" />
                  {[26, 66, 106, 146, 186].map(x => (
                    <circle
                      key={x}
                      className={`marker ${isActive ? 'on' : ''}`}
                      cx={x}
                      cy="17"
                      r="3.5"
                    />
                  ))}
                </svg>
              </div>

              {/* Stats Column */}
              <div className="loc-row-stats">
                <div className="rstat">
                  <div className="lbl">Level of service</div>
                  <div className={`val ${getLosClass(loc.los || 'A')}`}>
                    {loc.los || 'A'}
                  </div>
                </div>

                <div className="rstat">
                  <div className="lbl">Traffic flow</div>
                  <div className="val">{loc.trafficFlow || 'Normal'}</div>
                </div>

                <div className="rstat">
                  <div className="lbl">{isActive ? 'Elapsed' : 'Next run'}</div>
                  <div className="val">
                    {isActive ? fmtElapsed(loc.elapsedSeconds || 0) : (loc.nextRun || '—')}
                  </div>
                </div>
              </div>

              {/* Status Pill Column */}
              <div className="loc-row-status">
                <div className={`status-pill ${loc.status}`}>
                  <span className="dot"></span>
                  {isActive
                    ? `ACTIVE · P${loc.phase || 2}`
                    : isPending
                    ? 'ATTENTION'
                    : 'INACTIVE'}
                </div>
                <small>{loc.phaseLabel} · {loc.operation?.mode} · Simulation</small>
                {loc.operation?.intervention && <small>Intervention — policy awaiting approval</small>}
                {loc.operation?.pendingDecision && <small>Awaiting {loc.operation.pendingDecision.kind} acknowledgement</small>}
                <small className="schedule-overview">Next effective schedule: {loc.nextRun}</small>
                {loc.scheduleSummary?.affected && <small className="schedule-overview">{loc.scheduleSummary.affected.outcome}: {loc.scheduleSummary.affected.name} · {loc.scheduleSummary.affected.date}</small>}
              </div>

              {/* Action Column */}
              <div className="loc-row-action">
                <div className="quick-operation">
                  <button disabled={!capabilities(persona, loc.id).operate || !loc.operation || ![0, 5].includes(loc.operation.phase) || !!loc.operation.pendingDecision} aria-label={`Request activation for ${loc.name}`} onClick={e => { e.stopPropagation(); onQuickOperation(loc.id, 'Activate'); }}>Request activation</button>
                  <button disabled={!capabilities(persona, loc.id).operate || !loc.operation || !canDeactivate(loc.operation, operationNow) || !!loc.operation.pendingDecision} aria-label={`Request deactivation for ${loc.name}`} onClick={e => { e.stopPropagation(); onQuickOperation(loc.id, 'Deactivate'); }}>Request deactivation</button>
                </div>
                <div className={`alarm-text ${alarmCount > 0 ? 'has-alarm' : 'no-alarm'}`}>
                  <b>{alarmCount}</b> {alarmCount === 1 ? 'alarm' : 'alarms'}
                </div>
                <button
                  className="open-btn"
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
    </div>
  );
}
