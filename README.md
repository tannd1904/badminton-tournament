# Badminton Tournament Management Platform

A professional, real-time, enterprise-grade badminton tournament management platform built with NestJS, Next.js 14, Prisma ORM, PostgreSQL, Redis, and Socket.IO.

## Project Structure

```text
badminton/
├── backend/            # NestJS 10 API, Tournament Engine, Scheduling & Scoring Engines, Socket.IO
│   ├── prisma/         # Prisma schema and migrations
│   └── src/            # Modular backend services
├── frontend/           # Next.js 14 App Router, Tailwind CSS, shadcn/ui, TanStack Query
│   └── src/            # Features, public portal, organizer dashboard, umpire PWA, OBS overlay
├── docs/               # In-depth architectural & algorithmic documentation
└── docker-compose.yml  # Local infrastructure (PostgreSQL 16, Redis 7, Backend, Frontend)
```

## Quick Start (1-Click Run)

### Cách 1: Khởi động 1-Click trên Windows (Khuyên dùng)
Chỉ cần **nhấp đúp chuột vào file `start.bat`** (hoặc chạy `./start.ps1` trong PowerShell):
1. Tự động kiểm tra và khởi động Docker Desktop nếu chưa chạy.
2. Tự động khởi động container PostgreSQL 16 và Redis 7.
3. Tự động khởi chạy Backend NestJS API (`http://localhost:4000/api/v1`).
4. Tự động khởi chạy Frontend Next.js (`http://localhost:3000`).
5. Tự động mở trình duyệt web.

Để tắt toàn bộ hệ thống khi xong việc, chỉ cần nhấp đúp vào **`stop.bat`**.

---

### Cách 2: Khởi động thủ công từng bước (Manual Development)
- Node.js v18.17+ or v20.x LTS
- npm or pnpm
- Docker & Docker Compose (optional for local DB/Redis)

### 2. Environment Configuration
Copy `.env.example` in root and backend:
```bash
cp .env.example .env
```

### 3. Start Database & Redis (Docker)
```bash
docker compose up -d postgres redis
```

### 4. Setup Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
Backend runs on `http://localhost:4000/api/v1`

### 5. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`

## Documentation
- [System Architecture](file:///c:/NATA/Workspace/badminton/docs/SYSTEM_ARCHITECTURE.md)
- [Database Design & ERD](file:///c:/NATA/Workspace/badminton/docs/DATABASE_DESIGN.md)
- [Tournament Engine Specification](file:///c:/NATA/Workspace/badminton/docs/TOURNAMENT_ENGINE.md)
- [Badminton Scoring Engine (BWF)](file:///c:/NATA/Workspace/badminton/docs/SCORING_RULES.md)
- [Smart Scheduling Algorithm](file:///c:/NATA/Workspace/badminton/docs/SCHEDULING_ALGORITHM.md)
- [Role-Based Access Control (RBAC)](file:///c:/NATA/Workspace/badminton/docs/AUTHORIZATION.md)
- [API & WebSocket Specification](file:///c:/NATA/Workspace/badminton/docs/API_DOCUMENTATION.md)
- [Development Roadmap](file:///c:/NATA/Workspace/badminton/docs/DEVELOPMENT_ROADMAP.md)

