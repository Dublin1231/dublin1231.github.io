@echo off
echo 停止所有服务...

:: 停止MySQL服务
echo 正在停止 MySQL 服务...
net stop MySQL

:: 停止Node.js进程
echo 正在停止 Node.js 进程...
taskkill /F /IM node.exe

echo 所有服务已停止！

pause 