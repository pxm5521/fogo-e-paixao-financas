// Sugestão automática de categoria para lançamentos recém-importados do
// extrato. Duas fontes, nessa ordem de prioridade:
//
//  1) Histórico: se você já categorizou antes um lançamento da mesma
//     contraparte ("quem"), reaplica a categoria mais usada para ela. É a
//     fonte mais confiável porque aprende com o que você mesmo já decidiu, e
//     melhora sozinha conforme você revisa mais lançamentos.
//  2) Nome da categoria no texto: se a descrição/motivo do lançamento contém
//     o nome de alguma categoria já cadastrada (ex.: "Alimentação", "Som"),
//     sugere essa categoria. Como suas categorias vieram da sua planilha
//     (Classe/Tipo), muitas já são palavras que aparecem na própria
//     descrição do extrato — por isso não há uma lista de palavras-chave
//     fixa aqui: ela se ajusta sozinha a quaisquer categorias que você tiver.
//
// Em qualquer um dos casos o lançamento entra em "A revisar" já com a
// categoria preenchida — a ideia é só confirmar, não escolher do zero.

function normalize(s) {
  if (!s) return ''
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

// ---------- 1) Índice por contraparte, construído a partir do que você já revisou ----------

export function buildPayeeIndex(transactions) {
  const index = new Map() // key: `${tipo}|${quemNormalizado}` -> Map<comboKey, {categoriaId, subcategoriaId, count, lastDate}>
  for (const t of transactions) {
    if (!t.categoriaId || !t.quem || !t.revisado) continue
    const key = `${t.tipo}|${normalize(t.quem)}`
    if (!key.trim()) continue
    if (!index.has(key)) index.set(key, new Map())
    const combos = index.get(key)
    const comboKey = `${t.categoriaId}|${t.subcategoriaId ?? ''}`
    const entry = combos.get(comboKey) ?? {
      categoriaId: t.categoriaId,
      subcategoriaId: t.subcategoriaId ?? null,
      count: 0,
      lastDate: '',
    }
    entry.count += 1
    if (t.data > entry.lastDate) entry.lastDate = t.data
    combos.set(comboKey, entry)
  }

  // Reduz cada contraparte à combinação mais usada (empate: a mais recente).
  const best = new Map()
  for (const [key, combos] of index) {
    const options = Array.from(combos.values()).sort(
      (a, b) => b.count - a.count || (b.lastDate > a.lastDate ? 1 : -1),
    )
    best.set(key, options[0])
  }
  return best
}

function fromPayeeIndex(row, payeeIndex) {
  const key = `${row.tipo}|${normalize(row.quem)}`
  const match = payeeIndex.get(key)
  if (!match) return null
  return {
    categoriaId: match.categoriaId,
    subcategoriaId: match.subcategoriaId,
    fonte: 'historico',
  }
}

// ---------- 2) Nome da categoria/subcategoria aparecendo no texto do lançamento ----------

// Evita sugerir por categorias genéricas demais (nomes curtos tipo ano
// "2024" ou "Som" batendo em qualquer coisa) — exige um nome com um mínimo
// de caracteres para contar como sinal.
const MIN_LABEL_LENGTH = 4

function fromCategoryNameInText(row, categories) {
  const text = normalize(`${row.motivoOriginal ?? ''} ${row.descricao ?? ''}`)
  if (!text) return null

  const candidatos = categories.filter((c) => c.tipos?.includes(row.tipo))
  let melhor = null
  for (const cat of candidatos) {
    const catLabelNorm = normalize(cat.label)
    if (catLabelNorm.length >= MIN_LABEL_LENGTH && text.includes(catLabelNorm)) {
      // Prioriza o nome de categoria mais longo/específico que aparecer no texto.
      if (!melhor || catLabelNorm.length > melhor.len) {
        melhor = { categoriaId: cat.id, subcategoriaId: null, len: catLabelNorm.length }
      }
      // Se alguma subcategoria dessa categoria também aparecer no texto, é mais específico ainda.
      for (const sub of cat.subcategorias ?? []) {
        const subLabelNorm = normalize(sub.label)
        if (subLabelNorm.length >= MIN_LABEL_LENGTH && text.includes(subLabelNorm)) {
          if (!melhor || subLabelNorm.length + catLabelNorm.length > melhor.len) {
            melhor = { categoriaId: cat.id, subcategoriaId: sub.id, len: subLabelNorm.length + catLabelNorm.length }
          }
        }
      }
    }
  }
  if (!melhor) return null
  return { categoriaId: melhor.categoriaId, subcategoriaId: melhor.subcategoriaId, fonte: 'palavra-chave' }
}

// ---------- API pública ----------

export function suggestCategory(row, payeeIndex, categories) {
  return fromPayeeIndex(row, payeeIndex) ?? fromCategoryNameInText(row, categories) ?? null
}

export function withSuggestions(rows, transactions, categories) {
  const payeeIndex = buildPayeeIndex(transactions)
  return rows.map((row) => {
    const suggestion = suggestCategory(row, payeeIndex, categories)
    if (!suggestion) return row
    return {
      ...row,
      categoriaId: suggestion.categoriaId,
      subcategoriaId: suggestion.subcategoriaId,
      classificacaoAutomatica: true,
      sugestaoFonte: suggestion.fonte,
    }
  })
}
