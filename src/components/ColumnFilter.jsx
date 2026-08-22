import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function normalize(s) {
  if (s == null) return ''
  return String(s)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

const PANEL_WIDTH = 240

// Dropdown de filtro multi-seleção para o cabeçalho de uma coluna (ou uma
// barra de filtros): busca, lista ordenada alfabeticamente, botão "Limpar"
// no topo do painel. `options` é [{ value, label }], já ordenado por quem
// chama (cada coluna decide o critério de ordenação — alfabético, por data,
// por valor…).
//
// O painel é renderizado num portal (direto no <body>), com posição fixa
// calculada a partir do botão — assim ele nunca fica cortado por uma tabela
// com scroll próprio (uma coluna com `overflow: auto` corta qualquer coisa
// posicionada normalmente dentro dela, mesmo se essa coisa "deveria" ficar
// por cima).
//
// Fica aberto entre um clique e outro de propósito (pra dar pra marcar
// várias opções seguidas). Pra fechar: clique em qualquer lugar fora dele
// (tem um fundo invisível cobrindo o resto da tela só pra isso), aperte Esc,
// ou use o botão "Fechar" dentro do painel.
export default function ColumnFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [coords, setCoords] = useState(null)
  const buttonRef = useRef(null)

  function updateCoords() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)
    setCoords({ top: rect.bottom + 4, left: Math.max(8, left) })
  }

  function open_() {
    updateCoords()
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setSearch('')
  }

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') close()
    }
    // capture:true também pega scroll de containers internos (não só da
    // janela), que não borbulham como evento normal.
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filteredOptions = useMemo(() => {
    const term = normalize(search)
    return term ? options.filter((o) => normalize(o.label).includes(term)) : options
  }, [options, search])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const active = selectedSet.size > 0

  function toggle(value) {
    const next = new Set(selectedSet)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(Array.from(next))
  }

  function clear() {
    onChange([])
  }

  return (
    <div className="inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (open ? close() : open_())}
        className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium normal-case"
        style={{
          borderColor: active ? 'var(--series-1)' : 'var(--border)',
          color: active ? 'var(--series-1)' : 'var(--text-muted)',
        }}
      >
        <span>{label}</span>
        {active && (
          <span
            className="rounded-full px-1.5 text-[10px] font-semibold text-white"
            style={{ background: 'var(--series-1)' }}
          >
            {selectedSet.size}
          </span>
        )}
        <svg width="9" height="9" viewBox="0 0 10 6" fill="none" style={{ opacity: 0.6 }}>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open &&
        coords &&
        createPortal(
          <>
            {/* Fundo invisível cobrindo a tela inteira: clicar em qualquer
                lugar fora do painel fecha o filtro. */}
            <button
              type="button"
              aria-label="Fechar filtro"
              onClick={close}
              className="fixed inset-0 z-40 cursor-default"
              style={{ background: 'transparent' }}
            />
            <div
              className="fixed z-50 w-60 rounded-md border p-2 shadow-lg"
              style={{ top: coords.top, left: coords.left, borderColor: 'var(--border)', background: 'var(--surface-1)' }}
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Procurar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded-md border bg-transparent px-2 py-1 text-xs"
                  style={{ borderColor: 'var(--border)' }}
                />
                <button
                  type="button"
                  onClick={clear}
                  disabled={!active}
                  className="shrink-0 text-xs font-medium underline disabled:opacity-40 disabled:no-underline"
                  style={{ color: 'var(--series-2)' }}
                >
                  Limpar
                </button>
              </div>
              <div className="max-h-56 overflow-auto">
                {filteredOptions.length === 0 && (
                  <p className="px-1 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Nada encontrado.
                  </p>
                )}
                {filteredOptions.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <input type="checkbox" checked={selectedSet.has(o.value)} onChange={() => toggle(o.value)} />
                    <span className="truncate">{o.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={close}
                className="mt-2 w-full rounded-md border py-1 text-xs font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Fechar
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
