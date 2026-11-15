/* ============================================================
   ADMIN — painel do salão: agendamentos e mensagens.
   Com o servidor Node: protegido por senha (ADMIN_PASSWORD).
   Sem servidor: mostra apenas dados deste navegador (modo local).
   ============================================================ */
(function () {
  'use strict';
  const K = window.ATELIE_CATALOG, E = window.AtelieEngine, Api = window.AtelieApi, C = window.ATELIE_CONFIG;
  const { $, $$, esc } = window.AtelieUI;
  const root = $('#admin-root');
  const STATUS = { pendente: 'Pendente', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
  const proName = (id) => (K.equipe.find((p) => p.id === id) || {}).nome || id;
  const sd = (d) => d.split('-').reverse().join('/');
  const wd = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
  const F = { status: 'ativos', data: '', pro: '' };
  let tab = 'ag', bookings = [], messages = [];

  async function start() {
    const mode = await Api.ready;
    if (mode === 'server' && !Api.token()) return login();
    await load();
  }

  function login(msg) {
    root.innerHTML = `<div class="card login-box"><h1 style="font-size:2rem;margin-bottom:6px">Área do salão</h1>
      <p class="lead" style="font-size:.95rem;margin-bottom:20px">Entre com a senha para ver os agendamentos.</p>
      ${msg ? `<div class="alert bad" role="alert">${esc(msg)}</div>` : ''}
      <form id="lf"><div class="field"><label for="pw">Senha</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-dark" style="width:100%" type="submit">Entrar</button></form></div>`;
    $('#pw').focus();
    $('#lf').onsubmit = async (e) => {
      e.preventDefault();
      try { await Api.login($('#pw').value); await load(); } catch (err) { login(err.message); }
    };
  }

  async function load() {
    try { [bookings, messages] = await Promise.all([Api.adminBookings(), Api.adminMessages()]); }
    catch (err) { if (err.status === 401) { Api.logout(); return login('Sessão expirada. Entre novamente.'); } root.innerHTML = `<div class="alert bad" style="margin-top:30px">${esc(err.message)}</div>`; return; }
    draw();
  }

  function draw() {
    const today = E.brNow().date;
    const hoje = bookings.filter((b) => b.data === today && b.status !== 'cancelado').length;
    const pend = bookings.filter((b) => b.status === 'pendente').length;
    const prox = bookings.filter((b) => b.data >= today && (b.status === 'pendente' || b.status === 'confirmado')).length;
    const novas = messages.filter((m) => !m.lida).length;
    root.innerHTML = `<div class="admin-top"><div><h1 style="font-size:2rem">Área do salão</h1></div>
      <div style="display:flex;gap:8px"><button class="btn btn-line btn-sm" id="refresh" type="button">Atualizar</button>${Api.mode === 'server' ? '<button class="btn btn-dark btn-sm" id="out" type="button">Sair</button>' : ''}</div></div>
      ${Api.mode === 'local' ? '<div class="alert info">Servidor não conectado: você está vendo apenas os agendamentos e mensagens feitos <b>neste navegador</b>. Publique o servidor (pasta <code>server/</code>) para receber os pedidos de todos os clientes.</div>' : ''}
      <div class="stats"><div class="stat"><b>${hoje}</b><span>Atendimentos hoje</span></div><div class="stat"><b>${pend}</b><span>Aguardando confirmação</span></div>
        <div class="stat"><b>${prox}</b><span>Próximos agendamentos</span></div><div class="stat"><b>${novas}</b><span>Mensagens novas</span></div></div>
      <div class="chips" role="tablist"><button class="chip" role="tab" data-tab="ag" aria-selected="${tab === 'ag'}">Agendamentos</button><button class="chip" role="tab" data-tab="ms" aria-selected="${tab === 'ms'}">Mensagens${novas ? ' (' + novas + ')' : ''}</button></div>
      <div id="tab"></div>`;
    $('#refresh').onclick = load; const out = $('#out'); if (out) out.onclick = () => { Api.logout(); login(); };
    $$('[data-tab]').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; draw(); }));
    tab === 'ag' ? drawBookings() : drawMessages();
  }

  function drawBookings() {
    const today = E.brNow().date;
    let list = bookings.slice();
    if (F.status === 'ativos') list = list.filter((b) => b.status === 'pendente' || b.status === 'confirmado');
    else if (F.status !== 'todos') list = list.filter((b) => b.status === F.status);
    if (F.data) list = list.filter((b) => b.data === F.data);
    if (F.pro) list = list.filter((b) => b.profissional === F.pro);
    list.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    $('#tab').innerHTML = `<div class="toolbar">
      <select class="input" id="f-status" aria-label="Status">${[['ativos', 'Ativos'], ['pendente', 'Pendentes'], ['confirmado', 'Confirmados'], ['concluido', 'Concluídos'], ['cancelado', 'Cancelados'], ['todos', 'Todos']].map(([v, l]) => `<option value="${v}" ${F.status === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input class="input" type="date" id="f-data" value="${F.data}" aria-label="Data">
      <select class="input" id="f-pro" aria-label="Profissional"><option value="">Todas as profissionais</option>${K.equipe.map((p) => `<option value="${p.id}" ${F.pro === p.id ? 'selected' : ''}>${esc(p.nome)}</option>`).join('')}</select>
      ${F.data || F.pro || F.status !== 'ativos' ? '<button class="btn btn-line btn-sm" id="f-clear" type="button">Limpar filtros</button>' : ''}</div>
      ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Quando</th><th>Cliente</th><th>Serviço</th><th>Profissional</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      ${list.map((b) => {
        const waNum = '55' + b.telefone;
        const wlink = `https://wa.me/${waNum}?text=${encodeURIComponent(`Olá, ${b.nome.split(' ')[0]}! Aqui é do ${C.nome}. Sobre seu horário de ${sd(b.data)} às ${b.hora} (${b.servicos.map((s) => s.nome).join(', ')}):`)}`;
        return `<tr><td><b>${sd(b.data)}</b> <span style="color:var(--muted)">${wd(b.data)}</span><br>${b.hora} · ${E.dur(b.duracao)}${b.data === today ? ' <span class="badge confirmado">hoje</span>' : ''}</td>
        <td>${esc(b.nome)}<br><a href="${wlink}" target="_blank" rel="noopener" style="color:var(--bronze-d);text-decoration:underline">${esc(b.telefone)}</a>${b.obs ? `<br><span style="color:var(--muted)">“${esc(b.obs)}”</span>` : ''}</td>
        <td>${b.servicos.map((s) => esc(s.nome)).join(', ')}<br><span style="color:var(--muted)">${E.brl(b.total)} · ${esc(b.codigo)}</span></td>
        <td>${esc(proName(b.profissional))}</td><td><span class="badge ${b.status}">${STATUS[b.status]}</span></td>
        <td><div class="row-actions">${[['confirmado', 'Confirmar', 'btn-dark'], ['concluido', 'Concluir', 'btn-sand'], ['cancelado', 'Cancelar', 'btn-line']].filter(([s]) => s !== b.status).map(([s, l, c]) => `<button class="btn ${c} btn-sm" data-st="${s}" data-id="${b.id}" type="button">${l}</button>`).join('')}</div></td></tr>`;
      }).join('')}</tbody></table></div>` : '<div class="alert info">Nenhum agendamento encontrado com esses filtros.</div>'}`;
    $('#f-status').onchange = (e) => { F.status = e.target.value; drawBookings(); };
    $('#f-data').onchange = (e) => { F.data = e.target.value; drawBookings(); };
    $('#f-pro').onchange = (e) => { F.pro = e.target.value; drawBookings(); };
    const c = $('#f-clear'); if (c) c.onclick = () => { F.status = 'ativos'; F.data = F.pro = ''; drawBookings(); };
    $$('[data-st]').forEach((b) => (b.onclick = async () => {
      b.disabled = true;
      try { const u = await Api.adminSetStatus(isNaN(+b.dataset.id) ? b.dataset.id : +b.dataset.id, b.dataset.st); const i = bookings.findIndex((x) => String(x.id) === String(b.dataset.id)); if (i >= 0 && u) bookings[i] = u; draw(); window.toast('Status atualizado.'); }
      catch (err) { b.disabled = false; window.toast(err.message); }
    }));
  }

  function drawMessages() {
    $('#tab').innerHTML = messages.length ? messages.map((m) => `<div class="msg-card ${m.lida ? '' : 'new'}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><b>${esc(m.nome)}</b><span style="color:var(--muted);font-size:.85rem">${new Date(m.criadoEm).toLocaleString('pt-BR')}</span></div>
      <div style="color:var(--muted);font-size:.88rem">${esc(m.assunto || '')} ${m.telefone ? '· ' + esc(m.telefone) : ''} ${m.email ? '· ' + esc(m.email) : ''}</div>
      <p style="margin:10px 0;white-space:pre-wrap">${esc(m.mensagem)}</p>
      <div class="row-actions">${m.telefone ? `<a class="btn btn-wa btn-sm" target="_blank" rel="noopener" href="https://wa.me/55${m.telefone}">Responder no WhatsApp</a>` : ''}${m.email ? `<a class="btn btn-line btn-sm" href="mailto:${esc(m.email)}">Responder por e-mail</a>` : ''}${m.lida ? '' : `<button class="btn btn-sand btn-sm" data-read="${m.id}" type="button">Marcar como lida</button>`}</div></div>`).join('')
      : '<div class="alert info">Nenhuma mensagem recebida ainda.</div>';
    $$('[data-read]').forEach((b) => (b.onclick = async () => { await Api.adminReadMessage(+b.dataset.read); const m = messages.find((x) => x.id === +b.dataset.read); if (m) m.lida = 1; draw(); }));
  }

  start();
})();
