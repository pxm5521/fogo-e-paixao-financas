import { toMonthKey } from './format'

export function filterTransactions(transactions, { from, to, evento, categoriaId, anos, meses } = {}) {
  return transactions.filter((t) => {
    if (from && t.data < from) return false
    if (to && t.data > to) return false
    if (evento && t.evento !== evento) return false
    if (categoriaId && t.categoriaId !== categoriaId) return false
    if (anos && anos.length && !anos.includes(Number((t.data || '').slice(0, 4)))) return false
    if (meses && meses.length && !meses.includes(Number((t.data || '').slice(5, 7)))) return false
    return true
  })
}

export function totals(transactions) {
  let receitas = 0
  let despesas = 0
  for (const t of transactions) {
    if (t.tipo === 'receita') receitas += t.valor
    else despesas += Math.abs(t.valor)
  }
  return { receitas, despesas, saldo: receitas - despesas }
}

// Lançamentos da categoria Investimento com Motivo "Rendimento" não entram
// como receita nem despesa aqui — viram uma série própria
// (`investimentoRendimento`, mantendo o sinal: um mês de rendimento negativo
// fica negativo), pra não misturar rendimento de aplicação com o
// receita/despesa operacional do bloco no gráfico mensal.
function isInvestimentoRendimento(t) {
  return t.categoriaId === 'investimento' && normalizeLabel(t.motivoOriginal || t.descricao || '') === 'rendimento'
}

export function monthlySeries(transactions) {
  const map = new Map()
  for (const t of transactions) {
    const key = toMonthKey(t.data)
    if (!key) continue
    if (!map.has(key)) map.set(key, { mes: key, receitas: 0, despesas: 0, investimentoRendimento: 0 })
    const bucket = map.get(key)
    if (isInvestimentoRendimento(t)) bucket.investimentoRendimento += t.valor
    else if (t.tipo === 'receita') bucket.receitas += t.valor
    else bucket.despesas += Math.abs(t.valor)
  }
  return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes))
}

export function accumulatedBalance(transactions, saldoInicial = 0) {
  const series = monthlySeries(transactions)
  let acumulado = saldoInicial
  return series.map((m) => {
    // O rendimento de investimento continua contando no saldo real da conta
    // — só não entra nas barras de receita/despesa do gráfico mensal.
    acumulado += m.receitas - m.despesas + m.investimentoRendimento
    return { mes: m.mes, saldo: acumulado }
  })
}

export function byCategory(transactions, tipo, categories) {
  const map = new Map()
  for (const t of transactions) {
    if (t.tipo !== tipo) continue
    const key = t.categoriaId || '__sem_categoria__'
    map.set(key, (map.get(key) ?? 0) + Math.abs(t.valor))
  }
  const labelFor = (id) =>
    id === '__sem_categoria__' ? 'Sem categoria' : categories.find((c) => c.id === id)?.label || id
  return Array.from(map.entries())
    .map(([categoriaId, valor]) => ({ categoriaId, label: labelFor(categoriaId), valor }))
    .sort((a, b) => b.valor - a.valor)
}

