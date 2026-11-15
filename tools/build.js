#!/usr/bin/env node
/* Gera as páginas HTML estáticas em ../site a partir de templates (cabeçalho/rodapé compartilhados).
   Uso: node tools/build.js
   Rode de novo sempre que mudar url/nome em site/js/config.js (SEO, sitemap e JSON-LD). */
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const cfg = require(path.join(SITE, 'js', 'config.js'));

const ICONS = {
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/>',
  wax: '<path d="M18 11V6a2 2 0 0 0-4 0M14 10V4a2 2 0 0 0-4 0v2M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.4L3.4 16a2 2 0 0 1 3.2-2.4L8 15"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M5 4.5 6.5 7M19 4.5 17.5 7M12 2.5V5"/>',
  nail: '<path d="M10 2h4v5h-4z"/><path d="M8.5 7h7a1.5 1.5 0 0 1 1.5 1.5L18 14c0 4-2 8-6 8s-6-4-6-8l1-5.5A1.5 1.5 0 0 1 8.5 7Z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".7"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chevl: '<path d="m15 18-6-6 6-6"/>', chevr: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  diamond: '<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6M2 9h20"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/>',
  wa: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 10a5 5 0 0 0 5 5l1.2-1.2a1 1 0 0 1 1-.2l1.8.7a1 1 0 0 1 .6 1A2.5 2.5 0 0 1 15 17.5 8 8 0 0 1 6.5 9 2.5 2.5 0 0 1 9 6.5a1 1 0 0 1 1 .6l.7 1.8a1 1 0 0 1-.2 1Z"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'
};
const ic = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true" viewBox="0 0 24 24">${ICONS[n]}</svg>`;
const sprite = ''; // ícones são inline, sem <use> (compatível com CSP estrita)

const NAV = [['index.html', 'Início'], ['servicos.html', 'Serviços'], ['equipe.html', 'Equipe'], ['trabalhos.html', 'Trabalhos'], ['sobre.html', 'Sobre'], ['contato.html', 'Contato']];
const brand = (dark) => `<span class="brand${dark ? ' on-dark' : ''}"><span class="brand-mono">RA</span><span class="brand-name">ATELIÊ DA BELEZA</span><span class="brand-sub">${cfg.sobrenome.toUpperCase()}</span></span>`;

