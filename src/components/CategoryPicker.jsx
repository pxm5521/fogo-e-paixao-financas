const inputClass =
  'w-full rounded-md border bg-transparent px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1'

export default function CategoryPicker({ tipo, categorias, categoriaId, subcategoriaId, onChange }) {
  const options = categorias.filter((c) => c.tipos?.includes(tipo))
  const selected = options.find((c) => c.id === categoriaId)
  const subOptions = selected?.subcategorias ?? []

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row">
      <select
        className={inputClass}
        style={{ borderColor: 'var(--border)' }}
        value={categoriaId ?? ''}
        onChange={(e) => onChange({ categoriaId: e.target.value || null, subcategoriaId: null })}
      >
        <option value="">Categoria…</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        className={inputClass}
        style={{ borderColor: 'var(--border)' }}
        value={subcategoriaId ?? ''}
        disabled={!selected}
        onChange={(e) => onChange({ categoriaId, subcategoriaId: e.target.value || null })}
      >
        <option value="">Subcategoria…</option>
        {subOptions.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
