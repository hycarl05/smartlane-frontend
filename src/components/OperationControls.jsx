import { useEffect, useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import { DEMO_OPERATION_POLICY as P, PHASE_NAMES, INTERVENTION_REASONS } from '../operationPolicy';
import { canDeactivate, laneState, PRE_ACTIVATION_DELAY_OPTIONS } from '../operations';
import { useAccess } from '../accessContext';

const clock = value => value ? new Date(value).toLocaleTimeString('en-GB', { hour12: false }) : '—';
const elapsed = (op, now) => [2, 3].includes(op.phase) && op.startedAt ? new Date(Math.max(0, now - op.startedAt)).toISOString().slice(11, 19) : '—';
const remaining = (deadline, now) => `${Math.max(0, Math.ceil((deadline - now) / 1000))} seconds`;
const countdown = (deadline, now) => `00:${String(Math.max(0, Math.ceil((deadline - now) / 1000))).padStart(2, '0')}`;

function AcknowledgementDialog({ op, now, locationName, send, onClose }) {
  const pending = op.pendingDecision;
  return <MonitoringDialog title={`Acknowledge ${pending.kind.toLowerCase()} — ${locationName}`} onClose={onClose}>
    <p className="equipment-notice">Simulation only. No command reaches real equipment.</p>
    <p><b>Operation:</b> {pending.kind} · <b>Mode:</b> {op.mode} · <b>Current phase:</b> {PHASE_NAMES[op.phase]}</p>
    {pending.kind === 'Activate' && <p><b>Pre-activation demo delay:</b> {pending.preActivationDelaySeconds} seconds</p>}
    {pending.kind === 'Deactivate' && <p><b>Pre-deactivation demo delay:</b> {pending.preDeactivationDelaySeconds} seconds</p>}
    <p>Acknowledgement is required before the {op.warningMs / 60_000}-minute warning and simulated equipment transition begin.</p>
    <p>Request expires in <b>{remaining(pending.expiresAt, now)}</b>.</p>
    <fieldset className="operation-vms-review"><legend>Configured VMS messages</legend>{pending.vmsMessages.length ? <ul>{pending.vmsMessages.map(message => <li key={message}>{message}</li>)}</ul> : <p>No configured VMS messages are available for this location.</p>}<small>These configured messages are captured automatically in the audit record.</small></fieldset>
    <div className="operation-actions"><button type="button" onClick={() => send({ type: 'CANCEL', requestId: pending.id })}>Cancel</button><button type="button" onClick={() => send({ type: 'CONFIRM', requestId: pending.id })}>Acknowledge &amp; Proceed</button></div>
  </MonitoringDialog>;
}

export default function OperationControls({ loc, op, now, dispatch }) {
  const { caps } = useAccess();
  const [dialogId, setDialogId] = useState(null);
  const [openingKind, setOpeningKind] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [reason, setReason] = useState('');
  const [extensionMinutes, setExtensionMinutes] = useState(P.extensionMinutes[0]);
  useEffect(() => {
    if (openingKind && op?.pendingDecision?.kind === openingKind) {
      setDialogId(op.pendingDecision.id);
      setOpeningKind(null);
    }
  }, [openingKind, op?.pendingDecision]);
  useEffect(() => { setDialogId(null); setOpeningKind(null); setReason(''); }, [loc.id]);
  if (!op || !caps.operate) return null;
  const send = action => dispatch({ ...action, locationId: loc.id });
  const requestAcknowledgement = kind => { setOpeningKind(kind); send({ type: 'REQUEST', kind, durationMinutes }); };
  const idle = [0, 5].includes(op.phase);
  const busy = !!op.pendingDecision || !!op.warningDeadline || !!op.phaseTransitionAt || op.command.status === 'Transition pending';
  const tone = op.intervention || busy ? 'warning' : idle ? 'idle' : 'active';
  const status = op.intervention ? 'Manual intervention' : op.phase === 1 ? 'Pre-activation' : op.phase === 3 ? 'Pre-deactivation' : idle ? 'Smart Lane standby' : 'Smart Lane active';
  const hasAlert = op.pendingDecision || op.phaseTransitionAt || op.warningDeadline || ['Transition pending', 'Failed'].includes(op.command.status) || op.intervention || op.notification || (op.phase === 2 && !canDeactivate(op, now));
  const showTimes = [1, 2, 3, 4].includes(op.phase);

  return <section className={`operation-panel operation-panel--${tone}`} aria-label={`Operation controls for ${loc.name}`}>
    <div className="operation-compact-row">
      <div className="operation-compact-status"><span className={`operation-dot operation-dot--${tone}`} aria-hidden="true" /><div><strong>{status}</strong><span>{PHASE_NAMES[op.phase]}</span></div><small>Simulation</small></div>
      <dl className="operation-inline-facts"><div><dt>Elapsed</dt><dd>{elapsed(op, now)}</dd></div><div><dt>Planned start</dt><dd>{showTimes ? clock(op.startedAt) : '—'}</dd></div><div><dt>Planned end</dt><dd>{showTimes ? clock(op.plannedEnd) : '—'}</dd></div><div><dt>Level of service</dt><dd>{loc.los || '—'}</dd></div></dl>
      <div className="operation-compact-actions" aria-label="Operation actions">
        {idle && op.mode !== 'Manual' && <label className="compact-duration" htmlFor="operation-duration">Duration<select id="operation-duration" value={durationMinutes} disabled={busy} onChange={event => setDurationMinutes(Number(event.target.value))}>{P.durationsMinutes.map(value => <option key={value} value={value}>{value} min</option>)}</select></label>}
        {idle && <div className="preactivation-delay" aria-label="Pre-activation delay"><span>Pre-activation delay</span><div>{PRE_ACTIVATION_DELAY_OPTIONS.map(seconds => <button type="button" key={seconds} aria-pressed={op.preActivationDelaySeconds === seconds} disabled={busy} onClick={() => send({ type: 'SET_PRE_ACTIVATION_DELAY', seconds })}>{seconds}s</button>)}</div></div>}
        {op.phase === 2 && <div className="preactivation-delay" aria-label="Pre-deactivation delay"><span>Pre-deactivation delay</span><div>{PRE_ACTIVATION_DELAY_OPTIONS.map(seconds => <button type="button" key={seconds} aria-pressed={op.preDeactivationDelaySeconds === seconds} disabled={busy || !!op.intervention} onClick={() => send({ type: 'SET_PRE_DEACTIVATION_DELAY', seconds })}>{seconds}s</button>)}</div></div>}
        {idle && <button className="operation-primary" disabled={busy} onClick={() => requestAcknowledgement('Activate')}>Activate Smartlane</button>}
        {op.phase === 2 && <><button className="operation-danger" disabled={busy || !canDeactivate(op, now)} onClick={() => requestAcknowledgement('Deactivate')}>Deactivate Smartlane</button>{!op.intervention && <details className="operation-direct-action"><summary>Manual intervention</summary><div><select aria-label="Intervention reason" value={reason} onChange={event => setReason(event.target.value)}><option value="">Select reason</option>{INTERVENTION_REASONS.map(item => <option key={item}>{item}</option>)}</select><button disabled={busy || !reason} onClick={() => { send({ type: 'INTERVENE', reason }); setReason(''); }}>Start intervention</button></div></details>}{op.intervention && <button className="operation-manual" disabled={busy} onClick={() => send({ type: 'RESUME' })}>Resume operation</button>}{op.plannedEnd && !op.intervention && <details className="operation-direct-action"><summary>Extend operation</summary><div><select aria-label="Extension duration" value={extensionMinutes} onChange={event => setExtensionMinutes(Number(event.target.value))}>{P.extensionMinutes.map(value => <option key={value} value={value}>{value} min</option>)}</select><button disabled={busy} onClick={() => send({ type: 'EXTEND', minutes: extensionMinutes })}>Extend operation</button></div></details>}</>}
        <span className={`threshold-indicator ${loc.thresholdArmed ? 'armed' : ''}`}>Threshold <i aria-hidden="true" /> {loc.thresholdArmed ? 'Armed' : 'Off'}</span>
        <label className="compact-mode" htmlFor="operation-mode">Mode<select id="operation-mode" value={op.mode} disabled={!idle || busy} onChange={event => send({ type: 'MODE', mode: event.target.value })}>{['Manual', 'Scheduled', 'Automated'].map(mode => <option key={mode}>{mode}</option>)}</select></label>
        <details className="operation-details"><summary>Details</summary><div className="operation-details-popover"><dl><div><dt>Operation ID</dt><dd>{op.operationId || '—'}</dd></div><div><dt>Lane state</dt><dd>{laneState(op)}</dd></div><div><dt>Controller</dt><dd>{op.command.status}</dd></div></dl><p>{op.lastResult}</p></div></details>
      </div>
    </div>
    {hasAlert && <div className="operation-alert-row" role="status">
      {op.pendingDecision && <><b>Awaiting {op.pendingDecision.kind.toLowerCase()} acknowledgement.</b><span>No action proceeds until acknowledged.</span><button onClick={() => setDialogId(op.pendingDecision.id)}>Review</button><button onClick={() => send({ type: 'CANCEL', requestId: op.pendingDecision.id })}>Cancel</button></>}
      {!op.pendingDecision && op.phase === 1 && op.phaseTransitionAt && <><b>SMART LANE PRE-ACTIVATION</b><span>Activating in {countdown(op.phaseTransitionAt, now)}</span></>}
      {!op.pendingDecision && op.phase === 3 && op.phaseTransitionAt && <><b>SMART LANE PRE-DEACTIVATION</b><span>Deactivating in {countdown(op.phaseTransitionAt, now)}</span></>}
      {!op.pendingDecision && op.warningDeadline && <><b>{op.phase === 1 ? 'Pre-activation' : 'Pre-deactivation'} countdown.</b><span>{remaining(op.warningDeadline, now)} remaining.</span></>}
      {!op.pendingDecision && !op.warningDeadline && op.command.status === 'Transition pending' && <><b>Equipment not confirmed.</b><span>Simulated transition due in {remaining(op.command.dueAt, now)}.</span></>}
      {!op.pendingDecision && op.command.status === 'Failed' && <><b>Simulated device transition failed.</b><span>{op.lastResult}</span></>}
      {!op.pendingDecision && op.intervention && <><b>Manual intervention:</b><span>{op.intervention.reason}. Equipment policy remains unconfirmed.</span>{op.notification && <button disabled={busy} onClick={() => send({ type: 'KEEP_INTERVENTION' })}>Continue intervention</button>}</>}
      {!op.pendingDecision && !op.intervention && op.notification && <><b>{op.notification.kind}.</b><span>A decision remains required.</span>{op.mode === 'Manual' && <button disabled={busy} onClick={() => send({ type: 'CONTINUE_MANUAL' })}>Continue operation</button>}</>}
      {!op.pendingDecision && !op.warningDeadline && op.command.status !== 'Transition pending' && !op.intervention && !op.notification && op.phase === 2 && !canDeactivate(op, now) && <><b>Minimum active period.</b><span>Deactivation available at {clock(op.startedAt + P.automatedMinimumMs)}.</span></>}
    </div>}
    {op.pendingDecision && dialogId === op.pendingDecision.id && <AcknowledgementDialog key={dialogId} op={op} now={now} locationName={loc.name} send={send} onClose={() => setDialogId(null)} />}
  </section>;
}