// Tabela em 3 níveis (Categoria > Subcategoria > Motivo) com Despesa, Receita
// e Total (receita - despesa) em cada nível — pensada pra tabela expansível
// do Resumo, onde clicar na categoria abre as subcategorias e clicar na
// subcategoria abre os motivos. Ordena tudo em ordem alfabética (pt-BR),
// igual ao resto do site.
export function categoryDrilldown(transactions, categories) {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const SEM_CATEGORIA = '__sem_categoria__'
  const SEM_SUBCATEGORIA = '__sem_subcategoria__'

  const cats = new Map() // categoriaId -> { id, label, despesa, receita, subs: Map }

  function addValor(bucket, t) {
    if (t.tipo === 'receita') bucket.receita += t.valor
    else bucket.despesa += Math.abs(t.valor)
  }

  for (const t of transactions) {
    const catId = t.categoriaId || SEM_CATEGORIA
    if (!cats.has(catId)) {
      cats.set(catId, {
        id: catId,
        label: catId === SEM_CATEGORIA ? 'Sem categoria' : catMap.get(catId)?.label || catId,
        despesa: 0,
        receita: 0,
        subs: new Map(),
      })
    }
    const cat = cats.get(catId)
    addValor(cat, t)

    const subId = t.subcategoriaId || SEM_SUBCATEGORIA
    if (!cat.subs.has(subId)) {
      const catDef = catMap.get(catId)
      const subDef = catDef?.subcategorias?.find((s) => s.id === subId)
      cat.subs.set(subId, {
        id: subId,
        label: subId === SEM_SUBCATEGORIA ? 'Sem subcategoria' : subDef?.label || subId,
        despesa: 0,
        receita: 0,
        motivos: new Map(),
      })
    }
    const sub = cat.subs.get(subId)
    addValor(sub, t)

    const motivoLabel = t.motivoOriginal || t.descricao || ''
    const motivoKey = motivoLabel || '__sem_motivo__'
    if (!sub.motivos.has(motivoKey)) {
      sub.motivos.set(motivoKey, { label: motivoLabel || 'Sem motivo', despesa: 0, receita: 0 })
    }
    addValor(sub.motivos.get(motivoKey), t)
  }

  const byLabel = (a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })

  const rows = Array.from(cats.values())
    .map((cat) => ({
      id: cat.id,
      label: cat.label,
      despesa: cat.despesa,
      receita: cat.receita,
      total: cat.receita - cat.despesa,
      subcategorias: Array.from(cat.subs.values())
        .map((sub) => ({
          id: sub.id,
          label: sub.label,
          despesa: sub.despesa,
          receita: sub.receita,
          total: sub.receita - sub.despesa,
          motivos: Array.from(sub.motivos.values())
            .map((m) => ({ ...m, total: m.receita - m.despesa }))
            .sort(byLabel),
        }))
        .sort(byLabel),
    }))
    .sort(byLabel)

  const totals = rows.reduce(
    (acc, r) => ({ despesa: acc.despesa + r.despesa, receita: acc.receita + r.receita }),
    { despesa: 0, receita: 0 },
  )

  return { rows, totals: { ...totals, total: totals.receita - totals.despesa } }
}

