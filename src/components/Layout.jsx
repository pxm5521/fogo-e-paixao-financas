import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'

const NAV = [
  { to: '/', label: 'Resumo', end: true },
  { to: '/importar', label: 'Importar extrato' },
  { to: '/revisar', label: 'A revisar' },
  { to: '/lancamentos', label: 'Lançamentos' },
  { to: '/categorias', label: 'Categorias' },
  { to: '/configuracoes', label: 'Configurações' },
]

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system')
  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])
  return [theme, setTheme]
}

export default function Layout({ user, onLogout, children }) {
  const [theme, setTheme] = useTheme()

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside
        className="flex shrink-0 flex-col gap-1 border-b p-4 md:h-screen md:w-56 md:border-b-0 md:border-r"
        style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}
      >
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold leading-tight">Fogo e Paixão</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Finanças do bloco
          </p>
        </div>
        <nav className="flex flex-1 flex-row flex-wrap gap-1 md:flex-col">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                'rounded-md px-3 py-2 text-sm font-medium transition-colors ' +
                (isActive ? 'text-white' : '')
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--series-1)' : 'transparent',
                color: isActive ? '#fff' : 'var(--text-secondary)',
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-2 px-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="rounded border bg-transparent px-1.5 py-1 text-xs"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="system">Sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 px-2">
          <span className="truncate text-xs" style={{ color: 'var(--text-muted)' }} title={user?.email}>
            {user?.email}
          </span>
          <button onClick={onLogout} className="text-xs font-medium" style={{ color: 'var(--series-2)' }}>
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  )
}
