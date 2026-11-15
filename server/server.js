'use strict';
/* ============================================================
   Servidor do Ateliê da Beleza — API + site estático (../site)
   SEM dependências externas: usa apenas módulos nativos do Node (>= 22.13):
   http, crypto, fs e node:sqlite. Basta `node server.js`.
   ============================================================ */
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

/* ---------- .env mínimo ---------- */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !l.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch (e) { /* sem .env: usa variáveis do ambiente */ }

const SITE = path.join(__dirname, '..', 'site');
const cfg = require(path.join(SITE, 'js', 'config.js'));
const catalog = require(path.join(SITE, 'js', 'catalog.js'));
const E = require(path.join(SITE, 'js', 'engine.js'));

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const CORS = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
if (PROD && (!ADMIN_PASSWORD || ADMIN_PASSWORD.startsWith('troque'))) {
  console.error('Defina ADMIN_PASSWORD no .env antes de iniciar em produção.');
  process.exit(1);
}

/* ---------- Banco (SQLite) ---------- */
const DB_FILE = process.env.DB_FILE === ':memory:' ? ':memory:' : process.env.DB_FILE ? path.resolve(__dirname, process.env.DB_FILE) : path.join(__dirname, 'data', 'atelie.db');
if (DB_FILE !== ':memory:') fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS agendamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT UNIQUE NOT NULL, servicos TEXT NOT NULL, categoria TEXT NOT NULL,
  profissional TEXT NOT NULL, duracao INTEGER NOT NULL, total REAL NOT NULL,
  data TEXT NOT NULL, hora TEXT NOT NULL, nome TEXT NOT NULL, telefone TEXT NOT NULL,
  email TEXT DEFAULT '', obs TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pendente', criadoEm TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ag_data ON agendamentos(data, profissional);
CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, telefone TEXT DEFAULT '',
  email TEXT DEFAULT '', assunto TEXT DEFAULT '', mensagem TEXT NOT NULL,
  lida INTEGER NOT NULL DEFAULT 0, criadoEm TEXT NOT NULL
);`);

const plain = (r) => (r ? Object.assign({}, r) : r);
const toBooking = (r) => (r ? Object.assign(plain(r), { servicos: JSON.parse(r.servicos) }) : r);
const bookingsOn = (date) => db.prepare('SELECT * FROM agendamentos WHERE data = ? AND status != ?').all(date, 'cancelado').map(toBooking);

function insertBooking(input) {
  db.exec('BEGIN IMMEDIATE'); // trava de escrita: checagem + insert sem corrida entre pedidos simultâneos
  try {
    const b = E.buildBooking({ input, catalog, cfg, bookings: bookingsOn(input.data) });
    const r = db.prepare(`INSERT INTO agendamentos
      (codigo,servicos,categoria,profissional,duracao,total,data,hora,nome,telefone,email,obs,status,criadoEm)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(b.codigo, JSON.stringify(b.servicos), b.categoria, b.profissional, b.duracao, b.total,
      b.data, b.hora, b.nome, b.telefone, b.email, b.obs, b.status, b.criadoEm);
    db.exec('COMMIT');
    b.id = Number(r.lastInsertRowid);
    return b;
  } catch (e) { try { db.exec('ROLLBACK'); } catch (x) { /* já revertido */ } throw e; }
}

/* ---------- E-mail opcional via Resend (https://resend.com) ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function mail(to, subject, html) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], subject, html })
    });
    if (!r.ok) console.error('Falha ao enviar e-mail:', r.status, await r.text());
  } catch (e) { console.error('Falha ao enviar e-mail:', e.message); }
}
const fmtDate = (d) => d.split('-').reverse().join('/');
const resumo = (b) => `<p><b>${esc(b.servicos.map((s) => s.nome).join(', '))}</b><br>${fmtDate(b.data)} às ${b.hora} · ${E.dur(b.duracao)} · ${E.brl(b.total)}<br>Código: <b>${b.codigo}</b></p>`;

/* ---------- Utilidades HTTP ---------- */
const hits = new Map(); // limitador de taxa em memória: chave -> [timestamps]
function limited(req, bucket, max, windowMs) {
  const ip = (PROD && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;
  const key = bucket + ':' + ip, now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some((t) => now - t < 900000)) hits.delete(k); }, 600000).unref();

const SECURITY = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-src https://www.google.com; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
};
if (PROD) SECURITY['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';

function send(res, status, obj, extra) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SECURITY, extra));
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > 20000) { reject(Object.assign(new Error('grande'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {}); } catch (e) { reject(Object.assign(new Error('json'), { status: 400 })); } });
    req.on('error', reject);
  });
}

