import React, { useState, useEffect, useMemo } from 'react';
import LoginScreen from './components/LoginScreen';
import OverviewScreen from './components/OverviewScreen';
import LocationScreen from './components/LocationScreen';
import RoadLayoutDesigner from './components/RoadLayoutDesigner';
import { INITIAL_LOCATIONS, INITIAL_AUDIT_LOGS } from './data';

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

  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
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

  // Clock tick timer & automated 5-phase operations engine
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClockTime(now.toLocaleTimeString('en-GB', { hour12: false }));
      setClockDate(
        now.toLocaleDateString('en-GB', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      );

      // Increment elapsedSeconds and process 5-phase operational transitions
      setLocations(prevLocs =>
        prevLocs.map(l => {
          if (l.status === 'active' || (l.phase && l.phase > 0)) {
            const nextElapsed = (l.elapsedSeconds || 0) + 1;
            const phaseTimer = (l.phaseTimer || 0) > 0 ? l.phaseTimer - 1 : 0;

            if (l.phase === 1 && phaseTimer === 0) {
              const updatedLCS = (l.lcs || []).map(item => ({ ...item, open: true }));
              return {
                ...l,
                phase: 2,
                phaseLabel: 'Phase 2: Active Operation',
                status: 'active',
                phaseTimer: 0,
                elapsedSeconds: nextElapsed,
                lcs: updatedLCS,
                timestamps: {
                  ...(l.timestamps || {}),
                  p2Activation: now.toLocaleTimeString('en-GB', { hour12: false })
                }
              };
            }

            if (l.phase === 3 && phaseTimer === 0) {
              const updatedLCS = (l.lcs || []).map(item => ({ ...item, open: false }));
              return {
                ...l,
                phase: 4,
                phaseLabel: 'Phase 4: Deactivation',
                status: 'inactive',
                phaseTimer: 5,
                elapsedSeconds: 0,
                lcs: updatedLCS,
                timestamps: {
                  ...(l.timestamps || {}),
                  p4Deactivation: now.toLocaleTimeString('en-GB', { hour12: false })
                }
              };
            }

            if (l.phase === 4 && phaseTimer === 0) {
              return {
                ...l,
                phase: 5,
                phaseLabel: 'Phase 5: Post-Activation & Reporting',
                status: 'inactive',
                phaseTimer: 0,
                elapsedSeconds: 0,
                timestamps: {
                  ...(l.timestamps || {}),
                  p5PostDeactivation: now.toLocaleTimeString('en-GB', { hour12: false })
                }
              };
            }

            return {
              ...l,
              elapsedSeconds: l.status === 'active' ? nextElapsed : 0,
              phaseTimer: phaseTimer
            };
          }
          return l;
        })
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleUpdateLocation = (id, updatedFields) => {
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
      <main style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeNavTab === 'overview' ? (
          <OverviewScreen
            locations={locations}
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
          <LocationScreen
            loc={activeLoc}
            locations={locations}
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

      {/* Global Toast */}
      <div id="toast" className={showToast ? 'show' : ''}>
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}
