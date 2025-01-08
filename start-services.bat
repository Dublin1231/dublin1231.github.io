@echo off
echo 启动所有服务...

:: 启动MySQL服务
echo 正在启动 MySQL 服务...
net start MySQL

:: 启动后端服务
echo 正在启动后端服务...
cd chat-server
start cmd /k "npm run dev"

:: 启动前端服务
echo 正在启动前端服务...
cd ..
start cmd /k "npm run serve"

echo 所有服务已启动！
echo 前端服务运行在: http://localhost:8080
echo 后端服务运行在: http://localhost:3000
echo MySQL服务已启动

pause 