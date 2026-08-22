export default function Login({ onLogin }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Fogo e Paixão · Finanças</h1>
        <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>
          Controle de receitas e despesas do bloco.
        </p>
      </div>
      <button
        onClick={onLogin}
        className="rounded-md px-5 py-2.5 text-sm font-medium text-white shadow-sm"
        style={{ background: 'var(--series-1)' }}
      >
        Entrar com Google
      </button>
    </div>
  )
}
