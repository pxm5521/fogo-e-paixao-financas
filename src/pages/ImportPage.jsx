import { useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import CategoryPicker from '../components/CategoryPicker'
import { useTransactions, useCategories } from '../hooks/useFirestoreData'
import { parseNubankCsv, flagPossibleDuplicates } from '../lib/csvImport'
import { withSuggestions } from '../lib/autoClassify'
import { bulkUpsertTransactions } from '../lib/firestoreApi'
import { formatCurrency, formatDate } from '../lib/format'

export default function ImportPage() {
  const { transactions } = useTransactions(true)
  const { categories } = useCategories(true)
  const [rows, setRows] = useState(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [selected, setSelected] = useState({})
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)

  const lastImportedDate = transactions.reduce((max, t) => (t.data > max ? t.data : max), '')

  function handleFile(file) {
    setError('')
    setDone(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const result = parseNubankCsv(String(reader.result))
      if (!result.ok) {
        setError(result.error)
        setRows(null)
        return
      }
      const suggested = withSuggestions(result.rows, transactions, categories)
      const flagged = flagPossibleDuplicates(suggested, transactions)
      setRows(flagged)
      const initialSelection = {}
      for (const r of flagged) initialSelection[r.id] = !r.jaExiste && !r.possivelDuplicata
      setSelected(initialSelection)
    }
    reader.readAsText(file, 'utf-8')
  }

  function handleCategoryChange(rowId, patch) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? { ...r, ...patch, classificacaoAutomatica: false, sugestaoFonte: null } : r,
      ),
    )
  }

  const autoCount = rows ? rows.filter((r) => r.classificacaoAutomatica).length : 0

  async function handleImport() {
    const toImport = rows.filter((r) => selected[r.id])
    setImporting(true)
    try {
      await bulkUpsertTransactions(
        toImport.map(({ jaExiste, possivelDuplicata, sugestaoFonte, ...tx }) => tx),
      )
      setDone(toImport.length)
      setRows(null)
    } finally {
      setImporting(false)
    }
  }

  const selectedCount = rows ? rows.filter((r) => selected[r.id]).length : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Importar extrato do Nubank</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Exporte o extrato em CSV no app/site do Nubank e envie o arquivo aqui.
        </p>
      </div>

      {lastImportedDate && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Último lançamento já registrado: <strong>{formatDate(lastImportedDate)}</strong>. Para evitar
          duplicidade, exporte o extrato a partir dessa data.
        </p>
      )}

      <Card>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          className="text-sm"
        />
        {fileName && <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>{fileName}</p>}
        {error && <p className="mt-2 text-sm" style={{ color: 'var(--status-critical)' }}>{error}</p>}
        {done !== null && (
          <p className="mt-2 text-sm" style={{ color: 'var(--status-good-text)' }}>
            {done} lançamento(s) importado(s). Vá para{' '}
            <Link to="/revisar" className="underline">
              A revisar
            </Link>{' '}
            para categorizá-los.
          </p>
        )}
      </Card>

      {rows && (
        <Card
          title={`Pré-visualização (${rows.length} linhas no arquivo · ${autoCount} categorizadas automaticamente)`}
          action={
            <button
              onClick={handleImport}
              disabled={importing || selectedCount === 0}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: 'var(--series-1)' }}
            >
              {importing ? 'Importando…' : `Importar ${selectedCount} selecionado(s)`}
            </button>
          }
        >
          <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Categoria sugerida automaticamente (pelo histórico de contrapartes já revisadas, ou por
            palavra-chave quando é a primeira vez). Ajuste aqui se algo ficou errado — o restante você
            confirma na aba "A revisar".
          </p>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                  <th className="py-1.5 pr-2"></th>
                  <th className="py-1.5 pr-2">Data</th>
                  <th className="py-1.5 pr-2">Valor</th>
                  <th className="py-1.5 pr-2">Quem</th>
                  <th className="py-1.5 pr-2">Motivo</th>
                  <th className="py-1.5 pr-2">Categoria sugerida</th>
                  <th className="py-1.5 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top" style={{ borderColor: 'var(--gridline)' }}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="checkbox"
                        checked={!!selected[r.id]}
                        disabled={r.jaExiste}
                        onChange={(e) => setSelected((s) => ({ ...s, [r.id]: e.target.checked }))}
                      />
                    </td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{formatDate(r.data)}</td>
                    <td
                      className="py-1.5 pr-2 whitespace-nowrap tabular-nums"
                      style={{ color: r.tipo === 'receita' ? 'var(--series-1)' : 'var(--series-2)' }}
                    >
                      {formatCurrency(r.valor)}
                    </td>
                    <td className="py-1.5 pr-2" style={{ color: 'var(--text-secondary)' }}>
                      {r.quem || '—'}
                    </td>
                    <td className="py-1.5 pr-2" style={{ color: 'var(--text-secondary)' }}>
                      {r.motivoOriginal || r.descricao || '—'}
                    </td>
                    <td className="py-1.5 pr-2" style={{ minWidth: 260 }}>
                      <CategoryPicker
                        tipo={r.tipo}
                        categorias={categories}
                        categoriaId={r.categoriaId}
                        subcategoriaId={r.subcategoriaId}
                        onChange={(patch) => handleCategoryChange(r.id, patch)}
                      />
                      {r.sugestaoFonte && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          sugerido por {r.sugestaoFonte === 'historico' ? 'histórico' : 'palavra-chave'}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-xs">
                      {r.jaExiste && <span style={{ color: 'var(--text-muted)' }}>já importado</span>}
                      {r.possivelDuplicata && (
                        <span style={{ color: 'var(--status-warning)' }}>possível duplicata</span>
                      )}
                      {!r.jaExiste && !r.possivelDuplicata && (
                        <span style={{ color: 'var(--status-good-text)' }}>novo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
