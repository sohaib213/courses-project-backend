# Courses Platform – Backend

A comprehensive backend for an online learning platform built with **NestJS, TypeScript, PostgreSQL, and Prisma**. It provides course management, student enrollment, assessments, authentication, real-time communication, payments, and AI-powered grading.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Testing](#testing)
- [Deployment](#deployment)
- [Related Projects](#related-projects)

## Overview

The Courses Platform is designed to connect teachers and students through an interactive online learning environment.

Teachers can manage courses, create quizzes, evaluate students, and track their progress. Students can enroll in courses, participate in assessments, and monitor their learning progress.

The backend also integrates AI-powered grading, real-time communication, secure authentication, and online payment processing.

## Features

### Authentication & Authorization
- JWT-based authentication.
- Google OAuth 2.0 integration.
- Role-based access control (RBAC).
- Separate permissions for Teachers, Students, and Administrators.
- Secure password hashing using bcrypt.

### Course Management
- Create, update, and manage courses.
- Teacher and student management.
- Course enrollment.
- Administrative course approval.

### Quizzes & Assessments
- Quiz creation and management.
- Student quiz submissions.
- Automated grading.
- AI-powered answer evaluation using Groq.
- Student performance tracking.

### Progress Tracking
- Track student learning progress.
- Monitor course completion.
- Manage student performance data.

### Real-Time Communication
- WebSocket communication using Socket.IO.
- Real-time events between connected clients.

### Payments
- Stripe payment integration.
- Payment processing.
- Stripe webhook handling.

### Media Management
- Cloudinary integration for media uploads and storage.

### Performance & Caching
- Redis integration.
- Cache management using Cache Manager.
- User-specific caching and filtered data caching.

### Additional Features
- Email services using Nodemailer.
- Scheduled tasks and cron jobs.
- API validation using class-validator.
- Request throttling and rate limiting.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| TypeScript | Programming language |
| NestJS 11 | Backend framework |
| PostgreSQL | Relational database |
| Prisma 7 | ORM and database management |
| Redis | Caching and performance |
| Socket.IO | Real-time communication |
| JWT & Passport | Authentication |
| Google OAuth 2.0 | Social authentication |
| Stripe | Payment processing |
| Cloudinary | Media storage |
| Groq SDK | AI-powered grading |
| Nodemailer | Email services |
| Jest | Testing |

## Architecture

The application follows a modular NestJS architecture, separating functionality into independent modules.

Main project directories:

```text
courses-project-backend/
│
├── prisma/              # Database schema and migrations
│
├── src/                 # Application source code
│
├── test/                # End-to-end tests
│
├── package.json         # Dependencies and scripts
├── prisma.config.ts     # Prisma configuration
├── nest-cli.json        # NestJS configuration
└── tsconfig.json        # TypeScript configuration
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- PostgreSQL
- Redis

You will also need credentials for the external services you intend to use, such as Google OAuth, Stripe, Cloudinary, and Groq.

### 1. Clone the Repository

```bash
git clone https://github.com/sohaib213/courses-project-backend.git
```

### 2. Navigate to the Project

```bash
cd courses-project-backend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and configure your database connection, authentication secrets, Redis connection, and external service credentials.

Use the variable names expected by the application configuration.

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Run Database Migrations

For local development:

```bash
npx prisma migrate dev
```

## Running the Application

### Development Mode

```bash
npm run start:dev
```

### Standard Mode

```bash
npm run start
```

### Production Mode

```bash
npm run build
npm run start:prod
```

The production startup script deploys Prisma migrations before starting the compiled application.

## Testing

Run unit tests:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Generate test coverage:

```bash
npm run test:cov
```

## Deployment

The backend is deployed on Vercel.

**Live API:**

https://courses-project-backend.vercel.app

## Related Projects

**Frontend Repository / Application**

https://courses-project-frontend-five.vercel.app

**Backend Repository**

https://github.com/sohaib213/courses-project-backend

---

## Author

**Sohaib Hassan**

GitHub: [@sohaib213](https://github.com/sohaib213)

---

If you find this project interesting, consider giving the repository a ⭐ on GitHub.