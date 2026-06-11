// iGPSPORTPanel.js - iGPSPORT activity download & import
// Depends on: React (global)
// Auth methods: username/password login, or paste token directly

function iGPSPORTPanel(props) {
  const { onImport, onClose } = props;
  const [step, setStep] = React.useState(1);
  const [authMode, setAuthMode] = React.useState('login');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [token, setToken] = React.useState('');
  const [activities, setActivities] = React.useState([]);
  const [selected, setSelected] = React.useState({});
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState('');
  const [totalPages, setTotalPages] = React.useState(0);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [allActivities, setAllActivities] = React.useState([]);
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  function getHeaders() {
    var h = { 'Accept': 'application/json' };
    if (token) {
      h['X-iGPSPORT-Token'] = token;
    }
    return h;
  }

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setStatus('请输入用户名和密码');
      return;
    }
    setLoading(true);
    setStatus('正在登录...');
    try {
      var resp = await fetch('/proxy/igpsport-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: password.trim() })
      });
      var data = await resp.json();
      if (resp.ok && data.token) {
        setToken(data.token);
        setStatus('登录成功！正在获取活动列表...');
        await fetchAllActivities(data.token);
      } else {
        setStatus('登录失败: ' + (data.error || data.message || '用户名或密码错误'));
      }
    } catch(e) {
      setStatus('登录请求失败: ' + e.message);
    }
    setLoading(false);
  }

  async function fetchAllActivities(overrideToken) {
    var useToken = overrideToken || token;
    if (!useToken) { setStatus('请先登录或输入 Token'); return; }
    setLoading(true);
    setStatus('正在获取活动列表...');

    try {
      var allRows = [];
      var page = 1;
      var totalPage = 1;
      var headers = {
        'Accept': 'application/json',
        'X-iGPSPORT-Token': useToken
      };

      while (page <= totalPage && page <= 50) {
        var params = '?pageNo=' + page + '&pageSize=50&reqType=0&sort=1';
        if (startDate) params += '&beginTime=' + startDate;
        if (endDate) params += '&endTime=' + endDate;

        var resp = await fetch('/proxy/igpsport/service/web-gateway/web-analyze/activity/queryMyActivity' + params, {
          headers: headers
        });
        var data = await resp.json();
        // API returns code:0 even on errors; error message is in data.data as string
        if (typeof data.data === 'string') {
          setStatus('获取失败: ' + data.data);
          setLoading(false);
          return;
        }
        if (!data.data || !Array.isArray(data.data.rows)) {
          setStatus('获取失败: ' + (data.message || '未知错误'));
          setLoading(false);
          return;
        }
        var rows = data.data.rows;
        allRows = allRows.concat(rows);
        totalPage = data.data.totalPage || 1;
        page++;
      }

      setAllActivities(allRows);
      setActivities(allRows);
      setTotalPages(totalPage);
      setStep(2);
      setStatus('找到 ' + allRows.length + ' 条活动');
    } catch(e) {
      setStatus('获取失败: ' + e.message);
    }
    setLoading(false);
  }

  async function downloadOne(activity) {
    var rideId = activity.rideId;
    if (!rideId) { setStatus('无法获取活动 ID'); return; }

    setStatus('正在下载: ' + (activity.title || rideId) + '...');

    try {
      var resp = await fetch('/proxy/download-fit/' + rideId, { headers: getHeaders() });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      var blob = await resp.blob();
      var disp = resp.headers.get('Content-Disposition') || '';
      var match = disp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      var fname = match ? match[1].replace(/['"]/g, '') : ('igpsport_' + rideId + '.fit');
      var file = new File([blob], fname, { type: 'application/octet-stream' });
      onImport([file]);
      setStatus('已导入: ' + fname);
      return true;
    } catch(e) {
      setStatus('下载失败: ' + e.message);
      return false;
    }
  }

  function handleSelectAll() {
    if (Object.keys(selected).length === activities.length && activities.length > 0) {
      setSelected({});
    } else {
      var all = {};
      activities.forEach(function(a) { all[a.rideId] = true; });
      setSelected(all);
    }
  }

  async function downloadSelected() {
    var ids = Object.keys(selected).filter(function(k) { return selected[k]; });
    if (ids.length === 0) { setStatus('请先选择活动'); return; }
    setLoading(true);

    var count = 0;
    for (var i = 0; i < activities.length; i++) {
      var a = activities[i];
      if (selected[a.rideId]) {
        var ok = await downloadOne(a);
        if (ok) count++;
      }
    }

    setLoading(false);
    setStatus('导入完成，成功 ' + count + ' 条');
    setStep(3);
  }

  function formatDate(d) {
    if (!d) return '';
    var s = String(d);
    return s.substring(0, 10).replace(/\./g, '-');
  }

  function formatDist(m) {
    if (!m) return '-';
    m = Number(m);
    if (m >= 1000) return (m/1000).toFixed(1) + ' km';
    return m + ' m';
  }

  return React.createElement('div', { className: 'modal-overlay', onClick: onClose },
    React.createElement('div', { className: 'modal', onClick: function(e) { e.stopPropagation(); }, style: { width: 580, maxHeight: '85vh', overflow: 'auto' } },

      // Step 1: Auth
      step === 1 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'modal__title' }, 'iGPSPORT 活动导入'),

        // Auth mode tabs
        React.createElement('div', {
          style: {
            display: 'flex', gap: 0, marginBottom: 16,
            background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: 3,
          }
        },
          React.createElement('button', {
            onClick: function() { setAuthMode('login'); },
            style: {
              flex: 1, padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: authMode === 'login' ? 'var(--accent)' : 'transparent',
              color: authMode === 'login' ? '#fff' : 'var(--text-secondary)',
            }
          }, '账号登录 (推荐)'),
          React.createElement('button', {
            onClick: function() { setAuthMode('token'); },
            style: {
              flex: 1, padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: authMode === 'token' ? 'var(--accent)' : 'transparent',
              color: authMode === 'token' ? '#fff' : 'var(--text-secondary)',
            }
          }, 'Token 登录')
        ),

        authMode === 'login' && React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'modal__desc', style: { marginBottom: 12 } },
            '使用 iGPSPORT 账号直接登录，自动获取活动数据。',
            React.createElement('br'),
            '账号密码仅用于获取 Token，不会保存。'
          ),
          React.createElement('input', {
            className: 'modal__input', type: 'text',
            placeholder: '手机号 / 用户名',
            value: username, onChange: function(e) { setUsername(e.target.value); },
          }),
          React.createElement('input', {
            className: 'modal__input', type: 'password',
            placeholder: '密码',
            value: password, onChange: function(e) { setPassword(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') handleLogin(); },
          }),
          React.createElement('div', { style: { marginBottom: 8, marginTop: 8 } },
            React.createElement('label', { style: { fontSize: 11, color: 'var(--text-muted)' } }, '日期范围（可选，留空下载全部）'),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
              React.createElement('input', {
                type: 'date', value: startDate,
                onChange: function(e) { setStartDate(e.target.value); },
                style: {
                  flex: 1, fontSize: 12, padding: '6px 8px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                }
              }),
              React.createElement('span', { style: { alignSelf: 'center', color: 'var(--text-muted)' } }, '~'),
              React.createElement('input', {
                type: 'date', value: endDate,
                onChange: function(e) { setEndDate(e.target.value); },
                style: {
                  flex: 1, fontSize: 12, padding: '6px 8px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                }
              })
            )
          ),
          React.createElement('div', { className: 'modal__actions' },
            React.createElement('button', { className: 'btn btn--ghost', onClick: onClose }, '取消'),
            React.createElement('button', {
              className: 'btn btn--primary', onClick: handleLogin,
              disabled: loading,
            }, loading ? '\u23F3 登录中...' : '登录并获取活动')
          )
        ),

        authMode === 'token' && React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'modal__desc', style: { marginBottom: 12 } },
            '如果你已有 Token，可直接粘贴。',
            React.createElement('br'),
            '在登录后的 iGPSPORT 页面按 F12，',
            React.createElement('br'),
            'Console 输入: ',
            React.createElement('code', { style: { background:'var(--bg-input)', padding:'1px 4px', borderRadius:2, fontSize:11 } },
              'localStorage.getItem("access_token")'
            ),
          ),
          React.createElement('input', {
            className: 'modal__input', type: 'text',
            placeholder: '粘贴 Token（如 eyJhbGciOi...）',
            value: token, onChange: function(e) { setToken(e.target.value); },
            style: { fontFamily: 'monospace', fontSize: 11 },
          }),
          React.createElement('div', { style: { marginBottom: 8, marginTop: 8 } },
            React.createElement('label', { style: { fontSize: 11, color: 'var(--text-muted)' } }, '日期范围（可选）'),
            React.createElement('div', { style: { display: 'flex', gap: 8 } },
              React.createElement('input', {
                type: 'date', value: startDate,
                onChange: function(e) { setStartDate(e.target.value); },
                style: {
                  flex: 1, fontSize: 12, padding: '6px 8px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                }
              }),
              React.createElement('span', { style: { alignSelf: 'center', color: 'var(--text-muted)' } }, '~'),
              React.createElement('input', {
                type: 'date', value: endDate,
                onChange: function(e) { setEndDate(e.target.value); },
                style: {
                  flex: 1, fontSize: 12, padding: '6px 8px',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                }
              })
            )
          ),
          React.createElement('div', { className: 'modal__actions' },
            React.createElement('button', { className: 'btn btn--ghost', onClick: onClose }, '取消'),
            React.createElement('button', {
              className: 'btn btn--primary', onClick: function() { fetchAllActivities(); },
              disabled: loading || !token.trim(),
            }, loading ? '\u23F3 获取中...' : '获取活动列表')
          )
        ),

        status && React.createElement('div', {
          style: {
            marginTop: 10, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: status.indexOf('失败') > -1 ? 'var(--danger)' : 'var(--text-secondary)'
          }
        }, status)
      ),

      // Step 2: Activity selection
      step === 2 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'modal__title' }, '选择活动 (' + activities.length + ' 条)'),
        React.createElement('div', { style: { marginBottom: 10 } },
          React.createElement('button', { className: 'btn btn--ghost btn--sm', onClick: handleSelectAll, style: { marginRight: 8 } },
            Object.keys(selected).length === activities.length ? '取消全选' : '全选'
          ),
          React.createElement('button', {
            className: 'btn btn--primary btn--sm', onClick: downloadSelected,
            disabled: loading,
          }, loading ? '\u23F3 导入中...' : '导入选中')
        ),
        React.createElement('div', { style: { maxHeight: 360, overflow: 'auto' } },
          activities.map(function(a) {
            var rid = a.rideId;
            return React.createElement('label', {
              key: rid,
              style: {
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                borderRadius: 4, cursor: 'pointer', fontSize: 12,
                background: selected[rid] ? 'var(--bg-hover)' : 'transparent',
              },
            },
              React.createElement('input', {
                type: 'checkbox', checked: !!selected[rid],
                onChange: function() {
                  setSelected(function(prev) { var s = {}; Object.assign(s, prev); s[rid] = !s[rid]; return s; });
                },
              }),
              React.createElement('span', { style: { flex: 1, color: 'var(--text-primary)' } }, a.title || ('活动 ' + rid)),
              React.createElement('span', { style: { color: 'var(--text-muted)', width: 80, textAlign: 'right' } }, formatDate(a.startTime)),
              React.createElement('span', { style: { color: 'var(--text-secondary)', width: 70, textAlign: 'right' } }, formatDist(a.distance))
            );
          })
        ),
        React.createElement('div', { className: 'modal__actions', style: { marginTop: 10 } },
          React.createElement('button', { className: 'btn btn--ghost', onClick: function() { setStep(1); } }, '返回'),
          React.createElement('button', { className: 'btn btn--ghost', onClick: onClose }, '关闭')
        ),
        status && React.createElement('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' } }, status)
      ),

      // Step 3: Done
      step === 3 && React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'modal__title' }, '导入完成'),
        React.createElement('div', { className: 'modal__desc' }, '活动已导入，可在地图上查看。'),
        React.createElement('div', { className: 'modal__actions' },
          React.createElement('button', { className: 'btn btn--ghost', onClick: function() { setStep(1); setActivities([]); setSelected({}); } }, '继续导入'),
          React.createElement('button', { className: 'btn btn--primary', onClick: onClose }, '关闭')
        )
      )
    )
  );
}