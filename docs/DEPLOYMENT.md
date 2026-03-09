# HTracker — Production Deployment Guide

## Prerequisites

- Node.js 20+
- Docker + Docker Compose (for containerised deployment)
- MongoDB 7 with **replica set** (required by Prisma for transactions)

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all required values:

```bash
cp .env.example .env.local
```

| Variable               | Required    | Description                                               |
| ---------------------- | ----------- | --------------------------------------------------------- |
| `DATABASE_URL`         | ✅          | MongoDB connection string with replica set                |
| `AUTH_SECRET`          | ✅          | JWT signing secret — generate with `openssl rand -hex 32` |
| `NEXTAUTH_URL`         | ✅ (prod)   | Public URL of the app, e.g. `https://htasker.example.com` |
| `AUTH_URL`             | Recommended | Canonical Auth.js URL (set same value as `NEXTAUTH_URL`)  |
| `GOOGLE_CLIENT_ID`     | Optional    | Google OAuth App client ID                                |
| `GOOGLE_CLIENT_SECRET` | Optional    | Google OAuth App client secret                            |
| `GITHUB_CLIENT_ID`     | Optional    | GitHub OAuth App client ID                                |
| `GITHUB_CLIENT_SECRET` | Optional    | GitHub OAuth App client secret                            |

---

## Option 1: Docker Compose (Recommended)

Starts the Next.js app and a MongoDB replica set together.

### 1. Configure environment

```bash
cp .env.example .env.local
# Set at minimum: AUTH_SECRET, MONGO_INITDB_ROOT_USERNAME, MONGO_INITDB_ROOT_PASSWORD
# Generate secrets:
#   AUTH_SECRET: openssl rand -hex 32
#   MONGO_INITDB_ROOT_PASSWORD: openssl rand -base64 24
```

### 2. Build and start

```bash
docker compose up -d --build
```

### 3. Run database migrations

```bash
docker compose exec app npx prisma db push
```

### 4. (Optional) Seed the database

```bash
docker compose exec app npm run seed
```

### 5. Verify

```bash
curl http://localhost:3000
```

### Stopping

```bash
docker compose down          # stop containers, keep volumes
docker compose down -v       # stop and remove volumes (deletes data)
```

---

## Option 2: Docker (Standalone)

Use this when you have an existing external MongoDB.

### Build the image

```bash
docker build -t htasker:latest .
```

### Run the container

```bash
docker run -d \
  --name htasker \
  -p 3000:3000 \
  -e DATABASE_URL="mongodb+srv://user:pass@cluster.mongodb.net/htasker?retryWrites=true&w=majority" \
  -e AUTH_SECRET="your-secret-here" \
  -e NEXTAUTH_URL="https://htasker.example.com" \
  htasker:latest
```

---

## Option 3: Vercel

HTracker works out-of-the-box on Vercel with a managed MongoDB (Atlas).

### 1. Push to GitHub / GitLab

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Framework preset: **Next.js** (auto-detected)

### 3. Set environment variables

In the Vercel dashboard → **Settings → Environment Variables**, add:

| Key                    | Value                           |
| ---------------------- | ------------------------------- |
| `DATABASE_URL`         | MongoDB Atlas connection string |
| `AUTH_SECRET`          | `openssl rand -hex 32` output   |
| `NEXTAUTH_URL`         | Your Vercel deployment URL      |
| `AUTH_URL`             | Same value as `NEXTAUTH_URL`    |
| `GOOGLE_CLIENT_ID`     | (if using Google OAuth)         |
| `GOOGLE_CLIENT_SECRET` | (if using Google OAuth)         |
| `GITHUB_CLIENT_ID`     | (if using GitHub OAuth)         |
| `GITHUB_CLIENT_SECRET` | (if using GitHub OAuth)         |

### 4. Deploy

Vercel deploys automatically on every push to `main`.

---

## MongoDB Setup

### MongoDB Atlas (Cloud — Recommended for production)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a database user with readWrite access
3. Whitelist your server IP (or use `0.0.0.0/0` for Vercel)
4. Copy the connection string and set as `DATABASE_URL`

> **Note**: Atlas clusters include replica set support by default — no extra configuration needed.

### Self-hosted MongoDB

MongoDB **must run as a replica set** for Prisma transactions to work.

```bash
# Start mongod with replica set
mongod --replSet rs0 --bind_ip_all

# Initialise the replica set (run once)
mongosh --eval "rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] })"
```

---

## Database Schema

Apply the schema to MongoDB (no SQL migrations — MongoDB is schema-less, but Prisma manages indexes):

```bash
npx prisma db push
```

---

## Health Check

The application exposes `GET /` which returns 200 when healthy. Use this for load balancer health checks.

---

## Updating

```bash
git pull origin main
docker compose up -d --build   # rebuild and restart
```

---

## Troubleshooting

| Problem                             | Solution                                                                         |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| `Prisma: Transaction not supported` | MongoDB is not running as a replica set — see MongoDB Setup above                |
| `AUTH_SECRET is not set`            | Set `AUTH_SECRET` in /`AUTH_URL` match the exact public domain in OAuth settings |
| Redirecting to `0.0.0.0` on sign-in | Set `NEXTAUTH_URL` and `AUTH_URL` to your public HTTPS domain (never `0.0.0.0`)  |
| OAuth callback error                | Ensure `NEXTAUTH_URL` matches the exact domain in your OAuth app settings        |
| Port 3000 in use                    | Change host port: `-p 3001:3000` or `ports: - "3001:3000"` in compose            |
