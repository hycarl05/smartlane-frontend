import React from 'react';

export default function Topbar({ time, date, user, onLogout }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">P</div>
        <div className="brand-text">
          <b>SMARTLANE CONTROL CENTRE</b>
          <span>PLUS MALAYSIA · A MEMBER OF UEM</span>
        </div>
      </div>
      <div className="topbar-right">
        <div className="clock">
          <b>{time}</b>
          <span>{date}</span>
        </div>
        <div className="user-chip">
          <span className="user-dot"></span> {user ? user.username : 'admin'}
        </div>
        {onLogout && (
          <button className="logout-btn" onClick={onLogout} title="Sign Out">
            Logout ↵
          </button>
        )}
      </div>
    </div>
  );
}
