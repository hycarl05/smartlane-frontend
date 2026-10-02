import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, REGIONS, appliesTo, dateKey, monthDates, occursOn, validateRule } from '../scheduling';

const DISPLAY_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_LABELS = { Mon: 'M', Tue: 'T', Wed: 'W', Thu: 'T', Fri: 'F', Sat: 'S', Sun: 'S' };
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const categoryClass = value => ({ 'Public Holiday': 'public-holiday', 'Special Exception Day': 'special-exception', 'Recurring Exception': 'recurring-exception' }[value] || 'special-exception');

function Modal({ title, close, children, narrow = false }) {
  return createPortal(
    <div className="modal-backdrop schedule-modal-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && close()}>
      <div className={`modal-content schedule-modal-content${narrow ? ' narrow' : ''}`} role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
        <div className="modal-header"><h3 id="schedule-modal-title">{title}</h3><button type="button" className="close-btn" onClick={close} aria-label="Close dialog">×</button></div>
        {children}
      </div>
    </div>, document.body
  );
}

function RuleEditor({ initial, kind, loc, locations, store, now, save, close, pending }) {
  const exception = kind === 'exceptions';
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState([]);
  const update = (key, value) => { setDraft(valueOrDraft => ({ ...valueOrDraft, [key]: value })); setErrors([]); };
  const recurrence = exception ? draft.recurrence : draft.type;
  const submit = e => {
    e.preventDefault();
    const found = validateRule(draft, kind, store, now, locations.map(item => item.id));
    setErrors(found);
    if (!found.length) save(draft);
  };
  const toggleDay = day => update('days', draft.days.includes(day) ? draft.days.filter(value => value !== day) : [...draft.days, day]);

  return <Modal title={draft.id ? `Edit ${exception ? 'Calendar Exception' : 'Schedule'}` : exception ? 'Program Location Calendar Exception' : 'Create New Smartlane Schedule'} close={close}>
    <form onSubmit={submit} className="schedule-legacy-form">
      {errors.length > 0 && <div className="conflict-alert-banner" role="alert"><span className="alert-icon">!</span><div className="alert-text"><b>Please review these fields</b><p>{errors.join(' ')}</p></div></div>}
      <div className="form-group"><label>{exception ? 'Exception Title / Event' : 'Schedule Name / Identifier'}</label><input type="text" value={draft.name} onChange={e => update('name', e.target.value)} placeholder={exception ? 'e.g. Hari Merdeka Holiday Schedule' : 'e.g. Peak Hours — Evening Rush'} required /></div>
      {exception ? <>
        <div className="form-row">
          <div className="form-group"><label>Category</label><select className="custom-select" value={draft.category} onChange={e => update('category', e.target.value)}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></div>
          <div className="form-group"><label>Applies To</label><select className="custom-select" value={draft.scope} onChange={e => setDraft(current => ({ ...current, scope: e.target.value, scopeId: e.target.value === 'location' ? loc.id : store.regions[loc.id] || '' }))}><option value="location">This location</option><option value="state" disabled={!store.regions[loc.id]}>Assigned state</option></select></div>
        </div>
        <div className="form-group"><label>Reason</label><textarea value={draft.reason} onChange={e => update('reason', e.target.value)} placeholder="Reason for this exception" required /></div>
        <div className="form-group"><label>Override Action</label><div className="type-toggle-group"><button type="button" className={`type-toggle-btn ${draft.action === 'override' ? 'active' : ''}`} onClick={() => update('action', 'override')}><span>Custom Operating Hours</span><small>Override standard hours on affected dates</small></button><button type="button" className={`type-toggle-btn ${draft.action === 'suppress' ? 'active' : ''}`} onClick={() => update('action', 'suppress')}><span>Full Day Suppress</span><small>Keep Smartlane closed for affected runs</small></button></div></div>
      </> : <div className="form-group"><label>Activation Type</label><div className="type-toggle-group"><button type="button" className={`type-toggle-btn ${draft.type === 'weekly' ? 'active' : ''}`} onClick={() => update('type', 'weekly')}><span>Weekly-Recurring</span><small>Repeat on specific days each week</small></button><button type="button" className={`type-toggle-btn ${draft.type === 'once' ? 'active' : ''}`} onClick={() => update('type', 'once')}><span>One-Time</span><small>Programmed for a specific date</small></button></div></div>}
      {exception && <div className="form-group"><label>Recurrence Rule</label><select className="custom-select" value={draft.recurrence} onChange={e => update('recurrence', e.target.value)}><option value="once">One-Time Exception Only</option><option value="annual">Repeats Annually</option><option value="weekly">Repeats Weekly</option></select></div>}
      {recurrence === 'weekly' ? <div className="form-group"><label>Recurring Days</label><div className="days-selector">{DISPLAY_DAYS.map(day => <button key={day} type="button" className={`day-btn ${draft.days.includes(day) ? 'selected' : ''}`} onClick={() => toggleDay(day)} title={day}>{DAY_LABELS[day]}</button>)}</div></div> : <div className="form-group"><label>{recurrence === 'annual' ? 'Reference Date' : 'Target Date'}</label><input type="date" value={draft.date} onChange={e => update('date', e.target.value)} required /></div>}
      {(!exception || draft.action === 'override') && <div className="form-row"><div className="form-group"><label>{exception ? 'Override Start Time' : 'Open Time (Start)'}</label><input type="time" value={draft.startTime} onChange={e => update('startTime', e.target.value)} required /></div><div className="form-group"><label>{exception ? 'Override End Time' : 'Close Time (End)'}</label><input type="time" value={draft.endTime} onChange={e => update('endTime', e.target.value)} required /></div></div>}
      <div className="form-group schedule-enabled"><label><input type="checkbox" checked={draft.enabled} onChange={e => update('enabled', e.target.checked)} /> Enabled rule</label></div>
      <div className="modal-actions"><button type="button" className="btn-secondary" onClick={close}>Cancel</button><button type="submit" className="btn-primary" disabled={pending}>{draft.id ? `Save ${exception ? 'Exception' : 'Changes'}` : exception ? 'Program Exception' : 'Create Schedule'}</button></div>
    </form>
  </Modal>;
}

