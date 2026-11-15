/* ============================================================
   BOOKING — assistente de agendamento em 4 passos
   Serviço → Profissional → Data e horário → Confirmação
   ============================================================ */
(function () {
  'use strict';
  const C = window.ATELIE_CONFIG, K = window.ATELIE_CATALOG, E = window.AtelieEngine, Api = window.AtelieApi;
  const { $, $$, esc } = window.AtelieUI;
  const ICON = {
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', check: '<path d="M20 6 9 17l-5-5"/>',
    chevl: '<path d="m15 18-6-6 6-6"/>', chevr: '<path d="m9 18 6-6-6-6"/>', wa: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10a5 5 0 0 0 5 5l1.2-1.2a1 1 0 0 1 1-.2l1.8.7a1 1 0 0 1 .6 1A2.5 2.5 0 0 1 15 17.5 8 8 0 0 1 6.5 9 2.5 2.5 0 0 1 9 6.5a1 1 0 0 1 1 .6l.7 1.8a1 1 0 0 1-.2 1Z"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'
  };
  const ic = (n) => `<svg class="i" aria-hidden="true" viewBox="0 0 24 24">${ICON[n]}</svg>`;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const catOf = (id) => K.categorias.find((c) => c.id === id);
  const svcOf = (id) => K.servicos.find((s) => s.id === id);
  const proOf = (id) => K.equipe.find((p) => p.id === id);
  const longDate = (d) => { const t = new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); return t[0].toUpperCase() + t.slice(1); };
  const shortDate = (d) => d.split('-').reverse().join('/');

  const today = E.brNow().date;
  const S = { step: 1, cat: 'cabelo', svcs: [], pro: 'any', date: null, time: null, slots: null, loadingSlots: false, ym: { y: +today.slice(0, 4), m: +today.slice(5, 7) - 1 }, done: null, busy: false };

  /* ---------- Estado inicial a partir da URL (?s=serviço &p=profissional &c=categoria) ---------- */
  (function fromUrl() {
    const q = new URLSearchParams(location.search);
    const s = svcOf(q.get('s'));
    if (s) { S.cat = s.cat; S.svcs = [s.id]; S.step = 2; }
    else if (catOf(q.get('c'))) S.cat = q.get('c');
    const p = proOf(q.get('p'));
    if (p && p.cats.includes(S.cat)) S.pro = p.id;
  })();

  const chosen = () => S.svcs.map(svcOf);
  const totals = () => chosen().reduce((a, s) => ({ min: a.min + s.min, preco: a.preco + s.preco }), { min: 0, preco: 0 });
  const eligible = () => K.equipe.filter((p) => p.cats.includes(S.cat));
  const canGo = (step) => step === 1 || (step === 2 && S.svcs.length > 0) || (step === 3 && S.svcs.length > 0) || (step === 4 && S.date && S.time);
  const ready = () => ({ 1: S.svcs.length > 0, 2: true, 3: !!(S.date && S.time), 4: true })[S.step];

  function go(step) {
    if (!canGo(step)) return;
    S.step = step; draw(); window.scrollTo({ top: $('.book').offsetTop - 40, behavior: 'smooth' });
  }

  /* ---------- Desenho geral ---------- */
  function draw() {
    drawStepper(); drawSummary();
    const p = $('#panel');
    if (S.done) return drawSuccess(p);
    ({ 1: step1, 2: step2, 3: step3, 4: step4 })[S.step](p);
  }

  function drawStepper() {
    $$('#stepper li').forEach((li, i) => {
      const n = i + 1;
      li.className = S.done || n < S.step ? 'done' : n === S.step ? 'active' : '';
      li.setAttribute('aria-current', n === S.step && !S.done ? 'step' : 'false');
      li.tabIndex = n < S.step && !S.done ? 0 : -1;
      li.onclick = li.onkeydown = (e) => { if (e.type === 'keydown' && e.key !== 'Enter') return; if (n < S.step && !S.done) go(n); };
    });
  }

  function drawSummary() {
    const el = $('#summary');
    if (S.done) { el.hidden = true; return; }
    el.hidden = false;
    const t = totals(), sv = chosen();
    const proTxt = S.pro === 'any' ? 'Sem preferência' : proOf(S.pro).nome;
    const last = S.step === 4;
    el.innerHTML = `<h2>Resumo</h2>
      ${sv.length ? `<dl>
        <div><dt>Serviço${sv.length > 1 ? 's' : ''}</dt><dd>${sv.map((s) => esc(s.nome)).join(', ')}</dd></div>
        <div><dt>Profissional</dt><dd>${esc(proTxt)}</dd></div>
        <div><dt>Data e horário</dt><dd>${S.date ? `${longDate(S.date)}${S.time ? ' às ' + S.time : ''}` : '—'}</dd></div>
        <div><dt>Duração</dt><dd>${E.dur(t.min)}</dd></div></dl>` : '<p class="empty">Escolha ao menos um serviço para começar.</p>'}
      <div class="total"><span>${sv.length ? 'Total' : ''}</span><b>${sv.length ? E.brl(t.preco) : ''}</b></div>
      <div class="actions">
        ${S.step > 1 ? `<button class="btn btn-line" id="s-back" type="button" aria-label="Voltar">${ic('chevl')}<span class="back-txt">Voltar</span></button>` : '<span></span>'}
        <button class="btn btn-dark" id="s-next" type="button" ${ready() && !S.busy ? '' : 'disabled'}>${last ? (S.busy ? 'Confirmando…' : 'Confirmar agendamento') : 'Continuar'} ${last ? '' : ic('chevr')}</button>
      </div>`;
    const back = $('#s-back'); if (back) back.onclick = () => go(S.step - 1);
    $('#s-next').onclick = () => {
      if (S.step === 4) { const f = $('#book-form'); if (f) f.requestSubmit(); } else go(S.step + 1);
    };
  }

  /* ---------- Passo 1: serviço ---------- */
  function step1(p) {
    p.innerHTML = `<div class="panel"><h2>Escolha o serviço</h2>
      <div class="cat-tabs" role="group" aria-label="Categoria">${K.categorias.map((c) => `<button class="chip" type="button" data-c="${c.id}" aria-pressed="${c.id === S.cat}">${c.nome}</button>`).join('')}</div>
      <div class="opts">${K.servicos.filter((s) => s.cat === S.cat).map((s) => `
        <button class="opt-row" type="button" data-id="${s.id}" aria-pressed="${S.svcs.includes(s.id)}">
          <span class="mark">${ic('check')}</span>
          <span><b>${esc(s.nome)}</b><small>${ic('clock')} ${E.dur(s.min)}</small></span>
          <span class="price">${E.brl(s.preco)}</span></button>`).join('')}</div>
      <p class="note">Você pode combinar serviços da mesma categoria no mesmo horário.</p></div>`;
    $$('.chip', p).forEach((b) => (b.onclick = () => {
      if (b.dataset.c === S.cat) return;
      if (S.svcs.length) window.toast('Agende uma categoria por vez. Seleção anterior removida.');
      S.cat = b.dataset.c; S.svcs = []; S.pro = 'any'; S.date = S.time = null; S.slots = null; draw();
    }));
    $$('.opt-row', p).forEach((b) => (b.onclick = () => {
      const id = b.dataset.id, i = S.svcs.indexOf(id);
      i >= 0 ? S.svcs.splice(i, 1) : S.svcs.push(id);
      S.date = S.time = null; S.slots = null; // duração mudou: horários precisam ser recalculados
      b.setAttribute('aria-pressed', i < 0); drawSummary();
    }));
  }

  /* ---------- Passo 2: profissional ---------- */
  function step2(p) {
    const opts = [{ id: 'any', nome: 'Sem preferência', sub: 'Escolhemos a profissional livre no horário', ini: '✦' }].concat(eligible().map((x) => ({ id: x.id, nome: x.nome, sub: x.funcao, ini: x.nome[0] })));
    p.innerHTML = `<div class="panel"><h2>Escolha a profissional</h2><div class="opts" role="radiogroup" aria-label="Profissional">
      ${opts.map((o) => `<button class="opt-row radio" type="button" role="radio" data-id="${o.id}" aria-checked="${o.id === S.pro}">
        <span class="avatar" aria-hidden="true">${esc(o.ini)}</span><span><b>${esc(o.nome)}</b><small>${esc(o.sub)}</small></span><span class="mark"></span></button>`).join('')}</div></div>`;
    $$('.opt-row', p).forEach((b) => (b.onclick = () => {
      if (S.pro !== b.dataset.id) { S.pro = b.dataset.id; S.date = S.time = null; S.slots = null; }
      $$('.opt-row', p).forEach((x) => x.setAttribute('aria-checked', x === b)); drawSummary();
    }));
  }

  /* ---------- Passo 3: data e horário ---------- */
  function dayOk(d) { return E.inRange(d, C) && E.isOpen(d, C); }
  function step3(p) {
    const { y, m } = S.ym;
    const first = new Date(Date.UTC(y, m, 1)).getUTCDay(), n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const maxD = E.addDays(today, C.diasMax);
    const minYM = +today.slice(0, 4) * 12 + +today.slice(5, 7) - 1, maxYM = +maxD.slice(0, 4) * 12 + +maxD.slice(5, 7) - 1, cur = y * 12 + m;
    let cells = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => `<div class="dw" aria-hidden="true">${d}</div>`).join('') + '<div></div>'.repeat(first);
    for (let d = 1; d <= n; d++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells += `<button type="button" class="day${ds === today ? ' today' : ''}" data-d="${ds}" ${dayOk(ds) ? '' : 'disabled'} aria-pressed="${ds === S.date}" aria-label="${longDate(ds)}${dayOk(ds) ? '' : ' (indisponível)'}">${d}</button>`;
    }
    p.innerHTML = `<div class="panel"><h2>Escolha data e horário</h2>
      <div class="cal"><div class="cal-head"><button class="cal-nav" type="button" id="m-prev" aria-label="Mês anterior" ${cur <= minYM ? 'disabled' : ''}>${ic('chevl')}</button>
        <b>${MESES[m]} de ${y}</b><button class="cal-nav" type="button" id="m-next" aria-label="Próximo mês" ${cur >= maxYM ? 'disabled' : ''}>${ic('chevr')}</button></div>
        <div class="cal-grid">${cells}</div></div>
      <div class="slots-wrap" id="slots" aria-live="polite"></div></div>`;
    $('#m-prev').onclick = () => { S.ym = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }; step3(p); };
    $('#m-next').onclick = () => { S.ym = m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }; step3(p); };
    $$('.day', p).forEach((b) => (b.onclick = () => pickDay(b.dataset.d)));
    drawSlots();
    if (S.date && !S.slots) loadSlots();
  }
  function pickDay(d) {
    S.date = d; S.time = null; S.slots = null;
    $$('.day').forEach((x) => x.setAttribute('aria-pressed', x.dataset.d === d));
    drawSummary(); loadSlots();
  }
  let reqId = 0;
  async function loadSlots() {
    const id = ++reqId; S.loadingSlots = true; drawSlots();
    try { const r = await Api.availability({ date: S.date, duration: totals().min, cat: S.cat, pro: S.pro }); if (id !== reqId) return; S.slots = r; S.err = null; }
    catch (e) { if (id !== reqId) return; S.slots = null; S.err = e.message; }
    S.loadingSlots = false; drawSlots();
  }
  function drawSlots() {
    const el = $('#slots'); if (!el) return;
    if (!S.date) { el.innerHTML = '<p class="note">Selecione um dia disponível no calendário para ver os horários.</p>'; return; }
    if (S.loadingSlots) { el.innerHTML = `<h3>${longDate(S.date)}</h3><div class="slots">${'<span class="skeleton"></span>'.repeat(6)}</div>`; return; }
    if (S.err) { el.innerHTML = `<div class="alert bad">${esc(S.err)} <button class="link-arrow" id="retry" type="button" style="background:none;border-top:0;border-left:0;border-right:0">Tentar de novo</button></div>`; $('#retry').onclick = loadSlots; return; }
    if (!S.slots || !S.slots.length) { el.innerHTML = `<h3>${longDate(S.date)}</h3><div class="alert info">Não há horários livres neste dia para a duração escolhida (${E.dur(totals().min)}). Escolha outra data.</div>`; return; }
    const grp = [['Manhã', (t) => t < '12:00'], ['Tarde', (t) => t >= '12:00' && t < '18:00'], ['Noite', (t) => t >= '18:00']];
    el.innerHTML = `<h3 style="margin-top:0">${longDate(S.date)}</h3>` + grp.map(([n, f]) => {
      const list = S.slots.filter((s) => f(s.time)); if (!list.length) return '';
      return `<h3>${n}</h3><div class="slots">${list.map((s) => `<button class="slot" type="button" data-t="${s.time}" aria-pressed="${s.time === S.time}">${s.time}</button>`).join('')}</div>`;
    }).join('');
    $$('.slot', el).forEach((b) => (b.onclick = () => { S.time = b.dataset.t; $$('.slot', el).forEach((x) => x.setAttribute('aria-pressed', x === b)); drawSummary(); }));
  }

  /* ---------- Passo 4: dados e confirmação ---------- */
  const mask = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d ? '(' + d : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };
  function step4(p) {
    const sv = chosen(), t = totals(), pro = S.pro === 'any' ? 'Sem preferência' : proOf(S.pro).nome;
    const saved = S.form || {};
    p.innerHTML = `<div class="panel"><h2>Seus dados</h2>
      <div class="review"><div><b>${sv.map((s) => esc(s.nome)).join(', ')}</b></div>
        <div>${longDate(S.date)} às <b>${S.time}</b> · ${E.dur(t.min)}</div><div>Profissional: ${esc(pro)} · Total ${E.brl(t.preco)}</div></div>
      <form id="book-form" novalidate>
        <div id="book-alert" role="alert"></div>
        <div class="field"><label for="b-nome">Nome completo</label><input class="input" id="b-nome" name="nome" autocomplete="name" value="${esc(saved.nome || '')}" required><div class="msg-err" data-err="nome"></div></div>
        <div class="row2">
          <div class="field"><label for="b-tel">WhatsApp</label><input class="input" id="b-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(24) 99999-9999" value="${esc(saved.telefone || '')}" required><div class="msg-err" data-err="telefone"></div></div>
          <div class="field"><label for="b-email">E-mail <span class="opt">(opcional)</span></label><input class="input" id="b-email" name="email" type="email" autocomplete="email" value="${esc(saved.email || '')}"><div class="msg-err" data-err="email"></div></div>
        </div>
        <div class="field"><label for="b-obs">Observações <span class="opt">(opcional)</span></label><textarea class="input" id="b-obs" name="obs" maxlength="400" style="min-height:90px" placeholder="Ex.: referência de cor, alergias, pedido especial">${esc(saved.obs || '')}</textarea></div>
        <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="check"><input type="checkbox" name="consentimento"><span>Concordo com o uso dos meus dados para este agendamento, conforme a <a href="privacidade.html" target="_blank" rel="noopener">política de privacidade</a>.</span></label>
        <div class="msg-err" data-err="consentimento" style="margin-top:6px"></div>
      </form></div>`;
    const tel = $('#b-tel'); tel.addEventListener('input', () => { tel.value = mask(tel.value); });
    const form = $('#book-form');
    form.addEventListener('input', () => { S.form = Object.fromEntries(new FormData(form).entries()); });
    form.addEventListener('submit', submit);
  }

  function showErr(field, msg) {
    const form = $('#book-form');
    $$('[data-err]', form).forEach((d) => { d.textContent = ''; d.closest('.field')?.classList.remove('err'); });
    const d = $(`[data-err="${field}"]`, form);
    if (d) { d.textContent = msg; d.closest('.field')?.classList.add('err'); const i = form.elements[field]; if (i) i.focus(); }
    else $('#book-alert').innerHTML = `<div class="alert bad">${esc(msg)}</div>`;
  }
  async function submit(e) {
    e.preventDefault(); if (S.busy) return;
    $('#book-alert').innerHTML = '';
    const form = e.target, fd = Object.fromEntries(new FormData(form).entries());
    fd.consentimento = !!form.elements.consentimento.checked;
    if (String(fd.nome || '').trim().length < 3) return showErr('nome', 'Informe seu nome completo.');
    if (!E.validPhone(E.normPhone(fd.telefone))) return showErr('telefone', 'Informe um WhatsApp válido com DDD.');
    if (!E.validEmail(fd.email)) return showErr('email', 'Confira o e-mail digitado.');
    if (!fd.consentimento) return showErr('consentimento', 'Marque a caixa para continuar.');
    S.busy = true; drawSummary();
    try {
      const b = await Api.createBooking({ servicos: S.svcs, profissional: S.pro, data: S.date, hora: S.time, nome: fd.nome, telefone: fd.telefone, email: fd.email, obs: fd.obs, consentimento: true, website: fd.website });
      S.done = b; S.busy = false; draw(); window.scrollTo({ top: $('.book').offsetTop - 40, behavior: 'smooth' });
    } catch (err) {
      S.busy = false; drawSummary();
      if (err.field === 'hora' || err.field === 'data') { S.time = null; S.slots = null; S.step = 3; draw(); window.toast(err.message); return; }
      if (err.field === 'servicos' || err.field === 'profissional') { S.step = 1; draw(); window.toast(err.message); return; }
      showErr(err.field || '_', err.message);
    }
  }

  /* ---------- Sucesso ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function ics(b) {
    const st = E.toMin(b.hora), en = st + b.duracao;
    const dt = (m) => b.data.replace(/-/g, '') + 'T' + pad(Math.floor(m / 60)) + pad(m % 60) + '00';
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelie da Beleza//PT-BR', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:America/Sao_Paulo', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT', `UID:${b.codigo}@atelie`, `DTSTAMP:${stamp}`, `DTSTART;TZID=America/Sao_Paulo:${dt(st)}`, `DTEND;TZID=America/Sao_Paulo:${dt(en)}`,
      `SUMMARY:${C.nome} — ${b.servicos.map((s) => s.nome).join(', ')}`.replace(/,/g, '\\,'), `LOCATION:${(C.endereco ? C.endereco + ', ' : '') + C.cidade}`.replace(/,/g, '\\,'),
      `DESCRIPTION:Código ${b.codigo}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Seu horário no ateliê é daqui a 2 horas', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
    return new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  }
  function drawSuccess(p) {
    const b = S.done, local = Api.mode === 'local';
    const proName = b.profissional ? (proOf(b.profissional) || {}).nome : '';
    const msg = `Olá! Fiz um agendamento pelo site.\nCódigo: ${b.codigo}\nServiço: ${b.servicos.map((s) => s.nome).join(', ')}\nData: ${shortDate(b.data)} às ${b.hora}\nNome: ${b.nome}`;
    const waUrl = window.waLink(msg);
    p.innerHTML = `<div class="panel success"><div class="seal">${ic('check')}</div>
      <h2>${local ? 'Agendamento registrado' : 'Agendamento recebido'}</h2>
      <p class="lead" style="margin:8px auto 0">${local ? 'Para o salão receber seu pedido, envie a confirmação pelo WhatsApp.' : 'O salão vai confirmar seu horário. Guarde o código abaixo.'}</p>
      <div class="code" aria-label="Código do agendamento">${b.codigo}</div>
      <div class="review"><div><b>${b.servicos.map((s) => esc(s.nome)).join(', ')}</b></div>
        <div>${longDate(b.data)} às ${b.hora}</div>
        ${proName ? `<div>Com ${esc(proName)}</div>` : ''}<div>${E.dur(b.duracao)} · ${E.brl(b.total)}</div></div>
      <div class="row-btns">
        ${waUrl ? `<a class="btn btn-wa" href="${waUrl}" target="_blank" rel="noopener">${ic('wa')} Confirmar pelo WhatsApp</a>` : (local ? `<a class="btn btn-dark" href="https://instagram.com/${C.instagram}" target="_blank" rel="noopener">Avisar o salão no Instagram</a>` : '')}
        <button class="btn btn-sand" id="dl-ics" type="button">${ic('cal')} Adicionar ao calendário</button>
        <button class="btn btn-line" id="again" type="button">Novo agendamento</button>
      </div></div>`;
    $('#dl-ics').onclick = () => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(ics(b)); a.download = `agendamento-${b.codigo}.ics`;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $('#again').onclick = () => { location.href = 'agendar.html'; };
  }

  /* ---------- Consultar / cancelar ---------- */
  const dlg = $('#lookup');
  $('#open-lookup').onclick = () => { $('#lk-result').innerHTML = ''; $('#lk-alert').innerHTML = ''; dlg.showModal(); $('#lk-code').focus(); };
  $('#lk-close').onclick = () => dlg.close();
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  const lkTel = $('#lk-tel'); lkTel.addEventListener('input', () => { lkTel.value = mask(lkTel.value); });
  const STATUS = { pendente: 'Aguardando confirmação', confirmado: 'Confirmado', concluido: 'Concluído', cancelado: 'Cancelado' };
  $('#lk-form').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#lk-alert').innerHTML = ''; $('#lk-result').innerHTML = '';
    try { showLookup(await Api.lookup($('#lk-code').value, $('#lk-tel').value)); }
    catch (err) { $('#lk-alert').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
  });
  function showLookup(b) {
    const can = (b.status === 'pendente' || b.status === 'confirmado') && b.data >= today;
    $('#lk-result').innerHTML = `<div class="review" style="margin-top:18px"><div><span class="badge ${b.status}">${STATUS[b.status]}</span></div>
      <div><b>${b.servicos.map((s) => esc(s.nome)).join(', ')}</b></div><div>${longDate(b.data)} às ${b.hora}</div><div>${E.dur(b.duracao)} · ${E.brl(b.total)}</div></div>
      ${can ? `<div id="lk-cancel-area"><button class="btn btn-line" id="lk-cancel" type="button" style="width:100%">Cancelar este agendamento</button></div>` : ''}`;
    const btn = $('#lk-cancel'); if (!btn) return;
    btn.onclick = () => {
      $('#lk-cancel-area').innerHTML = `<p style="margin:0 0 10px;font-weight:500">Tem certeza? Essa ação libera o horário.</p><div style="display:flex;gap:8px"><button class="btn btn-dark" id="lk-yes" type="button" style="flex:1">Sim, cancelar</button><button class="btn btn-line" id="lk-no" type="button" style="flex:1">Manter</button></div>`;
      $('#lk-no').onclick = () => showLookup(b);
      $('#lk-yes').onclick = async () => {
        try { const r = await Api.cancel(b.codigo, $('#lk-tel').value); showLookup(r); window.toast('Agendamento cancelado.'); }
        catch (err) { $('#lk-alert').innerHTML = `<div class="alert bad">${esc(err.message)}</div>`; }
      };
    };
  }

  Api.ready.then(draw);
  draw();
})();
