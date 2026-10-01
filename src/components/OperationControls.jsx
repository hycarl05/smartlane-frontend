import { useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import { DEMO_OPERATION_POLICY as P, PHASE_NAMES, INTERVENTION_REASONS } from '../operationPolicy';
import { canDeactivate, laneState } from '../operations';
import { useAccess } from '../accessContext';

const time = value => value ? new Date(value).toLocaleString('en-GB') : 'No planned end';
const remaining = (deadline, now) => `${Math.max(0, Math.ceil((deadline - now) / 1000))} seconds`;

function DecisionDialog({ op, now, locationName, send, onClose }) {
  const pending = op.pendingDecision;
  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState(P.extensionMinutes[0]);
  const confirm = () => send({ type: 'CONFIRM', requestId: pending.id, reason, minutes });
  return <MonitoringDialog title={`${pending.kind} — ${locationName}`} onClose={onClose}>
    <p className="equipment-notice">Simulation only. No request reaches real equipment.</p>
    <p><b>Mode:</b> {op.mode} · <b>Current phase:</b> {PHASE_NAMES[op.phase]}</p>
    {['Activate', 'Deactivate'].includes(pending.kind) && <>
      <p>Acknowledgement is required before the {op.warningMs / 60_000}-minute warning starts. After the warning, the simulated transition takes {P.transitionMs / 1000} seconds.</p>
      <p>Request expires in <b>{remaining(pending.expiresAt, now)}</b>. Expiry cancels this request, without changing the current phase.</p>
      <p>Timing is an unapproved demo policy. {op.mode === 'Manual' ? 'Manual operation has no planned end.' : `Selected run duration: ${pending.durationMinutes || op.durationMinutes} minutes.`}</p>
    </>}
    {pending.kind === 'Intervene' && <label htmlFor="intervention-reason">Reason for manual intervention
      <select id="intervention-reason" value={reason} onChange={e => setReason(e.target.value)}><option value="">Select a reason</option>{INTERVENTION_REASONS.map(r => <option key={r}>{r}</option>)}</select>
    </label>}
    {['Intervene', 'Resume'].includes(pending.kind) && <p>Reason-specific VMS/LCS instructions await approved policy. No confirmed open indications will be shown during intervention.</p>}
    {pending.kind === 'Resume' && <>
      <p>Current intervention: <b>{op.intervention.reason}</b>, started {time(op.intervention.startedAt)}.</p>
      <p>Resume this existing operation ({op.operationId}) in Phase 2. Mode, original start and planned end ({time(op.plannedEnd)}) are retained. This is a demo assumption, not a new activation.</p>
    </>}
    {pending.kind === 'Extend' && <>
      <p>Current planned end: <b>{time(op.plannedEnd)}</b></p>
      <label htmlFor="extension-minutes">Extension duration<select id="extension-minutes" value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{P.extensionMinutes.map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>
      <p>Proposed end: <b>{time(Math.max(op.plannedEnd, now) + minutes * 60_000)}</b></p>
      {now > op.plannedEnd && <p>The planned end has passed. Demo policy calculates the extension from the current demo time.</p>}
    </>}
    <div className="operation-actions">
      <button type="button" onClick={() => send({ type: 'CANCEL', requestId: pending.id })}>Cancel request</button>
      <button type="button" disabled={pending.kind === 'Intervene' && !reason} onClick={confirm}>{['Activate', 'Deactivate'].includes(pending.kind) ? 'Acknowledge and start warning' : `Confirm ${pending.kind.toLowerCase()}`}</button>
    </div>
    <p>Closing this dialog leaves the decision available in the operation panel.</p>
  </MonitoringDialog>;
}

export default function OperationControls({ loc, op, now, dispatch }) {
  const { caps } = useAccess();
  const [dialogId, setDialogId] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [showPolicy, setShowPolicy] = useState(false);
  if (!op || !caps.operate) return null;
  const send = action => dispatch({ ...action, locationId: loc.id });
  const request = kind => send({ type: 'REQUEST', kind, durationMinutes });
  const idle = [0, 5].includes(op.phase);
  const busy = !!op.pendingDecision || !!op.warningDeadline || op.command.status === 'Transition pending';
  return <section className="operation-panel" aria-label={`Operation controls for ${loc.name}`}>
    <header><div><h2>{loc.name} · Operation simulation</h2><p><b>{PHASE_NAMES[op.phase]}</b> · {op.mode}</p><p>{laneState(op)}</p></div>
      <div><b>{op.command.status}</b><p>Demo time: {time(now)}</p></div></header>
    <p role="status">{op.lastResult}</p>
    <div className="operation-facts"><span>Operation: {op.operationId || 'Not started'}</span><span>Planned end: <b>{time(op.plannedEnd)}</b></span></div>
    {op.mode === 'Manual' && <p>Manual operation continues until deactivation is requested. There is no automatic end or extension deadline.</p>}
    {op.warningDeadline && <p className="equipment-notice">Warning remaining: <b>{remaining(op.warningDeadline, now)}</b>. Transition cannot be skipped.</p>}
    {op.command.status === 'Transition pending' && <p className="equipment-notice">Transition pending in simulation. Waiting {remaining(op.command.dueAt, now)} for the mock result.</p>}
    {op.intervention && <div className="operation-decision"><b>Manual intervention · {loc.name}</b><p>{op.intervention.reason}</p><p>Started {time(op.intervention.startedAt)}. Next reminder: {time(op.intervention.remindAt)}.</p><p>Lane and VMS/LCS policy awaiting approval. Choose Resume or Deactivate below; vehicle towed does not reset the operation.</p></div>}
    {op.notification && <div className="operation-decision" role="status"><b>{op.notification.kind} · {loc.name}</b><p>Raised {time(op.notification.raisedAt)}. Decision remains pending until explicitly addressed.</p>
      {op.intervention ? <button disabled={busy} onClick={() => send({ type: 'KEEP_INTERVENTION' })}>Continue intervention · remind in 20 min</button> : op.mode === 'Manual' ? <button disabled={busy} onClick={() => send({ type: 'CONTINUE_MANUAL' })}>Continue manual operation · remind in 20 min</button> : <button disabled={busy} onClick={() => request('Extend')}>Choose extension</button>}
    </div>}
    {op.pendingDecision && <div className="operation-decision"><b>Awaiting operator decision: {op.pendingDecision.kind} · {loc.name}</b><p>No further transition proceeds until the required decision is confirmed.</p>
      <button onClick={() => setDialogId(op.pendingDecision.id)}>Review and acknowledge</button>
      <button onClick={() => send({ type: 'CANCEL', requestId: op.pendingDecision.id })}>Cancel request</button>
    </div>}
    <div className="operation-actions">
      <label htmlFor="operation-mode">Mode<select id="operation-mode" value={op.mode} disabled={!idle || busy} onChange={e => send({ type: 'MODE', mode: e.target.value })}>{['Manual', 'Scheduled', 'Automated'].map(m => <option key={m}>{m}</option>)}</select></label>
      {idle && op.mode !== 'Manual' && <label htmlFor="operation-duration">Demo run duration<select id="operation-duration" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}>{P.durationsMinutes.map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>}
      {idle && <button disabled={busy} onClick={() => request('Activate')}>{op.mode === 'Scheduled' ? 'Simulate scheduled start request' : op.mode === 'Automated' ? 'Simulate congestion activation prompt' : 'Request activation'}</button>}
      {op.phase === 2 && <>
        <button disabled={busy || !canDeactivate(op, now)} onClick={() => request('Deactivate')}>Request deactivation</button>
        {!op.intervention && <button disabled={busy} onClick={() => request('Intervene')}>Manual intervention</button>}
        {op.intervention && <button disabled={busy} onClick={() => request('Resume')}>Review resumption</button>}
        {op.plannedEnd && !op.intervention && <button disabled={busy} onClick={() => request('Extend')}>Extend operation</button>}
      </>}
      <button onClick={() => setShowPolicy(v => !v)} aria-expanded={showPolicy}>Demo timing and clock</button>
    </div>
    {op.phase === 2 && !canDeactivate(op, now) && <p>Demo policy retains the 30-minute automated minimum. Earliest deactivation request: {time(op.startedAt + P.automatedMinimumMs)}. Emergency overrides require an approved policy.</p>}
    {showPolicy && <div className="equipment-notice"><p><b>Unapproved demo assumptions:</b> warning starts after acknowledgement; acknowledgement expires after 2 minutes; warning defaults to 3 minutes. Automated first review is after 30 minutes, then every 20 minutes. Due end times prompt a decision and do not bypass acknowledgement. Intervention reminders repeat every 20 minutes after a decision.</p>
      <p>Scheduled and congestion triggers are manually simulated here; the Schedule editor and AVDS are not execution sources. All locations advance together when using the demo clock. Refresh resets operations to standby.</p>
      <label htmlFor="operation-warning">Demo warning duration (both directions)<select id="operation-warning" disabled={!idle || busy} value={op.warningMs / 60_000} onChange={e => send({ type: 'WARNING', minutes: Number(e.target.value) })}>{[1, 3, 5].map(n => <option key={n} value={n}>{n} minutes</option>)}</select></label>
      <div className="operation-actions">{[1, 3, 20, 30].map(minutes => <button key={minutes} disabled={!caps.configure} onClick={() => dispatch({ type: 'ADVANCE', minutes })}>Demo clock +{minutes} min (all locations; administrator preview)</button>)}</div>
    </div>}
    {op.pendingDecision && dialogId === op.pendingDecision.id && <DecisionDialog key={dialogId} op={op} now={now} locationName={loc.name} send={send} onClose={() => setDialogId(null)} />}
  </section>;
}
