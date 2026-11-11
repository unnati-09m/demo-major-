import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowRight, Award, BarChart3, Bell, Check, ChevronDown, ClipboardCheck,
  Download, FileText, Filter, FolderKanban, LayoutDashboard, Lightbulb, LogOut,
  Menu, Plus, Search, ShieldCheck, Sparkles, Target, Users, X, TrendingUp, BookOpen
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip,
  XAxis, YAxis, BarChart, Bar
} from 'recharts';
import './styles.css';

const API = '/api';
const DEMO_PASSWORD = 'InnovateX@123';
const DEMO_USERS = [
  { role: 'ADMIN', email: 'admin@innovatex.edu', label: 'Administrator' },
  { role: 'FACULTY', email: 'faculty@innovatex.edu', label: 'Faculty reviewer' },
  { role: 'STUDENT', email: 'student@innovatex.edu', label: 'Student contributor' }
];
const money = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0));
const shortDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const roleName = (role) => ({ ADMIN: 'Administrator', FACULTY: 'Faculty reviewer', STUDENT: 'Student contributor' }[role] || role);
const categoryName = (key) => ({
  PROJECT: 'Innovation project', PUBLICATION: 'Research publication', PATENT: 'Patent',
  GRANT: 'Research grant', STARTUP: 'Startup / incubation', AWARD: 'Competition / award'
}[key] || key);
const initials = (value) => String(value || 'U').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

async function api(path, options = {}) {
  const token = localStorage.getItem('innovatex_token');
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(API + path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(data && data.message ? data.message : 'Request failed.');
  return data;
}

function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState('Overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [flash, setFlash] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('innovatex_token');
    if (!token) { setReady(true); return; }
    api('/auth/me').then((data) => setUser(data.user)).catch(() => localStorage.removeItem('innovatex_token')).finally(() => setReady(true));
  }, []);
  const login = (session) => {
    localStorage.setItem('innovatex_token', session.token);
    setUser(session.user);
  };
  const logout = () => {
    localStorage.removeItem('innovatex_token');
    setUser(null);
    setPage('Overview');
  };
  const notify = (message) => {
    setFlash(message);
    window.setTimeout(() => setFlash(''), 3200);
  };
  if (!ready) return <div className="loading"><div className="brand-icon"><Lightbulb/></div><span>Opening your workspace</span></div>;
  if (!user) return <Login onLogin={login}/>;

  const items = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Submissions', icon: FolderKanban },
    { name: 'Rankings', icon: Award },
    { name: 'Indicators', icon: Target },
    { name: 'Reports', icon: BarChart3 }
  ];
  return <div className="app">
    <aside className={'sidebar ' + (mobileOpen ? 'open' : '')}>
      <div className="brand"><div className="brand-icon"><Lightbulb size={21}/></div><div><strong>innovate<span>x</span></strong><small>EXCELLENCE PORTAL</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={17}/></button></div>
      <div className="side-label">WORKSPACE</div>
      <nav>{items.map((item) => <button key={item.name} className={page === item.name ? 'nav-item active' : 'nav-item'} onClick={() => { setPage(item.name); setMobileOpen(false); }}><item.icon size={18}/>{item.name}</button>)}</nav>
      <div className="side-bottom">
        <div className="help-box"><div className="help-icon"><BookOpen size={16}/></div><b>Ideas into impact</b><p>Track innovation, recognize contributors and make informed decisions.</p></div>
        <div className="profile"><div className="avatar">{initials(user.name)}</div><div className="profile-info"><b>{user.name}</b><small>{roleName(user.role)}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div>
      </div>
    </aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}
    <main className="main">
      <header className="topbar">
        <div className="top-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="crumb">Workspace <span>/</span> {page}</div><h1>{page}</h1></div></div>
        <div className="top-right"><span className="academic"><i/> Academic year 2025–26</span><button className="icon-btn notify" title="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{initials(user.name)}</div></div>
      </header>
      <div className="content">
        {flash && <div className="toast"><Check size={15}/>{flash}</div>}
        {page === 'Overview' && <Overview user={user} navigate={setPage}/>}
        {page === 'Submissions' && <Submissions user={user} notify={notify}/>}
        {page === 'New submission' && <NewSubmission back={() => setPage('Submissions')} notify={notify}/>}
        {page === 'Rankings' && <Rankings/>}
        {page === 'Indicators' && <Indicators user={user} notify={notify}/>}
        {page === 'Reports' && <Reports/>}
      </div>
    </main>
  </div>;
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@innovatex.edu');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin(await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <div className="login">
    <section className="login-visual">
      <div className="login-brand"><div className="brand-icon"><Lightbulb size={21}/></div><b>innovate<span>x</span></b></div>
      <div className="visual-copy"><div className="eyebrow"><Sparkles size={14}/> INNOVATION, MEASURED</div><h1>Great ideas<br/>deserve to be <em>seen.</em></h1><p>A shared space to capture the work, recognize the people and measure the ideas moving your institution forward.</p><div className="steps"><div><b>01</b><span>Capture ideas</span></div><div><b>02</b><span>Verify impact</span></div><div><b>03</b><span>Celebrate progress</span></div></div></div>
      <div className="visual-foot">INNOVATION EXCELLENCE PLATFORM <span>EST. 2026</span></div>
    </section>
    <section className="login-panel"><form onSubmit={submit} className="login-form"><div className="eyebrow dark"><ShieldCheck size={14}/> INSTITUTION WORKSPACE</div><h2>Welcome back</h2><p>Sign in to continue to your innovation dashboard.</p>
      <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required/></label>
      <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required/></label>
      {error && <div className="error">{error}</div>}
      <button className="btn primary wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16}/></button>
      <div className="demo"><b>Demo access</b>{DEMO_USERS.map((item) => <button type="button" key={item.role} onClick={() => { setEmail(item.email); setPassword(DEMO_PASSWORD); }}><span>{item.label}</span><small>{item.email}</small></button>)}<p>Shared demo password: <b>{DEMO_PASSWORD}</b></p></div>
      <div className="login-note">Academic prototype · Use demo accounts to explore each role.</div>
    </form></section>
  </div>;
}

