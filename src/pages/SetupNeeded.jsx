export default function SetupNeeded() {
  return (
    <div className="mx-auto flex h-screen max-w-xl flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">Configuração do Firebase pendente</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Este site precisa de um projeto Firebase para guardar os lançamentos. Copie{' '}
        <code>.env.example</code> para <code>.env</code>, preencha com as chaves do seu
        projeto e reinicie o servidor. O passo a passo completo está em{' '}
        <code>SETUP.md</code>.
      </p>
    </div>
  )
}
