import { useEffect, useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import { SCHEDULE_ZONE, REGIONS, DAYS, CATEGORIES, dateKey, monthDates, occurrences,
  nextSchedule, displayTime, appliesTo, occursOn, weekday, addDays, validateRule, previewImport, CSV_HEADER, simulationEligibility } from '../scheduling';

function RuleEditor({ initial, kind, loc, store, now, locations, save, close, pending }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState([]);
  const [review, setReview] = useState(false);
  const [discard, setDiscard] = useState(false);
  const exception = kind === 'exceptions';
  const recurrence = exception ? draft.recurrence : draft.type;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const proposed = { ...store, [kind]: [...store[kind].filter(r => !draft.id || r.id !== draft.id), { ...draft, id: draft.id || 'draft-review' }] };
  const conflicts = review ? locations.flatMap(location => occurrences(proposed, location.id, dateKey(now), addDays(dateKey(now), 366), now).filter(o => o.outcome === 'Conflicting').map(o => `${location.name}: ${o.date} / ${o.scheduleId}`)) : [];
  const update = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setReview(false); setErrors([]); };
  const requestClose = () => dirty ? setDiscard(true) : close();
  const check = () => {
    const found = validateRule(draft, kind, store, now, locations.map(l => l.id));
    setErrors(found); if (!found.length) setReview(true);
  };
  return <MonitoringDialog title={`${draft.id ? 'Edit' : 'Create'} ${exception ? 'exception' : 'schedule'} — ${loc.name}`} onClose={requestClose}>
    <p>Timezone: <b>{SCHEDULE_ZONE} (UTC+08:00)</b>. Same-day times only; overnight rules are not supported in this demo.</p>
    <p>Close this editor before changing location. Unsaved changes require an explicit discard decision.</p>
    {discard ? <div role="alert"><p>Discard unsaved edits for {loc.name}?</p><button onClick={close}>Discard edits</button><button onClick={() => setDiscard(false)}>Keep editing</button></div> : <>
      <div className="schedule-form-grid">
        <label>Name<input value={draft.name} onChange={e => update('name', e.target.value)} required /></label>
        <label>Enabled<select value={String(draft.enabled)} onChange={e => update('enabled', e.target.value === 'true')}><option value="true">Enabled rule</option><option value="false">Disabled rule</option></select></label>
        {exception && <>
          <label>Category<select value={draft.category} onChange={e => update('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Scope<select value={draft.scope} onChange={e => { setReview(false); setDraft(d => ({ ...d, scope: e.target.value, scopeId: e.target.value === 'location' ? loc.id : store.regions[loc.id] || '' })); }}><option value="location">This location</option><option value="state" disabled={!store.regions[loc.id]}>Assigned state (all its locations)</option></select></label>
          <p>Applies to: {draft.scope === 'location' ? loc.name : REGIONS.find(r => r.id === draft.scopeId)?.name || 'Assign a state first'}</p>
          <label>Action<select value={draft.action} onChange={e => update('action', e.target.value)}><option value="suppress">Suppress existing occurrences</option><option value="override">Override occurrence times</option></select></label>
          <label>Reason<textarea value={draft.reason} onChange={e => update('reason', e.target.value)} required /></label>
        </>}
        <label>Recurrence<select value={recurrence} onChange={e => update(exception ? 'recurrence' : 'type', e.target.value)}><option value="once">One-time date</option><option value="weekly">Weekly</option>{exception && <option value="annual">Annual date (demo assumption)</option>}</select></label>
        {recurrence !== 'weekly' && <label>{recurrence === 'annual' ? 'Reference date (month/day repeats)' : 'Date'}<input type="date" value={draft.date} onChange={e => update('date', e.target.value)} /></label>}
        {recurrence === 'weekly' && <fieldset><legend>Weekdays</legend><div className="schedule-days">{DAYS.map(day => <label key={day}><input type="checkbox" checked={draft.days.includes(day)} onChange={e => update('days', e.target.checked ? [...draft.days, day] : draft.days.filter(d => d !== day))} />{day}</label>)}</div></fieldset>}
        {(!exception || draft.action === 'override') && <><label>Start time<input type="time" value={draft.startTime} onChange={e => update('startTime', e.target.value)} /></label><label>End time<input type="time" value={draft.endTime} onChange={e => update('endTime', e.target.value)} /></label></>}
      </div>
      {errors.length > 0 && <ul role="alert">{errors.map(e => <li key={e}>{e}</li>)}</ul>}
      {(store.feedback?.locationId === loc.id && store.feedback?.errors.length > 0) && <p role="alert">{store.feedback.errors.join(' ')}</p>}
      {review && <div className="equipment-notice"><b>Review before saving</b><p>{draft.name} · {draft.enabled ? 'Enabled' : 'Disabled'} · {recurrence === 'weekly' ? draft.days.join(', ') : draft.date} · {draft.action === 'suppress' ? 'Suppressed' : `${draft.startTime}–${draft.endTime}`} {SCHEDULE_ZONE}</p><p>{exception ? `${draft.scope}: ${draft.scopeId}. ${draft.reason}` : `Location: ${loc.name} (${loc.id})`}</p><p>No activation will be executed by saving.</p></div>}
      {conflicts.length > 0 && <p role="alert">Unresolved effective conflicts in the 366-day preview: {conflicts.slice(0, 5).join('; ')}{conflicts.length > 5 ? `; ${conflicts.length - 5} more` : ''}. Saving retains these conflicts visibly; affected occurrences cannot be simulated.</p>}
      <div className="operation-actions"><button onClick={requestClose}>Close editor</button>{review ? <button disabled={pending} onClick={() => save(draft)}>{conflicts.length ? 'Confirm save with unresolved conflicts' : 'Confirm mock save'}</button> : <button onClick={check}>Validate and review</button>}</div>
    </>}
  </MonitoringDialog>;
}

function ImportDialog({ loc, store, now, locations, save, close, pending }) {
  const sample = `${CSV_HEADER}\nDemo holiday,Public Holiday,location,${loc.id},annual,${dateKey(now)},,suppress,,,Illustrative example,true`;
  const [text, setText] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [discard, setDiscard] = useState(false);
  const requestClose = () => text ? setDiscard(true) : close();
  const validate = () => { try { setPreview(previewImport(text, store, now, locations.map(l => l.id), loc.id)); setError(''); } catch (e) { setError(e.message); setPreview(null); } };
  const valid = preview?.filter(r => !r.errors.length) || [];
  return <MonitoringDialog title={`Import exceptions — ${loc.name}`} onClose={requestClose}>
    <p>CSV import works locally. Excel .xlsx/.xls parsing is unavailable with the installed capabilities; export the worksheet as CSV first. No import is claimed for an Excel binary.</p>
    <p>scope: location/state; scopeId: stable location ID or assigned MY state ID; recurrence: once/weekly/annual; days: Mon|Tue; action: suppress/override; enabled: true/false.</p>
    <pre className="schedule-sample">{sample}</pre><button onClick={() => { setText(sample); setPreview(null); }}>Load sample for review</button>
    <label>Choose CSV or Excel file<input type="file" accept=".csv,.xlsx,.xls" onChange={async e => { const file = e.target.files[0]; setPreview(null); if (!file) return; if (!file.name.toLowerCase().endsWith('.csv')) { setError('Excel preview unavailable. Convert to CSV; nothing imported.'); setText(''); return; } if (file.size > 1000000) { setError('Demo file limit: 1 MB.'); return; } try { setText(await file.text()); setError(''); } catch { setError('Could not read this file.'); } }} /></label>
    <label>CSV content<textarea rows={6} value={text} onChange={e => { setText(e.target.value); setPreview(null); }} /></label>
    <button onClick={validate}>Preview and validate rows</button>
    {error && <p role="alert">{error}</p>}
    {(store.feedback?.locationId === loc.id && store.feedback?.errors.length > 0) && <p role="alert">{store.feedback.errors.join(' ')}</p>}
    {preview && <><p>{valid.length} valid / {preview.length} rows. Invalid rows will be skipped only after confirmation.</p><ul>{preview.map(row => <li key={row.row}>Row {row.row}: {row.record.name || '(unnamed)'} — {row.errors.length ? row.errors.join(' ') : 'Valid'}</li>)}</ul><button disabled={!valid.length || pending} onClick={() => save(valid.map(r => r.record))}>Confirm import of {valid.length} valid rows</button></>}
    {discard && <p role="alert">Discard unimported content? <button onClick={close}>Discard and close</button><button onClick={() => setDiscard(false)}>Keep reviewing</button></p>}
  </MonitoringDialog>;
}

export default function Schedule({ loc, locations, store, now, dispatch, operations, kind = 'schedules' }) {
  const [editor, setEditor] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState(null);
  const [month, setMonth] = useState(dateKey(now).slice(0, 7));
  const [search, setSearch] = useState('');
  const [enabled, setEnabled] = useState('all');
  const [pendingToken, setPendingToken] = useState(null);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const send = action => { const token = `${loc.id}:${Date.now()}:${Math.random()}`; setPendingToken(token); if (dispatch({ ...action, locationId: loc.id, token }) === false) setPendingToken(null); };
  useEffect(() => {
    if (!pendingToken || store.feedback?.token !== pendingToken) return;
    setPendingToken(null);
    if (!store.feedback.errors.length) { setEditor(null); setImportOpen(false); setDeleting(null); }
  }, [store.feedback, pendingToken]);
  const exception = kind === 'exceptions';
  const records = store[kind].filter(r => exception ? appliesTo(r, loc.id, store) : r.locationId === loc.id);
  const filtered = records.filter(r => (!search || `${r.name} ${r.id}`.toLowerCase().includes(search.toLowerCase())) && (enabled === 'all' || r.enabled === (enabled === 'true')));
  const dates = monthDates(month);
  const calendar = occurrences(store, loc.id, dates[0], dates.at(-1), now);
  const summary = nextSchedule(store, loc.id, now);
  const chosen = calendar.find(o => o.id === selected);
  const attempts = Object.values(store.attempts).filter(a => a.occurrence.locationId === loc.id);
  const newRule = () => ({ name: '', enabled: true, days: [], date: dateKey(now), startTime: '08:00', endTime: '09:00',
    ...(exception ? { category: 'Public Holiday', scope: 'location', scopeId: loc.id, recurrence: 'once', action: 'suppress', reason: '' } : { locationId: loc.id, type: 'once' }) });
  const moveMonth = delta => { const [y, m] = month.split('-').map(Number); setMonth(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7)); setSelected(null); };
  return <div className="tab-panel active scheduling-page">
    <header className="equipment-heading"><div><h2>{exception ? 'Holidays & Exceptions' : 'Scheduling'} — {loc.name}</h2><p>Demo clock: {displayTime(now)} · {SCHEDULE_ZONE}. Saved records persist across tabs; refresh resets this prototype.</p></div><button onClick={() => setEditor(newRule())}>Create {exception ? 'exception' : 'schedule'}</button>{exception && <button onClick={() => setImportOpen(true)}>Import CSV / Excel</button>}</header>
    <label>Demo state assignment for {loc.name}<select value={store.regions[loc.id] || ''} onChange={e => dispatch({ type: 'SCHEDULE_REGION', locationId: loc.id, regionId: e.target.value })}><option value="" disabled>Unassigned — confirm site state</option>{REGIONS.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}</select></label>
    <p>No state boundary is assumed. Changing this assignment immediately changes applicable state rules; verify the site with stakeholders.</p>
    {store.feedback?.locationId === loc.id && <div role={store.feedback.errors.length ? 'alert' : 'status'} className="equipment-notice">{store.feedback.errors.length ? store.feedback.errors.join(' ') : store.feedback.message}</div>}
    <p>Next effective start (366-day preview): <b>{summary.next ? `${summary.next.name} · ${displayTime(summary.next.start)}` : 'No upcoming effective occurrence'}</b></p>
    {summary.affected && <p className="equipment-notice">{summary.affected.outcome}: {summary.affected.name} · {summary.affected.date}. {summary.affected.explanation}</p>}
    <div className="operation-actions"><label>Search name/reference<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><label>Rule state<select value={enabled} onChange={e => setEnabled(e.target.value)}><option value="all">All</option><option value="true">Enabled</option><option value="false">Disabled</option></select></label><button onClick={() => { setSearch(''); setEnabled('all'); }}>Reset filters</button></div>
    {!records.length ? <p className="equipment-state">No {exception ? 'exceptions applicable to this location/state' : 'schedules for this location'}. Create a mock rule to begin.</p> : !filtered.length ? <p className="equipment-state">No results for selected filters.</p> : <div className="equipment-table-scroll" tabIndex={0} role="region" aria-label="Schedule rules table"><table className="equipment-table"><thead><tr><th>Name / ID</th><th>Location / scope</th><th>Rule</th><th>Times ({SCHEDULE_ZONE})</th><th>Enabled / occurrence status</th><th>Actions</th></tr></thead><tbody>{filtered.map(r => {
      const next = !exception && occurrences(store, loc.id, dateKey(now), addDays(dateKey(now), 366), now).find(o => o.scheduleId === r.id && o.start > now && ['Normal', 'Overridden'].includes(o.outcome));
      return <tr key={r.id}><th scope="row">{r.name}<small>{r.id}</small></th><td>{exception ? `${r.scope}: ${r.scopeId}` : loc.name}</td><td>{r.category} · {(r.recurrence || r.type) === 'weekly' ? r.days.join(', ') : r.date} · {r.recurrence || r.type}</td><td>{r.action === 'suppress' ? 'Suppress all affected occurrences' : `${r.startTime}–${r.endTime}`}</td><td>{r.enabled ? 'Enabled rule' : 'Disabled rule'}<small>{exception ? `${r.action}; inspect effective calendar` : next ? `${next.outcome} · ${displayTime(next.start)}` : 'No upcoming occurrence within preview horizon'}</small></td><td><button onClick={() => setEditor(r)} aria-label={`Edit ${r.name}`}>Edit</button><button onClick={() => setDeleting(r)} aria-label={`Delete ${r.name}`}>Delete</button></td></tr>;
    })}</tbody></table></div>}
    <section aria-label="Effective calendar"><h3>Effective calendar · {loc.name}</h3><p>Demo precedence: location exception overrides state exception. Same-priority conflicts are unresolved. Overrides change existing occurrences only; they do not create new runs.</p><div className="operation-actions"><button onClick={() => moveMonth(-1)}>Previous month</button><label>Month<input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); setSelected(null); }} /></label><button onClick={() => moveMonth(1)}>Next month</button><button onClick={() => setMonth(dateKey(now).slice(0, 7))}>Demo current month</button></div>
      <div className="schedule-calendar">{DAYS.map(d => <b className="calendar-day-heading" key={d}>{d}</b>)}{Array.from({ length: DAYS.indexOf(weekday(dates[0])) }, (_, i) => <span className="calendar-filler" key={i} aria-hidden="true" />)}{dates.map(date => { const rows = calendar.filter(o => o.date === date); return <article key={date}><b>{date} · {weekday(date)}</b>{store.exceptions.filter(r => r.enabled && appliesTo(r, loc.id, store) && occursOn(r, date)).map(r => <small key={r.id}>{r.category}: {r.name} ({r.id}) · {r.scope} · {r.action}</small>)}{!rows.length && <small>No scheduled occurrence</small>}{rows.map(o => <button key={o.id} className={`occurrence-${o.outcome.toLowerCase()}`} onClick={() => setSelected(o.id)}>{o.name}<br />{o.outcome} · {displayTime(o.start).split(', ')[1]}</button>)}</article>; })}</div>
    </section>
    <section><h3>Occurrence / activation history for displayed month</h3><p>Elapsed dates are not evidence of execution. There are no seeded successful executions.</p><div className="equipment-table-scroll" tabIndex={0} role="region" aria-label="Occurrence history"><table className="equipment-table"><thead><tr><th>Location / reference</th><th>Planned / effective window</th><th>Rule / outcome</th><th>Simulation / audit link</th></tr></thead><tbody>{calendar.map(o => { const attempt = store.attempts[o.id]; const events = operations.events.filter(e => e.operationId === attempt?.operationId && !!attempt); return <tr key={o.id}><td>{loc.name}<br />{o.id}</td><td>{displayTime(o.originalStart)}–{displayTime(o.originalEnd)}<br />Effective: {displayTime(o.start)}–{displayTime(o.end)}</td><td>{o.outcome} · {o.explanation}<br />{o.status}</td><td>{attempt ? <>{attempt.operationId}<br />{events[0]?.decision || 'Requested'}<br />Audit: {events.map(e => e.id).join(', ')}</> : 'No simulation request'}</td></tr>; })}</tbody></table></div>{!calendar.length && <p>No occurrences in the selected month.</p>}
      {attempts.length > 0 && <details><summary>All prototype-generated request snapshots ({attempts.length}) — retained after rule edits/deletion</summary><ul>{attempts.map(a => <li key={a.occurrence.id}>{a.occurrence.id} · {displayTime(a.occurrence.start)}–{displayTime(a.occurrence.end)} · {a.operationId} · requested {displayTime(a.requestedAt)} · {operations.events.find(e => e.operationId === a.operationId)?.decision}</li>)}</ul></details>}
    </section>
    {chosen && <MonitoringDialog title={`${chosen.name} — ${loc.name}`} onClose={() => setSelected(null)}><p>{chosen.id}</p><p>Original: {displayTime(chosen.originalStart)}–{displayTime(chosen.originalEnd)}</p><p>Effective: {displayTime(chosen.start)}–{displayTime(chosen.end)} · {chosen.outcome}</p><p>{chosen.explanation}</p><p>Applied exceptions: {chosen.exceptionIds.join(', ') || 'None'}. Lower-priority exceptions: {chosen.ignoredExceptionIds.join(', ') || 'None'}.</p><p>{chosen.status}</p><p>Demo starts a request now, even for a future occurrence. Phase 2 retains its 30/60-minute run duration from activation completion; the calendar window is a reference, not an automatic operation deadline.</p><label>Phase 2 demo duration<select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>60 minutes</option></select></label><p>{simulationEligibility(store, chosen, operations.byId[loc.id], now)}</p><button disabled={!!simulationEligibility(store, chosen, operations.byId[loc.id], now)} onClick={() => { dispatch({ type: 'SCHEDULE_SIMULATE', locationId: loc.id, occurrenceId: chosen.id, date: chosen.date, durationMinutes }); setSelected(null); }}>Simulate scheduled activation</button></MonitoringDialog>}
    {editor && <RuleEditor initial={editor} kind={kind} loc={loc} store={store} now={now} locations={locations} pending={!!pendingToken} save={record => send({ type: 'SCHEDULE_SAVE', kind, record })} close={() => setEditor(null)} />}
    {importOpen && <ImportDialog loc={loc} store={store} now={now} locations={locations} pending={!!pendingToken} save={records => send({ type: 'SCHEDULE_IMPORT', kind: 'exceptions', records })} close={() => setImportOpen(false)} />}
    {deleting && <MonitoringDialog title={`Delete ${deleting.name}?`} onClose={() => setDeleting(null)}><p>{deleting.id} · {exception ? `${deleting.scope}: ${deleting.scopeId}` : loc.name}. This removes the mock rule; request history is retained. State rules affect all locations assigned to that state.</p><button disabled={!!pendingToken} onClick={() => send({ type: 'SCHEDULE_DELETE', kind, id: deleting.id })}>Confirm delete</button><button onClick={() => setDeleting(null)}>Cancel</button></MonitoringDialog>}
  </div>;
}