function Heading({ eyebrow, title, description, action }) {
  return <div className="page-heading"><div><div className="eyebrow dark">{eyebrow}</div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}
function StatCard({ label, value, hint, icon: Icon, tint }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={'stat-icon ' + tint}><Icon size={18}/></span></div><strong>{money(value)}</strong><small>{hint}</small></div>;
}
function Status({ value }) {
  const label = { PENDING: 'Pending review', APPROVED: 'Approved', REJECTED: 'Needs changes' }[value] || value;
  return <span className={'status status-' + String(value).toLowerCase()}><i/>{label}</span>;
}
function Overview({ user, navigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api('/dashboard/summary'), api('/dashboard/trends'), api('/leaderboard'), api('/activity')])
      .then(([summary, trends, board, activity]) => setData({ summary, trends: trends.trends, board: board.leaderboard, activity: activity.activities }))
      .catch((err) => setError(err.message));
  }, []);
  if (!data && !error) return <div className="loading-inline">Loading institution insights…</div>;
  const summary = data ? data.summary : {};
  const metrics = [
    { label: 'Total submissions', value: summary.totalSubmissions, hint: 'Across all departments', icon: FileText, tint: 'blue' },
    { label: 'Approved evidence', value: summary.approved, hint: 'Verified contributions', icon: ShieldCheck, tint: 'green' },
    { label: 'Awaiting review', value: summary.pending, hint: 'Ready for faculty review', icon: ClipboardCheck, tint: 'amber' },
    { label: 'Innovation points', value: summary.totalPoints, hint: 'From approved evidence', icon: Sparkles, tint: 'violet' }
  ];
  return <>
    <div className="hero"><div><div className="eyebrow hero-eyebrow"><i/> INSTITUTIONAL SNAPSHOT</div><h2>Ideas into impact, <em>{String(user.name).split(' ')[0]}.</em></h2><p>Your institution’s innovation activity, all in one place.</p><button className="hero-link" onClick={() => navigate('Submissions')}>Explore submissions <ArrowRight size={14}/></button></div><div className="hero-orbit"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="orbit-center"><Lightbulb size={28}/></div><Sparkles className="hero-spark spark-a"/><Sparkles className="hero-spark spark-b"/></div></div>
    {error && <div className="error">{error}</div>}
    <div className="section-title"><div><h3>Performance at a glance</h3><p>A live view of submitted and verified innovation evidence.</p></div><span className="live-label"><i/> LIVE DATA</span></div>
    <div className="stats">{metrics.map((metric) => <StatCard key={metric.label} {...metric}/>)}</div>
    {data && <div className="grid-two">
      <section className="panel"><div className="panel-head"><div><h3>Innovation momentum</h3><p>Verified submissions by academic year</p></div><span className="legend-dot">Approved</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trends} margin={{ top: 14, right: 10, left: -18, bottom: 0 }}><defs><linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3973d6" stopOpacity={0.2}/><stop offset="100%" stopColor="#3973d6" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#8a96a8', fontSize: 11 }}/><YAxis tickLine={false} axisLine={false} tick={{ fill: '#8a96a8', fontSize: 11 }}/><Tooltip/><Area type="monotone" dataKey="submissions" stroke="#3973d6" strokeWidth={2.5} fill="url(#fillBlue)" activeDot={{ r: 5 }}/></AreaChart></ResponsiveContainer></div></section>
      <section className="panel"><div className="panel-head"><div><h3>Leading departments</h3><p>Ranked by verified innovation points</p></div><button className="link-btn" onClick={() => navigate('Rankings')}>View all <ArrowRight size={14}/></button></div><div className="mini-ranks">{data.board.slice(0, 4).map((row) => <div className="mini-rank" key={row.id}><span className={'rank-badge r' + row.rank}>{String(row.rank).padStart(2,'0')}</span><div className="rank-name"><b>{row.name}</b><small>{row.approvedCount} verified contributions</small></div><strong>{money(row.points)} <small>pts</small></strong></div>)}</div></section>
    </div>}
    {data && <section className="panel activity"><div className="panel-head"><div><h3>Recent activity</h3><p>The latest evidence submitted and reviewed across your institution.</p></div><button className="link-btn" onClick={() => navigate('Submissions')}>All submissions <ArrowRight size={14}/></button></div><SubmissionTable rows={data.activity} compact/></section>}
  </>;
}
function SubmissionTable({ rows, user, onReview, compact = false }) {
  if (!rows.length) return <div className="empty">No matching submissions found.</div>;
  return <div className="table-wrap"><table><thead><tr><th>CONTRIBUTION</th><th>INDICATOR</th><th>DEPARTMENT</th><th>CONTRIBUTOR</th><th>STATUS</th>{!compact && <><th>POINTS</th>{user && user.role !== 'STUDENT' && <th>ACTION</th>}</>}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><b className="row-title">{row.title}</b><small className="row-sub">{row.year} · {shortDate(row.createdAt)}</small></td><td>{categoryName(row.indicator.category)}</td><td>{row.department.code}</td><td>{row.submittedBy.name}</td><td><Status value={row.status}/></td>{!compact && <><td><b>{row.status === 'APPROVED' ? row.indicator.points : '—'}</b></td>{user && user.role !== 'STUDENT' && <td>{row.status === 'PENDING' ? <button className="btn small" onClick={() => onReview(row)}>Review</button> : <span className="muted">Reviewed</span>}</td>}</>}</tr>)}</tbody></table></div>;
}

