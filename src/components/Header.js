// Header.js - Top navigation bar with mode toggle & settings
// Depends on: React (global)

function Header(props) {
  const { stravaConnected, onConnectStrava, onDisconnectStrava, athlete, viewMode, onToggleMode, heatmapColor, heatmapOpacity, onHeatmapColorChange, onHeatmapOpacityChange } = props;
  const [showSettings, setShowSettings] = React.useState(false);

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
              })
            )
          )
        ) : (
          React.createElement(React.Fragment, null,
            React.createElement('div', { style: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 } }, '路线模式'),
            React.createElement('div', { style: { color: 'var(--text-muted)', fontSize: 11 } }, '每条路线自动分配不同颜色')
          )
        )
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