// MapView.js - Leaflet map with route overlays (v2)
// Depends on: React, L (Leaflet global)

function MapView(props) {
  const { activities, selectedId, onSelectActivity, viewMode } = props;
  var heatmap = viewMode === "heatmap";
  const containerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const layersRef = React.useRef([]);
  const prevActivityCountRef = React.useRef(0);

  // Initialize map
  React.useEffect(function() {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [35, 104], zoom: 5,
      zoomControl: true, attributionControl: true,
    });

    // Reliable tile layer - OpenStreetMap with dark filter via CSS
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      // Use className for dark CSS filter
      className: 'map-tile-dark',
    }).addTo(map);

    mapRef.current = map;

    return function() {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render routes
  React.useEffect(function() {
    if (!mapRef.current) return;
    const map = mapRef.current;

    layersRef.current.forEach(function(layer) { map.removeLayer(layer); });
    layersRef.current = [];

    const allCoords = [];

    activities.forEach(function(activity) {
      const feature = activity.routeGeoJSON && activity.routeGeoJSON.features && activity.routeGeoJSON.features[0];
      if (!feature || !feature.geometry || !feature.geometry.coordinates || !feature.geometry.coordinates.length) return;

      const rawCoords = feature.geometry.coordinates;
      const coords = [];
      for (var i = 0; i < rawCoords.length; i++) {
        if (rawCoords[i] && rawCoords[i].length >= 2) {
          coords.push([rawCoords[i][1], rawCoords[i][0]]);
        }
      }
      if (coords.length === 0) return;

      for (var j = 0; j < coords.length; j++) { allCoords.push(coords[j]); }

      var isSelected = selectedId === activity.id;
      var polyline = L.polyline(coords, heatmap ? {
        color: props.heatmapColor || '#fc5200', weight: 2, opacity: props.heatmapOpacity != null ? props.heatmapOpacity : 0.15, lineCap: 'round', lineJoin: 'round',
      } : {
        color: activity.color, weight: isSelected ? 5 : 3, opacity: isSelected ? 1 : 0.75, lineCap: 'round', lineJoin: 'round',
      }).addTo(map);

      polyline.on('click', function() { onSelectActivity(activity); });
      polyline.bindTooltip(activity.name, { sticky: true, direction: 'top' });
      layersRef.current.push(polyline);

      // Start/end markers (skip in heatmap mode)
      if (coords.length > 0 && !heatmap) {
        var startIcon = L.divIcon({
          className: 'start-marker',
          html: '<div style="width:12px;height:12px;background:#2ecc71;border:2px solid #fff;border-radius:50%;box-shadow:0 0 6px rgba(46,204,113,0.5)"></div>',
          iconSize: [12,12], iconAnchor: [6,6],
        });
        var sm = L.marker(coords[0], { icon: startIcon }).addTo(map);
        sm.bindTooltip('起点'); layersRef.current.push(sm);

        var endIcon = L.divIcon({
          className: 'end-marker',
          html: '<div style="width:12px;height:12px;background:#e74c3c;border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px rgba(231,76,60,0.5)"></div>',
          iconSize: [12,12], iconAnchor: [6,6],
        });
        var em = L.marker(coords[coords.length-1], { icon: endIcon }).addTo(map);
        em.bindTooltip('终点'); layersRef.current.push(em);
      }
    });

    // Only auto-fit when activities change (count differs), not on color/opacity changes
    if (allCoords.length > 0 && activities.length !== prevActivityCountRef.current) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
    }
    prevActivityCountRef.current = activities.length;
  }, [activities, selectedId, onSelectActivity, viewMode, props.heatmapColor, props.heatmapOpacity]);

  return React.createElement('div', { className: 'map-area' },
    React.createElement('div', { className: 'map-area__container', ref: containerRef }),
    !heatmap && activities.length > 0 && React.createElement('div', {
      style: { position:'absolute', bottom:12, right:12, zIndex:1000, background:'var(--bg-panel)', borderRadius:'var(--radius-md)', padding:'10px 14px', border:'1px solid var(--border-color)', fontSize:12, maxHeight:200, overflowY:'auto' },
    },
      React.createElement('div', { style: { color:'var(--text-muted)', marginBottom:6, fontWeight:600 } }, '路线图例'),
      activities.map(function(a) {
        return React.createElement('div', {
          key: a.id,
          style: { display:'flex', alignItems:'center', gap:8, padding:'3px 0', cursor:'pointer', opacity: selectedId && selectedId !== a.id ? 0.5 : 1 },
          onClick: function() { onSelectActivity(a); },
        },
          React.createElement('div', { style: { width:20, height:3, background:a.color, borderRadius:2 } }),
          React.createElement('span', { style: { color:'var(--text-secondary)', fontSize:11 } },
            a.name.length > 16 ? a.name.slice(0,15) + '\u2026' : a.name
          )
        );
      })
    )
  );
}