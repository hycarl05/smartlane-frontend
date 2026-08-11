import React, { useState } from 'react';

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
  },
  {
    id: 'sched-3',
    name: 'Hari Merdeka Extended Operations',
    type: 'one-time',
    startTime: '06:00',
    endTime: '22:00',
    days: [],
    date: '2026-08-31',
    status: 'Upcoming',
    locationId: 'pms'
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

export default function Schedule({ loc, onShowToast }) {
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'weekly',
    date: '',
    startTime: '08:00',
    endTime: '17:00',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
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

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a schedule name.');
      return;
    }

    if (formData.type === 'one-time' && !formData.date) {
      alert('Please select a specific date for One-Time schedule.');
      return;
    }

    if (formData.type === 'weekly' && formData.days.length === 0) {
      alert('Please select at least one day for Weekly-Recurring schedule.');
      return;
    }

    if (editingItem) {
      // Edit existing
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
      // Create new
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

  const formatScheduleTime = (item) => {
    if (item.type === 'one-time') {
      const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Specific Date';
      return `${dateStr} · ${item.startTime}–${item.endTime}`;
    }
    const daysStr = item.days && item.days.length > 0 ? item.days.join(', ') : 'No days';
    return `${daysStr} · ${item.startTime}–${item.endTime}`;
  };

  return (
    <div className="tab-panel active">
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

          <div className="panel-title" style={{ marginTop: '20px', marginBottom: '8px' }}>Active One-Time &amp; Exception Schedules</div>
          <div className="sched-list">
            {schedules.filter(s => s.type === 'one-time').map(item => (
              <div key={item.id} className="sched-row">
                <div className="left">
                  <div className="t1">{item.name}</div>
                  <div className="t2">{item.date} · {item.startTime}–{item.endTime}</div>
                </div>
                <span className="tag warn">One-Time Activation</span>
              </div>
            ))}
            {schedules.filter(s => s.type === 'one-time').length === 0 && (
              <div className="empty-sched-msg" style={{ fontSize: '11px' }}>No active one-time schedule overrides.</div>
            )}
          </div>
        </div>
      </div>

      {/* SCHEDULE EDITOR MODAL */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Schedule' : 'Create New Smartlane Schedule'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
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
        </div>
      )}
    </div>
  );
}