function Submissions({ user, notify }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api('/submissions').then((data) => setRows(data.submissions)).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => rows.filter((row) => (status === 'ALL' || row.status === status) && [row.title,row.department.name,row.submittedBy.name,row.indicator.name].join(' ').toLowerCase().includes(search.toLowerCase())), [rows,status,search]);
  async function review(nextStatus) {
    setBusy(true); setError('');
    try {
      await api('/submissions/' + reviewing.id + '/review', { method: 'PATCH', body: JSON.stringify({ status: nextStatus, reviewerNote: note }) });
      setReviewing(null); setNote(''); await load(); notify(nextStatus === 'APPROVED' ? 'Evidence approved and scored.' : 'Changes requested from contributor.');
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <>
    <Heading eyebrow="EVIDENCE & CONTRIBUTIONS" title="Innovation submissions" description="Collect, review and maintain a reliable record of innovation across your institution." action={<button className="btn primary" onClick={() => window.dispatchEvent(new Event('open-new-submission'))}><Plus size={16}/> New submission</button>}/>
    <div className="toolbar"><div className="search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contributions, people or departments…"/></div><div className="select-wrap"><Filter size={16}/><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Needs changes</option></select><ChevronDown size={14}/></div></div>
    {error && <div className="error">{error}</div>}
    <section className="panel table-panel"><SubmissionTable rows={visible} user={user} onReview={setReviewing}/></section>
    {reviewing && <div className="modal-backdrop"><div className="modal"><div className="modal-head"><div><div className="eyebrow dark">FACULTY REVIEW</div><h3>Review contribution</h3></div><button className="icon-btn" onClick={() => setReviewing(null)}><X size={18}/></button></div><b>{reviewing.title}</b><p>{reviewing.description}</p><label>Review note<textarea value={note} onChange={(e) => setNote(e.target.value)} rows="3" placeholder="Add verification feedback…"/></label><div className="modal-actions"><button className="btn secondary" disabled={busy} onClick={() => review('REJECTED')}>Request changes</button><button className="btn primary" disabled={busy} onClick={() => review('APPROVED')}><Check size={15}/> Approve evidence</button></div></div></div>}
  </>;
}

function NewSubmission({ back, notify }) {
  const [indicators, setIndicators] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', indicatorId: '', year: new Date().getFullYear(), evidenceUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api('/indicators').then((data) => {
      const active = data.indicators.filter((item) => item.isActive);
      setIndicators(active);
      setForm((old) => ({ ...old, indicatorId: old.indicatorId || (active[0] ? active[0].id : '') }));
    }).catch((err) => setError(err.message));
  }, []);
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/submissions', { method: 'POST', body: JSON.stringify(form) }); notify('Innovation submitted for review.'); back(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <>
    <Heading eyebrow="CONTRIBUTION INTAKE" title="Submit an innovation" description="Record a project, publication or achievement for institutional review."/>
    <div className="form-layout"><form className="panel form-card" onSubmit={submit}><div className="form-title"><span>01</span><div><b>Contribution details</b><small>Tell us what was achieved and who it benefits.</small></div></div>
      <label>Contribution title <em>*</em><input value={form.title} onChange={(e) => change('title',e.target.value)} minLength="4" maxLength="140" placeholder="e.g. Smart campus energy monitoring" required/></label>
      <label>Innovation indicator <em>*</em><select value={form.indicatorId} onChange={(e) => change('indicatorId',e.target.value)} required>{indicators.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.points} points</option>)}</select></label>
      <label>Description <em>*</em><textarea rows="5" value={form.description} onChange={(e) => change('description',e.target.value)} minLength="15" maxLength="2500" placeholder="Describe the innovation, outcome, evidence and its impact…" required/></label>
      <div className="two-fields"><label>Academic year<input type="number" min="2000" max="2100" value={form.year} onChange={(e) => change('year',e.target.value)} required/></label><label>Evidence link <small>(optional)</small><input type="url" value={form.evidenceUrl} onChange={(e) => change('evidenceUrl',e.target.value)} placeholder="https://…"/></label></div>
      {error && <div className="error">{error}</div>}<div className="form-actions"><span><ShieldCheck size={15}/> Faculty will review your evidence.</span><button className="btn primary" disabled={busy || !indicators.length}>{busy ? 'Submitting…' : 'Submit for review'} <ArrowRight size={15}/></button></div>
    </form><aside className="panel form-aside"><div className="aside-art"><Lightbulb size={34}/><Sparkles size={16}/></div><h3>Every contribution counts.</h3><p>Verified evidence helps your institution understand its innovation strengths and recognize the people behind meaningful work.</p>{['Submissions are reviewed before scoring.','Approved records contribute to rankings.','Track review status anytime.'].map((text) => <div className="check-line" key={text}><Check size={15}/>{text}</div>)}</aside></div>
  </>;
}

