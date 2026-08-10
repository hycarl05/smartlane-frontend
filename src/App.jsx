import React, { useState, useEffect } from 'react';
import OverviewScreen from './components/OverviewScreen';
import LocationScreen from './components/LocationScreen';
import { INITIAL_LOCATIONS } from './data';

export default function App() {
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

  const activeLoc = locations.find(l => l.id === activeLocId);

  return (
    <div className="app-container">
      {screen === 'overview' ? (
        <OverviewScreen
          locations={locations}
          onSelectLocation={handleSelectLocation}
          time={clockTime}
          date={clockDate}
        />
      ) : (
        <LocationScreen
          loc={activeLoc}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={handleBackToOverview}
          time={clockTime}
          date={clockDate}
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
