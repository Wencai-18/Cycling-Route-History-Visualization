# 🚴 骑行路线可视化

将 GPX/FIT 骑行记录、Strava 活动数据或 iGPSPORT 历史记录叠加到交互式地图上，支持路线模式和热力图模式。

## 功能

| 功能 | 说明 |
|------|------|
| **iGPSPORT 导入** | 账号密码一键登录，自动拉取全部历史活动 FIT 文件 |
| **文件导入** | 拖拽 `.gpx` / `.fit` 文件，自动解析 GPS 轨迹 |
| **Strava 集成** | PKCE OAuth 免后端授权，同步活动数据 |
| **路线模式** | 每条路线独立颜色，点击查看距离/时间/均速/爬升/海拔剖面 |
| **热力图模式** | 路线重叠处颜色加深，可调颜色和透明度 |
| **数据持久化** | IndexedDB 存储，刷新不丢失；搜索、筛选、删除 |
| **深色主题** | 运动风格暗色设计，OpenStreetMap + CSS 暗色滤镜 |

## 快速开始

### Windows

双击 `start.bat`，浏览器自动打开 `http://127.0.0.1:5173`。

> iGPSPORT 功能需要本地代理服务器，不能直接双击 `index.html`。

### 手动

```bash
node server.js
# 浏览器打开 http://127.0.0.1:5173
```

## 使用说明

### iGPSPORT 导入

1. 点击顶栏 **iGPSPORT** 按钮
2. 选择「账号登录」→ 输入手机号和密码 → 点击「登录并获取活动」
3. 可选设置日期范围筛选
4. 勾选要导入的活动 → 点击「导入选中」
5. 等待下载完成，路线自动显示在地图上

> 备用方案：切换到「Token 登录」标签，从浏览器 Console 执行 `localStorage.getItem("access_token")` 获取 Token 粘贴。

### 文件导入

将 `.gpx` 或 `.fit` 文件拖入左侧虚线框即可。

### 路线交互

- **点击路线** — 高亮并弹出底部详情卡（距离、时间、均速、爬升、海拔剖面）
- **点击左侧列表** — 选中对应路线
- **搜索/筛选** — 左侧支持按名称搜索和按来源筛选
- **删除** — 列表右侧 ❌ 按钮

### 热力图模式

点击顶栏 **🔥 热力图** 切换。点击 **⚙** 打开设置面板：

- 调整叠加颜色
- 调整透明度（0–100%）

> 调整参数时地图视角保持不变。

### Strava 连接（未测试）

1. [strava.com/settings/api](https://www.strava.com/settings/api) 创建应用
2. 回调域名设为 `http://127.0.0.1:5173`
3. 点击顶栏「连接 Strava」→ 输入 Client ID → 授权
4. 授权后自动拉取活动数据

## 项目结构

```
骑行历史可视化/
├── index.html              # 入口页面
├── start.bat               # Windows 一键启动
├── server.js               # HTTP 服务器 + iGPSPORT 代理
├── src/
│   ├── app.js              # 主应用（状态管理 + 布局）
│   ├── styles.css           # 深色主题样式
│   ├── lib/
│   │   ├── db.js           # Dexie IndexedDB 封装
│   │   ├── gpx-parser.js   # GPX XML → GeoJSON
│   │   ├── fit-parser.js   # FIT 二进制解码
│   │   └── strava.js       # Strava PKCE OAuth + API
│   └── components/
│       ├── Header.js           # 顶栏（模式切换/设置/Strava/iGPSPORT）
│       ├── Sidebar.js          # 侧栏（文件拖入/活动列表/搜索筛选）
│       ├── MapView.js          # Leaflet 地图 + 路线/热力图渲染
│       ├── ActivityDetail.js   # 底部详情卡（海拔剖面 SVG）
│       └── iGPSPORTPanel.js    # iGPSPORT 登录 + 活动选择 + 下载
```

## 技术栈

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架（CDN 加载，零构建） |
| Leaflet 1.9 | 交互式地图 + OpenStreetMap 瓦片 |
| Dexie.js 4 | IndexedDB 数据持久化 |
| @mapbox/polyline | Strava 折线解码 |
| Node.js (built-in) | 本地服务器 + iGPSPORT API 代理 |

## 参考

- iGPSPORT FIT 导出实现参考：[fooooxxxx/igpsport-export-fit-files](https://github.com/fooooxxxx/igpsport-export-fit-files)
