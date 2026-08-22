import { useMemo, useState } from 'react'
import Card from '../components/Card'
import CategoryPicker from '../components/CategoryPicker'
import ColumnFilter from '../components/ColumnFilter'
import TransactionFormModal from '../components/TransactionFormModal'
import { useTransactions, useCategories } from '../hooks/useFirestoreData'
import { updateTransaction, deleteTransaction } from '../lib/firestoreApi'
import { buildCascadingOptions } from '../lib/filterOptions'
import { distinctEvents } from '../lib/analytics'
import { formatCurrency, formatDate } from '../lib/format'

const selectClass = 'rounded-md border bg-transparent px-2.5 py-1.5 text-sm'
const editInputClass = 'w-full rounded-md border bg-transparent px-2 py-1 text-xs'
const NONE = '__none__'
const EVENTOS_LIST_ID = 'lancamentos-eventos-list'

const emptyFilters = { data: [], quem: [], motivo: [], categoria: [], subcategoria: [], evento: [], valor: [] }

// "Quem" é a contraparte (pra quem você mandou ou de quem você recebeu);
// "Motivo" é a descrição detalhada do lançamento. Vieram como colunas
// separadas (Quem/Motivo) da sua planilha original, e se mantêm separadas
// aqui — `descricao` só existe como texto bruto de fallback (ex.: extratos
// do Nubank importados antes dessa separação existir).
function motivoFor(t) {
  return t.motivoOriginal || t.descricao || ''
}