function layout({ file, title, desc, body, scripts = [], cls = '', noindex = false, jsonld = '', og = 'img/hero.jpg' }) {
  const full = file === 'index.html' ? `${cfg.nome} — Cabelo, depilação, estética e unhas em ${cfg.cidade}` : `${title} | ${cfg.nome}`;
  const canon = cfg.url + '/' + (file === 'index.html' ? '' : file);
  const nav = NAV.map(([h, l]) => `<a href="${h}"${h === file ? ' aria-current="page"' : ''}>${l}</a>`).join('');
  const sc = ['js/config.js', 'js/catalog.js', 'js/engine.js', 'js/api.js', 'js/app.js', ...scripts].map((s) => `<script src="${s}" defer></script>`).join('\n');
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${full}</title>
<meta name="description" content="${desc}">
<meta name="theme-color" content="#1c1a18">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${canon}">`}
<meta property="og:type" content="website"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="${cfg.nome}">
<meta property="og:title" content="${full}"><meta property="og:description" content="${desc}"><meta property="og:image" content="${cfg.url}/${og}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@400;500;600&display=swap">
<link rel="stylesheet" href="css/style.css">
${jsonld}
<script src="js/boot.js"></script>
</head>
<body class="${cls}">
<a class="skip" href="#main">Pular para o conteúdo</a>
<header class="header">
  <div class="wrap">
    <a href="index.html" aria-label="${cfg.nome} — página inicial">${brand(false)}</a>
    <nav class="nav" id="nav" aria-label="Principal">${nav}</nav>
    <div class="header-cta">
      <a class="btn btn-dark btn-sm" href="agendar.html">${ic('calendar')} Agendar horário</a>
      <a class="menu-btn" data-wa hidden aria-label="Chamar no WhatsApp" style="color:var(--wa)">${ic('wa')}</a>
      <button class="menu-btn" id="menu" aria-expanded="false" aria-controls="nav" aria-label="Abrir menu">${ic('menu')}</button>
    </div>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="footer">
  <div class="wrap">
    <div class="foot-grid">
      <div>
        <a href="index.html" aria-label="${cfg.nome}">${brand(true)}</a>
        <p class="about">Beleza real, com técnicas modernas e atendimento personalizado.</p>
      </div>
      <div>
        <h4>Navegue</h4>
        <ul>${NAV.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}<li><a href="agendar.html">Agendar horário</a></li></ul>
      </div>
      <div>
        <h4>Serviços</h4>
        <ul><li><a href="servicos.html#cabelo">Cabelo</a></li><li><a href="servicos.html#depilacao">Depilação</a></li><li><a href="servicos.html#estetica">Estética</a></li><li><a href="servicos.html#unhas">Unhas</a></li></ul>
      </div>
      <div>
        <h4>Atendimento</h4>
        <ul>
          <li>${ic('pin')} <span data-endereco>${cfg.cidade}</span></li>
          <li><a href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener">${ic('instagram')} @${cfg.instagram}</a></li>
          <li data-wa-li hidden><a data-wa target="_blank" rel="noopener">${ic('wa')} WhatsApp</a></li>
          <li data-email-li hidden><a data-email>${ic('mail')} <span data-email-text></span></a></li>
        </ul>
        <ul data-hours-short style="margin-top:12px;font-size:.88rem"></ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© <span data-year>2026</span> ${cfg.nome} ${cfg.sobrenome}. Todos os direitos reservados.</span>
      <span><a href="privacidade.html">Política de privacidade</a> · <a href="admin.html" rel="nofollow">Área do salão</a></span>
    </div>
  </div>
</footer>
<a class="wa-float" data-wa hidden target="_blank" rel="noopener" aria-label="Falar pelo WhatsApp">${ic('wa')}</a>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Galeria de fotos" hidden>
  <button class="lb-btn lb-close" aria-label="Fechar">${ic('close')}</button>
  <button class="lb-btn lb-prev" aria-label="Foto anterior">${ic('chevl')}</button>
  <button class="lb-btn lb-next" aria-label="Próxima foto">${ic('chevr')}</button>
  <figure><img alt=""><figcaption></figcaption></figure>
</div>
${sc}
</body>
</html>
`;
}

const pageHero = ({ h1, p, crumb, img }) => `<section class="page-hero${img ? ' has-img' : ''}"><div class="wrap">
  <p class="crumbs"><a href="index.html">Início</a> / ${crumb}</p><h1>${h1}</h1><p>${p}</p></div></section>`;

const cta = `<section class="section cta"><div class="wrap">
  <h2>Seu horário está esperando por você</h2>
  <p>Escolha o serviço, a profissional e o melhor horário em poucos toques. Sem ligação, sem espera.</p>
  <div class="btns"><a class="btn btn-dark" href="agendar.html">${ic('calendar')} Agendar agora</a>
  <a class="btn btn-line" data-wa hidden target="_blank" rel="noopener">${ic('wa')} Falar no WhatsApp</a></div></div></section>`;

const pages = {};

/* ---------------- HOME ---------------- */
pages['index.html'] = {
  title: cfg.nome, desc: `${cfg.nome} ${cfg.sobrenome} em ${cfg.cidade}: cabelo, depilação, estética e unhas. Beleza real, técnicas modernas e atendimento personalizado. Agende online.`,
  jsonld: `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'HairSalon', name: cfg.nome + ' ' + cfg.sobrenome, url: cfg.url, image: cfg.url + '/img/hero.jpg',
    address: { '@type': 'PostalAddress', addressLocality: 'Areal', addressRegion: 'RJ', addressCountry: 'BR', ...(cfg.endereco ? { streetAddress: cfg.endereco } : {}) },
    sameAs: ['https://instagram.com/' + cfg.instagram]
  })}</script>`,
  body: `
