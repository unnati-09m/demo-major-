import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 4000);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required. Copy server/.env.example to server/.env.');
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required. Set JWT_SECRET in server/.env.');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
app.use(express.json({ limit: '1mb' }));

const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

async function initializeDatabase() {
  const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');
  await pool.query(await readFile(schemaPath, 'utf8'));

  const departments = [
    ['Computer Science', 'CSE', 'Computing, software and AI innovation'],
    ['Mechanical Engineering', 'MECH', 'Product, manufacturing and design innovation'],
    ['Electrical Engineering', 'EEE', 'Energy, electronics and automation'],
    ['Life Sciences', 'LIFE', 'Health, biology and interdisciplinary research']
  ];
  for (const row of departments) {
    await pool.query('INSERT INTO departments(name,code,description) VALUES($1,$2,$3) ON CONFLICT(code) DO NOTHING', row);
  }

  const indicators = [
    ['Innovation Project', 'PROJECT', 'Validated student or faculty innovation project', 10],
    ['Research Publication', 'PUBLICATION', 'Peer-reviewed research paper or publication', 10],
    ['Patent Filed', 'PATENT', 'Patent application filed or granted', 25],
    ['Research Grant', 'GRANT', 'Competitive research or innovation grant received', 20],
    ['Startup / Incubation', 'STARTUP', 'Startup launched or formally incubated', 20],
    ['Competition / Award', 'AWARD', 'Recognized competition result or award', 15]
  ];
  for (const row of indicators) {
    await pool.query('INSERT INTO indicators(name,category,description,points) VALUES($1,$2,$3,$4) ON CONFLICT(name) DO NOTHING', row);
  }

  const hash = await bcrypt.hash('InnovateX@123', 10);
  const accounts = [
    ['Aarav Sharma', 'admin@innovatex.edu', 'ADMIN', 'CSE'],
    ['Dr. Meera Iyer', 'faculty@innovatex.edu', 'FACULTY', 'CSE'],
    ['Riya Patil', 'student@innovatex.edu', 'STUDENT', 'CSE'],
    ['Kabir Deshmukh', 'kabir@innovatex.edu', 'STUDENT', 'MECH'],
    ['Ananya Rao', 'ananya@innovatex.edu', 'FACULTY', 'LIFE']
  ];
  for (const row of accounts) {
    await pool.query(
      'INSERT INTO users(name,email,password_hash,role,department_id) SELECT $1,$2,$3,$4,id FROM departments WHERE code=$5 ON CONFLICT(email) DO NOTHING',
      [row[0], row[1], hash, row[2], row[3]]
    );
  }

  const count = await pool.query('SELECT COUNT(*)::int AS count FROM submissions');
  if (count.rows[0].count === 0) {
    const samples = [
      ['AI-powered Campus Energy Optimizer', 'A sensor-assisted analytics prototype to identify avoidable energy consumption across campus buildings.', 2026, 'APPROVED', 'student@innovatex.edu', 'CSE', 'Innovation Project', 'faculty@innovatex.edu', 'Prototype demonstrated and documentation verified.'],
      ['Low-cost Smart Irrigation Controller', 'A soil-moisture-based irrigation controller designed for efficient water use in teaching gardens.', 2026, 'APPROVED', 'kabir@innovatex.edu', 'MECH', 'Patent Filed', 'faculty@innovatex.edu', 'Filing acknowledgement reviewed.'],
      ['Biomedical Image Analysis Study', 'Research study on interpretable image analysis methods for academic biomedical datasets.', 2025, 'PENDING', 'ananya@innovatex.edu', 'LIFE', 'Research Publication', null, null],
      ['Student Innovation Challenge — Finalist', 'Interdisciplinary team shortlisted in a national student innovation challenge.', 2026, 'APPROVED', 'student@innovatex.edu', 'CSE', 'Competition / Award', 'faculty@innovatex.edu', 'Finalist certificate reviewed.'],
      ['Assistive Learning Tools Venture', 'Early-stage student venture supported by the campus incubation cell.', 2026, 'PENDING', 'kabir@innovatex.edu', 'MECH', 'Startup / Incubation', null, null],
      ['Sustainable Materials Research Grant', 'Small institutional seed grant for sustainable materials experimentation.', 2025, 'APPROVED', 'ananya@innovatex.edu', 'LIFE', 'Research Grant', 'faculty@innovatex.edu', 'Grant sanction letter verified.']
    ];
    for (const item of samples) {
      await pool.query(
        'INSERT INTO submissions(title,description,academic_year,status,submitted_by,department_id,indicator_id,reviewed_by,reviewer_note,reviewed_at) ' +
        'SELECT $1,$2,$3,$4,su.id,d.id,i.id,ru.id,$9,CASE WHEN ru.id IS NULL THEN NULL ELSE NOW() END ' +
        'FROM users su JOIN departments d ON d.code=$6 JOIN indicators i ON i.name=$7 LEFT JOIN users ru ON ru.email=$8 WHERE su.email=$5',
        item
      );
    }
  }
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please sign in again.' });
  }
}
function allowRoles(...roles) {
  return (req, res, next) => req.user && roles.includes(req.user.role)
    ? next()
    : res.status(403).json({ message: 'You do not have permission to perform this action.' });
}
async function getUser(id) {
  const result = await pool.query(
    'SELECT u.id,u.name,u.email,u.role,u.department_id,d.name AS department_name,d.code AS department_code ' +
    'FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=$1', [id]
  );
  return result.rows[0];
}
const submissionSelect =
  'SELECT s.id,s.title,s.description,s.evidence_url AS "evidenceUrl",s.academic_year AS year,' +
  's.status,s.reviewer_note AS "reviewerNote",s.created_at AS "createdAt",s.updated_at AS "updatedAt",' +
  'i.id AS indicator_id,i.name AS indicator_name,i.category AS indicator_category,i.points AS indicator_points,' +
  'd.id AS department_id,d.name AS department_name,d.code AS department_code,' +
  'u.id AS submitter_id,u.name AS submitter_name,u.email AS submitter_email,ru.name AS reviewer_name,ru.id AS reviewer_id ' +
  'FROM submissions s JOIN indicators i ON i.id=s.indicator_id JOIN departments d ON d.id=s.department_id ' +
  'JOIN users u ON u.id=s.submitted_by LEFT JOIN users ru ON ru.id=s.reviewed_by';

