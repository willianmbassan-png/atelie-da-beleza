# Ateliê da Beleza — site completo

Site multipáginas (HTML + CSS + JavaScript puro) com **agendamento online real**, formulário de contato,
painel do salão (`/admin.html`) e um servidor Node **sem dependências** (só precisa do Node 22.13+).

```
atelie/
├── site/                  ← o site (pasta pública)
│   ├── index.html servicos.html equipe.html trabalhos.html sobre.html
│   │   contato.html agendar.html privacidade.html admin.html 404.html
│   ├── css/style.css
│   ├── js/config.js       ← ⚙️ CONFIGURAÇÃO (WhatsApp, horários, domínio…)
│   ├── js/catalog.js      ← ⚙️ serviços, preços, equipe, fotos da galeria
│   ├── js/engine.js       ← regras da agenda (usadas no navegador e no servidor)
│   ├── js/api.js app.js booking.js admin.js
│   └── img/               ← fotos (substitua pelas suas)
├── server/                ← backend: API + banco SQLite + serve o site
│   ├── server.js  test.js  .env.example  package.json
└── tools/build.js         ← regenera as páginas HTML (cabeçalho/rodapé/SEO)
```

## 1. Antes de publicar — preencha estes itens

| O quê | Onde | Observação |
|---|---|---|
| **WhatsApp** do salão | `site/js/config.js` → `whatsapp` (ex.: `'5524912345678'`) | Enquanto vazio, todos os botões de WhatsApp ficam **ocultos** (nada aponta para número errado). |
| E-mail do salão | `config.js` → `email` | Opcional; aparece em Contato. |
| Endereço completo | `config.js` → `endereco` e `mapaQuery` | Hoje só “Areal – RJ”. |
| Domínio final | `config.js` → `url` | Depois rode `node tools/build.js` (atualiza SEO, sitemap e robots). |
| **Horários de atendimento** | `config.js` → `horarios`, `feriados`, `pausa` | Exemplo: ter–sex 9h–19h, sáb 8h–17h. **Ajuste ao real.** |
| **Preços, durações e serviços** | `site/js/catalog.js` | Cabelo vem do mockup. Depilação, Estética e Unhas são **exemplos**. |
| **Equipe** | `catalog.js` → `equipe` | Nomes/funções de exemplo (Ana, Rafaela, Juliana, Camila). Troque pelos reais; `cats` define quais categorias cada uma atende. |
| **Fotos** | `site/img/` + `catalog.js` → `galeria` | As fotos atuais foram **recortadas do mockup** (baixa resolução). Use fotos reais (ideal 1200px+, JPG/WebP). |

Mudou nome/domínio/slogan em `config.js`? Rode `node tools/build.js` para regenerar as páginas.

## 2. Rodar localmente

```bash
cd server
cp .env.example .env        # edite ADMIN_PASSWORD e SESSION_SECRET
node --disable-warning=ExperimentalWarning server.js
# abra http://localhost:3000   (painel: http://localhost:3000/admin.html)
node --disable-warning=ExperimentalWarning test.js   # 31 testes da API
```
Requer **Node 22.13 ou mais novo** (usa o SQLite embutido do Node: nenhum `npm install`).

## 3. Colocar no ar

### Opção A (recomendada): tudo em um servidor Node
O servidor entrega o site **e** a API no mesmo domínio. Não é preciso configurar `apiBase`.
- **Render / Railway / Fly.io:** crie um *Web Service* apontando para a pasta `server/`, comando de início
  `node --disable-warning=ExperimentalWarning server.js`, versão do Node 22+. Defina as variáveis do `.env.example` no painel.
  **Importante:** anexe um **disco persistente** e aponte `DB_FILE` para ele (ex.: `/var/data/atelie.db`), senão o banco some a cada deploy.
- **VPS (Ubuntu):** instale Node 22, copie o projeto, `cp .env.example .env`, rode com `pm2 start server.js --name atelie`
  e coloque **Nginx + HTTPS (Let’s Encrypt)** na frente apontando para a porta 3000. Com `NODE_ENV=production` o servidor
  confia no cabeçalho `X-Forwarded-For` do proxy (limite de tentativas por IP) e envia HSTS.

