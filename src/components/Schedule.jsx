import React, { useState } from 'react';
import { createPortal } from 'react-dom';

const INITIAL_SCHEDULES = [
  {
    id: 'sched-1',
    name: 'Peak Hours — Evening Northbound',
    type: 'weekly', // 'one-time' | 'weekly'
    startTime: '17:00',
    endTime: '19:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    date: '',
    status: 'Upcoming',
    locationId: 'pms'
  },
  {
    id: 'sched-2',
    name: 'Peak Hours — Morning Northbound',
    type: 'weekly',
    startTime: '07:00',
    endTime: '09:30',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    date: '',
    status: 'Completed',
    locationId: 'pms'
  }
];

const INITIAL_EXCEPTIONS = [
  {
    id: 'exc-1',
    title: 'Hari Merdeka Holiday Schedule',
    category: 'public-holiday', // 'public-holiday' | 'special-exception' | 'recurring-exception'
    date: '2026-08-31',
    startTime: '06:00',
    endTime: '22:00',
    action: 'override-hours', // 'override-hours' | 'suppress-lane'
    recurrence: 'annual', // 'none' | 'annual' | 'weekly'
    status: 'Active Override'
  },
  {
    id: 'exc-2',
    title: 'Awal Muharram Maintenance & Exception',
    category: 'public-holiday',
    date: '2026-06-17',
    startTime: '00:00',
    endTime: '23:59',
    action: 'suppress-lane',
    recurrence: 'none',
    status: 'Suppressed'
  },
  {
    id: 'exc-3',
    title: 'Weekend Construction Traffic Override',
    category: 'special-exception',
    date: '2026-08-15',
    startTime: '08:00',
    endTime: '20:00',
    action: 'override-hours',
    recurrence: 'none',
    status: 'Scheduled'
  }
];

