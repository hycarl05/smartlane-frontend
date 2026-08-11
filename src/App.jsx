import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import OverviewScreen from './components/OverviewScreen';
import LocationScreen from './components/LocationScreen';
import { INITIAL_LOCATIONS } from './data';

export default function App() {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('smartlane_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [screen, setScreen] = useState('overview'); // 'overview' | 'location'
  const [activeLocId, setActiveLocId] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [clockTime, setClockTime] = useState('--:--:--');
  const [clockDate, setClockDate] = useState('—');

  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Clock tick timer
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

      // Increment elapsedSeconds for active location
      setLocations(prevLocs =>
        prevLocs.map(l => {
          if (l.status === 'active') {
            return { ...l, elapsedSeconds: l.elapsedSeconds + 1 };
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
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('smartlane_user');
    setScreen('overview');
    setActiveLocId(null);
    triggerToast('Logged out successfully');
  };

  const handleSelectLocation = (id, tab = 'overview') => {
    setActiveLocId(id);
    setActiveTab(tab);
    setScreen('location');
  };

  const handleBackToOverview = () => {
    setScreen('overview');
    setActiveLocId(null);
  };

  const handleUpdateLocation = (id, updatedFields) => {
    setLocations(prevLocs =>
      prevLocs.map(l => (l.id === id ? { ...l, ...updatedFields } : l))
    );
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

  const activeLoc = locations.find(l => l.id === activeLocId);

  return (
    <div className="app-container">
      {screen === 'overview' ? (
        <OverviewScreen
          locations={locations}
          onSelectLocation={handleSelectLocation}
          time={clockTime}
          date={clockDate}
          user={user}
          onLogout={handleLogout}
        />
      ) : (
        <LocationScreen
          loc={activeLoc}
          locations={locations}
          onSelectLocation={handleSelectLocation}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={handleBackToOverview}
          time={clockTime}
          date={clockDate}
          user={user}
          onLogout={handleLogout}
          onUpdateLoc={handleUpdateLocation}
          onShowToast={triggerToast}
        />
      )}

      {/* Global Toast */}
      <div id="toast" className={showToast ? 'show' : ''}>
        <span className="dot"></span>
        <span id="toastMsg">{toastMsg}</span>
      </div>
    </div>
  );
}
