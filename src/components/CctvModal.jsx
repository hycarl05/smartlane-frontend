import React, { useState, useEffect } from 'react';

export default function CctvModal({
  cctv,
  locName,
  onClose,
  onLogAudit,
  onShowToast
}) {
  const [isStreaming, setIsStreaming] = useState(true);
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'audit' | 'policy'

  const isOk = cctv ? cctv.status === 'ok' : false;

  useEffect(() => {
    if (onLogAudit && cctv) {
      if (isOk) {
        onLogAudit(
          'info',
          `Audit Log: Live camera feed accessed for ${cctv.km} (${locName}) — Continuous 24/7 archive streaming verified`
        );
      } else {
        onLogAudit(
          'warning',
          `Audit Log: Inspected physical camera fault on ${cctv.km} (${locName}) — Signal loss detected`
        );
      }
    }
  }, [cctv]);

  if (!cctv) return null;

  const handleToggleStream = () => {
    const nextState = !isStreaming;
    setIsStreaming(nextState);
    if (onLogAudit) {
      onLogAudit(
        'info',
        `Audit Log: Operator toggled stream for ${cctv.km} to ${nextState ? 'LIVE VIEWING' : 'STREAM PAUSED'}`
      );
    }
    if (onShowToast) {
      onShowToast(`Live view for ${cctv.km} ${nextState ? 'enabled' : 'paused'}`);
    }
  };

  const handleReportFault = () => {
    if (onLogAudit) {
      onLogAudit(
        'critical',
        `Maintenance Dispatch: Reported physical fault for camera ${cctv.km} (${locName})`
      );
    }
    if (onShowToast) {
      onShowToast(`Maintenance ticket logged for ${cctv.km}`);
    }
  };

  return (
    <div className="vms-editor-backdrop" onClick={onClose}>
      <div className="vms-editor-modal cctv-modal-wrap" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="vms-editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`cctv-status-badge ${isOk ? 'ok' : 'fault'}`}>
              {isOk ? '● LIVE ONLINE' : '⚠️ HARDWARE FAULT'}
            </span>
            <h3 style={{ margin: 0, fontSize: '16px' }}>
              CCTV Camera Inspection — {cctv.km}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
              ({locName})
            </span>
          </div>
          <button className="vms-editor-close" onClick={onClose}>✕</button>
        </div>

        {/* ALWAYS-ON CONTINUOUS RECORDING MANDATE BANNER */}
        <div className="cctv-policy-banner">
          <div className="policy-badge">
            <span className="rec-pulse">🔴</span>
            <span><b>CONTINUOUS 24/7 RECORDING:</b> Mandatory 30-Day Security & Incident Archive Active</span>
          </div>
          <div className="policy-note">
            Highways Safety Standard: Camera power cannot be turned off by administrators. Live streams are toggled on-demand by authorized operators. All actions are securely logged.
          </div>
        </div>

        {/* MODAL TABS */}
        <div className="cctv-modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'stream' ? 'active' : ''}`}
            onClick={() => setActiveTab('stream')}
          >
            📹 Operator Live View
          </button>
          <button
            className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
            onClick={() => setActiveTab('policy')}
          >
            🛡️ Security & Archive Policy
          </button>
          <button
            className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Audit & Compliance Log
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="vms-editor-body" style={{ padding: '16px' }}>
          {activeTab === 'stream' && (
            <div className="cctv-stream-container">
              {isOk ? (
                <div className="cctv-viewport">
                  {isStreaming ? (
                    <div className="cctv-feed-screen">
                      {/* SIMULATED HIGHWAY VIDEO ANIMATION */}
                      <svg className="cctv-road-svg" viewBox="0 0 400 220">
                        <defs>
                          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#1e293b" />
                          </linearGradient>
                          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#090d16" />
                          </linearGradient>
                        </defs>
                        {/* Background / Road Layout */}
                        <rect width="400" height="220" fill="url(#skyGrad)" />
                        <polygon points="120,80 280,80 390,220 10,220" fill="url(#roadGrad)" />
                        
                        {/* SmartLane Shoulder Lane */}
                        <polygon points="120,80 155,80 90,220 10,220" fill="#152e24" opacity="0.7" />
                        <line x1="155" y1="80" x2="90" y2="220" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,4" />
                        
                        {/* Main Lane Markings */}
                        <line x1="200" y1="80" x2="190" y2="220" stroke="#fbbf24" strokeWidth="2" strokeDasharray="8,8" />
                        <line x1="245" y1="80" x2="290" y2="220" stroke="#ffffff" strokeWidth="2" strokeDasharray="6,6" opacity="0.6" />

                        {/* Animated Vehicles */}
                        <g className="anim-car-1">
                          <rect x="135" y="110" width="22" height="14" rx="3" fill="#38bdf8" />
                          <circle cx="138" cy="124" r="2" fill="#000" />
                          <circle cx="154" cy="124" r="2" fill="#000" />
                        </g>
                        <g className="anim-car-2">
                          <rect x="210" y="140" width="32" height="18" rx="4" fill="#f43f5e" />
                          <circle cx="215" cy="158" r="3" fill="#000" />
                          <circle cx="237" cy="158" r="3" fill="#000" />
                        </g>
                        <g className="anim-car-3">
                          <rect x="60" y="160" width="28" height="16" rx="3" fill="#4ade80" />
                          <circle cx="65" cy="176" r="3" fill="#000" />
                          <circle cx="83" cy="176" r="3" fill="#000" />
                        </g>
                      </svg>

                      {/* FEED OVERLAY METRICS */}
                      <div className="cctv-overlay-top">
                        <div className="cctv-live-tag">● LIVE STREAM</div>
                        <div className="cctv-cam-id">{cctv.km} — SMARTLANE CAM-04</div>
                        <div className="cctv-archive-tag">REC 24/7 FULL HD</div>
                      </div>

                      <div className="cctv-overlay-bottom">
                        <div>LATENCY: 18ms | 1080p @ 30 FPS</div>
                        <div>ENC: H.265 | IP: 10.180.4.15</div>
                      </div>
                    </div>
                  ) : (
                    <div className="cctv-paused-screen">
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏸</div>
                      <div><b>User Stream Paused</b></div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
                        Live dashboard stream closed by user request. (Continuous background recording remains active).
                      </div>
                      <button className="primary-toggle to-activate" style={{ marginTop: '12px', width: 'auto', padding: '6px 16px' }} onClick={handleToggleStream}>
                        ▶ Resume Live View Stream
                      </button>
                    </div>
                  )}

                  {/* STREAM CONTROL BAR */}
                  <div className="cctv-controls-bar">
                    <button className="mini-btn good-btn" onClick={handleToggleStream}>
                      {isStreaming ? '⏸ Pause Live View' : '▶ Start Live View'}
                    </button>
                    <button className="mini-btn neutral-btn" onClick={() => onShowToast && onShowToast('Snapshot saved to security audit folder')}>
                      📷 Capture Snapshot
                    </button>
                    <button className="mini-btn neutral-btn" onClick={() => onShowToast && onShowToast('PTZ auto-preset synchronized')}>
                      🎯 Sync PTZ Angle
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-faint)' }}>
                      Archive Retention: 30 Days
                    </span>
                  </div>
                </div>
              ) : (
                /* PHYSICAL HARDWARE FAULT DIAGNOSTIC SCREEN */
                <div className="cctv-fault-screen">
                  <div className="fault-header-banner">
                    <span className="icon">⚠️</span>
                    <div>
                      <div className="title">PHYSICAL HARDWARE FAULT / SIGNAL LOSS DETECTED</div>
                      <div className="sub">
                        Camera unit on gantry {cctv.km} failed to respond to network ping. Continuous recording hardware has lost connection.
                      </div>
                    </div>
                  </div>

                  <div className="fault-details-box">
                    <div className="fault-row">
                      <span className="lbl">Status Code:</span>
                      <span className="val bad">ERR_CAM_PHYSICAL_DISCONNECT (0x504)</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Admin Power Control:</span>
                      <span className="val">DISABLED (Always-On Recording Mandate)</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Root Cause Analysis:</span>
                      <span className="val">Physical cable disconnection or local power outage at KM {cctv.km}</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Last Known Ping:</span>
                      <span className="val mono">Today at 13:58:41 (Signal Timeout)</span>
                    </div>
                  </div>

                  <div className="fault-actions">
                    <button className="primary-toggle to-deactivate" onClick={handleReportFault}>
                      🚨 Dispatch Field Technician & Log Maintenance Audit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="cctv-policy-details">
              <h4>Highway CCTV Continuous Recording Protocol</h4>
              <ul>
                <li>
                  <b>Continuous, Always-On Recording:</b> Security and incident auditing are paramount on major highways. Cameras cannot be turned "off" by administrators and operate continuously to maintain the mandatory 30-day safety archive.
                </li>
                <li>
                  <b>User-Driven Dashboard Streams:</b> Live video feeds do not randomly force-display automatically during normal operations. Authorized operators can toggle and view live streams at any time via map icons or schematics.
                </li>
                <li>
                  <b>Automatic Logging:</b> To prevent unauthorized access or tampering, all camera stream viewing, live status changes, and physical faults are automatically recorded as read-only entries in the system's secure audit log.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="cctv-audit-panel">
              <h4>Camera Audit Log Entries ({cctv.km})</h4>
              <div className="cctv-audit-list">
                <div className="audit-entry">
                  <span className="time">14:15:02</span>
                  <span className="type info">STREAM_ACCESS</span>
                  <span className="desc">User admin initiated live stream preview for {cctv.km}</span>
                </div>
                <div className="audit-entry">
                  <span className="time">13:58:41</span>
                  <span className={`type ${isOk ? 'info' : 'critical'}`}>
                    {isOk ? 'HEALTH_CHECK' : 'HARDWARE_FAULT'}
                  </span>
                  <span className="desc">
                    {isOk
                      ? `Camera ${cctv.km} health check PASSED — 24/7 continuous stream OK`
                      : `Camera ${cctv.km} physical connection dropped — Hardware fault alert logged`}
                  </span>
                </div>
                <div className="audit-entry">
                  <span className="time">08:00:00</span>
                  <span className="type info">SYSTEM_BOOT</span>
                  <span className="desc">Continuous 30-day safety archive initialized for {cctv.km}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
