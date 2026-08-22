import { useState } from 'react'
import CategoryPicker from './CategoryPicker'
import { createTransaction, updateTransaction, deleteTransaction } from '../lib/firestoreApi'

const inputClass = 'w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm'

function emptyForm() {
  return {
    data: new Date().toISOString().slice(0, 10),
    valor: '',
    tipo: 'despesa',
    quem: '',
    motivoOriginal: '',
    categoriaId: null,
    subcategoriaId: null,
    evento: '',
  }
}

export default function TransactionFormModal({ categories, editing, onClose }) {
  const [form, setForm] = useState(() =>
    editing
      ? { ...editing, valor: Math.abs(editing.valor).toString() }
      : emptyForm(),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const valorNum = Number(String(form.valor).replace(',', '.'))
    if (!form.data || Number.isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha data e um valor válido (maior que zero).')
      return
    }
    const payload = {
      data: form.data,
      valor: form.tipo === 'receita' ? Math.abs(valorNum) : -Math.abs(valorNum),
      tipo: form.tipo,
      quem: form.quem || null,
      motivoOriginal: form.motivoOriginal || null,
      categoriaId: form.categoriaId,
      subcategoriaId: form.subcategoriaId,
      evento: form.evento || null,
      origem: editing?.origem ?? 'manual',
      classificacaoAutomatica: false,
      revisado: Boolean(form.categoriaId),
    }
    setSaving(true)
    try {
      if (editing) await updateTransaction(editing.id, payload)
      else await createTransaction(payload)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing) return
    if (!confirm('Excluir este lançamento?')) return
    setSaving(true)
    try {
      await deleteTransaction(editing.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border p-5 shadow-lg"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        <h2 className="mb-4 text-sm font-semibold">
          {editing ? 'Editar lançamento' : 'Novo lançamento manual'}
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            {['receita', 'despesa'].map((tipo) => (
              <button
                type="button"
                key={tipo}
                onClick={() => setForm((f) => ({ ...f, tipo, categoriaId: null, subcategoriaId: null }))}
                className="flex-1 rounded-md border px-3 py-1.5 text-sm font-medium capitalize"
                style={{
                  borderColor: 'var(--border)',
                  background: form.tipo === tipo ? (tipo === 'receita' ? 'var(--series-1)' : 'var(--series-2)') : 'transparent',
                  color: form.tipo === tipo ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tipo}
              </button>
            ))}
          </div>

          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Data
            <input
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Valor (R$)
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Quem (pessoa/empresa)
            <input
              type="text"
              value={form.quem ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, quem: e.target.value }))}
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Motivo (descrição detalhada)
            <input
              type="text"
              value={form.motivoOriginal ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, motivoOriginal: e.target.value }))}
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>

          <div>
            <p className="mb-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Categoria
            </p>
            <CategoryPicker
              tipo={form.tipo}
              categorias={categories}
              categoriaId={form.categoriaId}
              subcategoriaId={form.subcategoriaId}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
          </div>

          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Evento/temporada (opcional)
            <input
              type="text"
              value={form.evento ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, evento: e.target.value }))}
              className={inputClass}
              style={{ borderColor: 'var(--border)' }}
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm" style={{ color: 'var(--status-critical)' }}>{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          <div>
            {editing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="text-sm font-medium"
                style={{ color: 'var(--status-critical)' }}
              >
                Excluir
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--series-1)' }}
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
