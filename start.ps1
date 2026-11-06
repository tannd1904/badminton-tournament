# PowerShell Launcher for Badminton Tournament Platform
$ErrorActionPreference = "Stop"

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "     KHỞI ĐỘNG HỆ THỐNG BADMINTON TOURNAMENT MANAGEMENT PLATFORM      " -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Setup PATH with Node 20
$node20Path = "C:\Users\ASUS\AppData\Local\Programs\node20\node-v20.18.0-win-x64"
if (Test-Path "$node20Path\node.exe") {
    $env:PATH = "$node20Path;" + $env:PATH
}

# 2. Check Docker
Write-Host "[1/4] Kiểm tra dịch vụ Docker..." -ForegroundColor Yellow
$dockerOk = $false
try {
    $dockerInfo = docker info 2>$null
    if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
} catch {}

if (-not $dockerOk) {
    Write-Host "Docker chưa chạy. Đang tự động khởi động Docker Desktop..." -ForegroundColor Magenta
    Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = '"C:\Program Files\Docker\Docker\Docker Desktop.exe"'} | Out-Null
    Write-Host "Đang chờ Docker Engine sẵn sàng..." -ForegroundColor Gray
    
    $retries = 0
    while (-not $dockerOk -and $retries -lt 30) {
        Start-Sleep -Seconds 2
        $retries++
        try {
            $dockerInfo = docker info 2>$null
            if ($LASTEXITCODE -eq 0) { $dockerOk = $true }
        } catch {}
    }
}
Write-Host "-> Docker đã sẵn sàng!" -ForegroundColor Green

# 3. Start PostgreSQL and Redis
Write-Host "`n[2/4] Khởi động cơ sở dữ liệu PostgreSQL 16 và Redis 7..." -ForegroundColor Yellow
docker compose up -d postgres redis
Write-Host "-> PostgreSQL và Redis đã sẵn sàng!" -ForegroundColor Green

# 4. Start Backend NestJS
Write-Host "`n[3/4] Khởi động Backend API (Port 4000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k title Badminton Backend API [Port 4000] && cd /d `"$PSScriptRoot\backend`" && node dist/main.js"

# 5. Start Frontend Next.js
Write-Host "`n[4/4] Khởi động Frontend Next.js (Port 3000)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/k title Badminton Frontend [Port 3000] && cd /d `"$PSScriptRoot\frontend`" && npm run start"

Write-Host "`n=======================================================================" -ForegroundColor Cyan
Write-Host "          TẤT CẢ DỊCH VỤ ĐÃ ĐƯỢC KHỞI ĐỘNG THÀNH CÔNG!                 " -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host " - Frontend Web UI:    http://localhost:3000" -ForegroundColor White
Write-Host " - Backend API:        http://localhost:4000/api/v1" -ForegroundColor White
Write-Host " - Live Scores Hub:    http://localhost:3000/live" -ForegroundColor White
Write-Host "`nTài khoản thử nghiệm:" -ForegroundColor Yellow
Write-Host " - Quản trị viên:       admin@badmintonpro.vn      (Mật khẩu: Password@123)" -ForegroundColor Gray
Write-Host " - Ban Tổ Chức:        organizer@badmintonpro.vn  (Mật khẩu: Password@123)" -ForegroundColor Gray
Write-Host " - Trọng tài:          referee1@badmintonpro.vn   (Mật khẩu: Password@123)" -ForegroundColor Gray
Write-Host "=======================================================================" -ForegroundColor Cyan

Write-Host "`nĐang mở trình duyệt..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
