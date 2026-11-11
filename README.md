# InnovateX — Innovation Excellence Portal

A full-stack academic prototype for collecting, reviewing, scoring and showcasing institutional innovation evidence.

## Stack
React + Vite, Node.js + Express, PostgreSQL (`pg`), JWT authentication and Recharts.

## Setup
1. Install Node.js 20+ and PostgreSQL 14+.
2. Create a PostgreSQL database named `innovatex` (for example, `createdb innovatex`).
3. From the repository root, copy `server/.env.example` to `.env` and set `DATABASE_URL` and a long random `JWT_SECRET`. The server loads the root `.env` file when started by the root scripts.
4. Run `npm install` from the repository root.
5. Run `npm run dev` to start the API and frontend together.
6. Open http://localhost:5173. Check the API at http://localhost:4000/api/health.

The API creates the tables, indexes and sample records on first start. The database user in `DATABASE_URL` must have permission to create tables and indexes.

## Demo accounts
Password for every account: `InnovateX@123`
- `admin@innovatex.edu` — Administrator
- `faculty@innovatex.edu` — Faculty reviewer
- `student@innovatex.edu` — Student contributor

Use the role buttons on the sign-in screen to switch demo accounts. Students can submit and track their own evidence; faculty can review submissions; administrators can also manage indicators.

## Included features
Role-based access, innovation submissions, faculty approval workflow, configurable scoring indicators, department leaderboard, dashboard analytics and CSV export.

## Scoring model
Only approved submissions contribute points. Default weights: innovation project 10, publication 10, patent 25, research grant 20, startup/incubation 20, competition/award 15. These are illustrative prototype weights and can be adjusted by an administrator.

## API overview
- `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard/summary`, `GET /api/dashboard/trends`
- `GET /api/submissions`, `POST /api/submissions`, `PATCH /api/submissions/:id/review`
- `GET /api/indicators`, `POST /api/indicators`, `PATCH /api/indicators/:id`
- `GET /api/leaderboard`, `GET /api/activity`, `GET /api/reports/export.csv`

## Notes
This prototype uses sample institutional data and an illustrative point rubric. It is not production-hardened. Before real deployment, replace demo credentials, enforce HTTPS, use a dedicated database role with limited privileges, review access/privacy rules, add secure evidence-file storage and conduct accessibility/security testing.
