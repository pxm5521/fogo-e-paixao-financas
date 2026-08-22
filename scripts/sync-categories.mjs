#!/usr/bin/env node
// Sincroniza a coleção `categories` do Firestore com a lista em
// src/lib/categories.js (as categorias/subcategorias vindas da sua
// planilha Saldo FP).
//
// Por que isso é necessário: o site só cria as categorias padrão
// automaticamente na PRIMEIRA vez que alguém entra (quando a coleção
// `categories` está vazia). Se você já tinha entrado no site antes — com
// uma versão anterior do projeto, que tinha uma lista de categorias
// diferente — essa coleção já não está mais vazia, e o site nunca mais
// tenta recriá-la sozinho. Resultado: as categorias que aparecem na tela
// "Categorias" ficam desatualizadas, e os lançamentos importados (que usam
// os ids novos, de src/lib/categories.js) não encontram a categoria
// correspondente — por isso aparecem em branco ao editar.
//
// Este script:
//   1. Adiciona/atualiza no Firestore todas as categorias de
//      src/lib/categories.js.
//   2. Aponta quais categorias existem no Firestore mas NÃO estão nessa
//      lista. As que nenhum lançamento usa mais só são apagadas se você
//      passar --delete-unused; as que algum lançamento ainda usa NUNCA são
//      apagadas por este script, em nenhuma situação.
//
// Uso:
//   1. No Console do Firebase: Configurações do projeto > Contas de
//      serviço > "Gerar nova chave privada". Salve como
//      scripts/serviceAccountKey.json (se você já apagou depois do passo de
//      importar o histórico, gere uma nova).
//   2. node scripts/sync-categories.mjs
//      Para também apagar de uma vez as categorias antigas que sobraram e
//      que nenhum lançamento usa mais (em vez de apagar uma por uma pela
//      tela "Categorias"):
//        node scripts/sync-categories.mjs --delete-unused
//      (nunca apaga uma categoria que algum lançamento ainda está usando)
//
// Pode rodar quantas vezes quiser — é seguro (idempotente).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { DEFAULT_CATEGORIES } from '../src/lib/categories.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLOCO_ID = 'fogo-e-paixao'
const DELETE_UNUSED = process.argv.includes('--delete-unused')

function loadServiceAccount() {
  const path = join(__dirname, 'serviceAccountKey.json')
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    console.error(
      `\nNão encontrei ${path}.\n` +
        'Baixe a chave de conta de serviço no Console do Firebase (Configurações do\n' +
        'projeto > Contas de serviço > Gerar nova chave privada) e salve com esse nome.\n',
    )
    process.exit(1)
  }
}

async function main() {
  const serviceAccount = loadServiceAccount()
  initializeApp({ credential: cert(serviceAccount) })
  const db = getFirestore()

  const blocoRef = db.collection('blocos').doc(BLOCO_ID)
  const categoriesCol = blocoRef.collection('categories')
  const transactionsCol = blocoRef.collection('transactions')

  console.log(`Gravando ${DEFAULT_CATEGORIES.length} categorias de src/lib/categories.js…`)
  const chunkSize = 400
  for (let i = 0; i < DEFAULT_CATEGORIES.length; i += chunkSize) {
    const chunk = DEFAULT_CATEGORIES.slice(i, i + chunkSize)
    const batch = db.batch()
    for (const cat of chunk) {
      const { id, ...rest } = cat
      batch.set(categoriesCol.doc(id), rest, { merge: true })
    }
    await batch.commit()
  }
  console.log('Categorias gravadas.')

  // Verifica se sobrou alguma categoria antiga no Firestore que não está
  // mais na lista atual, e se algum lançamento ainda depende dela.
  const currentIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id))
  const [existingSnap, txSnap] = await Promise.all([categoriesCol.get(), transactionsCol.get()])

  const stale = existingSnap.docs.filter((d) => !currentIds.has(d.id))
  if (stale.length === 0) {
    console.log('\nNenhuma categoria antiga sobrando no Firestore. Tudo sincronizado.')
    process.exit(0)
  }

  const usedIds = new Set()
  for (const doc of txSnap.docs) {
    const t = doc.data()
    if (t.categoriaId) usedIds.add(t.categoriaId)
  }

  const staleUsed = stale.filter((d) => usedIds.has(d.id))
  const staleUnused = stale.filter((d) => !usedIds.has(d.id))

  console.log(`\n${stale.length} categoria(s) antiga(s) no Firestore não fazem mais parte da lista atual:`)
  if (staleUnused.length) {
    console.log(`  - ${staleUnused.length} sem nenhum lançamento usando (label: ${staleUnused.map((d) => d.data().label).join(', ')})`)
    if (DELETE_UNUSED) {
      console.log('    Apagando (--delete-unused)…')
      for (let i = 0; i < staleUnused.length; i += chunkSize) {
        const chunk = staleUnused.slice(i, i + chunkSize)
        const batch = db.batch()
        for (const d of chunk) batch.delete(d.ref)
        await batch.commit()
      }
      console.log(`    ${staleUnused.length} categoria(s) apagada(s).`)
    } else {
      console.log('    Rode de novo com --delete-unused para apagar essas de uma vez (ou apague pela tela "Categorias" do site).')
    }
  }
  if (staleUsed.length) {
    console.log(`  - ${staleUsed.length} AINDA usada(s) por algum lançamento (label: ${staleUsed.map((d) => d.data().label).join(', ')})`)
    console.log('    Não apague essas sem antes reclassificar os lançamentos que usam elas (senão eles ficam em branco de novo). Este script nunca apaga essas automaticamente.')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
