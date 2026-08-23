import { Fragment, useMemo, useState } from 'react'
import Card from '../components/Card'
import ColumnFilter from '../components/ColumnFilter'
import DateInput from '../components/DateInput'
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
  rendimentoMensalPivot,
  categoryDrilldown,
  categoryYearDrilldown,
  blocoShowLucroPorTemporada,
} from '../lib/analytics'
import { buildCascadingOptions } from '../lib/filterOptions'
import { formatCurrency } from '../lib/format'

const CARNAVAIS = ['Carnaval 2023', 'Carnaval 2024', 'Carnaval 2025', 'Carnaval 2026', 'Carnaval 2027']
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

const selectClass = 'rounded-md border bg-transparent px-2.5 py-1.5 text-sm'

export default function Dashboard() {
  const { transactions, loading } = useTransactions(true)
  const { categories } = useCategories(true)
  const settings = useSettings(true)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [evento, setEvento] = useState('')
  const [filtroAno, setFiltroAno] = useState([])
  const [filtroMes, setFiltroMes] = useState([])

  const eventos = useMemo(() => distinctEvents(transactions), [transactions])

  // Filtro de Ano/Mês, no mesmo padrão dos filtros de coluna de Lançamentos e
  // A revisar (múltipla seleção, com busca) — sempre a partir do histórico
  // inteiro (não só do que já está filtrado por De/Até/Evento), e um estreita
  // as opções do outro (marcar um ano só mostra os meses que aquele ano tem).
  const anoMesFields = useMemo(
    () => [
      {
        key: 'ano',
        keyFn: (t) => Number((t.data || '').slice(0, 4)),
        labelFn: (t) => t.data.slice(0, 4),
        sort: 'numeric',
      },
      {
        key: 'mes',
        keyFn: (t) => Number((t.data || '').slice(5, 7)),
        labelFn: (t) => MESES[Number(t.data.slice(5, 7)) - 1],
        sort: 'numeric',
      },
    ],
    [],
  )
  const anoMesFilters = useMemo(() => ({ ano: filtroAno, mes: filtroMes }), [filtroAno, filtroMes])
  const anoMesOptions = useMemo(
    () => buildCascadingOptions(transactions, anoMesFilters, anoMesFields),
    [transactions, anoMesFilters, anoMesFields],
  )

  const filtered = useMemo(
    () =>
      filterTransactions(transactions, {
        from,
        to,
        evento: evento || undefined,
        anos: filtroAno,
        meses: filtroMes,
      }),
    [transactions, from, to, evento, filtroAno, filtroMes],
  )

  const t = totals(filtered)
  const monthly = monthlySeries(filtered)
  const saldoInicial = Number(settings.saldoInicial) || 0
  const balance = accumulatedBalance(filtered, saldoInicial)
  const despesasPorCategoria = byCategory(filtered, 'despesa', categories)
  const receitasPorCategoria = byCategory(filtered, 'receita', categories)
  // Tabela expansível Categoria > Subcategoria > Motivo — segue os mesmos
  // filtros de período/evento/ano/mês acima (não é comparação de temporada).
  const drilldown = useMemo(() => categoryDrilldown(filtered, categories), [filtered, categories])
  const [expandedCats, setExpandedCats] = useState(new Set())
  const [expandedSubs, setExpandedSubs] = useState(new Set())

  function toggleCat(id) {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSub(key) {
    setExpandedSubs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Mesma árvore Categoria > Subcategoria > Motivo, mas com o ano como
  // coluna em vez de Despesa/Receita — mesmo filtro de período/evento/ano/mês
  // acima, e estado de expandir/recolher independente da tabela anterior.
  const yearDrilldown = useMemo(() => categoryYearDrilldown(filtered, categories), [filtered, categories])
  const [expandedYearCats, setExpandedYearCats] = useState(new Set())
  const [expandedYearSubs, setExpandedYearSubs] = useState(new Set())

  function toggleYearCat(id) {
    setExpandedYearCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleYearSub(key) {
    setExpandedYearSubs((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
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
  // Bloco Show entra como lucro (receita - despesa, com sinal) por temporada,
  // não receita bruta como Patrocínio/Batuqueiro — as subcategorias de
  // temporada usam o padrão "Temporada AA-BB" (ex.: 24-25 = Carnaval 2025,
  // 25-26 = Carnaval 2026): o ano mais recente da temporada indica a coluna.
  const receitaExtraRows = useMemo(() => {
    const patrocinioBatuqueiro = ['patrocinio', 'batuqueiro']
      .map((id) => categoryYearRow(transactions, categories, id, carnavalPivot.columns, { tipo: 'receita' }))
      .filter(Boolean)
    const blocoShowLucro = blocoShowLucroPorTemporada(transactions, categories, 'bloco-show', carnavalPivot.columns)
    return blocoShowLucro ? [...patrocinioBatuqueiro, blocoShowLucro] : patrocinioBatuqueiro
  }, [transactions, categories, carnavalPivot.columns])
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
  // Rendimentos (caixinha/investimento): também sempre com o histórico
  // inteiro, pega qualquer lançamento com Motivo "Rendimento" em qualquer
  // categoria — os anos das colunas saem dos próprios dados.
  const rendimentoPivot = useMemo(() => rendimentoMensalPivot(transactions), [transactions])

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
          <DateInput value={from} onChange={setFrom} className={selectClass} style={{ borderColor: 'var(--border)' }} />
        </label>
        <label className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Até
          <DateInput value={to} onChange={setTo} className={selectClass} style={{ borderColor: 'var(--border)' }} />
        </label>
        <select value={evento} onChange={(e) => setEvento(e.target.value)} className={selectClass} style={{ borderColor: 'var(--border)' }}>
          <option value="">Todos os eventos/temporadas</option>
          {eventos.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>
        <ColumnFilter
          label="Ano"
          options={anoMesOptions.ano}
          selected={filtroAno}
          onChange={setFiltroAno}
        />
        <ColumnFilter
          label="Mês"
          options={anoMesOptions.mes}
          selected={filtroMes}
          onChange={setFiltroMes}
        />
        {(from || to || evento || filtroAno.length > 0 || filtroMes.length > 0) && (
          <button
            onClick={() => {
              setFrom('')
              setTo('')
              setEvento('')
              setFiltroAno([])
              setFiltroMes([])
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

      <Card title="Detalhamento por categoria">
        {drilldown.rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Segue o filtro de período/evento/ano/mês acima. Clique numa categoria para ver as
              subcategorias, e numa subcategoria para ver os motivos.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                    <th className="py-1.5 pr-3">Categoria</th>
                    <th className="py-1.5 pr-3 text-right whitespace-nowrap">Despesa</th>
                    <th className="py-1.5 pr-3 text-right whitespace-nowrap">Receita</th>
                    <th className="py-1.5 pl-3 text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {drilldown.rows.map((cat) => {
                    const catOpen = expandedCats.has(cat.id)
                    return (
                      <Fragment key={cat.id}>
                        <tr
                          onClick={() => toggleCat(cat.id)}
                          className="cursor-pointer border-t"
                          style={{ borderColor: 'var(--gridline)' }}
                        >
                          <td className="py-1.5 pr-3 font-medium">
                            <span className="mr-1.5 inline-block w-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {catOpen ? '▾' : '▸'}
                            </span>
                            {cat.label}
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                            {cat.despesa ? formatCurrency(cat.despesa) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                            {cat.receita ? formatCurrency(cat.receita) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                          <td
                            className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                            style={{ color: cat.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                          >
                            {formatCurrency(cat.total)}
                          </td>
                        </tr>
                        {catOpen &&
                          cat.subcategorias.map((sub) => {
                            const subKey = `${cat.id}::${sub.id}`
                            const subOpen = expandedSubs.has(subKey)
                            return (
                              <Fragment key={subKey}>
                                <tr
                                  onClick={() => toggleSub(subKey)}
                                  className="cursor-pointer border-t"
                                  style={{ borderColor: 'var(--gridline)' }}
                                >
                                  <td className="py-1.5 pr-3 pl-6">
                                    <span
                                      className="mr-1.5 inline-block w-3 text-xs"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      {subOpen ? '▾' : '▸'}
                                    </span>
                                    {sub.label}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                                    {sub.despesa ? (
                                      formatCurrency(sub.despesa)
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                                    {sub.receita ? (
                                      formatCurrency(sub.receita)
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                                    )}
                                  </td>
                                  <td
                                    className="py-1.5 pl-3 text-right tabular-nums whitespace-nowrap"
                                    style={{ color: sub.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                                  >
                                    {formatCurrency(sub.total)}
                                  </td>
                                </tr>
                                {subOpen &&
                                  sub.motivos.map((motivo, i) => (
                                    <tr
                                      key={`${subKey}::${i}`}
                                      className="border-t"
                                      style={{ borderColor: 'var(--gridline)' }}
                                    >
                                      <td
                                        className="py-1.5 pr-3 pl-12 text-xs"
                                        style={{ color: 'var(--text-secondary)' }}
                                      >
                                        {motivo.label}
                                      </td>
                                      <td className="py-1.5 pr-3 text-right text-xs tabular-nums whitespace-nowrap">
                                        {motivo.despesa ? (
                                          formatCurrency(motivo.despesa)
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                      <td className="py-1.5 pr-3 text-right text-xs tabular-nums whitespace-nowrap">
                                        {motivo.receita ? (
                                          formatCurrency(motivo.receita)
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                      <td
                                        className="py-1.5 pl-3 text-right text-xs tabular-nums whitespace-nowrap"
                                        style={{ color: motivo.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                                      >
                                        {formatCurrency(motivo.total)}
                                      </td>
                                    </tr>
                                  ))}
                              </Fragment>
                            )
                          })}
                      </Fragment>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-3 font-medium">TOTAL</td>
                    <td className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                      {formatCurrency(drilldown.totals.despesa)}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap">
                      {formatCurrency(drilldown.totals.receita)}
                    </td>
                    <td
                      className="py-1.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      style={{ color: drilldown.totals.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                    >
                      {formatCurrency(drilldown.totals.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>

      <Card title="Detalhamento por categoria e ano">
        {yearDrilldown.rows.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Segue o filtro de período/evento/ano/mês acima. Cada coluna é o líquido (receita menos
              despesa, com sinal) daquele ano. Clique numa categoria para ver as subcategorias, e numa
              subcategoria para ver os motivos.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                    <th className="py-1.5 pr-3">Categoria</th>
                    {yearDrilldown.anos.map((ano) => (
                      <th key={ano} className="py-1.5 pr-3 text-right whitespace-nowrap">
                        {ano}
                      </th>
                    ))}
                    <th className="py-1.5 pl-3 text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {yearDrilldown.rows.map((cat) => {
                    const catOpen = expandedYearCats.has(cat.id)
                    return (
                      <Fragment key={cat.id}>
                        <tr
                          onClick={() => toggleYearCat(cat.id)}
                          className="cursor-pointer border-t"
                          style={{ borderColor: 'var(--gridline)' }}
                        >
                          <td className="py-1.5 pr-3 font-medium">
                            <span className="mr-1.5 inline-block w-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {catOpen ? '▾' : '▸'}
                            </span>
                            {cat.label}
                          </td>
                          {yearDrilldown.anos.map((ano) => {
                            const v = cat.anos[ano]
                            return (
                              <td key={ano} className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                                {v ? (
                                  <span style={{ color: v < 0 ? 'var(--series-2)' : undefined }}>
                                    {formatCurrency(v)}
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                                )}
                              </td>
                            )
                          })}
                          <td
                            className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                            style={{ color: cat.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                          >
                            {formatCurrency(cat.total)}
                          </td>
                        </tr>
                        {catOpen &&
                          cat.subcategorias.map((sub) => {
                            const subKey = `${cat.id}::${sub.id}`
                            const subOpen = expandedYearSubs.has(subKey)
                            return (
                              <Fragment key={subKey}>
                                <tr
                                  onClick={() => toggleYearSub(subKey)}
                                  className="cursor-pointer border-t"
                                  style={{ borderColor: 'var(--gridline)' }}
                                >
                                  <td className="py-1.5 pr-3 pl-6">
                                    <span
                                      className="mr-1.5 inline-block w-3 text-xs"
                                      style={{ color: 'var(--text-muted)' }}
                                    >
                                      {subOpen ? '▾' : '▸'}
                                    </span>
                                    {sub.label}
                                  </td>
                                  {yearDrilldown.anos.map((ano) => {
                                    const v = sub.anos[ano]
                                    return (
                                      <td key={ano} className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                                        {v ? (
                                          <span style={{ color: v < 0 ? 'var(--series-2)' : undefined }}>
                                            {formatCurrency(v)}
                                          </span>
                                        ) : (
                                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                      </td>
                                    )
                                  })}
                                  <td
                                    className="py-1.5 pl-3 text-right tabular-nums whitespace-nowrap"
                                    style={{ color: sub.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                                  >
                                    {formatCurrency(sub.total)}
                                  </td>
                                </tr>
                                {subOpen &&
                                  sub.motivos.map((motivo, i) => (
                                    <tr
                                      key={`${subKey}::${i}`}
                                      className="border-t"
                                      style={{ borderColor: 'var(--gridline)' }}
                                    >
                                      <td
                                        className="py-1.5 pr-3 pl-12 text-xs"
                                        style={{ color: 'var(--text-secondary)' }}
                                      >
                                        {motivo.label}
                                      </td>
                                      {yearDrilldown.anos.map((ano) => {
                                        const v = motivo.anos[ano]
                                        return (
                                          <td
                                            key={ano}
                                            className="py-1.5 pr-3 text-right text-xs tabular-nums whitespace-nowrap"
                                          >
                                            {v ? (
                                              <span style={{ color: v < 0 ? 'var(--series-2)' : undefined }}>
                                                {formatCurrency(v)}
                                              </span>
                                            ) : (
                                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                                            )}
                                          </td>
                                        )
                                      })}
                                      <td
                                        className="py-1.5 pl-3 text-right text-xs tabular-nums whitespace-nowrap"
                                        style={{ color: motivo.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                                      >
                                        {formatCurrency(motivo.total)}
                                      </td>
                                    </tr>
                                  ))}
                              </Fragment>
                            )
                          })}
                      </Fragment>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-3 font-medium">TOTAL</td>
                    {yearDrilldown.anos.map((ano) => (
                      <td
                        key={ano}
                        className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: yearDrilldown.totalPorAno[ano] < 0 ? 'var(--series-2)' : undefined }}
                      >
                        {formatCurrency(yearDrilldown.totalPorAno[ano])}
                      </td>
                    ))}
                    <td
                      className="py-1.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      style={{ color: yearDrilldown.totalGeral < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                    >
                      {formatCurrency(yearDrilldown.totalGeral)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </Card>

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
              comparação ao lado do gasto de cada temporada. A linha Bloco Show (lucro) mostra
              receita menos despesa da temporada (pode ficar negativa) — a Temporada 24-25 entra na
              coluna Carnaval 2025, a 25-26 na Carnaval 2026, e assim por diante, sempre pelo ano mais
              recente da temporada. As linhas TOTAL DESPESA e TOTAL RECEITA no rodapé somam cada um
              desses dois blocos separadamente (não se misturam).
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
                            <span
                              style={{ color: row.valores[c.categoriaId] < 0 ? 'var(--series-2)' : undefined }}
                            >
                              {formatCurrency(row.valores[c.categoriaId])}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                      ))}
                      <td
                        className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: row.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
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

      <Card title="Rendimentos por mês">
        {rendimentoPivot.anos.length === 0 ? (
          <p className="py-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum lançamento com Motivo "Rendimento" ainda.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Sempre com o histórico inteiro (não usa o filtro de período/evento acima). Soma todo
              lançamento cujo Motivo seja exatamente "Rendimento", com o sinal — um mês de rendimento
              negativo aparece negativo.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ color: 'var(--text-muted)' }} className="text-xs uppercase">
                    <th className="py-1.5 pr-3">Mês</th>
                    {rendimentoPivot.anos.map((ano) => (
                      <th key={ano} className="py-1.5 pr-3 text-right whitespace-nowrap">
                        {ano}
                      </th>
                    ))}
                    <th className="py-1.5 pl-3 text-right whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rendimentoPivot.linhas.map((linha) => (
                    <tr key={linha.mes} className="border-t" style={{ borderColor: 'var(--gridline)' }}>
                      <td className="py-1.5 pr-3">{MESES[linha.mes - 1]}</td>
                      {rendimentoPivot.anos.map((ano) => {
                        const v = linha.valores[ano]
                        return (
                          <td key={ano} className="py-1.5 pr-3 text-right tabular-nums whitespace-nowrap">
                            {v ? (
                              <span style={{ color: v < 0 ? 'var(--series-2)' : 'var(--series-1)' }}>
                                {formatCurrency(v)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                        )
                      })}
                      <td
                        className="py-1.5 pl-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: linha.total < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                      >
                        {formatCurrency(linha.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-1.5 pr-3 font-medium">Total</td>
                    {rendimentoPivot.anos.map((ano) => (
                      <td
                        key={ano}
                        className="py-1.5 pr-3 text-right font-medium tabular-nums whitespace-nowrap"
                        style={{ color: rendimentoPivot.totalPorAno[ano] < 0 ? 'var(--series-2)' : undefined }}
                      >
                        {formatCurrency(rendimentoPivot.totalPorAno[ano])}
                      </td>
                    ))}
                    <td
                      className="py-1.5 pl-3 text-right font-semibold tabular-nums whitespace-nowrap"
                      style={{ color: rendimentoPivot.totalGeral < 0 ? 'var(--series-2)' : 'var(--series-1)' }}
                    >
                      {formatCurrency(rendimentoPivot.totalGeral)}
                    </td>
                  </tr>
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
