@echo off
chcp 65001 >nul
title 骑行路线可视化 - 服务器

echo.
echo  ╔══════════════════════════════════════╗
echo  ║    骑行路线可视化                    ║
echo  ║    Cycling Route Visualizer          ║
echo  ╚══════════════════════════════════════╝
echo.
echo  服务器启动中...
echo.

set NODE=C:\Users\12833\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
set WORKSPACE=C:\Users\12833\Documents\骑行历史可视化

start "" http://127.0.0.1:5173

echo  地址: http://127.0.0.1:5173
echo  按 Ctrl+C 或关闭此窗口停止服务器
echo.
"%NODE%" "%WORKSPACE%\server.js" "%WORKSPACE%"

pause