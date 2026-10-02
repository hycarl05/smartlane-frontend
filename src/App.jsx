import React, { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import OverviewScreen from './components/OverviewScreen';
import LocationScreen from './components/LocationScreen';
import { INITIAL_LOCATIONS, INITIAL_AUDIT_LOGS } from './data';
import { buildEquipment } from './equipment';
import './equipment.css';
import './operations.css';
import './scheduling.css';
import './administration.css';
import './phase5.css';
import './phase6.css';
import './ui-cleanup.css';
import './dashboard-compact.css';
import { INITIAL_PHASE5, phase5Reducer, phase5Audit } from './phase5';
import { INITIAL_PHASE6, phase6Reducer, phase6Audit, sanitizeLayoutUpdate } from './phase6';
import { initialAdministration, adminReducer, applyConfiguration, adminAudit, previewAdministrator } from './administration';
import { capabilities, moduleAllowed, operationActionAllowed, accessKey } from './access';
import { AccessContext } from './accessContext';
import { nextSchedule, displayTime, SCHEDULE_ZONE } from './scheduling';
import { initialOperations, operationReducer, operationAudit, projectLocation } from './operations';
import { operationVmsMessages } from './vmsMessages';
import { LOCATION_NAVIGATION, locationPath, resolveRoute } from './routing';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'var(--text)', background: 'var(--canvas)', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
          <h2 style={{ color: 'var(--red)', margin: 0 }}>⚠️ Road Studio Initializing...</h2>
          <p style={{ color: 'var(--text-dim)', margin: 0 }}>{this.state.error?.message || 'Reloading workspace geometry.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false }); }}
            style={{ padding: '8px 18px', background: 'var(--brand)', color: '#FFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}
          >
            🔄 Refresh Canvas
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LocationIndexRedirect() { const { locationId } = useParams(); return <Navigate to={locationPath(locationId)} replace />; }
function LocationRoute({ render }) { const { locationId } = useParams(); return render(locationId); }
function RouteMessage({ title, children }) { return <div className="equipment-state"><h2>{title}</h2><p>{children}</p><Link to="/locations">Back to All Locations</Link></div>; }

export default function App() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smartlane_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [inventory, setLocations] = useState(INITIAL_LOCATIONS);
  const [administration, dispatchAdmin] = useReducer(adminReducer, INITIAL_LOCATIONS, initialAdministration);
  const [personaId, setPersonaId] = useState('PREVIEW-ADMIN');
  const [accessNotice, setAccessNotice] = useState('');
  const previewAdmin = previewAdministrator(inventory.map(l => l.id));
  const persona = personaId === previewAdmin.id ? previewAdmin : administration.users.find(u => u.id === personaId);
  const revision = accessKey(persona);
  const previousAccess = useRef(revision);
  useEffect(() => { if (previousAccess.current !== revision) { setAccessNotice('Demo access changed. Open dialogs and unsaved entries were closed; shared operations remain intact.'); previousAccess.current = revision; } }, [revision]);
  const latestAccess = useRef(null);
  latestAccess.current = { persona, revision };
  const validContext = () => {
    if (latestAccess.current.revision !== revision) { setAccessNotice('Access context changed. Submission was blocked; reopen the view.'); return false; }
    return true;
  };
  const choosePersona = id => { setPersonaId(id); setAccessNotice('Demo access context changed. Open dialogs and unsaved entries were closed; pending operations are retained.'); };
  const [operations, dispatchOperation] = useReducer(operationReducer, INITIAL_LOCATIONS, initialOperations);
  const [phase5, dispatchPhase5] = useReducer(phase5Reducer, INITIAL_PHASE5);
  const [phase6, dispatchPhase6] = useReducer(phase6Reducer, INITIAL_PHASE6);
  const locations = useMemo(() => inventory.map(loc => {
    const summary = nextSchedule(operations.scheduleStore, loc.id, operations.now);
    return { ...projectLocation(loc, operations.byId[loc.id], operations.now), scheduleSummary: summary,
      nextRun: summary.next ? `${displayTime(summary.next.start)} ${SCHEDULE_ZONE}` : 'No upcoming effective occurrence (366-day preview)' };
  }), [inventory, operations]);
  const sendOperation = action => {
    if (!validContext() || !operationActionAllowed(latestAccess.current.persona, action, operations.scheduleStore)) { setAccessNotice('This action is unavailable for the current demo persona/location. No operation or schedule was changed.'); return false; }
    const operationType = action.type === 'SCHEDULE_SIMULATE' ? 'Activate' : action.kind;
    const needsVmsSnapshot = action.type === 'SCHEDULE_SIMULATE' || (action.type === 'REQUEST' && ['Activate', 'Deactivate'].includes(action.kind));
    const location = needsVmsSnapshot ? inventory.find(item => item.id === action.locationId) : null;
    dispatchOperation({ ...action, ...(location ? { vmsMessages: operationVmsMessages(location, operationType) } : {}), now: Date.now(), actor: `Demo persona ${persona.id}` });
    return true;
  };
  const [legacyAuditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const auditLogs = useMemo(() => [...phase6Audit(phase6.events, inventory), ...phase5Audit(phase5.events, inventory), ...adminAudit(administration.events, inventory), ...operationAudit(operations.events, inventory), ...legacyAuditLogs], [phase6.events, phase5.events, administration.events, operations.events, inventory, legacyAuditLogs]);
  const equipmentRecords = useMemo(() => applyConfiguration(buildEquipment(locations), administration.configs), [locations, administration.configs]);
  const visibleLocations = locations.filter(l => capabilities(persona, l.id).read);
  const visibleDevices = equipmentRecords.filter(d => capabilities(persona, d.locationId).read);
  const sendAdmin = action => {
    if (!validContext()) return;
    dispatchAdmin({ ...action, actorId: latestAccess.current.persona?.id, now: operations.now, devices: equipmentRecords, locationIds: inventory.map(l => l.id) });
  };
  const sendPhase5 = action => {
    if (!validContext()) return false;
    const permission = action.type.startsWith('REPORT_') ? 'reports' : action.type.startsWith('MAINTENANCE_') ? 'maintenanceEdit' : 'housekeeping';
    if (!capabilities(latestAccess.current.persona, action.locationId || activeLocId)[permission]) { setAccessNotice('This Phase 5 action is unavailable for the current demo persona/location.'); return false; }
    dispatchPhase5({ ...action, actorId: persona.id, now: operations.now }); return true;
  };
  const sendPhase6 = action => {
    if (!validContext() || !capabilities(latestAccess.current.persona, action.locationId || activeLocId).vmsEdit) { setAccessNotice('VMS editing or publishing is unavailable for this demo persona/location.'); return false; }
    dispatchPhase6({ ...action, actorId: persona.id, now: operations.now }); return true;
  };
  const currentRoute = resolveRoute(routerLocation.pathname, inventory.map(location => location.id));
  const activeLocId = currentRoute.kind === 'location' ? currentRoute.locationId : null;

  const [clockTime, setClockTime] = useState('--:--:--');
  const [clockDate, setClockDate] = useState('—');

  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Helper to add new audit log entry
  const addAuditLog = (moduleName, activity, locationName = 'Global / System-Wide', equipmentId = 'N/A', result = 'Success') => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const timestampStr = `${dateStr} ${timeStr}`;
    const newLog = {
      id: `AUD-${dateStr.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timestampStr,
      date: dateStr,
      time: timeStr,
      initiator: user ? `${user.username || user.name || 'operator'} (${user.role || 'Operator'})` : 'system_process',
      initiatorRole: user ? (user.role || 'Operator') : 'System Process',
      module: moduleName,
      activity: activity,
      location: locationName,
      equipmentId: equipmentId,
      result: result,
      securityHash: `sha256:${Math.random().toString(36).substring(2, 12)}${Math.random().toString(36).substring(2, 10)}`
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Timestamp-driven demo clock; transitions and events share one reducer.
  useEffect(() => {
    const tick = () => dispatchOperation({ type: 'TICK', now: Date.now(), actor: 'Demo clock' });
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const now = new Date(operations.now);
    setClockTime(now.toLocaleTimeString('en-GB', { hour12: false }));
    setClockDate(now.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
  }, [operations.now]);
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 2200);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('smartlane_user', JSON.stringify(userData));
    triggerToast(`Welcome back, ${userData.name || userData.username}!`);
    addAuditLog('System Core', `User authentication successful for session`, 'Global / System-Wide', 'AUTH-SRV', 'Success');
  };

  const handleLogout = () => {
    addAuditLog('System Core', `User logged out cleanly`, 'Global / System-Wide', 'AUTH-SRV', 'Success');
    setUser(null);
    localStorage.removeItem('smartlane_user');
    navigate('/locations');
    triggerToast('Logged out successfully');
  };

  const handleUpdateLocation = (id, fields) => {
    if (!validContext() || !capabilities(latestAccess.current.persona, id).vmsEdit) { setAccessNotice('Configuration editing is unavailable in this demo access context.'); return; }
    // Configuration editors cannot bypass the operation reducer.
    const updatedFields = sanitizeLayoutUpdate(fields);
    if (!Object.keys(updatedFields).length) return;
    const locObj = locations.find(l => l.id === id);
    setLocations(prevLocs =>
      prevLocs.map(l => (l.id === id ? { ...l, ...updatedFields } : l))
    );
    if (locObj) {
      addAuditLog(
        'Control Panel',
        `Location operational state updated for ${locObj.name}`,
        locObj.name,
        `CTRL-${locObj.id.toUpperCase()}`,
        updatedFields.status === 'pending' ? 'Paused' : 'Success'
      );
    }
  };

  const handleSaveNewLocation = (newLocObj) => {
    if (!validContext() || !capabilities(latestAccess.current.persona).design) return;
    dispatchOperation({ type: 'REGISTER', locationId: newLocObj.id });
    setLocations(prevLocs => {
      const exists = prevLocs.find(l => l.id === newLocObj.id);
      if (exists) {
        return prevLocs.map(l => (l.id === newLocObj.id ? { ...l, ...newLocObj } : l));
      }
      return [...prevLocs, newLocObj];
    });
    addAuditLog(
      'Layout Designer',
      `New road path and equipment layout configured for ${newLocObj.name}`,
      newLocObj.name,
      `LOC-${(newLocObj.id || 'NEW').toUpperCase()}`,
      'Success'
    );
    triggerToast(`Saved road layout for ${newLocObj.name}`);
  };

  // If user is not authenticated, show LoginScreen
  if (!user) {
    return (
      <div className="app-container">
        <LoginScreen onLogin={handleLogin} />
        <div id="toast" className={showToast ? 'show' : ''}>
          <span className="dot"></span>
          <span id="toastMsg">{toastMsg}</span>
        </div>
      </div>
    );
  }

  const overviewPage = !visibleLocations.length ? <div className="equipment-state"><h2>No authorized locations in this demo preview</h2><p>The selected user is inactive or has no location assignments. Shared operations and saved records remain intact.</p><button onClick={() => choosePersona('PREVIEW-ADMIN')}>Return to preview administrator</button><button onClick={handleLogout}>Return to login</button></div> : <OverviewScreen key={revision}
    operationNow={operations.now}
    onQuickOperation={(locationId, kind) => { if (sendOperation({ type: 'REQUEST', locationId, kind, durationMinutes: 30 })) navigate(locationPath(locationId)); }}
    equipmentRecords={visibleDevices} locations={visibleLocations} auditLogs={auditLogs}
    onSelectLocation={(locationId, tab = 'overview') => navigate(locationPath(locationId, tab))}
    time={clockTime} date={clockDate} user={user} onLogout={handleLogout}
    onSaveNewLocation={handleSaveNewLocation} onShowToast={triggerToast}
  />;

  const renderLocationPage = (locationId, tab) => {
    const location = locations.find(item => item.id === locationId);
    if (!location) return <RouteMessage title="Location not found">No Smartlane location matches “{locationId}”.</RouteMessage>;
    if (!capabilities(persona, locationId).read) return <RouteMessage title="Location unavailable">Your current role cannot access this location.</RouteMessage>;
    const navigation = LOCATION_NAVIGATION.find(item => item.key === tab);
    if (!navigation || !moduleAllowed(persona, navigation.permission, locationId)) return <RouteMessage title="Page unavailable">Your current role cannot access this page.</RouteMessage>;
    const goToTab = nextTab => navigate(locationPath(locationId, nextTab));
    const locationScreen = <LocationScreen key={`${revision}:${locationId}`}
      phase5={phase5} onPhase5={sendPhase5} phase6={phase6} onPhase6={sendPhase6}
      administration={administration} onAdmin={sendAdmin} administrationLocations={inventory}
      scheduleStore={operations.scheduleStore} operations={operations} operation={operations.byId[locationId]}
      operationNow={operations.now} onOperation={sendOperation} equipmentRecords={visibleDevices}
      loc={location} locations={visibleLocations} auditLogs={auditLogs}
      onSelectLocation={(nextLocationId, currentTab = tab) => navigate(locationPath(nextLocationId, currentTab))}
      activeTab={tab} setActiveTab={goToTab}
      time={clockTime} date={clockDate} user={user} onLogout={handleLogout}
      onUpdateLoc={handleUpdateLocation} onShowToast={triggerToast} hideTopbars={false}
    />;
    return tab === 'designer' ? <ErrorBoundary>{locationScreen}</ErrorBoundary> : locationScreen;
  };

  return (
    <div className="app-container">
      <AccessContext.Provider value={{ persona, notice: accessNotice, caps: capabilities(persona, activeLocId), allowed: (tab) => moduleAllowed(persona, tab, activeLocId), revoke: () => choosePersona('DEMO-OVERVIEW') }}>
      <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {Object.values(operations.byId).some(op => capabilities(persona, op.locationId).operate && (op.pendingDecision || op.notification || op.intervention)) && <aside className="operation-inbox" aria-label="Persistent operation decisions">
          <strong>Actions and warnings</strong>
          {Object.values(operations.byId).filter(op => capabilities(persona, op.locationId).operate && (op.pendingDecision || op.notification || op.intervention)).map(op => <button key={op.locationId} onClick={() => navigate(locationPath(op.locationId))}>
            {inventory.find(l => l.id === op.locationId)?.name}: {op.pendingDecision?.kind || op.notification?.kind || (op.intervention ? 'Intervention active' : op.lastResult)}
          </button>)}
        </aside>}
        <Routes>
          <Route path="/" element={<Navigate to="/locations" replace />} />
          <Route path="/locations" element={overviewPage} />
          <Route path="/locations/:locationId" element={<LocationIndexRedirect />} />
          {LOCATION_NAVIGATION.map(item => <Route key={item.key} path={`/locations/:locationId/${item.path}`} element={<LocationRoute render={locationId => renderLocationPage(locationId, item.key)} />} />)}
          <Route path="*" element={<RouteMessage title="Page not found">This Smartlane page does not exist.</RouteMessage>} />
        </Routes>
      </main>
      </AccessContext.Provider>

      {/* Global Toast */}
      <div id="toast" className={showToast ? 'show' : ''}>
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}
