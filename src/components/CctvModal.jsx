import React, { useState, useEffect } from 'react';

export default function CctvModal({
  cctv,
  locName,
  onClose,
  onLogAudit,
  onShowToast
}) {
  const [isStreaming, setIsStreaming] = useState(true);
  const [activeTab, setActiveTab] = useState('stream'); // 'stream' | 'policy' | 'audit'
  const [currentTime, setCurrentTime] = useState('');
  const [isFlashing, setIsFlashing] = useState(false);

  const isOk = cctv ? cctv.status === 'ok' : false;

  // Real-time CCTV timestamp ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const da = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mi = String(now.getMinutes()).padStart(2, '0');
      const se = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${yr}-${mo}-${da} ${hr}:${mi}:${se}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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

  const handleCaptureSnapshot = () => {
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 250);
    if (onShowToast) {
      onShowToast(`📷 Snapshot captured & archived for ${cctv.km}`);
    }
    if (onLogAudit) {
      onLogAudit('info', `Operator captured security snapshot from camera ${cctv.km}`);
    }
  };

  const handleSyncPtz = () => {
    if (onShowToast) {
      onShowToast(`🎯 PTZ optical angle calibrated for ${cctv.km}`);
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
      onShowToast(`🚨 Maintenance dispatch logged for camera ${cctv.km}`);
    }
  };

  return (
    <div className="cctv-modal-overlay" onClick={onClose}>
      <div className="cctv-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ── 1. MODAL HEADER ── */}
        <div className="cctv-modal-header">
          <div className="cctv-header-left">
            <span className={`cctv-status-badge ${isOk ? 'ok' : 'fault'}`}>
              <span className="dot"></span>
              {isOk ? 'LIVE ONLINE' : 'HARDWARE FAULT'}
            </span>
            <div className="cctv-header-title-group">
              <h3 className="cctv-header-title">
                CCTV Camera Inspection — {cctv.km}
              </h3>
              <div className="cctv-header-subtitle">
                {locName || 'PLUS SmartLane Corridor'} · High-Definition PTZ Optics
              </div>
            </div>
          </div>
          <button className="cctv-modal-close-btn" onClick={onClose} title="Close Inspection">
            ✕
          </button>
        </div>

        {/* ── 2. POLICY & COMPLIANCE BANNER ── */}
        <div className="cctv-policy-banner">
          <div className="policy-badge">
            <span className="rec-dot"></span>
            <span><b>CONTINUOUS 24/7 RECORDING:</b> Mandatory 30-Day Incident Archive Active</span>
          </div>
          <div className="policy-note">
            Highways Safety Standard · Read-only Audit Active
          </div>
        </div>

        {/* ── 3. TABS ── */}
        <div className="cctv-modal-tabs">
          <button
            className={`cctv-tab-btn ${activeTab === 'stream' ? 'active' : ''}`}
            onClick={() => setActiveTab('stream')}
          >
            📹 Operator Live View
          </button>
          <button
            className={`cctv-tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
            onClick={() => setActiveTab('policy')}
          >
            🛡️ Security & Archive Policy
          </button>
          <button
            className={`cctv-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            📜 Audit & Compliance Log
          </button>
        </div>

        {/* ── 4. MODAL BODY ── */}
        <div className="cctv-modal-body">
          {activeTab === 'stream' && (
            <div className="cctv-stream-container">
              {isOk ? (
                <div className="cctv-viewport">
                  {isStreaming ? (
                    <div className="cctv-feed-screen">
                      {isFlashing && <div className="cctv-flash-overlay"></div>}

                      {/* HIGHWAY SIMULATION SVG */}
                      <svg className="cctv-road-svg" viewBox="0 0 600 320" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0B132B" />
                            <stop offset="60%" stopColor="#1C2541" />
                            <stop offset="100%" stopColor="#2E3A59" />
                          </linearGradient>
                          <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#273449" />
                            <stop offset="100%" stopColor="#111827" />
                          </linearGradient>
                          <linearGradient id="shoulderGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#064E3B" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#047857" stopOpacity="0.65" />
                          </linearGradient>
                        </defs>

                        {/* Sky & Distant Landscape */}
                        <rect width="600" height="320" fill="url(#skyGrad)" />
                        <path d="M0,110 Q150,95 300,105 T600,100 L600,120 L0,120 Z" fill="#1E293B" opacity="0.6" />
                        <line x1="0" y1="110" x2="600" y2="110" stroke="#334155" strokeWidth="1" />

                        {/* Main Road Surface */}
                        <polygon points="220,110 380,110 590,320 10,320" fill="url(#roadGrad)" />

                        {/* SmartLane Shoulder (Left Emergency Lane) */}
                        <polygon points="220,110 255,110 140,320 10,320" fill="url(#shoulderGrad)" />
                        <line x1="255" y1="110" x2="140" y2="320" stroke="#10B981" strokeWidth="2.5" strokeDasharray="5,6" />

                        {/* Road Lane Markings */}
                        <line x1="300" y1="110" x2="290" y2="320" stroke="#FBBF24" strokeWidth="2.5" strokeDasharray="8,10" />
                        <line x1="340" y1="110" x2="440" y2="320" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="8,8" opacity="0.75" />
                        <line x1="220" y1="110" x2="10" y2="320" stroke="#FFFFFF" strokeWidth="3" opacity="0.9" />
                        <line x1="380" y1="110" x2="590" y2="320" stroke="#FFFFFF" strokeWidth="3" opacity="0.9" />

                        {/* Overhead Gantry Structure Silhouette */}
                        <line x1="170" y1="112" x2="170" y2="70" stroke="#475569" strokeWidth="3" />
                        <line x1="430" y1="112" x2="430" y2="70" stroke="#475569" strokeWidth="3" />
                        <rect x="160" y="66" width="280" height="8" rx="2" fill="#334155" />
                        <rect x="225" y="58" width="22" height="14" rx="2" fill="#0D9488" />
                        <text x="236" y="68" fill="#FFF" fontSize="8" fontWeight="bold" textAnchor="middle">↑</text>
                        <rect x="290" y="58" width="22" height="14" rx="2" fill="#0D9488" />
                        <text x="301" y="68" fill="#FFF" fontSize="8" fontWeight="bold" textAnchor="middle">↑</text>
                        <rect x="355" y="58" width="22" height="14" rx="2" fill="#0D9488" />
                        <text x="366" y="68" fill="#FFF" fontSize="8" fontWeight="bold" textAnchor="middle">↑</text>

                        {/* Realistic Animated Moving Vehicles */}
                        <g className="anim-car-smartlane">
                          <rect x="68" y="220" width="38" height="24" rx="5" fill="#0EA5E9" />
                          <rect x="74" y="224" width="26" height="12" rx="3" fill="#082F49" opacity="0.8" />
                          <circle cx="76" cy="244" r="3" fill="#000" />
                          <circle cx="98" cy="244" r="3" fill="#000" />
                          <circle cx="70" cy="226" r="2.5" fill="#FDE047" />
                          <circle cx="70" cy="238" r="2.5" fill="#FDE047" />
                        </g>

                        <g className="anim-car-center">
                          <rect x="330" y="195" width="44" height="28" rx="6" fill="#EF4444" />
                          <rect x="338" y="200" width="28" height="14" rx="3" fill="#450A0A" opacity="0.8" />
                          <circle cx="340" cy="223" r="3.5" fill="#000" />
                          <circle cx="366" cy="223" r="3.5" fill="#000" />
                          <circle cx="332" cy="201" r="3" fill="#FEF08A" />
                          <circle cx="332" cy="217" r="3" fill="#FEF08A" />
                        </g>

                        <g className="anim-car-fast">
                          <rect x="470" y="240" width="48" height="28" rx="6" fill="#10B981" />
                          <rect x="478" y="245" width="32" height="14" rx="3" fill="#064E3B" opacity="0.8" />
                          <circle cx="482" cy="268" r="3.5" fill="#000" />
                          <circle cx="508" cy="268" r="3.5" fill="#000" />
                          <circle cx="472" cy="246" r="3" fill="#FEF08A" />
                          <circle cx="472" cy="262" r="3" fill="#FEF08A" />
                        </g>
                      </svg>

                      {/* CCTV HUD: TOP BAR */}
                      <div className="cctv-hud-top">
                        <div className="cctv-hud-left">
                          <span className="cctv-live-tag">
                            <span className="rec-dot-white"></span> LIVE STREAM
                          </span>
                          <span className="cctv-cam-id">
                            {cctv.km} · CAM-04
                          </span>
                        </div>
                        <div className="cctv-hud-right">
                          <span className="cctv-timestamp-tag">
                            {currentTime || '2026-08-22 09:52:00'}
                          </span>
                          <span className="cctv-archive-tag">
                            REC 24/7 1080P
                          </span>
                        </div>
                      </div>

                      {/* CCTV HUD: OPTICAL CROSSHAIR */}
                      <div className="cctv-hud-center">
                        <div className="cctv-crosshair"></div>
                      </div>

                      {/* CCTV HUD: BOTTOM BAR */}
                      <div className="cctv-hud-bottom">
                        <div>LATENCY: 14ms · 1080p @ 30 FPS · 4.8 Mbps</div>
                        <div>ENC: H.265 · IP: 10.180.4.15 · PTZ: 042°/-12°</div>
                      </div>
                    </div>
                  ) : (
                    <div className="cctv-paused-screen">
                      <div className="pause-icon">⏸</div>
                      <div className="pause-title">Dashboard Stream Paused</div>
                      <div className="pause-sub">
                        Live preview closed by operator. Background 24/7 incident archive continues uninterrupted.
                      </div>
                      <button className="cctv-ctrl-btn active-resume" onClick={handleToggleStream}>
                        ▶ Resume Live View Stream
                      </button>
                    </div>
                  )}

                  {/* STREAM CONTROLS BAR */}
                  <div className="cctv-controls-bar">
                    <button
                      className={`cctv-ctrl-btn ${isStreaming ? 'active-pause' : 'active-resume'}`}
                      onClick={handleToggleStream}
                    >
                      {isStreaming ? '⏸ Pause Live View' : '▶ Resume Live View'}
                    </button>
                    <button
                      className="cctv-ctrl-btn"
                      onClick={handleCaptureSnapshot}
                      title="Save timestamped frame to archive"
                    >
                      📷 Capture Snapshot
                    </button>
                    <button
                      className="cctv-ctrl-btn"
                      onClick={handleSyncPtz}
                      title="Calibrate optical framing to SmartLane corridor"
                    >
                      🎯 Align PTZ Angle
                    </button>
                    <div className="cctv-retention-pill">
                      <span>📁 30-Day Retention Secured</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* PHYSICAL HARDWARE FAULT DIAGNOSTIC SCREEN */
                <div className="cctv-fault-screen">
                  <div className="fault-header-banner">
                    <span className="fault-icon">⚠️</span>
                    <div>
                      <div className="fault-title">PHYSICAL HARDWARE FAULT / SIGNAL LOSS</div>
                      <div className="fault-sub">
                        Camera unit on gantry {cctv.km} failed to respond to network ping. Physical link down.
                      </div>
                    </div>
                  </div>

                  <div className="fault-details-box">
                    <div className="fault-row">
                      <span className="lbl">Status Code:</span>
                      <span className="val bad">ERR_CAM_PHYSICAL_DISCONNECT (0x504)</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Power Administration:</span>
                      <span className="val">HARDWARE LOCKED (Always-On Mandate)</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Diagnosed Root Cause:</span>
                      <span className="val">Gantry cable severed or localized power outage at KM {cctv.km}</span>
                    </div>
                    <div className="fault-row">
                      <span className="lbl">Last Known Signal:</span>
                      <span className="val mono">{currentTime || 'Today at 09:48:12'}</span>
                    </div>
                  </div>

                  <div className="fault-actions">
                    <button className="cctv-dispatch-btn" onClick={handleReportFault}>
                      🚨 Dispatch Field Technician & Log Maintenance Ticket
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'policy' && (
            <div className="cctv-policy-details">
              <h4>Highway CCTV Continuous Recording Protocol</h4>
              <div className="policy-cards-grid">
                <div className="policy-card">
                  <div className="picon">🔒</div>
                  <div className="ptitle">Always-On Continuous Recording</div>
                  <div className="pdesc">
                    Safety and incident forensics require uninterrupted archival on all PLUS highway corridors. Camera power cannot be toggled off by administrators.
                  </div>
                </div>
                <div className="policy-card">
                  <div className="picon">👁️</div>
                  <div className="ptitle">Operator On-Demand Live View</div>
                  <div className="pdesc">
                    Live streams are opened on-demand by authorized operators for traffic management, incident verification, and SmartLane lane clearance inspection.
                  </div>
                </div>
                <div className="policy-card">
                  <div className="picon">🛡️</div>
                  <div className="ptitle">Automated Audit & Compliance</div>
                  <div className="pdesc">
                    All operator feed accesses, PTZ adjustments, and physical connectivity dropouts are permanently logged into the immutable audit database.
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="cctv-audit-panel">
              <h4>Camera Audit Log Entries ({cctv.km})</h4>
              <div className="cctv-audit-list">
                <div className="cctv-audit-row">
                  <span className="atime">{currentTime.split(' ')[1] || '09:50:00'}</span>
                  <span className="atype info">STREAM_ACCESS</span>
                  <span className="adesc">User admin initiated live stream preview for {cctv.km}</span>
                </div>
                <div className="cctv-audit-row">
                  <span className="atime">09:30:12</span>
                  <span className={`atype ${isOk ? 'good' : 'bad'}`}>
                    {isOk ? 'HEALTH_CHECK' : 'HARDWARE_FAULT'}
                  </span>
                  <span className="adesc">
                    {isOk
                      ? `Camera ${cctv.km} diagnostic check PASSED — 24/7 stream OK`
                      : `Camera ${cctv.km} signal loss detected — Hardware fault logged`}
                  </span>
                </div>
                <div className="cctv-audit-row">
                  <span className="atime">08:00:00</span>
                  <span className="atype info">SYSTEM_BOOT</span>
                  <span className="adesc">Continuous 30-day safety archive initialized for {cctv.km}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
