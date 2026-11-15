/* ============================================================
   API — fala com o servidor Node (/api). Se o servidor não existir
   (ex.: hospedagem estática, arquivo aberto direto), entra em MODO LOCAL:
   agenda salva só neste navegador e confirmação via WhatsApp.
   ============================================================ */
(function () {
  const C = window.ATELIE_CONFIG, E = window.AtelieEngine, K = window.ATELIE_CATALOG;
  const base = (C.apiBase || '').replace(/\/$/, '');
  const LS = {
    get(k, d) { try { return JSON.parse(localStorage.getItem('atelie.v1.' + k)) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('atelie.v1.' + k, JSON.stringify(v)); } catch (e) { /* sem storage */ } }
  };
  let mode = 'local';

  const ready = (async () => {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch(base + '/api/health', { signal: ctl.signal, headers: { Accept: 'application/json' } });
      clearTimeout(t);
      const j = await r.json();
      mode = j && j.ok ? 'server' : 'local';
    } catch (e) { mode = 'local'; }
    document.documentElement.dataset.api = mode;
    return mode;
  })();

  async function http(method, path, body, token) {
    let r;
    try {
      r = await fetch(base + '/api' + path, {
        method,
        headers: Object.assign({ Accept: 'application/json' }, body ? { 'Content-Type': 'application/json' } : {}, token ? { Authorization: 'Bearer ' + token } : {}),
        body: body ? JSON.stringify(body) : undefined
      });
    } catch (e) { throw new Error('Sem conexão com o servidor. Verifique sua internet e tente de novo.'); }
    let j = {};
    try { j = await r.json(); } catch (e) { /* vazio */ }
    if (!r.ok) { const err = new Error(j.erro || 'Algo deu errado. Tente novamente.'); err.field = j.campo; err.status = r.status; throw err; }
    return j;
  }

  const proIdsFor = (cat, pro) => {
    const el = K.equipe.filter((p) => p.cats.includes(cat)).map((p) => p.id);
    return pro && pro !== 'any' ? el.filter((id) => id === pro) : el;
  };

  const Api = {
    ready,
    get mode() { return mode; },

    async availability({ date, duration, cat, pro }) {
      await ready;
      if (mode === 'server') {
        const q = new URLSearchParams({ date, duracao: duration, categoria: cat, profissional: pro || 'any' });
        return (await http('GET', '/disponibilidade?' + q)).horarios;
      }
      return E.slots({ date, duration, proIds: proIdsFor(cat, pro), bookings: LS.get('bookings', []), cfg: C });
    },

    async createBooking(input) {
      await ready;
      if (mode === 'server') return (await http('POST', '/agendamentos', input)).agendamento;
      const all = LS.get('bookings', []);
      const b = E.buildBooking({ input, catalog: K, cfg: C, bookings: all });
      b.id = Date.now();
      all.push(b); LS.set('bookings', all);
      return b;
    },

    async lookup(codigo, telefone) {
      await ready;
      const code = String(codigo || '').trim().toUpperCase();
      if (mode === 'server') return (await http('POST', '/agendamentos/consulta', { codigo: code, telefone })).agendamento;
      const b = LS.get('bookings', []).find((x) => x.codigo === code && x.telefone === E.normPhone(telefone));
      if (!b) throw new Error('Não encontramos um agendamento com esse código e telefone.');
      return b;
    },

    async cancel(codigo, telefone) {
      await ready;
      const code = String(codigo || '').trim().toUpperCase();
      if (mode === 'server') return (await http('POST', '/agendamentos/cancelar', { codigo: code, telefone })).agendamento;
      const all = LS.get('bookings', []);
      const b = all.find((x) => x.codigo === code && x.telefone === E.normPhone(telefone));
      if (!b) throw new Error('Agendamento não encontrado.');
      b.status = 'cancelado'; LS.set('bookings', all);
      return b;
    },

    async contact(input) {
      await ready;
      if (mode === 'server') return http('POST', '/contato', input);
      const nome = String(input.nome || '').trim(), msg = String(input.mensagem || '').trim();
      if (nome.length < 2) { const e = new Error('Informe seu nome.'); e.field = 'nome'; throw e; }
      if (!E.validPhone(E.normPhone(input.telefone)) && !E.validEmail(input.email || 'x')) { const e = new Error('Informe um telefone ou e-mail válido.'); e.field = 'telefone'; throw e; }
      if (msg.length < 5) { const e = new Error('Escreva sua mensagem.'); e.field = 'mensagem'; throw e; }
      const all = LS.get('messages', []);
      all.push({ id: Date.now(), nome, telefone: E.normPhone(input.telefone), email: input.email || '', assunto: input.assunto || '', mensagem: msg, lida: 0, criadoEm: new Date().toISOString() });
      LS.set('messages', all);
      return { ok: true, local: true };
    },

    /* ---------- Admin ---------- */
    token: () => { try { return sessionStorage.getItem('atelie.admin') || ''; } catch (e) { return ''; } },
    async login(senha) {
      await ready;
      if (mode !== 'server') return { local: true };
      const r = await http('POST', '/admin/login', { senha });
      try { sessionStorage.setItem('atelie.admin', r.token); } catch (e) { /* ok */ }
      return r;
    },
    logout() { try { sessionStorage.removeItem('atelie.admin'); } catch (e) { /* ok */ } },
    async adminBookings() {
      await ready;
      if (mode === 'server') return (await http('GET', '/admin/agendamentos', null, Api.token())).agendamentos;
      return LS.get('bookings', []);
    },
    async adminSetStatus(id, status) {
      await ready;
      if (mode === 'server') return (await http('PATCH', '/admin/agendamentos/' + id, { status }, Api.token())).agendamento;
      const all = LS.get('bookings', []);
      const b = all.find((x) => x.id === id); if (b) b.status = status;
      LS.set('bookings', all); return b;
    },
    async adminMessages() {
      await ready;
      if (mode === 'server') return (await http('GET', '/admin/mensagens', null, Api.token())).mensagens;
      return LS.get('messages', []);
    },
    async adminReadMessage(id) {
      await ready;
      if (mode === 'server') return http('PATCH', '/admin/mensagens/' + id, { lida: 1 }, Api.token());
      const all = LS.get('messages', []); const m = all.find((x) => x.id === id); if (m) m.lida = 1; LS.set('messages', all);
    }
  };
  window.AtelieApi = Api;
})();
