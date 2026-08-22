import { useMemo, useState } from 'react'
import Card from '../components/Card'
import CategoryPicker from '../components/CategoryPicker'
import ColumnFilter from '../components/ColumnFilter'
import { useTransactions, useCategories } from '../hooks/useFirestoreData'
import { updateTransaction, bulkUpsertTransactions } from '../lib/firestoreApi'
import { buildCascadingOptions } from '../lib/filterOptions'
import { formatCurrency, formatDate } from '../lib/format'
import { distinctEvents } from '../lib/analytics'

const NONE = '__none__'
const emptyFilters = { data: [], quem: [], motivo: [], categoria: [], subcategoria: [], evento: [], valor: [] }

export default function ReviewQueue() {
  const { transactions, loading } = useTransactions(true)
  const { categories } = useCategories(true)
  const [savingId, setSavingId] = useState(null)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [filters, setFilters] = useState(emptyFilters)

  const pendentesTodos = useMemo(
    () => transactions.filter((t) => !t.revisado).sort((a, b) => (a.data < b.data ? 1 : -1)),
    [transactions],
  )
  const eventos = useMemo(() => distinctEvents(transactions), [transactions])

  function categoryLabelFor(t) {
    const cat = categories.find((c) => c.id === t.categoriaId)
    return cat ? cat.label : t.categoriaId
  }

  function subcategoryLabelFor(t) {
    if (!t.subcategoriaId) return ''
    const cat = categories.find((c) => c.id === t.categoriaId)
    const sub = cat?.subcategorias?.find((s) => s.id === t.subcategoriaId)
    return sub ? sub.label : t.subcategoriaId
  }

  // "Quem" é a contraparte (pra quem você mandou ou de quem você recebeu);
  // "Motivo" é a descrição detalhada do lançamento — colunas separadas,
  // como na planilha original.
  function motivoFor(t) {
    return t.motivoOriginal || t.descricao || ''
  }

  function subcategoriaKeyFor(t) {
    return `${t.categoriaId ?? NONE}::${t.subcategoriaId}`
  }

  // Cada coluna considera os outros filtros já ativos (cascata): marcar uma
  // Categoria já estreita a lista de Subcategoria (e vice-versa, e o mesmo
  // vale entre todas as colunas).
  const filterFields = useMemo(
    () => [
      { key: 'data', keyFn: (t) => t.data, labelFn: (t) => formatDate(t.data) },
      { key: 'quem', keyFn: (t) => t.quem || NONE, labelFn: (t) => t.quem || 'Sem quem' },
      { key: 'motivo', keyFn: (t) => motivoFor(t) || NONE, labelFn: (t) => motivoFor(t) || 'Sem motivo' },
      {
        key: 'categoria',
        keyFn: (t) => t.categoriaId ?? NONE,
        labelFn: (t) => (t.categoriaId ? categoryLabelFor(t) : 'Sem categoria'),
      },
      {
        key: 'subcategoria',
        keyFn: subcategoriaKeyFor,
        labelFn: (t) => `${subcategoryLabelFor(t)} — ${categoryLabelFor(t)}`,
        eligible: (t) => Boolean(t.subcategoriaId),
      },
      { key: 'evento', keyFn: (t) => t.evento || NONE, labelFn: (t) => t.evento || 'Sem evento' },
      { key: 'valor', keyFn: (t) => t.valor, labelFn: (t) => formatCurrency(t.valor), sort: 'numeric' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  )

  const filterOptions = useMemo(
    () => buildCascadingOptions(pendentesTodos, filters, filterFields),
    [pendentesTodos, filters, filterFields],
  )

  const pendentes = useMemo(
    () =>
      pendentesTodos.filter((t) => {
        if (filters.data.length && !filters.data.includes(t.data)) return false
        if (filters.quem.length && !filters.quem.includes(t.quem || NONE)) return false
        if (filters.motivo.length && !filters.motivo.includes(motivoFor(t) || NONE)) return false
        if (filters.categoria.length && !filters.categoria.includes(t.categoriaId ?? NONE)) return false
        if (
          filters.subcategoria.length &&
          (!t.subcategoriaId || !filters.subcategoria.includes(subcategoriaKeyFor(t)))
        )
          return false
        if (filters.evento.length && !filters.evento.includes(t.evento || NONE)) return false
        if (filters.valor.length && !filters.valor.includes(t.valor)) return false
        return true
      }),
    [pendentesTodos, filters],
  )

  const sugeridos = useMemo(
    () => pendentes.filter((t) => t.categoriaId && t.classificacaoAutomatica),
    [pendentes],
  )

  const filtersActive = Object.values(filters).some((v) => v.length > 0)

  async function handleChange(tx, patch) {
    setSavingId(tx.id)
    try {
      await updateTransaction(tx.id, patch)
    } finally {
      setSavingId(null)
    }
  }

  async function handleConfirmAllSuggested() {
    if (sugeridos.length === 0) return
    if (
      !confirm(
        `Confirmar os ${sugeridos.length} lançamento(s) com sugestão automática? Dá uma olhada rápida na lista antes — o que estiver errado, corrija primeiro.`,
      )
    )
      return
    setConfirmingAll(true)
    try {
      await bulkUpsertTransactions(sugeridos.map((t) => ({ id: t.id, revisado: true })))
    } finally {
      setConfirmingAll(false)
    }
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">A revisar</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {pendentes.length} de {pendentesTodos.length} lançamento(s) sem categoria confirmada
            {sugeridos.length > 0 && ` · ${sugeridos.length} já vieram com sugestão automática`}.
          </p>
        </div>
        {sugeridos.length > 0 && (
          <button
            onClick={handleConfirmAllSuggested}
            disabled={confirmingAll}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--status-good)' }}
          >
            {confirmingAll ? 'Confirmando…' : `Confirmar ${sugeridos.length} sugeridos automaticamente`}
          </button>
        )}
      </div>

      {pendentesTodos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilter
            label="Data"
            options={filterOptions.data}
            selected={filters.data}
            onChange={(v) => setFilters((f) => ({ ...f, data: v }))}
          />
          <ColumnFilter
            label="Quem"
            options={filterOptions.quem}
            selected={filters.quem}
            onChange={(v) => setFilters((f) => ({ ...f, quem: v }))}
          />
          <ColumnFilter
            label="Motivo"
            options={filterOptions.motivo}
            selected={filters.motivo}
            onChange={(v) => setFilters((f) => ({ ...f, motivo: v }))}
          />
          <ColumnFilter
            label="Categoria"
            options={filterOptions.categoria}
            selected={filters.categoria}
            onChange={(v) => setFilters((f) => ({ ...f, categoria: v }))}
          />
          <ColumnFilter
            label="Subcategoria"
            options={filterOptions.subcategoria}
            selected={filters.subcategoria}
            onChange={(v) => setFilters((f) => ({ ...f, subcategoria: v }))}
          />
          <ColumnFilter
            label="Evento"
            options={filterOptions.evento}
            selected={filters.evento}
            onChange={(v) => setFilters((f) => ({ ...f, evento: v }))}
          />
          <ColumnFilter
            label="Valor"
            options={filterOptions.valor}
            selected={filters.valor}
            onChange={(v) => setFilters((f) => ({ ...f, valor: v }))}
          />
          {filtersActive && (
            <button
              onClick={() => setFilters(emptyFilters)}
              className="text-xs font-medium underline"
              style={{ color: 'var(--series-2)' }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {pendentesTodos.length === 0 && (
        <Card>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Tudo revisado por aqui. 🎉
          </p>
        </Card>
      )}

      {pendentesTodos.length > 0 && pendentes.length === 0 && (
        <Card>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum lançamento bate com os filtros selecionados.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {pendentes.map((t) => (
          <Card key={t.id}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.quem || '(sem quem)'}</p>
                {motivoFor(t) && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {motivoFor(t)}
                  </p>
                )}
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatDate(t.data)} ·{' '}
                  <span style={{ color: t.tipo === 'receita' ? 'var(--series-1)' : 'var(--series-2)' }}>
                    {formatCurrency(t.valor)}
                  </span>{' '}
                  · {t.origem === 'historico_planilha' ? 'planilha histórica' : 'extrato Nubank'}
                </p>
                <p className="mt-0.5 text-xs">
                  {t.categoriaId && t.classificacaoAutomatica && (
                    <span style={{ color: 'var(--status-good-text)' }}>sugestão automática</span>
                  )}
                  {!t.categoriaId && <span style={{ color: 'var(--status-warning)' }}>sem sugestão</span>}
                </p>
              </div>
              <div className="flex flex-col gap-2 md:w-[420px]">
                <CategoryPicker
                  tipo={t.tipo}
                  categorias={categories}
                  categoriaId={t.categoriaId}
                  subcategoriaId={t.subcategoriaId}
                  onChange={(patch) => handleChange(t, { ...patch, classificacaoAutomatica: false })}
                />
                <div className="flex gap-2">
                  <input
                    list="eventos-list"
                    placeholder="Evento/temporada (opcional)"
                    defaultValue={t.evento ?? ''}
                    onBlur={(e) => handleChange(t, { evento: e.target.value || null })}
                    className="flex-1 rounded-md border bg-transparent px-2.5 py-1.5 text-sm"
                    style={{ borderColor: 'var(--border)' }}
                  />
                  <button
                    disabled={!t.categoriaId || savingId === t.id}
                    onClick={() => handleChange(t, { revisado: true })}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                    style={{ background: 'var(--status-good)' }}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <datalist id="eventos-list">
        {eventos.map((ev) => (
          <option key={ev} value={ev} />
        ))}
      </datalist>
    </div>
  )
}
