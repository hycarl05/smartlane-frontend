import { useEffect, useState } from 'react';
import MonitoringDialog from './MonitoringDialog';
import EquipmentStatusBadge from './EquipmentStatusBadge';
import { defaultConfig, validateConfig, validateGroup, validateUser, MOCK_DIRECTORY } from '../administration';
import { ROLE_DESCRIPTIONS } from '../access';
import { useAccess } from '../accessContext';

function Editor({ kind, initial, devices, state, locations, loc, save, close, pending }) {
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState([]);
  const [review, setReview] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const update = (key, value) => { setDraft(d => ({ ...d, [key]: value })); setReview(false); setErrors([]); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const requestClose = () => dirty ? setDiscard(true) : close();
  const check = () => {
    const found = kind === 'settings' ? validateConfig(draft, devices, state.configs) : kind === 'groups' ? validateGroup(draft, devices, state.groups, locations.map(l => l.id)) : validateUser(draft, state.users, locations.map(l => l.id));
    setErrors(found); setReview(!found.length);
  };
  const identities = MOCK_DIRECTORY.filter(d => `${d.name} ${d.username}`.toLowerCase().includes(directorySearch.toLowerCase()));
  return <MonitoringDialog title={`${initial.id ? 'Edit' : 'Create'} ${kind === 'settings' ? 'equipment configuration' : kind === 'groups' ? 'equipment group' : 'user'} — ${kind === 'users' ? 'User administration' : loc.name}`} onClose={requestClose}>
    <p className="equipment-notice">Mock administration only. Close and save/discard before changing location. No credentials, equipment commands or directory requests are sent.</p>
    {discard ? <div role="alert"><p>Discard unsaved edits?</p><button onClick={close}>Discard edits</button><button onClick={() => setDiscard(false)}>Keep editing</button></div> : <>
    <div className="schedule-form-grid">
      <label>Name<input value={draft.name} onChange={e => update('name', e.target.value)} /></label>
      {kind !== 'users' && <label>Description<textarea value={draft.description} onChange={e => update('description', e.target.value)} /></label>}
      {kind === 'settings' && <>
        <label>Stable device ID<input readOnly value={draft.id} /></label>
        <label>Location (relationship locked)<input readOnly value={loc.name} /></label>
        <label>Equipment type (relationship locked)<input readOnly value={draft.type} /></label>
        <p>Location/type changes are blocked: linked LCS/I/O, groups and operation targets depend on this identity.</p>
        <label>Model<input value={draft.model} onChange={e => update('model', e.target.value)} placeholder="Dummy / illustrative model" /></label>
        <label>IP address (IPv4 demo)<input value={draft.ip} onChange={e => update('ip', e.target.value.trim())} placeholder="192.0.2.10" /></label>
        <label>Geographic latitude (degrees)<input type="number" step="any" min="-90" max="90" value={draft.latitude} onChange={e => update('latitude', e.target.value)} /></label>
        <label>Geographic longitude (degrees)<input type="number" step="any" min="-180" max="180" value={draft.longitude} onChange={e => update('longitude', e.target.value)} /></label>
        <p>Geographic coordinates are not Road Studio canvas X/Y. This form does not move the road drawing.</p>
        <label>Configuration enabled<select value={String(draft.enabled)} onChange={e => update('enabled', e.target.value === 'true')}><option value="true">Enabled</option><option value="false">Disabled</option></select></label>
        <p>Credentials: {draft.credentialsConfigured ? 'Configured (dummy flag only)' : 'Not configured'}. Use the separate credential action; no password is loaded.</p>
        <label>Configuration notes (recommended field; non-sensitive only)<textarea value={draft.parameterNotes} onChange={e => update('parameterNotes', e.target.value)} /></label>
        {draft.type === 'AVDS' && <label>Proposed observation polling interval (seconds; URS_1.1.10)<input type="number" min="1" max="3600" value={draft.pollingIntervalSeconds || ''} onChange={e => update('pollingIntervalSeconds', e.target.value)} /><small>Demo validation range: 1–3600, pending approval. Blank means not configured; saving does not generate readings.</small></label>}
        {['VMS', 'Mini VMS'].includes(draft.type) && <p>URS VMS interface: updated Jetfile. Compatibility/provisioning is unverified; no protocol connection is made.</p>}
        <p>{draft.type === 'LCS' || draft.type === 'LCS I/O Module' ? 'Existing LCS/I/O associations are retained; indication controls remain in the operation workflow.' : ['VMS', 'Mini VMS'].includes(draft.type) ? 'Phase-message parameters remain in the existing VMS editor; this form does not broadcast messages.' : draft.type === 'AVDS' ? 'Observation units and traffic readings remain in Equipment Status. Congestion policies are unchanged.' : 'CCTV preview remains simulated. No stream URL, PTZ provisioning or real VMS connection is configured.'}</p>
      </>}
      {kind === 'groups' && <><p>Location: {loc.name}. Mixed-type groups are organizational only (demo assumption). Saving does not change operation targets.</p><fieldset><legend>Member devices</legend>{devices.filter(d => d.locationId === loc.id).map(d => <label key={d.id}><input type="checkbox" checked={draft.deviceIds.includes(d.id)} onChange={e => update('deviceIds', e.target.checked ? [...draft.deviceIds, d.id] : draft.deviceIds.filter(id => id !== d.id))} />{d.name} · {d.type} · {d.id}</label>)}</fieldset></>}
      {kind === 'users' && <>
        <label>Username / directory identity<input readOnly={!!draft.directoryId} value={draft.username} onChange={e => update('username', e.target.value.trim())} /></label>
        <label>URS role<select value={draft.role} onChange={e => update('role', e.target.value)}>{Object.keys(ROLE_DESCRIPTIONS).map(role => <option key={role}>{role}</option>)}</select></label><p>{ROLE_DESCRIPTIONS[draft.role]}</p>
        <p>Active state: {draft.active ? 'Active' : 'Inactive'}. Use the confirmed deactivate/reactivate action after saving. No-location assignment is allowed and gives an empty access preview.</p>
        <fieldset><legend>Assigned locations</legend>{locations.map(l => <label key={l.id}><input type="checkbox" checked={draft.locationIds.includes(l.id)} onChange={e => update('locationIds', e.target.checked ? [...draft.locationIds, l.id] : draft.locationIds.filter(id => id !== l.id))} />{l.name} ({l.id})</label>)}</fieldset>
        <fieldset className="directory-search"><legend>Simulated Active Directory association</legend><p>Fictional sample identities only. No Active Directory connection was made.</p><label>Search sample directory<input value={directorySearch} onChange={e => setDirectorySearch(e.target.value)} /></label>{!identities.length && <p>No sample identities match this search.</p>}{identities.map(identity => { const associated = state.users.some(u => u.id !== draft.id && u.directoryId === identity.id); return <div key={identity.id}><b>{identity.name}</b> · {identity.username} · {identity.department}<button disabled={associated} onClick={() => { setReview(false); setDraft(d => ({ ...d, directoryId: identity.id, username: identity.username, name: identity.name })); }}>{associated ? 'Already associated' : 'Select identity'}</button></div>; })}<p>Selected association: {draft.directoryId || 'None (local demo profile)'}</p>{draft.directoryId && <button onClick={() => update('directoryId', null)}>Remove proposed association</button>}</fieldset>
      </>}
    </div>
    {errors.length > 0 && <p role="alert">{errors.join(' ')}</p>}
    {state.feedback?.errors.length > 0 && <p role="alert">{state.feedback.errors.join(' ')}</p>}
    {review && <div className="equipment-notice"><b>Review: {draft.name}</b><p>{kind === 'settings' ? `${draft.type} · ${loc.name} · ${draft.model} · ${draft.ip} · configuration ${draft.enabled ? 'enabled' : 'disabled'}` : kind === 'groups' ? `${loc.name}: ${draft.deviceIds.length} members` : `${draft.username} · ${draft.role} · ${draft.locationIds.length} assigned locations · ${draft.directoryId || 'no directory association'}`}</p><p>Only mock metadata will be saved; observed equipment health and operation state remain unchanged.</p></div>}
    <div className="operation-actions"><button onClick={requestClose}>Close editor</button>{review ? <button disabled={pending} onClick={() => save(draft)}>Confirm simulated save{kind === 'users' && draft.directoryId ? ' and association' : ''}</button> : <button onClick={check}>Validate and review</button>}</div>
    </>}
  </MonitoringDialog>;
}

function CredentialDialog({ device, save, close, pending }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [review, setReview] = useState(false);
  const [discard, setDiscard] = useState(false);
  const valid = username.startsWith('demo-') && password.startsWith('demo-') && password.length >= 8;
  const requestClose = () => username || password ? setDiscard(true) : close();
  return <MonitoringDialog title={`Dummy credentials — ${device.name}`} onClose={requestClose}>
    <p>Use invented values beginning with “demo-” only. No existing password is retrieved or prefilled. Saving discards both fields and retains only a configured flag. No secret storage or encryption is implemented.</p>
    {discard ? <p role="alert">Discard credential entry? <button onClick={close}>Discard and close</button><button onClick={() => setDiscard(false)}>Keep editing</button></p> : <>
      <label>Dummy username<input autoComplete="off" value={username} onChange={e => { setUsername(e.target.value); setReview(false); }} /></label>
      <label>Dummy password<input type="password" autoComplete="new-password" value={password} onChange={e => { setPassword(e.target.value); setReview(false); }} /></label>
      {!valid && <p>Both values must start with demo-; the dummy password needs at least 8 characters.</p>}
      {review && <p>Confirm replacing the configured flag for {device.id}? No entry value will be saved or logged.</p>}
      <button disabled={!valid || pending} onClick={() => { if (!review) setReview(true); else { setUsername(''); setPassword(''); save(); } }}>{review ? 'Confirm simulated credential save' : 'Review replacement'}</button>
    </>}
  </MonitoringDialog>;
}

export default function Administration({ kind, loc, locations, devices, state, dispatch }) {
  const { caps } = useAccess();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [scenario, setScenario] = useState('normal');
  const [editor, setEditor] = useState(null);
  const [credential, setCredential] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [pending, setPending] = useState(null);
  useEffect(() => { if (scenario !== 'loading') return; const timer = setTimeout(() => setScenario('normal'), 1000); return () => clearTimeout(timer); }, [scenario]);
  useEffect(() => { if (!pending || state.feedback?.token !== pending) return; setPending(null); if (!state.feedback.errors.length) { setEditor(null); setCredential(null); setConfirmation(null); } }, [pending, state.feedback]);
  const send = action => { const token = `${Date.now()}:${Math.random()}`; setPending(token); dispatch({ ...action, token, locationId: loc.id }); };
  const configs = devices.filter(d => d.locationId === loc.id).map(d => ({ ...defaultConfig(d), ...state.configs[d.id] }));
  const all = kind === 'settings' ? configs : kind === 'groups' ? state.groups.filter(g => g.locationId === loc.id) : state.users;
  const rows = scenario === 'empty' ? [] : all.filter(r => (stateFilter === 'all' || String(kind === 'users' ? r.active : r.enabled) === stateFilter) && `${r.name} ${r.username || ''} ${r.id}`.toLowerCase().includes(search.toLowerCase()) && (filter === 'all' || (kind === 'settings' ? r.type === filter : kind === 'users' ? r.role === filter : true)));
  const title = kind === 'settings' ? 'Equipment Configuration' : kind === 'groups' ? 'Equipment Groups' : 'User Management';
  const filters = kind === 'settings' ? [...new Set(configs.map(c => c.type))] : kind === 'users' ? Object.keys(ROLE_DESCRIPTIONS) : [];
  const newRecord = () => kind === 'groups' ? { name: '', description: '', locationId: loc.id, deviceIds: [] } : { name: '', username: '', role: 'Overview', active: true, locationIds: [], directoryId: null };
  const ready = !['loading', 'unavailable'].includes(scenario);
  return <div className="tab-panel active administration-page"><header className="equipment-heading"><div><h2>{title}</h2><p>{kind === 'users' ? 'Global user profiles and explicit location assignments' : `${loc.name} (${loc.id})`} · prototype resets on refresh.</p></div><label>Preview data state<select value={scenario} onChange={e => setScenario(e.target.value)}><option value="normal">Mock records</option><option value="loading">Loading</option><option value="unavailable">Unavailable</option><option value="empty">Empty demonstration</option></select></label></header>
    {kind === 'groups' && <p className="equipment-notice">Organizational equipment groups, not user roles/access groups. Existing VMS scopes still target individual signs, each location's VMS/Mini VMS set, or all accessible locations. Match LCS still targets its location. These saved groups do not change those targets or send commands.</p>}
    {kind === 'users' && <p className="equipment-notice">URS_1.1.3 mentions deletion; URS_1.1.12 specifies deactivation. This prototype implements deactivate/reactivate and retains user IDs/history; deletion awaits clarification. Active Directory is simulated.</p>}
    {kind === 'settings' && <p className="equipment-notice">Configuration enabled is separate from observed health/connectivity. No equipment is provisioned. Existing inventory IDs are reused; adding or relocating devices is outside this editor.</p>}
    {state.feedback && <p className="equipment-notice" role={state.feedback.errors.length ? 'alert' : 'status'}>{state.feedback.errors.length ? state.feedback.errors.join(' ') : state.feedback.message}</p>}
    <div className="operation-actions"><label>Search<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label>{filters.length > 0 && <label>Filter<select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All</option>{filters.map(f => <option key={f}>{f}</option>)}</select></label>}{kind !== 'groups' && <label>Active / enabled state<select value={stateFilter} onChange={e => setStateFilter(e.target.value)}><option value="all">All states</option><option value="true">Active / enabled</option><option value="false">Inactive / disabled</option></select></label>}<button onClick={() => { setSearch(''); setFilter('all'); setStateFilter('all'); }}>Reset filters</button>{kind !== 'settings' && <button disabled={!caps.configure || !ready} onClick={() => setEditor(newRecord())}>Create {kind === 'groups' ? 'group' : 'user'}</button>}</div>
    {!ready ? <div className="equipment-state" role="status"><h3>{scenario === 'loading' ? 'Loading demo records…' : 'Administration data unavailable (demo)'}</h3>{scenario === 'unavailable' && <button onClick={() => setScenario('loading')}>Retry mock load</button>}</div> : !rows.length ? <p className="equipment-state">{search || filter !== 'all' || stateFilter !== 'all' ? 'No matching results.' : `No ${title.toLowerCase()} records in this demo view.`}</p> : <div className="equipment-table-scroll" role="region" tabIndex={0} aria-label={title}><table className="equipment-table"><thead><tr><th>Name / ID</th><th>{kind === 'users' ? 'Identity / role' : 'Location / type'}</th><th>{kind === 'settings' ? 'Model / IP / credentials' : kind === 'groups' ? 'Description / membership' : 'Assigned locations'}</th><th>State</th><th>Actions</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><th scope="row">{r.name}<small>{r.id}</small>{kind === 'settings' && <small>{r.description}</small>}</th><td>{kind === 'users' ? <>{r.username}<br />{r.role}<br />{r.directoryId || 'Local demo identity'}</> : <>{loc.name}<br />{r.type || [...new Set(r.deviceIds.map(id => devices.find(d => d.id === id)?.type || 'Missing device'))].join(', ')}</>}</td><td>{kind === 'settings' ? <>{r.model || 'Not configured'} / {r.ip || 'Not configured'}<br />Credentials: {r.credentialsConfigured ? 'Configured (flag only)' : 'Not configured'}<br />Groups: {state.groups.filter(g => g.deviceIds.includes(r.id)).map(g => g.name).join(', ') || 'None'}</> : kind === 'groups' ? <>{r.description}<ul>{r.deviceIds.map(id => <li key={id}>{devices.find(d => d.id === id)?.name || 'Missing device'} · {id}</li>)}</ul></> : r.locationIds.map(id => locations.find(l => l.id === id)?.name || id).join(', ') || 'No authorized locations'}</td><td>{kind === 'settings' ? <>Configuration {r.enabled ? 'enabled' : 'disabled'}<br /><EquipmentStatusBadge device={devices.find(d => d.id === r.id)} /><EquipmentStatusBadge device={devices.find(d => d.id === r.id)} field="connectivity" /></> : kind === 'users' ? r.active ? 'Active' : 'Inactive' : 'Metadata only'}</td><td><button disabled={!caps.configure} onClick={() => setEditor(r)}>Edit / review</button>{kind === 'settings' && <><button disabled={!caps.configure} onClick={() => setCredential(devices.find(d => d.id === r.id))}>Enter / replace dummy credentials</button><button disabled={!caps.configure || !r.credentialsConfigured} onClick={() => setConfirmation({ type: 'CREDENTIAL_STATE', id: r.id, decision: 'clear', label: `Clear configured credential flag for ${r.name}?` })}>Clear credentials</button></>}{kind === 'groups' && <button disabled={!caps.configure} onClick={() => setConfirmation({ type: 'GROUP_DELETE', id: r.id, label: `Delete group ${r.name}? Devices remain unchanged.` })}>Delete group</button>}{kind === 'users' && <button disabled={!caps.users} onClick={() => setConfirmation({ type: 'USER_ACTIVE', id: r.id, active: !r.active, label: `${r.active ? 'Deactivate' : 'Reactivate'} ${r.name}? Historical references are retained.` })}>{r.active ? 'Deactivate' : 'Reactivate'}</button>}</td></tr>)}</tbody></table></div>}
    {editor && <Editor initial={editor} kind={kind} devices={devices} state={state} locations={locations} loc={loc} pending={!!pending} save={record => send({ type: kind === 'settings' ? 'CONFIG_SAVE' : kind === 'groups' ? 'GROUP_SAVE' : 'USER_SAVE', record })} close={() => setEditor(null)} />}
    {credential && <CredentialDialog device={credential} pending={!!pending} close={() => setCredential(null)} save={() => send({ type: 'CREDENTIAL_STATE', id: credential.id, decision: 'configure' })} />}
    {confirmation && <MonitoringDialog title="Confirm mock administration change" onClose={() => setConfirmation(null)}><p>{confirmation.label}</p><button disabled={!!pending} onClick={() => send(confirmation)}>Confirm simulated change</button><button onClick={() => setConfirmation(null)}>Cancel</button></MonitoringDialog>}
  </div>;
}