function Indicators({ user, notify }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', category: 'PROJECT', description: '', points: 10 });
  const load = () => api('/indicators').then((data) => setItems(data.indicators)).catch((err) => setError(err.message));
  useEffect(() => { load(); }, []);
  async function add(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api('/indicators', { method: 'POST', body: JSON.stringify({ ...form, points: Number(form.points) }) }); setShow(false); setForm({ name: '', category: 'PROJECT', description: '', points: 10 }); await load(); notify('Indicator created.'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function toggle(item) {
    try { await api('/indicators/' + item.id, { method: 'PATCH', body: JSON.stringify({ isActive: !item.isActive }) }); await load(); notify('Indicator updated.'); }
    catch (err) { setError(err.message); }
  }
  const symbols = [Lightbulb,BookOpen,Award,Target,TrendingUp,ClipboardCheck];
  return <>
    <Heading eyebrow="MEASUREMENT FRAMEWORK" title="Innovation indicators" description="Define the evidence types and point values used to measure innovation excellence." action={user.role === 'ADMIN' && <button className="btn primary" onClick={() => setShow(!show)}><Plus size={16}/> Add indicator</button>}/>
    {error && <div className="error">{error}</div>}
    {show && <form className="panel indicator-form" onSubmit={add}><div className="two-fields"><label>Indicator name<input required minLength="3" value={form.name} onChange={(e) => setForm({ ...form, name:e.target.value })}/></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category:e.target.value })}>{['PROJECT','PUBLICATION','PATENT','GRANT','STARTUP','AWARD'].map((x) => <option key={x} value={x}>{categoryName(x)}</option>)}</select></label></div><div className="two-fields"><label>Description<input required minLength="8" value={form.description} onChange={(e) => setForm({ ...form, description:e.target.value })}/></label><label>Points<input type="number" min="1" max="100" value={form.points} onChange={(e) => setForm({ ...form, points:e.target.value })}/></label></div><div className="form-actions"><span/><button className="btn primary" disabled={busy}>Save indicator</button></div></form>}
    <div className="indicator-grid">{items.map((item,index) => { const Icon = symbols[index % symbols.length]; return <div className="panel indicator-card" key={item.id}><div className="indicator-top"><span className="indicator-symbol"><Icon size={19}/></span><span className={item.isActive ? 'active-text' : 'inactive-text'}>{item.isActive ? 'ACTIVE' : 'INACTIVE'}</span></div><h3>{item.name}</h3><p>{item.description}</p><div className="indicator-bottom"><span>{categoryName(item.category)}</span><b>{item.points} <small>pts</small></b></div>{user.role === 'ADMIN' && <button className="link-btn" onClick={() => toggle(item)}>{item.isActive ? 'Deactivate indicator' : 'Activate indicator'}</button>}</div>; })}</div>
  </>;
}

