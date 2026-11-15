/* ============================================================
   CATÁLOGO — serviços, preços e equipe. Edite livremente.
   Preços/serviços de Cabelo vêm do mockup; os demais são exemplos
   a serem ajustados pelo salão. `min` = duração em minutos.
   ============================================================ */
(function (root, factory) {
  const c = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = c;
  else root.ATELIE_CATALOG = c;
})(typeof self !== 'undefined' ? self : this, function () {
  const categorias = [
    { id: 'cabelo', nome: 'Cabelo', icone: 'scissors', img: 'img/cat-cabelo.jpg', desc: 'Cortes, coloração, mechas e tratamentos' },
    { id: 'depilacao', nome: 'Depilação', icone: 'wax', img: 'img/cat-depilacao.jpg', desc: 'Corporal e facial' },
    { id: 'estetica', nome: 'Estética', icone: 'eye', img: 'img/cat-estetica.jpg', desc: 'Design de sobrancelhas, extensão de cílios e mais' },
    { id: 'unhas', nome: 'Unhas', icone: 'nail', img: 'img/cat-unhas.jpg', desc: 'Manicure, pedicure e alongamento' }
  ];

  const servicos = [
    // CABELO (do mockup)
    { id: 'mechas', cat: 'cabelo', nome: 'Mechas', min: 180, preco: 300, desc: 'Iluminado e mechas com tonalização e finalização.' },
    { id: 'coloracao', cat: 'cabelo', nome: 'Coloração', min: 120, preco: 220, desc: 'Cor uniforme e brilho, do diagnóstico à finalização.' },
    { id: 'corte-feminino', cat: 'cabelo', nome: 'Corte feminino', min: 60, preco: 90, desc: 'Corte pensado para o seu formato de rosto e rotina.' },
    { id: 'botox-capilar', cat: 'cabelo', nome: 'Botox capilar', min: 90, preco: 180, desc: 'Reduz frizz e devolve alinhamento e maciez aos fios.' },
    { id: 'progressiva', cat: 'cabelo', nome: 'Progressiva', min: 150, preco: 250, desc: 'Alisamento progressivo para fios lisos e disciplinados.' },
    { id: 'escova', cat: 'cabelo', nome: 'Escova', min: 60, preco: 80, desc: 'Lavagem e escova modelada.' },
    { id: 'hidratacao', cat: 'cabelo', nome: 'Hidratação profunda', min: 45, preco: 70, desc: 'Reposição de água e nutrientes para fios ressecados.' },
    // DEPILAÇÃO
    { id: 'depil-buco', cat: 'depilacao', nome: 'Buço', min: 15, preco: 15, desc: 'Depilação com cera.' },
    { id: 'depil-sobrancelha', cat: 'depilacao', nome: 'Sobrancelha com cera', min: 20, preco: 25, desc: 'Remoção dos fios com cera.' },
    { id: 'depil-axila', cat: 'depilacao', nome: 'Axila', min: 20, preco: 25, desc: 'Depilação com cera.' },
    { id: 'depil-meia-perna', cat: 'depilacao', nome: 'Meia perna', min: 30, preco: 40, desc: 'Joelho até o tornozelo.' },
    { id: 'depil-perna', cat: 'depilacao', nome: 'Perna completa', min: 45, preco: 60, desc: 'Da coxa ao tornozelo.' },
    { id: 'depil-virilha', cat: 'depilacao', nome: 'Virilha', min: 30, preco: 45, desc: 'Depilação com cera, com atendimento reservado.' },
    { id: 'depil-facial', cat: 'depilacao', nome: 'Facial completa', min: 30, preco: 50, desc: 'Buço, queixo e contorno do rosto.' },
    // ESTÉTICA
    { id: 'design-sobrancelhas', cat: 'estetica', nome: 'Design de sobrancelhas', min: 30, preco: 45, desc: 'Mapeamento e design de acordo com o seu rosto.' },
    { id: 'design-henna', cat: 'estetica', nome: 'Design com henna', min: 45, preco: 60, desc: 'Design com preenchimento de henna.' },
    { id: 'extensao-cilios', cat: 'estetica', nome: 'Extensão de cílios', min: 120, preco: 150, desc: 'Aplicação fio a fio para um olhar marcado e natural.' },
    { id: 'lash-lifting', cat: 'estetica', nome: 'Lash lifting', min: 60, preco: 120, desc: 'Curvatura e alinhamento dos cílios naturais.' },
    { id: 'limpeza-pele', cat: 'estetica', nome: 'Limpeza de pele', min: 75, preco: 130, desc: 'Higienização profunda, extração e hidratação.' },
    // UNHAS
    { id: 'manicure', cat: 'unhas', nome: 'Manicure', min: 45, preco: 35, desc: 'Cutilagem e esmaltação.' },
    { id: 'pedicure', cat: 'unhas', nome: 'Pedicure', min: 60, preco: 40, desc: 'Cutilagem, lixa e esmaltação.' },
    { id: 'mao-e-pe', cat: 'unhas', nome: 'Mão e pé', min: 100, preco: 70, desc: 'Manicure e pedicure no mesmo atendimento.' },
    { id: 'esmaltacao-gel', cat: 'unhas', nome: 'Esmaltação em gel', min: 60, preco: 80, desc: 'Cor com alta durabilidade e brilho.' },
    { id: 'alongamento', cat: 'unhas', nome: 'Alongamento em gel', min: 150, preco: 180, desc: 'Alongamento com acabamento e formato à sua escolha.' },
    { id: 'manutencao-alongamento', cat: 'unhas', nome: 'Manutenção de alongamento', min: 90, preco: 120, desc: 'Reposição e ajuste do alongamento.' }
  ];

  // Equipe — nomes/descrições de exemplo: troque pelos reais.
  const equipe = [
    { id: 'ana', nome: 'Ana', funcao: 'Cabeleireira', cats: ['cabelo'], bio: 'Cortes, escovas e finalizações para o dia a dia e ocasiões especiais.' },
    { id: 'rafaela', nome: 'Rafaela', funcao: 'Colorista', cats: ['cabelo'], bio: 'Mechas, iluminados, coloração e tratamentos de reconstrução.' },
    { id: 'juliana', nome: 'Juliana', funcao: 'Esteticista e depiladora', cats: ['depilacao', 'estetica'], bio: 'Depilação, design de sobrancelhas, cílios e cuidados com a pele.' },
    { id: 'camila', nome: 'Camila', funcao: 'Nail designer', cats: ['unhas'], bio: 'Manicure, pedicure, esmaltação em gel e alongamento.' }
  ];

  // Fotos da galeria (troque por fotos reais em /img e atualize aqui)
  const galeria = [
    { src: 'img/trabalho-1.jpg', cat: 'cabelo', alt: 'Cabelo castanho com mechas caramelo e ondas soltas' },
    { src: 'img/trabalho-2.jpg', cat: 'cabelo', alt: 'Cliente sorrindo com cabelo ondulado e iluminado' },
    { src: 'img/trabalho-3.jpg', cat: 'cabelo', alt: 'Costas de cabelo longo com ondas e reflexos dourados' },
    { src: 'img/trabalho-4.jpg', cat: 'cabelo', alt: 'Cliente de óculos com cabelo longo ondulado' },
    { src: 'img/trabalho-5.jpg', cat: 'cabelo', alt: 'Cabelo loiro iluminado com ondas largas' },
    { src: 'img/cat-estetica.jpg', cat: 'estetica', alt: 'Design de sobrancelhas e extensão de cílios' },
    { src: 'img/cat-unhas.jpg', cat: 'unhas', alt: 'Unhas alongadas com esmaltação rosa e nude' },
    { src: 'img/cat-depilacao.jpg', cat: 'depilacao', alt: 'Depilação corporal com cera' },
    { src: 'img/cat-cabelo.jpg', cat: 'cabelo', alt: 'Cabelo com coloração em degradê caramelo' }
  ];

  return { categorias, servicos, equipe, galeria };
});
