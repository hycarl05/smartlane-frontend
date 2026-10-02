import React, { useEffect, useMemo, useState } from 'react';
import { auditInRange } from '../phase5';

const PAGE_SIZE = 10;
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const resultTone = value => /fail|error|critical|cancel|offline/i.test(value) ? 'danger' : /warn|pause|pending|degrad/i.test(value) ? 'warning' : /success|complete|acknowledged|simulated/i.test(value) ? 'success' : 'neutral';

export default function AuditLogDisplay({ auditLogs = [], locations = [], currentLocationFilter = 'all', onShowToast }) {
  const initialFilters = { search: '', from: '', to: '', actor: '', module: 'all', activity: '', location: currentLocationFilter, equipment: '', result: 'all' };
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState('desc');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const set = (key, value) => setFilters(current => ({ ...current, [key]: value }));
  useEffect(() => setPage(1), [filters, sort]);
  useEffect(() => setFilters(current => ({ ...current, location: currentLocationFilter })), [currentLocationFilter]);

  const modules = [...new Set(auditLogs.map(row => row.module).filter(Boolean))].sort();
  const results = [...new Set(auditLogs.map(row => row.result).filter(Boolean))].sort();
  const activeFilterCount = ['search', 'from', 'to', 'actor', 'activity', 'equipment'].filter(key => filters[key]).length + (filters.module !== 'all' ? 1 : 0) + (filters.result !== 'all' ? 1 : 0);
  const rows = useMemo(() => auditLogs.filter(row => {
    const blob = Object.values(row).join(' ').toLowerCase();
    const locationId = row.locationId || locations.find(location => location.name === row.location)?.id;
    return (!filters.search || blob.includes(filters.search.toLowerCase())) && auditInRange(row, filters.from, filters.to) &&
      (!filters.actor || String(row.initiator || row.actor).toLowerCase().includes(filters.actor.toLowerCase())) &&
      (filters.module === 'all' || row.module === filters.module) &&
      (!filters.activity || String(row.activity).toLowerCase().includes(filters.activity.toLowerCase())) &&
      (filters.location === 'all' || locationId === filters.location) &&
      (filters.result === 'all' || row.result === filters.result) &&
      (!filters.equipment || String(row.equipmentId || row.reference).toLowerCase().includes(filters.equipment.toLowerCase()));
  }).sort((a, b) => (new Date(String(a.timestamp).replace(' ', 'T')) - new Date(String(b.timestamp).replace(' ', 'T'))) * (sort === 'asc' ? 1 : -1)), [auditLogs, filters, locations, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const reset = () => setFilters({ ...initialFilters, location: currentLocationFilter });
  const downloadCsv = () => {
    const keys = ['timestamp', 'initiator', 'module', 'activity', 'location', 'equipmentId', 'result'];
    const csv = [keys.join(','), ...rows.map(row => keys.map(key => csvCell(row[key])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'smartlane-audit-filtered.csv'; anchor.click();
    URL.revokeObjectURL(url); onShowToast?.('Filtered audit CSV downloaded.');
  };

  return <section className="audit-log-display advanced-audit">
    <header className="audit-head">
      <div><span className="audit-kicker">Read-only event history</span><h2>Historical audit records</h2><p>Trace operator decisions, phase changes and equipment events for this Smartlane location.</p></div>
      <div className="audit-head-metrics"><span><b>{rows.length}</b> matching</span><span><b>{auditLogs.length}</b> available</span></div>
    </header>

    <div className="audit-filter-card">
      <div className="audit-filter-title"><div><strong>Filters</strong>{activeFilterCount > 0 && <span>{activeFilterCount} active</span>}</div><button type="button" onClick={() => setFiltersOpen(open => !open)} aria-expanded={filtersOpen}>{filtersOpen ? 'Hide filters' : 'Show filters'}</button></div>
      {filtersOpen && <div className="audit-filter-grid">
        <label className="audit-search">Search all fields<input type="search" placeholder="Search user, event, device…" value={filters.search} onChange={event => set('search', event.target.value)} /></label>
        <label>From<input type="datetime-local" value={filters.from} onChange={event => set('from', event.target.value)} /></label>
        <label>To<input type="datetime-local" value={filters.to} onChange={event => set('to', event.target.value)} /></label>
        <label>User / actor<input placeholder="Name or account" value={filters.actor} onChange={event => set('actor', event.target.value)} /></label>
        <label>Module<select value={filters.module} onChange={event => set('module', event.target.value)}><option value="all">All modules</option>{modules.map(module => <option key={module}>{module}</option>)}</select></label>
        <label>Activity<input placeholder="Activity contains…" value={filters.activity} onChange={event => set('activity', event.target.value)} /></label>
        <label>Location<select value={filters.location} onChange={event => set('location', event.target.value)}><option value="all">All authorized locations</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
        <label>Equipment ID<input placeholder="Equipment or reference ID" value={filters.equipment} onChange={event => set('equipment', event.target.value)} /></label>
        <label>Result<select value={filters.result} onChange={event => set('result', event.target.value)}><option value="all">All results</option>{results.map(result => <option key={result}>{result}</option>)}</select></label>
      </div>}
    </div>

    <div className="audit-toolbar">
      <div><button type="button" className="audit-btn subtle" onClick={reset} disabled={!activeFilterCount}>Reset filters</button><button type="button" className="audit-btn subtle" onClick={() => setSort(value => value === 'asc' ? 'desc' : 'asc')}>Timestamp {sort === 'asc' ? '↑ oldest first' : '↓ newest first'}</button></div>
      <div><button type="button" className="audit-btn" onClick={downloadCsv} disabled={!rows.length}>Download CSV</button><button type="button" className="audit-btn" onClick={() => window.print()}>Print / save PDF</button><button type="button" className="audit-btn" disabled title="Use the Reports page for Excel generation">Excel via Reports</button></div>
    </div>

    <p className="audit-readonly-note"><span aria-hidden="true">i</span> Read-only frontend display. Server-side immutability and encryption require backend verification.</p>
    {!rows.length ? <div className="audit-empty"><span aria-hidden="true">⌕</span><strong>No matching audit records</strong><p>Adjust or reset the filters to view stored events.</p><button type="button" onClick={reset}>Reset filters</button></div> : <div className="audit-table-shell" tabIndex="0" role="region" aria-label="Audit records table; scroll horizontally if needed">
      <table><thead><tr><th>Timestamp</th><th>User</th><th>Module</th><th>Activity</th><th>Location</th><th>Equipment</th><th>Result</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{shown.map((row, index) => <tr key={row.id || index}><td className="audit-time">{row.timestamp}</td><td><strong className="audit-user">{row.initiator || row.actor || '—'}</strong></td><td><span className="audit-module">{row.module || '—'}</span></td><td className="audit-activity">{row.activity || row.action || '—'}</td><td>{row.location || '—'}</td><td><code>{row.equipmentId || row.reference || 'N/A'}</code></td><td><span className={`audit-result ${resultTone(row.result)}`}>{row.result || 'Unknown'}</span></td><td><button type="button" className="audit-details" onClick={() => setSelected(row)}>Details</button></td></tr>)}</tbody>
      </table>
    </div>}
    <footer className="audit-pagination"><span>Showing {rows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {currentPage} of {pages}</span><button type="button" disabled={currentPage >= pages} onClick={() => setPage(value => value + 1)}>Next</button></div></footer>
    {selected && <div className="modal-overlay" role="presentation" onMouseDown={() => setSelected(null)}><div className="modal-content audit-detail-modal" role="dialog" aria-modal="true" aria-label="Audit record details" onMouseDown={event => event.stopPropagation()}><header><div><span className="audit-kicker">Audit record</span><h2>{selected.module || 'Event details'}</h2></div><button type="button" onClick={() => setSelected(null)}>Close</button></header><dl>{[['Timestamp', selected.timestamp], ['User', selected.initiator || selected.actor], ['Activity', selected.activity || selected.action], ['Location', selected.location], ['Equipment', selected.equipmentId || selected.reference], ['Result', selected.result || selected.outcome]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>{(selected.selectedVmsMessages?.length > 0) && <div className="audit-detail-messages"><strong>Selected VMS messages</strong>{selected.selectedVmsMessages.map(message => <p key={message}>{message}</p>)}</div>}</div></div>}
  </section>;
}
