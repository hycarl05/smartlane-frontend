import React, { useState, useEffect, useMemo, useReducer, useRef } from 'react';
import LoginScreen from './components/LoginScreen';
import OverviewScreen from './components/OverviewScreen';
import LocationScreen from './components/LocationScreen';
import RoadLayoutDesigner from './components/RoadLayoutDesigner';
import { INITIAL_LOCATIONS, INITIAL_AUDIT_LOGS } from './data';
import { buildEquipment } from './equipment';
import './equipment.css';
import './operations.css';
import './scheduling.css';
import './administration.css';
import { initialAdministration, adminReducer, applyConfiguration, adminAudit, previewAdministrator } from './administration';
import { capabilities, moduleAllowed, operationActionAllowed, accessKey } from './access';
import AccessPreview from './components/AccessPreview';
import { AccessContext } from './accessContext';
import { nextSchedule, displayTime, SCHEDULE_ZONE } from './scheduling';
import { initialOperations, operationReducer, operationAudit, projectLocation } from './operations';

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

export default function App() {
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
  const locations = useMemo(() => inventory.map(loc => {
    const summary = nextSchedule(operations.scheduleStore, loc.id, operations.now);
    return { ...projectLocation(loc, operations.byId[loc.id], operations.now), scheduleSummary: summary,
      nextRun: summary.next ? `${displayTime(summary.next.start)} ${SCHEDULE_ZONE}` : 'No upcoming effective occurrence (366-day preview)' };
  }), [inventory, operations]);
  const sendOperation = action => {
    if (!validContext() || !operationActionAllowed(latestAccess.current.persona, action, operations.scheduleStore)) { setAccessNotice('This action is unavailable for the current demo persona/location. No operation or schedule was changed.'); return false; }
    dispatchOperation({ ...action, now: Date.now(), actor: `Demo persona ${persona.id}` });
    return true;
  };
  const [legacyAuditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const auditLogs = useMemo(() => [...adminAudit(administration.events, inventory), ...operationAudit(operations.events, inventory), ...legacyAuditLogs], [administration.events, operations.events, inventory, legacyAuditLogs]);
  const equipmentRecords = useMemo(() => applyConfiguration(buildEquipment(locations), administration.configs), [locations, administration.configs]);
  const visibleLocations = locations.filter(l => capabilities(persona, l.id).read);
  const visibleDevices = equipmentRecords.filter(d => capabilities(persona, d.locationId).read);
  const sendAdmin = action => {
    if (!validContext()) return;
    dispatchAdmin({ ...action, actorId: latestAccess.current.persona?.id, now: operations.now, devices: equipmentRecords, locationIds: inventory.map(l => l.id) });
  };
  const [activeLocId, setActiveLocId] = useState(INITIAL_LOCATIONS[0]?.id || 'loc-1');
  const [activeNavTab, setActiveNavTab] = useState('overview'); // 'overview' | 'corridor' | 'vms' | 'schedule' | 'log' | 'reports' | 'designer' | 'settings'

  const [clockTime, setClockTime] = useState('--:--:--');
  const [clockDate, setClockDate] = useState('—');

  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Active location reference
  const activeLoc = useMemo(() => {
    return locations.find(l => l.id === activeLocId) || locations[0] || null;
  }, [locations, activeLocId]);

  useEffect(() => {
    if (visibleLocations.length && !visibleLocations.some(l => l.id === activeLocId)) setActiveLocId(visibleLocations[0].id);
    if (!moduleAllowed(persona, activeNavTab, activeNavTab === 'overview' ? undefined : activeLocId)) setActiveNavTab('overview');
  }, [revision, activeLocId, activeNavTab, visibleLocations, persona]);

  // Total active alarm tally across all corridors
  const totalAlarmsCount = useMemo(() => {
    return locations.reduce((sum, l) => sum + (l.alarms ? l.alarms.length : 0), 0);
  }, [locations]);

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
    setActiveNavTab('overview');
    triggerToast('Logged out successfully');
  };

  const handleSelectLocation = (id, tab = 'overview') => {
    setActiveLocId(id);
    if (tab === 'overview') {
      setActiveNavTab('corridor');
    } else {
      setActiveNavTab(tab);
    }
  };

  const handleUpdateLocation = (id, fields) => {
    if (!validContext() || !capabilities(latestAccess.current.persona, id).vmsEdit) { setAccessNotice('Configuration editing is unavailable in this demo access context.'); return; }
    // Configuration editors cannot bypass the operation reducer.
    const protectedKeys = ['status', 'mode', 'phase', 'phaseLabel', 'phaseTimer', 'elapsedSeconds', 'ps', 'pe', 'timestamps', 'operation', 'lcs'];
    const updatedFields = Object.fromEntries(Object.entries(fields).filter(([key]) => !protectedKeys.includes(key)));
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

  return (
    <div className="app-container">
      <AccessContext.Provider value={{ persona, notice: accessNotice, caps: capabilities(persona, activeLocId), allowed: (tab) => moduleAllowed(persona, tab, activeLocId), revoke: () => choosePersona('DEMO-OVERVIEW') }}>
      <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AccessPreview users={[previewAdmin, ...administration.users]} selected={personaId} onSelect={choosePersona} notice={accessNotice} />
        {Object.values(operations.byId).some(op => capabilities(persona, op.locationId).operate && (op.pendingDecision || op.notification || op.intervention || ['Simulated success', 'Expired', 'Cancelled'].includes(op.command.status))) && <aside className="operation-inbox" aria-label="Persistent operation decisions">
          <strong>Operation decisions and outcomes (simulation)</strong>
          {Object.values(operations.byId).filter(op => capabilities(persona, op.locationId).operate && (op.pendingDecision || op.notification || op.intervention || ['Simulated success', 'Expired', 'Cancelled'].includes(op.command.status))).map(op => <button key={op.locationId} onClick={() => { setActiveLocId(op.locationId); setActiveNavTab('corridor'); }}>
            {inventory.find(l => l.id === op.locationId)?.name}: {op.pendingDecision?.kind || op.notification?.kind || (op.intervention ? 'Intervention active' : op.lastResult)}
          </button>)}
        </aside>}
        {!visibleLocations.length ? <div className="equipment-state"><h2>No authorized locations in this demo preview</h2><p>The selected user is inactive or has no location assignments. Shared operations and saved records remain intact. Select another demo persona above.</p><button onClick={() => choosePersona('PREVIEW-ADMIN')}>Return to preview administrator</button><button onClick={handleLogout}>Return to login</button></div> : activeNavTab === 'overview' || !moduleAllowed(persona, activeNavTab, activeLocId) ? (
          <OverviewScreen key={revision}
            operationNow={operations.now}
            onQuickOperation={(locationId, kind) => { sendOperation({ type: 'REQUEST', locationId, kind, durationMinutes: 30 }); setActiveLocId(locationId); setActiveNavTab('corridor'); }}
            equipmentRecords={visibleDevices}
            locations={visibleLocations}
            auditLogs={auditLogs}
            onSelectLocation={(locId, tab = 'overview') => {
              setActiveLocId(locId);
              setActiveNavTab(tab === 'overview' ? 'corridor' : tab);
            }}
            activeLocId={activeLocId}
            setActiveLocId={setActiveLocId}
            onNavigateTab={setActiveNavTab}
            time={clockTime}
            date={clockDate}
            user={user}
            onLogout={handleLogout}
            onSaveNewLocation={handleSaveNewLocation}
            onShowToast={triggerToast}
          />
        ) : activeNavTab === 'designer' ? (
          <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column' }}>
            <ErrorBoundary>
              <RoadLayoutDesigner
                initialLoc={activeLoc}
                onSaveLayout={handleSaveNewLocation}
                onClose={() => setActiveNavTab('corridor')}
                onShowToast={triggerToast}
              />
            </ErrorBoundary>
          </div>
        ) : (
          <LocationScreen key={`${revision}:${activeLocId}`}
            administration={administration}
            onAdmin={sendAdmin}
            administrationLocations={inventory}
            scheduleStore={operations.scheduleStore}
            operations={operations}
            operation={operations.byId[activeLocId]}
            operationNow={operations.now}
            onOperation={sendOperation}
            equipmentRecords={visibleDevices}
            loc={activeLoc}
            locations={visibleLocations}
            auditLogs={auditLogs}
            onSelectLocation={(locId, tab) => {
              setActiveLocId(locId);
              if (tab) setActiveNavTab(tab);
            }}
            activeTab={activeNavTab === 'corridor' ? 'overview' : activeNavTab}
            setActiveTab={(tab) => {
              if (tab === 'overview') setActiveNavTab('corridor');
              else setActiveNavTab(tab);
            }}
            onBack={() => setActiveNavTab('overview')}
            time={clockTime}
            date={clockDate}
            user={user}
            onLogout={handleLogout}
            onUpdateLoc={handleUpdateLocation}
            onShowToast={triggerToast}
            hideTopbars={false}
          />
        )}
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