/* ---------- Admin: sessão assinada (HMAC) ---------- */
const sign = (payload) => { const p = Buffer.from(JSON.stringify(payload)).toString('base64url'); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('base64url'); };
function verify(tok) {
  const [p, s] = String(tok || '').split('.');
  if (!p || !s) return false;
  const ok = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return false;
  try { return JSON.parse(Buffer.from(p, 'base64url').toString()).exp > Date.now(); } catch (e) { return false; }
}
const sha = (s) => crypto.createHash('sha256').update(s).digest();
const isAdmin = (req) => verify((req.headers.authorization || '').replace(/^Bearer /, ''));

/* ---------- Rotas da API ---------- */
const own = (codigo, telefone) => {
  const r = db.prepare('SELECT * FROM agendamentos WHERE codigo = ?').get(String(codigo || '').trim().toUpperCase());
  return r && r.telefone === E.normPhone(telefone) ? toBooking(r) : null;
};

async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname;
  const B = ['POST /api/agendamentos', 'POST /api/agendamentos/consulta', 'POST /api/agendamentos/cancelar', 'POST /api/contato'];
  if (B.includes(route) && limited(req, 'w', 30, 15 * 60 * 1000)) return send(res, 429, { erro: 'Muitas tentativas. Aguarde alguns minutos.' });

  if (route === 'GET /api/health') return send(res, 200, { ok: true });

  if (route === 'GET /api/disponibilidade') {
    const q = url.searchParams, date = q.get('date'), duration = Number(q.get('duracao')), cat = q.get('categoria'), pro = q.get('profissional');
    if (!E.isDate(date) || !(duration >= 15 && duration <= 600)) return send(res, 400, { erro: 'Parâmetros inválidos.' });
    const eligible = catalog.equipe.filter((p) => p.cats.includes(cat)).map((p) => p.id);
    const proIds = pro && pro !== 'any' ? eligible.filter((id) => id === pro) : eligible;
    return send(res, 200, { horarios: E.slots({ date, duration, proIds, bookings: bookingsOn(date), cfg }) });
  }

  if (route === 'POST /api/agendamentos') {
    const body = await readBody(req);
    if (body.website) return send(res, 400, { erro: 'Requisição inválida.' }); // honeypot anti-robô
    const b = insertBooking(body);
    mail(process.env.MAIL_TO, `Novo agendamento ${b.codigo} — ${b.nome}`, `<h2>Novo agendamento</h2>${resumo(b)}<p>${esc(b.nome)} · ${esc(b.telefone)} ${esc(b.email)}<br>${esc(b.obs)}</p>`);
    if (b.email) mail(b.email, `Agendamento recebido — ${cfg.nome}`, `<h2>Recebemos seu agendamento</h2>${resumo(b)}<p>Entraremos em contato para confirmar. Para consultar ou cancelar, use o código acima e seu telefone no nosso site.</p>`);
    return send(res, 201, { agendamento: b });
  }

  if (route === 'POST /api/agendamentos/consulta') {
    const body = await readBody(req), b = own(body.codigo, body.telefone);
    return b ? send(res, 200, { agendamento: b }) : send(res, 404, { erro: 'Não encontramos um agendamento com esse código e telefone.' });
  }

  if (route === 'POST /api/agendamentos/cancelar') {
    const body = await readBody(req), b = own(body.codigo, body.telefone);
    if (!b) return send(res, 404, { erro: 'Agendamento não encontrado.' });
    if (b.status === 'concluido') return send(res, 409, { erro: 'Este atendimento já foi concluído.' });
    db.prepare('UPDATE agendamentos SET status = ? WHERE id = ?').run('cancelado', b.id);
    b.status = 'cancelado';
    mail(process.env.MAIL_TO, `Agendamento cancelado ${b.codigo}`, `<h2>Cancelado pelo cliente</h2>${resumo(b)}<p>${esc(b.nome)} · ${esc(b.telefone)}</p>`);
    return send(res, 200, { agendamento: b });
  }

  if (route === 'POST /api/contato') {
    const { nome, telefone, email, assunto, mensagem, website } = await readBody(req);
    if (website) return send(res, 400, { erro: 'Requisição inválida.' });
    const n = String(nome || '').trim().slice(0, 80), m = String(mensagem || '').trim().slice(0, 2000);
    const tel = E.normPhone(telefone), em = String(email || '').trim().slice(0, 120);
    const bad = (erro, campo) => send(res, 400, { erro, campo });
    if (n.length < 2) return bad('Informe seu nome.', 'nome');
    if (!E.validEmail(em)) return bad('E-mail inválido.', 'email');
    if (!tel && !em) return bad('Informe um telefone ou e-mail para retornarmos.', 'telefone');
    if (tel && !E.validPhone(tel)) return bad('Informe um telefone válido com DDD.', 'telefone');
    if (m.length < 5) return bad('Escreva sua mensagem.', 'mensagem');
    db.prepare('INSERT INTO mensagens (nome,telefone,email,assunto,mensagem,criadoEm) VALUES (?,?,?,?,?,?)').run(n, tel, em, String(assunto || '').slice(0, 60), m, new Date().toISOString());
    mail(process.env.MAIL_TO, `Contato pelo site — ${n}`, `<p><b>${esc(n)}</b> · ${esc(tel)} · ${esc(em)}<br>Assunto: ${esc(assunto || '-')}</p><p>${esc(m).replace(/\n/g, '<br>')}</p>`);
    return send(res, 201, { ok: true });
  }

  if (route === 'POST /api/admin/login') {
    if (limited(req, 'login', 8, 15 * 60 * 1000)) return send(res, 429, { erro: 'Muitas tentativas de login. Aguarde 15 minutos.' });
    const { senha } = await readBody(req);
    if (!ADMIN_PASSWORD || !crypto.timingSafeEqual(sha(String(senha || '')), sha(ADMIN_PASSWORD))) return send(res, 401, { erro: 'Senha incorreta.' });
    return send(res, 200, { token: sign({ exp: Date.now() + 12 * 3600 * 1000 }) });
  }

  if (url.pathname.startsWith('/api/admin/')) {
    if (!isAdmin(req)) return send(res, 401, { erro: 'Sessão expirada. Entre novamente.' });
    if (route === 'GET /api/admin/agendamentos') return send(res, 200, { agendamentos: db.prepare('SELECT * FROM agendamentos ORDER BY data DESC, hora DESC LIMIT 1000').all().map(toBooking) });
    if (route === 'GET /api/admin/mensagens') return send(res, 200, { mensagens: db.prepare('SELECT * FROM mensagens ORDER BY id DESC LIMIT 500').all().map(plain) });
    let m;
    if (req.method === 'PATCH' && (m = url.pathname.match(/^\/api\/admin\/agendamentos\/(\d+)$/))) {
      const { status } = await readBody(req), id = Number(m[1]);
      if (!['pendente', 'confirmado', 'concluido', 'cancelado'].includes(status)) return send(res, 400, { erro: 'Status inválido.' });
      if (!db.prepare('UPDATE agendamentos SET status = ? WHERE id = ?').run(status, id).changes) return send(res, 404, { erro: 'Agendamento não encontrado.' });
      const b = toBooking(db.prepare('SELECT * FROM agendamentos WHERE id = ?').get(id));
      if (status === 'confirmado' && b.email) mail(b.email, `Agendamento confirmado — ${cfg.nome}`, `<h2>Seu horário está confirmado</h2>${resumo(b)}`);
      return send(res, 200, { agendamento: b });
    }
    if (req.method === 'PATCH' && (m = url.pathname.match(/^\/api\/admin\/mensagens\/(\d+)$/))) {
      db.prepare('UPDATE mensagens SET lida = 1 WHERE id = ?').run(Number(m[1]));
      return send(res, 200, { ok: true });
    }
  }
  return send(res, 404, { erro: 'Rota não encontrada.' });
}

