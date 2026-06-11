// gpx-parser.js - GPX file parser (no external dependencies)
// Parses GPX XML to GeoJSON + activity metadata

var GPXParser = (function() {

  /**
   * Parse a GPX file and return standardized activity data.
   */
  async function parseGPXFile(file, color) {
    const text = await file.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');

    const errorNode = xml.querySelector('parsererror');
    if (errorNode) throw new Error('无效的 GPX 文件');

    // Extract all track points
    const trkpts = xml.querySelectorAll('trkpt');
    if (trkpts.length === 0) throw new Error('GPX 文件中未找到轨迹数据');

    const coordinates = [];
    const elevations = [];

    for (const pt of trkpts) {
      const lat = parseFloat(pt.getAttribute('lat'));
      const lng = parseFloat(pt.getAttribute('lon'));
      if (!isNaN(lat) && !isNaN(lng)) {
        coordinates.push([lng, lat]);
      }
      const ele = pt.querySelector('ele');
      if (ele?.textContent) {
        elevations.push(parseFloat(ele.textContent));
      }
    }

    if (coordinates.length === 0) throw new Error('GPX 文件中未找到有效 GPS 数据');

    // Activity name
    let name = file.name.replace(/\.gpx$/i, '');
    const nameEl = xml.querySelector('trk > name, metadata > name');
    if (nameEl?.textContent?.trim()) name = nameEl.textContent.trim();

    // Date
    const timeEl = xml.querySelector('metadata > time, trk > trkseg > trkpt > time');
    const date = timeEl?.textContent
      ? new Date(timeEl.textContent).toISOString()
      : new Date().toISOString();

    // Distance (Haversine)
    let totalDistance = 0;
    for (let i = 1; i < coordinates.length; i++) {
      totalDistance += haversineDistance(coordinates[i - 1], coordinates[i]);
    }

    // Duration
    let duration = 0;
    const firstTime = trkpts[0]?.querySelector('time');
    const lastTime = trkpts[trkpts.length - 1]?.querySelector('time');
    if (firstTime?.textContent && lastTime?.textContent) {
      duration = (new Date(lastTime.textContent) - new Date(firstTime.textContent)) / 1000;
    }
    if (duration <= 0) duration = totalDistance / 5.5 * 3600;

    // Elevation gain
    let totalElevation = 0;
    for (let i = 1; i < elevations.length; i++) {
      const diff = elevations[i] - elevations[i - 1];
      if (diff > 0) totalElevation += diff;
    }

    const avgSpeed = duration > 0 ? (totalDistance / 1000) / (duration / 3600) : 0;

    return {
      name, date,
      distance: Math.round(totalDistance),
      duration,
      avgSpeed: Math.round(avgSpeed * 10) / 10,
      elevation: Math.round(totalElevation),
      routeGeoJSON: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          geometry: { type: 'LineString', coordinates },
          properties: { name, elevations },
        }],
      },
      color,
      source: 'file',
      stravaId: null,
      elevations,
    };
  }

  function haversineDistance(a, b) {
    const R = 6371000;
    const toRad = function(d) { return d * Math.PI / 180; };
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const lat1 = toRad(a[1]), lat2 = toRad(b[1]);
    const sinDLat = Math.sin(dLat / 2), sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  return { parseGPXFile };
})();