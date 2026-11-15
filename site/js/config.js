/* ============================================================
   CONFIGURAÇÃO DO SITE — edite aqui. É a única fonte de verdade
   (usada pelo navegador E pelo servidor Node).
   ============================================================ */
(function (root, factory) {
  const cfg = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = cfg;
  else root.ATELIE_CONFIG = cfg;
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    nome: 'Ateliê da Beleza',
    sobrenome: 'Marcelino',
    cidade: 'Areal – RJ',
    // Endereço completo (rua, número). Deixe vazio até ter certeza: aparece no rodapé/contato.
    endereco: '',
    // Link do Google Maps do endereço exato (opcional). Se vazio, usa busca por "Areal, RJ".
    mapaQuery: 'Areal, RJ',
    instagram: 'atelie_ra_',

    // >>> PREENCHER: WhatsApp só com números, com DDI+DDD. Ex.: '5524912345678'
    // Enquanto estiver vazio, os botões de WhatsApp ficam ocultos (nada aponta para número errado).
    whatsapp: '',
    // >>> PREENCHER: e-mail que recebe contatos/agendamentos (opcional)
    email: '',
    // Domínio final (usado em SEO/sitemap). Sem barra no fim.
    url: 'https://www.exemplo.com.br',

    // URL base da API. Deixe '' quando o Node serve o site e a API juntos (recomendado).
    // Se o site ficar em hospedagem estática e a API em outro domínio: 'https://api.seudominio.com.br'
    apiBase: '',

    // Horário de funcionamento. Chave = dia da semana (0=domingo … 6=sábado). null = fechado.
    horarios: {
      0: null,
      1: null,
      2: ['09:00', '19:00'],
      3: ['09:00', '19:00'],
      4: ['09:00', '19:00'],
      5: ['09:00', '19:00'],
      6: ['08:00', '17:00']
    },
    // Pausa opcional (ex.: ['12:00','13:00']). null = sem pausa.
    pausa: null,
    // Datas sem atendimento (MM-DD recorrente ou AAAA-MM-DD específica)
    feriados: ['01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'],
    passoMin: 30,          // intervalo entre horários oferecidos
    antecedenciaMin: 120,  // antecedência mínima para agendar (minutos)
    diasMax: 60            // até quantos dias à frente é possível agendar
  };
});
