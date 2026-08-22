export function formatCurrency(value) {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-')
  return `${d}/${m}/${y}`
}

export function monthLabel(isoMonth) {
  // isoMonth: "2025-02"
  const [y, m] = isoMonth.split('-').map(Number)
  const date = new Date(y, m - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function toMonthKey(isoDate) {
  return isoDate?.slice(0, 7)
}
