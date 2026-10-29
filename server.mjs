// Lokální server dashboardu: API nad SQLite + servírování frontendu a médií.
//   node server.mjs        -> produkce (servíruje build z dist/)
//   node server.mjs --dev  -> vývoj (Vite middleware s hot reloadem)
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEtestyHtml } from './server/etesty-parser.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 5174);
const DEV = process.argv.includes('--dev');

// Databáze běží na vestavěném node:sqlite, ten je v Node.js od verze 22.5
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 5)) {
  console.error(`Potřebuješ Node.js 22.5 nebo novější (máš ${process.versions.node}). Stáhni ho z https://nodejs.org`);
  process.exit(1);
}
const { DatabaseSync } = await import('node:sqlite');

// --- Databáze otázek (jen pro čtení, z data/questions.json) ---
const bankPath = path.join(ROOT, 'data/questions.json');
if (!existsSync(bankPath)) {
  console.error('Chybí data/questions.json – nejdřív spusť: npm run fetch-bank');
  process.exit(1);
}
const bank = JSON.parse(readFileSync(bankPath, 'utf8'));
const byId = new Map(bank.questions.map((q) => [q.id, q]));

// --- Tvoje data (testy a odpovědi) ---
mkdirSync(path.join(ROOT, 'data'), { recursive: true });
const db = new DatabaseSync(path.join(ROOT, 'data/progress.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,            -- 'dashboard' | 'etesty' | 'pripoustecí'
    kind TEXT NOT NULL,              -- 'exam' | 'practice'
    title TEXT NOT NULL,
    external_id TEXT UNIQUE,         -- test_ident z autoskola-testy.cz
    started_at TEXT NOT NULL,
    duration_s INTEGER,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    pass_score INTEGER,
    correct_count INTEGER NOT NULL,
    total INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS answers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
    pos INTEGER,
    question_id INTEGER,             -- NULL = otázka mimo ministerskou sadu (např. připouštěcí test)
    chosen_answer_id INTEGER,        -- NULL = bez odpovědi
    is_correct INTEGER NOT NULL,
    time_ms INTEGER,
    mode TEXT NOT NULL,              -- 'exam' | 'practice' | 'review' | 'etesty'
    answered_at TEXT NOT NULL,
    snapshot TEXT                    -- JSON s textem otázky pro otázky mimo sadu
  );
  CREATE INDEX IF NOT EXISTS answers_q ON answers(question_id, answered_at);
  CREATE INDEX IF NOT EXISTS answers_t ON answers(test_id, pos);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString();

function insertTest(t, items) {
  db.exec('BEGIN');
  try {
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO tests (source, kind, title, external_id, started_at, duration_s, score, max_score, pass_score, correct_count, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      t.source, t.kind, t.title, t.external_id ?? null, t.started_at, t.duration_s ?? null,
      t.score, t.max_score, t.pass_score ?? null, t.correct_count, t.total);
    const ins = db.prepare(`
      INSERT INTO answers (test_id, pos, question_id, chosen_answer_id, is_correct, time_ms, mode, answered_at, snapshot)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    items.forEach((a, i) => ins.run(
      lastInsertRowid, i + 1, a.question_id ?? null, a.chosen_answer_id ?? null, a.is_correct ? 1 : 0,
      a.time_ms ?? null, a.mode, a.answered_at ?? t.started_at, a.snapshot ? JSON.stringify(a.snapshot) : null));
    db.exec('COMMIT');
    return Number(lastInsertRowid);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// --- Import z autoskola-testy.cz: párování otázek s ministerskou sadou podle textu ---
const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const byQuestionText = new Map();
for (const q of bank.questions) {
  const key = norm(q.text);
  if (!byQuestionText.has(key)) byQuestionText.set(key, []);
  byQuestionText.get(key).push(q);
}

function matchQuestion(item) {
  const candidates = byQuestionText.get(norm(item.text)) ?? [];
  const answerSet = (texts) => texts.map(norm).sort().join('|');
  const wanted = answerSet(item.answers.map((a) => a.text));
  return candidates.find((q) => answerSet(q.answers.map((a) => a.text)) === wanted) ?? null;
}

function importEtesty(html) {
  const parsed = parseEtestyHtml(html);
  const existing = db.prepare('SELECT id FROM tests WHERE external_id = ?').get(parsed.externalId);
  if (existing) return { status: 'duplicate', id: existing.id, title: parsed.title };
  let matched = 0;
  const items = parsed.items.map((it) => {
    const q = matchQuestion(it);
    const chosenIdx = it.answers.findIndex((a) => a.chosen);
    const base = { is_correct: it.isCorrect, time_ms: it.timeMs, mode: 'etesty', answered_at: parsed.startedAt };
    if (q) {
      matched++;
      const chosen = chosenIdx >= 0 ? q.answers.find((a) => norm(a.text) === norm(it.answers[chosenIdx].text)) : null;
      return { ...base, question_id: q.id, chosen_answer_id: chosen?.id ?? null };
    }
    return { ...base, snapshot: { code: it.code, category: it.category, points: it.points, text: it.text, image: it.image, answers: it.answers } };
  });
  const id = insertTest({
    source: parsed.isPripoustecí ? 'pripoustecí' : 'etesty',
    kind: 'exam',
    title: parsed.title,
    external_id: parsed.externalId,
    started_at: parsed.startedAt,
    duration_s: parsed.durationS,
    score: parsed.score,
    max_score: parsed.maxScore,
    pass_score: parsed.passScore,
    correct_count: parsed.items.filter((i) => i.isCorrect).length,
    total: parsed.items.length,
  }, items);
  return { status: 'imported', id, title: parsed.title, total: items.length, matched };
}

// --- HTTP ---
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

async function readBody(req, limit = 5_000_000) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw Object.assign(new Error('Požadavek je příliš velký'), { status: 413 });
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const routes = {
  'GET /api/bank': (req, res) => send(res, 200, bank, { 'Cache-Control': 'no-cache' }),

  // Profil: jméno a autoškola, na které se aplikace zeptá při prvním spuštění
  'GET /api/profile': (req, res) => {
    const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('name', 'school')").all();
    send(res, 200, Object.fromEntries(rows.map((r) => [r.key, r.value])));
  },
  'PUT /api/profile': async (req, res) => {
    const p = JSON.parse(await readBody(req));
    const set = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    for (const key of ['name', 'school']) {
      const value = String(p[key] ?? '').trim().slice(0, 80);
      if (value) set.run(key, value);
    }
    send(res, 200, { ok: true });
  },

  // Všechny odpovědi na ministerské otázky (pro výpočet statistik a chybovníku na frontendu)
  'GET /api/answers': (req, res) => send(res, 200, db.prepare(
    `SELECT question_id AS q, is_correct AS c, answered_at AS t, mode AS m FROM answers
     WHERE question_id IS NOT NULL ORDER BY answered_at, id`).all()),

  // Jedna odpověď z procvičování
  'POST /api/answers': async (req, res) => {
    const a = JSON.parse(await readBody(req));
    const q = byId.get(a.question_id);
    if (!q) return send(res, 400, { error: 'Neznámá otázka' });
    const isCorrect = a.chosen_answer_id === q.correct;
    db.prepare(`INSERT INTO answers (question_id, chosen_answer_id, is_correct, time_ms, mode, answered_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(q.id, a.chosen_answer_id ?? null, isCorrect ? 1 : 0, a.time_ms ?? null, a.mode ?? 'practice', now());
    send(res, 201, { is_correct: isCorrect });
  },

  // Špatně zodpovězené otázky mimo ministerskou sadu (např. vlastní otázky autoškoly z připouštěcího testu)
  'GET /api/external-wrong': (req, res) => send(res, 200, db.prepare(
    `SELECT a.test_id, t.started_at, t.title, a.snapshot FROM answers a JOIN tests t ON t.id = a.test_id
     WHERE a.question_id IS NULL AND a.is_correct = 0 ORDER BY t.started_at DESC, a.pos`).all()
    .map((r) => ({ ...r, snapshot: JSON.parse(r.snapshot) }))),

  'GET /api/tests': (req, res) => send(res, 200, db.prepare('SELECT * FROM tests ORDER BY started_at DESC').all()),

  // Dokončená cvičná zkouška z dashboardu; skóre se počítá na serveru
  'POST /api/tests': async (req, res) => {
    const t = JSON.parse(await readBody(req));
    const items = t.items.map((it) => {
      const q = byId.get(it.question_id);
      if (!q) throw Object.assign(new Error('Neznámá otázka'), { status: 400 });
      return { question_id: q.id, chosen_answer_id: it.chosen_answer_id ?? null, is_correct: it.chosen_answer_id === q.correct, time_ms: it.time_ms, mode: 'exam', points: q.points };
    });
    const score = items.reduce((s, i) => s + (i.is_correct ? i.points : 0), 0);
    const maxScore = items.reduce((s, i) => s + i.points, 0);
    const id = insertTest({
      source: 'dashboard', kind: 'exam', title: 'Cvičná zkouška – skupina B',
      started_at: t.started_at, duration_s: t.duration_s, score, max_score: maxScore, pass_score: 43,
      correct_count: items.filter((i) => i.is_correct).length, total: items.length,
    }, items.map((i) => ({ ...i, answered_at: now() })));
    send(res, 201, { id });
  },

  // Import nahraného souboru ze stránky Import
  'POST /api/import/etesty': async (req, res) => {
    try {
      send(res, 200, importEtesty(JSON.parse(await readBody(req, 10_000_000)).html));
    } catch (e) {
      send(res, 400, { error: e.message });
    }
  },
};

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const testMatch = url.pathname.match(/^\/api\/tests\/(\d+)$/);
  if (testMatch && req.method === 'GET') {
    const test = db.prepare('SELECT * FROM tests WHERE id = ?').get(Number(testMatch[1]));
    if (!test) return send(res, 404, { error: 'Test nenalezen' });
    const items = db.prepare('SELECT pos, question_id, chosen_answer_id, is_correct, time_ms, snapshot FROM answers WHERE test_id = ? ORDER BY pos').all(test.id)
      .map((a) => ({ ...a, snapshot: a.snapshot ? JSON.parse(a.snapshot) : null }));
    return send(res, 200, { ...test, items });
  }
  if (testMatch && req.method === 'DELETE') {
    db.prepare('DELETE FROM answers WHERE test_id = ?').run(Number(testMatch[1]));
    db.prepare('DELETE FROM tests WHERE id = ?').run(Number(testMatch[1]));
    return send(res, 200, { ok: true });
  }
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) return send(res, 404, { error: 'Nenalezeno' });
  try {
    await handler(req, res);
  } catch (e) {
    send(res, e.status ?? 500, { error: e.message });
  }
}

// Záložka (bookmarklet) na autoskola-testy.cz odešle stránku vyhodnocení jako obyčejný formulář.
// Je to navigace, ne fetch, takže ji prohlížeč nepodmiňuje povolením přístupu do místní sítě.
const BOOKMARKLET_ORIGINS = new Set(['https://www.autoskola-testy.cz', 'https://autoskola-testy.cz']);
async function handleBookmarklet(req, res) {
  const redirect = (hash) => { res.writeHead(303, { Location: `/#${hash}` }); res.end(); };
  // autoskola-testy.cz posílá Origin "null" a žádný Referer (přísná referrer policy). Odmítáme tedy jen
  // požadavky z jiného konkrétního webu; obsah pak musí projít parserem stránky vyhodnocení testu.
  const origin = req.headers.origin;
  if (origin && origin !== 'null' && !BOOKMARKLET_ORIGINS.has(origin)) {
    console.error('Import ze záložky odmítnut – neznámý zdroj:', req.headers.origin, req.headers.referer);
    return redirect('/import/chyba');
  }
  try {
    const html = new URLSearchParams(await readBody(req, 10_000_000)).get('html') ?? '';
    const r = importEtesty(html);
    redirect(`/historie/${r.id}`);
  } catch (e) {
    console.error('Import ze záložky selhal:', e.message);
    redirect('/import/chyba');
  }
}

const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.mp4': 'video/mp4', '.json': 'application/json' };

// Statické soubory s podporou Range (kvůli přehrávání videí)
function serveFile(req, res, file) {
  const { size } = statSync(file);
  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Number(range[2]) : size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': file.includes(`${path.sep}media${path.sep}`) ? 'max-age=31536000' : 'no-cache' });
  createReadStream(file).pipe(res);
}

function staticFile(dir, pathname) {
  const file = path.join(dir, decodeURIComponent(pathname));
  if (!file.startsWith(dir + path.sep)) return null;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

let vite;
if (DEV) {
  const { createServer } = await import('vite');
  vite = await createServer({ root: ROOT, server: { middlewareMode: true }, appType: 'spa' });
}

const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) return handleApi(req, res);
  if (pathname === '/import/etesty' && req.method === 'POST') return handleBookmarklet(req, res);
  if (pathname.startsWith('/media/')) {
    const file = staticFile(PUBLIC, pathname);
    if (file) return serveFile(req, res, file);
    // Média nejsou stažená (npm run fetch-bank): načtou se přímo z webu ministerstva
    const name = path.basename(decodeURIComponent(pathname));
    if (!/^[\w.-]+$/.test(name)) return send(res, 404, { error: 'Soubor nenalezen' });
    res.writeHead(302, { Location: `https://etesty.md.gov.cz/binary_content_storage/${name}` });
    return res.end();
  }
  if (vite) return vite.middlewares(req, res);
  const file = staticFile(DIST, pathname === '/' ? '/index.html' : pathname) ?? path.join(DIST, 'index.html');
  if (!existsSync(file)) return send(res, 500, { error: 'Chybí build – spusť npm start' });
  serveFile(req, res, file);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Autoškola dashboard běží na http://localhost:${PORT}`);
});