function Rankings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/leaderboard').then((data) => setItems(data.leaderboard)).finally(() => setLoading(false)); }, []);
  const max = Math.max(1,...items.map((item) => item.points));
  return <>
    <Heading eyebrow="INSTITUTIONAL RECOGNITION" title="Department rankings" description="Recognizing teams and departments for their verified innovation contributions."/>
    <section className="panel ranking-panel"><div className="panel-head"><div><h3>Innovation excellence leaderboard</h3><p>Based on approved submissions and configured indicator weights.</p></div><span className="live-label">CURRENT STANDINGS</span></div>
      {loading ? <div className="loading-inline">Calculating rankings…</div> : <><div className="podium">{items.slice(0,3).map((item,index) => <div className={'podium-item podium-' + (index+1)} key={item.id}><div className="podium-avatar">{item.code}</div><b>{item.name}</b><span>{money(item.points)} pts</span><div className="podium-base">{index+1}</div></div>)}</div><div className="ranking-rows">{items.map((item) => <div className="ranking-row" key={item.id}><b className="rank-n">{String(item.rank).padStart(2,'0')}</b><div className="rank-unit"><strong>{item.name}</strong><small>{item.approvedCount} approved · {item.members} members</small><div className="progress"><i style={{ width: (item.points/max*100) + '%' }}/></div></div><b className="points">{money(item.points)} <small>points</small></b></div>)}</div></>}
    </section>
  </>;
}

