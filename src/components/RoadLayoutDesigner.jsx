import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as fabric from 'fabric';

// Enhanced equipment definitions
export const EQUIPMENT_TYPES = {
  CCTV: {
    label: 'CCTV Camera',
    shortLabel: 'CCTV',
    icon: '📹',
    symbol: '◉',
    color: '#2563EB',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    sensorRange: 45,
    sensorAngle: 65,
    category: 'Surveillance',
    desc: '24/7 PTZ lane surveillance & incident detection'
  },
  AVDS: {
    label: 'AVDS Radar',
    shortLabel: 'AVDS',
    icon: '📡',
    symbol: '▲',
    color: '#8B5CF6',
    glowColor: 'rgba(139, 92, 246, 0.4)',
    sensorRange: 35,
    sensorAngle: 90,
    category: 'Vehicle Detector',
    desc: 'Microwave speed, headway & volume detection'
  },
  LCS: {
    label: 'LCS Matrix Gantry',
    shortLabel: 'LCS',
    icon: '🚥',
    symbol: '⬇',
    color: '#EF4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    sensorRange: 20,
    sensorAngle: 360,
    category: 'Lane Control',
    desc: 'Dynamic overhead lane indicator (Open / Closed)'
  },
  VMS: {
    label: 'Variable Message Sign',
    shortLabel: 'VMS',
    icon: '📺',
    symbol: '▭',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.4)',
    sensorRange: 25,
    sensorAngle: 360,
    category: 'Advisory Board',
    desc: 'Full matrix LED electronic highway advisory board'
  },
  MINI_VMS: {
    label: 'Mini VMS Board',
    shortLabel: 'Mini VMS',
    icon: '📱',
    symbol: '▯',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.4)',
    sensorRange: 18,
    sensorAngle: 360,
    category: 'Shoulder Info',
    desc: 'Intermediate shoulder advisory board'
  },
  SOS: {
    label: 'SOS Emergency Bay',
    shortLabel: 'SOS Bay',
    icon: '🆘',
    symbol: '✚',
    color: '#EC4899',
    glowColor: 'rgba(236, 72, 153, 0.4)',
    sensorRange: 15,
    sensorAngle: 360,
    category: 'Layby Safety',
    desc: 'Emergency telephone layby alcove'
  }
};

const PRESET_TEMPLATES = [
  {
    id: 'plus-standard',
    name: 'PLUS Standard Smartlane (8.4 km)',
    desc: 'Full corridor with Entry/Exit VMS, LCS gantries, and CCTV coverage',
    distKm: 8.4,
    direction: 'Northbound',
    lanes: 3,
    speedLimit: 90,
    points: [
      { x: 70, y: 380 },
      { x: 260, y: 220 },
      { x: 480, y: 340 },
      { x: 700, y: 160 },
      { x: 920, y: 260 }
    ],
    equipment: [
      { type: 'VMS', km: 0.2, label: 'Entry VMS' },
      { type: 'CCTV', km: 1.0, label: 'CCTV KM1.0' },
      { type: 'LCS', km: 1.8, label: 'LCS Gantry #1' },
      { type: 'AVDS', km: 2.7, label: 'Radar Sensor #1' },
      { type: 'MINI_VMS', km: 3.8, label: 'Intermediate VMS' },
      { type: 'LCS', km: 4.5, label: 'LCS Gantry #2' },
      { type: 'CCTV', km: 5.5, label: 'CCTV KM5.5' },
      { type: 'SOS', km: 6.2, label: 'Layby SOS Bay' },
      { type: 'LCS', km: 7.2, label: 'LCS Gantry #3' },
      { type: 'VMS', km: 8.2, label: 'Exit VMS' }
    ]
  },
  {
    id: 's-curve-bypass',
    name: 'S-Curve Highway Bypass (6.2 km)',
    desc: 'Challenging curve profile with dense CCTV surveillance & radars',
    distKm: 6.2,
    direction: 'Northbound',
    lanes: 3,
    speedLimit: 80,
    points: [
      { x: 80, y: 420 },
      { x: 240, y: 160 },
      { x: 450, y: 140 },
      { x: 640, y: 400 },
      { x: 820, y: 380 },
      { x: 950, y: 180 }
    ],
    equipment: [
      { type: 'VMS', km: 0.1, label: 'Bypass Start VMS' },
      { type: 'CCTV', km: 1.2, label: 'Apex Cam 1' },
      { type: 'AVDS', km: 2.4, label: 'Curve Radar' },
      { type: 'LCS', km: 3.5, label: 'Mid-Curve LCS' },
      { type: 'CCTV', km: 4.8, label: 'Apex Cam 2' },
      { type: 'VMS', km: 6.0, label: 'Bypass Exit VMS' }
    ]
  },
  {
    id: 'interchange-merge',
    name: 'Expressway Merge & Interchange (4.5 km)',
    desc: 'High congestion merge point with dynamic shoulder controls',
    distKm: 4.5,
    direction: 'Southbound',
    lanes: 4,
    speedLimit: 80,
    points: [
      { x: 80, y: 280 },
      { x: 360, y: 280 },
      { x: 620, y: 200 },
      { x: 920, y: 200 }
    ],
    equipment: [
      { type: 'VMS', km: 0.3, label: 'Pre-Merge VMS' },
      { type: 'LCS', km: 1.5, label: 'Merge LCS 1' },
      { type: 'CCTV', km: 2.2, label: 'Merge Point CCTV' },
      { type: 'AVDS', km: 3.0, label: 'Flow Counter' },
      { type: 'VMS', km: 4.2, label: 'Post-Merge VMS' }
    ]
  },
  {
    id: 'straight-corridor',
    name: 'High-Speed Straight Corridor (5.0 km)',
    desc: 'Linear 3-lane expressway with balanced gantry spacing',
    distKm: 5.0,
    direction: 'Northbound',
    lanes: 3,
    speedLimit: 110,
    points: [
      { x: 80, y: 270 },
      { x: 350, y: 270 },
      { x: 650, y: 270 },
      { x: 920, y: 270 }
    ],
    equipment: [
      { type: 'VMS', km: 0.2, label: 'Entry VMS' },
      { type: 'LCS', km: 1.5, label: 'LCS Gantry 1' },
      { type: 'CCTV', km: 2.5, label: 'CCTV Mid' },
      { type: 'LCS', km: 3.5, label: 'LCS Gantry 2' },
      { type: 'VMS', km: 4.8, label: 'Exit VMS' }
    ]
  }
];

function dist(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function totalPathLength(pts) {
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    t += dist(pts[i], pts[i + 1]);
  }
  return t;
}

function projectToPolyline(px, py, pts) {
  if (!pts || pts.length < 2) return null;
  let best = null;
  let running = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const segLenSq = abx * abx + aby * aby;
    const segLen = Math.sqrt(segLenSq);
    let t = segLenSq === 0 ? 0 : ((px - a.x) * abx + (py - a.y) * aby) / segLenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + abx * t;
    const projY = a.y + aby * t;
    const d = Math.hypot(px - projX, py - projY);
    const distAlong = running + segLen * t;
    const angle = Math.atan2(aby, abx) * (180 / Math.PI);
    if (best === null || d < best.d) {
      best = { d, x: projX, y: projY, distAlong, angle, segIndex: i };
    }
    running += segLen;
  }
  return best;
}

function getPointAndAngleAtDistance(distAlong, pts) {
  if (!pts || pts.length < 2) return { x: 0, y: 0, angle: 0 };
  let running = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const segLen = dist(pts[i], pts[i + 1]);
    if (running + segLen >= distAlong || i === pts.length - 2) {
      const t = segLen === 0 ? 0 : Math.max(0, Math.min(1, (distAlong - running) / segLen));
      const x = pts[i].x + (pts[i + 1].x - pts[i].x) * t;
      const y = pts[i].y + (pts[i + 1].y - pts[i].y) * t;
      const angle = Math.atan2(pts[i + 1].y - pts[i].y, pts[i + 1].x - pts[i].x) * (180 / Math.PI);
      return { x, y, angle };
    }
    running += segLen;
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angle: 0 };
}

