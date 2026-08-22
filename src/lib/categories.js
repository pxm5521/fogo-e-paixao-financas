// Taxonomia de categorias/subcategorias do Bloco Fogo e Paixão.
// Gerada diretamente das colunas Tipo (=categoria) e Classe (=subcategoria)
// da planilha "Saldo em Conta FP v.xlsx" (aba ExtratoNu) — a pedido do Pedro,
// para manter os mesmos nomes que ele já usava, em vez de uma reorganização
// nova. Isto é só a "semente": no app, categorias ficam no Firestore (coleção
// `categories`) e podem ser editadas/renomeadas/ampliadas por quem estiver
// logado (ver src/pages/Categories.jsx). Os `id` abaixo têm que bater com os
// usados em build/seed_transactions.json / scripts/seed_transactions.json.

export const DEFAULT_CATEGORIES = [
  {
    id: 'associacao-de-blocos',
    label: 'Associação de Blocos',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'coreto', label: 'Coreto' },
      { id: 'sebastiana', label: 'Sebastiana' },
    ],
  },
  {
    id: 'batuqueiro',
    label: 'Batuqueiro',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'carnaval-2022-carnaval-2023', label: 'Carnaval 2022 + Carnaval 2023' },
      { id: 'carnaval-2024', label: 'Carnaval 2024' },
      { id: 'carnaval-2025', label: 'Carnaval 2025' },
      { id: 'carnaval-2026', label: 'Carnaval 2026' },
    ],
  },
  {
    id: 'bloco-show',
    label: 'Bloco Show',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'apetrechos', label: 'Apetrechos' },
      { id: 'camisas-producao', label: 'Camisas Produção' },
      { id: 'diversos', label: 'Diversos' },
      { id: 'dominio-site', label: 'Dominio Site' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'gestao', label: 'Gestão' },
      { id: 'globonews', label: 'GloboNews' },
      { id: 'locker', label: 'Locker' },
      { id: 'manutencao', label: 'Manutenção' },
      { id: 'material-de-comunicacao', label: 'Material de Comunicacao' },
      { id: 'saldo-em-conta', label: 'Saldo em conta' },
      { id: 'saldo-temporadas-anteriores', label: 'Saldo Temporadas Anteriores' },
      { id: 'shows-temporada-2021-2022-e-2023', label: 'Shows Temporada 2021, 2022 e 2023' },
      { id: 'shows-temporada-23-24', label: 'Shows Temporada 23-24' },
      { id: 'shows-temporada-24-25', label: 'Shows Temporada 24-25' },
      { id: 'shows-temporada-25-26', label: 'Shows Temporada 25-26' },
      { id: 'singles', label: 'Singles' },
    ],
  },
  {
    id: 'borbulhas-de-amor',
    label: 'Borbulhas de Amor',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'borbulhas-2022', label: 'Borbulhas 2022' },
    ],
  },
  {
    id: 'caixinha',
    label: 'Caixinha',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'caixinha', label: 'Caixinha' },
    ],
  },
  {
    id: 'carnaval-2023',
    label: 'Carnaval 2023',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'ambulancia', label: 'Ambulancia' },
      { id: 'apetrecho', label: 'Apetrecho' },
      { id: 'autorizacao', label: 'Autorização' },
      { id: 'banheiro-quimico', label: 'Banheiro Quimico' },
      { id: 'cache-musicos', label: 'Cache Músicos' },
      { id: 'cache-tecnica', label: 'Cache Técnica' },
      { id: 'camisa', label: 'Camisa' },
      { id: 'carro-pipa', label: 'Carro Pipa' },
      { id: 'comunicacao', label: 'Comunicação' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'dj', label: 'DJ' },
      { id: 'ecad', label: 'ECAD' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'fotografia-e-video', label: 'Fotografia e Video' },
      { id: 'gerador', label: 'Gerador' },
      { id: 'grade', label: 'Grade' },
      { id: 'hidratacao', label: 'Hidratação' },
      { id: 'infraestrutura', label: 'Infraestrutura' },
      { id: 'kit-banheiro', label: 'Kit Banheiro' },
      { id: 'kit-batuqueiro', label: 'Kit Batuqueiro' },
      { id: 'leque-promocional', label: 'Leque Promocional' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'papelaria', label: 'Papelaria' },
      { id: 'producao', label: 'Produção' },
      { id: 'pulseiras', label: 'Pulseiras' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'som', label: 'Som' },
    ],
  },
  {
    id: 'carnaval-2024',
    label: 'Carnaval 2024',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'apetrecho', label: 'Apetrecho' },
      { id: 'autorizacao', label: 'Autorização' },
      { id: 'cache-artistico', label: 'Cache Artístico' },
      { id: 'camisa', label: 'Camisa' },
      { id: 'comunicacao', label: 'Comunicação' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'ecad', label: 'ECAD' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'fotografia-e-video', label: 'Fotografia e Video' },
      { id: 'hidratacao', label: 'Hidratação' },
      { id: 'infraestrutura', label: 'Infraestrutura' },
      { id: 'kit-banheiro', label: 'Kit Banheiro' },
      { id: 'kit-batuqueiro', label: 'Kit Batuqueiro' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'participacao', label: 'Participação' },
      { id: 'producao', label: 'Produção' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'som', label: 'Som' },
    ],
  },
  {
    id: 'carnaval-2025',
    label: 'Carnaval 2025',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'apetrecho', label: 'Apetrecho' },
      { id: 'autorizacao', label: 'Autorização' },
      { id: 'cache-artistico', label: 'Cache Artístico' },
      { id: 'comunicacao', label: 'Comunicação' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'ecad', label: 'ECAD' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'fotografia-e-video', label: 'Fotografia e Video' },
      { id: 'hidratacao', label: 'Hidratação' },
      { id: 'infraestrutura', label: 'Infraestrutura' },
      { id: 'kit-batuqueiro', label: 'Kit Batuqueiro' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'participacao-especial', label: 'Participação Especial' },
      { id: 'producao', label: 'Produção' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'som', label: 'Som' },
    ],
  },
  {
    id: 'carnaval-2026',
    label: 'Carnaval 2026',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'apetrecho', label: 'Apetrecho' },
      { id: 'autorizacao', label: 'Autorização' },
      { id: 'cache-artistico', label: 'Cache Artístico' },
      { id: 'comunicacao', label: 'Comunicação' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'ecad', label: 'ECAD' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'fotografia-e-video', label: 'Fotografia e Video' },
      { id: 'hidratacao', label: 'Hidratação' },
      { id: 'infraestrutura', label: 'Infraestrutura' },
      { id: 'kit-batuqueiro', label: 'Kit Batuqueiro' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'participacao-especial', label: 'Participação Especial' },
      { id: 'producao', label: 'Produção' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'som', label: 'Som' },
    ],
  },
  {
    id: 'carnaval-2027',
    label: 'Carnaval 2027',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'apetrecho', label: 'Apetrecho' },
      { id: 'autorizacao', label: 'Autorização' },
      { id: 'cache-artistico', label: 'Cache Artístico' },
      { id: 'comunicacao', label: 'Comunicação' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'ecad', label: 'ECAD' },
      { id: 'ensaio', label: 'Ensaio' },
      { id: 'fotografia-e-video', label: 'Fotografia e Video' },
      { id: 'hidratacao', label: 'Hidratação' },
      { id: 'infraestrutura', label: 'Infraestrutura' },
      { id: 'kit-batuqueiro', label: 'Kit Batuqueiro' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'participacao-especial', label: 'Participação Especial' },
      { id: 'producao', label: 'Produção' },
      { id: 'seguranca', label: 'Segurança' },
      { id: 'som', label: 'Som' },
    ],
  },
  {
    id: 'carnaval-sp-2023',
    label: 'Carnaval SP 2023',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'alimentacao', label: 'Alimentação' },
      { id: 'cache-musicos', label: 'Cache Músicos' },
      { id: 'cache-tecnica', label: 'Cache Técnica' },
      { id: 'comissao-venda', label: 'Comissão venda' },
      { id: 'decoracao', label: 'Decoração' },
      { id: 'dj', label: 'DJ' },
      { id: 'frete', label: 'Frete' },
      { id: 'mimos', label: 'Mimos' },
      { id: 'papelaria', label: 'Papelaria' },
      { id: 'producao', label: 'Produção' },
      { id: 'transporte', label: 'Transporte' },
    ],
  },
  {
    id: 'emprestimo',
    label: 'Empréstimo',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'valtinho', label: 'Valtinho' },
    ],
  },
  {
    id: 'encontros-bateria',
    label: 'Encontros Bateria',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: '1o-ensaio', label: '1º Ensaio' },
      { id: 'amigo-oculto-2023', label: 'Amigo Oculto 2023' },
      { id: 'arraia-fraldinha-e-paixao', label: 'Arraia Fraldinha e Paixão' },
      { id: 'assembrega-2025', label: 'Assembrega 2025' },
      { id: 'assembrega-2026', label: 'Assembrega 2026' },
      { id: 'bregaarraizainho', label: 'Bregaarraizainho' },
      { id: 'ensaio-desliga-2023', label: 'Ensaio Desliga 2023' },
      { id: 'ensaio-desliga-2025', label: 'Ensaio Desliga 2025' },
      { id: 'fraldinha-e-paixao', label: 'Fraldinha e Paixão' },
      { id: 'furdunco-do-mestre-2023', label: 'Furdunço do mestre 2023' },
      { id: 'furdunco-do-mestre-20234', label: 'Furdunço do mestre 20234' },
      { id: 'lancamento-festival', label: 'Lançamento Festival' },
      { id: 'picnic-2023', label: 'Picnic 2023' },
    ],
  },
  {
    id: 'feira-de-sao-cristovao',
    label: 'Feira de São Cristovao',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'feira-de-sao-cristovao-2022', label: 'Feira de São Cristovao 2022' },
      { id: 'feira-de-sao-cristovao-2023', label: 'Feira de São Cristovao 2023' },
      { id: 'feira-de-sao-cristovao-2024', label: 'Feira de São Cristovao 2024' },
    ],
  },
  {
    id: 'festival',
    label: 'Festival',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'festival-2022', label: 'Festival 2022' },
      { id: 'festival-2023', label: 'Festival 2023' },
      { id: 'festival-2024', label: 'Festival 2024' },
      { id: 'festival-2025', label: 'Festival 2025' },
    ],
  },
  {
    id: 'haja-amor',
    label: 'Haja Amor',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'haja-amor-2024', label: 'Haja Amor 2024' },
    ],
  },
  {
    id: 'investimento',
    label: 'Investimento',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: '2021', label: '2021' },
      { id: '2022', label: '2022' },
      { id: '2023', label: '2023' },
      { id: '2024', label: '2024' },
      { id: '2025', label: '2025' },
      { id: '2026', label: '2026' },
      { id: 'aplicacao', label: 'Aplicacao' },
      { id: 'resgate', label: 'Resgate' },
    ],
  },
  {
    id: 'outros',
    label: 'Outros',
    tipos: ['despesa'],
    subcategorias: [
      { id: 'coroa-de-flores', label: 'Coroa de Flores' },
      { id: 'novo-estandarte', label: 'Novo Estandarte' },
      { id: 'projeto-incentivado', label: 'Projeto Incentivado' },
      { id: 'quadro-estandarte', label: 'Quadro Estandarte' },
    ],
  },
  {
    id: 'patrocinio',
    label: 'Patrocínio',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'carnaval-2023', label: 'Carnaval 2023' },
      { id: 'carnaval-2024', label: 'Carnaval 2024' },
      { id: 'carnaval-2025', label: 'Carnaval 2025' },
      { id: 'carnaval-2026', label: 'Carnaval 2026' },
      { id: 'carnaval-sp-2023', label: 'Carnaval SP 2023' },
    ],
  },
  {
    id: 'solidariedade',
    label: 'Solidariedade',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'apoio-beatriz-peixoto', label: 'Apoio Beatriz Peixoto' },
      { id: 'apoio-bebeto', label: 'Apoio Bebeto' },
      { id: 'cafe-da-manha-carnaval-2024', label: 'Café da manha Carnaval 2024' },
      { id: 'campanha-de-meias', label: 'Campanha de Meias' },
      { id: 'catadores-do-bem', label: 'Catadores do Bem' },
      { id: 'catadores-do-bem-natal-2025', label: 'Catadores do Bem Natal 2025' },
      { id: 'catadores-do-bem-pascoa-2026', label: 'Catadores do Bem Pascoa 2026' },
      { id: 'cozinha-solidaria', label: 'Cozinha Solidária' },
      { id: 'evento-beneficente-rs', label: 'Evento Beneficente RS' },
      { id: 'natal-2023', label: 'Natal 2023' },
      { id: 'sambagabi', label: 'SambaGabi' },
      { id: 'viaduto-literario', label: 'Viaduto Literário' },
      { id: 'vitimas-da-enchente', label: 'Vitimas da Enchente' },
    ],
  },
  {
    id: 'sem-categoria',
    label: 'Sem Categoria',
    tipos: ['despesa', 'receita'],
    subcategorias: [
      { id: 'lucas', label: 'Lucas' },
      { id: 'negao', label: 'Negão' },
      { id: 'pedro', label: 'Pedro' },
    ],
  },
]

export function findCategory(categoryId) {
  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId)
}

export function findSubcategory(categoryId, subcategoryId) {
  const cat = findCategory(categoryId)
  return cat?.subcategorias.find((s) => s.id === subcategoryId)
}

export function categoryLabel(categoryId) {
  return findCategory(categoryId)?.label ?? categoryId
}

export function subcategoryLabel(categoryId, subcategoryId) {
  return findSubcategory(categoryId, subcategoryId)?.label ?? subcategoryId
}

export function categoriesForTipo(tipo) {
  return DEFAULT_CATEGORIES.filter((c) => c.tipos.includes(tipo))
}