function shapeSubmission(r) {
  return {
    id: r.id, title: r.title, description: r.description, evidenceUrl: r.evidenceUrl, year: r.year,
    status: r.status, reviewerNote: r.reviewerNote, createdAt: r.createdAt, updatedAt: r.updatedAt,
    indicator: { id: r.indicator_id, name: r.indicator_name, category: r.indicator_category, points: r.indicator_points },
    department: { id: r.department_id, name: r.department_name, code: r.department_code },
    submittedBy: { id: r.submitter_id, name: r.submitter_name, email: r.submitter_email },
    reviewedBy: r.reviewer_id ? { id: r.reviewer_id, name: r.reviewer_name } : null
  };
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'InnovateX API' }));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });
  const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ message: 'Incorrect email or password.' });
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role, name: user.name, departmentId: user.department_id },
    process.env.JWT_SECRET, { expiresIn: '12h' }
  );
  res.json({ token, user: await getUser(user.id) });
}));

app.get('/api/auth/me', authenticate, asyncRoute(async (req, res) => {
  const user = await getUser(req.user.sub);
  if (!user) return res.status(401).json({ message: 'User no longer exists.' });
  res.json({ user });
}));

app.get('/api/dashboard/summary', authenticate, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    'SELECT COUNT(*)::int AS total_submissions, ' +
    "COUNT(*) FILTER (WHERE status='PENDING')::int AS pending, " +
    "COUNT(*) FILTER (WHERE status='APPROVED')::int AS approved, " +
    "COUNT(*) FILTER (WHERE status='REJECTED')::int AS rejected, " +
    '(SELECT COUNT(*)::int FROM users) AS users, ' +
    '(SELECT COUNT(*)::int FROM departments) AS departments, ' +
    '(SELECT COUNT(*)::int FROM indicators WHERE is_active=TRUE) AS indicators, ' +
    "COALESCE(SUM(i.points) FILTER (WHERE s.status='APPROVED'),0)::int AS total_points " +
    'FROM submissions s JOIN indicators i ON i.id=s.indicator_id'
  );
  const r = result.rows[0];
  res.json({
    totalSubmissions: r.total_submissions, pending: r.pending, approved: r.approved,
    rejected: r.rejected, users: r.users, departments: r.departments,
    indicators: r.indicators, totalPoints: r.total_points
  });
}));

