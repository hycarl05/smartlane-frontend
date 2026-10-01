import { useCallback, useEffect, useState } from 'react';
import { EMPTY_FILTERS, EQUIPMENT_TYPES, HEALTH_STATES, equipmentAlarms, formatTimestamp, isStale, monitoringScenario, queryEquipment, summarizeEquipment } from '../equipment';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import DeviceDetails from './DeviceDetails';

export function EquipmentSummary({ records, onOpen }) {
  const counts = summarizeEquipment(records);
  return <section className="equipment-summary" aria-label="Equipment health summary">
    <div><strong>Equipment health · {counts.total} devices</strong><small>Illustrative mock inventory · last observed health</small></div>
    <div className="equipment-summary-counts">{[...HEALTH_STATES, 'Unknown'].map(health => <span key={health}><EquipmentStatusBadge device={{ health }} /> <b>{counts[health]}</b></span>)}<span>Stale: <b>{counts.stale}</b></span></div>
    {onOpen && <button type="button" onClick={onOpen}>View Equipment Status →</button>}
  </section>;
}

export function EquipmentAlarms({ records, onDetails }) {
  const alarms = equipmentAlarms(records);
  return <section className="equipment-alarms" aria-labelledby="equipment-alarms-title"><h3 id="equipment-alarms-title">Current equipment alarms ({alarms.length})</h3>
    <p>Mock active faults and warnings · separate from historical audit records. Times and issues are illustrative.</p>
    {!alarms.length ? <p>No current alarms in this mock dataset.</p> : <ul>{alarms.map(a => <li key={a.id}>
      <div><strong>{a.device}</strong><p>{a.location}</p><p>{a.issue}</p></div>
      <div><strong className={a.severity === 'Major' ? 'equipment-text-bad' : 'equipment-text-warn'}>{a.severity}</strong><p>Raised: {formatTimestamp(a.raisedAt)}</p></div>
      <button type="button" onClick={() => onDetails(a.deviceId)} aria-label={`View details for ${a.device}`}>View Details</button>
    </li>)}</ul>}
  </section>;
}

