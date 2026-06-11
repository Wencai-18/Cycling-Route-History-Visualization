// ActivityDetail.js - Bottom slide-up detail panel
// Depends on: React (global)

function ActivityDetail(props) {
  const { activity, onClose } = props;
  const svgRef = React.useRef(null);

  function formatDistance(m) {
    if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
    return m + ' m';
  }
  function formatDuration(s) {
    const h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    if (h > 0) return h + ':' + String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    return min + ':' + String(sec).padStart(2,'0');
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // Draw elevation profile
  React.useEffect(function() {
    if (!svgRef.current || !activity?.elevations?.length) return;
    const svg = svgRef.current;
    const elevations = activity.elevations;
    const w = 800, h = 80, pad = 4;
    const min = Math.min.apply(null, elevations), max = Math.max.apply(null, elevations);
    const range = max - min || 1;

    let points = '';
    for (let i = 0; i < elevations.length; i++) {
      const x = (i / (elevations.length - 1)) * (w - pad * 2) + pad;
      const y = h - pad - ((elevations[i] - min) / range) * (h - pad * 2);
      points += x + ',' + y + ' ';
    }

    svg.innerHTML = '<defs><linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + activity.color + '" stop-opacity="0.35"/>' +
      '<stop offset="100%" stop-color="' + activity.color + '" stop-opacity="0.05"/></linearGradient></defs>' +
      '<polygon points="0,' + h + ' ' + points + ' ' + w + ',' + h + '" fill="url(#eleGrad)"/>' +
      '<polyline points="' + points + '" fill="none" stroke="' + activity.color + '" stroke-width="1.5" stroke-linejoin="round"/>';
    svg.style.display = 'block';
  }, [activity]);

  if (!activity) return null;

  return React.createElement('div', { className: 'detail-panel detail-panel--open' },
    React.createElement('div', { className: 'detail-panel__handle', onClick: onClose },
      React.createElement('div', { className: 'detail-panel__handle-bar' })
    ),
    React.createElement('div', { className: 'detail-panel__content' },
      React.createElement('div', { className: 'detail-panel__header' },
        React.createElement('div', null,
          React.createElement('div', { style: { display:'flex', alignItems:'center', gap:8 } },
            React.createElement('div', { style: { width:12, height:12, borderRadius:3, background:activity.color, flexShrink:0 } }),
            React.createElement('div', { className: 'detail-panel__name' }, activity.name)
          ),
          React.createElement('div', { className: 'detail-panel__date' }, formatDate(activity.date))
        ),
        React.createElement('button', { className: 'btn btn--ghost btn--sm', onClick: onClose }, '\u2715')
      ),
      React.createElement('div', { className: 'detail-panel__metrics' },
        React.createElement('div', null, React.createElement('div', { className: 'detail-panel__metric-label' }, '距离'), React.createElement('div', { className: 'detail-panel__metric-value' }, formatDistance(activity.distance))),
        React.createElement('div', null, React.createElement('div', { className: 'detail-panel__metric-label' }, '时间'), React.createElement('div', { className: 'detail-panel__metric-value' }, formatDuration(activity.duration))),
        React.createElement('div', null, React.createElement('div', { className: 'detail-panel__metric-label' }, '均速'), React.createElement('div', { className: 'detail-panel__metric-value' }, activity.avgSpeed.toFixed(1) + ' km/h')),
        React.createElement('div', null, React.createElement('div', { className: 'detail-panel__metric-label' }, '爬升'), React.createElement('div', { className: 'detail-panel__metric-value' }, activity.elevation + ' m'))
      ),
      activity.elevations?.length > 1 && React.createElement('div', { className: 'detail-panel__elevation' },
        React.createElement('div', { className: 'detail-panel__elevation-title' }, '海拔剖面'),
        React.createElement('svg', { ref: svgRef, className: 'detail-panel__elevation-svg', viewBox: '0 0 800 80', preserveAspectRatio: 'none' })
      ),
      React.createElement('div', { style: { marginTop:16, paddingTop:12, borderTop:'1px solid var(--border-subtle)', display:'flex', gap:24, fontSize:12, color:'var(--text-muted)' } },
        React.createElement('span', null, '来源：' + (activity.source === 'strava' ? 'Strava' : '文件导入')),
        React.createElement('span', null, '路线点数：' + (activity.routeGeoJSON?.features?.[0]?.geometry?.coordinates?.length || 0))
      )
    )
  );
}