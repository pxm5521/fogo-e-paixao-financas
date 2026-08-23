import { useEffect, useState } from 'react'

function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function displayToIso(display) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display)
  if (!match) return null
  const [, d, m, y] = match
  const day = Number(d)
  const month = Number(m)
  const year = Number(y)
  if (month < 1 || month > 12) return null
  const daysInMonth = new Date(year, month, 0).getDate()
  if (day < 1 || day > daysInMonth) return null
  return `${y}-${m}-${d}`
}

// Só deixa dígitos e insere as barras sozinho (DD/MM/AAAA), enquanto digita.
function maskDigits(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  const parts = []
  if (digits.length > 0) parts.push(digits.slice(0, 2))
  if (digits.length > 2) parts.push(digits.slice(2, 4))
  if (digits.length > 4) parts.push(digits.slice(4, 8))
  return parts.join('/')
}

// Campo de data no formato DD/MM/AAAA — em vez do <input type="date">
// nativo, cujo formato de exibição (e o layout do calendário) depende do
// idioma/região configurados no navegador de quem está usando o site. Aqui
// fica sempre igual, não importa a máquina. `value`/`onChange` continuam
// trabalhando com data ISO (AAAA-MM-DD), igual antes — só a exibição/digitação
// muda.
export default function DateInput({ value, onChange, className, style, required, placeholder }) {
  const [text, setText] = useState(() => isoToDisplay(value))

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  function handleChange(e) {
    const masked = maskDigits(e.target.value)
    setText(masked)
    if (masked.length === 10) {
      const iso = displayToIso(masked)
      if (iso) onChange(iso)
    } else if (masked === '') {
      onChange('')
    }
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder ?? 'DD/MM/AAAA'}
      pattern="\d{2}/\d{2}/\d{4}"
      maxLength={10}
      value={text}
      onChange={handleChange}
      className={className}
      style={style}
      required={required}
    />
  )
}