<section class="hero">
  <div class="hero-img"><img src="img/hero.jpg" alt="Cabelo castanho com mechas caramelo e ondas soltas, feito no salão" fetchpriority="high"></div>
  <div class="wrap hero-inner">
    <div class="hero-seq">
      <h1>Ateliê da<br>Beleza</h1>
      <p class="tags"><span>Cabelo<i>•</i>Depilação</span><br><span>Estética<i>•</i>Unhas</span></p>
      <p class="sub">Beleza real, com técnicas modernas e atendimento personalizado para você se sentir ainda mais linda.</p>
      <div class="hero-actions"><a class="btn btn-sand" href="agendar.html">${ic('calendar')} Agendar agora ${ic('arrow')}</a></div>
      <div class="hero-meta"><span>${ic('pin')} ${cfg.cidade}</span><a href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener">${ic('instagram')} @${cfg.instagram}</a></div>
    </div>
    <nav class="rail" aria-label="Categorias de serviços">
      <a href="servicos.html#cabelo">Cabelo <span class="ic">${ic('scissors')}</span></a>
      <a href="servicos.html#depilacao">Depilação <span class="ic">${ic('wax')}</span></a>
      <a href="servicos.html#estetica">Estética <span class="ic">${ic('eye')}</span></a>
      <a href="servicos.html#unhas">Unhas <span class="ic">${ic('nail')}</span></a>
    </nav>
  </div>
</section>

<section class="cats"><div class="wrap"><div class="cat-grid" data-render="cats"></div></div></section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Nossos trabalhos</h2><a class="link-arrow" href="trabalhos.html">Ver mais ${ic('arrow')}</a></div>
    <div class="works" data-render="works" data-count="5"></div>
  </div>
</section>

<section class="section" style="background:var(--sand-2)">
  <div class="wrap">
    <div class="sec-head"><div><h2>Mais pedidos</h2></div><a class="link-arrow" href="servicos.html">Ver todos os serviços ${ic('arrow')}</a></div>
    <div class="pop-grid" data-render="popular"></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Agende em 4 passos</h2></div>
    <ol class="steps">
      <li><h3>Escolha o serviço</h3><p>Veja preço e duração de cada procedimento antes de decidir.</p></li>
      <li><h3>Escolha a profissional</h3><p>Prefere alguém em especial? Ou deixe a gente indicar.</p></li>
      <li><h3>Escolha data e horário</h3><p>Só aparecem os horários realmente livres na agenda.</p></li>
      <li><h3>Confirme</h3><p>Você recebe um código para consultar ou cancelar quando quiser.</p></li>
    </ol>
    <div style="margin-top:36px"><a class="btn btn-dark" href="agendar.html">${ic('calendar')} Começar agendamento</a></div>
  </div>
</section>

<div class="wrap" style="padding-bottom:clamp(40px,6vw,72px)">
  <div class="perks">
    <div class="perk">${ic('diamond')} Produtos<br>de qualidade</div>
    <div class="perk">${ic('shield')} Profissionais<br>especializadas</div>
    <div class="perk">${ic('heart')} Atendimento<br>personalizado</div>
    <div class="perk">${ic('calendar')} Agendamento<br>online</div>
    <div class="perk">${ic('pin')} Localização<br>${cfg.cidade}</div>
  </div>
</div>
${cta}`
};

/* ---------------- SERVIÇOS ---------------- */
pages['servicos.html'] = {
  title: 'Serviços e preços', desc: 'Tabela de serviços e preços do Ateliê da Beleza: cabelo, depilação, estética e unhas. Veja duração e valores e agende online.',
  body: `${pageHero({ h1: 'Serviços e preços', p: 'Valores e duração de cada procedimento, para você escolher com tranquilidade.', crumb: 'Serviços' })}
