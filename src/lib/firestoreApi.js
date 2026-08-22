// Camada fina sobre o Firestore. Todos os dados do bloco ficam sob
// /blocos/{blocoId}/... para deixar a porta aberta para múltiplas contas/
// blocos no futuro sem precisar migrar nada — hoje só usamos um blocoId fixo.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from './firebase'
import { DEFAULT_CATEGORIES } from './categories'

export const BLOCO_ID = 'fogo-e-paixao'

function blocoRef() {
  return doc(db, 'blocos', BLOCO_ID)
}

export function transactionsCol() {
  return collection(blocoRef(), 'transactions')
}

export function categoriesCol() {
  return collection(blocoRef(), 'categories')
}

export function settingsRef() {
  return doc(blocoRef(), 'meta', 'settings')
}

// ---------- Transações ----------

export function watchTransactions(onChange, onError) {
  const q = query(transactionsCol(), orderBy('data', 'desc'))
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    onChange(rows)
  }, onError)
}

export async function createTransaction(tx) {
  return addDoc(transactionsCol(), {
    ...tx,
    createdAt: new Date().toISOString(),
  })
}

export async function updateTransaction(id, patch) {
  return updateDoc(doc(transactionsCol(), id), patch)
}

export async function deleteTransaction(id) {
  return deleteDoc(doc(transactionsCol(), id))
}

// Importa em lote (usado pela importação de CSV). `items` é um array de
// objetos de transação já com um `id` estável (para permitir set idempotente
// e evitar duplicar caso o mesmo arquivo seja importado duas vezes).
export async function bulkUpsertTransactions(items) {
  const chunks = []
  for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i + 400))
  for (const chunk of chunks) {
    const batch = writeBatch(db)
    for (const item of chunk) {
      const { id, ...rest } = item
      batch.set(doc(transactionsCol(), id), rest, { merge: true })
    }
    await batch.commit()
  }
}

export async function fetchAllTransactionIds() {
  const snap = await getDocs(transactionsCol())
  return new Set(snap.docs.map((d) => d.id))
}

// ---------- Categorias ----------

// Categorias e subcategorias sempre em ordem alfabética (pt-BR, ignorando
// maiúscula/acento) — o Firestore não garante nenhuma ordem própria, então
// isso é recalculado a cada snapshot. Como toda tela lê categorias por aqui
// (CategoryPicker, a aba Categorias, os filtros de coluna), adicionar,
// renomear ou remover uma categoria/subcategoria já chega reordenado em
// todo o site, sem precisar de nenhum passo extra.
function sortCategories(rows) {
  const collator = (a, b) => a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' })
  return [...rows]
    .map((c) => ({ ...c, subcategorias: [...(c.subcategorias ?? [])].sort(collator) }))
    .sort(collator)
}

export function watchCategories(onChange, onError) {
  return onSnapshot(categoriesCol(), (snap) => {
    onChange(sortCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, onError)
}

export async function ensureDefaultCategories() {
  const snap = await getDocs(categoriesCol())
  if (!snap.empty) return
  const batch = writeBatch(db)
  for (const cat of DEFAULT_CATEGORIES) {
    const { id, ...rest } = cat
    batch.set(doc(categoriesCol(), id), rest)
  }
  await batch.commit()
}

export async function upsertCategory(category) {
  const { id, ...rest } = category
  await setDoc(doc(categoriesCol(), id), rest, { merge: true })
}

export async function deleteCategory(id) {
  await deleteDoc(doc(categoriesCol(), id))
}

// ---------- Configurações (saldo inicial, etc.) ----------

export async function ensureSettings() {
  const ref = settingsRef()
  await setDoc(ref, {}, { merge: true })
}

export function watchSettings(onChange, onError) {
  return onSnapshot(settingsRef(), (snap) => onChange(snap.data() ?? {}), onError)
}

export async function updateSettings(patch) {
  await setDoc(settingsRef(), patch, { merge: true })
}
