import { useMemo, useState } from 'react'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import MonthlyBarChart from '../components/charts/MonthlyBarChart'
import BalanceLineChart from '../components/charts/BalanceLineChart'
import CategoryBarChart from '../components/charts/CategoryBarChart'
import { useTransactions, useCategories, useSettings } from '../hooks/useFirestoreData'
import {
  filterTransactions,
  totals,
  monthlySeries,
  accumulatedBalance,
  byCategory,
  distinctEvents,
  subcategoriaPivot,
  categoryYearRow,
} from '../lib/analytics'
import { formatCurrency } from '../lib/format'

const CARNAVAIS = ['Carnaval 2023', 'Carnaval 2024', 'Carnaval 2025', 'Carnaval 2026', 'Carnaval 2027']

const selectClass = 'rounded-md border bg-transparent px-2.5 py-1.5 text-sm'

export default function Dashboard() {
  const { transactions, loading } = useTransactions(true)
  const { categories } = useCategories(true)
  const settings = useSettings(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [evento, setEvento] = useState('')

  const eventos = useMemo(() => distinctEvents(transactions), [transactions])
  const filtered = useMemo(
    () => filterTransactions(transactions, { from, to, evento: evento || undefined }),
    [transactions, from, to, evento],
  )

  const t = totals(filtered)
  const monthly = monthlySeries(filtered)
  const saldoInicial = Number(settings.saldoInicial) || 0
  const balance = accumulatedBalance(filtered, saldoInicial)
  const despesasPorCategoria = byCategory(filtered, 'despesa', categories)
  const receitasPorCategoria = byCategory(filtered, 'receita', categories)
  // Comparativo entre temporadas: sempre com todos os lançamentos (não usa
  // o período/evento filtrado acima), porque o objetivo é comparar as
  // temporadas inteiras entre si.
  const carnavalPivot = useMemo(
    () => subcategoriaPivot(transactions, categories, CARNAVAIS, { tipo: 'despesa' }),
    [transactions, categories],
  )
  // Patrocínio e Batuqueiro entram como linhas extras (categoria inteira, não
  // por subcategoria) nas mesmas colunas de temporada — mas usando receita,
  // já que são valores que entram (patrocínio recebido, contribuição de
  // batuqueiro), não despesa.
  const receitaExtraRows = useMemo(
    () =>
      ['patrocinio', 'batuqueiro']
        .map((id) => categoryYearRow(transactions, categories, id, carnavalPivot.columns, { tipo: 'receita' }))
        .filter(Boolean),
    [transactions, categories, carnavalPivot.columns],
  )
  const receitaTotais = useMemo(() => {
    const totaisPorColuna = {}
    let totalGeral = 0
    for (const c of carnavalPivot.columns) {
      const soma = receitaExtraRows.reduce((sum, row) => sum + (row.valores[c.categoriaId] ?? 0), 0)
      totaisPorColuna[c.categoriaId] = soma
      totalGeral += soma
    }
    return { totaisPorColuna, totalGeral }
  }, [carnavalPivot.columns, receitaExtraRows])

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Resumo</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {transactions.length} lançamentos no total
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          De
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectClass} style={{ borderColor: 'var(--border)' }} />
        </label>
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Até
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} style={{ borderColor: 'var(--border)' }} />
        </label>
        <select value={evento} onChange={(e) => setEvento(e.target.value)} className={selectClass} style={{ borderColor: 'var(--border)' }}>
          <option value="">Todos os eventos/temporadas</option>
          {eventos.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>
        {(from || to || evento) && (
          <button
            onClick={() => {
              setFrom('')
              setTo('')
              setEvento('')
            }}
            className="text-sm font-medium"
            style={{ color: 'var(--series-2)' }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Saldo no período" value={t.saldo} tone={t.saldo >= 0 ? 'good' : 'critical'} />
        <StatCard label="Receitas" value={t.receitas} />
        <StatCard label="Despesas" value={t.despesas} />
      </div>

      <Card title="Receitas x despesas por mês">
        {monthly.length ? <MonthlyBarChart data={monthly} /> : <EmptyState />}
      </Card>

      <Card title={`Saldo acumulado${saldoInicial ? ' (com saldo inicial configurado)' : ''}`}>
        {balance.length ? <BalanceLineChart data={balance} /> : <EmptyState />}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Despesas por categoria">
          {despesasPorCategoria.length ? (
            <CategoryBarChart data={despesasPorCategoria} color="var(--series-2)" />
          ) : (
            <EmptyState />
          )}
        </Card>
        <Card title="Receitas por categoria">
          {receitasPorCategoria.length ? (
            <CategoryBarChart data={receitasPorCategoria} color="var(--series-1)" />
          ) : (
            <EmptyState />
          )}
        </Card>
      </div>

      <Card title="Despesas por temporada — Carnaval 2023 a 2027">
        {carnavalPivot.columns.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhuma dessas categorias existe ainda (Carnaval 2023, 2024, 2025, 2026 ou 2027).
          </p>
        ) : carnavalPivot.rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Sempre com o histórico inteiro (não usa o filtro de período/evento acima) — o objetivo
              aqui é comparar as temporadas entre si. Subcategorias com o mesmo nome em mais de uma
              temporada aparecem numa linha só. As linhas de Patrocínio e Batuqueiro no final mostram
              receita (dinheiro que entrou), não despesa — por isso ficam separadas por uma linha, como
              comparação ao lado do gasto de cada temporada. As linhas TOTAL DESPESA e TOTAL RECEITA no
              rodapé somam cada um desses dois blocos separadamente (não se misturam).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                    <th className="py-1.5 pr-3">Subcategoria</th>
                    {carnavalPivot.columns.map((c) => (
                      <th key={c.categoriaId} className="py-1.5 pr-3 text-right whitespace-nowrap">
                        {c.label}
                      </th>
                    ))}
                    <th className="py-1.5 pl-3 text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {carnavalPivot.rows.map((row) => (
                    <tr key={row.label} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                      <td className="py-1.5 pr-3">{row.label}</td>
                      {carnavalPivot.columns.map((c) => (
                        <td key={c.categoriaId} className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                          {row.valores[c.categoriaId] ? (
                            formatCurrency(row.valores[c.categoriaId])
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      ))}
                      <td
                        className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--series-2)' }}
                      >
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                  {receitaExtraRows.length > 0 && (
                    <tr>
                      <td
                        colSpan={carnavalPivot.columns.length + 2}
                        className="pt-3 pb-1 text-xs font-medium uppercase"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Receita por temporada (comparação)
                      </td>
                    </tr>
                  )}
                  {receitaExtraRows.map((row) => (
                    <tr key={row.categoriaId} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                      <td className="py-1.5 pr-3">{row.label}</td>
                      {carnavalPivot.columns.map((c) => (
                        <td key={c.categoriaId} className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                          {row.valores[c.categoriaId] ? (
                            formatCurrency(row.valores[c.categoriaId])
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      ))}
                      <td
                        className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--series-1)' }}
                      >
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-3 font-medium">TOTAL DESPESA</td>
                    {carnavalPivot.columns.map((c) => (
                      <td key={c.categoriaId} className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(carnavalPivot.totaisPorColuna[c.categoriaId])}
                      </td>
                    ))}
                    <td
                      className="py-1.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      style={{ color: 'var(--series-2)' }}
                    >
                      {formatCurrency(carnavalPivot.totalGeral)}
                    </td>
                  </tr>
                  {receitaExtraRows.length > 0 && (
                    <tr className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                      <td className="py-1.5 pr-3 font-medium">TOTAL RECEITA</td>
                      {carnavalPivot.columns.map((c) => (
                        <td key={c.categoriaId} className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                          {formatCurrency(receitaTotais.totaisPorColuna[c.categoriaId])}
                        </td>
                      ))}
                      <td
                        className="py-1.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                        style={{ color: 'var(--series-1)' }}
                      >
                        {formatCurrency(receitaTotais.totalGeral)}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

function EmptyState() {
  return (
    <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
      Sem dados para o período selecionado.
    </p>
  )
}
