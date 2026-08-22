// Monta a lista de opções (value/label únicos, ordenados) para os dropdowns
// de filtro por coluna (ColumnFilter). `keyFn` extrai o valor de cada linha;
// `labelFn` (opcional) formata o rótulo mostrado — por padrão usa o próprio
// valor. Ordena por `sort`: 'alpha' (padrão, pt-BR) ou 'numeric'.
export function buildOptions(rows, keyFn, { labelFn, sort = 'alpha' } = {}) {
  const byValue = new Map()
  for (const row of rows) {
    const value = keyFn(row)
    if (value === undefined) continue
    if (!byValue.has(value)) {
      byValue.set(value, labelFn ? labelFn(row, value) : String(value))
    }
  }
  const options = Array.from(byValue, ([value, label]) => ({ value, label }))
  if (sort === 'numeric') {
    options.sort((a, b) => Number(a.value) - Number(b.value))
  } else {
    options.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' }))
  }
  return options
}

// Opções de filtro em cascata: a lista de cada coluna (`fields`, uma entrada
// por filtro, com `key`, `keyFn`, `labelFn?`, `sort?` e opcionalmente
// `eligible?` para excluir linhas que não fazem sentido pra essa coluna, ex.:
// subcategoria só entre quem tem subcategoria) considera os OUTROS filtros já
// ativos — assim, marcar uma Categoria já estreita a lista de Subcategoria
// (e qualquer outra coluna) só para o que existe dentro dela, em vez de
// sempre mostrar todas as opções do site inteiro. As opções da própria
// coluna nunca levam em conta a seleção dela mesma — senão, ao marcar uma
// opção, a lista murcharia só pra ela, sem deixar trocar ou adicionar outra.
export function buildCascadingOptions(rows, filters, fields) {
  function matchesExcept(row, exceptKey) {
    return fields.every((f) => {
      if (f.key === exceptKey) return true
      const active = filters[f.key]
      if (!active || active.length === 0) return true
      return active.includes(f.keyFn(row))
    })
  }
  const result = {}
  for (const f of fields) {
    const subset = rows.filter((row) => (!f.eligible || f.eligible(row)) && matchesExcept(row, f.key))
    result[f.key] = buildOptions(subset, f.keyFn, { labelFn: f.labelFn, sort: f.sort })
  }
  return result
}
