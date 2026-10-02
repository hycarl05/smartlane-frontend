import React, { useEffect, useMemo, useState } from 'react';
import { OPERATION_PHASES, PANEL_CAPABILITIES, validateVmsDraft } from '../phase6';
import { draftsForVmsDevices, normalizedVmsRole, operationalMiniVmsDevices, updateDeviceDraft, vmsTemplateSaveActions } from '../vmsEditorModel';
import VmsBoardPreview from './VmsBoardPreview';

const PHASE_LABELS = { 1: 'Pre Activation', 2: 'Activation', 3: 'Pre Deactivation', 4: 'Deactivation', 5: 'Post Activation' };
const roleLabel = role => ({ 'Start/entry': 'Start / Entry', 'Final/exit': 'End / Exit' })[role] || role;

function DeviceEditor({ device, draft, phase, editable, onChange }) {
  const role = normalizedVmsRole(device);
  return <article className="vms-device-card">
    <header>
      <div><strong>{device.demoLabel || device.name}</strong><small>{device.id} · {device.km}</small></div>
      <div className="vms-device-meta"><span>{roleLabel(role)}</span><small><i className={`vms-health-dot ${String(device.health).toLowerCase()}`} />{device.connectivity === 'Active' ? 'Online' : device.connectivity} · {device.health}</small></div>
    </header>
    <VmsBoardPreview line1={draft.line1} line2={`${draft.line2 || ''}${role === 'Final/exit' && draft.remainingDistanceMeters ? ` · ${draft.remainingDistanceMeters}M` : ''}`} label={`${device.demoLabel || device.name} live preview`} />
    <div className="vms-device-fields">
      <label>Message Line 1<input disabled={!editable} value={draft.line1} placeholder="Enter first message line" onChange={event => onChange('line1', event.target.value)} /></label>
      <label>Message Line 2<input disabled={!editable} value={draft.line2} placeholder="Enter second message line" onChange={event => onChange('line2', event.target.value)} /></label>
      {role === 'Final/exit' && <label className="vms-distance-field">Remaining distance (m)<input disabled={!editable} type="number" min="1" value={draft.remainingDistanceMeters} onChange={event => onChange('remainingDistanceMeters', event.target.value)} /></label>}
    </div>
    <small className="vms-card-phase">Phase {phase}: {PHASE_LABELS[phase]}</small>
  </article>;
}

export default function VmsWorkflowEditor({ loc, devices, state, dispatch, editable }) {
  const [phase, setPhase] = useState(1);
  const [drafts, setDrafts] = useState({});
  const [confirmation, setConfirmation] = useState('');
  const selectedDevices = useMemo(() => operationalMiniVmsDevices(devices, loc.id), [devices, loc.id]);
  useEffect(() => {
    setDrafts(draftsForVmsDevices({ templates: state.templates, locationId: loc.id, devices: selectedDevices, phase }));
  }, [loc.id, phase, selectedDevices, state.templates]);
  useEffect(() => setConfirmation(''), [loc.id, phase]);
  const errors = selectedDevices.flatMap(device => validateVmsDraft(drafts[device.id] || {}, PANEL_CAPABILITIES['Mini VMS']).map(error => `${device.demoLabel || device.name}: ${error}`));
  const update = (deviceId, field, value) => setDrafts(current => updateDeviceDraft(current, deviceId, field, value));
  const save = () => {
    if (!selectedDevices.length || errors.length) return;
    vmsTemplateSaveActions({ locationId: loc.id, devices: selectedDevices, phase, drafts }).forEach(dispatch);
    setConfirmation(`${selectedDevices.length} Mini VMS message${selectedDevices.length === 1 ? '' : 's'} saved for Phase ${phase}.`);
  };

  return <div className="tab-panel active vms-editor-page">
    <header className="vms-editor-heading"><div><span>Message configuration</span><h2>VMS Editor</h2><p>{loc.name} · {loc.direction}</p><small>Frontend preview only — messages are not sent to roadside equipment.</small></div></header>
    {!editable && <p className="equipment-notice">Read-only preview. Your current role cannot save VMS templates.</p>}
    <section className="vms-common-toolbar" aria-label="Common VMS settings">
      <label>Device type<output>Mini VMS</output></label>
      <label>Operation phase<select value={phase} onChange={event => setPhase(Number(event.target.value))}>{OPERATION_PHASES.map(value => <option key={value} value={value}>Phase {value}: {PHASE_LABELS[value]}</option>)}</select></label>
      <label>Scope<output>Individual devices</output></label>
    </section>
    <section className="vms-device-grid">
      {selectedDevices.map(device => <DeviceEditor key={device.id} device={device} draft={drafts[device.id] || { line1: '', line2: '', remainingDistanceMeters: '' }} phase={phase} editable={editable} onChange={(field, value) => update(device.id, field, value)} />)}
      {selectedDevices.length < 2 && <div className="vms-device-empty">Second Mini VMS is not configured for this location.</div>}
    </section>
    {errors.map(error => <p role="alert" className="vms-validation" key={error}>{error}</p>)}
    {confirmation && <p role="status" className="vms-save-confirmation">{confirmation}</p>}
    <div className="vms-save-row"><button className="vms-save-button" disabled={!editable || !selectedDevices.length || errors.length > 0} onClick={save}>Save Both Messages</button></div>
  </div>;
}
