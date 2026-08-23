import { useEffect, useState } from 'react'
import {
  watchTransactions,
  watchCategories,
  watchSettings,
  ensureDefaultCategories,
  watchCaixinhaMovimentos,
  watchCaixinhaSaldos,
} from '../lib/firestoreApi'

export function useTransactions(enabled) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!enabled) return
    const unsub = watchTransactions(
      (rows) => {
        setTransactions(rows)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )
    return unsub
  }, [enabled])

  return { transactions, loading, error }
}

export function useCategories(enabled) {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    ensureDefaultCategories().catch(() => {})
    const unsub = watchCategories(
      (rows) => {
        setCategories(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [enabled])

  return { categories, loading }
}

export function useSettings(enabled) {
  const [settings, setSettings] = useState({})
  useEffect(() => {
    if (!enabled) return
    const unsub = watchSettings(setSettings, () => {})
    return unsub
  }, [enabled])
  return settings
}

export function useCaixinhaMovimentos(enabled) {
  const [movimentos, setMovimentos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    const unsub = watchCaixinhaMovimentos(
      (rows) => {
        setMovimentos(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [enabled])

  return { movimentos, loading }
}

export function useCaixinhaSaldos(enabled) {
  const [saldos, setSaldos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    const unsub = watchCaixinhaSaldos(
      (rows) => {
        setSaldos(rows)
        setLoading(false)
      },
      () => setLoading(false),
    )
    return unsub
  }, [enabled])

  return { saldos, loading }
}
