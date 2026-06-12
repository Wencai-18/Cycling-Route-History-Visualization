// strava.js - Strava PKCE OAuth + API integration
// Depends on: polyline (global)

var StravaService = (function() {

  const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
  const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
  const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
  const STORAGE_KEY_TOKEN = 'strava_token';
  const STORAGE_KEY_VERIFIER = 'strava_code_verifier';
  const STORAGE_KEY_CLIENT_ID = 'strava_client_id';
  const STORAGE_KEY_CLIENT_SECRET = 'strava_client_secret';

  function generateCodeVerifier() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    var bin = '';
    for (var i = 0; i < array.length; i++) {
      bin += String.fromCharCode(array[i]);
    }
    return btoa(bin)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '').substring(0, 128);
  }

  async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    var hashArray = new Uint8Array(hash);
    var bin = '';
    for (var i = 0; i < hashArray.length; i++) {
      bin += String.fromCharCode(hashArray[i]);
    }
    return btoa(bin)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function getClientId() { return localStorage.getItem(STORAGE_KEY_CLIENT_ID) || ''; }
  function setClientId(id) { localStorage.setItem(STORAGE_KEY_CLIENT_ID, id); }
  function getClientSecret() { return localStorage.getItem(STORAGE_KEY_CLIENT_SECRET) || ''; }
  function setClientSecret(s) { localStorage.setItem(STORAGE_KEY_CLIENT_SECRET, s); }

  function isConnected() {
    const tokenData = getToken();
    if (!tokenData) return false;
    return tokenData.expires_at > Date.now() / 1000;
  }

  function getToken() {
    try { const raw = localStorage.getItem(STORAGE_KEY_TOKEN); return raw ? JSON.parse(raw) : null; }
    catch(e) { return null; }
  }

  function setToken(token) { localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(token)); }

  async function startStravaAuth(clientId, clientSecret) {
    if (!clientId || !/^\d+$/.test(clientId.trim())) {
      throw new Error('Client ID 格式无效，请输入纯数字的 Strava Client ID');
    }
    setClientId(clientId.trim());
    if (clientSecret) setClientSecret(clientSecret.trim());
    const redirectUri = window.location.origin + window.location.pathname;
    console.log('Strava redirect_uri:', redirectUri);
    const params = new URLSearchParams({
      client_id: clientId.trim(), response_type: 'code', redirect_uri: redirectUri,
      approval_prompt: 'auto', scope: 'read,activity:read_all',
    });
    window.location.href = STRAVA_AUTH_URL + '?' + params.toString();
  }

  async function handleStravaCallback(code) {
    const verifier = localStorage.getItem(STORAGE_KEY_VERIFIER);
    if (!verifier) throw new Error('OAuth verifier 未找到');
    const clientId = getClientId();
    if (!clientId) throw new Error('请先设置 Strava Client ID');
    const redirectUri = window.location.origin + window.location.pathname;

    var params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', getClientSecret());
    params.append('code', code);
    params.append('grant_type', 'authorization_code');

    const resp = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    if (!resp.ok) {
      var errBody = '';
      try { errBody = await resp.text(); } catch(e) {}
      throw new Error('Token 交换失败 (HTTP ' + resp.status + ': ' + errBody + ')');
    }
    const token = await resp.json();
    setToken(token);
    localStorage.removeItem(STORAGE_KEY_VERIFIER);
    return token;
  }

  async function refreshToken() {
    const token = getToken();
    if (!token?.refresh_token) throw new Error('无 refresh token');
    var rparams = new URLSearchParams();
    rparams.append('client_id', getClientId());
    rparams.append('grant_type', 'refresh_token');
    rparams.append('refresh_token', token.refresh_token);
    const resp = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: rparams.toString(),
    });
    if (!resp.ok) throw new Error('Token 刷新失败');
    const newToken = await resp.json();
    setToken(newToken);
    return newToken;
  }

  async function ensureToken() {
    const token = getToken();
    if (!token) throw new Error('未连接 Strava');
    if (token.expires_at < Date.now() / 1000 + 60) return refreshToken();
    return token;
  }

  async function fetchActivities(page, perPage) {
    page = page || 1; perPage = perPage || 50;
    const token = await ensureToken();
    const resp = await fetch(STRAVA_API_BASE + '/athlete/activities?page=' + page + '&per_page=' + perPage, {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (!resp.ok) throw new Error('获取活动列表失败');
    return resp.json();
  }

  async function fetchActivityStreams(activityId) {
    const token = await ensureToken();
    const keys = 'latlng,distance,altitude,velocity_smooth,time';
    const resp = await fetch(STRAVA_API_BASE + '/activities/' + activityId + '/streams?keys=' + keys + '&key_by_type=true', {
      headers: { Authorization: 'Bearer ' + token.access_token },
    });
    if (!resp.ok) throw new Error('获取活动数据流失败');
    return resp.json();
  }

  function convertStravaActivity(activity, streams, color) {
    const coordinates = [];
    if (streams?.latlng?.data) {
      for (let i = 0; i < streams.latlng.data.length; i++) {
        const pt = streams.latlng.data[i];
        coordinates.push([pt[1], pt[0]]);
      }
    } else if (activity.map?.summary_polyline) {
      const decoded = polyline.decode(activity.map.summary_polyline);
      for (let i = 0; i < decoded.length; i++) {
        coordinates.push([decoded[i][1], decoded[i][0]]);
      }
    }

    const elevations = streams?.altitude?.data || [];

    return {
      name: activity.name || '未命名活动',
      date: activity.start_date || new Date().toISOString(),
      distance: Math.round(activity.distance || 0),
      duration: activity.moving_time || activity.elapsed_time || 0,
      avgSpeed: activity.average_speed ? Math.round(activity.average_speed * 3.6 * 10) / 10 : 0,
      elevation: Math.round(activity.total_elevation_gain || 0),
      routeGeoJSON: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: { name: activity.name, elevations } }],
      },
      color, source: 'strava', stravaId: activity.id, elevations,
    };
  }

  function disconnect() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_VERIFIER);
    localStorage.removeItem(STORAGE_KEY_CLIENT_SECRET);
  }

  return {
    getClientId, setClientId, getClientSecret, setClientSecret,
    isConnected, getToken, startStravaAuth,
    handleStravaCallback, fetchActivities, fetchActivityStreams,
    convertStravaActivity, disconnect,
  };
})();