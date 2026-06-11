// app.js - Main application entry point
// Depends on: React, ReactDOM, AppDB, GPXParser, FITParser, StravaService
// Depends on: Header, Sidebar, MapView, ActivityDetail (all global functions)

(function() {
  const { useState, useEffect, useCallback } = React;

  function App() {
    const [activities, setActivities] = useState([]);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(null);
    const [stravaModal, setStravaModal] = useState(false);
    const [clientIdInput, setClientIdInput] = useState('');
    const [stravaConnected, setStravaConnected] = useState(false);
    const [athlete, setAthlete] = useState(null);
    const [importingStrava, setImportingStrava] = useState(false);
    const [viewMode, setViewMode] = useState('routes');
    const [heatmapColor, setHeatmapColor] = useState('#fc5200');
    const [heatmapOpacity, setHeatmapOpacity] = useState(0.15);
    const [igpsportOpen, setIgpsportOpen] = useState(false);

    // Load from DB
    useEffect(function() {
      AppDB.getAllActivities().then(setActivities);
    }, []);

    // Check Strava status
    useEffect(function() {
      setStravaConnected(StravaService.isConnected());
      const token = StravaService.getToken();
      if (token?.athlete) setAthlete(token.athlete);
      setClientIdInput(StravaService.getClientId());
    }, []);

    // Handle OAuth callback
    useEffect(function() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        showToast('Strava 授权被取消或失败', 'error');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (code) {
        window.history.replaceState({}, '', window.location.pathname);
        StravaService.handleStravaCallback(code).then(function(token) {
          setStravaConnected(true);
          if (token.athlete) setAthlete(token.athlete);
          showToast('Strava 连接成功！', 'success');
          importStravaActivities();
        }).catch(function(err) {
          showToast(err.message, 'error');
        });
      }
    }, []);

    function showToast(message, type) {
      type = type || '';
      setToast({ message: message, type: type });
      setTimeout(function() { setToast(null); }, 4000);
    }

    // File import
    const handleFilesDrop = useCallback(async function(files) {
      setLoading(true);
      let imported = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const ext = file.name.split('.').pop().toLowerCase();
          const color = await AppDB.getNextColor();

          let activity;
          if (ext === 'gpx') {
            activity = await GPXParser.parseGPXFile(file, color);
          } else if (ext === 'fit') {
            activity = await FITParser.parseFITFile(file, color);
          } else {
            continue;
          }

          const id = await AppDB.addActivity(activity);
          setActivities(function(prev) { return [{ id: id, name: activity.name, date: activity.date, distance: activity.distance, duration: activity.duration, avgSpeed: activity.avgSpeed, elevation: activity.elevation, routeGeoJSON: activity.routeGeoJSON, color: activity.color, source: activity.source, stravaId: activity.stravaId, elevations: activity.elevations }].concat(prev); });
          imported++;
        } catch (err) {
          showToast(file.name + ': ' + err.message, 'error');
        }
      }

      setLoading(false);
      if (imported > 0) showToast('成功导入 ' + imported + ' 条路线', 'success');
    }, []);

    // Select
    const handleSelectActivity = useCallback(function(activity) {
      setSelectedActivity(function(prev) { return prev?.id === activity.id ? null : activity; });
    }, []);

    // Delete
    const handleDeleteActivity = useCallback(async function(id) {
      await AppDB.deleteActivity(id);
      setActivities(function(prev) { return prev.filter(function(a) { return a.id !== id; }); });
      setSelectedActivity(function(prev) { return prev?.id === id ? null : prev; });
      showToast('路线已删除');
    }, []);

    const handleBatchDelete = useCallback(async function(ids) {
      if (!ids || ids.length === 0) return;
      await AppDB.deleteActivities(ids);
      setActivities(function(prev) { return prev.filter(function(a) { return ids.indexOf(Number(a.id)) === -1; }); });
      setSelectedActivity(function(prev) { return ids.indexOf(prev?.id) >= 0 ? null : prev; });
      showToast('已删除 ' + ids.length + ' 条路线');
    }, []);

    // Strava connect
    const handleConnectStrava = useCallback(function() {
      setStravaModal(true);
    }, []);

    const handleStravaModalConfirm = useCallback(function() {
      if (!clientIdInput.trim()) { showToast('请输入 Strava Client ID', 'error'); return; }
      setStravaModal(false);
      StravaService.startStravaAuth(clientIdInput.trim());
    }, [clientIdInput]);

    const handleDisconnectStrava = useCallback(function() {
      StravaService.disconnect();
      setStravaConnected(false);
      setAthlete(null);
      showToast('已断开 Strava 连接');
    }, []);

    // Import Strava activities
    async function importStravaActivities() {
      if (importingStrava) return;
      setImportingStrava(true);
      setLoading(true);

      try {
        const rawActivities = await StravaService.fetchActivities(1, 50);
        let imported = 0;

        for (let i = 0; i < rawActivities.length; i++) {
          const raw = rawActivities[i];
          if (!raw.start_latlng && !raw.map?.summary_polyline) continue;

          const existing = activities.find(function(a) { return a.stravaId === raw.id; });
          if (existing) continue;

          try {
            const color = await AppDB.getNextColor();
            let streams = null;
            try { streams = await StravaService.fetchActivityStreams(raw.id); } catch(e) {}

            const activity = StravaService.convertStravaActivity(raw, streams, color);
            const id = await AppDB.addActivity(activity);
            setActivities(function(prev) { return [{ id: id, name: activity.name, date: activity.date, distance: activity.distance, duration: activity.duration, avgSpeed: activity.avgSpeed, elevation: activity.elevation, routeGeoJSON: activity.routeGeoJSON, color: activity.color, source: activity.source, stravaId: activity.stravaId, elevations: activity.elevations }].concat(prev); });
            imported++;
          } catch(e) {}
        }

        if (imported > 0) showToast('从 Strava 导入了 ' + imported + ' 条路线', 'success');
        else if (rawActivities.length === 0) showToast('Strava 账户中没有活动数据', 'error');
        else showToast('所有活动已导入，没有新路线', 'error');
      } catch (err) {
        showToast('Strava 导入失败: ' + err.message, 'error');
      } finally {
        setLoading(false);
        setImportingStrava(false);
      }
    }

    return React.createElement('div', { className: 'app-shell' },
      // Header
      React.createElement(Header, {
        stravaConnected: stravaConnected,
        onConnectStrava: handleConnectStrava,
        onDisconnectStrava: handleDisconnectStrava,
        athlete: athlete,
        viewMode: viewMode,
        onToggleMode: function() { setViewMode(viewMode === 'heatmap' ? 'routes' : 'heatmap'); },
        heatmapColor: heatmapColor,
        heatmapOpacity: heatmapOpacity,
        onHeatmapColorChange: setHeatmapColor,
        onHeatmapOpacityChange: setHeatmapOpacity,
        onOpenIGPSPORT: function() { setIgpsportOpen(true); },
      }),
      // Body
      React.createElement('div', { className: 'app-body' },
        React.createElement(Sidebar, {
          activities: activities, selectedId: selectedActivity?.id,
          onSelect: handleSelectActivity, onDelete: handleDeleteActivity, onBatchDelete: handleBatchDelete,
          onFilesDrop: handleFilesDrop, loading: loading,
        }),
        React.createElement(MapView, {
          activities: activities, selectedId: selectedActivity?.id,
          onSelectActivity: handleSelectActivity,
          viewMode: viewMode,
          heatmapColor: heatmapColor,
          heatmapOpacity: heatmapOpacity,
        }),
        React.createElement(ActivityDetail, {
          activity: selectedActivity,
          onClose: function() { setSelectedActivity(null); },
        })
      ),
      // Strava modal
      stravaModal && React.createElement('div', { className: 'modal-overlay', onClick: function() { setStravaModal(false); } },
        React.createElement('div', { className: 'modal', onClick: function(e) { e.stopPropagation(); } },
          React.createElement('div', { className: 'modal__title' }, '连接 Strava'),
          React.createElement('div', { className: 'modal__desc' },
            '请输入你的 Strava API 应用 Client ID。',
            React.createElement('br'),
            '前往 ',
            React.createElement('a', { href: 'https://www.strava.com/settings/api', target: '_blank', rel: 'noopener', style: { color: 'var(--accent)' } }, 'strava.com/settings/api'),
            ' 创建应用，回调域名设为：',
            React.createElement('code', { style: { display:'block', marginTop:6, padding:'4px 8px', background:'var(--bg-input)', borderRadius:4, fontSize:12, color:'var(--text-secondary)' } },
              window.location.origin
            )
          ),
          React.createElement('input', {
            className: 'modal__input', type: 'text', placeholder: '输入 Client ID...',
            value: clientIdInput,
            onChange: function(e) { setClientIdInput(e.target.value); },
            onKeyDown: function(e) { if (e.key === 'Enter') handleStravaModalConfirm(); },
            autoFocus: true,
          }),
          React.createElement('div', { className: 'modal__actions' },
            React.createElement('button', { className: 'btn btn--ghost', onClick: function() { setStravaModal(false); } }, '取消'),
            React.createElement('button', { className: 'btn btn--primary', onClick: handleStravaModalConfirm }, '连接 Strava')
          )
        )
      ),
      // iGPSPORT Panel
      igpsportOpen && React.createElement(iGPSPORTPanel, {
        onImport: function(files) { handleFilesDrop(files); },
        onClose: function() { setIgpsportOpen(false); },
      }),
      // Toast
      toast && React.createElement('div', { className: 'toast' + (toast.type ? ' toast--' + toast.type : '') }, toast.message),
      // Loading overlay
      importingStrava && React.createElement('div', {
        style: { position:'fixed', inset:0, zIndex:1500, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' },
      },
        React.createElement('div', { style: { background:'var(--bg-panel)', padding:'24px 32px', borderRadius:'var(--radius-lg)', textAlign:'center' } },
          React.createElement('div', { className: 'spinner', style: { margin:'0 auto 12px' } }),
          React.createElement('div', { style: { fontSize:14 } }, '正在从 Strava 导入活动...')
        )
      )
    );
  }

  // Mount
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(App));
})();