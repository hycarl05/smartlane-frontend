import React, { useState, useEffect, useRef } from 'react';
import * as fabricImport from 'fabric';

const fabric = fabricImport.fabric || fabricImport.default || fabricImport;

const TYPE_COLORS = { CCTV: '#2563EB', AVDS: '#7C3AED', LCS: '#DC2626', VMS: '#B45309' };
const TYPE_ICON = { CCTV: '◉', AVDS: '▲', LCS: '✕', VMS: '▭' };

// Helper functions for polyline projection & distance calculations
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
    if (best === null || d < best.d) {
      best = { d, x: projX, y: projY, distAlong };
    }
    running += segLen;
  }
  return best;
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

  // Form State
  const [locName, setLocName] = useState(initialLoc ? initialLoc.name : 'Smartlane Setia Alam');
  const [distKm, setDistKm] = useState(initialLoc ? parseFloat(initialLoc.distKm || 6.4) : 6.4);
  const [direction, setDirection] = useState(initialLoc ? initialLoc.direction : 'Northbound');

  // Interactive Designer State
  const [mode, setMode] = useState('idle'); // 'idle' | 'drawing' | 'placing'
  const [armedType, setArmedType] = useState(null);
  const modeRef = useRef(mode);
  const armedTypeRef = useRef(armedType);
  const [isRoadFinished, setIsRoadFinished] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Canvas Objects Tracking Refs
  const roadPointsRef = useRef([]);
  const waypointDotsRef = useRef([]);
  const previewLineRef = useRef(null);
  const finalRoadRef = useRef(null);
  const laneDashesRef = useRef(null);
  const equipmentRef = useRef([]);
  const eqCounterRef = useRef(1);

  // UI state for equipment rendering in side panel
  const [equipmentList, setEquipmentList] = useState([]);

  // Calculate KM position for a pixel distance along road path
  const kmAt = (distAlongPx) => {
    const total = totalPathLength(roadPointsRef.current);
    const distanceKm = parseFloat(distKm) || 0;
    if (total === 0) return 0;
    return parseFloat(((distAlongPx / total) * distanceKm).toFixed(2));
  };

  // Update modes in Fabric canvas data state and refs
  useEffect(() => {
    modeRef.current = mode;
    armedTypeRef.current = armedType;
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.dataMode = mode;
      fabricCanvasRef.current.dataArmedType = armedType;
    }
  }, [mode, armedType]);

  // Synchronize canvas dimensions
  const resizeCanvas = () => {
    const c = fabricCanvasRef.current;
    if (!c || typeof c.setWidth !== 'function' || !containerRef.current) return;
    const stage = containerRef.current;
    const w = Math.max(stage.clientWidth || 0, 850);
    const h = Math.max(stage.clientHeight || 0, 480);
    try {
      c.setWidth(w);
      c.setHeight(h);
      c.renderAll();
    } catch (e) {
      console.warn('resizeCanvas error:', e);
    }
  };

  // Initialize Fabric.js Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // Dispose previous fabric instance if present on re-mount
    if (fabricCanvasRef.current) {
      try {
        fabricCanvasRef.current.dispose();
      } catch (e) {}
      fabricCanvasRef.current = null;
    }

    const canvasEl = canvasRef.current;
    if (canvasEl.__fabric) {
      try {
        canvasEl.__fabric.dispose();
      } catch (e) {}
    }

    let c = null;
    try {
      c = new fabric.Canvas(canvasEl, {
        selection: false,
        preserveObjectStacking: true
      });
      canvasEl.__fabric = c;
      fabricCanvasRef.current = c;
    } catch (err) {
      console.warn('Fabric Canvas init notice:', err);
      return;
    }

    resizeCanvas();
    const timer1 = setTimeout(resizeCanvas, 100);
    const timer2 = setTimeout(resizeCanvas, 300);

    window.addEventListener('resize', resizeCanvas);

    // Mouse down listener for point drawing & equipment placing
    c.on('mouse:down', (opt) => {
      if (!c) return;
      const p = c.getPointer ? c.getPointer(opt.e) : { x: opt.e.offsetX, y: opt.e.offsetY };
      const currentMode = modeRef.current || 'idle';
      const currentArmed = armedTypeRef.current || null;

      if (currentMode === 'drawing' || (currentMode === 'idle' && !finalRoadRef.current)) {
        if (currentMode === 'idle') {
          setMode('drawing');
          modeRef.current = 'drawing';
        }
        roadPointsRef.current.push({ x: p.x, y: p.y });
        const dot = new fabric.Circle({
          left: p.x - 6,
          top: p.y - 6,
          radius: 6,
          fill: '#2563EB',
          stroke: '#FFFFFF',
          strokeWidth: 2,
          selectable: false,
          evented: false
        });
        c.add(dot);
        if (typeof dot.bringToFront === 'function') dot.bringToFront();
        waypointDotsRef.current.push(dot);
        redrawPreviewLine();
        c.renderAll();
        return;
      }

      if (currentMode === 'placing') {
        if (opt.target) return; // Clicked existing object
        if (roadPointsRef.current.length < 2) return;
        const proj = projectToPolyline(p.x, p.y, roadPointsRef.current);
        if (!proj) return;
        placeEquipmentMarker(currentArmed, proj.x, proj.y, proj.distAlong);
      }
    });

    // Automatically load initial or sample road path so canvas is never blank
    const initTimer = setTimeout(() => {
      resizeCanvas();
      if (initialLoc && initialLoc.roadPath && initialLoc.roadPath.length >= 2) {
        loadSavedRoadPath(initialLoc.roadPath);
      } else {
        handleLoadSample();
      }
    }, 150);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(initTimer);
      window.removeEventListener('resize', resizeCanvas);
      if (fabricCanvasRef.current) {
        try {
          fabricCanvasRef.current.dispose();
        } catch (e) {}
        fabricCanvasRef.current = null;
      }
      if (canvasEl) {
        delete canvasEl.__fabric;
      }
    };
  }, []);

  // Redraw preview dotted line while drawing
  const redrawPreviewLine = () => {
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
      stroke: '#93A5C9',
      strokeWidth: 3,
      strokeDashArray: [6, 5],
      selectable: false,
      evented: false
    });
    previewLineRef.current = pl;
    c.add(pl);
    if (typeof pl.sendToBack === 'function') pl.sendToBack();
    c.renderAll();
  };

  // Start Drawing Road
  const handleStartDraw = () => {
    resetAll(false);
    setMode('drawing');
    setIsRoadFinished(false);
    if (onShowToast) onShowToast('Click on the canvas to place road points. Click "Finish road" when done.');
  };

  // Finish Drawing Road
  const handleFinishDraw = () => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (roadPointsRef.current.length < 2) {
      if (onShowToast) onShowToast('Add at least 2 points to form a road.');
      return;
    }

    waypointDotsRef.current.forEach((d) => c.remove(d));
    waypointDotsRef.current = [];
    if (previewLineRef.current) {
      c.remove(previewLineRef.current);
      previewLineRef.current = null;
    }

    const pts = roadPointsRef.current;
    const finalRoad = new fabric.Polyline(pts, {
      fill: '',
      stroke: '#C9D2E6',
      strokeWidth: 14,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });
    const laneDashes = new fabric.Polyline(pts, {
      fill: '',
      stroke: '#FFFFFF',
      strokeWidth: 2,
      strokeDashArray: [12, 10],
      selectable: false,
      evented: false
    });

    finalRoadRef.current = finalRoad;
    laneDashesRef.current = laneDashes;

    c.add(finalRoad);
    c.add(laneDashes);
    if (typeof laneDashes.sendToBack === 'function') laneDashes.sendToBack();
    if (typeof finalRoad.sendToBack === 'function') finalRoad.sendToBack();

    setMode('idle');
    setIsRoadFinished(true);
    if (onShowToast) onShowToast('Road finished — select an equipment type to place along the road.');
  };

  // Palette button click
  const handleSelectPalette = (type) => {
    if (!isRoadFinished) return;
    if (armedType === type) {
      setArmedType(null);
      setMode('idle');
    } else {
      setArmedType(type);
      setMode('placing');
    }
  };

  // Place Equipment Marker
  const placeEquipmentMarker = (type, x, y, distAlong) => {
    const c = fabricCanvasRef.current;
    if (!c) return;

    const color = TYPE_COLORS[type] || '#2563EB';
    const icon = TYPE_ICON[type] || '◉';

    const circle = new fabric.Circle({
      radius: 11,
      fill: color,
      stroke: '#ffffff',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });

    const text = new fabric.Text(icon, {
      fontSize: 11,
      fill: '#ffffff',
      originX: 'center',
      originY: 'center',
      fontFamily: 'Inter',
      top: 0
    });

    const marker = new fabric.Group([circle, text], {
      left: x,
      top: y,
      originX: 'center',
      originY: 'center',
      hasControls: false,
      hasBorders: false,
      lockScaleX: true,
      lockScaleY: true,
      lockRotation: true,
      hoverCursor: 'move'
    });

    const id = 'eq' + eqCounterRef.current++;
    marker.data = { id, type, distAlong };
    c.add(marker);

    // Marker drag behavior -> auto snap to polyline
    marker.on('moving', () => {
      const proj = projectToPolyline(marker.left, marker.top, roadPointsRef.current);
      if (!proj) return;
      marker.left = proj.x;
      marker.top = proj.y;
      marker.data.distAlong = proj.distAlong;
      syncEquipmentState();
    });

    // Double click to remove marker
    marker.on('mousedblclick', () => {
      removeEquipmentMarker(id);
    });

    equipmentRef.current.push({ id, type, marker, distAlong });
    syncEquipmentState();
    c.renderAll();

    const kmVal = kmAt(distAlong);
    if (onShowToast) onShowToast(`${type} placed at KM ${kmVal.toFixed(2)}`);
  };

  // Remove equipment marker by ID
  const removeEquipmentMarker = (id) => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const item = equipmentRef.current.find((e) => e.id === id);
    if (item) {
      c.remove(item.marker);
      equipmentRef.current = equipmentRef.current.filter((e) => e.id !== id);
      syncEquipmentState();
      c.renderAll();
    }
  };

  // Sync React list state with canvas equipment reference
  const syncEquipmentState = () => {
    const list = equipmentRef.current.map((e) => ({
      id: e.id,
      type: e.type,
      distAlong: e.marker ? e.marker.data.distAlong : e.distAlong,
      km: kmAt(e.marker ? e.marker.data.distAlong : e.distAlong)
    }));
    list.sort((a, b) => a.distAlong - b.distAlong);
    setEquipmentList(list);
  };

  // Load a saved road path
  const loadSavedRoadPath = (pathPts) => {
    resetAll(false);
    roadPointsRef.current = [...pathPts];
    handleFinishDraw();
  };

  // Reset designer canvas
  const resetAll = (showNotice = true) => {
    const c = fabricCanvasRef.current;
    if (c) c.clear();

    roadPointsRef.current = [];
    waypointDotsRef.current = [];
    previewLineRef.current = null;
    finalRoadRef.current = null;
    laneDashesRef.current = null;
    equipmentRef.current = [];
    setEquipmentList([]);
    setMode('idle');
    setArmedType(null);
    setIsRoadFinished(false);

    if (showNotice && onShowToast) onShowToast('Canvas cleared.');
  };

  // Load sample layout
  const handleLoadSample = () => {
    resetAll(false);
    setLocName('Putra Mahkota–Southville Interchange');
    setDistKm(8.4);
    setDirection('Northbound');

    const c = fabricCanvasRef.current;
    if (!c) return;
    const w = c.getWidth();
    const h = c.getHeight();

    const samplePts = [
      { x: w * 0.08, y: h * 0.75 },
      { x: w * 0.28, y: h * 0.35 },
      { x: w * 0.52, y: h * 0.55 },
      { x: w * 0.76, y: h * 0.28 },
      { x: w * 0.94, y: h * 0.42 }
    ];
    roadPointsRef.current = samplePts;

    const finalRoad = new fabric.Polyline(samplePts, {
      fill: '',
      stroke: '#C9D2E6',
      strokeWidth: 14,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      selectable: false,
      evented: false
    });
    const laneDashes = new fabric.Polyline(samplePts, {
      fill: '',
      stroke: '#FFFFFF',
      strokeWidth: 2,
      strokeDashArray: [12, 10],
      selectable: false,
      evented: false
    });
    finalRoadRef.current = finalRoad;
    laneDashesRef.current = laneDashes;
    c.add(finalRoad);
    c.add(laneDashes);

    setIsRoadFinished(true);

    const total = totalPathLength(samplePts);
    const sampleKms = [0.6, 2.1, 3.9, 5.4, 7.2, 8.0];
    const sampleTypes = ['CCTV', 'AVDS', 'LCS', 'VMS', 'CCTV', 'LCS'];

    sampleKms.forEach((km, i) => {
      const distAlong = (km / 8.4) * total;
      let running = 0;
      let x = samplePts[0].x;
      let y = samplePts[0].y;
      for (let s = 0; s < samplePts.length - 1; s++) {
        const segLen = dist(samplePts[s], samplePts[s + 1]);
        if (running + segLen >= distAlong) {
          const t = (distAlong - running) / segLen;
          x = samplePts[s].x + (samplePts[s + 1].x - samplePts[s].x) * t;
          y = samplePts[s].y + (samplePts[s + 1].y - samplePts[s].y) * t;
          break;
        }
        running += segLen;
      }
      placeEquipmentMarker(sampleTypes[i], x, y, distAlong);
    });

    if (onShowToast) onShowToast('Loaded sample layout — drag any marker along the road to adjust KM position.');
  };

  // Build complete JSON structure matching both system schema and prototype specification
  const buildLayoutObject = () => {
    const totalDist = parseFloat(distKm) || 0;
    const sortedEq = [...equipmentList].sort((a, b) => a.km - b.km);

    // Prototype specification equipment list
    const rawEquipmentList = sortedEq.map((e) => ({
      id: e.id,
      type: e.type,
      kmPosition: parseFloat(e.km.toFixed(2))
    }));

    // Grouping equipment for Smartlane location schema
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
      .filter((e) => e.type === 'VMS' && vmsItems.length > 2)
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

    const cctvCount = sortedEq.filter((e) => e.type === 'CCTV').length;
    const avdsCount = sortedEq.filter((e) => e.type === 'AVDS').length;
    const lcsCount = sortedEq.filter((e) => e.type === 'LCS').length;
    const vmsCount = sortedEq.filter((e) => e.type === 'VMS').length;

    return {
      id: initialLoc ? initialLoc.id : `loc-${Date.now().toString(36)}`,
      name: locName || 'Smartlane Custom Segment',
      locationName: locName || 'Smartlane Custom Segment',
      direction: direction,
      distKm: totalDist,
      distanceKm: totalDist,
      roadPath: roadPointsRef.current.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
      equipmentList: rawEquipmentList,
      equipment: {
        cctv: [cctvCount, cctvCount],
        avds: [avdsCount, avdsCount],
        lcs: [lcsCount, lcsCount],
        vms: [vmsCount, vmsCount],
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
  };

  const handleSave = () => {
    if (roadPointsRef.current.length < 2) {
      if (onShowToast) onShowToast('Please draw and finish a road path before saving.');
      return;
    }
    const layoutObj = buildLayoutObject();
    setShowJson(true);
    if (onSaveLayout) {
      onSaveLayout(layoutObj);
    }
    if (onShowToast) {
      onShowToast(`Layout saved for ${locName} (${equipmentList.length} equipment placed).`);
    }
  };

  const handleDownloadJson = () => {
    const layoutObj = buildLayoutObject();
    const jsonStr = JSON.stringify(layoutObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartlane-layout-${(locName || 'road').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (onShowToast) onShowToast('Downloaded layout JSON file.');
  };

  const handleCopyJson = () => {
    const layoutObj = buildLayoutObject();
    const jsonStr = JSON.stringify(layoutObj, null, 2);
    navigator.clipboard.writeText(jsonStr);
    if (onShowToast) onShowToast('Layout JSON copied to clipboard!');
  };

  return (
    <div className="layout-designer-app">
      {/* Top Header */}
      <div className="designer-topbar">
        <div className="brand">
          <div className="brand-mark">🎨</div>
          <div>
            <b>SMARTLANE CONTROL CENTRE</b>
            <span>ROAD LAYOUT DESIGNER · ADMIN TOOL</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="topbar-tag">✨ Admin Road Configurator</div>
          {onClose && (
            <button className="designer-close-btn" onClick={onClose}>
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="designer-main">
        {/* LEFT PANEL: Setup & Tools */}
        <div className="panel designer-panel-left">
          <div className="panel-title">1 · Location Setup</div>
          <div className="form-group">
            <label>Location name</label>
            <input
              type="text"
              value={locName}
              onChange={(e) => setLocName(e.target.value)}
              placeholder="e.g. Smartlane Setia Alam"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Distance (km)</label>
              <input
                type="number"
                step="0.1"
                value={distKm}
                onChange={(e) => setDistKm(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label>Direction</label>
              <select value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option>Northbound</option>
                <option>Southbound</option>
              </select>
            </div>
          </div>

          <div className="panel-title" style={{ marginTop: '6px' }}>
            2 · Draw the Road
          </div>
          <button
            className={`step-btn ${mode === 'drawing' ? 'on' : ''}`}
            onClick={handleStartDraw}
          >
            <span className="n">1</span>Draw road path
          </button>
          <button
            className="step-btn"
            onClick={handleFinishDraw}
            disabled={mode !== 'drawing' && roadPointsRef.current.length < 2}
          >
            <span className="n">2</span>Finish road
          </button>
          <div className="hint">
            Click along the canvas grid to place road points — click "Finish road" when path is aligned.
          </div>

          <div className="panel-title">3 · Place Equipment</div>
          <div className="palette">
            {['CCTV', 'AVDS', 'LCS', 'VMS'].map((t) => (
              <button
                key={t}
                className={`pal-btn ${armedType === t ? 'armed' : ''}`}
                data-type={t}
                disabled={!isRoadFinished}
                onClick={() => handleSelectPalette(t)}
              >
                <div className="ic">{TYPE_ICON[t]}</div>
                {t === 'LCS' ? 'LCS Sign' : t}
              </button>
            ))}
          </div>
          <div className="hint">
            Pick a type, then click on (or near) the road to drop it. Drag markers to reposition — snaps automatically to road.
          </div>

          <div className="util-row">
            <button className="util-btn" onClick={handleLoadSample}>
              Load sample
            </button>
            <button className="util-btn danger" onClick={() => resetAll(true)}>
              Reset
            </button>
          </div>
        </div>

        {/* CENTER PANEL: Interactive Canvas Stage */}
        <div className="panel canvas-panel">
          <div className="canvas-head">
            <div>
              <div className="ct">{locName || 'Untitled location'}</div>
              <div className="cs">
                {direction} · {distKm} km · {equipmentList.length} equipment placed
              </div>
            </div>
            <div
              className={`mode-flag ${
                mode === 'drawing' ? 'drawing' : mode === 'placing' ? 'placing' : ''
              }`}
            >
              {mode === 'drawing'
                ? 'Drawing road…'
                : mode === 'placing'
                ? `Placing ${armedType}…`
                : isRoadFinished
                ? 'Ready'
                : 'Idle'}
            </div>
          </div>
          <div className="canvas-stage" ref={containerRef}>
            <canvas ref={canvasRef} id="layoutCanvas"></canvas>
          </div>
        </div>

        {/* RIGHT PANEL: Equipment List & JSON Output */}
        <div className="panel designer-panel-right">
          <div className="panel-title">Placed Equipment ({equipmentList.length})</div>
          <div className="eq-list">
            {equipmentList.length === 0 ? (
              <div className="eq-empty">No equipment placed yet. Finish drawing road and select from palette.</div>
            ) : (
              equipmentList.map((e) => (
                <div className="eq-item" key={e.id}>
                  <div
                    className="dot"
                    style={{ background: TYPE_COLORS[e.type] || '#2563EB' }}
                  ></div>
                  <div className="body">
                    <div className="t1">{e.type}</div>
                    <div className="t2">KM {e.km.toFixed(2)}</div>
                  </div>
                  <button
                    className="del"
                    title="Remove equipment"
                    onClick={() => removeEquipmentMarker(e.id)}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="json-section">
            <div className="json-toggle" onClick={() => setShowJson(!showJson)}>
              <div className="panel-title" style={{ marginBottom: 0 }}>
                Layout JSON{' '}
                <span
                  style={{
                    textTransform: 'none',
                    letterSpacing: 0,
                    fontWeight: 500,
                    color: 'var(--text-faint)'
                  }}
                >
                  (what gets saved)
                </span>
              </div>
              <span className="arrow">{showJson ? '▾' : '▸'}</span>
            </div>
            {showJson && (
              <div className="json-box-wrap">
                <div className="json-box">
                  <pre>{JSON.stringify(buildLayoutObject(), null, 2)}</pre>
                </div>
                <div className="json-action-row">
                  <button className="json-sub-btn" onClick={handleCopyJson} title="Copy JSON string to clipboard">
                    📋 Copy
                  </button>
                  <button className="json-sub-btn download" onClick={handleDownloadJson} title="Download layout as .json file">
                    📥 Download JSON
                  </button>
                </div>
              </div>
            )}
            <button className="save-btn" onClick={handleSave}>
              💾 Save Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
