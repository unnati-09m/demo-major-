CREATE TABLE IF NOT EXISTS departments (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE, code VARCHAR(16) NOT NULL UNIQUE,
 description TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
 id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(180) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, role VARCHAR(16) NOT NULL CHECK(role IN ('ADMIN','FACULTY','STUDENT')),
 department_id INTEGER REFERENCES departments(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS indicators (
 id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE,
 category VARCHAR(20) NOT NULL CHECK(category IN ('PROJECT','PUBLICATION','PATENT','GRANT','STARTUP','AWARD')),
 description VARCHAR(400) NOT NULL, points INTEGER NOT NULL CHECK(points BETWEEN 1 AND 100),
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS submissions (
 id SERIAL PRIMARY KEY, title VARCHAR(140) NOT NULL, description TEXT NOT NULL, evidence_url TEXT,
 academic_year INTEGER NOT NULL CHECK(academic_year BETWEEN 2000 AND 2100),
 status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 reviewer_note VARCHAR(700), submitted_by INTEGER NOT NULL REFERENCES users(id),
 reviewed_by INTEGER REFERENCES users(id), department_id INTEGER NOT NULL REFERENCES departments(id),
 indicator_id INTEGER NOT NULL REFERENCES indicators(id), reviewed_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submissions_status_created ON submissions(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_department_status ON submissions(department_id,status);
CREATE INDEX IF NOT EXISTS idx_submissions_indicator ON submissions(indicator_id);
