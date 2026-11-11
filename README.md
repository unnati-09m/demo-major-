# InnovateX — Innovation Excellence Portal

A full-stack academic prototype for collecting, reviewing, scoring and showcasing institutional innovation evidence.

## Stack
React + Vite, Node.js + Express, PostgreSQL (`pg`), JWT authentication and Recharts.

## Setup
1. Install Node.js 20+ and PostgreSQL 14+.
2. Create a database named `innovatex`.
3. Copy `server/.env.example` to `server/.env` and set your PostgreSQL connection string and JWT secret.
4. Run `npm install` from the repository root.
5. Run `npm run dev` to start the API and frontend.
6. Open http://localhost:5173.

The API initializes its database schema and sample records on first start.

## Demo accounts
Password for every account: `InnovateX@123`
- `admin@innovatex.edu` — Administrator
- `faculty@innovatex.edu` — Faculty reviewer
- `student@innovatex.edu` — Student contributor

## Included features
Role-based access, innovation submissions, faculty approval workflow, configurable scoring indicators, department leaderboard, dashboard analytics and CSV export.

This prototype uses sample institutional data and an illustrative point rubric. Replace demo credentials and review security/privacy requirements before production deployment.
