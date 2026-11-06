@echo off
chcp 65001 >nul
title Dừng Hệ Thống Badminton Tournament Platform
cd /d "%~dp0"

echo =======================================================================
echo         DỪNG TOÀN BỘ HỆ THỐNG BADMINTON TOURNAMENT PLATFORM
echo =======================================================================
echo.

echo Đang đóng các tiến trình Node.js (Frontend & Backend)...
taskkill /F /FI "WINDOWTITLE eq Badminton Backend API [Port 4000]*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Badminton Frontend [Port 3000]*" >nul 2>&1

:: Kill processes listening on ports 4000 and 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :4000 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo -^> Đã dừng Backend và Frontend thành công!

echo.
set /p STOP_DOCKER="Bạn có muốn tắt luôn Database PostgreSQL và Redis không? (y/N): "
if /i "%STOP_DOCKER%"=="y" (
    echo Đang dừng containers...
    docker compose stop postgres redis
    echo -^> Đã dừng containers PostgreSQL và Redis!
)

echo.
echo Hệ thống đã được dừng hoàn tất.
timeout /t 3 >nul
