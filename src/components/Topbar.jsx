import React from 'react';

export default function Topbar({ time, date }) {
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
          <span className="user-dot"></span> admin
        </div>
      </div>
    </div>
  );
}