<div class="svc-tabs"><div class="wrap"><div class="chips" role="tablist" aria-label="Categorias" data-render="svc-tabs"></div></div></div>
<div class="wrap" style="padding-bottom:clamp(56px,8vw,96px)">
  <div data-render="services"></div>
  <p class="note">Os valores podem variar conforme o comprimento, a densidade e as condições do cabelo ou da unha. O valor final é confirmado na avaliação, antes de começarmos.</p>
</div>
${cta}`
};

/* ---------------- EQUIPE ---------------- */
pages['equipe.html'] = {
  title: 'Equipe', desc: 'Conheça as profissionais do Ateliê da Beleza e agende direto com quem você prefere.',
  body: `${pageHero({ h1: 'Nossa equipe', p: 'Profissionais especializadas em cada área. Escolha com quem agendar ou deixe a gente indicar.', crumb: 'Equipe' })}
<section class="section"><div class="wrap"><div class="team" data-render="team"></div></div></section>
${cta}`
};

/* ---------------- TRABALHOS ---------------- */
pages['trabalhos.html'] = {
  title: 'Nossos trabalhos', desc: 'Galeria de trabalhos do Ateliê da Beleza: cabelo, estética, unhas e depilação.',
  body: `${pageHero({ h1: 'Nossos trabalhos', p: 'Resultados reais de cabelo, estética e unhas feitos aqui no ateliê.', crumb: 'Trabalhos' })}
<section class="section"><div class="wrap">
  <div class="chips" data-render="gal-chips" style="margin-bottom:28px" role="group" aria-label="Filtrar por categoria"></div>
  <div class="gallery" data-render="gallery"></div>
  <p class="note" style="margin-top:20px">Quer ver mais? Acompanhe o dia a dia no Instagram <a href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener" style="text-decoration:underline">@${cfg.instagram}</a>.</p>
</div></section>
${cta}`
};

/* ---------------- SOBRE ---------------- */
pages['sobre.html'] = {
  title: 'Sobre o ateliê', desc: `Conheça o ${cfg.nome}: beleza real, técnicas modernas e atendimento personalizado em ${cfg.cidade}.`,
  body: `${pageHero({ h1: 'Beleza real, feita com cuidado', p: 'Um ateliê pensado para você sair se reconhecendo no espelho — só que ainda mais linda.', crumb: 'Sobre', img: true })}
<section class="section"><div class="wrap split">
  <div class="ph"><img src="img/salao.jpg" alt="Ambiente do Ateliê da Beleza, com bancadas, plantas e iluminação acolhedora" loading="lazy"></div>
  <div>
    <h2>Um ateliê, quatro cuidados</h2>
    <p>O ${cfg.nome} reúne em um só lugar cabelo, depilação, estética e unhas. A ideia é simples: você resolve tudo no mesmo espaço, com profissionais que conhecem a sua rotina e o seu estilo.</p>
    <p>Trabalhamos com técnicas modernas e produtos de qualidade, sempre começando por uma conversa. Antes de qualquer procedimento, a gente entende o que você quer, avalia o que é possível e combina o resultado.</p>
    <p style="margin-top:26px"><a class="btn btn-dark" href="agendar.html">${ic('calendar')} Agendar horário</a></p>
  </div>
</div></section>
<section class="section" style="background:var(--sand-2)"><div class="wrap">
  <div class="sec-head"><h2>Como a gente trabalha</h2></div>
  <div class="values">
    <div class="value">${ic('heart')}<h3>Atendimento personalizado</h3><p>Cada cliente é única. O procedimento é pensado para o seu cabelo, a sua pele e o seu dia a dia.</p></div>
    <div class="value">${ic('diamond')}<h3>Produtos de qualidade</h3><p>Escolhemos produtos que entregam resultado sem comprometer a saúde dos fios e da pele.</p></div>
    <div class="value">${ic('shield')}<h3>Profissionais especializadas</h3><p>Cada área tem uma profissional dedicada, com técnica atualizada e cuidado nos detalhes.</p></div>
  </div>
