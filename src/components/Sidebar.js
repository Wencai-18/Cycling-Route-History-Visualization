// Sidebar.js - File import dropzone + activity tree by year/month + batch management
// Depends on: React (global)

function Sidebar(props) {
  const { activities, selectedId, onSelect, onDelete, onBatchDelete, onFilesDrop, loading, hiddenIds, onToggleVisibility, onBatchToggleVisibility } = props;
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const [dropActive, setDropActive] = React.useState(false);
  const [manageMode, setManageMode] = React.useState(false);
  const [selected, setSelected] = React.useState({});
  const [expanded, setExpanded] = React.useState({});

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

  // Toggle expand
  function toggleExpand(key) {
    setExpanded(function(prev) { var e = {}; Object.assign(e, prev); e[key] = !e[key]; return e; });
  }

  // Build year/month tree
  function buildTree() {
    var groups = {};
    // Sort activities by date descending
    var sorted = filtered.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    sorted.forEach(function(a) {
      var d = new Date(a.date);
      var y = String(d.getFullYear());
      var m = String(d.getMonth() + 1);
      if (!groups[y]) groups[y] = {};
      if (!groups[y][m]) groups[y][m] = [];
      groups[y][m].push(a);
    });
    // Sort years descending, months descending
    var result = [];
    Object.keys(groups).sort(function(a,b){return Number(b)-Number(a);}).forEach(function(y) {
      var months = [];
      Object.keys(groups[y]).sort(function(a,b){return Number(b)-Number(a);}).forEach(function(m) {
        months.push({ month: m, label: m + '月', activities: groups[y][m] });
      });
      var yearTotal = months.reduce(function(s,m){return s+m.activities.length;}, 0);
      result.push({ year: y, label: y + ' 年', total: yearTotal, months: months });
    });
    return result;
  }

  var tree = buildTree();
  var allActivitiesFlat = filtered;

  // Batch management
  function toggleSelect(id) {
    setSelected(function(prev) { var s = {}; Object.assign(s, prev); s[id] = !s[id]; return s; });
  }

  function selectAll() {
    var allSelected = allActivitiesFlat.every(function(a) { return selected[a.id]; });
    if (allSelected) {
      setSelected({});
    } else {
      var s = {};
      allActivitiesFlat.forEach(function(a) { s[a.id] = true; });
      setSelected(s);
    }
  }

  function selectGroup(activities) {
    var allSelected = activities.every(function(a) { return selected[a.id]; });
    setSelected(function(prev) {
      var s = {}; Object.assign(s, prev);
      activities.forEach(function(a) { s[a.id] = !allSelected; });
      return s;
    });
  }

  function deleteSelected() {
    var ids = Object.keys(selected).filter(function(k) { return selected[k]; }).map(Number);
    if (ids.length === 0) return;
    if (confirm('确定删除选中的 ' + ids.length + ' 条路线吗？此操作不可撤销。')) {
      onBatchDelete(ids);
    }
  }

  function deleteAll() {
    if (allActivitiesFlat.length === 0) return;
    if (confirm('确定删除当前筛选结果中的全部 ' + allActivitiesFlat.length + ' 条路线吗？此操作不可撤销。')) {
      onBatchDelete(allActivitiesFlat.map(function(a){return Number(a.id);}));
    }
  }

  var selCount = Object.values(selected).filter(Boolean).length;
  var allChecked = allActivitiesFlat.length > 0 && allActivitiesFlat.every(function(a) { return selected[a.id]; });

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
    var d = new Date(iso);
    return d.getDate() + '日 ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  }

  // Helper: group-level checkbox state
  function groupCheckState(activities) {
    var checked = activities.filter(function(a) { return selected[a.id]; }).length;
    if (checked === 0) return 'none';
    if (checked === activities.length) return 'all';
    return 'some';
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
        value: filter, onChange: function(e) { setFilter(e.target.value); },
        style: { background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', fontSize: 12, padding: '4px 6px' },
      },
        React.createElement('option', { value: 'all' }, '全部'),
        React.createElement('option', { value: 'file' }, '文件导入'),
        React.createElement('option', { value: 'strava' }, 'Strava')
      ),
      React.createElement('button', {
        onClick: function() { setManageMode(!manageMode); setSelected({}); },
        style: {
          padding: '3px 10px', background: manageMode ? 'var(--accent)' : 'var(--bg-input)',
          color: manageMode ? '#fff' : 'var(--text-secondary)',
          border: '1px solid ' + (manageMode ? 'var(--accent)' : 'var(--border-color)'),
          borderRadius: 'var(--radius-sm)', fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
        },
      }, manageMode ? '完成' : '管理')
    ),

    // Batch bar
    manageMode && React.createElement('div', {
      style: { display:'flex', alignItems:'center', gap:8, padding:'6px 10px', background:'var(--bg-hover)', borderBottom:'1px solid var(--border-color)', fontSize:12 }
    },
      React.createElement('label', { style: { display:'flex', alignItems:'center', gap:6, cursor:'pointer', flex:1 } },
        React.createElement('input', { type:'checkbox', checked:allChecked, onChange:selectAll }),
        React.createElement('span', { style:{color:'var(--text-muted)'} }, selCount>0 ? '已选 '+selCount+' / '+allActivitiesFlat.length : '全选')
      ),
      React.createElement('button', {
        onClick: deleteSelected, disabled: selCount===0,
        style: { padding:'3px 8px', borderRadius:'var(--radius-sm)', border:'none', cursor:selCount>0?'pointer':'default', background:selCount>0?'var(--danger)':'var(--bg-input)', color:selCount>0?'#fff':'var(--text-muted)', fontSize:11 }
      }, '删除选中'),
      React.createElement('button', {
        onClick: deleteAll, disabled: allActivitiesFlat.length===0,
        style: { padding:'3px 8px', borderRadius:'var(--radius-sm)', border:'1px solid var(--border-color)', cursor:'pointer', background:'transparent', color:'var(--text-muted)', fontSize:11 }
      }, '全部删除')
    ),

    // Tree list
    React.createElement('div', { className: 'sidebar__list' },
      tree.length === 0 ? (
        React.createElement('div', { className: 'sidebar__empty' },
          activities.length === 0 ? '还没有导入任何骑行路线\n拖拽 GPX 或 FIT 文件开始' : '没有匹配的活动'
        )
      ) : (
        tree.map(function(yearGroup) {
          var yrKey = 'y-' + yearGroup.year;
          var yrOpen = expanded[yrKey] !== false; // default open
          var yrCheck = manageMode ? groupCheckState(yearGroup.months.reduce(function(arr, m) { return arr.concat(m.activities); }, [])) : null;

          return React.createElement('div', { key: yrKey },
            // Year header
            React.createElement('div', {
              onClick: function() { if (!manageMode) toggleExpand(yrKey); },
              style: {
                display:'flex', alignItems:'center', gap:6, padding:'7px 10px',
                cursor: manageMode?'default':'pointer', fontWeight:600, fontSize:13,
                color:'var(--text-primary)', borderBottom:'1px solid var(--border-color)',
                background: 'var(--bg-panel)',
              }
            },
              manageMode && React.createElement('input', {
                type:'checkbox', checked: yrCheck==='all', ref: function(el) { if (el) el.indeterminate = yrCheck==='some'; },
                onChange: function() { selectGroup(yearGroup.months.reduce(function(arr,m){return arr.concat(m.activities);},[])); },
                onClick: function(e) { e.stopPropagation(); },
                style: { marginRight:2, accentColor:'var(--accent)' },
              }),
              React.createElement('span', { style:{fontSize:14, transition:'transform 0.15s', display:'inline-block', transform: yrOpen?'rotate(90deg)':'rotate(0deg)'} }, '\u25B6'),
              React.createElement('span', { style:{fontSize:15, marginRight:2} }, yrOpen ? '\uD83D\uDCC2' : '\uD83D\uDCC1'),
              React.createElement('span', { style:{flex:1} }, yearGroup.label),
              React.createElement('span', { style:{fontSize:11, color:'var(--text-muted)', fontWeight:400} }, yearGroup.total + ' 条'), !manageMode && React.createElement('button', { onClick: function(e) { e.stopPropagation(); var ids = yearGroup.months.reduce(function(arr,m){return arr.concat(m.activities.map(function(a){return a.id;}));},[]); var allHidden = ids.every(function(id){return hiddenIds&&hiddenIds[id];}); onBatchToggleVisibility(ids, !allHidden); }, title: '切换年份显示', style: { background:'none', border:'none', cursor:'pointer', fontSize:13, padding:'0 2px', color:'var(--text-muted)', opacity:0.5, lineHeight:1 } }, '\uD83D\uDC41')
            ),

            // Months
            yrOpen && yearGroup.months.map(function(monthGroup) {
              var moKey = 'm-' + yearGroup.year + '-' + monthGroup.month;
              var moOpen = expanded[moKey] !== false;
              var moCheck = manageMode ? groupCheckState(monthGroup.activities) : null;

              return React.createElement('div', { key: moKey },
                // Month header
                React.createElement('div', {
                  onClick: function() { if (!manageMode) toggleExpand(moKey); },
                  style: {
                    display:'flex', alignItems:'center', gap:6, padding:'5px 10px 5px 28px',
                    cursor: manageMode?'default':'pointer', fontSize:12, fontWeight:500,
                    color:'var(--text-secondary)', background:'var(--bg-input)',
                    borderBottom:'1px solid var(--border-color)',
                  }
                },
                  manageMode && React.createElement('input', {
                    type:'checkbox', checked: moCheck==='all', ref: function(el) { if (el) el.indeterminate = moCheck==='some'; },
                    onChange: function() { selectGroup(monthGroup.activities); },
                    onClick: function(e) { e.stopPropagation(); },
                    style: { marginRight:2, accentColor:'var(--accent)' },
                  }),
                  React.createElement('span', { style:{fontSize:10, transition:'transform 0.15s', display:'inline-block', width:12, textAlign:'center', transform: moOpen?'rotate(90deg)':'rotate(0deg)'} }, '\u25B6'),
                  React.createElement('span', { style:{flex:1} }, monthGroup.label),
                  React.createElement('span', { style:{fontSize:10, color:'var(--text-muted)', fontWeight:400} }, monthGroup.activities.length + ' 条'), !manageMode && React.createElement('button', { onClick: function(e) { e.stopPropagation(); var ids = monthGroup.activities.map(function(a){return a.id;}); var allHidden = ids.every(function(id){return hiddenIds&&hiddenIds[id];}); onBatchToggleVisibility(ids, !allHidden); }, title: '切换月份显示', style: { background:'none', border:'none', cursor:'pointer', fontSize:12, padding:'0 2px', color:'var(--text-muted)', opacity:0.5, lineHeight:1 } }, '\uD83D\uDC41')
                ),

                // Activities
                moOpen && monthGroup.activities.map(function(activity) {
                  var isChecked = !!selected[activity.id];
                  return React.createElement('div', {
                    key: activity.id,
                    className: 'activity-card' + (selectedId===activity.id?' activity-card--active':'') + (isChecked?' activity-card--selected':''),
                    onClick: function() {
                      if (manageMode) { toggleSelect(activity.id); }
                      else { onSelect(activity); }
                    },
                    style: { paddingLeft: manageMode?46:38 }
                  },
                    manageMode && React.createElement('input', {
                      type:'checkbox', checked:isChecked,
                      onChange: function() { toggleSelect(activity.id); },
                      onClick: function(e) { e.stopPropagation(); },
                      style: { marginRight:8, accentColor:'var(--accent)', flexShrink:0 },
                    }),
                    React.createElement('div', { className:'activity-card__color-bar', style:{background:activity.color} }),
                    React.createElement('div', { className:'activity-card__info' },
                      React.createElement('div', { className:'activity-card__name' }, activity.name),
                      React.createElement('div', { className:'activity-card__date' }, formatDate(activity.date)),
                      React.createElement('div', { className:'activity-card__stats' },
                        React.createElement('span', null, formatDistance(activity.distance)),
                        React.createElement('span', null, formatDuration(activity.duration))
                      )
                    ),
                    React.createElement('span', { className:'activity-card__source' }, activity.source==='strava'?'Strava':'文件'),
                    !manageMode && React.createElement(React.Fragment, null,
                      React.createElement('button', {
                        onClick: function(e) { e.stopPropagation(); onToggleVisibility(activity.id); },
                        title: hiddenIds && hiddenIds[activity.id] ? '显示路线' : '隐藏路线',
                        style: {
                          background:'none', border:'none', cursor:'pointer', fontSize:14, padding:'0 4px',
                          color: hiddenIds && hiddenIds[activity.id] ? 'var(--text-muted)' : 'var(--text-secondary)',
                          opacity: hiddenIds && hiddenIds[activity.id] ? 0.4 : 0.7, lineHeight:1,
                        }
                      }, hiddenIds && hiddenIds[activity.id] ? '\u{1F441}\u{200D}\u{1F5E8}' : '\uD83D\uDC41'),
                      React.createElement('button', {
                        className:'activity-card__delete',
                        onClick: function(e) { e.stopPropagation(); onDelete(activity.id); },
                        title:'删除',
                      }, '\u2715')
                    )
                  );
                })
              );
            })
          );
        })
      )
    )
  );
}