function Reports() {
  const [summary, setSummary] = useState({});
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api('/dashboard/summary'),api('/leaderboard')]).then(([s,b]) => { setSummary(s); setBoard(b.leaderboard); }).catch((err) => setError(err.message));
  }, []);
  async function exportCsv() {
    try {
      const token = localStorage.getItem('innovatex_token');
      const response = await fetch('/api/reports/export.csv',{ headers:{ Authorization:'Bearer '+token } });
      if (!response.ok) throw new Error('Unable to export report.');
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a'); anchor.href=url; anchor.download='innovatex-report.csv'; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(err.message); }
  }
  const statusData = [{ name:'Approved',value:summary.approved || 0,color:'#3973d6' },{ name:'Pending',value:summary.pending || 0,color:'#e6ad53' },{ name:'Needs changes',value:summary.rejected || 0,color:'#d67c83' }];
  return <>
    <Heading eyebrow="DATA & DECISION SUPPORT" title="Reports & insights" description="A consolidated view of innovation activity to support institutional decisions." action={<button className="btn primary" onClick={exportCsv}><Download size={16}/> Export CSV</button>}/>
    {error && <div className="error">{error}</div>}
    <div className="report-stats">{[{label:'Total contributors',value:summary.users,note:'Across all departments'},{label:'Active indicators',value:summary.indicators,note:'Measurement categories'},{label:'Departments',value:summary.departments,note:'Participating units'},{label:'Verified points',value:summary.totalPoints,note:'Approved evidence only'}].map((item) => <div className="panel report-stat" key={item.label}><span>{item.label}</span><strong>{money(item.value)}</strong><small>{item.note}</small></div>)}</div>
    <div className="grid-two report-grid"><section className="panel"><div className="panel-head"><div><h3>Review distribution</h3><p>Current status of all submissions</p></div></div><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={4} stroke="none">{statusData.map((item) => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><b>{money(summary.totalSubmissions)}</b><small>Submissions</small></div></div><div className="pie-legend">{statusData.map((item) => <span key={item.name}><i style={{background:item.color}}/>{item.name}<b>{item.value}</b></span>)}</div></section>
      <section className="panel"><div className="panel-head"><div><h3>Department performance</h3><p>Verified innovation points by department</p></div></div><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={board} layout="vertical" margin={{top:8,right:15,left:8,bottom:0}}><CartesianGrid stroke="#edf0f5" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="code" tickLine={false} axisLine={false} tick={{fill:'#68758a',fontSize:11}}/><Tooltip/><Bar dataKey="points" name="Innovation points" fill="#3973d6" radius={[0,6,6,0]} barSize={19}/></BarChart></ResponsiveContainer></div></section></div>
    <section className="panel report-note"><span><Target size={20}/></span><div><b>How the score is calculated</b><p>Only approved evidence contributes to points. Each contribution receives the weight configured for its innovation indicator. Pending and rejected records remain visible in reporting but do not add to department scores.</p></div></section>
  </>;
}

function Root() {
  const [page,setPage] = useState('Overview');
  useEffect(() => {
    const handler = () => setPage('New submission');
    window.addEventListener('open-new-submission',handler);
    return () => window.removeEventListener('open-new-submission',handler);
  }, []);
  return <AppWithPage page={page} setPage={setPage}/>;
}
function AppWithPage({page,setPage}) {
  const [user,setUser] = useState(null);
  const [ready,setReady] = useState(false);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [flash,setFlash] = useState('');
  useEffect(() => {
    const token = localStorage.getItem('innovatex_token');
    if (!token) { setReady(true); return; }
    api('/auth/me').then((data) => setUser(data.user)).catch(() => localStorage.removeItem('innovatex_token')).finally(() => setReady(true));
  }, []);
  const login = (session) => { localStorage.setItem('innovatex_token',session.token); setUser(session.user); };
  const logout = () => { localStorage.removeItem('innovatex_token'); setUser(null); setPage('Overview'); };
  const notify = (message) => { setFlash(message); window.setTimeout(() => setFlash(''),3000); };
  if (!ready) return <div className="loading"><div className="brand-icon"><Lightbulb/></div><span>Opening your workspace</span></div>;
  if (!user) return <Login onLogin={login}/>;
  const nav = [{name:'Overview',icon:LayoutDashboard},{name:'Submissions',icon:FolderKanban},{name:'Rankings',icon:Award},{name:'Indicators',icon:Target},{name:'Reports',icon:BarChart3}];
  const title = page === 'New submission' ? 'Submit innovation' : page;
  return <div className="app">
    <aside className={'sidebar '+(mobileOpen?'open':'')}><div className="brand"><div className="brand-icon"><Lightbulb size={21}/></div><div><strong>innovate<span>x</span></strong><small>EXCELLENCE PORTAL</small></div><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={17}/></button></div><div className="side-label">WORKSPACE</div><nav>{nav.map((item) => <button key={item.name} className={page===item.name?'nav-item active':'nav-item'} onClick={() => {setPage(item.name);setMobileOpen(false);}}><item.icon size={18}/>{item.name}</button>)}</nav><div className="side-bottom"><div className="help-box"><div className="help-icon"><BookOpen size={16}/></div><b>Ideas into impact</b><p>Track innovation, recognize contributors and make informed decisions.</p></div><div className="profile"><div className="avatar">{initials(user.name)}</div><div className="profile-info"><b>{user.name}</b><small>{roleName(user.role)}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
    {mobileOpen && <button className="scrim" onClick={() => setMobileOpen(false)}/>}
    <main className="main"><header className="topbar"><div className="top-left"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><div className="crumb">Workspace <span>/</span> {title}</div><h1>{title}</h1></div></div><div className="top-right"><span className="academic"><i/> Academic year 2025–26</span><button className="icon-btn notify" title="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{initials(user.name)}</div></div></header><div className="content">{flash && <div className="toast"><Check size={15}/>{flash}</div>}{page==='Overview' && <Overview user={user} navigate={setPage}/>}{page==='Submissions' && <Submissions user={user} notify={notify}/>}{page==='New submission' && <NewSubmission back={() => setPage('Submissions')} notify={notify}/>}{page==='Rankings' && <Rankings/>}{page==='Indicators' && <Indicators user={user} notify={notify}/>}{page==='Reports' && <Reports/>}</div></main>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><Root/></React.StrictMode>);
