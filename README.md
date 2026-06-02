# ExpenseFlow 💸

> A production-ready, open-source Splitwise alternative — mobile (iOS/Android), web, backend API, and admin portal.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## ✨ Features

- 👥 **Groups** — Home, Trip, Couple, Office, and more
- 💰 **Multiple split methods** — Equal, Unequal, Percentage, Shares, Exact, Multi-payer
- 🧮 **Debt simplification** — Graph-based algorithm minimizes transactions
- 📷 **Receipt scanning** — AI-powered OCR (OpenAI/Google/Azure)
- 🌍 **Multi-currency** — 30+ currencies with live exchange rates
- 📊 **Analytics** — Spending trends, category breakdowns, charts
- 📱 **Offline-first mobile** — Works without internet, syncs automatically
- 🔔 **Push notifications** — Real-time updates on expenses and settlements
- 🔒 **Secure** — JWT auth, RBAC, encrypted storage, audit logs
- 🌐 **i18n** — English, French, Spanish, German, Portuguese, Hindi, Gujarati

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Clients                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Web App │  │Mobile App│  │  Admin   │                  │
│  │ Next.js  │  │   Expo   │  │ Next.js  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
└───────┼─────────────┼─────────────┼────────────────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │ REST API / WebSocket
              ┌───────┴────────┐
              │   NestJS API   │
              │  (apps/api)    │
              └───────┬────────┘
         ┌────────────┼────────────┐
         │            │            │
    ┌────┴────┐  ┌────┴────┐  ┌───┴────┐
    │Postgres │  │  Redis  │  │  S3/   │
    │(Prisma) │  │(Cache+  │  │ MinIO  │
    │         │  │ Queue)  │  │(Files) │
    └─────────┘  └─────────┘  └────────┘
```

## 📁 Project Structure

```
expenseflow/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── web/          # Next.js 14 web application
│   ├── mobile/       # React Native + Expo mobile app
│   └── admin/        # Next.js 14 admin portal
├── packages/
│   ├── database/     # Prisma schema, migrations, seed
│   ├── shared/       # Shared types, utilities, algorithms
│   ├── ui/           # Shared React component library
│   └── config/       # Shared ESLint, TypeScript, Tailwind configs
├── infrastructure/
│   ├── docker/       # Docker + docker-compose
│   └── terraform/    # AWS infrastructure as code
├── e2e/              # Playwright end-to-end tests
└── .github/          # CI/CD workflows
```

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/KartikPadsala/expenseflow.git
cd expenseflow
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start infrastructure

```bash
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres redis minio
```

### 4. Set up database

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start development servers

```bash
pnpm dev
```

This starts:
- **API**: http://localhost:3001
- **Web**: http://localhost:3000
- **Admin**: http://localhost:3002
- **Mobile**: Expo dev server

## 🛠 Individual App Development

### Backend API
```bash
cd apps/api
pnpm dev
```

### Web App
```bash
cd apps/web
pnpm dev
```

### Admin Portal
```bash
cd apps/admin
pnpm dev
```

### Mobile App
```bash
cd apps/mobile
pnpm start
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
cd packages/shared && pnpm test

# Run E2E tests
cd e2e && pnpm test
```

## 🐳 Docker

```bash
# Start all services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# View logs
docker-compose -f infrastructure/docker/docker-compose.yml logs -f api
```

## 🌐 Deployment

### API (Docker)
```bash
docker build -f infrastructure/docker/Dockerfile.api -t expenseflow-api .
docker push your-registry/expenseflow-api
```

### Web (Vercel)
```bash
cd apps/web
vercel deploy
```

### Mobile (EAS Build)
```bash
cd apps/mobile
eas build --platform all
```

## 📚 API Documentation

Once the API is running, visit:
- Swagger UI: http://localhost:3001/api/docs

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit using conventional commits: `git commit -m 'feat: add amazing feature'`
4. Push and open a PR

## 📄 License

MIT © ExpenseFlow Contributors
