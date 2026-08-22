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
