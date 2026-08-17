import React, { useEffect, useRef, useState } from "react";
import * as maplibreglModule from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const maplibregl = maplibreglModule.default || maplibreglModule;

// Standard reliable basemap styles (Free, no API key required)
export const MAP_STYLES = {
  dark: {
    name: "Dark Mode (CARTO)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
  },
  voyager: {
    name: "Voyager (CARTO)",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
  },
  positron: {
    name: "Positron Light (CARTO)",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
  },
  osm: {
    name: "OpenStreetMap (Standard Raster)",
    style: {
      version: 8,
      sources: {
        "osm-tiles": {
          type: "raster",
          tiles: [
            "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
          ],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      layers: [
        {
          id: "osm-tiles-layer",
          type: "raster",
          source: "osm-tiles",
          minzoom: 0,
          maxzoom: 19
        }
      ]
    }
  }
};

export default function MapView({
  center = [101.5, 3.15],
  zoom = 12,
  locations = [],
  onSelectLocation = null,
  interactive = true,
  markers = [],
  styleUrl = MAP_STYLES.dark.url,
  className = "",
  containerStyle = {}
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [currentStyle, setCurrentStyle] = useState("dark");

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialStyle = styleUrl || MAP_STYLES.dark.url;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      center,
      zoom,
      interactive,
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    }

    map.on("error", (e) => {
      console.warn("MapLibre tile/style warning:", e && e.error ? e.error : e);
    });

    const triggerResize = () => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    };

    map.on("load", triggerResize);
    const timer1 = setTimeout(triggerResize, 100);
    const timer2 = setTimeout(triggerResize, 400);

    mapRef.current = map;

    const handleWindowResize = () => triggerResize();
    window.addEventListener("resize", handleWindowResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("resize", handleWindowResize);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Switch style dynamically
  const handleStyleChange = (styleKey) => {
    setCurrentStyle(styleKey);
    const map = mapRef.current;
    if (!map) return;

    const selected = MAP_STYLES[styleKey];
    if (selected) {
      if (selected.style) {
        map.setStyle(selected.style);
      } else if (selected.url) {
        map.setStyle(selected.url);
      }
    }
  };

  // Center/zoom update
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center,
      zoom,
      essential: true,
      speed: 1.2
    });
  }, [center[0], center[1], zoom]);

  // Update locations and custom markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (locations && locations.length > 0) {
      locations.forEach((loc) => {
        if (!loc.coordinates || loc.coordinates.length !== 2) return;

        const el = document.createElement("div");
        el.className = "smartlane-map-marker";

        const isAct = loc.status === "active";
        const isPend = loc.status === "pending";
        const color = isAct ? "#10b981" : isPend ? "#f59e0b" : "#64748b";
        const statusText = isAct ? "ACTIVE" : isPend ? "ATTENTION" : "STANDBY";

        el.style.width = "34px";
        el.style.height = "34px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = color;
        el.style.border = "3px solid #ffffff";
        el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.4)";
        el.style.cursor = "pointer";
        el.style.display = "flex";
        el.style.alignItems = "center";
        el.style.justifyContent = "center";
        el.style.color = "#ffffff";
        el.style.fontSize = "15px";
        el.style.fontWeight = "bold";
        el.style.transition = "transform 0.2s ease";
        el.innerHTML = isAct ? "⚡" : isPend ? "!" : "●";

        el.onmouseenter = () => { el.style.transform = "scale(1.18)"; };
        el.onmouseleave = () => { el.style.transform = "scale(1.0)"; };

        const popupHTML = `
          <div style="padding: 8px; font-family: Inter, system-ui, sans-serif; min-width: 200px;">
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: #0f172a;">${loc.name}</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Direction: ${loc.direction}</div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
              <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${color}22; color: ${color}; border: 1px solid ${color}44;">
                ${statusText}
              </span>
              <span style="font-size: 11px; font-weight: 600; color: #334155;">LOS: ${loc.los || 'N/A'}</span>
            </div>
            ${onSelectLocation
            ? `<button id="map-btn-${loc.id}" style="width:100%; padding:7px 12px; background:linear-gradient(135deg, #1e40af, #2563eb); color:#fff; border:none; border-radius:6px; font-size:11px; font-weight:600; cursor:pointer; box-shadow: 0 2px 6px rgba(37,99,235,0.3);">Open Location Dashboard →</button>`
            : ''
          }
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupHTML);

        popup.on("open", () => {
          if (onSelectLocation) {
            const btn = document.getElementById(`map-btn-${loc.id}`);
            if (btn) btn.onclick = () => onSelectLocation(loc.id);
          }
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(loc.coordinates)
          .setPopup(popup)
          .addTo(map);

        markersRef.current.push(marker);
      });
    }

    if (markers && markers.length > 0) {
      markers.forEach((m) => {
        if (!m.coordinates) return;
        const popup = m.popupText ? new maplibregl.Popup({ offset: 20 }).setText(m.popupText) : null;
        const marker = new maplibregl.Marker({ color: m.color || "#3b82f6" }).setLngLat(m.coordinates);
        if (popup) marker.setPopup(popup);
        marker.addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [locations, markers]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "450px",
        borderRadius: "12px",
        overflow: "hidden",
        ...containerStyle
      }}
    >
      {/* Map Style Selector Overlay */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          zIndex: 10,
          background: "rgba(15, 23, 42, 0.88)",
          backdropFilter: "blur(8px)",
          padding: "6px 12px",
          borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        <span style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase" }}>Map Theme:</span>
        <select
          value={currentStyle}
          onChange={(e) => handleStyleChange(e.target.value)}
          style={{
            background: "#1e293b",
            color: "#f8fafc",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "6px",
            padding: "3px 8px",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
            outline: "none"
          }}
        >
          <option value="dark">🌑 CARTO Dark Matter</option>
          <option value="voyager">🗺️ CARTO Voyager</option>
          <option value="positron">☀️ CARTO Positron</option>
          <option value="osm">🌐 OpenStreetMap (Raster)</option>
        </select>
      </div>

      <div
        ref={containerRef}
        className={`smartlane-mapview ${className}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100%",
          height: "100%"
        }}
      />
    </div>
  );
}