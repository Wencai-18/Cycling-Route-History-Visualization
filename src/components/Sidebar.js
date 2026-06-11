// Sidebar.js - File import dropzone + activity list with batch management
// Depends on: React (global)

function Sidebar(props) {
  const { activities, selectedId, onSelect, onDelete, onBatchDelete, onFilesDrop, loading } = props;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [dropActive, setDropActive] = React.useState(false);
  const [manageMode, setManageMode] = React.useState(false);
  const [selected, setSelected] = React.useState({});

  // Exit manage mode when activities change (e.g., after delete)
  React.useEffect(function() {
    setManageMode(false);
    setSelected({});
  }, [activities.length]);

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

  // Batch management
  function toggleSelect(id) {
    setSelected(function(prev) { var s = {}; Object.assign(s, prev); s[id] = !s[id]; return s; });
  }

  function selectAll() {
    var allSelected = filtered.every(function(a) { return selected[a.id]; });
    if (allSelected) {
      setSelected({});
    } else {
      var s = {};
      filtered.forEach(function(a) { s[a.id] = true; });
      setSelected(s);
    }
  }

  function deleteSelected() {
    var ids = Object.keys(selected).filter(function(k) { return selected[k]; }).map(Number);
    if (ids.length === 0) return;
    if (confirm('确定删除选中的 ' + ids.length + ' 条路线吗？此操作不可撤销。')) {
      onBatchDelete(ids);
    }
  }

  function deleteAll() {
    if (filtered.length === 0) return;
    if (confirm('确定删除当前筛选结果中的全部 ' + filtered.length + ' 条路线吗？此操作不可撤销。')) {
      var ids = filtered.map(function(a) { return Number(a.id); });
      onBatchDelete(ids);
    }
  }

  var selCount = Object.values(selected).filter(Boolean).length;
  var allChecked = filtered.length > 0 && filtered.every(function(a) { return selected[a.id]; });

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
        style: { background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12 },
      },
        React.createElement('option', { value: 'all' }, '全部'),
        React.createElement('option', { value: 'file' }, '文件导入'),
        React.createElement('option', { value: 'strava' }, 'Strava')
      ),
      React.createElement('button', {
        className: 'btn btn--ghost btn--sm',
        onClick: function() { setManageMode(!manageMode); setSelected({}); },
        style: {
          background: manageMode ? 'var(--accent)' : 'var(--bg-input)',
          color: manageMode ? '#fff' : 'var(--text-secondary)',
          border: '1px solid ' + (manageMode ? 'var(--accent)' : 'var(--border-color)'),
          borderRadius: 'var(--radius-sm)', fontSize: 12, whiteSpace: 'nowrap',
        },
        title: '批量管理',
      }, manageMode ? '完成' : '管理')
    ),

    // Batch actions bar (shown in manage mode)
    manageMode && React.createElement('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
        background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', fontSize: 12,
      }
    },
      React.createElement('label', {
        style: { display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flex: 1 }
      },
        React.createElement('input', { type: 'checkbox', checked: allChecked, onChange: selectAll }),
        React.createElement('span', { style: { color: 'var(--text-muted)' } },
          selCount > 0 ? '已选 ' + selCount + ' / ' + filtered.length : '全选')
      ),
      React.createElement('button', {
        onClick: deleteSelected,
        disabled: selCount === 0,
        style: {
          padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: selCount > 0 ? 'pointer' : 'default',
          background: selCount > 0 ? 'var(--danger)' : 'var(--bg-input)',
          color: selCount > 0 ? '#fff' : 'var(--text-muted)', fontSize: 11,
        }
      }, '删除选中'),
      React.createElement('button', {
        onClick: deleteAll,
        disabled: filtered.length === 0,
        style: {
          padding: '3px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', cursor: 'pointer',
          background: 'transparent', color: 'var(--text-muted)', fontSize: 11,
        }
      }, '全部删除')
    ),

    // Activity list
    React.createElement('div', { className: 'sidebar__list' },
      filtered.length === 0 ? (
        React.createElement('div', { className: 'sidebar__empty' },
          activities.length === 0 ? '还没有导入任何骑行路线\n拖拽 GPX 或 FIT 文件开始' : '没有匹配的活动'
        )
      ) : (
        filtered.map(function(activity) {
          var isChecked = !!selected[activity.id];
          return React.createElement('div', {
            key: activity.id,
            className: 'activity-card' + (selectedId === activity.id ? ' activity-card--active' : '') + (isChecked ? ' activity-card--selected' : ''),
            onClick: function() {
              if (manageMode) { toggleSelect(activity.id); }
              else { onSelect(activity); }
            },
          },
            // Checkbox (manage mode only)
            manageMode && React.createElement('input', {
              type: 'checkbox',
              checked: isChecked,
              onChange: function() { toggleSelect(activity.id); },
              onClick: function(e) { e.stopPropagation(); },
              style: { marginRight: 8, accentColor: 'var(--accent)', flexShrink: 0 },
            }),
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
            !manageMode && React.createElement('button', {
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