const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'M', full: 'Monday' },
  { id: 'Tue', label: 'T', full: 'Tuesday' },
  { id: 'Wed', label: 'W', full: 'Wednesday' },
  { id: 'Thu', label: 'T', full: 'Thursday' },
  { id: 'Fri', label: 'F', full: 'Friday' },
  { id: 'Sat', label: 'S', full: 'Saturday' },
  { id: 'Sun', label: 'S', full: 'Sunday' }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function Schedule({ loc, onShowToast }) {
  // Navigation sub-tab: 'schedules' | 'exceptions'
  const [subTab, setSubTab] = useState('schedules');

  // Standard Schedules State
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Exceptions State
  const [exceptions, setExceptions] = useState(INITIAL_EXCEPTIONS);
  const [showExcModal, setShowExcModal] = useState(false);
  const [editingExc, setEditingExc] = useState(null);

  // Calendar View Month state (Default August 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(7); // 0-indexed, 7 = August

  // Schedule Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'weekly',
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  });

  // Exception Form State
  const [excFormData, setExcFormData] = useState({
    title: '',
    category: 'public-holiday',
    date: '2026-08-31',
    startTime: '06:00',
    endTime: '22:00',
    action: 'override-hours',
    recurrence: 'annual'
  });

  const [conflictError, setConflictError] = useState(null);

  // ---------------- SCHEDULE ACTIONS ----------------
  const handleOpenAdd = () => {
    setEditingItem(null);
    setConflictError(null);
    setFormData({
      name: '',
      type: 'weekly',
      date: '',
      startTime: '08:00',
      endTime: '17:00',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    });
    setShowModal(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setConflictError(null);
    setFormData({
      name: item.name,
      type: item.type || 'weekly',
      date: item.date || '',
      startTime: item.startTime || '08:00',
      endTime: item.endTime || '17:00',
      days: item.days || []
    });
    setShowModal(true);
  };

  const handleDelete = (id, name) => {
    setSchedules(prev => prev.filter(s => s.id !== id));
    if (onShowToast) onShowToast(`Schedule "${name}" deleted successfully`);
  };

  const handleToggleDay = (dayId) => {
    setFormData(prev => {
      const exists = prev.days.includes(dayId);
      const updatedDays = exists
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId];
      return { ...prev, days: updatedDays };
    });
  };

  const timeToMinutes = (tStr) => {
    if (!tStr) return 0;
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
  };

  const checkConflict = () => {
    const newStart = timeToMinutes(formData.startTime);
    const newEnd = timeToMinutes(formData.endTime);

    if (newStart >= newEnd) {
      return 'End time must be later than start time.';
    }

    for (const item of schedules) {
      if (editingItem && item.id === editingItem.id) continue;

      const existStart = timeToMinutes(item.startTime);
      const existEnd = timeToMinutes(item.endTime);
      const isTimeOverlap = Math.max(newStart, existStart) < Math.min(newEnd, existEnd);

      if (!isTimeOverlap) continue;

      if (formData.type === 'one-time' && item.type === 'one-time') {
        if (formData.date === item.date) {
          return `Scheduling Conflict detected: Overlaps with One-Time run "${item.name}" on ${item.date} (${item.startTime}–${item.endTime}).`;
        }
      }

      if (formData.type === 'weekly' && item.type === 'weekly') {
        const sharedDays = formData.days.filter(d => item.days.includes(d));
        if (sharedDays.length > 0) {
          return `Scheduling Conflict detected: Overlaps with Weekly run "${item.name}" on [${sharedDays.join(', ')}] (${item.startTime}–${item.endTime}).`;
        }
      }

      if (formData.type === 'one-time' && item.type === 'weekly') {
        if (formData.date) {
          const dObj = new Date(formData.date);
          const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayMap[dObj.getDay()];
          if (item.days.includes(dayName)) {
            return `Scheduling Conflict detected: Overlaps with Weekly run "${item.name}" on ${dayName} (${item.startTime}–${item.endTime}).`;
          }
        }
      }

      if (formData.type === 'weekly' && item.type === 'one-time') {
        if (item.date) {
          const dObj = new Date(item.date);
          const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayName = dayMap[dObj.getDay()];
          if (formData.days.includes(dayName)) {
            return `Scheduling Conflict detected: Overlaps with One-Time run "${item.name}" on ${item.date} (${dayName}) (${item.startTime}–${item.endTime}).`;
          }
        }
      }
    }

    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setConflictError('Please enter a schedule name.');
      return;
    }

    if (formData.type === 'one-time' && !formData.date) {
      setConflictError('Please select a specific date for One-Time schedule.');
      return;
    }

    if (formData.type === 'weekly' && formData.days.length === 0) {
      setConflictError('Please select at least one day for Weekly-Recurring schedule.');
      return;
    }

    const conflict = checkConflict();
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    setConflictError(null);

    if (editingItem) {
      setSchedules(prev =>
        prev.map(s =>
          s.id === editingItem.id
            ? {
                ...s,
                name: formData.name,
                type: formData.type,
                date: formData.type === 'one-time' ? formData.date : '',
                startTime: formData.startTime,
                endTime: formData.endTime,
                days: formData.type === 'weekly' ? formData.days : []
              }
            : s
        )
      );
      if (onShowToast) onShowToast(`Schedule "${formData.name}" updated`);
    } else {
      const newItem = {
        id: 'sched-' + Date.now(),
        name: formData.name,
        type: formData.type,
        startTime: formData.startTime,
        endTime: formData.endTime,
        days: formData.type === 'weekly' ? formData.days : [],
        date: formData.type === 'one-time' ? formData.date : '',
        status: 'Upcoming',
        locationId: loc ? loc.id : 'all'
      };
      setSchedules(prev => [newItem, ...prev]);
      if (onShowToast) onShowToast(`New schedule "${formData.name}" created`);
    }

    setShowModal(false);
  };

  // ---------------- EXCEPTION ACTIONS ----------------
  const handleOpenAddExc = (targetDateStr = '') => {
    setEditingExc(null);
    setExcFormData({
      title: '',
      category: 'public-holiday',
      date: targetDateStr || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-15`,
      startTime: '06:00',
      endTime: '22:00',
      action: 'override-hours',
      recurrence: 'annual'
    });
    setShowExcModal(true);
  };

  const handleOpenEditExc = (exc) => {
    setEditingExc(exc);
    setExcFormData({
      title: exc.title,
      category: exc.category,
      date: exc.date,
      startTime: exc.startTime,
      endTime: exc.endTime,
      action: exc.action,
      recurrence: exc.recurrence
    });
    setShowExcModal(true);
  };

  const handleDeleteExc = (id, title) => {
    setExceptions(prev => prev.filter(e => e.id !== id));
    if (onShowToast) onShowToast(`Exception "${title}" deleted`);
  };

  const handleSubmitExc = (e) => {
    e.preventDefault();
    if (!excFormData.title.trim()) {
      alert('Please enter exception title');
      return;
    }

    if (editingExc) {
      setExceptions(prev =>
        prev.map(e =>
          e.id === editingExc.id
            ? { ...e, ...excFormData }
            : e
        )
      );
      if (onShowToast) onShowToast(`Exception "${excFormData.title}" updated`);
    } else {
      const newExc = {
        id: 'exc-' + Date.now(),
        ...excFormData,
        status: excFormData.action === 'suppress-lane' ? 'Suppressed' : 'Active Override'
      };
      setExceptions(prev => [newExc, ...prev]);
      if (onShowToast) onShowToast(`Exception "${excFormData.title}" programmed`);
    }

    setShowExcModal(false);
  };

  const formatScheduleTime = (item) => {
    if (item.type === 'one-time') {
      const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Specific Date';
      return `${dateStr} · ${item.startTime}–${item.endTime}`;
    }
    const daysStr = item.days && item.days.length > 0 ? item.days.join(', ') : 'No days';
    return `${daysStr} · ${item.startTime}–${item.endTime}`;
  };

  // ---------------- CALENDAR GENERATOR ----------------
  const generateCalendarDays = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun
    // Adjust to Mon-start calendar (0 = Mon ... 6 = Sun)
    const adjustedFirstDay = (firstDayIndex + 6) % 7;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const cells = [];
    // Padding previous month
    for (let i = 0; i < adjustedFirstDay; i++) {
      cells.push({ type: 'empty', key: `prev-${i}` });
    }
    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const matchedExceptions = exceptions.filter(e => e.date === dateStr);
      cells.push({
        type: 'day',
        day,
        dateStr,
        exceptions: matchedExceptions,
        key: dateStr
      });
    }
    return cells;
  };

  return (
    <div className="tab-panel active">
      {/* MODULE NAVIGATION SUB-TAB BAR */}
      <div className="subtab-bar">
        <button
          className={`subtab-btn ${subTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setSubTab('schedules')}
        >
          📅 Standard Schedules
        </button>
        <button
          className={`subtab-btn ${subTab === 'exceptions' ? 'active' : ''}`}
          onClick={() => setSubTab('exceptions')}
        >
          ⚠️ Holiday &amp; Exception Calendar ({exceptions.length})
        </button>
      </div>

      {subTab === 'schedules' ? (
        <div className="sched-grid">
          {/* LEFT COLUMN: Schedule List & Management */}
          <div className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="panel-title" style={{ margin: 0 }}>Schedule Controller</div>
              <button className="add-sched-btn" onClick={handleOpenAdd}>
                + New schedule
              </button>
            </div>

            <div className="sched-list" style={{ flex: 1 }}>
              {schedules.map((item) => (
                <div key={item.id} className="sched-card-item">
                  <div className="left">
                    <div className="sched-title-row">
                      <span className="t1">{item.name}</span>
                      <span className={`type-chip ${item.type}`}>
                        {item.type === 'one-time' ? 'One-Time' : 'Weekly Recurring'}
                      </span>
                    </div>
                    <div className="t2">{formatScheduleTime(item)}</div>
                  </div>

                  <div className="right-actions">
                    <span className={`tag ${item.status === 'Upcoming' ? 'good' : 'neutral'}`}>
                      {item.status}
                    </span>
                    <button className="action-icon-btn edit" title="Edit Schedule" onClick={() => handleOpenEdit(item)}>
                      ✎
                    </button>
                    <button className="action-icon-btn delete" title="Delete Schedule" onClick={() => handleDelete(item.id, item.name)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="empty-sched-msg">No schedules configured. Click "+ New schedule" to add one.</div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Calendar / Weekly Visualizer & Exceptions */}
          <div className="panel" style={{ minHeight: 0 }}>
            <div className="panel-title">This Week Overview</div>
            <div className="week-grid">
              {DAYS_OF_WEEK.map((dayObj, idx) => {
                const activeOnDay = schedules.some(
                  s => s.type === 'weekly' && s.days.includes(dayObj.id)
                );
                return (
                  <div key={dayObj.id} className={`week-cell ${activeOnDay ? 'has-run' : ''}`}>
                    {dayObj.label}
                    <span className="d">{idx + 10}</span>
                  </div>
                );
              })}
            </div>

            <div className="panel-title" style={{ marginTop: '20px', marginBottom: '8px' }}>Programmed Exceptions</div>
            <div className="sched-list">
              {exceptions.map(exc => (
                <div key={exc.id} className="sched-row">
                  <div className="left">
                    <div className="t1">{exc.title}</div>
                    <div className="t2">{exc.date} · {exc.action === 'suppress-lane' ? 'Lane Suppressed' : `${exc.startTime}–${exc.endTime}`}</div>
                  </div>
                  <span className={`tag ${exc.action === 'suppress-lane' ? 'bad' : 'warn'}`}>
                    {exc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* HOLIDAY & EXCEPTION MANAGEMENT MODULE */
        <div className="sched-grid">
          {/* INTERACTIVE LOCATION CALENDAR */}
          <div className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="calendar-header-bar">
              <div className="cal-title-wrap">
                <span className="cal-icon">🗓️</span>
                <b>{loc ? loc.name : 'Location'} Exception Calendar</b>
              </div>
              <div className="cal-month-nav">
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(y => y - 1);
                    } else {
                      setCurrentMonth(m => m - 1);
                    }
                  }}
                >
                  ◄
                </button>
                <span className="cal-month-label">{MONTH_NAMES[currentMonth]} {currentYear}</span>
                <button
                  className="cal-nav-btn"
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(y => y + 1);
                    } else {
                      setCurrentMonth(m => m + 1);
                    }
                  }}
                >
                  ►
                </button>
              </div>
              <button className="add-sched-btn" onClick={() => handleOpenAddExc()}>
                + Add Exception
              </button>
            </div>

            <div className="location-calendar-wrap">
              <div className="cal-day-headers">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
              <div className="cal-days-grid">
                {generateCalendarDays().map((cell) => {
                  if (cell.type === 'empty') {
                    return <div key={cell.key} className="cal-cell empty"></div>;
                  }

                  const hasExc = cell.exceptions.length > 0;
                  return (
                    <div
                      key={cell.key}
                      className={`cal-cell ${hasExc ? 'has-exception' : ''}`}
                      onClick={() => handleOpenAddExc(cell.dateStr)}
                      title={`Click to program exception for ${cell.dateStr}`}
                    >
                      <div className="day-num">{cell.day}</div>
                      {cell.exceptions.map(exc => (
                        <div
                          key={exc.id}
                          className={`cal-exc-chip ${exc.category}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditExc(exc);
                          }}
                        >
                          <span className="dot"></span>
                          <span className="txt">{exc.title}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: EXCEPTIONS OVERVIEW & OVERRIDE SUMMARY */}
          <div className="panel" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="panel-title">Active Calendar Overrides</div>
            <div className="sched-list" style={{ flex: 1 }}>
              {exceptions.map(exc => (
                <div key={exc.id} className="exc-card-item">
                  <div className="left">
                    <div className="exc-title-row">
                      <b>{exc.title}</b>
                      <span className={`cat-badge ${exc.category}`}>
                        {exc.category === 'public-holiday' ? 'Public Holiday' : exc.category === 'special-exception' ? 'Special Event' : 'Recurring'}
                      </span>
                    </div>
                    <div className="t2">
                      📅 {exc.date} &nbsp;•&nbsp; ⏰ {exc.action === 'suppress-lane' ? 'Lane Suppressed (All Day)' : `${exc.startTime} – ${exc.endTime}`}
                    </div>
                    {exc.recurrence !== 'none' && (
                      <div className="t3">🔄 Recurrence: {exc.recurrence.toUpperCase()}</div>
                    )}
                  </div>
                  <div className="right-actions">
                    <button className="action-icon-btn edit" title="Edit Exception" onClick={() => handleOpenEditExc(exc)}>
                      ✎
                    </button>
                    <button className="action-icon-btn delete" title="Delete Exception" onClick={() => handleDeleteExc(exc.id, exc.title)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {exceptions.length === 0 && (
                <div className="empty-sched-msg">No holiday or schedule exceptions programmed.</div>
              )}
            </div>

            <div className="override-rule-box">
              <b>ℹ️ Automatic Schedule Override Rule</b>
              <p>
                Calendar exceptions take top priority over standard weekly schedules. Any active operating window on these dates will be automatically updated or suppressed according to the programmed rule.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE EDITOR MODAL */}
      {showModal && createPortal(
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Schedule' : 'Create New Smartlane Schedule'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              {conflictError && (
                <div className="conflict-alert-banner">
                  <span className="alert-icon">⚠️</span>
                  <div className="alert-text">
                    <b>Conflict Detected</b>
                    <p>{conflictError}</p>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Schedule Name / Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. Peak Hours — Evening Rush"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Activation Type</label>
                <div className="type-toggle-group">
                  <button
                    type="button"
                    className={`type-toggle-btn ${formData.type === 'weekly' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'weekly' })}
                  >
                    <span>🔄 Weekly-Recurring</span>
                    <small>Repeat on specific days each week</small>
                  </button>
                  <button
                    type="button"
                    className={`type-toggle-btn ${formData.type === 'one-time' ? 'active' : ''}`}
                    onClick={() => setFormData({ ...formData, type: 'one-time' })}
                  >
                    <span>📅 One-Time</span>
                    <small>Programmed for a specific date</small>
                  </button>
                </div>
              </div>

              {formData.type === 'one-time' ? (
                <div className="form-group">
                  <label>Target Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Recurring Days</label>
                  <div className="days-selector">
                    {DAYS_OF_WEEK.map(d => (
                      <button
                        key={d.id}
                        type="button"
                        className={`day-btn ${formData.days.includes(d.id) ? 'selected' : ''}`}
                        onClick={() => handleToggleDay(d.id)}
                        title={d.full}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Open Time (Start)</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Close Time (End)</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* HOLIDAY & EXCEPTION EDITOR MODAL */}
      {showExcModal && createPortal(
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingExc ? 'Edit Calendar Exception' : 'Program Location Calendar Exception'}</h3>
              <button className="close-btn" onClick={() => setShowExcModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmitExc}>
              <div className="form-group">
                <label>Exception Title / Event</label>
                <input
                  type="text"
                  placeholder="e.g. Hari Merdeka Holiday Schedule"
                  value={excFormData.title}
                  onChange={e => setExcFormData({ ...excFormData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={excFormData.category}
                    onChange={e => setExcFormData({ ...excFormData, category: e.target.value })}
                    className="custom-select"
                  >
                    <option value="public-holiday">Public Holiday</option>
                    <option value="special-exception">Special Exception Day</option>
                    <option value="recurring-exception">Recurring Exception</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Date</label>
                  <input
                    type="date"
                    value={excFormData.date}
                    onChange={e => setExcFormData({ ...excFormData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Override Action</label>
                <div className="type-toggle-group">
                  <button
                    type="button"
                    className={`type-toggle-btn ${excFormData.action === 'override-hours' ? 'active' : ''}`}
                    onClick={() => setExcFormData({ ...excFormData, action: 'override-hours' })}
                  >
                    <span>⏱️ Custom Operating Hours</span>
                    <small>Override standard hours on this date</small>
                  </button>
                  <button
                    type="button"
                    className={`type-toggle-btn ${excFormData.action === 'suppress-lane' ? 'active' : ''}`}
                    onClick={() => setExcFormData({ ...excFormData, action: 'suppress-lane' })}
                  >
                    <span>🚫 Full Day Suppress</span>
                    <small>Keep Smartlane CLOSED all day</small>
                  </button>
                </div>
              </div>

              {excFormData.action === 'override-hours' && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Override Start Time</label>
                    <input
                      type="time"
                      value={excFormData.startTime}
                      onChange={e => setExcFormData({ ...excFormData, startTime: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Override End Time</label>
                    <input
                      type="time"
                      value={excFormData.endTime}
                      onChange={e => setExcFormData({ ...excFormData, endTime: e.target.value })}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Recurrence Rule</label>
                <select
                  value={excFormData.recurrence}
                  onChange={e => setExcFormData({ ...excFormData, recurrence: e.target.value })}
                  className="custom-select"
                >
                  <option value="none">One-Time Exception Only</option>
                  <option value="annual">Repeats Annually (Same Date Every Year)</option>
                  <option value="weekly">Repeats Weekly</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowExcModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingExc ? 'Save Exception' : 'Program Exception'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
