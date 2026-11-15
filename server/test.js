'use strict';
// Teste de integração da API (sem dependências): node test.js
process.env.DB_FILE = ':memory:';
process.env.ADMIN_PASSWORD = 'senha-de-teste';
process.env.NODE_ENV = 'test';
const assert = require('node:assert/strict');
const path = require('node:path');
const { server } = require('./server');
const E = require(path.join(__dirname, '..', 'site', 'js', 'engine.js'));
const cfg = require(path.join(__dirname, '..', 'site', 'js', 'config.js'));

let base;
const call = async (method, url, body, token) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
// próxima terça-feira (dia aberto) com pelo menos 3 dias de antecedência
let date = E.addDays(E.brNow().date, 3);
while (!E.isOpen(date, cfg) || E.dow(date) !== 2) date = E.addDays(date, 1);

server.listen(0, async () => {
  base = 'http://127.0.0.1:' + server.address().port;
  let n = 0; const ok = (m) => console.log('  ✓', m, `(${++n})`);
  try {
    assert.equal((await call('GET', '/api/health')).body.ok, true); ok('health');

    let r = await call('GET', `/api/disponibilidade?date=${date}&duracao=60&categoria=cabelo&profissional=any`);
    assert.equal(r.status, 200); assert.ok(r.body.horarios.length > 10); assert.equal(r.body.horarios[0].time, '09:00'); ok('disponibilidade lista horários');

    const closed = E.addDays(date, 6 - ((E.dow(date) + 6) % 7)); // alguma segunda/domingo fechado
    let d2 = E.addDays(date, 1); while (E.dow(d2) !== 0) d2 = E.addDays(d2, 1);
    r = await call('GET', `/api/disponibilidade?date=${d2}&duracao=60&categoria=cabelo`);
    assert.deepEqual(r.body.horarios, []); ok('domingo fechado sem horários');

    const payload = { servicos: ['corte-feminino'], profissional: 'any', data: date, hora: '10:00', nome: 'Maria da Silva', telefone: '(24) 99999-1234', email: 'maria@exemplo.com', obs: 'Teste', consentimento: true };
    r = await call('POST', '/api/agendamentos', payload);
    assert.equal(r.status, 201); const b1 = r.body.agendamento;
    assert.match(b1.codigo, /^AB-[A-Z2-9]{6}$/); assert.equal(b1.total, 90); assert.equal(b1.duracao, 60); assert.equal(b1.telefone, '24999991234'); ok('cria agendamento (preço/duração vêm do catálogo)');

    r = await call('POST', '/api/agendamentos', { ...payload, nome: 'Joana Souza', telefone: '24988887777' });
    assert.equal(r.status, 201); assert.notEqual(r.body.agendamento.profissional, b1.profissional); ok('segunda reserva simultânea vai para outra profissional');

    r = await call('POST', '/api/agendamentos', { ...payload, nome: 'Terceira Cliente', telefone: '24977776666' });
    assert.equal(r.status, 400); assert.equal(r.body.campo, 'hora'); ok('terceira no mesmo horário é recusada (sem overbooking)');

    r = await call('POST', '/api/agendamentos', { ...payload, hora: '10:30', profissional: b1.profissional, nome: 'Outra Pessoa' });
    assert.equal(r.status, 400); ok('sobreposição parcial com a mesma profissional é recusada');

    r = await call('POST', '/api/agendamentos', { ...payload, servicos: ['coloracao', 'depil-buco'], hora: '14:00' });
    assert.equal(r.status, 400); ok('categorias misturadas recusadas');
    r = await call('POST', '/api/agendamentos', { ...payload, hora: '14:00', telefone: '123' });
    assert.equal(r.body.campo, 'telefone'); ok('telefone inválido recusado');
    r = await call('POST', '/api/agendamentos', { ...payload, hora: '14:00', consentimento: false });
    assert.equal(r.body.campo, 'consentimento'); ok('sem consentimento recusado');
    r = await call('POST', '/api/agendamentos', { ...payload, hora: '14:00', website: 'http://spam' });
    assert.equal(r.status, 400); ok('honeypot bloqueia robôs');
    r = await call('POST', '/api/agendamentos', { ...payload, hora: '23:30' });
    assert.equal(r.status, 400); ok('horário fora do expediente recusado');
    r = await call('POST', '/api/agendamentos', { ...payload, data: E.addDays(E.brNow().date, -1), hora: '10:00' });
    assert.equal(r.status, 400); ok('data passada recusada');

    r = await call('POST', '/api/agendamentos/consulta', { codigo: b1.codigo.toLowerCase(), telefone: '(24) 99999-1234' });
    assert.equal(r.status, 200); assert.equal(r.body.agendamento.nome, 'Maria da Silva'); ok('consulta por código + telefone');
    r = await call('POST', '/api/agendamentos/consulta', { codigo: b1.codigo, telefone: '24900000000' });
    assert.equal(r.status, 404); ok('consulta com telefone errado não vaza dados');

    r = await call('POST', '/api/agendamentos/cancelar', { codigo: b1.codigo, telefone: '24999991234' });
    assert.equal(r.body.agendamento.status, 'cancelado'); ok('cliente cancela');
    r = await call('POST', '/api/agendamentos', { ...payload, nome: 'Terceira Cliente', telefone: '24977776666' });
    assert.equal(r.status, 201); ok('horário cancelado volta a ficar livre');

    r = await call('POST', '/api/contato', { nome: 'Ana', telefone: '24999990000', mensagem: 'Olá, quero saber mais' });
    assert.equal(r.status, 201); ok('contato salvo');
    r = await call('POST', '/api/contato', { nome: 'A', mensagem: 'x' });
    assert.equal(r.status, 400); ok('contato inválido recusado');

    r = await call('GET', '/api/admin/agendamentos'); assert.equal(r.status, 401); ok('admin sem token → 401');
    r = await call('POST', '/api/admin/login', { senha: 'errada' }); assert.equal(r.status, 401); ok('senha errada → 401');
    r = await call('POST', '/api/admin/login', { senha: 'senha-de-teste' }); assert.equal(r.status, 200);
    const tok = r.body.token;
    r = await call('GET', '/api/admin/agendamentos', null, tok); assert.equal(r.body.agendamentos.length, 3); ok('admin lista agendamentos');
    const id = r.body.agendamentos[0].id;
    r = await call('PATCH', '/api/admin/agendamentos/' + id, { status: 'confirmado' }, tok); assert.equal(r.body.agendamento.status, 'confirmado'); ok('admin confirma');
    r = await call('PATCH', '/api/admin/agendamentos/' + id, { status: 'xyz' }, tok); assert.equal(r.status, 400); ok('status inválido recusado');
    r = await call('GET', '/api/admin/mensagens', null, tok); assert.equal(r.body.mensagens.length, 1); ok('admin lista mensagens');
    r = await call('GET', '/api/admin/agendamentos', null, tok.slice(0, -2) + 'xx'); assert.equal(r.status, 401); ok('token adulterado → 401');

    // estáticos
    let h = await fetch(base + '/'); assert.equal(h.status, 200); assert.match(await h.text(), /Ateliê da Beleza/); ok('serve index');
    h = await fetch(base + '/servicos'); assert.equal(h.status, 200); ok('URL sem .html funciona');
    h = await fetch(base + '/..%2f..%2fserver%2f.env'); assert.equal(h.status, 404); ok('path traversal bloqueado');
    h = await fetch(base + '/server.js'); assert.equal(h.status, 404); ok('código do servidor não é exposto');
    h = await fetch(base + '/nada'); assert.equal(h.status, 404); ok('404 personalizado');
    console.log(`\nTodos os ${n} testes passaram.`); process.exit(0);
  } catch (e) { console.error('\nFALHOU:', e); process.exit(1); }
});