### Opção B: site em hospedagem estática + API separada
1. Publique `site/` em qualquer hospedagem (Netlify, Cloudflare Pages, Hostinger…).
2. Publique `server/` (Opção A) em outro domínio, ex.: `api.seudominio.com.br`.
3. Em `site/js/config.js`: `apiBase: 'https://api.seudominio.com.br'` e no `.env` do servidor:
   `CORS_ORIGINS=https://www.seudominio.com.br`.
   (O CSP do servidor só cobre as páginas que ele serve; na hospedagem estática, se aplicar CSP, libere `connect-src` para a API.)

### Opção C: só site estático, sem servidor (modo local)
Funciona, mas com limites honestos: o agendamento fica salvo **apenas no navegador do cliente** e a confirmação ao salão
vai pelo **botão de WhatsApp** (por isso preencha `whatsapp`). Não há bloqueio de horários entre clientes diferentes.
Use só como solução provisória.

## 4. Como funciona o agendamento
1. Serviço(s) da mesma categoria → 2. profissional (ou “sem preferência”) → 3. data e horário → 4. dados e confirmação.
- Só aparecem **horários realmente livres**: o servidor soma a duração dos serviços e checa conflito por profissional.
- A checagem final acontece de novo **dentro de uma transação** no momento de gravar (sem overbooking mesmo com 2 clientes ao mesmo tempo).
- **Preço e duração vêm sempre do catálogo no servidor** (o navegador não consegue alterar valores).
- O cliente recebe um **código** (`AB-XXXXXX`), pode **baixar o evento .ics** (Google/Apple/Outlook), confirmar pelo WhatsApp,
  e depois **consultar/cancelar** com código + telefone.
- Antecedência mínima, passo dos horários e janela máxima: `antecedenciaMin`, `passoMin`, `diasMax` em `config.js`.

## 5. Painel do salão (`/admin.html`)
Login por senha (`ADMIN_PASSWORD`, sessão assinada de 12h, bloqueio após 8 tentativas/15 min).
Lista e filtra agendamentos (status, data, profissional), **confirma / conclui / cancela**, abre conversa no WhatsApp do cliente
e lê as mensagens do formulário de contato.

## 6. E-mail automático (opcional)
Crie conta no [Resend](https://resend.com), verifique seu domínio e preencha `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_TO` no `.env`.
O salão passa a receber aviso de cada agendamento/cancelamento/contato e o cliente (se informar e-mail) recebe confirmação.
Sem essas variáveis, tudo funciona normalmente — apenas sem e-mails.

## 7. Segurança e LGPD (já incluídos)
Cabeçalhos de segurança + CSP, limite de requisições, honeypot anti-robô, validação no servidor, escape de HTML,
proteção contra path traversal, senha comparada em tempo constante, consentimento explícito nos formulários e
`privacidade.html`. **Faça backup do arquivo do banco** (`DB_FILE`) regularmente e revise o texto da política com seu contador/advogado.

## 8. Dúvidas comuns
- *Trocar fontes/cores:* variáveis no topo de `site/css/style.css` (`:root`).
- *Adicionar serviço:* um objeto novo em `catalog.js` (aparece na lista, na home e no agendamento).
- *Nova profissional:* objeto em `equipe` com as `cats` que ela atende.
- *Bloquear um dia (viagem, curso):* adicione `'AAAA-MM-DD'` em `feriados` no `config.js`.

## Publicar no Render (passo a passo)
1. Crie um repositório no GitHub e envie esta pasta (`git init && git add . && git commit -m "site" && git push`).
2. No Render: **New → Blueprint**, escolha o repositório. O arquivo `render.yaml` já configura tudo (Node 22, disco de 1 GB para o banco, chave de sessão automática).
3. Quando pedir, informe o valor de `ADMIN_PASSWORD` (a senha do painel).
4. Aguarde o deploy; o site e o painel (`/admin.html`) ficam em `https://atelie-da-beleza.onrender.com` (ou o nome que você escolher).
5. Domínio próprio: **Settings → Custom Domains**; depois atualize `url` em `site/js/config.js` e rode `node tools/build.js`.
Obs.: sem disco persistente (plano gratuito) os agendamentos se perdem a cada deploy/reinício; por isso o blueprint usa o plano Starter.