export default function RoadLayoutDesigner({
  initialLoc = null,
  onSaveLayout,
  onClose,
  onShowToast
}) {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  const initialRoadPoints = (initialLoc && initialLoc.roadPath && initialLoc.roadPath.length >= 2)
    ? initialLoc.roadPath
    : PRESET_TEMPLATES[0].points;

  // Form & Corridor Config
  const [locName, setLocName] = useState(initialLoc ? initialLoc.name : 'Smartlane Setia Alam');
  const [distKm, setDistKm] = useState(initialLoc ? parseFloat(initialLoc.distKm || initialLoc.distanceKm || 8.4) : 8.4);
  const [direction, setDirection] = useState(initialLoc ? (initialLoc.direction || 'Northbound') : 'Northbound');
  const [numLanes, setNumLanes] = useState(initialLoc?.numLanes || 3);
  const [roadWidthScale, setRoadWidthScale] = useState(initialLoc?.roadWidthScale || 1.0);
  const [speedLimit, setSpeedLimit] = useState(initialLoc?.speedLimit || 90);
  const [gridTheme, setGridTheme] = useState('dark-grid');

  // Layer Toggles
  const [showFovCones, setShowFovCones] = useState(true);
  const [showTrafficParticles, setShowTrafficParticles] = useState(true);
  const [showKmMarkers, setShowKmMarkers] = useState(true);

  // Interactive Tools State
  const [mode, setMode] = useState('idle'); // 'idle' | 'drawing' | 'placing' | 'editing-nodes'
  const [armedType, setArmedType] = useState(null);
  const [selectedEqId, setSelectedEqId] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [activeTabSide, setActiveTabSide] = useState('hardware'); // 'hardware' | 'inspector' | 'safety' | 'presets'

  // Traffic Simulation State
  const [simActive, setSimActive] = useState(true);
  const [simSpeed, setSimSpeed] = useState(1.2);
  const [simDensity, setSimDensity] = useState('moderate');
  const [smartLaneOpenInSim, setSmartLaneOpenInSim] = useState(true);

  // Live Telemetry HUD State
  const [hudCoord, setHudCoord] = useState({ x: 0, y: 0, km: 0, angle: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Canvas Objects Tracking Refs
  const roadPointsRef = useRef([...initialRoadPoints]);
  const waypointHandlesRef = useRef([]);
  const previewLineRef = useRef(null);
  const roadMeshObjectsRef = useRef([]);
  const kmMarkerObjectsRef = useRef([]);
  const equipmentRef = useRef([]);
  const eqCounterRef = useRef(1);
  const trafficVehiclesRef = useRef([]);

  const modeRef = useRef(mode);
  const armedTypeRef = useRef(armedType);

  // UI state for equipment rendering
  const [equipmentList, setEquipmentList] = useState([]);
  const [isRoadFinished, setIsRoadFinished] = useState(true);
  const [roadPointsState, setRoadPointsState] = useState(initialRoadPoints);
  const [isRoadSelected, setIsRoadSelected] = useState(false);
  const [selectedNodeIdx, setSelectedNodeIdx] = useState(null);

  useEffect(() => {
    modeRef.current = mode;
    armedTypeRef.current = armedType;
  }, [mode, armedType]);

  const kmAt = useCallback((distAlongPx) => {
    const total = totalPathLength(roadPointsRef.current);
    const distanceKm = parseFloat(distKm) || 0;
    if (total === 0) return 0;
    return parseFloat(((distAlongPx / total) * distanceKm).toFixed(2));
  }, [distKm]);

  // Sync React list state with canvas equipment reference
  const syncEquipmentState = useCallback(() => {
    const list = equipmentRef.current.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      distAlong: e.marker ? e.marker.data.distAlong : e.distAlong,
      km: kmAt(e.marker ? e.marker.data.distAlong : e.distAlong)
    }));
    list.sort((a, b) => a.km - b.km);
    setEquipmentList(list);
  }, [kmAt]);

  // ITS Safety & Compliance Analysis
  const safetyAudit = useMemo(() => {
    const totalDist = parseFloat(distKm) || 0;
    const sorted = [...equipmentList].sort((a, b) => a.km - b.km);
    const checks = [];
    let score = 100;

    // Check 1: Entry VMS
    const hasEntryVms = sorted.some(e => e.type === 'VMS' && e.km <= totalDist * 0.3);
    checks.push({
      title: 'Entry Advisory VMS',
      desc: 'Mandatory at start of Smartlane zone',
      pass: hasEntryVms,
      detail: hasEntryVms ? 'Installed within first 30% of corridor' : 'Missing entry advisory sign'
    });
    if (!hasEntryVms) score -= 20;

    // Check 2: Exit VMS
    const hasExitVms = sorted.some(e => e.type === 'VMS' && e.km >= totalDist * 0.7);
    checks.push({
      title: 'Termination Exit VMS',
      desc: 'Mandatory at end of shoulder run',
      pass: hasExitVms,
      detail: hasExitVms ? 'Installed within final 30% of corridor' : 'Missing exit termination sign'
    });
    if (!hasExitVms) score -= 20;

    // Check 3: CCTV Coverage
    const cctvs = sorted.filter(e => e.type === 'CCTV');
    const cctvPass = cctvs.length >= 2;
    checks.push({
      title: 'CCTV Continuous Surveillance',
      desc: 'Recommended spacing ≤ 1.5 km',
      pass: cctvPass,
      detail: cctvPass ? `${cctvs.length} CCTV cameras active` : 'Insufficient surveillance cameras'
    });
    if (!cctvPass) score -= 15;

    // Check 4: LCS Overhead Matrix Gantries
    const lcs = sorted.filter(e => e.type === 'LCS');
    const lcsPass = lcs.length >= 2;
    checks.push({
      title: 'Overhead LCS Matrix Indicators',
      desc: 'Dynamic lane open/closed signs',
      pass: lcsPass,
      detail: lcsPass ? `${lcs.length} LCS gantries deployed` : 'Insufficient lane control gantries'
    });
    if (!lcsPass) score -= 15;

    // Check 5: SOS Emergency Layby
    const sos = sorted.filter(e => e.type === 'SOS');
    const sosPass = sos.length >= 1;
    checks.push({
      title: 'Emergency SOS Layby Bay',
      desc: 'Physical vehicle haven alcove',
      pass: sosPass,
      detail: sosPass ? `${sos.length} emergency bays configured` : 'Consider adding SOS layby bay'
    });
    if (!sosPass) score -= 10;

    score = Math.max(30, Math.min(100, score));

    return {
      score,
      checks,
      totalEquipment: sorted.length,
      counts: {
        cctv: cctvs.length,
        avds: sorted.filter(e => e.type === 'AVDS').length,
        lcs: lcs.length,
        vms: sorted.filter(e => e.type === 'VMS').length,
        miniVms: sorted.filter(e => e.type === 'MINI_VMS').length,
        sos: sos.length
      }
    };
  }, [equipmentList, distKm]);

  // Synchronize canvas dimensions
  const resizeCanvas = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c || !containerRef.current) return;
    const stage = containerRef.current;
    const w = stage.clientWidth || 900;
    const h = stage.clientHeight || 550;
    try {
      if (typeof c.setDimensions === 'function') {
        c.setDimensions({ width: w, height: h });
      } else {
        if (typeof c.setWidth === 'function') c.setWidth(w);
        if (typeof c.setHeight === 'function') c.setHeight(h);
      }
      c.renderAll();
    } catch (e) {
      console.warn('resizeCanvas error:', e);
    }
  }, []);

  // Render Multi-lane Road Mesh
  const renderRoadMesh = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    if (roadMeshObjectsRef.current && roadMeshObjectsRef.current.length > 0) {
      roadMeshObjectsRef.current.forEach(obj => {
        try { c.remove(obj); } catch (e) { /* ignore */ }
      });
      roadMeshObjectsRef.current = [];
    }

    if (kmMarkerObjectsRef.current && kmMarkerObjectsRef.current.length > 0) {
      kmMarkerObjectsRef.current.forEach(obj => {
        try { c.remove(obj); } catch (e) { /* ignore */ }
      });
      kmMarkerObjectsRef.current = [];
    }

    const pts = roadPointsRef.current;
    if (!pts || pts.length < 2) {
      c.renderAll();
      return;
    }

    const scale = parseFloat(roadWidthScale) || 1.0;
    const laneWidth = Math.round(14 * scale);
    const shoulderWidth = Math.round(16 * scale);
    const totalAsphaltWidth = numLanes * laneWidth + shoulderWidth + 10;

    // SVG path string for pixel-perfect identical alignment
    const pathD = pts.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    // 1. Base Road Shadow
    const roadGlow = new fabric.Path(pathD, {
      fill: '',
      stroke: 'rgba(30, 41, 59, 0.7)',
      strokeWidth: totalAsphaltWidth + 8,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });

    // 2. Asphalt Body
    const asphaltMain = new fabric.Path(pathD, {
      fill: '',
      stroke: '#1E293B',
      strokeWidth: totalAsphaltWidth,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });

    // 3. SmartLane Shoulder Zone
    const smartLaneShoulder = new fabric.Path(pathD, {
      fill: '',
      stroke: 'rgba(234, 179, 8, 0.25)',
      strokeWidth: totalAsphaltWidth - 6,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });

    // 4. Outer Guard Line
    const edgeLineLeft = new fabric.Path(pathD, {
      fill: '',
      stroke: '#E2E8F0',
      strokeWidth: 2,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });

    // 5. Solid Yellow Barrier Line
    const shoulderSeparator = new fabric.Path(pathD, {
      fill: '',
      stroke: '#FBBF24',
      strokeWidth: 2.5,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });

    // 6. Dashed White Lane Dividers
    const laneDash = new fabric.Path(pathD, {
      fill: '',
      stroke: '#FFFFFF',
      strokeWidth: 2,
      strokeDashArray: [14, 12],
      strokeLineCap: 'butt',
      selectable: false,
      evented: false
    });

    const items = [roadGlow, asphaltMain, smartLaneShoulder, edgeLineLeft, shoulderSeparator, laneDash];
    roadMeshObjectsRef.current = items;

    items.forEach(item => {
      c.add(item);
      if (typeof c.sendObjectToBack === 'function') {
        c.sendObjectToBack(item);
      } else if (typeof item.sendToBack === 'function') {
        item.sendToBack();
      }
    });

    // Render KM Station Ticks Along Curve
    if (showKmMarkers) {
      const totalLen = totalPathLength(pts);
      const totalDistVal = parseFloat(distKm) || 8.4;
      const numTicks = Math.min(10, Math.max(3, Math.floor(totalDistVal)));
      const markers = [];

      for (let i = 0; i <= numTicks; i++) {
        const fraction = i / numTicks;
        const distAlong = fraction * totalLen;
        const info = getPointAndAngleAtDistance(distAlong, pts);
        const rad = (info.angle * Math.PI) / 180;
        const perpRad = rad + Math.PI / 2;
        const tickKm = (fraction * totalDistVal).toFixed(1);

        const offsetX = info.x + Math.cos(perpRad) * (totalAsphaltWidth / 2 + 12);
        const offsetY = info.y + Math.sin(perpRad) * (totalAsphaltWidth / 2 + 12);

        const tickText = new fabric.Text(`KM ${tickKm}`, {
          left: offsetX,
          top: offsetY,
          fontSize: 9,
          fill: '#64748B',
          fontFamily: 'JetBrains Mono, monospace',
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false
        });

        c.add(tickText);
        markers.push(tickText);
      }
      kmMarkerObjectsRef.current = markers;
    }

    // Ensure all equipment markers are preserved on top and never hidden
    if (equipmentRef.current && equipmentRef.current.length > 0) {
      equipmentRef.current.forEach(eq => {
        if (eq.marker) {
          if (typeof c.contains === 'function' && !c.contains(eq.marker)) {
            c.add(eq.marker);
          }
          if (typeof c.bringObjectToFront === 'function') {
            c.bringObjectToFront(eq.marker);
          }
          eq.marker.setCoords();
        }
      });
    }

    c.renderAll();
  }, [numLanes, roadWidthScale, showKmMarkers, distKm]);

  // Real-time Road Size and Lanes Synchronization
  useEffect(() => {
    if (isRoadFinished && roadPointsRef.current.length >= 2) {
      renderRoadMesh();
      initTrafficParticles();
    }
  }, [numLanes, roadWidthScale, isRoadFinished, renderRoadMesh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize Traffic Simulation Particles
  const initTrafficParticles = useCallback(() => {
    const count = simDensity === 'light' ? 8 : simDensity === 'moderate' ? 14 : 22;
    const vehicles = [];
    const types = [
      { name: 'sedan', color: '#60A5FA', length: 13, width: 6, speedMult: 1.0 },
      { name: 'suv', color: '#34D399', length: 15, width: 7, speedMult: 0.95 },
      { name: 'truck', color: '#FBBF24', length: 22, width: 8, speedMult: 0.75 },
      { name: 'patrol', color: '#EC4899', length: 14, width: 6, speedMult: 1.15 }
    ];

    const pts = roadPointsRef.current;
    const totalLen = totalPathLength(pts);
    if (totalLen < 10) return;

    for (let i = 0; i < count; i++) {
      const vType = types[Math.floor(Math.random() * types.length)];
      const laneChoice = smartLaneOpenInSim
        ? (Math.random() < 0.25 ? -1 : Math.floor(Math.random() * numLanes))
        : Math.floor(Math.random() * numLanes);

      vehicles.push({
        id: `v-${i}`,
        distAlong: (i / count) * totalLen + Math.random() * 20,
        speed: (2.2 + Math.random() * 1.5) * vType.speedMult,
        lane: laneChoice,
        type: vType,
        length: vType.length,
        width: vType.width,
        color: vType.color
      });
    }
    trafficVehiclesRef.current = vehicles;
  }, [simDensity, smartLaneOpenInSim, numLanes]);

  // Redraw Preview Line
  const redrawPreviewLine = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (previewLineRef.current) {
      c.remove(previewLineRef.current);
    }
    if (roadPointsRef.current.length < 2) {
      c.renderAll();
      return;
    }
    const pl = new fabric.Polyline(roadPointsRef.current, {
      fill: '',
      stroke: '#38BDF8',
      strokeWidth: 4,
      strokeDashArray: [8, 6],
      selectable: false,
      evented: false
    });
    previewLineRef.current = pl;
    c.add(pl);
    c.renderAll();
  }, []);

  // Update Waypoint Handle Nodes (Supports Dragging to Reshape Curve)
  const updateWaypointHandles = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    waypointHandlesRef.current.forEach(h => {
      try { c.remove(h); } catch (e) { /* ignore */ }
    });
    waypointHandlesRef.current = [];

    const isEditing = mode === 'drawing' || mode === 'editing-nodes';
    if (isEditing && roadPointsRef.current.length > 0) {
      roadPointsRef.current.forEach((p, idx) => {
        const handle = new fabric.Circle({
          left: p.x,
          top: p.y,
          radius: mode === 'editing-nodes' ? 10 : 7,
          fill: idx === 0 ? '#10B981' : idx === roadPointsRef.current.length - 1 ? '#EF4444' : '#38BDF8',
          stroke: '#FFFFFF',
          strokeWidth: 2.5,
          originX: 'center',
          originY: 'center',
          hasControls: false,
          hasBorders: true,
          borderColor: '#F59E0B',
          hoverCursor: 'grab',
          selectable: true,
          evented: true,
          shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: 6, offsetX: 0, offsetY: 2 })
        });

        handle.dataNodeIdx = idx;

        handle.on('moving', () => {
          roadPointsRef.current[idx] = { x: handle.left, y: handle.top };
          if (modeRef.current === 'drawing') {
            redrawPreviewLine();
          } else {
            renderRoadMesh();
            // Preserve equipment positions and calculate updated KM along curve
            equipmentRef.current.forEach(eq => {
              if (eq.marker) {
                const proj = projectToPolyline(eq.marker.left, eq.marker.top, roadPointsRef.current);
                if (proj) {
                  eq.distAlong = proj.distAlong;
                  eq.marker.data.distAlong = proj.distAlong;
                }
                if (typeof c.bringObjectToFront === 'function') {
                  c.bringObjectToFront(eq.marker);
                }
                eq.marker.setCoords();
              }
            });
            syncEquipmentState();
          }
          c.renderAll();
        });

        c.add(handle);
        if (typeof c.bringObjectToFront === 'function') {
          c.bringObjectToFront(handle);
        }
        waypointHandlesRef.current.push(handle);
      });
      c.renderAll();
    }
  }, [mode, redrawPreviewLine, renderRoadMesh, syncEquipmentState]);

  // Synchronize handles whenever mode changes
  useEffect(() => {
    updateWaypointHandles();
  }, [mode, updateWaypointHandles]);

  // Place Equipment Marker
  const placeEquipmentMarker = useCallback((type, x, y, distAlong, customLabel = null) => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    const eqMeta = EQUIPMENT_TYPES[type] || EQUIPMENT_TYPES.CCTV;
    const ptInfo = getPointAndAngleAtDistance(distAlong, roadPointsRef.current);
    const angle = ptInfo.angle || 0;
    const id = 'eq-' + eqCounterRef.current++;
    const label = customLabel || `${eqMeta.shortLabel} ${kmAt(distAlong).toFixed(1)}`;

    const elements = [];

    // FOV Cone
    if (eqMeta.sensorRange > 0) {
      const fovCone = new fabric.Circle({
        radius: eqMeta.sensorRange,
        startAngle: 0,
        endAngle: (eqMeta.sensorAngle * Math.PI) / 180,
        fill: eqMeta.glowColor,
        stroke: eqMeta.color,
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        opacity: showFovCones ? 0.85 : 0
      });
      elements.push(fovCone);
    }

    // Truss
    const trussBar = new fabric.Rect({
      width: 4,
      height: 28,
      fill: '#475569',
      stroke: '#0F172A',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    elements.push(trussBar);

    // Halo
    const halo = new fabric.Circle({
      radius: 13,
      fill: 'rgba(15, 23, 42, 0.9)',
      stroke: eqMeta.color,
      strokeWidth: 2.5,
      originX: 'center',
      originY: 'center'
    });
    elements.push(halo);

    // Center Symbol
    const textIcon = new fabric.Text(eqMeta.symbol, {
      fontSize: 12,
      fill: '#FFFFFF',
      fontWeight: 'bold',
      originX: 'center',
      originY: 'center',
      fontFamily: 'Inter, system-ui, sans-serif'
    });
    elements.push(textIcon);

    const marker = new fabric.Group(elements, {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      angle: angle,
      hasControls: false,
      hasBorders: true,
      borderColor: '#38BDF8',
      borderScaleFactor: 2,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      hoverCursor: 'pointer'
    });

    marker.data = { id, type, label, distAlong };

    marker.on('selected', () => {
      setSelectedEqId(id);
      setActiveTabSide('inspector');
    });

    // Freely drag equipment anywhere on the grid (inside or outside road line)
    marker.on('moving', () => {
      const proj = projectToPolyline(marker.left, marker.top, roadPointsRef.current);
      if (proj) {
        marker.angle = proj.angle;
        marker.data.distAlong = proj.distAlong;
        marker.data.customX = marker.left;
        marker.data.customY = marker.top;
      }
      marker.setCoords();
      syncEquipmentState();
      c.renderAll();
    });

    c.add(marker);
    if (typeof c.bringObjectToFront === 'function') {
      c.bringObjectToFront(marker);
    }
    equipmentRef.current.push({ id, type, label, marker, distAlong });
    syncEquipmentState();
    c.renderAll();

    const kmVal = kmAt(distAlong);
    if (onShowToast) onShowToast(`Placed ${eqMeta.label} at KM ${kmVal.toFixed(2)}`);
  }, [kmAt, onShowToast, showFovCones, syncEquipmentState]);

  // Remove Equipment
  const removeEquipmentMarker = useCallback((id) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const item = equipmentRef.current.find((e) => e.id === id);
    if (item) {
      c.remove(item.marker);
      equipmentRef.current = equipmentRef.current.filter((e) => e.id !== id);
      if (selectedEqId === id) setSelectedEqId(null);
      syncEquipmentState();
      c.renderAll();
      if (onShowToast) onShowToast(`Equipment removed.`);
    }
  }, [onShowToast, selectedEqId, syncEquipmentState]);

  // Draw Path
  const handleStartDraw = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (c) c.clear();

    roadPointsRef.current = [];
    waypointHandlesRef.current = [];
    previewLineRef.current = null;
    roadMeshObjectsRef.current = [];
    kmMarkerObjectsRef.current = [];
    equipmentRef.current = [];
    trafficVehiclesRef.current = [];
    setEquipmentList([]);
    setSelectedEqId(null);
    setMode('drawing');
    setIsRoadFinished(false);

    if (c) {
      c.defaultCursor = 'crosshair';
      c.renderAll();
    }

    if (onShowToast) onShowToast('Drawing mode active: Click anywhere on the grid to place highway points. Double-click or click "Finish Road" when done.');
  }, [onShowToast]);

  // Undo Last Point in Drawing Mode
  const handleUndoPoint = useCallback(() => {
    if (mode !== 'drawing' || roadPointsRef.current.length === 0) return;
    roadPointsRef.current.pop();
    redrawPreviewLine();
    updateWaypointHandles();
  }, [mode, redrawPreviewLine, updateWaypointHandles]);

  // Add Midpoint Curve Node for Line Bending
  const handleAddCurvePoint = useCallback(() => {
    if (roadPointsRef.current.length < 2) return;
    const pts = roadPointsRef.current;
    const midIdx = Math.max(1, Math.floor(pts.length / 2));
    const p1 = pts[midIdx - 1];
    const p2 = pts[midIdx];
    const newPt = {
      x: Math.round((p1.x + p2.x) / 2) + 25,
      y: Math.round((p1.y + p2.y) / 2) - 30
    };
    pts.splice(midIdx, 0, newPt);
    renderRoadMesh();
    setMode('editing-nodes');
    updateWaypointHandles();
    if (onShowToast) onShowToast('Added curve vertex node! Drag the node on the grid to bend the highway line.');
  }, [onShowToast, renderRoadMesh, updateWaypointHandles]);

  // Reverse Road Alignment
  const handleReverseDirection = useCallback(() => {
    if (roadPointsRef.current.length < 2) return;
    roadPointsRef.current.reverse();
    setRoadPointsState([...roadPointsRef.current]);
    renderRoadMesh();
    updateWaypointHandles();
    syncEquipmentState();
    if (onShowToast) onShowToast('Corridor alignment direction reversed.');
  }, [onShowToast, renderRoadMesh, syncEquipmentState, updateWaypointHandles]);

  // Select Road Line
  const handleSelectRoad = useCallback(() => {
    setIsRoadSelected(true);
    setSelectedEqId(null);
    setMode('editing-nodes');
    setActiveTabSide('inspector');
    setRoadPointsState([...roadPointsRef.current]);
    updateWaypointHandles();
    if (onShowToast) onShowToast('Road line selected! You can adjust node coordinates or drag points on the grid.');
  }, [onShowToast, updateWaypointHandles]);

  // Apply Quick Curvature Presets
  const handleApplyCurveShape = useCallback((shapeType) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const stage = containerRef.current;
    const w = stage?.clientWidth || 900;
    const h = stage?.clientHeight || 550;
    const startX = 80;
    const endX = w - 80;
    const midY = Math.round(h * 0.48);

    let newPts = [];
    if (shapeType === 'straight') {
      newPts = [
        { x: startX, y: midY },
        { x: Math.round(startX + (endX - startX) * 0.5), y: midY },
        { x: endX, y: midY }
      ];
    } else if (shapeType === 'scurve') {
      newPts = [
        { x: startX, y: midY + 70 },
        { x: Math.round(startX + (endX - startX) * 0.28), y: midY - 90 },
        { x: Math.round(startX + (endX - startX) * 0.52), y: midY + 50 },
        { x: Math.round(startX + (endX - startX) * 0.76), y: midY - 80 },
        { x: endX, y: midY }
      ];
    } else if (shapeType === 'arc-up') {
      newPts = [
        { x: startX, y: midY + 80 },
        { x: Math.round(startX + (endX - startX) * 0.3), y: midY - 70 },
        { x: Math.round(startX + (endX - startX) * 0.7), y: midY - 70 },
        { x: endX, y: midY + 80 }
      ];
    } else if (shapeType === 'arc-down') {
      newPts = [
        { x: startX, y: midY - 80 },
        { x: Math.round(startX + (endX - startX) * 0.3), y: midY + 70 },
        { x: Math.round(startX + (endX - startX) * 0.7), y: midY + 70 },
        { x: endX, y: midY - 80 }
      ];
    } else if (shapeType === 'elevated') {
      newPts = [
        { x: startX, y: midY + 60 },
        { x: Math.round(startX + (endX - startX) * 0.35), y: midY - 110 },
        { x: Math.round(startX + (endX - startX) * 0.65), y: midY + 80 },
        { x: endX, y: midY - 40 }
      ];
    }

    roadPointsRef.current = newPts;
    setRoadPointsState([...newPts]);
    setIsRoadSelected(true);
    renderRoadMesh();
    setIsRoadFinished(true);
    setMode('editing-nodes');
    updateWaypointHandles();

    // Sync all equipment along new curve
    const total = totalPathLength(newPts);
    equipmentRef.current.forEach(eq => {
      const distAlong = Math.min(total * 0.98, Math.max(total * 0.02, (eq.kmPosition / distKm) * total));
      const info = getPointAndAngleAtDistance(distAlong, newPts);
      if (eq.marker) {
        eq.marker.set({ left: info.x, top: info.y, angle: info.angle });
        eq.marker.setCoords();
      }
    });

    initTrafficParticles();
    if (onShowToast) onShowToast(`Applied ${shapeType} road curve alignment.`);
  }, [distKm, initTrafficParticles, onShowToast, renderRoadMesh, updateWaypointHandles]);

  // Shift whole road
  const handleShiftRoad = useCallback((dx, dy) => {
    if (roadPointsRef.current.length < 2) return;
    roadPointsRef.current = roadPointsRef.current.map(p => ({
      x: Math.max(20, p.x + dx),
      y: Math.max(20, p.y + dy)
    }));
    setRoadPointsState([...roadPointsRef.current]);
    renderRoadMesh();
    updateWaypointHandles();

    equipmentRef.current.forEach(eq => {
      if (eq.marker) {
        eq.marker.set({ left: eq.marker.left + dx, top: eq.marker.top + dy });
        eq.marker.setCoords();
      }
    });

    if (fabricCanvasRef.current) fabricCanvasRef.current.renderAll();
  }, [renderRoadMesh, updateWaypointHandles]);

  // Update specific node X or Y manually
  const handleUpdateNodeCoord = useCallback((idx, axis, value) => {
    if (!roadPointsRef.current[idx]) return;
    const num = parseInt(value) || 0;
    roadPointsRef.current[idx][axis] = num;
    setRoadPointsState([...roadPointsRef.current]);
    renderRoadMesh();
    updateWaypointHandles();

    equipmentRef.current.forEach(eq => {
      const info = getPointAndAngleAtDistance(eq.distAlong, roadPointsRef.current);
      if (eq.marker) {
        eq.marker.set({ left: info.x, top: info.y, angle: info.angle });
        eq.marker.setCoords();
      }
    });

    if (fabricCanvasRef.current) fabricCanvasRef.current.renderAll();
  }, [renderRoadMesh, updateWaypointHandles]);

  // Delete node
  const handleDeleteNode = useCallback((idx) => {
    if (roadPointsRef.current.length <= 2) {
      if (onShowToast) onShowToast('A road line must have at least 2 waypoint nodes.');
      return;
    }
    roadPointsRef.current.splice(idx, 1);
    setRoadPointsState([...roadPointsRef.current]);
    renderRoadMesh();
    updateWaypointHandles();
    if (onShowToast) onShowToast(`Removed waypoint node #${idx + 1}.`);
  }, [onShowToast, renderRoadMesh, updateWaypointHandles]);

  // Finish Road
  const handleFinishDraw = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (roadPointsRef.current.length < 2) {
      if (onShowToast) onShowToast('Please click at least 2 points on the grid to create a road corridor.');
      return;
    }

    if (previewLineRef.current) {
      c.remove(previewLineRef.current);
      previewLineRef.current = null;
    }

    renderRoadMesh();
    setMode('idle');
    setIsRoadFinished(true);
    updateWaypointHandles();
    initTrafficParticles();

    if (c) {
      c.defaultCursor = 'default';
      c.renderAll();
    }

    if (onShowToast) onShowToast('Highway corridor generated! Click any hardware icon in the left palette to place equipment.');
  }, [initTrafficParticles, onShowToast, renderRoadMesh, updateWaypointHandles]);

  // Load Preset
  const handleLoadPreset = useCallback((preset) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    c.clear();

    setLocName(preset.name);
    setDistKm(preset.distKm);
    setDirection(preset.direction);
    setNumLanes(preset.lanes || 3);
    setSpeedLimit(preset.speedLimit || 90);

    roadPointsRef.current = [...preset.points];
    equipmentRef.current = [];
    setEquipmentList([]);
    setSelectedEqId(null);

    renderRoadMesh();
    setIsRoadFinished(true);
    setMode('idle');

    if (c) {
      c.defaultCursor = 'default';
    }

    const total = totalPathLength(preset.points);

    (preset.equipment || []).forEach(eq => {
      const distAlong = (eq.km / preset.distKm) * total;
      const ptInfo = getPointAndAngleAtDistance(distAlong, preset.points);
      placeEquipmentMarker(eq.type, ptInfo.x, ptInfo.y, distAlong, eq.label);
    });

    initTrafficParticles();
    if (onShowToast) onShowToast(`Loaded preset: ${preset.name}`);
  }, [initTrafficParticles, onShowToast, placeEquipmentMarker, renderRoadMesh]);

  // Reset
  const handleReset = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (c) c.clear();

    roadPointsRef.current = [];
    waypointHandlesRef.current = [];
    previewLineRef.current = null;
    roadMeshObjectsRef.current = [];
    kmMarkerObjectsRef.current = [];
    equipmentRef.current = [];
    trafficVehiclesRef.current = [];
    setEquipmentList([]);
    setSelectedEqId(null);
    setMode('idle');
    setArmedType(null);
    setIsRoadFinished(false);

    if (c) {
      c.defaultCursor = 'default';
      c.renderAll();
    }

    if (onShowToast) onShowToast('CAD canvas cleared. Click "Draw New Path" or click on the grid to start drawing.');
  }, [onShowToast]);

  // Zoom Controls
  const handleZoom = useCallback((delta) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    let newZoom = Math.min(2.5, Math.max(0.4, zoomLevel + delta));
    setZoomLevel(newZoom);
    c.setZoom(newZoom);
    c.renderAll();
  }, [zoomLevel]);

  const handleResetZoom = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    setZoomLevel(1);
    c.setZoom(1);
    c.absolutePan(new fabric.Point(0, 0));
    c.renderAll();
  }, []);

  // Update cursor when mode changes
  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (mode === 'drawing' || mode === 'placing') {
      c.defaultCursor = 'crosshair';
    } else if (mode === 'editing-nodes') {
      c.defaultCursor = 'grab';
    } else {
      c.defaultCursor = 'default';
    }
  }, [mode]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (err) {
        console.warn('Dispose error', err);
      }
      fabricCanvasRef.current = null;
    }

    const canvasEl = canvasRef.current;
    if (canvasEl.__fabric) {
      try {
        canvasEl.__fabric.dispose();
      } catch (err) {
        console.warn('Dispose error', err);
      }
    }

    let c = null;
    try {
      c = new fabric.Canvas(canvasEl, {
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: 'transparent'
      });
      canvasEl.__fabric = c;
      fabricCanvasRef.current = c;
    } catch (err) {
      console.warn('Fabric init error:', err);
      return;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Robust pointer extraction across Fabric versions
    const getPointerCoord = (opt) => {
      if (opt.scenePoint) return { x: opt.scenePoint.x, y: opt.scenePoint.y };
      if (opt.viewportPoint) return { x: opt.viewportPoint.x, y: opt.viewportPoint.y };
      if (opt.absolutePointer) return { x: opt.absolutePointer.x, y: opt.absolutePointer.y };
      if (opt.pointer) return { x: opt.pointer.x, y: opt.pointer.y };
      if (c && typeof c.getScenePoint === 'function' && opt.e) return c.getScenePoint(opt.e);
      if (c && typeof c.getPointer === 'function' && opt.e) return c.getPointer(opt.e);
      if (opt.e && typeof opt.e.offsetX === 'number') return { x: opt.e.offsetX, y: opt.e.offsetY };
      return { x: 100, y: 100 };
    };

    c.on('mouse:move', (opt) => {
      const p = getPointerCoord(opt);
      const proj = projectToPolyline(p.x, p.y, roadPointsRef.current);
      setHudCoord({
        x: Math.round(p.x),
        y: Math.round(p.y),
        km: proj ? kmAt(proj.distAlong) : 0,
        angle: proj ? Math.round(proj.angle) : 0
      });
    });

    c.on('mouse:down', (opt) => {
      if (!c) return;
      const p = getPointerCoord(opt);
      const curMode = modeRef.current;
      const curArmed = armedTypeRef.current;

      // 1. Drawing Mode: add point
      if (curMode === 'drawing') {
        if (opt.target && opt.target.dataNodeIdx !== undefined) return;
        roadPointsRef.current.push({ x: p.x, y: p.y });
        redrawPreviewLine();
        updateWaypointHandles();
        return;
      }

      // 2. Direct click on empty canvas starts drawing mode immediately
      if (curMode === 'idle' && roadPointsRef.current.length === 0) {
        setMode('drawing');
        roadPointsRef.current = [{ x: p.x, y: p.y }];
        redrawPreviewLine();
        updateWaypointHandles();
        return;
      }

      // 3. Placing Equipment Mode: place at exact clicked point on or outside road
      if (curMode === 'placing' && curArmed) {
        if (opt.target && opt.target.data) return;
        if (roadPointsRef.current.length < 2) return;
        const proj = projectToPolyline(p.x, p.y, roadPointsRef.current);
        const distAlong = proj ? proj.distAlong : 0;
        placeEquipmentMarker(curArmed, p.x, p.y, distAlong);
      }
    });

    c.on('object:moving', (opt) => {
      const target = opt.target;
      if (!target) return;

      // 1. Waypoint node handle moving
      if (target.dataNodeIdx !== undefined) {
        const idx = target.dataNodeIdx;
        roadPointsRef.current[idx] = { x: target.left, y: target.top };
        if (modeRef.current === 'drawing') {
          redrawPreviewLine();
        } else {
          renderRoadMesh();
          equipmentRef.current.forEach(eq => {
            if (eq.marker) {
              const proj = projectToPolyline(eq.marker.left, eq.marker.top, roadPointsRef.current);
              if (proj) {
                eq.distAlong = proj.distAlong;
                eq.marker.data.distAlong = proj.distAlong;
              }
              if (typeof c.bringObjectToFront === 'function') {
                c.bringObjectToFront(eq.marker);
              }
              eq.marker.setCoords();
            }
          });
          syncEquipmentState();
        }
        c.renderAll();
        return;
      }

      // 2. Equipment marker moving freely anywhere on grid
      if (target.data && target.data.id) {
        const proj = projectToPolyline(target.left, target.top, roadPointsRef.current);
        if (proj) {
          target.angle = proj.angle;
          target.data.distAlong = proj.distAlong;
          target.data.customX = target.left;
          target.data.customY = target.top;
        }
        target.setCoords();
        syncEquipmentState();
        c.renderAll();
      }
    });

    c.on('mouse:dblclick', () => {
      if (modeRef.current === 'drawing' && roadPointsRef.current.length >= 2) {
        handleFinishDraw();
      }
    });

    const initTimer = setTimeout(() => {
      resizeCanvas();
      if (initialLoc && initialLoc.roadPath && initialLoc.roadPath.length >= 2) {
        roadPointsRef.current = [...initialLoc.roadPath];
        renderRoadMesh();
        setIsRoadFinished(true);

        const total = totalPathLength(initialLoc.roadPath);
        if (initialLoc.equipmentList && initialLoc.equipmentList.length > 0) {
          initialLoc.equipmentList.forEach(eq => {
            const distAlong = (eq.kmPosition / distKm) * total;
            const pt = getPointAndAngleAtDistance(distAlong, initialLoc.roadPath);
            placeEquipmentMarker(eq.type, pt.x, pt.y, distAlong, eq.label || `${eq.type} ${eq.kmPosition}`);
          });
        }
        initTrafficParticles();
      } else {
        handleLoadPreset(PRESET_TEMPLATES[0]);
      }
    }, 150);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (err) {
          console.warn('Dispose error', err);
        }
        fabricCanvasRef.current = null;
      }
      if (canvasEl) {
        delete canvasEl.__fabric;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Live 60 FPS Traffic Simulation Animation Loop
  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    let vehicleFabricObjects = [];

    const animateTraffic = () => {
      if (simActive && showTrafficParticles && roadPointsRef.current.length >= 2) {
        const totalLen = totalPathLength(roadPointsRef.current);
        const pts = roadPointsRef.current;

        vehicleFabricObjects.forEach(obj => c.remove(obj));
        vehicleFabricObjects = [];

        trafficVehiclesRef.current.forEach(v => {
          v.distAlong = (v.distAlong + v.speed * simSpeed) % totalLen;

          const info = getPointAndAngleAtDistance(v.distAlong, pts);
          const rad = (info.angle * Math.PI) / 180;
          const perpRad = rad + Math.PI / 2;

          const laneOffsetPx = (v.lane - 0.5) * 13;
          const posX = info.x + Math.cos(perpRad) * laneOffsetPx;
          const posY = info.y + Math.sin(perpRad) * laneOffsetPx;

          const carBody = new fabric.Rect({
            left: posX,
            top: posY,
            width: v.length,
            height: v.width,
            fill: v.color,
            stroke: '#0F172A',
            strokeWidth: 1,
            rx: 2,
            ry: 2,
            angle: info.angle,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 4, offsetX: 1, offsetY: 2 })
          });

          c.add(carBody);
          vehicleFabricObjects.push(carBody);
        });

        c.renderAll();
      }

      animationFrameRef.current = requestAnimationFrame(animateTraffic);
    };

    animationFrameRef.current = requestAnimationFrame(animateTraffic);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      vehicleFabricObjects.forEach(obj => {
        if (c) c.remove(obj);
      });
    };
  }, [simActive, simSpeed, showTrafficParticles]);

  const buildLayoutObject = useCallback(() => {
    const totalDist = parseFloat(distKm) || 0;
    const sortedEq = [...equipmentList].sort((a, b) => a.km - b.km);

    const rawEquipmentList = sortedEq.map((e) => ({
      id: e.id,
      type: e.type,
      label: e.label,
      kmPosition: parseFloat(e.km.toFixed(2))
    }));

    const lcsItems = sortedEq
      .filter((e) => e.type === 'LCS')
      .map((e) => ({ km: `KM${e.km.toFixed(1)}NB`, open: false }));

    const vmsItems = sortedEq
      .filter((e) => e.type === 'VMS')
      .map((e, idx) => ({
        id: `vms-${idx + 1}`,
        type: idx === 0 ? 'Entry VMS (Buka)' : 'Exit VMS (Tutup)',
        km: `KM${e.km.toFixed(1)}NB`,
        position: idx === 0 ? 'Entry' : 'Exit',
        status: 'Good',
        msg: idx === 0 ? 'SMARTLANE BERMULA' : 'SMARTLANE TAMAT',
        msg2: idx === 0 ? 'MULA GUNAKAN LORONG KECEMASAN' : 'MASUK KEMBALI KE LORONG UTAMA'
      }));

    const miniVmsItems = sortedEq
      .filter((e) => e.type === 'MINI_VMS' || (e.type === 'VMS' && vmsItems.length > 2))
      .map((e, idx) => ({
        id: `mvms-${idx + 1}`,
        type: 'Mini VMS',
        km: `KM${e.km.toFixed(1)}NB`,
        position: 'Intermediate',
        status: 'Good',
        msg: 'PATUHI HAD LAJU',
        msg2: '60 KM/J DI LORONG KECEMASAN'
      }));

    const cctvList = sortedEq
      .filter((e) => e.type === 'CCTV')
      .map((e) => `KM${e.km.toFixed(1)}NB`);

    const gantries = sortedEq.map((e) => ({
      km: `KM${e.km.toFixed(1)}NB`,
      type: e.type,
      status: 'ok'
    }));

    return {
      id: initialLoc ? initialLoc.id : `loc-${Date.now().toString(36)}`,
      name: locName || 'Smartlane Custom Segment',
      locationName: locName || 'Smartlane Custom Segment',
      direction: direction,
      distKm: totalDist,
      distanceKm: totalDist,
      numLanes: numLanes,
      speedLimit: speedLimit,
      roadPath: roadPointsRef.current.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      equipmentList: rawEquipmentList,
      equipment: {
        cctv: [cctvList.length, cctvList.length],
        avds: [sortedEq.filter(e => e.type === 'AVDS').length, sortedEq.filter(e => e.type === 'AVDS').length],
        lcs: [lcsItems.length, lcsItems.length],
        vms: [vmsItems.length, vmsItems.length],
        miniVms: [miniVmsItems.length, miniVmsItems.length]
      },
      gantries: gantries.length > 0 ? gantries : (initialLoc ? initialLoc.gantries : []),
      lcs: lcsItems.length > 0 ? lcsItems : (initialLoc ? initialLoc.lcs : [{ km: 'KM1.0NB', open: false }]),
      vms: vmsItems.length > 0 ? vmsItems : (initialLoc ? initialLoc.vms : []),
      miniVms: miniVmsItems,
      cctv: cctvList.length > 0 ? cctvList : (initialLoc ? initialLoc.cctv : []),
      traffic: sortedEq.map((e) => ({
        km: `KM${e.km.toFixed(1)}NB`,
        spd: 80,
        vol: 45,
        occ: 15
      })),
      status: initialLoc ? initialLoc.status : 'inactive',
      mode: initialLoc ? initialLoc.mode : 'scheduled',
      phase: initialLoc ? initialLoc.phase : 0,
      phaseLabel: initialLoc ? initialLoc.phaseLabel : 'Standby',
      elapsedSeconds: 0,
      ps: '—',
      pe: '—',
      los: 'A',
      trafficFlow: 'Normal',
      incidents: 0,
      thresholdArmed: true,
      nextRun: 'Scheduled',
      alarms: initialLoc ? initialLoc.alarms : []
    };
  }, [distKm, direction, equipmentList, initialLoc, locName, numLanes, speedLimit]);

  const handleSave = () => {
    if (roadPointsRef.current.length < 2) {
      if (onShowToast) onShowToast('Please draw and finish a road corridor before saving.');
      return;
    }
    const layoutObj = buildLayoutObject();
    if (onSaveLayout) {
      onSaveLayout(layoutObj);
    }
    if (onShowToast) {
      onShowToast(`Highway layout saved for ${locName} (${equipmentList.length} equipment devices deployed).`);
    }
  };

  const handleDownloadJson = () => {
    const layoutObj = buildLayoutObject();
    const jsonStr = JSON.stringify(layoutObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartlane-cad-${(locName || 'corridor').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Downloaded CAD JSON specification.');
  };

  const selectedEquipmentItem = equipmentList.find(e => e.id === selectedEqId);

  return (
    <div className="layout-designer-app">
      {/* ── TOP STUDIO COMMAND BAR (48px) ─────────────────────────── */}
      <div className="designer-topbar">
        <div className="designer-brand">
          <div className="brand-logo-icon">🛣️</div>
          <div className="brand-titles">
            <div className="brand-main">SMARTLANE CAD STUDIO</div>
            <div className="brand-sub">HIGHWAY ITS GEOMETRY &amp; HARDWARE DESIGNER</div>
          </div>
        </div>

        {/* Center Live Telemetry Badge */}
        <div className="topbar-center-status">
          <div className="status-metric">
            <span className="lbl">CORRIDOR:</span>
            <span className="val">{locName}</span>
          </div>
          <div className="status-divider"></div>
          <div className="status-metric">
            <span className="lbl">CHAINAGE:</span>
            <span className="val">{distKm} KM</span>
          </div>
          <div className="status-divider"></div>
          <div className="status-metric">
            <span className="lbl">SAFETY:</span>
            <span className={`val ${safetyAudit.score >= 80 ? 'good' : 'warn'}`}>
              {safetyAudit.score}%
            </span>
          </div>
        </div>

        <div className="topbar-actions">
          <button className="designer-tool-btn glow-save" onClick={handleSave}>
            💾 Save Layout
          </button>
          <button className="designer-tool-btn json-btn-top" onClick={() => setShowJsonModal(true)}>
            📋 JSON
          </button>
          {onClose && (
            <button className="designer-close-btn" onClick={onClose} title="Exit Designer">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── MAIN 3-PANEL WORKSPACE (100% HEIGHT UTILIZATION) ──────── */}
      <div className="designer-main">

        {/* ── LEFT PANEL: CONFIG, GEOMETRY, PALETTE & LAYERS ────────── */}
        <div className="designer-panel designer-panel-left">
          
          {/* Section 1: Corridor Parameters */}
          <div className="panel-section-rich">
            <div className="section-title-rich">
              <span className="num-badge">1</span>
              <span>Corridor Setup</span>
            </div>
            
            <div className="form-group-rich">
              <label className="field-label-rich">Corridor Name</label>
              <input
                type="text"
                value={locName}
                onChange={(e) => setLocName(e.target.value)}
                placeholder="e.g. PLUS Standard Smartlane"
                className="designer-input-rich"
              />
            </div>

            <div className="form-row-2-rich">
              <div className="form-group-rich">
                <label className="field-label-rich">Length (KM)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="50"
                  value={distKm}
                  onChange={(e) => setDistKm(parseFloat(e.target.value) || 0)}
                  className="designer-input-rich"
                />
              </div>
              <div className="form-group-rich">
                <label className="field-label-rich">Direction</label>
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="designer-select-rich"
                >
                  <option>Northbound</option>
                  <option>Southbound</option>
                  <option>Eastbound</option>
                  <option>Westbound</option>
                </select>
              </div>
            </div>

            <div className="form-row-2-rich">
              <div className="form-group-rich">
                <label className="field-label-rich">Mainline Lanes</label>
                <div className="lane-selector-rich">
                  {[2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      className={`lane-btn-rich ${numLanes === n ? 'active' : ''}`}
                      onClick={() => setNumLanes(n)}
                    >
                      {n}L
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group-rich">
                <label className="field-label-rich">Speed Limit</label>
                <select
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(parseInt(e.target.value) || 90)}
                  className="designer-select-rich"
                >
                  <option value={60}>60 km/h</option>
                  <option value={80}>80 km/h</option>
                  <option value={90}>90 km/h</option>
                  <option value={110}>110 km/h</option>
                </select>
              </div>
            </div>

            <div className="form-group-rich" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <label className="field-label-rich" style={{ margin: 0 }}>Road Width / Asphalt Scale</label>
                <span style={{ fontSize: '10.5px', color: '#38BDF8', fontFamily: 'monospace', fontWeight: 800 }}>
                  {Math.round(roadWidthScale * 100)}% ({Math.round(numLanes * 14 * roadWidthScale + 16 * roadWidthScale + 10)}px)
                </span>
              </div>
              <input
                type="range"
                min="0.7"
                max="1.6"
                step="0.05"
                value={roadWidthScale}
                onChange={(e) => setRoadWidthScale(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer', height: '6px' }}
                title="Adjust asphalt road thickness / visual scale"
              />
            </div>

            <div className="shoulder-status-banner">
              <span className="dot-green"></span>
              <span className="shoulder-txt">SmartLane Dynamic Shoulder Activated</span>
            </div>
          </div>

          {/* Section 2: Road Alignment & Path */}
          <div className="panel-section-rich">
            <div className="section-title-rich">
              <span className="num-badge">2</span>
              <span>Road Geometry</span>
              {mode === 'editing-nodes' && <span className="arming-tag" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', borderColor: '#F59E0B' }}>Drag Yellow Nodes</span>}
            </div>

            <div className="draw-buttons-deck">
              <button
                className={`cad-btn-main ${mode === 'drawing' ? 'active-pulse' : ''}`}
                onClick={handleStartDraw}
              >
                ✏️ Draw New Path
              </button>
              <button
                className="cad-btn-main finish"
                onClick={handleFinishDraw}
                disabled={mode !== 'drawing' && roadPointsRef.current.length < 2}
              >
                ✅ Finish Road
              </button>
            </div>

            <div className="draw-sub-actions">
              <button
                className={`sub-action-chip ${isRoadSelected ? 'active' : ''}`}
                onClick={handleSelectRoad}
                disabled={!isRoadFinished}
                title="Select road and open manual coordinate inspector"
              >
                🖱️ Select Road
              </button>
              <button
                className={`sub-action-chip ${mode === 'editing-nodes' ? 'active' : ''}`}
                onClick={() => {
                  setMode(mode === 'editing-nodes' ? 'idle' : 'editing-nodes');
                }}
                disabled={!isRoadFinished}
                title="Click to show draggable vertex handles on the road curve"
              >
                📐 Adjust Nodes
              </button>
              <button
                className="sub-action-chip"
                onClick={handleAddCurvePoint}
                disabled={!isRoadFinished}
                title="Add a new bending point along the road curve"
              >
                ➕ Add Point
              </button>
              <button
                className="sub-action-chip"
                onClick={handleReverseDirection}
                disabled={!isRoadFinished}
                title="Reverse alignment direction"
              >
                🔄 Flip Dir
              </button>
            </div>

            {/* Quick Road Alignment Curvatures */}
            {isRoadFinished && (
              <div className="quick-curves-box" style={{ marginTop: '8px', padding: '8px', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(51, 65, 85, 0.6)', borderRadius: '8px' }}>
                <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Manual Curve Shapes</span>
                  <span style={{ color: '#38BDF8' }}>1-Click Shape</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '6px' }}>
                  <button className="curve-shape-btn" onClick={() => handleApplyCurveShape('straight')} title="Straight Line">
                    <span style={{ fontSize: '12px' }}>─</span>
                    <small style={{ fontSize: '8px' }}>Flat</small>
                  </button>
                  <button className="curve-shape-btn" onClick={() => handleApplyCurveShape('scurve')} title="S-Curve Expressway">
                    <span style={{ fontSize: '12px' }}>〰</span>
                    <small style={{ fontSize: '8px' }}>S-Curve</small>
                  </button>
                  <button className="curve-shape-btn" onClick={() => handleApplyCurveShape('arc-up')} title="Arc Curve Left / Up">
                    <span style={{ fontSize: '12px' }}>╭─</span>
                    <small style={{ fontSize: '8px' }}>Arc ↑</small>
                  </button>
                  <button className="curve-shape-btn" onClick={() => handleApplyCurveShape('arc-down')} title="Arc Curve Right / Down">
                    <span style={{ fontSize: '12px' }}>╰─</span>
                    <small style={{ fontSize: '8px' }}>Arc ↓</small>
                  </button>
                  <button className="curve-shape-btn" onClick={() => handleApplyCurveShape('elevated')} title="Elevated Flyover Wave">
                    <span style={{ fontSize: '12px' }}>〜</span>
                    <small style={{ fontSize: '8px' }}>Wave</small>
                  </button>
                </div>

                {/* Move Whole Road D-Pad */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(51, 65, 85, 0.5)', paddingTop: '5px' }}>
                  <span style={{ fontSize: '9.5px', color: '#64748B' }}>Shift Entire Road:</span>
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <button className="shift-dpad-btn" onClick={() => handleShiftRoad(-25, 0)} title="Shift Left 25px">◀</button>
                    <button className="shift-dpad-btn" onClick={() => handleShiftRoad(25, 0)} title="Shift Right 25px">▶</button>
                    <button className="shift-dpad-btn" onClick={() => handleShiftRoad(0, -25)} title="Shift Up 25px">▲</button>
                    <button className="shift-dpad-btn" onClick={() => handleShiftRoad(0, 25)} title="Shift Down 25px">▼</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: ITS Equipment Palette */}
          <div className="panel-section-rich palette-fill-section">
            <div className="section-title-rich">
              <span className="num-badge">3</span>
              <span>ITS Equipment Palette</span>
              {mode === 'placing' && <span className="arming-tag">Click Road</span>}
            </div>

            <div className="palette-grid-rich">
              {Object.entries(EQUIPMENT_TYPES).map(([typeKey, eq]) => {
                const isArmed = armedType === typeKey && mode === 'placing';
                const placedCount = equipmentList.filter(e => e.type === typeKey).length;
                return (
                  <button
                    key={typeKey}
                    className={`pal-card-rich ${isArmed ? 'armed' : ''}`}
                    disabled={!isRoadFinished}
                    onClick={() => {
                      if (!isRoadFinished) return;
                      if (armedType === typeKey) {
                        setArmedType(null);
                        setMode('idle');
                      } else {
                        setArmedType(typeKey);
                        setMode('placing');
                        if (onShowToast) onShowToast(`Click road curve to place ${eq.label}.`);
                      }
                    }}
                    title={`${eq.label} - ${eq.desc}`}
                  >
                    <div className="pal-icon-rich" style={{ background: eq.color }}>
                      {eq.icon}
                    </div>
                    <div className="pal-info-rich">
                      <span className="pal-title-rich">{eq.label}</span>
                      <span className="pal-cat-rich">{eq.category}</span>
                    </div>
                    {placedCount > 0 && (
                      <span className="pal-count-badge" style={{ borderColor: eq.color }}>
                        {placedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: CAD Display Layers */}
          <div className="panel-section-rich layers-section">
            <div className="section-title-rich">
              <span className="num-badge">4</span>
              <span>CAD Layers</span>
            </div>

            <div className="layers-grid">
              <button
                className={`layer-chip ${showFovCones ? 'active' : ''}`}
                onClick={() => setShowFovCones(!showFovCones)}
              >
                <span>📡</span> Sensor FOV Cones
              </button>
              <button
                className={`layer-chip ${showTrafficParticles ? 'active' : ''}`}
                onClick={() => setShowTrafficParticles(!showTrafficParticles)}
              >
                <span>🚗</span> Live Traffic Flow
              </button>
              <button
                className={`layer-chip ${showKmMarkers ? 'active' : ''}`}
                onClick={() => {
                  setShowKmMarkers(!showKmMarkers);
                  renderRoadMesh();
                }}
              >
                <span>📏</span> KM Station Ticks
              </button>
            </div>
          </div>

          {/* Footer Utilities */}
          <div className="panel-footer-rich">
            <button className="util-btn-rich" onClick={() => setActiveTabSide('presets')}>
              📚 Presets Library
            </button>
            <button className="util-btn-rich danger" onClick={handleReset}>
              🗑️ Clear Canvas
            </button>
          </div>
        </div>

        {/* ── CENTER PANEL: INTERACTIVE CAD CANVAS ─────────────────── */}
        <div className="designer-panel designer-panel-center">
          
          {/* Canvas Floating Top Toolbar */}
          <div className="canvas-hud-bar">
            <div className="hud-left">
              <span className="hud-badge mode-indicator">
                {mode === 'drawing' ? '✏️ PLOTTING WAYPOINTS' :
                 mode === 'placing' ? `📍 DROP ${armedType}` :
                 mode === 'editing-nodes' ? '📐 DRAGGING CURVE NODES' :
                 isRoadFinished ? '⚡ READY' : 'IDLE'}
              </span>
              <span className="hud-info">
                {equipmentList.length} Devices · {distKm} KM · {speedLimit} km/h
              </span>
            </div>

            {/* Viewport Zoom & Grid Controls */}
            <div className="hud-center-controls">
              <div className="zoom-pill">
                <button onClick={() => handleZoom(-0.15)} title="Zoom Out">−</button>
                <span>{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => handleZoom(0.15)} title="Zoom In">+</button>
                <button onClick={handleResetZoom} title="Reset Zoom">1:1</button>
              </div>

              {/* Grid Selector */}
              <div className="grid-switcher">
                <button
                  className={gridTheme === 'dark-grid' ? 'active' : ''}
                  onClick={() => setGridTheme('dark-grid')}
                  title="Dark Cyber Grid"
                >
                  ▦
                </button>
                <button
                  className={gridTheme === 'blueprint' ? 'active' : ''}
                  onClick={() => setGridTheme('blueprint')}
                  title="Blueprint CAD"
                >
                  📐
                </button>
                <button
                  className={gridTheme === 'asphalt' ? 'active' : ''}
                  onClick={() => setGridTheme('asphalt')}
                  title="Asphalt Texture"
                >
                  🛣️
                </button>
                <button
                  className={gridTheme === 'dots' ? 'active' : ''}
                  onClick={() => setGridTheme('dots')}
                  title="Dot Matrix"
                >
                  ⁝⁝
                </button>
              </div>

              <button
                className={`fov-toggle-btn ${showFovCones ? 'active' : ''}`}
                onClick={() => setShowFovCones(!showFovCones)}
                title="Toggle Sensor FOV Cones"
              >
                📡 FOV
              </button>
            </div>

            {/* Live Telemetry Pill */}
            <div className="hud-right-telemetry">
              <span>KM: <b>{hudCoord.km.toFixed(2)}</b></span>
              <span>∠ <b>{hudCoord.angle}°</b></span>
            </div>
          </div>

          {/* Canvas Viewport Stage (100% Height) */}
          <div className={`canvas-stage-wrapper ${gridTheme}`} ref={containerRef}>
            <canvas ref={canvasRef} id="layoutCanvas"></canvas>

            {/* Non-blocking Drawing Mode Guide Banner */}
            {mode === 'drawing' && (
              <div className="canvas-drawing-guide-pill">
                <span>✏️ <b>DRAWING MODE ACTIVE:</b> Click anywhere on the grid to place highway curve points ({roadPointsRef.current.length} placed). Double-click or click "Finish Road" when done.</span>
                <button className="finish-guide-btn" onClick={handleFinishDraw}>
                  ✅ Finish Road
                </button>
              </div>
            )}

            {/* Non-blocking Adjust Nodes Mode Guide Banner */}
            {mode === 'editing-nodes' && (
              <div className="canvas-editing-guide-pill">
                <span>📐 <b>ADJUST NODES ACTIVE:</b> Click & drag any circular vertex node on the road line to reshape the curve.</span>
                <button className="finish-guide-btn" onClick={() => setMode('idle')}>
                  ✓ Done Adjusting
                </button>
              </div>
            )}

            {/* Non-blocking Placing Mode Guide Banner */}
            {mode === 'placing' && armedType && (
              <div className="canvas-placing-guide-pill">
                <span>📍 <b>PLACING {EQUIPMENT_TYPES[armedType]?.label?.toUpperCase()}:</b> Click anywhere along the highway curve to drop the equipment device.</span>
                <button className="cancel-guide-btn" onClick={() => { setArmedType(null); setMode('idle'); }}>
                  ✕ Cancel
                </button>
              </div>
            )}
          </div>

          {/* Canvas Bottom Simulation Bar */}
          {isRoadFinished && (
            <div className="canvas-sim-bar">
              <div className="sim-ctrl-group">
                <button
                  className={`sim-play-btn ${simActive ? 'playing' : 'paused'}`}
                  onClick={() => setSimActive(!simActive)}
                >
                  {simActive ? '⏸ Traffic' : '▶ Play'}
                </button>
                
                <div className="sim-speed-wrap">
                  <span className="lbl">Speed:</span>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.25"
                    value={simSpeed}
                    onChange={(e) => setSimSpeed(parseFloat(e.target.value))}
                    className="sim-slider"
                  />
                  <span className="speed-val">{simSpeed}x</span>
                </div>

                <div className="sim-density-group">
                  {['light', 'moderate', 'heavy'].map(d => (
                    <button
                      key={d}
                      className={`density-chip ${simDensity === d ? 'active' : ''}`}
                      onClick={() => setSimDensity(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="sim-smartlane-toggle">
                  <label>
                    <input
                      type="checkbox"
                      checked={smartLaneOpenInSim}
                      onChange={(e) => setSmartLaneOpenInSim(e.target.checked)}
                    />
                    <span>SmartLane Active</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: HARDWARE, INSPECTOR, SAFETY & PRESETS ────── */}
        <div className="designer-panel designer-panel-right">
          
          {/* Sub-tabs Header */}
          <div className="right-panel-tabs-rich">
            <button
              className={`rp-tab-btn-rich ${activeTabSide === 'hardware' ? 'active' : ''}`}
              onClick={() => setActiveTabSide('hardware')}
            >
              📋 Hardware ({equipmentList.length})
            </button>
            <button
              className={`rp-tab-btn-rich ${activeTabSide === 'inspector' ? 'active' : ''}`}
              onClick={() => setActiveTabSide('inspector')}
            >
              🔍 Inspector
            </button>
            <button
              className={`rp-tab-btn-rich ${activeTabSide === 'safety' ? 'active' : ''}`}
              onClick={() => setActiveTabSide('safety')}
            >
              🛡️ Safety ({safetyAudit.score}%)
            </button>
            <button
              className={`rp-tab-btn-rich ${activeTabSide === 'presets' ? 'active' : ''}`}
              onClick={() => setActiveTabSide('presets')}
            >
              📚 Presets
            </button>
          </div>

          {/* TAB 1: COMPLETE DEPLOYED HARDWARE LIST */}
          {activeTabSide === 'hardware' && (
            <div className="hardware-tab-container-rich">
              
              {/* Corridor ITS Overview Card */}
              <div className="its-overview-card-rich">
                <div className="overview-header-row">
                  <div className="its-score-badge">
                    <span className="score-num">{safetyAudit.score}%</span>
                    <span className="score-lbl">ITS Health</span>
                  </div>
                  <div className="its-score-summary">
                    <div className="score-title">Corridor Compliance</div>
                    <div className="score-desc">
                      {safetyAudit.score === 100
                        ? 'All ITS spacing & redundancy criteria satisfied.'
                        : 'Review recommendations in Safety Audit tab.'}
                    </div>
                  </div>
                </div>

                {/* Device Distribution Tally */}
                <div className="device-tally-deck">
                  <div className="tally-chip">📹 CCTV <b>{safetyAudit.counts.cctv}</b></div>
                  <div className="tally-chip">📡 AVDS <b>{safetyAudit.counts.avds}</b></div>
                  <div className="tally-chip">🚥 LCS <b>{safetyAudit.counts.lcs}</b></div>
                  <div className="tally-chip">📺 VMS <b>{safetyAudit.counts.vms}</b></div>
                  <div className="tally-chip">📱 MVMS <b>{safetyAudit.counts.miniVms}</b></div>
                  <div className="tally-chip">🆘 SOS <b>{safetyAudit.counts.sos}</b></div>
                </div>
              </div>

              {/* Roster Header */}
              <div className="roster-section-header">
                <span>DEPLOYED DEVICES ({equipmentList.length})</span>
                <span className="sub">Sorted by Chainage KM</span>
              </div>

              {/* Full Equipment List */}
              <div className="hardware-list-rich">
                {equipmentList.length === 0 ? (
                  <div className="roster-empty-rich">
                    <div className="empty-roster-icon">📍</div>
                    <p>No equipment placed yet.</p>
                    <small>Select an item from the ITS Palette on the left, then click on the road curve to place it.</small>
                  </div>
                ) : (
                  equipmentList.map((item, idx) => {
                    const meta = EQUIPMENT_TYPES[item.type] || EQUIPMENT_TYPES.CCTV;
                    const isSelected = selectedEqId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`hardware-card-rich ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedEqId(item.id);
                          setActiveTabSide('inspector');
                        }}
                      >
                        <span className="card-index">#{idx + 1}</span>
                        <div className="card-badge" style={{ background: meta.color }}>
                          {meta.icon}
                        </div>
                        <div className="card-info">
                          <div className="card-name-row">
                            <span className="card-name">{item.label}</span>
                            <span className="card-km">KM {item.km.toFixed(2)}</span>
                          </div>
                          <div className="card-meta-row">
                            <span className="status-live-dot">● Online</span>
                            <span className="card-type-tag">{item.type}</span>
                            <span className="card-cat-tag">{meta.category}</span>
                          </div>
                        </div>
                        <button
                          className="card-del-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeEquipmentMarker(item.id);
                          }}
                          title="Remove device"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom Quick Action Deck */}
              <div className="hardware-bottom-deck">
                <button className="deck-action-btn primary" onClick={handleSave}>
                  💾 Apply &amp; Save Layout
                </button>
                <button className="deck-action-btn" onClick={handleDownloadJson}>
                  📥 Export Spec (.json)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EQUIPMENT PROPERTY INSPECTOR */}
          {activeTabSide === 'inspector' && (
            <div className="inspector-tab-rich">
              {selectedEquipmentItem ? (
                <div className="inspector-panel-rich">
                  <div className="insp-hero-card">
                    <div className="insp-icon-box" style={{ background: (EQUIPMENT_TYPES[selectedEquipmentItem.type] || EQUIPMENT_TYPES.CCTV).color }}>
                      {(EQUIPMENT_TYPES[selectedEquipmentItem.type] || EQUIPMENT_TYPES.CCTV).icon}
                    </div>
                    <div className="insp-title-box">
                      <div className="insp-device-name">{(EQUIPMENT_TYPES[selectedEquipmentItem.type] || EQUIPMENT_TYPES.CCTV).label}</div>
                      <div className="insp-device-id">{selectedEquipmentItem.id}</div>
                    </div>
                  </div>

                  <div className="insp-form-section">
                    <label className="field-label-rich">Custom Device Label</label>
                    <input
                      type="text"
                      value={selectedEquipmentItem.label}
                      onChange={(e) => {
                        const newLabel = e.target.value;
                        const match = equipmentRef.current.find(eq => eq.id === selectedEquipmentItem.id);
                        if (match) {
                          match.label = newLabel;
                          syncEquipmentState();
                        }
                      }}
                      className="designer-input-rich"
                    />
                  </div>

                  <div className="insp-form-section">
                    <label className="field-label-rich">Chainage Station (KM)</label>
                    <div className="chainage-km-box">
                      <span>KM</span>
                      <b>{selectedEquipmentItem.km.toFixed(2)}</b>
                      <span className="chainage-dir">{direction}</span>
                    </div>
                    <small className="hint-txt">Drag the device marker on the canvas curve to dynamically adjust its KM position.</small>
                  </div>

                  <div className="insp-specs-table">
                    <div className="spec-item">
                      <span className="spec-k">Operational Status</span>
                      <span className="spec-v good">● Active · 100% Signal</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-k">Hardware IP</span>
                      <span className="spec-v mono">10.180.4.{Math.floor(20 + selectedEquipmentItem.km * 5)}</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-k">Telemetry Rate</span>
                      <span className="spec-v">1000 ms (Real-time)</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-k">FOV Sensor Arc</span>
                      <span className="spec-v">{(EQUIPMENT_TYPES[selectedEquipmentItem.type] || EQUIPMENT_TYPES.CCTV).sensorAngle}° Range</span>
                    </div>
                  </div>

                  <div className="insp-action-deck">
                    <button
                      className="insp-delete-btn"
                      onClick={() => removeEquipmentMarker(selectedEquipmentItem.id)}
                    >
                      🗑️ Delete Device Marker
                    </button>
                  </div>
                </div>
              ) : (
                <div className="inspector-panel-rich road-inspector-panel">
                  <div className="insp-hero-card" style={{ borderLeft: '4px solid #38BDF8' }}>
                    <div className="insp-icon-box" style={{ background: 'linear-gradient(135deg, #0284C7, #0369A1)' }}>
                      🛣️
                    </div>
                    <div className="insp-title-box">
                      <div className="insp-device-name">Road Alignment Geometry</div>
                      <div className="insp-device-id">{locName} · {distKm} KM · {numLanes} Lanes</div>
                    </div>
                  </div>

                  <div className="insp-specs-table">
                    <div className="spec-item">
                      <span className="spec-k">Corridor Length</span>
                      <span className="spec-v good">{distKm} KM</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-k">Mainline Width</span>
                      <span className="spec-v">{numLanes} Lanes ({Math.round(roadWidthScale * 100)}% Scale)</span>
                    </div>
                    <div className="spec-item">
                      <span className="spec-k">Curve Waypoints</span>
                      <span className="spec-v mono">{roadPointsRef.current.length} Nodes Plotted</span>
                    </div>
                  </div>

                  <div className="road-waypoints-section" style={{ marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#F8FAFC', textTransform: 'uppercase' }}>
                        Manual Node Coordinates (X, Y)
                      </span>
                      <button className="sub-action-chip active" onClick={handleAddCurvePoint} style={{ padding: '2px 8px', fontSize: '10px' }}>
                        ➕ Add Node
                      </button>
                    </div>

                    <div className="node-coords-list" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '240px', overflowY: 'auto', paddingRight: '2px' }}>
                      {(roadPointsState && roadPointsState.length > 0 ? roadPointsState : roadPointsRef.current || []).map((pt, idx, arr) => {
                        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number') return null;
                        const isStart = idx === 0;
                        const isEnd = idx === arr.length - 1;
                        const badgeColor = isStart ? '#10B981' : isEnd ? '#EF4444' : '#38BDF8';
                        const nodeLabel = isStart ? 'Node #1 (Start)' : isEnd ? `Node #${idx + 1} (End)` : `Node #${idx + 1}`;
                        return (
                          <div key={idx} className="node-coord-row" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15, 23, 42, 0.85)', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(51, 65, 85, 0.7)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: badgeColor, display: 'inline-block', flexShrink: 0 }}></span>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#CBD5E1', width: '85px', flexShrink: 0 }}>{nodeLabel}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontSize: '9px', color: '#64748B' }}>X:</span>
                              <input
                                type="number"
                                value={Math.round(pt.x || 0)}
                                onChange={(e) => handleUpdateNodeCoord(idx, 'x', e.target.value)}
                                style={{ width: '52px', padding: '2px 4px', fontSize: '10.5px', background: '#090E1A', border: '1px solid #334155', color: '#38BDF8', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span style={{ fontSize: '9px', color: '#64748B' }}>Y:</span>
                              <input
                                type="number"
                                value={Math.round(pt.y || 0)}
                                onChange={(e) => handleUpdateNodeCoord(idx, 'y', e.target.value)}
                                style={{ width: '52px', padding: '2px 4px', fontSize: '10.5px', background: '#090E1A', border: '1px solid #334155', color: '#38BDF8', borderRadius: '4px', textAlign: 'center', fontFamily: 'monospace' }}
                              />
                            </div>
                            {!isStart && !isEnd && (
                              <button
                                onClick={() => handleDeleteNode(idx)}
                                style={{ padding: '2px 5px', fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#EF4444', borderRadius: '4px', cursor: 'pointer', marginLeft: 'auto' }}
                                title="Delete waypoint node"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="insp-action-deck" style={{ marginTop: '12px' }}>
                    <button
                      className="insp-save-btn"
                      onClick={() => {
                        setMode('editing-nodes');
                        updateWaypointHandles();
                        if (onShowToast) onShowToast('You can now drag waypoint handles directly on the grid canvas.');
                      }}
                      style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #0284C7, #0369A1)', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      📐 Drag Nodes on Grid Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAFETY & SPACING AUDIT */}
          {activeTabSide === 'safety' && (
            <div className="safety-tab-rich">
              <div className="safety-header-hero">
                <div className="safety-big-score" style={{ color: safetyAudit.score >= 80 ? '#10B981' : '#F59E0B' }}>
                  {safetyAudit.score}%
                </div>
                <div className="safety-hero-text">
                  <div className="safety-hero-title">ITS Compliance Score</div>
                  <div className="safety-hero-sub">Evaluated against highway smart corridor engineering standards</div>
                </div>
              </div>

              <div className="safety-checks-list">
                {safetyAudit.checks.map((check, idx) => (
                  <div key={idx} className={`safety-check-card ${check.pass ? 'pass' : 'fail'}`}>
                    <div className="check-icon">{check.pass ? '✅' : '⚠️'}</div>
                    <div className="check-body">
                      <div className="check-name">{check.title}</div>
                      <div className="check-detail">{check.detail}</div>
                      <div className="check-desc">{check.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: HIGHWAY PRESETS */}
          {activeTabSide === 'presets' && (
            <div className="presets-tab-rich">
              <div className="presets-intro-text">
                Select a standard highway template to instantly configure road geometry, gantries, and advisory signs.
              </div>
              <div className="presets-deck-rich">
                {PRESET_TEMPLATES.map(preset => (
                  <div key={preset.id} className="preset-item-rich" onClick={() => handleLoadPreset(preset)}>
                    <div className="preset-item-top">
                      <span className="preset-item-title">{preset.name}</span>
                      <span className="preset-item-km">{preset.distKm} KM</span>
                    </div>
                    <div className="preset-item-desc">{preset.desc}</div>
                    <div className="preset-item-tags">
                      <span>{preset.lanes} Lanes</span>
                      <span>{preset.direction}</span>
                      <span>{preset.speedLimit || 90} km/h</span>
                      <span>{preset.equipment?.length || 0} Devices</span>
                    </div>
                    <button className="preset-load-action-btn">Load Template →</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── JSON EXPORT MODAL ──────────────────────────────────────── */}
      {showJsonModal && (
        <div className="designer-json-modal-overlay" onClick={() => setShowJsonModal(false)}>
          <div className="designer-json-modal" onClick={(e) => e.stopPropagation()}>
            <div className="json-modal-header">
              <h3>Layout CAD JSON Specification</h3>
              <button className="close-btn" onClick={() => setShowJsonModal(false)}>✕</button>
            </div>
            <div className="json-modal-body">
              <pre>{JSON.stringify(buildLayoutObject(), null, 2)}</pre>
            </div>
            <div className="json-modal-footer">
              <button
                className="modal-action-btn"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(buildLayoutObject(), null, 2));
                  if (onShowToast) onShowToast('JSON copied to clipboard!');
                }}
              >
                📋 Copy JSON
              </button>
              <button className="modal-action-btn primary" onClick={handleDownloadJson}>
                📥 Download File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
