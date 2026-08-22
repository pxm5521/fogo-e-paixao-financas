#!/usr/bin/env node
// Importa o histórico (2021-2026) extraído da planilha "Saldo em Conta FP v.xlsx"
// para o Firestore, de uma vez só. Rode UMA ÚNICA VEZ, logo depois de criar o
// projeto Firebase e configurar as categorias padrão.
//
// Uso:
//   1. No Console do Firebase: Configurações do projeto > Contas de serviço >
//      "Gerar nova chave privada". Salve o arquivo baixado como
//      scripts/serviceAccountKey.json (não é versionado no git).
//   2. node scripts/import-seed.mjs
//
// O script é idempotente: os IDs dos lançamentos são estáveis, então rodar de
// novo apenas sobrescreve os mesmos documentos (não duplica).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BLOCO_ID = 'fogo-e-paixao'

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

  const seedPath = join(__dirname, 'seed_transactions.json')
  const transactions = JSON.parse(readFileSync(seedPath, 'utf8'))
  console.log(`Importando ${transactions.length} lançamentos históricos…`)

  const col = db.collection('blocos').doc(BLOCO_ID).collection('transactions')

  let done = 0
  const chunkSize = 400
  for (let i = 0; i < transactions.length; i += chunkSize) {
    const chunk = transactions.slice(i, i + chunkSize)
    const batch = db.batch()
    for (const item of chunk) {
      const { id, ...rest } = item
      batch.set(col.doc(id), { ...rest, createdAt: new Date().toISOString() }, { merge: true })
    }
    await batch.commit()
    done += chunk.length
    console.log(`  ${done}/${transactions.length}`)
  }

  console.log('\nPronto! Histórico importado.')
  console.log(
    'Uma parte dos lançamentos ficou como "A revisar" (a planilha original não tinha Tipo\n' +
      'preenchido para eles) — confira a aba "A revisar" no site para categorizá-los.\n' +
      '\nIMPORTANTE: se essa não é a primeira vez que você usa este projeto Firebase, rode\n' +
      'também `node scripts/sync-categories.mjs` para garantir que a coleção de categorias\n' +
      'está sincronizada com src/lib/categories.js — senão os lançamentos importados podem\n' +
      'aparecer com categoria/subcategoria em branco.',
  )
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
