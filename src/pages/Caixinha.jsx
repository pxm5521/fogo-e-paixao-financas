import { useMemo, useState } from 'react'
import Card from '../components/Card'
import DateInput from '../components/DateInput'
import StatCard from '../components/StatCard'
import { useCaixinhaMovimentos, useCaixinhaSaldos } from '../hooks/useFirestoreData'
import {
  createCaixinhaMovimento,
  updateCaixinhaMovimento,
  deleteCaixinhaMovimento,
  upsertCaixinhaSaldo,
  deleteCaixinhaSaldo,
} from '../lib/firestoreApi'
import { caixinhaResumoMensal } from '../lib/analytics'
import { formatCurrency, formatDate } from '../lib/format'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const inputClass = 'rounded-md border bg-transparent px-2.5 py-1.5 text-sm'
const editInputClass = 'w-full rounded-md border bg-transparent px-2 py-1 text-xs'

function parseValor(raw) {
  return Number(String(raw).replace(',', '.'))
}

export default function Caixinha() {
  const { movimentos, loading: loadingMovimentos } = useCaixinhaMovimentos(true)
  const { saldos, loading: loadingSaldos } = useCaixinhaSaldos(true)

  const resumoMensal = useMemo(
    () => caixinhaResumoMensal(movimentos, saldos),
    [movimentos, saldos],
  )
  const resumoMensalDesc = useMemo(() => [...resumoMensal].reverse(), [resumoMensal])

  const totalAportes = useMemo(
    () => movimentos.filter((m) => m.tipo === 'aporte').reduce((sum, m) => sum + Math.abs(m.valor), 0),
    [movimentos],
  )
  const totalSaques = useMemo(
    () => movimentos.filter((m) => m.tipo === 'saque').reduce((sum, m) => sum + Math.abs(m.valor), 0),
    [movimentos],
  )
  const saldosOrdenados = useMemo(
    () => [...saldos].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes)),
    [saldos],
  )
  const saldoAtual = saldosOrdenados[saldosOrdenados.length - 1]

  if (loadingMovimentos || loadingSaldos) {
    return <p style={{ color: 'var(--text-secondary)' }}>Carregando…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Caixinha</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Aportes, saques e saldo mensal dos investimentos do bloco — registro separado, não usa a
          categoria Investimento dos Lançamentos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={saldoAtual ? `Saldo atual (${MESES[saldoAtual.mes - 1]}/${saldoAtual.ano})` : 'Saldo atual'}
          value={saldoAtual ? saldoAtual.saldo : 0}
        />
        <StatCard label="Total de aportes" value={totalAportes} tone="good" />
        <StatCard label="Total de saques" value={totalSaques} />
      </div>

      <Card title="Resumo mensal">
        {resumoMensalDesc.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum aporte, saque ou saldo registrado ainda.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              A coluna Rendimento é calculada automaticamente: a diferença entre o saldo do mês e o
              saldo do checkpoint anterior, descontando os aportes e saques do meio do caminho. Fica em
              branco quando ainda não há dois saldos pra comparar.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                    <th className="py-1.5 pr-3">Mês</th>
                    <th className="py-1.5 pr-3 text-right whitespace-nowrap">Aportes</th>
                    <th className="py-1.5 pr-3 text-right whitespace-nowrap">Saques</th>
                    <th className="py-1.5 pr-3 text-right whitespace-nowrap">Saldo</th>
                    <th className="py-1.5 pl-3 text-right whitespace-nowrap">Rendimento</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoMensalDesc.map((linha) => (
                    <tr key={`${linha.ano}-${linha.mes}`} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {MESES[linha.mes - 1]}/{linha.ano}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                        {linha.aportes ? (
                          <span style={{ color: 'var(--series-1)' }}>{formatCurrency(linha.aportes)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                        {linha.saques ? (
                          <span style={{ color: 'var(--series-2)' }}>{formatCurrency(linha.saques)}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {linha.saldo != null ? (
                          formatCurrency(linha.saldo)
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="py-1.5 pl-3 text-right tabular-nums whitespace-nowrap">
                        {linha.rendimento != null ? (
                          <span style={{ color: linha.rendimento < 0 ? 'var(--series-2)' : 'var(--series-1)' }}>
                            {formatCurrency(linha.rendimento)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      <SaldosCard saldosOrdenados={saldosOrdenados} />

      <MovimentosCard movimentos={movimentos} />
    </div>
  )
}

function SaldosCard({ saldosOrdenados }) {
  const now = new Date()
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ ano: String(now.getFullYear()), mes: String(now.getMonth() + 1), saldo: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit(s) {
    setEditingId(s.id)
    setForm({ ano: String(s.ano), mes: String(s.mes), saldo: String(s.saldo).replace('.', ',') })
    setError('')
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ ano: String(now.getFullYear()), mes: String(now.getMonth() + 1), saldo: '' })
    setError('')
  }

  async function handleSave() {
    const ano = Number(form.ano)
    const mes = Number(form.mes)
    const saldo = parseValor(form.saldo)
    if (!ano || !mes || mes < 1 || mes > 12 || Number.isNaN(saldo)) {
      setError('Preencha ano, mês e um saldo válido.')
      return
    }
    setSaving(true)
    try {
      await upsertCaixinhaSaldo(ano, mes, saldo)
      cancelEdit()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Remover o saldo registrado de ${MESES[s.mes - 1]}/${s.ano} (${formatCurrency(s.saldo)})?`)) return
    await deleteCaixinhaSaldo(s.id)
    if (editingId === s.id) cancelEdit()
  }

  return (
    <Card title="Saldo no final do mês">
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Um saldo por mês — salvar de novo o mesmo mês atualiza o valor, não duplica.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Ano
          <input
            type="number"
            value={form.ano}
            onChange={(e) => setForm((f) => ({ ...f, ano: e.target.value }))}
            className={`${inputClass} w-24`}
            style={{ borderColor: 'var(--border)' }}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Mês
          <select
            value={form.mes}
            onChange={(e) => setForm((f) => ({ ...f, mes: e.target.value }))}
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
          >
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Saldo
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.saldo}
            onChange={(e) => setForm((f) => ({ ...f, saldo: e.target.value }))}
            className={`${inputClass} w-32 text-right`}
            style={{ borderColor: 'var(--border)' }}
          />
        </label>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--series-1)' }}
        >
          {saving ? 'Salvando…' : editingId ? 'Atualizar saldo' : 'Salvar saldo do mês'}
        </button>
        {editingId && (
          <button onClick={cancelEdit} className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
        )}
      </div>
      {error && (
        <p className="mb-3 text-xs" style={{ color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}
      {saldosOrdenados.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhum saldo registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                <th className="py-1.5 pr-3">Mês</th>
                <th className="py-1.5 pr-3 text-right whitespace-nowrap">Saldo</th>
                <th className="py-1.5 pl-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {[...saldosOrdenados].reverse().map((s) => (
                <tr key={s.id} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    {MESES[s.mes - 1]}/{s.ano}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                    {formatCurrency(s.saldo)}
                  </td>
                  <td className="py-1.5 pl-3 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(s)} className="text-xs font-medium" style={{ color: 'var(--series-1)' }}>
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="text-xs font-medium"
                        style={{ color: 'var(--status-critical)' }}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function MovimentosCard({ movimentos }) {
  const [showNew, setShowNew] = useState(false)

  const totalAportes = useMemo(
    () => movimentos.filter((m) => m.tipo === 'aporte').reduce((sum, m) => sum + Math.abs(m.valor), 0),
    [movimentos],
  )
  const totalSaques = useMemo(
    () => movimentos.filter((m) => m.tipo === 'saque').reduce((sum, m) => sum + Math.abs(m.valor), 0),
    [movimentos],
  )

  return (
    <Card
      title="Aportes e saques"
      action={
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: 'var(--series-1)' }}
        >
          + Novo movimento
        </button>
      }
    >
      {movimentos.length === 0 && !showNew ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhum aporte ou saque registrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                <th className="py-1.5 pr-3">Data</th>
                <th className="py-1.5 pr-3">Tipo</th>
                <th className="py-1.5 pr-3 text-right whitespace-nowrap">Valor</th>
                <th className="py-1.5 pr-3">Observação</th>
                <th className="py-1.5 pl-3 text-right whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {showNew && <NovoMovimentoRow onClose={() => setShowNew(false)} />}
              {movimentos.map((m) => (
                <MovimentoRow key={m.id} m={m} />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                <td className="py-1.5 pr-3 font-medium" colSpan={2}>
                  Total ({movimentos.length} movimento{movimentos.length === 1 ? '' : 's'})
                </td>
                <td className="py-1.5 pr-3 text-right font-semibold tabular-nums whitespace-nowrap">
                  <span style={{ color: 'var(--series-1)' }}>{formatCurrency(totalAportes)}</span>
                  {' / '}
                  <span style={{ color: 'var(--series-2)' }}>{formatCurrency(totalSaques)}</span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  )
}

function NovoMovimentoRow({ onClose }) {
  const [form, setForm] = useState({ data: '', tipo: 'aporte', valor: '', observacao: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    const valorNum = parseValor(form.valor)
    if (!form.data || Number.isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha data e um valor válido (maior que zero).')
      return
    }
    setSaving(true)
    try {
      await createCaixinhaMovimento({
        data: form.data,
        tipo: form.tipo,
        valor: Math.abs(valorNum),
        observacao: form.observacao || null,
      })
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-t align-top" style={{ borderColor: 'var(--gridline)' }}>
      <td className="py-1.5 pr-3">
        <DateInput
          value={form.data}
          onChange={(iso) => setForm((f) => ({ ...f, data: iso }))}
          className={editInputClass}
          style={{ borderColor: 'var(--border)' }}
        />
      </td>
      <td className="py-1.5 pr-3">
        <select
          value={form.tipo}
          onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
          className={editInputClass}
          style={{ borderColor: 'var(--border)' }}
        >
          <option value="aporte">Aporte</option>
          <option value="saque">Saque</option>
        </select>
      </td>
      <td className="py-1.5 pr-3">
        <input
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={form.valor}
          onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
          className={`${editInputClass} text-right`}
          style={{ borderColor: 'var(--border)' }}
        />
      </td>
      <td className="py-1.5 pr-3">
        <input
          type="text"
          placeholder="Observação (opcional)"
          value={form.observacao}
          onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
          className={editInputClass}
          style={{ borderColor: 'var(--border)' }}
        />
      </td>
      <td className="py-1.5 pl-3">
        <div className="flex flex-col items-end gap-1">
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-medium disabled:opacity-50"
              style={{ color: 'var(--series-1)' }}
            >
              {saving ? 'Salvando…' : 'Adicionar'}
            </button>
            <button onClick={onClose} disabled={saving} className="text-xs disabled:opacity-50" style={{ color: 'var(--text-secondary)' }}>
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

function MovimentoRow({ m }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function startEdit() {
    setForm({
      data: m.data,
      tipo: m.tipo,
      valor: Math.abs(m.valor).toString().replace('.', ','),
      observacao: m.observacao ?? '',
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
    const valorNum = parseValor(form.valor)
    if (!form.data || Number.isNaN(valorNum) || valorNum <= 0) {
      setError('Preencha data e um valor válido (maior que zero).')
      return
    }
    setSaving(true)
    try {
      await updateCaixinhaMovimento(m.id, {
        data: form.data,
        tipo: form.tipo,
        valor: Math.abs(valorNum),
        observacao: form.observacao || null,
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
    if (!confirm(`Excluir esse ${m.tipo === 'aporte' ? 'aporte' : 'saque'} de ${formatCurrency(Math.abs(m.valor))} em ${formatDate(m.data)}? Essa ação não pode ser desfeita.`))
      return
    setSaving(true)
    try {
      await deleteCaixinhaMovimento(m.id)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <tr className="border-t align-top" style={{ borderColor: 'var(--gridline)' }}>
        <td className="py-1.5 pr-3">
          <DateInput
            value={form.data}
            onChange={(iso) => setForm((f) => ({ ...f, data: iso }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-3">
          <select
            value={form.tipo}
            onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="aporte">Aporte</option>
            <option value="saque">Saque</option>
          </select>
        </td>
        <td className="py-1.5 pr-3">
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={form.valor}
            onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
            className={`${editInputClass} text-right`}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pr-3">
          <input
            type="text"
            placeholder="Observação (opcional)"
            value={form.observacao}
            onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
            className={editInputClass}
            style={{ borderColor: 'var(--border)' }}
          />
        </td>
        <td className="py-1.5 pl-3">
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
              <button onClick={cancelEdit} disabled={saving} className="text-xs disabled:opacity-50" style={{ color: 'var(--text-secondary)' }}>
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
      <td className="py-1.5 pr-3 whitespace-nowrap">{formatDate(m.data)}</td>
      <td className="py-1.5 pr-3">
        <span style={{ color: m.tipo === 'aporte' ? 'var(--series-1)' : 'var(--series-2)' }}>
          {m.tipo === 'aporte' ? 'Aporte' : 'Saque'}
        </span>
      </td>
      <td
        className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap"
        style={{ color: m.tipo === 'aporte' ? 'var(--series-1)' : 'var(--series-2)' }}
      >
        {formatCurrency(Math.abs(m.valor))}
      </td>
      <td className="py-1.5 pr-3" style={{ color: 'var(--text-secondary)' }}>
        {m.observacao || '—'}
      </td>
      <td className="py-1.5 pl-3 text-right whitespace-nowrap">
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
