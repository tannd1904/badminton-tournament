# Deployment & Operations Guide

## 1. System Requirements & Architecture Topology

### Recommended Production Stack
- **Operating System**: Linux (Ubuntu 22.04 LTS / Debian 12) or Containerized Linux
- **Node.js**: v20.x LTS
- **Database**: PostgreSQL 16+ with connection pooling (PgBouncer recommended for >500 concurrent connections)
- **Cache & Message Broker**: Redis 7+
- **Reverse Proxy**: Nginx with SSL termination (Let's Encrypt / Certbot)
- **Object Storage**: AWS S3 or MinIO S3-compatible storage

---

## 2. Docker Compose Configuration (Local & Development)

The platform provides a unified `docker-compose.yml` defining:
1. `backend`: NestJS application container running on port 4000.
2. `frontend`: Next.js application container running on port 3000.
3. `postgres`: PostgreSQL 16 relational database container on port 5432.
4. `redis`: Redis 7 in-memory cache and pub/sub broker on port 6379.

---

## 3. Environment Variables Reference

A `.env.example` file is provided at the repository root and backend directory:

```env
# Application
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/badminton_db?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=super_secret_jwt_access_key_change_in_production
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=super_secret_jwt_refresh_key_change_in_production
JWT_REFRESH_EXPIRATION=7d

# File Storage
STORAGE_DRIVER=local # local or s3
UPLOAD_DIR=./uploads
```

