/* ============================================================
   APP — comportamento comum a todas as páginas:
   menu, WhatsApp/contatos a partir do config, horários, renderização
   de serviços/equipe/galeria, lightbox, formulário de contato, toast.
   ============================================================ */
(function () {
  'use strict';
  const C = window.ATELIE_CONFIG, K = window.ATELIE_CATALOG, E = window.AtelieEngine;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', plus: '<path d="M12 5v14M5 12h14"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>'
  };
  const ic = (n) => `<svg class="i" aria-hidden="true" viewBox="0 0 24 24">${ICON[n]}</svg>`;
  const cat = (id) => K.categorias.find((c) => c.id === id);
  window.AtelieUI = { $, $$, esc, ic };

  /* ---------- Toast ---------- */
  let tt;
  window.toast = function (msg) {
    const el = $('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), 3800);
  };

  /* ---------- Menu mobile ---------- */
  const menu = $('#menu'), nav = $('#nav');
  if (menu && nav) {
    const set = (open) => { nav.classList.toggle('open', open); menu.setAttribute('aria-expanded', open); menu.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu'); };
    menu.addEventListener('click', () => set(!nav.classList.contains('open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
  }

  /* ---------- Contatos vindos do config ---------- */
  const wa = String(C.whatsapp || '').replace(/\D/g, '');
  window.waLink = (text) => (wa ? 'https://wa.me/' + wa + (text ? '?text=' + encodeURIComponent(text) : '') : '');
  $$('[data-wa]').forEach((a) => {
    if (!wa) return;
    a.href = window.waLink('Olá! Vim pelo site do ' + C.nome + ' e gostaria de agendar um horário.');
    a.hidden = false;
  });
  $$('[data-wa-li]').forEach((li) => { if (wa) li.hidden = false; });
  if (C.email) {
    $$('[data-email]').forEach((a) => { a.href = 'mailto:' + C.email; a.hidden = false; });
    $$('[data-email-text]').forEach((s) => (s.textContent = C.email));
    $$('[data-email-li]').forEach((li) => (li.hidden = false));
  }
  if (C.endereco) $$('[data-endereco]').forEach((s) => (s.textContent = C.endereco + ' — ' + C.cidade));
  $$('[data-year]').forEach((s) => (s.textContent = new Date().getFullYear()));

  /* ---------- Horários (agrupados a partir do config) ---------- */
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIAS_L = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const h = (t) => t.replace(':00', 'h').replace(':', 'h');
  const fmtH = (d) => (C.horarios[d] ? h(C.horarios[d][0]) + ' às ' + h(C.horarios[d][1]) : 'Fechado');
  function grouped() {
    const order = [2, 3, 4, 5, 6, 0, 1]; const out = [];
    order.forEach((d) => {
      const last = out[out.length - 1], f = fmtH(d);
      if (last && last.f === f && last.days[last.days.length - 1] === (d + 6) % 7) last.days.push(d); else out.push({ f, days: [d] });
    });
    return out.map((g) => ({ f: g.f, label: g.days.length === 1 ? DIAS[g.days[0]] : DIAS[g.days[0]] + ' a ' + DIAS[g.days[g.days.length - 1]] }));
  }
  $$('[data-hours-short]').forEach((ul) => (ul.innerHTML = grouped().map((g) => `<li>${g.label}: ${g.f}</li>`).join('')));
  $$('[data-hours-inline]').forEach((s) => (s.textContent = grouped().filter((g) => g.f !== 'Fechado').map((g) => g.label + ' ' + g.f).join(' · ')));
  $$('[data-hours-table]').forEach((t) => {
    const today = E.dow(E.brNow().date);
    t.innerHTML = [2, 3, 4, 5, 6, 0, 1].map((d) => `<tr${d === today ? ' class="today"' : ''}><td>${DIAS_L[d]}</td><td>${fmtH(d)}</td></tr>`).join('');
  });

  /* ---------- Renderizações ---------- */
  const svcLink = (id) => 'agendar.html?s=' + id;
  const render = {
    cats(el) {
      el.innerHTML = K.categorias.map((c) => `<a class="cat rv" href="servicos.html#${c.id}"><div class="ph"><img src="${c.img}" alt="" loading="lazy"></div>
        <div class="tx"><div><h3>${c.nome}</h3><p>${c.desc}</p></div><span class="go">${ic('arrow')}</span></div></a>`).join('');
    },
    works(el) {
      const n = Number(el.dataset.count) || 5;
      const items = K.galeria.slice(0, n);
      el.innerHTML = items.map((g, i) => `<button class="work rv" type="button" data-i="${i}" aria-label="Ampliar foto: ${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></button>`).join('');
      bindLightbox(el, items);
    },
    popular(el) {
      const ids = ['mechas', 'coloracao', 'corte-feminino', 'botox-capilar', 'progressiva', 'escova'];
      el.innerHTML = ids.map((id) => K.servicos.find((s) => s.id === id)).filter(Boolean).map((s) => `<a class="pop rv" href="${svcLink(s.id)}"><div><h3>${s.nome}</h3></div><span class="m"><strong>${E.brl(s.preco)}</strong>${E.dur(s.min)}</span></a>`).join('');
    },
    'svc-tabs'(el) {
      el.innerHTML = K.categorias.map((c, i) => `<a class="chip" href="#${c.id}" data-cat="${c.id}" ${i === 0 ? 'aria-selected="true"' : ''}>${c.nome}</a>`).join('');
      const links = $$('.chip', el);
      const spy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((l) => l.setAttribute('aria-selected', l.dataset.cat === e.target.id)); }), { rootMargin: '-30% 0px -60% 0px' });
      $$('.svc-group').forEach((g) => spy.observe(g));
      setTimeout(() => $$('.svc-group').forEach((g) => spy.observe(g)), 50);
    },
    services(el) {
      el.innerHTML = K.categorias.map((c) => `<section class="svc-group" id="${c.id}"><h2>${c.nome}</h2><p class="lead">${c.desc}.</p>
        <div class="svc-list">${K.servicos.filter((s) => s.cat === c.id).map((s) => `<div class="svc"><div><h3>${s.nome}</h3><p>${s.desc}</p></div>
          <div class="meta"><strong>${E.brl(s.preco)}</strong><span>${ic('clock')} ${E.dur(s.min)}</span></div>
          <a class="btn btn-dark btn-sm" href="${svcLink(s.id)}" aria-label="Agendar ${esc(s.nome)}">Agendar</a></div>`).join('')}</div></section>`).join('');
    },
    team(el) {
      el.innerHTML = K.equipe.map((p) => `<article class="pro rv"><div class="avatar" aria-hidden="true">${esc(p.nome[0])}</div><h3>${esc(p.nome)}</h3><p class="role">${esc(p.funcao)}</p><p>${esc(p.bio)}</p>
        <div class="tags-line">${p.cats.map((id) => `<span class="tag">${cat(id).nome}</span>`).join('')}</div>
        <a class="btn btn-sand btn-sm" href="agendar.html?p=${p.id}&c=${p.cats[0]}">Agendar com ${esc(p.nome)}</a></article>`).join('');
    },
    'gal-chips'(el) {
      el.innerHTML = [['all', 'Todos']].concat(K.categorias.filter((c) => K.galeria.some((g) => g.cat === c.id)).map((c) => [c.id, c.nome]))
        .map(([id, n], i) => `<button class="chip" type="button" data-f="${id}" aria-pressed="${i === 0}">${n}</button>`).join('');
      el.addEventListener('click', (e) => {
        const b = e.target.closest('.chip'); if (!b) return;
        $$('.chip', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
        $$('.gallery .work').forEach((w) => (w.hidden = b.dataset.f !== 'all' && w.dataset.cat !== b.dataset.f));
      });
    },
    gallery(el) {
      el.innerHTML = K.galeria.map((g, i) => `<button class="work rv" type="button" data-i="${i}" data-cat="${g.cat}" aria-label="Ampliar foto: ${esc(g.alt)}"><img src="${g.src}" alt="${esc(g.alt)}" loading="lazy"></button>`).join('');
      bindLightbox(el, K.galeria);
    }
  };
  $$('[data-render]').forEach((el) => { const f = render[el.dataset.render]; if (f) f(el); });

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  let lbItems = [], lbIdx = 0, lbOpener = null;
  function lbShow(i) {
    lbIdx = (i + lbItems.length) % lbItems.length;
    const it = lbItems[lbIdx];
    $('img', lb).src = it.src; $('img', lb).alt = it.alt; $('figcaption', lb).textContent = it.alt;
  }
  function lbOpen(items, i, opener) {
    lbItems = items; lbOpener = opener; lb.hidden = false;
    requestAnimationFrame(() => lb.classList.add('open'));
    lbShow(i); document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus();
  }
  function lbClose() {
    lb.classList.remove('open'); document.body.style.overflow = '';
    setTimeout(() => { lb.hidden = true; }, 250); if (lbOpener) lbOpener.focus();
  }
  function bindLightbox(container, items) {
    container.addEventListener('click', (e) => {
      const b = e.target.closest('.work'); if (!b) return;
      // na galeria filtrada, navega só entre as fotos visíveis
      const vis = $$('.work', container).filter((w) => !w.hidden);
      const list = vis.map((w) => items[Number(w.dataset.i)]);
      lbOpen(list, vis.indexOf(b), b);
    });
  }
  if (lb) {
    $('.lb-close', lb).addEventListener('click', lbClose);
    $('.lb-prev', lb).addEventListener('click', () => lbShow(lbIdx - 1));
    $('.lb-next', lb).addEventListener('click', () => lbShow(lbIdx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', (e) => {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbClose();
      else if (e.key === 'ArrowLeft') lbShow(lbIdx - 1);
      else if (e.key === 'ArrowRight') lbShow(lbIdx + 1);
      else if (e.key === 'Tab') { // mantém o foco dentro do lightbox
        const f = $$('button', lb), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Revelação ao rolar (discreta) ---------- */
  const rv = $$('.rv');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
    rv.forEach((el, i) => { el.style.transitionDelay = (i % 5) * 60 + 'ms'; io.observe(el); });
  } else rv.forEach((el) => el.classList.add('in'));

  /* ---------- Formulário de contato ---------- */
  const form = $('#contact-form');
  if (form) {
    const alertBox = $('#contact-alert');
    const showErr = (field, msg) => {
      $$('[data-err]', form).forEach((d) => { d.textContent = ''; d.closest('.field')?.classList.remove('err'); });
      const d = $(`[data-err="${field}"]`, form);
      if (d) { d.textContent = msg; d.closest('.field')?.classList.add('err'); const inp = form.elements[field]; if (inp) inp.focus(); }
      else alertBox.innerHTML = `<div class="alert bad">${esc(msg)}</div>`;
    };
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); alertBox.innerHTML = '';
      $$('[data-err]', form).forEach((d) => (d.textContent = ''));
      const fd = Object.fromEntries(new FormData(form).entries());
      if (!fd.nome || fd.nome.trim().length < 2) return showErr('nome', 'Informe seu nome.');
      if (!fd.consentimento) return showErr('consentimento', 'Marque a caixa para continuar.');
      const btn = $('button[type=submit]', form); btn.disabled = true; const old = btn.textContent; btn.textContent = 'Enviando…';
      try {
        const r = await window.AtelieApi.contact(fd);
        form.reset();
        const local = r && r.local;
        const waUrl = wa ? window.waLink('Olá! Meu nome é ' + fd.nome + '. ' + fd.mensagem) : '';
        alertBox.innerHTML = `<div class="alert ok">${local ? 'Mensagem registrada neste aparelho. Para que o salão receba agora, envie também pelo WhatsApp.' : 'Mensagem enviada! Retornaremos em breve.'}${local && waUrl ? ` <a href="${waUrl}" target="_blank" rel="noopener" style="text-decoration:underline;font-weight:600">Enviar pelo WhatsApp</a>` : ''}</div>`;
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) { showErr(err.field || '_', err.message); }
      finally { btn.disabled = false; btn.textContent = old; }
    });
  }
})();