app.get('/api/dashboard/trends', authenticate, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    "SELECT academic_year AS year,COUNT(*)::int AS submissions,COALESCE(SUM(i.points),0)::int AS points " +
    "FROM submissions s JOIN indicators i ON i.id=s.indicator_id WHERE s.status='APPROVED' " +
    'GROUP BY academic_year ORDER BY academic_year'
  );
  res.json({ trends: result.rows.map((r) => ({ ...r, year: String(r.year) })) });
}));

app.get('/api/submissions', authenticate, asyncRoute(async (req, res) => {
  const values = [];
  const conditions = [];
  if (req.query.status && ['PENDING', 'APPROVED', 'REJECTED'].includes(req.query.status)) {
    values.push(req.query.status); conditions.push('s.status=$' + values.length);
  }
  if (req.query.departmentId) {
    values.push(Number(req.query.departmentId)); conditions.push('s.department_id=$' + values.length);
  }
  if (req.query.indicatorId) {
    values.push(Number(req.query.indicatorId)); conditions.push('s.indicator_id=$' + values.length);
  }
  if (req.user.role === 'STUDENT') {
    values.push(req.user.sub); conditions.push('s.submitted_by=$' + values.length);
  }
  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
  const result = await pool.query(submissionSelect + where + ' ORDER BY s.created_at DESC', values);
  res.json({ submissions: result.rows.map(shapeSubmission) });
}));

app.post('/api/submissions', authenticate, asyncRoute(async (req, res) => {
  const title = String(req.body.title || '').trim();
  const description = String(req.body.description || '').trim();
  const indicatorId = Number(req.body.indicatorId);
  const year = Number(req.body.year);
  const evidenceUrl = String(req.body.evidenceUrl || '').trim();
  if (title.length < 4 || title.length > 140 || description.length < 15 || description.length > 2500 ||
      !Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ message: 'Check the title, description and academic year.' });
  }
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) {
    return res.status(400).json({ message: 'Evidence link must start with http:// or https://.' });
  }
  const inserted = await pool.query(
    'INSERT INTO submissions(title,description,evidence_url,academic_year,submitted_by,department_id,indicator_id) ' +
    'SELECT $1,$2,$3,$4,u.id,u.department_id,i.id FROM users u JOIN indicators i ON i.id=$5 ' +
    'WHERE u.id=$6 AND i.is_active=TRUE AND u.department_id IS NOT NULL RETURNING id',
    [title, description, evidenceUrl || null, year, indicatorId, req.user.sub]
  );
  if (!inserted.rowCount) return res.status(400).json({ message: 'Choose an active indicator and ensure your account has a department.' });
  const result = await pool.query(submissionSelect + ' WHERE s.id=$1', [inserted.rows[0].id]);
  res.status(201).json({ submission: shapeSubmission(result.rows[0]) });
}));

app.patch('/api/submissions/:id/review', authenticate, allowRoles('FACULTY', 'ADMIN'), asyncRoute(async (req, res) => {
  const status = req.body.status;
  const note = String(req.body.reviewerNote || '').trim().slice(0, 700);
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Choose approve or reject.' });
  const updated = await pool.query(
    "UPDATE submissions SET status=$1,reviewer_note=$2,reviewed_by=$3,reviewed_at=NOW(),updated_at=NOW() WHERE id=$4 AND status='PENDING' RETURNING id",
    [status, note, req.user.sub, Number(req.params.id)]
  );
  if (!updated.rowCount) return res.status(409).json({ message: 'Submission not found or already reviewed.' });
  const result = await pool.query(submissionSelect + ' WHERE s.id=$1', [updated.rows[0].id]);
  res.json({ submission: shapeSubmission(result.rows[0]) });
}));

