import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { firebaseConfigured } from './lib/firebase'
import Layout from './components/Layout'
import Login from './pages/Login'
import SetupNeeded from './pages/SetupNeeded'
import Dashboard from './pages/Dashboard'
import ImportPage from './pages/ImportPage'
import ReviewQueue from './pages/ReviewQueue'
import Transactions from './pages/Transactions'
import Caixinha from './pages/Caixinha'
import Categories from './pages/Categories'
import Settings from './pages/Settings'

export default function App() {
  const { user, loading, allowed, login, logout } = useAuth()

  if (!firebaseConfigured) return <SetupNeeded />
  if (loading) return <CenteredMessage>Carregando…</CenteredMessage>
  if (!user) return <Login onLogin={login} />
  if (!allowed) return <NotAllowed email={user.email} onLogout={logout} />

  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/importar" element={<ImportPage />} />
        <Route path="/revisar" element={<ReviewQueue />} />
        <Route path="/lancamentos" element={<Transactions />} />
        <Route path="/caixinha" element={<Caixinha />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/configuracoes" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function CenteredMessage({ children }) {
  return (
    <div className="flex h-screen items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </div>
  )
}

function NotAllowed({ email, onLogout }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-medium">Este site é de uso restrito.</p>
      <p style={{ color: 'var(--text-secondary)' }}>
        A conta <strong>{email}</strong> não está autorizada. Confira{' '}
        <code>VITE_ALLOWED_EMAILS</code> no <code>.env</code> e as regras em{' '}
        <code>firestore.rules</code>.
      </p>
      <button
        onClick={onLogout}
        className="mt-2 rounded-md px-4 py-2 text-sm font-medium text-white"
        style={{ background: 'var(--series-2)' }}
      >
        Sair
      </button>
    </div>
  )
}
