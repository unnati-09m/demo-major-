# InnovateX — Project & Viva Guide

## 1. Problem addressed
Innovation outcomes are spread across projects, research publications, patents, grants, startups and awards. InnovateX provides one workflow to submit evidence, review it, calculate institutional indicators and compare departmental outcomes.

## 2. Actors and permissions

| Actor | Allowed actions |
| --- | --- |
| Administrator | View institution data, submit evidence, review evidence, create/activate indicators, view rankings and export reports |
| Faculty | Submit evidence, review pending evidence, view dashboards and rankings |
| Student | Submit evidence and view only their own submissions; view institutional indicators and dashboards |

The API enforces protected routes with JWT authentication and role middleware. Hiding a UI control is not used as the only permission check.

## 3. Main workflow
1. A contributor signs in and creates an innovation submission.
2. The contributor selects an active indicator and enters a title, description, academic year and optional evidence URL.
3. The submission is saved with PENDING status and does not receive points yet.
4. A faculty reviewer or administrator reviews the evidence and approves it or requests changes.
5. Approved submissions earn the points assigned to their indicator.
6. Department rankings and reports recalculate from approved submissions.

## 4. Database model
- **departments**: department name, code and description.
- **users**: identity, password hash, role and department foreign key.
- **indicators**: category, description, point weight and active state.
- **submissions**: contributor, department, indicator, evidence, status and reviewer metadata.

Relationship summary:
- One department has many users and submissions.
- One user can submit many submissions.
- One user can review many submissions.
- One indicator can be referenced by many submissions.

## 5. Subject mapping

| Course area | Demonstrated implementation |
| --- | --- |
| ISD | Problem definition, actor roles, modular workflows, responsive UI, validation and testing plan |
| ASD | Express routes, REST API, middleware, JWT, async database access, error handling and frontend/backend integration |
| DE / DBMS | PostgreSQL relations, primary/foreign keys, constraints, indexes, joins, aggregate queries, filtered counts and CSV reporting |
| ADA | Department ranking with deterministic tie-break rules; search/filter workflow; weighted indicator scoring; progress aggregation |

## 6. Scoring logic
For each approved submission, the indicator's configured point value is added to its department's score.

**Department score = sum of indicator points for approved submissions belonging to that department.**

Pending and rejected submissions add zero points. The current default weights are illustrative:
- Innovation project: 10
- Research publication: 10
- Patent: 25
- Research grant: 20
- Startup / incubation: 20
- Competition / award: 15

Administrators can add indicators and activate/deactivate them. Existing submission points are based on the associated indicator record, so changing an indicator's point value changes the calculated total.

## 7. Suggested demonstration sequence
1. Sign in as student and submit a new project.
2. Sign out and sign in as faculty.
3. Open Submissions, search for the new item and approve it with a short review note.
4. Open Overview and show the updated approved count and innovation points.
5. Open Rankings and explain why the department moved.
6. Open Indicators as admin, demonstrate the indicator catalog and add a sample indicator.
7. Open Reports and export the CSV.

Demo password: `InnovateX@123`.

## 8. API surface
- `POST /api/auth/login` — issue a JWT after credential validation.
- `GET /api/auth/me` — fetch the authenticated profile.
- `GET /api/dashboard/summary` — institution KPI summary.
- `GET /api/dashboard/trends` — approved submissions grouped by year.
- `GET /api/submissions` — list submissions with optional status/department/indicator filters.
- `POST /api/submissions` — create a pending submission.
- `PATCH /api/submissions/:id/review` — approve or reject pending evidence.
- `GET /api/indicators` — list indicators.
- `POST /api/indicators` and `PATCH /api/indicators/:id` — admin indicator management.
- `GET /api/leaderboard` — department ranking.
- `GET /api/activity` — recent submissions.
- `GET /api/reports/export.csv` — report export.

## 9. Prototype boundaries
This four-day prototype intentionally uses manual data entry and sample records. External research-management integrations, institutional SSO, document uploads, formal certificate issuance, multilingual content, full audit/version history, automated privacy compliance and production deployment hardening are future extensions. The demo data and demo credentials must not be used for a real institution.
