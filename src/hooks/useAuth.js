import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, ALLOWED_EMAILS, firebaseConfigured } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const email = user?.email?.toLowerCase()
  const allowed =
    ALLOWED_EMAILS.length === 0 ? Boolean(user) : Boolean(email && ALLOWED_EMAILS.includes(email))

  const login = () => signInWithPopup(auth, googleProvider)
  const logout = () => signOut(auth)

  return { user, loading, allowed, login, logout }
}
