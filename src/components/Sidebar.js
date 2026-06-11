// Sidebar.js - File import dropzone + activity list
// Depends on: React (global)

function Sidebar(props) {
  const { activities, selectedId, onSelect, onDelete, onFilesDrop, loading } = props;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [dropActive, setDropActive] = React.useState(false);

  const onDragOver = React.useCallback(function(e) { e.preventDefault(); setDropActive(true); }, []);
  const onDragLeave = React.useCallback(function() { setDropActive(false); }, []);
  const onDrop = React.useCallback(function(e) {
    e.preventDefault(); setDropActive(false);
    const files = Array.from(e.dataTransfer.files).filter(function(f) { return /\.(gpx|fit)$/i.test(f.name); });
    if (files.length > 0) onFilesDrop(files);
  }, [onFilesDrop]);

  const onFileInput = React.useCallback(function(e) {
    const files = Array.from(e.target.files).filter(function(f) { return /\.(gpx|fit)$/i.test(f.name); });
    if (files.length > 0) onFilesDrop(files);
    e.target.value = '';
  }, [onFilesDrop]);

  const filtered = activities.filter(function(a) {
    const matchSearch = !search || a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1;
    const matchFilter = filter === 'all' || a.source === filter;
    return matchSearch && matchFilter;
  });

  function formatDistance(m) {
    if (m >= 1000) return (m / 1000).toFixed(1) + ' km';
    return m + ' m';
  }
  function formatDuration(s) {
    const h = Math.floor(s / 3600), min = Math.floor((s % 3600) / 60);
    if (h > 0) return h + 'h ' + min + 'm';
    return min + 'm';
  }
  function formatDate(iso) {
    const d = new Date(iso);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  return React.createElement('aside', { className: 'sidebar' },
    // Dropzone
    React.createElement('div', {
      className: 'sidebar__dropzone' + (dropActive ? ' sidebar__dropzone--active' : ''),
      onDragOver: onDragOver, onDragLeave: onDragLeave, onDrop: onDrop,
      onClick: function() { document.getElementById('file-input').click(); },
    },
      React.createElement('div', { className: 'sidebar__dropzone-icon' }, loading ? '\u23F3' : '\uD83D\uDCC1'),
      React.createElement('div', { className: 'sidebar__dropzone-text' }, loading ? '正在导入...' : '拖拽 GPX / FIT 文件到此处'),
      React.createElement('div', { className: 'sidebar__dropzone-hint' }, '或点击选择文件'),
      React.createElement('input', { id: 'file-input', type: 'file', accept: '.gpx,.fit', onChange: onFileInput, style: { display: 'none' }, multiple: true })
    ),
    // Toolbar
    React.createElement('div', { className: 'sidebar__toolbar' },
      React.createElement('input', {
        className: 'sidebar__search', type: 'text', placeholder: '搜索活动...',
        value: search, onChange: function(e) { setSearch(e.target.value); },
      }),
      React.createElement('select', {
        className: 'btn btn--ghost btn--sm',
        value: filter, onChange: function(e) { setFilter(e.target.value); },
        style: { background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' },
      },
        React.createElement('option', { value: 'all' }, '全部'),
        React.createElement('option', { value: 'file' }, '文件导入'),
        React.createElement('option', { value: 'strava' }, 'Strava')
      )
    ),
    // Activity list
    React.createElement('div', { className: 'sidebar__list' },
      filtered.length === 0 ? (
        React.createElement('div', { className: 'sidebar__empty' },
          activities.length === 0 ? '还没有导入任何骑行路线\n拖拽 GPX 或 FIT 文件开始' : '没有匹配的活动'
        )
      ) : (
        filtered.map(function(activity) {
          return React.createElement('div', {
            key: activity.id,
            className: 'activity-card' + (selectedId === activity.id ? ' activity-card--active' : ''),
            onClick: function() { onSelect(activity); },
          },
            React.createElement('div', { className: 'activity-card__color-bar', style: { background: activity.color } }),
            React.createElement('div', { className: 'activity-card__info' },
              React.createElement('div', { className: 'activity-card__name' }, activity.name),
              React.createElement('div', { className: 'activity-card__date' }, formatDate(activity.date)),
              React.createElement('div', { className: 'activity-card__stats' },
                React.createElement('span', null, formatDistance(activity.distance)),
                React.createElement('span', null, formatDuration(activity.duration))
              )
            ),
            React.createElement('span', { className: 'activity-card__source' }, activity.source === 'strava' ? 'Strava' : '文件'),
            React.createElement('button', {
              className: 'activity-card__delete',
              onClick: function(e) { e.stopPropagation(); onDelete(activity.id); },
              title: '删除',
            }, '\u2715')
          );
        })
      )
    )
  );
}