export default function EquipmentMonitoring({ records, locations, locationId }) {
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, location: locationId });
  const [sort, setSort] = useState({ field: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [scenario, setScenario] = useState('normal');
  const [exportMessage, setExportMessage] = useState('');
  const closeDetails = useCallback(() => setSelectedId(null), []);
  useEffect(() => {
    if (scenario !== 'loading') return;
    const timer = setTimeout(() => setScenario('normal'), 1500);
    return () => clearTimeout(timer);
  }, [scenario]);
  const update = (key, value) => { setFilters(old => ({ ...old, [key]: value })); setPage(1); setSelectedId(null); setExportMessage(''); };
  const data = monitoringScenario(records, scenario);
  const scoped = data.filter(d => filters.location === 'all' || d.locationId === filters.location);
  const invalidRange = filters.from && filters.to && new Date(filters.from) > new Date(filters.to);
  const matches = invalidRange ? [] : queryEquipment(data, filters, sort);
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const currentPage = Math.min(page, pages);
  const selected = scoped.find(d => d.id === selectedId);
  const sortBy = field => { setSort(old => ({ field, direction: old.field === field && old.direction === 'asc' ? 'desc' : 'asc' })); setPage(1); };
  const reset = () => { setFilters({ ...EMPTY_FILTERS, location: locationId }); setPage(1); setSelectedId(null); setExportMessage(''); };
  const ready = !['loading', 'unavailable'].includes(scenario);
  return <div className="tab-panel active equipment-page">
    <header className="equipment-heading"><div><h2>Equipment Status</h2><p>Monitoring prototype · illustrative inventory · timestamps shown in your local time.</p></div>
      <label htmlFor="equipment-scenario">Preview data state<select id="equipment-scenario" value={scenario} onChange={e => { setScenario(e.target.value); setPage(1); setSelectedId(null); setExportMessage(''); }}>
        <option value="normal">Mock records</option><option value="loading">Loading (1.5 seconds)</option><option value="empty">No equipment</option><option value="unavailable">Data unavailable</option><option value="stale">Stale observations</option>
      </select></label>
    </header>
    <div className="equipment-filters">
      <label htmlFor="equipment-location">Location<select id="equipment-location" value={filters.location} onChange={e => update('location', e.target.value)}><option value="all">All locations</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <label htmlFor="equipment-type">Equipment type<select id="equipment-type" value={filters.type} onChange={e => update('type', e.target.value)}><option value="all">All types</option>{EQUIPMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
      <label htmlFor="equipment-health">Health<select id="equipment-health" value={filters.health} onChange={e => update('health', e.target.value)}><option value="all">All health states</option>{[...HEALTH_STATES, 'Unknown'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label htmlFor="equipment-connectivity">Connectivity<select id="equipment-connectivity" value={filters.connectivity} onChange={e => update('connectivity', e.target.value)}><option value="all">All connections</option>{['Active', 'Inactive', 'Unknown'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label htmlFor="equipment-from">Updated from<input id="equipment-from" type="datetime-local" value={filters.from} onChange={e => update('from', e.target.value)} /></label>
      <label htmlFor="equipment-to">Updated through<input id="equipment-to" type="datetime-local" value={filters.to} onChange={e => update('to', e.target.value)} aria-invalid={!!invalidRange} aria-describedby={invalidRange ? 'equipment-range-error' : undefined} /></label>
      <label className="equipment-search" htmlFor="equipment-search">Search devices<input id="equipment-search" type="search" placeholder="Name, ID, description or location" value={filters.search} onChange={e => update('search', e.target.value)} /></label>
      <button type="button" onClick={reset}>Reset filters</button>
    </div>
    {invalidRange && <p role="alert" id="equipment-range-error">End of range must be at or after the start.</p>}
    {ready && <EquipmentSummary records={scoped} />}
    <div className="equipment-toolbar"><span role="status">{ready ? `${matches.length} matching devices` : 'Observations not available'}</span>
      <div>{['PDF', 'Excel'].map(format => <button key={format} type="button" disabled={!ready || !matches.length || !!invalidRange} onClick={() => setExportMessage(`Simulation only: ${format} export would contain ${matches.length} filtered, sorted records across all pages. No file was generated or downloaded.`)}>Simulate {format} export</button>)}</div>
    </div>
    <p className="equipment-notice" role="status">{exportMessage || 'PDF and Excel export controls are simulations in Phase 1; no file is generated.'}</p>
    {!ready ? <div className="equipment-state" role="status" aria-busy={scenario === 'loading'}><h3>{scenario === 'loading' ? 'Loading mock equipment…' : 'Equipment data unavailable'}</h3><p>{scenario === 'loading' ? 'Demonstrating a pending read.' : 'Demonstration error. No healthy state or zero-alarm result is inferred.'}</p>{scenario === 'unavailable' && <button type="button" onClick={() => setScenario('loading')}>Retry mock load</button>}</div> : <>
      {scoped.some(d => isStale(d)) && <p className="equipment-stale" role="status">Stale observations: badges show last reported health, not verified current health. Preview data state changes are local demonstrations, not a telemetry refresh.</p>}
      {!scoped.length ? <div className="equipment-state"><h3>No equipment</h3><p>No devices are present in this demo scope. Select Mock records to restore the inventory.</p></div> : !matches.length ? <div className="equipment-state"><h3>No matching results</h3><p>Adjust your search or filters.</p><button type="button" onClick={reset}>Clear filters</button></div> : <div className="equipment-table-scroll" tabIndex={0} role="region" aria-label="Equipment table, scroll horizontally on small screens">
        <table className="equipment-table"><caption>Mock device observations — not approved site inventory</caption><thead><tr>{[['name', 'Device name'], ['description', 'Description'], ['type', 'Equipment type'], ['location', 'Location'], ['connectivity', 'Connectivity'], ['health', 'Health'], ['updatedAt', 'Last updated']].map(([field, label]) => <th key={field} scope="col" aria-sort={sort.field === field ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><button type="button" onClick={() => sortBy(field)}>{label} {sort.field === field ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</button></th>)}<th scope="col">Details</th></tr></thead>
          <tbody>{matches.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(d => <tr key={d.id}><th scope="row">{d.name}<small>{d.id}</small></th><td>{d.description}</td><td>{d.type}</td><td>{d.location}</td><td><EquipmentStatusBadge device={d} field="connectivity" /></td><td><EquipmentStatusBadge device={d} /></td><td>{formatTimestamp(d.updatedAt)}{isStale(d) && <strong className="equipment-stale-label">Stale observation</strong>}</td><td><button type="button" onClick={() => setSelectedId(d.id)} aria-label={`View details for ${d.name}`}>View Details</button></td></tr>)}</tbody>
        </table>
      </div>}
      <nav className="equipment-pagination" aria-label="Equipment pagination"><label htmlFor="equipment-size">Per page<select id="equipment-size" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>{[10, 20, 50].map(n => <option key={n}>{n}</option>)}</select></label><span>Page {currentPage} of {pages}</span><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button type="button" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></nav>
      <EquipmentAlarms records={scoped} onDetails={setSelectedId} />
    </>}
    {selected && ready && <DeviceDetails key={selected.id} device={selected} onClose={closeDetails} />}
  </div>;
}