/* ---------- Site estático ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
function serveFile(res, file, status) {
  const ext = path.extname(file).toLowerCase();
  const headers = Object.assign({ 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.html' ? 'no-cache' : (PROD ? 'public, max-age=604800' : 'no-cache') }, SECURITY);
  if (ext === '.html' && path.basename(file) === 'admin.html') headers['X-Robots-Tag'] = 'noindex';
  res.writeHead(status || 200, headers);
  fs.createReadStream(file).pipe(res);
}
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { erro: 'Método não permitido.' });
  let p; try { p = decodeURIComponent(url.pathname); } catch (e) { p = '/'; }
  let file = path.normalize(path.join(SITE, p));
  if (!file.startsWith(SITE + path.sep) && file !== SITE) return serveFile(res, path.join(SITE, '404.html'), 404);
  const candidates = [file, file + '.html', path.join(file, 'index.html')];
  const hit = candidates.find((f) => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } });
  return hit ? serveFile(res, hit) : serveFile(res, path.join(SITE, '404.html'), 404);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && CORS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
      return await api(req, res, url);
    }
    serveStatic(req, res, url);
  } catch (err) {
    if (err instanceof E.ValidationError) return send(res, 400, { erro: err.message, campo: err.field });
    if (err.status === 413) return send(res, 413, { erro: 'Requisição grande demais.' });
    if (err.status === 400) return send(res, 400, { erro: 'Requisição inválida.' });
    console.error(err);
    send(res, 500, { erro: 'Erro interno. Tente novamente em instantes.' });
  }
});

if (require.main === module) server.listen(PORT, () => console.log(`Ateliê da Beleza em http://localhost:${PORT}`));
module.exports = { server, db };