</div></section>
<section class="section"><div class="wrap split" style="align-items:start">
  <div>
    <h2>Onde estamos</h2>
    <p><span data-endereco>${cfg.cidade}</span></p>
    <p style="margin-top:12px"><a class="link-arrow" href="contato.html">Ver mapa e formas de contato ${ic('arrow')}</a></p>
  </div>
  <div class="card"><h3 style="font-size:1.4rem;margin-bottom:12px">Horário de atendimento</h3><table class="hours" data-hours-table></table></div>
</div></section>
${cta}`
};

/* ---------------- CONTATO ---------------- */
pages['contato.html'] = {
  title: 'Contato e localização', desc: `Fale com o ${cfg.nome}: WhatsApp, Instagram, endereço em ${cfg.cidade} e formulário de contato.`,
  body: `${pageHero({ h1: 'Fale com a gente', p: 'Tire dúvidas, peça orçamento ou conte o que você está sonhando para o seu visual.', crumb: 'Contato' })}
<section class="section"><div class="wrap contact-grid">
  <div class="card">
    <h2 style="font-size:1.7rem;margin-bottom:6px">Envie uma mensagem</h2>
    <p class="lead" style="font-size:.98rem;margin-bottom:22px">Respondemos o quanto antes, em horário de atendimento.</p>
    <form id="contact-form" novalidate>
      <div id="contact-alert" role="alert"></div>
      <div class="field"><label for="c-nome">Nome</label><input class="input" id="c-nome" name="nome" autocomplete="name" required><div class="msg-err" data-err="nome"></div></div>
      <div class="row2">
        <div class="field"><label for="c-tel">WhatsApp / telefone</label><input class="input" id="c-tel" name="telefone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(24) 99999-9999"><div class="msg-err" data-err="telefone"></div></div>
        <div class="field"><label for="c-email">E-mail <span class="opt">(opcional)</span></label><input class="input" id="c-email" name="email" type="email" autocomplete="email"><div class="msg-err" data-err="email"></div></div>
      </div>
      <div class="field"><label for="c-assunto">Assunto</label>
        <select class="input" id="c-assunto" name="assunto"><option>Dúvida sobre serviços</option><option>Orçamento</option><option>Alterar ou cancelar agendamento</option><option>Elogio ou sugestão</option><option>Outro assunto</option></select></div>
      <div class="field"><label for="c-msg">Mensagem</label><textarea class="input" id="c-msg" name="mensagem" required></textarea><div class="msg-err" data-err="mensagem"></div></div>
      <input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="check" style="margin-bottom:18px"><input type="checkbox" name="consentimento" required><span>Concordo com o uso dos meus dados para retorno deste contato, conforme a <a href="privacidade.html">política de privacidade</a>.</span></label>
      <div class="msg-err" data-err="consentimento" style="margin:-8px 0 12px"></div>
      <button class="btn btn-dark" type="submit">Enviar mensagem</button>
    </form>
  </div>
  <div>
    <div class="channels">
      <a class="channel" data-wa hidden target="_blank" rel="noopener"><span class="ic">${ic('wa')}</span><span><b>WhatsApp</b><span class="v">Chame para tirar dúvidas</span></span></a>
      <a class="channel" href="https://instagram.com/${cfg.instagram}" target="_blank" rel="noopener"><span class="ic">${ic('instagram')}</span><span><b>Instagram</b><span class="v">@${cfg.instagram}</span></span></a>
      <a class="channel" data-email hidden><span class="ic">${ic('mail')}</span><span><b>E-mail</b><span class="v" data-email-text></span></span></a>
      <div class="channel"><span class="ic">${ic('pin')}</span><span><b>Endereço</b><span class="v" data-endereco>${cfg.cidade}</span></span></div>
      <div class="channel"><span class="ic">${ic('clock')}</span><span><b>Horário</b><span class="v" data-hours-inline></span></span></div>
    </div>
    <div class="map"><iframe title="Mapa de ${cfg.cidade}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(cfg.mapaQuery)}&output=embed"></iframe></div>
  </div>
