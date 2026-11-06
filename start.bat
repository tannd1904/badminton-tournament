@echo off
chcp 65001 >nul
title Khởi Động Hệ Thống Badminton Tournament Platform
cd /d "%~dp0"

echo =======================================================================
echo     KHỞI ĐỘNG HỆ THỐNG BADMINTON TOURNAMENT MANAGEMENT PLATFORM
echo =======================================================================
echo.

:: 1. Setup PATH with Node 20 if present
if exist "C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64\node.exe" (
    set "PATH=C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64;%PATH%"
)

:: 2. Check Docker
echo [1/4] Kiểm tra dịch vụ Docker...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker chưa khởi động. Đang bật Docker Desktop...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = '\"C:\Program Files\Docker\Docker\Docker Desktop.exe\"'} | Out-Null"
    echo Đang chờ Docker Engine sẵn sàng (khoảng 15-20 giây)...
    :WAIT_DOCKER
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 goto WAIT_DOCKER
)
echo -^> Docker đã sẵn sàng!

:: 3. Start PostgreSQL and Redis
echo.
echo [2/4] Khởi động cơ sở dữ liệu PostgreSQL 16 và Redis 7...
docker compose up -d postgres redis
echo -^> PostgreSQL và Redis đã sẵn sàng!

:: 4. Start Backend API
echo.
echo [3/4] Khởi động Backend NestJS API (Port 4000)...
start "Badminton Backend API [Port 4000]" cmd /k "cd /d "%~dp0backend" && if exist "C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64\node.exe" set "PATH=C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64;%PATH%" && node dist/main.js"

:: 5. Start Frontend
echo.
echo [4/4] Khởi động Frontend Next.js (Port 3000)...
start "Badminton Frontend [Port 3000]" cmd /k "cd /d "%~dp0frontend" && if exist "C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64\node.exe" set "PATH=C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64;%PATH%" && npm run start"

echo.
echo =======================================================================
echo          TẤT CẢ DỊCH VỤ ĐÃ ĐƯỢC KHỞI ĐỘNG THÀNH CÔNG!
echo =======================================================================
echo  - Frontend Web UI:    http://localhost:3000
echo  - Backend API:        http://localhost:4000/api/v1
echo  - Live Scores Hub:    http://localhost:3000/live
echo.
echo  Tài khoản thử nghiệm:
echo  - Quản trị viên:       admin@badmintonpro.vn      (Mật khẩu: Password@123)
echo  - Ban Tổ Chức:        organizer@badmintonpro.vn  (Mật khẩu: Password@123)
echo  - Trọng tài:          referee1@badmintonpro.vn   (Mật khẩu: Password@123)
echo =======================================================================
echo.
echo Đang mở trình duyệt tự động vào http://localhost:3000...
timeout /t 3 /nobreak >nul
start http://localhost:3000
