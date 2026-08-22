import Papa from 'papaparse'

// O extrato do Nubank (Conta PJ/PF, exportação CSV) vem com o cabeçalho:
// Data,Valor,Identificador,Descrição
// Ex.: 01/02/2025,350.00,679e1283-ae4a-4253-b71b-f9213a618f4e,Transferência Recebida - Fulano - ...

function parseBrDate(str) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((str || '').trim())
  if (!m) return null
  const [, d, mo, y] = m
  return `${y}-${mo}-${d}`
}

// Tenta extrair "quem" (a contraparte) e "motivo" (o tipo do lançamento) a
// partir da descrição do Nubank.
// Ex: "Transferência Recebida - Edivania dos Santos Menegussi - •••.947.447-•• - NU ..."
//     -> motivo: "Transferência Recebida", quem: "Edivania dos Santos Menegussi"
// Ex: "Pagamento de boleto efetuado - ECAD"
//     -> motivo: "Pagamento de boleto efetuado", quem: "ECAD"
// O extrato do Nubank não tem uma coluna "Motivo" separada como a planilha
// original tinha — isso é uma aproximação a partir do texto da descrição.
function extractQuemEMotivo(descricao) {
  if (!descricao) return { quem: null, motivo: null }
  const partes = descricao.split(' - ').map((p) => p.trim())
  return {
    motivo: partes[0] || null,
    quem: partes.length >= 2 ? partes[1] : null,
  }
}

export function parseNubankCsv(csvText) {
  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    delimiter: ',',
  })

  const errors = parsed.errors?.filter((e) => e.code !== 'TooFewFields') ?? []

  const headerKeys = parsed.meta.fields ?? []
  const hasExpectedHeader =
    headerKeys.some((h) => /data/i.test(h)) &&
    headerKeys.some((h) => /valor/i.test(h)) &&
    headerKeys.some((h) => /identificador/i.test(h))

  if (!hasExpectedHeader) {
    return {
      ok: false,
      error:
        'O arquivo não parece um extrato do Nubank (esperava colunas Data, Valor, Identificador, Descrição).',
      rows: [],
    }
  }

  const dataKey = headerKeys.find((h) => /data/i.test(h))
  const valorKey = headerKeys.find((h) => /valor/i.test(h))
  const idKey = headerKeys.find((h) => /identificador/i.test(h))
  const descKey = headerKeys.find((h) => /descri/i.test(h))

  const rows = []
  for (const raw of parsed.data) {
    const dataIso = parseBrDate(raw[dataKey])
    const valorNum = Number(String(raw[valorKey]).replace(',', '.'))
    const identificador = (raw[idKey] || '').trim()
    const descricao = (raw[descKey] || '').trim()
    if (!dataIso || Number.isNaN(valorNum) || !identificador) continue

    const { quem, motivo } = extractQuemEMotivo(descricao)
    rows.push({
      id: `nu_${identificador}`,
      identificadorNubank: identificador,
      data: dataIso,
      valor: Math.round(valorNum * 100) / 100,
      tipo: valorNum >= 0 ? 'receita' : 'despesa',
      descricao,
      quem,
      motivoOriginal: motivo,
      categoriaId: null,
      subcategoriaId: null,
      evento: null,
      origem: 'importacao_nubank',
      classificacaoAutomatica: false,
      revisado: false,
    })
  }

  return { ok: true, rows, errors }
}

// Marca linhas que parecem já existir na base (mesma data e mesmo valor,
// vindas de outra origem — tipicamente do histórico importado da planilha,
// que não tem o Identificador real do Nubank para comparar 1-a-1).
export function flagPossibleDuplicates(newRows, existingTransactions) {
  const byKey = new Map()
  for (const tx of existingTransactions) {
    const key = `${tx.data}|${tx.valor}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(tx)
  }
  return newRows.map((row) => {
    const key = `${row.data}|${row.valor}`
    const matches = byKey.get(key) ?? []
    const alreadyImported = matches.some((m) => m.id === row.id)
    const similar = matches.filter((m) => m.id !== row.id)
    return {
      ...row,
      jaExiste: alreadyImported,
      possivelDuplicata: !alreadyImported && similar.length > 0,
    }
  })
}
