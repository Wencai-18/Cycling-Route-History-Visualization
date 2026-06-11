# 🚴 骑行路线可视化

将 GPX/FIT 骑行记录文件或 Strava 活动数据叠加到交互式地图上，支持路线模式和热力图模式。

## 功能

- **文件导入** — 拖拽 `.gpx` 或 `.fit` 文件，自动解析 GPS 轨迹并叠加到地图
- **Strava 集成** — PKCE OAuth 免后端授权，一键拉取历史活动
- **路线模式** — 每条路线独立颜色，点击查看详情（距离/时间/均速/爬升/海拔剖面）
- **热力图模式** — 路线重叠处颜色加深，直观展示常骑路段；可调颜色和透明度
- **数据持久化** — IndexedDB 存储，刷新不丢失；支持搜索、筛选、删除

## 快速开始

直接双击 `index.html` 在浏览器中打开即可。

或启动本地服务器（Strava OAuth 回调需要 HTTP 源）：

```bash
# Windows
start.bat

# 或手动
python -m http.server 5173 --directory .
```

打开 `http://127.0.0.1:5173`

## 使用说明

### 导入文件

将 `.gpx` 或 `.fit` 文件拖入左侧虚线框，路线自动显示在地图上。

### 路线交互

- **点击路线** — 高亮并弹出底部详情卡
- **点击地图空白** — 取消选中
- **左侧列表** — 搜索/筛选/删除活动

### 热力图模式

点击顶栏 **🌈 路线** → **🔥 热力图** 切换。点击 **⚙** 打开设置面板调整叠加颜色和透明度。

### Strava 连接

1. 前往 [strava.com/settings/api](https://www.strava.com/settings/api) 创建应用
2. 回调域名设为 `http://localhost:5173`（或你的实际域名）
3. 点击顶栏「连接 Strava」→ 输入 Client ID → 授权

## 项目结构

```
骑行历史可视化/
├── index.html          # 入口页面
├── start.bat           # Windows 一键启动
├── server.js           # 简易 HTTP 服务器
├── src/
│   ├── app.js          # 主应用（状态管理）
│   ├── styles.css      # 深色主题样式
│   ├── lib/
│   │   ├── db.js       # Dexie IndexedDB 封装
│   │   ├── gpx-parser.js  # GPX → GeoJSON
│   │   ├── fit-parser.js  # FIT 二进制解码
│   │   └── strava.js   # Strava OAuth + API
│   └── components/
│       ├── Header.js       # 顶栏（模式切换/设置/Strava）
│       ├── Sidebar.js      # 侧栏（文件导入/活动列表）
│       ├── MapView.js      # Leaflet 地图 + 路线渲染
│       └── ActivityDetail.js  # 底部详情卡
```

## 技术栈

- **React 18** — UI 框架
- **Leaflet** — 交互式地图（OpenStreetMap 瓦片 + CSS 暗色滤镜）
- **Dexie.js** — IndexedDB 数据持久化
- **@mapbox/polyline** — Strava 折线解码
- 纯 CDN 加载，零构建步骤