export default function Transactions() {
  const { transactions, loading } = useTransactions(true)
  const { categories } = useCategories(true)
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [showNew, setShowNew] = useState(false)

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
        labelFn: (t) => subcategoryLabelFor(t),
        eligible: (t) => Boolean(t.subcategoriaId),
      },
      { key: 'evento', keyFn: (t) => t.evento || NONE, labelFn: (t) => t.evento || 'Sem evento' },
      { key: 'valor', keyFn: (t) => t.valor, labelFn: (t) => formatCurrency(t.valor), sort: 'numeric' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categories],
  )

  const filterOptions = useMemo(
    () => buildCascadingOptions(transactions, filters, filterFields),
    [transactions, filters, filterFields],
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (tipo && t.tipo !== tipo) return false
      if (term) {
        const haystack = `${t.quem ?? ''} ${motivoFor(t)} ${t.evento ?? ''}`.toLowerCase()
        if (!haystack.includes(term)) return false
      }
      if (filters.data.length && !filters.data.includes(t.data)) return false
      if (filters.quem.length && !filters.quem.includes(t.quem || NONE)) return false
      if (filters.motivo.length && !filters.motivo.includes(motivoFor(t) || NONE)) return false
      if (filters.categoria.length && !filters.categoria.includes(t.categoriaId ?? NONE)) return false
      if (filters.subcategoria.length && (!t.subcategoriaId || !filters.subcategoria.includes(subcategoriaKeyFor(t))))
        return false
      if (filters.evento.length && !filters.evento.includes(t.evento || NONE)) return false
      if (filters.valor.length && !filters.valor.includes(t.valor)) return false
      return true
    })
  }, [transactions, search, tipo, filters])

  const filtersActive = Object.values(filters).some((v) => v.length > 0)

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Lançamentos</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {filtered.length} de {transactions.length}
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: 'var(--series-1)' }}
        >
          + Novo lançamento
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Buscar por quem, motivo, evento…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`${selectClass} min-w-[240px] flex-1`}
          style={{ borderColor: 'var(--border)' }}
        />
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectClass} style={{ borderColor: 'var(--border)' }}>
          <option value="">Todos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>
        {filtersActive && (
          <button
            onClick={() => setFilters(emptyFilters)}
            className="text-xs font-medium underline"
            style={{ color: 'var(--series-2)' }}
          >
            Limpar filtros de coluna
          </button>
        )}
      </div>

      <Card>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Clique em "Editar" numa linha para alterar direto na tabela.
        </p>
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Data"
                    options={filterOptions.data}
                    selected={filters.data}
                    onChange={(v) => setFilters((f) => ({ ...f, data: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Quem"
                    options={filterOptions.quem}
                    selected={filters.quem}
                    onChange={(v) => setFilters((f) => ({ ...f, quem: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Motivo"
                    options={filterOptions.motivo}
                    selected={filters.motivo}
                    onChange={(v) => setFilters((f) => ({ ...f, motivo: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Categoria"
                    options={filterOptions.categoria}
                    selected={filters.categoria}
                    onChange={(v) => setFilters((f) => ({ ...f, categoria: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Subcategoria"
                    options={filterOptions.subcategoria}
                    selected={filters.subcategoria}
                    onChange={(v) => setFilters((f) => ({ ...f, subcategoria: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2">
                  <ColumnFilter
                    label="Evento"
                    options={filterOptions.evento}
                    selected={filters.evento}
                    onChange={(v) => setFilters((f) => ({ ...f, evento: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2 text-right">
                  <ColumnFilter
                    label="Valor"
                    options={filterOptions.valor}
                    selected={filters.valor}
                    onChange={(v) => setFilters((f) => ({ ...f, valor: v }))}
                  />
                </th>
                <th className="py-1.5 pr-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  categories={categories}
                  categoryLabelFor={categoryLabelFor}
                  subcategoryLabelFor={subcategoryLabelFor}
                />
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              Nenhum lançamento encontrado.
            </p>
          )}
        </div>
      </Card>

      <datalist id={EVENTOS_LIST_ID}>
        {eventos.map((ev) => (
          <option key={ev} value={ev} />
        ))}
      </datalist>

      {showNew && (
        <TransactionFormModal categories={categories} editing={null} onClose={() => setShowNew(false)} />
      )}
    </div>
  )
}

function TransactionRow({ t, categories, categoryLabelFor, subcategoryLabelFor }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit() {
    setForm({
      data: t.data,
      valor: Math.abs(t.valor).toString(),
      tipo: t.tipo,
      quem: t.quem ?? '',
      motivoOriginal: motivoFor(t),
      categoriaId: t.categoriaId,
      subcategoriaId: t.subcategoriaId,
      evento: t.evento ?? '',
    })
    setError('')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setError('')
  }

  async function save() {
    const valorNum = Number(String(form.valor).replace(',', '.'))
    if (!form.data || Number.isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha data e um valor válido (maior que zero).')
      return
    }
    setSaving(true)
    try {
      await updateTransaction(t.id, {
        data: form.data,
        valor: form.tipo === 'receita' ? Math.abs(valorNum) : -Math.abs(valorNum),
        tipo: form.tipo,
        quem: form.quem || null,
        motivoOriginal: form.motivoOriginal || null,
        categoriaId: form.categoriaId,
        subcategoriaId: form.subcategoriaId,
        evento: form.evento || null,
        revisado: Boolean(form.categoriaId),
      })
      setEditing(false)
      setForm(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Excluir o lançamento "${motivoFor(t) || t.quem || 'sem descrição'}" de ${formatCurrency(t.valor)}? Essa ação não pode ser desfeita.`,
      )
    )
      return
    setSaving(true)
    try {
      await deleteTransaction(t.id)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <tr className="border-t align-top" style={{ borderColor: 'var(--gridline)' }}>
        <td className="py-1.5 pr-2">
          <input
            type="date"
            value={form.data}
            onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-2">
          <input
            type="text"
            placeholder="Quem"
            value={form.quem}
            onChange={(e) => setForm((f) => ({ ...f, quem: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-2">
          <input
            type="text"
            placeholder="Motivo"
            value={form.motivoOriginal}
            onChange={(e) => setForm((f) => ({ ...f, motivoOriginal: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-2" colSpan={2}>
          <CategoryPicker
            tipo={form.tipo}
            categorias={categories}
            categoriaId={form.categoriaId}
            subcategoriaId={form.subcategoriaId}
            onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
          />
        </td>
        <td className="py-1.5 pr-2">
          <input
            type="text"
            list={EVENTOS_LIST_ID}
            placeholder="Evento"
            value={form.evento}
            onChange={(e) => setForm((f) => ({ ...f, evento: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-2">
          <div className="flex items-center gap-1">
            <select
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo: e.target.value, categoriaId: null, subcategoriaId: null }))
              }
              className="rounded-md border bg-transparent px-1 py-1 text-xs"
              style={{ borderColor: 'var(--border)' }}
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              className={`${editInputClass} w-20 text-right`}
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </td>
        <td className="py-1.5 pr-2">
          <div className="flex flex-col items-end gap-1">
            <div className="flex justify-end gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="text-xs font-medium disabled:opacity-50"
                style={{ color: 'var(--series-1)' }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="text-xs disabled:opacity-50"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
            {error && (
              <p className="text-right text-xs" style={{ color: 'var(--status-critical)' }}>
                {error}
              </p>
            )}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t" style={{ borderColor: 'var(--gridline)' }}>
      <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(t.data)}</td>
      <td className="py-1.5 pr-2" style={{ color: 'var(--text-secondary)' }}>
        {t.quem || '—'}
      </td>
      <td className="py-1.5 pr-2" style={{ color: 'var(--text-secondary)' }}>
        {motivoFor(t) || '—'}
      </td>
      <td className="py-1.5 pr-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {t.categoriaId ? (
          categoryLabelFor(t)
        ) : (
          <span style={{ color: 'var(--status-warning)' }}>sem categoria</span>
        )}
      </td>
      <td className="py-1.5 pr-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {subcategoryLabelFor(t)}
      </td>
      <td className="py-1.5 pr-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {t.evento || ''}
      </td>
      <td
        className="py-1.5 pr-2 text-right tabular-nums whitespace-nowrap"
        style={{ color: t.tipo === 'receita' ? 'var(--series-1)' : 'var(--series-2)' }}
      >
        {formatCurrency(t.valor)}
      </td>
      <td className="py-1.5 pr-2 text-right whitespace-nowrap">
        <div className="flex justify-end gap-2">
          <button onClick={startEdit} className="text-xs font-medium" style={{ color: 'var(--series-1)' }}>
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-xs font-medium disabled:opacity-50"
            style={{ color: 'var(--status-critical)' }}
          >
            {saving ? '…' : 'Excluir'}
          </button>
        </div>
      </td>
    </tr>
  )
}