</div></section>
<section class="section-tight" style="padding-bottom:clamp(56px,8vw,96px)"><div class="wrap" style="max-width:860px">
  <div class="sec-head"><h2>Dúvidas frequentes</h2></div>
  <details class="faq"><summary>Como funciona o agendamento online? ${ic('plus')}</summary><p>Você escolhe o serviço, a profissional, a data e o horário em <a href="agendar.html" style="text-decoration:underline">nossa página de agendamento</a>. Ao confirmar, recebe um código. O salão confirma o horário com você.</p></details>
  <details class="faq"><summary>Posso cancelar ou remarcar? ${ic('plus')}</summary><p>Pode. Na página de agendamento, clique em “Consultar ou cancelar” e informe o código e o telefone usados na reserva. Para remarcar, cancele e escolha um novo horário, de preferência com antecedência para liberar a agenda.</p></details>
  <details class="faq"><summary>O preço do site é o valor final? ${ic('plus')}</summary><p>É o valor de referência. Em serviços como mechas, coloração e progressiva, o valor pode variar conforme o comprimento e a condição do cabelo, e é confirmado na avaliação.</p></details>
  <details class="faq"><summary>Posso agendar mais de um serviço no mesmo dia? ${icPlus()}</summary><p>Sim, dentro da mesma categoria (por exemplo, corte e escova). O sistema soma a duração e procura um horário em que a profissional esteja livre pelo tempo todo. Para categorias diferentes, faça um agendamento para cada uma.</p></details>
  <details class="faq"><summary>Meus dados estão seguros? ${ic('plus')}</summary><p>Usamos seus dados apenas para atender você. Veja detalhes na <a href="privacidade.html" style="text-decoration:underline">política de privacidade</a>.</p></details>
</div></section>`
};
function icPlus() { return ic('plus'); }

/* ---------------- AGENDAR ---------------- */
pages['agendar.html'] = {
  title: 'Agendamento online', desc: 'Agende online no Ateliê da Beleza: escolha o serviço, a profissional, a data e o horário em poucos passos.', cls: 'page-agendar',
  scripts: ['js/booking.js'],
  body: `<div class="wrap"><div class="book">
  <div>
    <h1>Agendamento online</h1>
    <p class="intro">Escolha o serviço, a profissional, a data e o horário de forma rápida e segura.</p>
    <div id="mode-banner"></div>
    <ol class="stepper" id="stepper" aria-label="Etapas do agendamento">
      <li data-n="1">Serviço</li><li data-n="2">Profissional</li><li data-n="3">Data e horário</li><li data-n="4">Confirmação</li>
    </ol>
    <div id="panel" aria-live="polite"></div>
    <p class="note" style="margin-top:28px">Já tem um horário? <button class="link-arrow" id="open-lookup" style="background:none;border-top:0;border-left:0;border-right:0;padding:0 0 2px;color:inherit">Consultar ou cancelar agendamento</button></p>
  </div>
  <aside class="summary" id="summary" aria-label="Resumo do agendamento"></aside>
</div></div>
<dialog id="lookup" aria-labelledby="lk-title"><div class="dlg">
  <button class="x" id="lk-close" aria-label="Fechar">${ic('close')}</button>
  <h2 id="lk-title">Meu agendamento</h2>
  <p class="lead" style="font-size:.95rem;margin-bottom:18px">Informe o código recebido e o telefone usado na reserva.</p>
  <form id="lk-form" novalidate>
    <div id="lk-alert" role="alert"></div>
    <div class="field"><label for="lk-code">Código</label><input class="input" id="lk-code" placeholder="AB-XXXXXX" autocomplete="off" style="text-transform:uppercase"></div>
    <div class="field"><label for="lk-tel">Telefone</label><input class="input" id="lk-tel" type="tel" inputmode="tel" placeholder="(24) 99999-9999"></div>
    <button class="btn btn-dark" type="submit" style="width:100%">Consultar</button>
  </form>
  <div id="lk-result"></div>
