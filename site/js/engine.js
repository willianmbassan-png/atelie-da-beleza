/* ============================================================
   ENGINE — regras de agenda compartilhadas entre navegador e servidor.
   Disponibilidade de horários, validação e montagem de agendamentos.
   ============================================================ */
(function (root, factory) {
  const e = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = e;
  else root.AtelieEngine = e;
})(typeof self !== 'undefined' ? self : this, function () {
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const toTime = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
  const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));

  // Horário de Brasília (UTC-3, sem horário de verão desde 2019)
  function brNow() {
    const d = new Date(Date.now() - 3 * 3600 * 1000);
    return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  const dow = (date) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
  const addDays = (date, n) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10); };

  function isOpen(date, cfg) {
    if (cfg.feriados.includes(date.slice(5)) || cfg.feriados.includes(date)) return false;
    return !!cfg.horarios[dow(date)];
  }
  function inRange(date, cfg) {
    const now = brNow();
    return date >= now.date && date <= addDays(now.date, cfg.diasMax);
  }

  // Horários livres de um dia. Retorna [{ time, pros:[ids] }]
  function slots({ date, duration, proIds, bookings, cfg }) {
    if (!isDate(date) || !inRange(date, cfg) || !isOpen(date, cfg)) return [];
    const [open, close] = cfg.horarios[dow(date)].map(toMin);
    const now = brNow();
    const minStart = date === now.date ? now.min + cfg.antecedenciaMin : 0;
    const pausa = cfg.pausa ? cfg.pausa.map(toMin) : null;
    const busy = {};
    proIds.forEach((id) => (busy[id] = []));
    bookings.forEach((b) => {
      if (b.data !== date || b.status === 'cancelado' || !busy[b.profissional]) return;
      const s = toMin(b.hora);
      busy[b.profissional].push([s, s + b.duracao]);
    });
    const out = [];
    for (let s = open; s + duration <= close; s += cfg.passoMin) {
      if (s < minStart) continue;
      const e = s + duration;
      if (pausa && s < pausa[1] && e > pausa[0]) continue;
      const free = proIds.filter((id) => !busy[id].some(([bs, be]) => s < be && e > bs));
      if (free.length) out.push({ time: toTime(s), pros: free });
    }
    return out;
  }

  const normPhone = (v) => {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
    return d;
  };
  const validPhone = (d) => /^[1-9]{2}9?\d{8}$/.test(d);
  const validEmail = (s) => !s || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);

  class ValidationError extends Error {
    constructor(msg, field) { super(msg); this.field = field; this.status = 400; }
  }

  function genCode(existing) {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (;;) {
      const buf = new Uint8Array(6);
      (globalThis.crypto || {}).getRandomValues ? globalThis.crypto.getRandomValues(buf) : buf.forEach((_, i) => (buf[i] = Math.random() * 256));
      const code = 'AB-' + Array.from(buf, (b) => A[b % A.length]).join('');
      if (!existing.has(code)) return code;
    }
  }

  // Valida entrada e monta o agendamento (o preço/duração vêm SEMPRE do catálogo)
  function buildBooking({ input, catalog, cfg, bookings }) {
    const ids = Array.isArray(input.servicos) ? [...new Set(input.servicos.map(String))] : [];
    if (!ids.length || ids.length > 8) throw new ValidationError('Escolha ao menos um serviço.', 'servicos');
    const svcs = ids.map((id) => catalog.servicos.find((s) => s.id === id));
    if (svcs.some((s) => !s)) throw new ValidationError('Serviço inválido.', 'servicos');
    const cat = svcs[0].cat;
    if (svcs.some((s) => s.cat !== cat)) throw new ValidationError('Agende uma categoria por vez.', 'servicos');
    const duracao = svcs.reduce((a, s) => a + s.min, 0);
    const total = svcs.reduce((a, s) => a + s.preco, 0);

    const nome = String(input.nome || '').trim().replace(/\s+/g, ' ');
    if (nome.length < 3 || nome.length > 80) throw new ValidationError('Informe seu nome completo.', 'nome');
    const telefone = normPhone(input.telefone);
    if (!validPhone(telefone)) throw new ValidationError('Informe um WhatsApp válido com DDD.', 'telefone');
    const email = String(input.email || '').trim().toLowerCase();
    if (!validEmail(email) || email.length > 120) throw new ValidationError('E-mail inválido.', 'email');
    const obs = String(input.obs || '').trim().slice(0, 400);
    if (!input.consentimento) throw new ValidationError('É preciso aceitar a política de privacidade.', 'consentimento');

    const data = input.data, hora = input.hora;
    if (!isDate(data)) throw new ValidationError('Escolha uma data.', 'data');
    if (!/^\d{2}:\d{2}$/.test(hora || '')) throw new ValidationError('Escolha um horário.', 'hora');

    const eligible = catalog.equipe.filter((p) => p.cats.includes(cat)).map((p) => p.id);
    const wanted = input.profissional && input.profissional !== 'any' ? [input.profissional] : eligible;
    if (wanted.some((id) => !eligible.includes(id))) throw new ValidationError('Profissional indisponível para este serviço.', 'profissional');

    const free = slots({ date: data, duration: duracao, proIds: wanted, bookings, cfg }).find((s) => s.time === hora);
    if (!free) throw new ValidationError('Esse horário acabou de ser ocupado. Escolha outro.', 'hora');

    // Distribui entre profissionais: o menos ocupado no dia
    const load = (id) => bookings.filter((b) => b.data === data && b.profissional === id && b.status !== 'cancelado').length;
    const profissional = free.pros.slice().sort((a, b) => load(a) - load(b))[0];

    return {
      codigo: genCode(new Set(bookings.map((b) => b.codigo))),
      servicos: svcs.map((s) => ({ id: s.id, nome: s.nome, min: s.min, preco: s.preco })),
      categoria: cat, profissional, duracao, total, data, hora,
      nome, telefone, email, obs, status: 'pendente', criadoEm: new Date().toISOString()
    };
  }

  const brl = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dur = (m) => (m >= 60 ? Math.floor(m / 60) + 'h' + (m % 60 ? String(m % 60).padStart(2, '0') : '') : m + ' min');

  return { toMin, toTime, brNow, dow, addDays, isOpen, inRange, isDate, slots, normPhone, validPhone, validEmail, buildBooking, ValidationError, brl, dur };
});
