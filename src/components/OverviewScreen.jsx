import React from 'react';
import Topbar from './Topbar';
import { fmtElapsed } from '../data';
import { equipmentAlarms } from '../equipment';
import { canDeactivate } from '../operations';
import { capabilities } from '../access';
import { useAccess } from '../accessContext';

export default function OverviewScreen({
  locations = [], equipmentRecords = [], operationNow, onQuickOperation,
  onSelectLocation, time, date, user, onLogout
}) {
  const { persona } = useAccess();
  const activeCount = locations.filter(l => !l.operation?.intervention && [2, 3].includes(l.phase)).length;
  const pendingCount = locations.filter(l => l.status === 'pending').length;
  const alarms = equipmentAlarms(equipmentRecords).map(a => ({
    ...a, sev: a.severity === 'Major' ? 'critical' : 'warning',
    title: `${a.device} — ${a.issue}`, loc: a.location, locId: a.locationId,
    time: new Date(a.raisedAt).toLocaleTimeString()
  }));
  const open = id => {
    onSelectLocation?.(id, 'overview');
  };
  const losClass = los => ['A', 'B'].includes(los) ? 'good' : ['C', 'D'].includes(los) ? 'warn' : 'crit';

  return <div className="overview-screen">
    <Topbar time={time} date={date} user={user} onLogout={onLogout} />
    <main className="ov-scroll">
      <header className="ov-head">
        <div>
          <h1 className="ov-title">All Smartlane Locations</h1>
          <p className="ov-sub">Select a location to open its live dashboard and controls.</p>
        </div>
        <label className="location-picker">
          <span>Open location</span>
          <select aria-label="Open a Smartlane location" value="" onChange={e => open(e.target.value)}>
            <option value="" disabled>Select location</option>
            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      </header>

      <section className="kpi-strip" aria-label="Location summary">
        {[['blue', 'Locations', locations.length, '◇'], ['teal', 'Active now', activeCount, '▶'], ['amber', 'Needs attention', pendingCount, '!'], ['red', 'Open alarms', alarms.length, '⚠']].map(([tone, label, value, icon]) =>
          <article className="kpi-tile" key={label}><span className={`kpi-icon ${tone}`} aria-hidden="true">{icon}</span><div><strong className="kpi-num">{value}</strong><span className="kpi-lbl">{label}</span></div></article>
        )}
      </section>

      {alarms.length > 0 && <section className="alert-ticker" aria-label="Open equipment alarms">
        {alarms.map(a => <button key={a.id} className={`ticker-chip ${a.sev === 'warning' ? 'warn' : 'crit'}`} onClick={() => open(a.locId)}><span className="dot" /><span><strong className="tt1">{a.title}</strong><small className="tt2">{a.loc} · {a.time}</small></span></button>)}
      </section>}

      <div className="overview-list-heading">
        <h2>Locations</h2>
        <span title="The next effective schedule search covers 366 days.">Schedule preview: 366 days</span>
      </div>

      <section className="loc-list" aria-label="Smartlane locations">
        {locations.map(loc => {
          const alarmCount = alarms.filter(a => a.locationId === loc.id).length;
          const isActive = !loc.operation?.intervention && [2, 3].includes(loc.phase);
          const isPending = loc.status === 'pending';
          const canOperate = capabilities(persona, loc.id).operate;
          const nextSchedule = loc.scheduleSummary?.next ? loc.nextRun : 'No upcoming schedule';
          return <article key={loc.id} className={`loc-row is-${loc.status}`}>
            <div className="loc-row-id">
              <h3 className="nm">{loc.name}</h3>
              <p className="dr">{loc.direction || 'Northbound'}</p>
              <svg className="mini-road" viewBox="0 0 220 34" preserveAspectRatio="none" aria-hidden="true">
                <line className="track" x1="6" y1="17" x2="214" y2="17" />
                <line className="flow" x1="6" y1="17" x2="214" y2="17" />
                {[26, 66, 106, 146, 186].map(x => <circle key={x} className={`marker ${isActive ? 'on' : ''}`} cx={x} cy="17" r="3.5" />)}
              </svg>
            </div>

            <div className="loc-row-stats" aria-label="Traffic summary">
              <div className="rstat"><span className="lbl">Level of service</span><strong className={`val ${losClass(loc.los || 'A')}`}>{loc.los || 'A'}</strong></div>
              <div className="rstat"><span className="lbl">Traffic flow</span><strong className="val">{loc.trafficFlow || 'Normal'}</strong></div>
              <div className="rstat"><span className="lbl">Elapsed</span><strong className="val">{isActive ? fmtElapsed(loc.elapsedSeconds || 0) : '—'}</strong></div>
            </div>

            <div className="loc-row-status">
              <span className={`status-pill ${loc.status}`}><span className="dot" />{isActive ? `Active · Phase ${loc.phase || 2}` : isPending ? 'Needs attention' : 'Inactive'}</span>
              <dl><div><dt>Mode</dt><dd>{loc.operation?.mode || 'Not set'}</dd></div><div><dt>Phase</dt><dd>{loc.phaseLabel}</dd></div></dl>
              {loc.operation?.intervention && <small className="operation-alert">Intervention active · policy awaiting approval</small>}
              {loc.operation?.pendingDecision && <small className="operation-alert">{loc.operation.pendingDecision.requiresAcknowledgement ? `Awaiting ${loc.operation.pendingDecision.kind} acknowledgement` : `${loc.operation.pendingDecision.kind} decision pending`}</small>}
              <small className="simulation-label">Simulation</small>
            </div>

            <div className="loc-row-schedule">
              <span className="lbl">Next effective schedule</span>
              <strong>{nextSchedule}</strong>
              {loc.scheduleSummary?.affected && <small>{loc.scheduleSummary.affected.outcome}: {loc.scheduleSummary.affected.name} · {loc.scheduleSummary.affected.date}</small>}
            </div>

            <div className={`alarm-text ${alarmCount ? 'has-alarm' : 'no-alarm'}`}><b>{alarmCount}</b><span>{alarmCount === 1 ? 'open alarm' : 'open alarms'}</span></div>

            <div className="loc-row-action">
              <div className="quick-operation">
                <button className="overview-action secondary" disabled={!canOperate || !loc.operation || ![0, 5].includes(loc.operation.phase) || !!loc.operation.pendingDecision} onClick={() => onQuickOperation(loc.id, 'Activate')}>Request activation</button>
                <button className="overview-action danger" disabled={!canOperate || !loc.operation || !canDeactivate(loc.operation, operationNow) || !!loc.operation.pendingDecision} onClick={() => onQuickOperation(loc.id, 'Deactivate')}>Request deactivation</button>
              </div>
              <button className="open-btn" onClick={() => open(loc.id)}>Open Dashboard →</button>
            </div>
          </article>;
        })}
      </section>
    </main>
  </div>;
}
