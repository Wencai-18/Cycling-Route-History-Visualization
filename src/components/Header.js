// Header.js - Top navigation bar with mode toggle & settings
// Depends on: React (global)

function Header(props) {
  const { stravaConnected, onConnectStrava, onDisconnectStrava, athlete, viewMode, onToggleMode, heatmapColor, heatmapOpacity, onHeatmapColorChange, onHeatmapOpacityChange, activities, hiddenIds } = props;
  const [showSettings, setShowSettings] = React.useState(false);

  function calcAutoOpacity() {
    if (!activities || activities.length === 0) return;
    var grid = {};
    var maxCount = 0;
    activities.forEach(function(a) {
      if (hiddenIds && hiddenIds[a.id]) return;
      var feat = a.routeGeoJSON && a.routeGeoJSON.features && a.routeGeoJSON.features[0];
      if (!feat || !feat.geometry || !feat.geometry.coordinates) return;
      var coords = feat.geometry.coordinates;
      // Sample every 10th point to avoid counting consecutive GPS points as overlap
      // Grid ~100m (0.001 deg) for counting unique routes per cell
      var step = Math.max(1, Math.floor(coords.length / 200));
      var lastKey = '';
      for (var i = 0; i < coords.length; i += step) {
        if (!coords[i] || coords[i].length < 2) continue;
        var key = (Math.round(coords[i][1] * 1000) / 1000).toFixed(3) + ',' + (Math.round(coords[i][0] * 1000) / 1000).toFixed(3);
        // Skip if same cell as previous (within same route)
        if (key === lastKey) continue;
        lastKey = key;
        // Use a Set per grid cell for unique route counting
        if (!grid[key]) grid[key] = {};
        grid[key][a.id] = true;
        var count = Object.keys(grid[key]).length;
        if (count > maxCount) maxCount = count;
      }
    });
    if (maxCount > 0) {
      // Use alpha compositing formula: target 90% visual opacity at max overlap
      // p = 1 - (1-target)^(1/N) where target=0.9, capped at 0.8 for single routes
      var auto = Math.min(0.8, 1 - Math.pow(0.1, 1 / maxCount));
      auto = Math.max(0.03, auto);
      onHeatmapOpacityChange(auto);
    }
  }

  React.useEffect(function() {
    if (!showSettings) return;
    var handler = function(e) { setShowSettings(false); };
    setTimeout(function() { document.addEventListener('click', handler); }, 0);
    return function() { document.removeEventListener('click', handler); };
  }, [showSettings]);

  return React.createElement('header', { className: 'app-header' },
    React.createElement('div', { className: 'app-header__brand' },
      React.createElement('div', { className: 'app-header__logo' }, '\uD83D\uDEB4'),
      React.createElement('div', null,
        React.createElement('div', { className: 'app-header__title' }, '骑行路线可视化'),
        React.createElement('div', { className: 'app-header__subtitle' }, 'Cycling Route Visualizer')
      )
    ),
    React.createElement('div', { className: 'app-header__actions', style: { position: 'relative' } },
      // Mode toggle
      React.createElement('button', {
        className: 'btn btn--ghost btn--sm',
        onClick: onToggleMode,
        style: { marginRight: 4 },
        title: viewMode === 'heatmap' ? '切换到路线模式' : '切换到热力图模式',
      }, viewMode === 'heatmap' ? '\uD83D\uDD25 热力图' : '\uD83C\uDF08 路线'),

      // Settings gear
      React.createElement('button', {
        className: 'btn btn--ghost btn--sm',
        onClick: function() { setShowSettings(!showSettings); },
        style: { marginRight: 8, fontSize: 16 },
        title: '显示设置',
      }, '\u2699'),

      // Settings dropdown
      showSettings && React.createElement('div', {
        style: {
          position: 'absolute', top: 40, right: 8, zIndex: 2000,
          background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)',
          padding: '14px 16px', border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-panel)', minWidth: 200, fontSize: 13,
        },
        onClick: function(e) { e.stopPropagation(); },
      },
        viewMode === 'heatmap' ? (
          React.createElement(React.Fragment, null,
            React.createElement('div', { style: { marginBottom: 10, fontWeight: 600, color: 'var(--text-primary)' } }, '热力图设置'),
            React.createElement('div', { style: { marginBottom: 8 } },
              React.createElement('label', { style: { display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 } }, '叠加颜色'),
              React.createElement('input', {
                type: 'color', value: heatmapColor || '#fc5200',
                onChange: function(e) { onHeatmapColorChange(e.target.value); },
                style: { width: '100%', height: 30, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'var(--bg-input)' },
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { style: { display: 'block', color: 'var(--text-secondary)', marginBottom: 4, fontSize: 11 } }, '透明度: ' + ((heatmapOpacity != null ? heatmapOpacity : 0.15) * 100).toFixed(0) + '%'),
              React.createElement('input', {
                type: 'range', min: 3, max: 100, value: (heatmapOpacity != null ? heatmapOpacity : 0.15) * 100,
                onChange: function(e) { onHeatmapOpacityChange(parseInt(e.target.value) / 100); },
                style: { width: '100%', accentColor: 'var(--accent)' },
              }),
              React.createElement('button', {
                onClick: calcAutoOpacity,
                style: { marginTop: 6, width: '100%', padding: '4px 0', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer' }
              }, 'Auto - 自动适配透明度')
            )
          )
        ) : (
          React.createElement(React.Fragment, null,
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 } }, '路线模式'),
            React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 11 } }, '每条路线自动分配不同颜色')
          )
        )
      ),

      // iGPSPORT
      React.createElement('button', {
        className: 'btn btn--primary',
        onClick: props.onOpenIGPSPORT,
        style: { marginRight: 8 },
        title: '从 iGPSPORT 导入活动',
      },
        React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
          React.createElement('path', { d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' })
        ),
        ' iGPSPORT'
      ),

      // Strava
      stravaConnected ? (
        React.createElement(React.Fragment, null,
          athlete && React.createElement('span', { style: { fontSize: 13, color: 'var(--text-secondary)', marginRight: 4 } }, athlete.firstname + ' ' + athlete.lastname),
          React.createElement('button', { className: 'btn btn--ghost btn--sm', onClick: onDisconnectStrava }, '断开 Strava')
        )
      ) : (
        React.createElement('button', { className: 'btn btn--primary', onClick: onConnectStrava },
          React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
            React.createElement('path', { d: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7' })
          ),
          ' 连接 Strava'
        )
      )
    )
  );
}