export function distinctEvents(transactions) {
  const set = new Set()
  for (const t of transactions) if (t.evento) set.add(t.evento)
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

export function normalizeLabel(s) {
  if (!s) return ''
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// Tabela comparativa: uma categoria por coluna (pelas `categoryLabels`
// pedidas, na ordem dada — só entram as que existem em `categories`), uma
// subcategoria por linha. Quando a mesma subcategoria (mesmo nome, ignorando
// maiúscula/acento) aparece em mais de uma dessas categorias, vira uma linha
// só, com o valor de cada categoria na coluna correspondente. Sempre usa
// TODOS os lançamentos passados (não aplica período/evento) — o objetivo é
// comparar as categorias inteiras entre si, não um recorte de data.
export function subcategoriaPivot(transactions, categories, categoryLabels, { tipo = 'despesa' } = {}) {
  const columns = categoryLabels
    .map((label) => categories.find((c) => c.label === label))
    .filter(Boolean)
    .map((c) => ({ categoriaId: c.id, label: c.label }))
  const columnIds = new Set(columns.map((c) => c.categoriaId))

  const rowsByKey = new Map() // chave normalizada -> { label, valores: {categoriaId: valor} }
  for (const t of transactions) {
    if (t.tipo !== tipo) continue
    if (!columnIds.has(t.categoriaId)) continue
    const cat = categories.find((c) => c.id === t.categoriaId)
    const sub = cat?.subcategorias?.find((s) => s.id === t.subcategoriaId)
    const label = sub ? sub.label : 'Sem subcategoria'
    const key = normalizeLabel(label)
    if (!rowsByKey.has(key)) rowsByKey.set(key, { label, valores: {} })
    const row = rowsByKey.get(key)
    row.valores[t.categoriaId] = (row.valores[t.categoriaId] ?? 0) + Math.abs(t.valor)
  }

  const rows = Array.from(rowsByKey.values())
    .map((row) => ({
      ...row,
      total: columns.reduce((sum, c) => sum + (row.valores[c.categoriaId] ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)

  const totaisPorColuna = {}
  let totalGeral = 0
  for (const c of columns) {
    totaisPorColuna[c.categoriaId] = rows.reduce((sum, r) => sum + (r.valores[c.categoriaId] ?? 0), 0)
    totalGeral += totaisPorColuna[c.categoriaId]
  }

  return { columns, rows, totaisPorColuna, totalGeral }
}

function extractYears(label) {
  const matches = String(label || '').match(/\d{4}/g)
  return matches ? matches.map(Number) : []
}

// Uma linha extra, de uma categoria inteira (não subdividida por
// subcategoria), alinhada às mesmas colunas de temporada de `subcategoriaPivot`
// (`yearColumns`, com o ano identificado a partir do texto de cada label).
// Serve para categorias como Patrocínio/Batuqueiro, que já têm uma
// subcategoria por temporada (ex.: "Carnaval 2023", "Carnaval 2022 +
// Carnaval 2023") mas cujo valor relevante normalmente é receita, não
// despesa — por isso o tipo é configurável e default para 'receita'.
export function categoryYearRow(transactions, categories, categoryId, yearColumns, { tipo = 'receita' } = {}) {
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null

  const colByYear = new Map()
  for (const col of yearColumns) {
    for (const y of extractYears(col.label)) colByYear.set(y, col.categoriaId)
  }

  const subToCol = new Map()
  for (const sub of cat.subcategorias || []) {
    for (const y of extractYears(sub.label)) {
      if (colByYear.has(y)) subToCol.set(sub.id, colByYear.get(y))
    }
  }

  const valores = {}
  let total = 0
  for (const t of transactions) {
    if (t.tipo !== tipo || t.categoriaId !== categoryId) continue
    const colId = subToCol.get(t.subcategoriaId)
    if (!colId) continue
    const v = Math.abs(t.valor)
    valores[colId] = (valores[colId] ?? 0) + v
    total += v
  }

  return { categoriaId: cat.id, label: cat.label, valores, total }
}

// Tabela mês (linha) x ano (coluna) de "Rendimento": soma, com sinal (um mês
// de rendimento negativo aparece negativo), todo lançamento cujo Motivo seja
// exatamente "Rendimento" (ignorando maiúscula/acento) — em qualquer
// categoria. Os anos das colunas saem dos próprios lançamentos encontrados
// (não é uma lista fixa), então cobre qualquer categoria marcada assim, não
// só Investimento.
export function rendimentoMensalPivot(transactions) {
  const porMes = new Map() // mes (1-12) -> { ano: valor }
  const anosSet = new Set()

  for (const t of transactions) {
    if (normalizeLabel(t.motivoOriginal || t.descricao || '') !== 'rendimento') continue
    const [anoStr, mesStr] = (t.data || '').split('-')
    const ano = Number(anoStr)
    const mes = Number(mesStr)
    if (!ano || !mes) continue
    anosSet.add(ano)
    if (!porMes.has(mes)) porMes.set(mes, {})
    const bucket = porMes.get(mes)
    bucket[ano] = (bucket[ano] ?? 0) + t.valor
  }

  const anos = Array.from(anosSet).sort((a, b) => a - b)
  const totalPorAno = {}
  for (const ano of anos) totalPorAno[ano] = 0
  let totalGeral = 0

  const linhas = Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
    const valoresMes = porMes.get(mes) ?? {}
    let totalMes = 0
    for (const ano of anos) {
      const v = valoresMes[ano] ?? 0
      totalMes += v
      totalPorAno[ano] += v
    }
    totalGeral += totalMes
    return { mes, valores: valoresMes, total: totalMes }
  })

  return { anos, linhas, totalPorAno, totalGeral }
}