</div></dialog>`
};

/* ---------------- ADMIN ---------------- */
pages['admin.html'] = {
  title: 'Área do salão', desc: 'Painel administrativo.', noindex: true, scripts: ['js/admin.js'],
  body: `<div class="wrap" id="admin-root" style="padding-bottom:80px"></div>`
};

/* ---------------- PRIVACIDADE ---------------- */
pages['privacidade.html'] = {
  title: 'Política de privacidade', desc: `Como o ${cfg.nome} coleta, usa e protege seus dados pessoais (LGPD).`,
  body: `${pageHero({ h1: 'Política de privacidade', p: 'Como tratamos seus dados, em linguagem simples, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).', crumb: 'Privacidade' })}
<section class="section"><div class="wrap prose">
<p><b>Última atualização:</b> novembro de 2026.</p>
<h2>Quem é o controlador dos dados</h2>
<p>${cfg.nome} ${cfg.sobrenome}, em ${cfg.cidade}. Para falar sobre seus dados, use os canais da página de <a href="contato.html">contato</a>.</p>
<h2>Quais dados coletamos</h2>
<ul><li><b>Agendamento:</b> nome, telefone/WhatsApp, e-mail (opcional), serviços escolhidos, data, horário e observações que você escrever.</li>
<li><b>Contato:</b> nome, telefone, e-mail (opcional) e a mensagem enviada.</li>
<li><b>Navegação:</b> o site guarda no seu navegador apenas preferências técnicas necessárias ao agendamento. Não usamos cookies de publicidade.</li></ul>
<h2>Para que usamos</h2>
<p>Para reservar e confirmar seu horário, entrar em contato sobre o atendimento, responder mensagens e organizar a agenda do salão. Não vendemos nem compartilhamos seus dados para fins de marketing de terceiros.</p>
<h2>Base legal</h2>
<p>Execução do serviço solicitado por você (agendamento) e seu consentimento (formulário de contato), conforme o art. 7º da LGPD.</p>
<h2>Por quanto tempo guardamos</h2>
<p>Pelo tempo necessário para o atendimento e para cumprir obrigações legais. Depois disso, os dados são excluídos ou anonimizados.</p>
<h2>Serviços de terceiros</h2>
<p>O site carrega fontes do Google Fonts e, na página de contato, um mapa do Google Maps. Esses serviços podem registrar seu acesso conforme as próprias políticas. Ao escolher confirmar pelo WhatsApp, a conversa passa a seguir as regras do WhatsApp.</p>
<h2>Seus direitos</h2>
<p>Você pode pedir confirmação de que tratamos seus dados, acesso, correção, exclusão, portabilidade e revogação do consentimento, a qualquer momento, pelos canais de <a href="contato.html">contato</a>. Também pode cancelar um agendamento pela página de <a href="agendar.html">agendamento</a>.</p>
</div></section>`
};

/* ---------------- 404 ---------------- */
pages['404.html'] = {
  title: 'Página não encontrada', desc: 'Página não encontrada.', noindex: true,
  body: `<div class="center-screen"><div><h1>404</h1><p>Esta página não existe ou foi movida.</p>
<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-dark" href="index.html">Voltar ao início</a><a class="btn btn-line" href="agendar.html">Agendar horário</a></div></div></div>`
};

/* ---------------- Gera arquivos ---------------- */
for (const [file, p] of Object.entries(pages)) fs.writeFileSync(path.join(SITE, file), layout({ file, ...p }));

fs.writeFileSync(path.join(SITE, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1c1a18"/><text x="32" y="41" text-anchor="middle" font-family="Georgia,serif" font-size="30" fill="#efe3d3" letter-spacing="-3">RA</text></svg>`);
const pub = Object.keys(pages).filter((f) => !['admin.html', '404.html'].includes(f));
fs.writeFileSync(path.join(SITE, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pub.map((f) => `  <url><loc>${cfg.url}/${f === 'index.html' ? '' : f}</loc></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(SITE, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\nSitemap: ${cfg.url}/sitemap.xml\n`);
console.log('Páginas geradas:', Object.keys(pages).join(', '));