export default function Schedule({ loc, locations, store, now, dispatch, kind = 'schedules' }) {
  const exceptionView = kind === 'exceptions';
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const initialMonth = dateKey(now).slice(0, 7);
  const [month, setMonth] = useState(initialMonth);
  const schedules = store.schedules.filter(item => item.locationId === loc.id);
  const exceptions = store.exceptions.filter(item => appliesTo(item, loc.id, store));
  const dates = monthDates(month);
  const [year, monthNumber] = month.split('-').map(Number);
  const padding = (new Date(`${month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const calendarCells = [...Array.from({ length: padding }, (_, index) => ({ empty: true, key: `empty-${index}` })), ...dates.map(date => ({ date, key: date, rules: exceptions.filter(item => item.enabled && occursOn(item, date)) }))];
  const feedback = store.feedback?.locationId === loc.id ? store.feedback : null;
  const send = action => { const token = `${loc.id}:${Date.now()}:${Math.random()}`; setPendingToken(token); dispatch({ ...action, locationId: loc.id, token }); };
  useEffect(() => {
    if (!pendingToken || feedback?.token !== pendingToken) return;
    setPendingToken(null);
    if (!feedback.errors.length) { setEditor(null); setDeleting(null); }
  }, [feedback, pendingToken]);
  const makeRule = (targetDate = dateKey(now)) => ({ name: '', enabled: true, days: [], date: targetDate, startTime: '08:00', endTime: '17:00', ...(exceptionView ? { category: 'Public Holiday', scope: 'location', scopeId: loc.id, recurrence: 'once', action: 'suppress', reason: '' } : { locationId: loc.id, type: 'weekly' }) });
  const moveMonth = delta => setMonth(new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7));
  const formatRule = item => item.type === 'weekly' ? `${item.days.join(', ') || 'No days'} · ${item.startTime}–${item.endTime}` : `${item.date} · ${item.startTime}–${item.endTime}`;

  return <div className="tab-panel active schedule-restored-page">
    {feedback && <div className={`schedule-feedback ${feedback.errors.length ? 'error' : 'success'}`} role={feedback.errors.length ? 'alert' : 'status'}>{feedback.errors.length ? feedback.errors.join(' ') : feedback.message}</div>}
    {!exceptionView ? <div className="sched-grid">
      <section className="panel schedule-panel"><div className="panel-header-row"><div><div className="panel-title">Schedule Controller</div><small>{loc.name}</small></div><button className="add-sched-btn" onClick={() => setEditor(makeRule())}>+ New schedule</button></div>
        <div className="sched-list">{schedules.map(item => <div key={item.id} className="sched-card-item"><div className="left"><div className="sched-title-row"><span className="t1">{item.name}</span><span className={`type-chip ${item.type === 'once' ? 'one-time' : 'weekly'}`}>{item.type === 'once' ? 'One-Time' : 'Weekly Recurring'}</span></div><div className="t2">{formatRule(item)}</div></div><div className="right-actions"><span className={`tag ${item.enabled ? 'good' : 'neutral'}`}>{item.enabled ? 'Enabled' : 'Disabled'}</span><button className="action-icon-btn edit" aria-label={`Edit ${item.name}`} onClick={() => setEditor(item)}>✎</button><button className="action-icon-btn delete" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>×</button></div></div>)}{!schedules.length && <div className="empty-sched-msg">No schedules configured. Click “+ New schedule” to add one.</div>}</div>
      </section>
      <section className="panel schedule-panel"><div className="panel-title">This Week Overview</div><div className="week-grid">{DISPLAY_DAYS.map((day, index) => <div key={day} className={`week-cell ${schedules.some(item => item.enabled && item.type === 'weekly' && item.days.includes(day)) ? 'has-run' : ''}`}>{DAY_LABELS[day]}<span className="d">{index + 1}</span></div>)}</div><div className="panel-title schedule-section-title">Programmed Exceptions</div><div className="sched-list compact">{exceptions.map(item => <div key={item.id} className="sched-row"><div className="left"><div className="t1">{item.name}</div><div className="t2">{item.date} · {item.action === 'suppress' ? 'Lane Suppressed' : `${item.startTime}–${item.endTime}`}</div></div><span className={`tag ${item.action === 'suppress' ? 'bad' : 'warn'}`}>{item.action === 'suppress' ? 'Suppressed' : 'Override'}</span></div>)}{!exceptions.length && <div className="empty-sched-msg">No exceptions apply to this location.</div>}</div></section>
    </div> : <div className="sched-grid exception-grid">
      <section className="panel schedule-panel calendar-panel"><div className="calendar-header-bar"><div className="cal-title-wrap"><span className="cal-icon">▣</span><b>{loc.name} Exception Calendar</b></div><div className="cal-month-nav"><button className="cal-nav-btn" onClick={() => moveMonth(-1)} aria-label="Previous month">‹</button><span className="cal-month-label">{MONTHS[monthNumber - 1]} {year}</span><button className="cal-nav-btn" onClick={() => moveMonth(1)} aria-label="Next month">›</button></div><button className="add-sched-btn" onClick={() => setEditor(makeRule())}>+ Add Exception</button></div>
        <div className="location-calendar-wrap"><div className="cal-day-headers">{DISPLAY_DAYS.map(day => <span key={day}>{day}</span>)}</div><div className="cal-days-grid">{calendarCells.map(cell => cell.empty ? <div key={cell.key} className="cal-cell empty" /> : <button type="button" key={cell.key} className={`cal-cell ${cell.rules.length ? 'has-exception' : ''}`} onClick={() => setEditor(makeRule(cell.date))} title={`Program exception for ${cell.date}`}><span className="day-num">{Number(cell.date.slice(-2))}</span>{cell.rules.map(item => <span key={item.id} className={`cal-exc-chip ${categoryClass(item.category)}`} onClick={event => { event.stopPropagation(); setEditor(item); }}><span className="dot" /><span className="txt">{item.name}</span></span>)}</button>)}</div></div>
      </section>
      <section className="panel schedule-panel"><div className="panel-header-row"><div><div className="panel-title">Active Calendar Overrides</div><small>State assignment: {REGIONS.find(region => region.id === store.regions[loc.id])?.name || 'Unassigned'}</small></div><select className="custom-select region-select" value={store.regions[loc.id] || ''} onChange={e => dispatch({ type: 'SCHEDULE_REGION', locationId: loc.id, regionId: e.target.value })}><option value="" disabled>Assign state</option>{REGIONS.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></div>
        <div className="sched-list">{exceptions.map(item => <div key={item.id} className="exc-card-item"><div className="left"><div className="exc-title-row"><b>{item.name}</b><span className={`cat-badge ${categoryClass(item.category)}`}>{item.category}</span></div><div className="t2">{item.date} · {item.action === 'suppress' ? 'Lane Suppressed (All Day)' : `${item.startTime}–${item.endTime}`} · {item.scope}</div>{item.recurrence !== 'once' && <div className="t3">Recurrence: {item.recurrence.toUpperCase()}</div>}</div><div className="right-actions"><button className="action-icon-btn edit" aria-label={`Edit ${item.name}`} onClick={() => setEditor(item)}>✎</button><button className="action-icon-btn delete" aria-label={`Delete ${item.name}`} onClick={() => setDeleting(item)}>×</button></div></div>)}{!exceptions.length && <div className="empty-sched-msg">No holiday or schedule exceptions programmed.</div>}</div><div className="override-rule-box"><b>Automatic Schedule Override Rule</b><p>Calendar exceptions take priority over standard schedules. Location rules take priority over assigned-state rules; conflicting rules remain visible for resolution.</p></div></section>
    </div>}
    {editor && <RuleEditor initial={editor} kind={kind} loc={loc} locations={locations} store={store} now={now} pending={!!pendingToken} close={() => setEditor(null)} save={record => send({ type: 'SCHEDULE_SAVE', kind, record })} />}
    {deleting && <Modal narrow title={`Delete ${deleting.name}?`} close={() => setDeleting(null)}><p className="delete-copy">This removes the rule. Existing activation and audit history will be retained.</p><div className="modal-actions"><button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button><button className="btn-primary danger" disabled={!!pendingToken} onClick={() => send({ type: 'SCHEDULE_DELETE', kind, id: deleting.id })}>Delete</button></div></Modal>}
  </div>;
}
