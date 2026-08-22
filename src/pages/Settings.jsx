import { useEffect, useState } from 'react'
import Card from '../components/Card'
import { useSettings } from '../hooks/useFirestoreData'
import { updateSettings } from '../lib/firestoreApi'

export default function Settings() {
  const settings = useSettings(true)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings.saldoInicial !== undefined) setSaldoInicial(String(settings.saldoInicial))
  }, [settings.saldoInicial])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateSettings({ saldoInicial: Number(String(saldoInicial).replace(',', '.')) || 0 })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
      </div>

      <Card title="Saldo inicial">
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          O gráfico de saldo acumulado soma todos os lançamentos a partir deste valor. Use o saldo real
          da conta na data do primeiro lançamento cadastrado, se souber, para o gráfico bater com o
          extrato bancário.
        </p>
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            className="w-40 rounded-md border bg-transparent px-2.5 py-1.5 text-sm"
            style={{ borderColor: 'var(--border)' }}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'var(--series-1)' }}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          {saved && <span className="text-xs" style={{ color: 'var(--status-good-text)' }}>Salvo</span>}
        </form>
      </Card>

      <Card title="Acesso">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Quem pode logar é controlado por <code>VITE_ALLOWED_EMAILS</code> (no build do site) e pelas
          regras em <code>firestore.rules</code> (a proteção real dos dados). Para dar acesso a outra
          pessoa, edite os dois e publique de novo — veja <code>SETUP.md</code>.
        </p>
      </Card>
    </div>
  )
}
