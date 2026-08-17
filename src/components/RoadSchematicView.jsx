import React, { useRef, useState, useEffect } from 'react';

export default function RoadSchematicView({ loc, onSelectCctv, onOpenDesigner }) {
  const pathRef = useRef(null);
  const [eqPositions, setEqPositions] = useState([]);
  const [svgViewBox, setSvgViewBox] = useState('0 0 800 220');

  const pts = (loc && loc.roadPath && loc.roadPath.length >= 2)
    ? loc.roadPath
    : [
        { x: 50, y: 160 },
        { x: 220, y: 80 },
        { x: 420, y: 140 },
        { x: 600, y: 70 },
        { x: 750, y: 110 }
      ];

  // Construct SVG path string d="M x0 y0 L x1 y1 ..."
  const pathD = pts.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  // Calculate bounding box for SVG viewBox
  useEffect(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const padX = 50;
    const padY = 45;
    const w = Math.max(300, maxX - minX + padX * 2);
    const h = Math.max(140, maxY - minY + padY * 2);
    const vx = minX - padX;
    const vy = minY - padY;

    setSvgViewBox(`${vx} ${vy} ${w} ${h}`);
  }, [loc?.roadPath]);

  // Extract equipment list (combining gantries / lcs / vms)
  const gantries = loc?.gantries || [];
  const lcs = loc?.lcs || [];
  const vms = loc?.vms || [];
  const totalKm = parseFloat(loc?.distKm) || 8.4;

  // Calculate precise positions along SVG path
  useEffect(() => {
    if (!pathRef.current) return;
    try {
      const totalLen = pathRef.current.getTotalLength();
      if (totalLen === 0) return;

      // Consolidate unique equipment markers
      const items = [];
      
      // Add Gantries & CCTV
      gantries.forEach((g, idx) => {
        const kmMatch = g.km ? g.km.match(/[\d.]+/) : null;
        const kmVal = kmMatch ? parseFloat(kmMatch[0]) : (idx + 1) * (totalKm / (gantries.length + 1));
        const ratio = Math.min(0.96, Math.max(0.04, kmVal / totalKm));
        const pt = pathRef.current.getPointAtLength(totalLen * ratio);
        items.push({
          id: `gantry-${idx}`,
          km: g.km,
          kmVal,
          type: g.type || 'CCTV',
          status: g.status || 'ok',
          x: pt.x,
          y: pt.y,
          original: g
        });
      });

      // Add LCS Signs
      lcs.forEach((l, idx) => {
        const kmMatch = l.km ? l.km.match(/[\d.]+/) : null;
        const kmVal = kmMatch ? parseFloat(kmMatch[0]) : (idx + 1) * (totalKm / (lcs.length + 1));
        // Only add if not duplicate coordinate
        const exists = items.some(i => Math.abs(i.kmVal - kmVal) < 0.2 && i.type === 'LCS');
        if (!exists) {
          const ratio = Math.min(0.96, Math.max(0.04, kmVal / totalKm));
          const pt = pathRef.current.getPointAtLength(totalLen * ratio);
          items.push({
            id: `lcs-${idx}`,
            km: l.km,
            kmVal,
            type: 'LCS',
            status: l.open ? 'open' : 'closed',
            x: pt.x,
            y: pt.y,
            original: l
          });
        }
      });

      // Add VMS Boards
      vms.forEach((v, idx) => {
        const kmMatch = v.km ? v.km.match(/[\d.]+/) : null;
        const kmVal = kmMatch ? parseFloat(kmMatch[0]) : (idx === 0 ? 0.5 : totalKm - 0.5);
        const ratio = Math.min(0.96, Math.max(0.04, kmVal / totalKm));
        const pt = pathRef.current.getPointAtLength(totalLen * ratio);
        items.push({
          id: `vms-${idx}`,
          km: v.km,
          kmVal,
          type: 'VMS',
          status: 'ok',
          x: pt.x,
          y: pt.y,
          original: v
        });
      });

      setEqPositions(items);
    } catch (e) {
      console.warn('SVG path length calculation failed', e);
    }
  }, [loc?.gantries, loc?.lcs, loc?.vms, loc?.distKm, loc?.roadPath]);

  const isActive = loc?.status === 'active';
  const isPending = loc?.status === 'pending';

  const strokeColor = isActive ? '#0D9488' : isPending ? '#D97706' : '#64748B';
  const glowColor = isActive ? 'rgba(13, 148, 136, 0.4)' : isPending ? 'rgba(217, 119, 6, 0.4)' : 'transparent';

  return (
    <div className="road-schematic-view">
      <div className="schematic-header-bar">
        <div className="schematic-title-group">
          <span className="live-dot-indicator" style={{ background: isActive ? '#10B981' : isPending ? '#F59E0B' : '#64748B' }}></span>
          <span className="schematic-title">ROAD ALIGNMENT MAP &amp; LIVE SCHEMATIC</span>
          <span className="schematic-dir">({loc?.direction || 'Northbound'} · {totalKm} km)</span>
        </div>
        {onOpenDesigner && (
          <button
            className="edit-layout-quick-btn"
            onClick={onOpenDesigner}
            title="Open Road Layout Designer to edit path or equipment positions"
          >
            ✏️ Edit Road Path
          </button>
        )}
      </div>

      {/* Main Dynamic SVG Canvas */}
      <div className="schematic-svg-wrap">
        <svg className="schematic-svg" viewBox={svgViewBox} preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Active Glow Filter */}
            <filter id="roadGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            {/* Linear Gradient along road */}
            <linearGradient id="activeRoadGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0D9488" />
              <stop offset="50%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>

          {/* Background Wide Road Bed */}
          <path
            d={pathD}
            fill="none"
            stroke={isActive ? '#0F2927' : '#1E293B'}
            strokeWidth="32"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Road Border / Pavement Edge */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="20"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={isActive ? 'url(#roadGlow)' : undefined}
            opacity={isActive ? 0.9 : 0.6}
          />

          {/* Inner Active Flow Track */}
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke={isActive ? 'url(#activeRoadGradient)' : '#334155'}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Center Dashed Lane Divider Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeDasharray={isActive ? '10 8' : '6 6'}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isActive ? 'animated-lane-dashes' : ''}
            opacity="0.9"
          />

          {/* Render Equipment Markers along Drawn Path */}
          {eqPositions.map((eq) => {
            const isCctv = eq.type === 'CCTV';
            const isLcs = eq.type === 'LCS';
            const isVms = eq.type === 'VMS';

            const badgeBg = isCctv
              ? (eq.status === 'ok' ? '#2563EB' : '#DC2626')
              : isLcs
              ? (eq.status === 'open' ? '#10B981' : '#DC2626')
              : isVms
              ? '#B45309'
              : '#7C3AED';

            const iconChar = isCctv ? '📷' : isLcs ? (eq.status === 'open' ? '↓' : '✕') : isVms ? '▭' : '▲';

            return (
              <g
                key={eq.id}
                transform={`translate(${eq.x}, ${eq.y})`}
                className={`schematic-eq-node ${isCctv ? 'clickable' : ''}`}
                onClick={() => {
                  if (isCctv && onSelectCctv) {
                    onSelectCctv(eq.original);
                  }
                }}
              >
                {/* Marker Stem / Connector line */}
                <line x1="0" y1="0" x2="0" y2="-22" stroke={badgeBg} strokeWidth="2" opacity="0.8" />
                
                {/* Marker Node Circle */}
                <circle cx="0" cy="-22" r="12" fill={badgeBg} stroke="#FFFFFF" strokeWidth="2" className="node-circle" />

                {/* Marker Icon */}
                <text x="0" y="-18.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="bold" fontFamily="Inter, sans-serif">
                  {iconChar}
                </text>

                {/* KM Tag Box */}
                <rect x="-26" y="-48" width="52" height="15" rx="4" fill="#0F1729" stroke={badgeBg} strokeWidth="1" opacity="0.95" />
                <text x="0" y="-37" textAnchor="middle" fill="#E2E8F0" fontSize="8.5" fontWeight="700" fontFamily="monospace">
                  {eq.km || `KM${eq.kmVal.toFixed(1)}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Bottom Live Lane Status Banner */}
      <div className={`schematic-status-footer ${loc?.status || 'inactive'}`}>
        <div className="status-footer-left">
          <span className="status-dot-pulse"></span>
          <b>SMARTLANE OPERATIONAL STATE:</b>
          <span className="state-lbl">
            {isActive
              ? `ACTIVE — ${loc?.phaseLabel || 'EMERGENCY LANE OPEN'}`
              : isPending
              ? 'ATTENTION RECOMMENDED — HEAVY TRAFFIC DETECTED'
              : 'STANDBY — EMERGENCY LANE CLOSED'}
          </span>
        </div>
        <div className="status-footer-right">
          <span>{gantries.length} Equipment Installed</span>
        </div>
      </div>
    </div>
  );
}