app.get('/api/indicators', authenticate, asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT id,name,category,description,points,is_active AS "isActive" FROM indicators ORDER BY is_active DESC,points DESC');
  res.json({ indicators: result.rows });
}));
app.post('/api/indicators', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const category = req.body.category;
  const description = String(req.body.description || '').trim();
  const points = Number(req.body.points);
  if (name.length < 3 || !['PROJECT', 'PUBLICATION', 'PATENT', 'GRANT', 'STARTUP', 'AWARD'].includes(category) ||
      description.length < 8 || !Number.isInteger(points) || points < 1 || points > 100) {
    return res.status(400).json({ message: 'Enter a valid name, category, description and point value (1–100).' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO indicators(name,category,description,points) VALUES($1,$2,$3,$4) RETURNING id,name,category,description,points,is_active AS "isActive"',
      [name, category, description, points]
    );
    res.status(201).json({ indicator: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An indicator with this name already exists.' });
    throw error;
  }
}));
app.patch('/api/indicators/:id', authenticate, allowRoles('ADMIN'), asyncRoute(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') return res.status(400).json({ message: 'Only activation status can be changed here.' });
  const result = await pool.query(
    'UPDATE indicators SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING id,name,category,description,points,is_active AS "isActive"',
    [req.body.isActive, Number(req.params.id)]
  );
  if (!result.rowCount) return res.status(404).json({ message: 'Indicator not found.' });
  res.json({ indicator: result.rows[0] });
}));

app.get('/api/leaderboard', authenticate, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    "SELECT d.id,d.name,d.code," +
    "(SELECT COUNT(*)::int FROM users u WHERE u.department_id=d.id) AS members," +
    "(SELECT COUNT(*)::int FROM submissions s WHERE s.department_id=d.id) AS total_submissions," +
    "(SELECT COUNT(*)::int FROM submissions s WHERE s.department_id=d.id AND s.status='APPROVED') AS approved_count," +
    "(SELECT COALESCE(SUM(i.points),0)::int FROM submissions s JOIN indicators i ON i.id=s.indicator_id WHERE s.department_id=d.id AND s.status='APPROVED') AS points " +
    'FROM departments d ORDER BY points DESC,approved_count DESC,d.name'
  );
  res.json({ leaderboard: result.rows.map((r, index) => ({
    rank: index + 1, id: r.id, name: r.name, code: r.code,
    approvedCount: r.approved_count, totalSubmissions: r.total_submissions, members: r.members, points: r.points
  })) });
}));

app.get('/api/activity', authenticate, asyncRoute(async (req, res) => {
  const query = req.user.role === 'STUDENT'
    ? submissionSelect + ' WHERE s.submitted_by=$1 ORDER BY s.updated_at DESC LIMIT 8'
    : submissionSelect + ' ORDER BY s.updated_at DESC LIMIT 8';
  const result = await pool.query(query, req.user.role === 'STUDENT' ? [req.user.sub] : []);
  res.json({ activities: result.rows.map(shapeSubmission) });
}));

app.get('/api/reports/export.csv', authenticate, asyncRoute(async (req, res) => {
  const query = req.user.role === 'STUDENT'
    ? submissionSelect + ' WHERE s.submitted_by=$1 ORDER BY s.created_at DESC'
    : submissionSelect + ' ORDER BY s.created_at DESC';
  const result = await pool.query(query, req.user.role === 'STUDENT' ? [req.user.sub] : []);
  const cell = (value) => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  const lines = [['Title', 'Category', 'Indicator', 'Department', 'Contributor', 'Email', 'Year', 'Status', 'Points', 'Reviewer', 'Reviewer note'].map(cell).join(',')];
  for (const r of result.rows) {
    lines.push([
      r.title, r.indicator_category, r.indicator_name, r.department_name, r.submitter_name,
      r.submitter_email, r.year, r.status, r.status === 'APPROVED' ? r.indicator_points : 0,
      r.reviewer_name, r.reviewerNote
    ].map(cell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="innovatex-report.csv"');
  res.send(lines.join('\n'));
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong. Check the server log for details.' });
});

initializeDatabase()
  .then(() => app.listen(port, () => console.log('InnovateX API running on http://localhost:' + port)))
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
