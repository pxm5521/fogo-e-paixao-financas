import { useMemo, useState } from 'react'
import Card from '../components/Card'
import { useCategories, useTransactions } from '../hooks/useFirestoreData'
import { upsertCategory, deleteCategory, bulkUpsertTransactions } from '../lib/firestoreApi'
import { normalizeLabel } from '../lib/analytics'

const inputClass = 'rounded-md border bg-transparent px-2.5 py-1.5 text-sm'

function slugify(label) {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default function Categories() {
  const { categories, loading } = useCategories(true)
  const { transactions } = useTransactions(true)
  const [newCat, setNewCat] = useState({ label: '', receita: false, despesa: true })

  // Quantos lançamentos usam cada categoria/subcategoria — só para mostrar
  // o efeito de uma edição ou exclusão antes de você confirmar. Como os
  // lançamentos guardam apenas o ID da categoria (não o nome), renomear uma
  // categoria ou subcategoria aqui já atualiza o nome em todo o site — no
  // Resumo, em Lançamentos, em A revisar — automaticamente, sem precisar
  // editar lançamento por lançamento.
  const usage = useMemo(() => {
    const porCategoria = new Map()
    const porSubcategoria = new Map()
    for (const t of transactions) {
      if (!t.categoriaId) continue
      porCategoria.set(t.categoriaId, (porCategoria.get(t.categoriaId) ?? 0) + 1)
      if (t.subcategoriaId) {
        const key = `${t.categoriaId}|${t.subcategoriaId}`
        porSubcategoria.set(key, (porSubcategoria.get(key) ?? 0) + 1)
      }
    }
    return { porCategoria, porSubcategoria }
  }, [transactions])

  // Duas categorias com o mesmo nome (ignorando maiúscula/acento) — pode
  // acontecer ao renomear uma categoria pra um nome que já existia em outra.
  // Cada uma continua sendo um registro separado no banco (com sua própria
  // lista de subcategorias e seus próprios lançamentos apontando pra ela),
  // então aparecem duplicadas até você mesclar.
  const duplicateGroups = useMemo(() => {
    const byKey = new Map()
    for (const cat of categories) {
      const key = normalizeLabel(cat.label)
      if (!byKey.has(key)) byKey.set(key, [])
      byKey.get(key).push(cat)
    }
    return Array.from(byKey.values()).filter((group) => group.length > 1)
  }, [categories])

  // Mescla um grupo de categorias com o mesmo nome numa só: mantém a que tem
  // mais lançamentos (menos coisa pra repontar), junta as listas de
  // subcategorias (uma subcategoria com o mesmo nome nas duas vira uma linha
  // só — os lançamentos que apontavam pra versão antiga passam a apontar pra
  // essa), e por fim apaga as categorias que sobraram.
  async function handleMerge(group) {
    const withCount = group
      .map((cat) => ({ cat, count: usage.porCategoria.get(cat.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
    const keep = withCount[0].cat
    const drops = withCount.slice(1).map((x) => x.cat)

    const subcategorias = [...(keep.subcategorias ?? [])]
    const subKeyIndex = new Map(subcategorias.map((s) => [normalizeLabel(s.label), s.id]))
    const usedIds = new Set(subcategorias.map((s) => s.id))
    const subcategoriaIdRemap = new Map() // "categoriaAntigaId::subcategoriaAntigaId" -> novo id (dentro de `keep`)

    for (const drop of drops) {
      for (const sub of drop.subcategorias ?? []) {
        const key = normalizeLabel(sub.label)
        if (subKeyIndex.has(key)) {
          subcategoriaIdRemap.set(`${drop.id}::${sub.id}`, subKeyIndex.get(key))
        } else {
          let newId = sub.id
          if (usedIds.has(newId)) newId = `${drop.id}-${newId}`
          subcategorias.push({ id: newId, label: sub.label })
          usedIds.add(newId)
          subKeyIndex.set(key, newId)
          subcategoriaIdRemap.set(`${drop.id}::${sub.id}`, newId)
        }
      }
    }

    const tipos = Array.from(new Set([...(keep.tipos ?? []), ...drops.flatMap((d) => d.tipos ?? [])]))
    const dropIds = new Set(drops.map((d) => d.id))
    const affected = transactions.filter((t) => dropIds.has(t.categoriaId))

    if (
      !confirm(
        `Mesclar ${group.length} categorias "${keep.label}" numa só? ${affected.length} lançamento(s) serão movidos para a categoria que ficar. Essa ação não pode ser desfeita.`,
      )
    )
      return

    await upsertCategory({ ...keep, subcategorias, tipos })
    if (affected.length > 0) {
      await bulkUpsertTransactions(
        affected.map((t) => ({
          id: t.id,
          categoriaId: keep.id,
          subcategoriaId: t.subcategoriaId
            ? (subcategoriaIdRemap.get(`${t.categoriaId}::${t.subcategoriaId}`) ?? null)
            : t.subcategoriaId,
        })),
      )
    }
    for (const drop of drops) await deleteCategory(drop.id)
  }

  async function handleAddCategory(e) {
    e.preventDefault()
    if (!newCat.label.trim()) return
    const tipos = [newCat.receita && 'receita', newCat.despesa && 'despesa'].filter(Boolean)
    if (tipos.length === 0) return
    const id = slugify(newCat.label)
    await upsertCategory({ id, label: newCat.label.trim(), tipos, subcategorias: [] })
    setNewCat({ label: '', receita: false, despesa: true })
  }

  async function handleRenameCategory(cat, { label, tipos }) {
    await upsertCategory({ ...cat, label, tipos })
  }

  async function handleAddSubcategory(cat, label) {
    if (!label.trim()) return
    const sub = { id: slugify(label), label: label.trim() }
    await upsertCategory({ ...cat, subcategorias: [...(cat.subcategorias ?? []), sub] })
  }

  async function handleRenameSubcategory(cat, subId, label) {
    await upsertCategory({
      ...cat,
      subcategorias: cat.subcategorias.map((s) => (s.id === subId ? { ...s, label } : s)),
    })
  }

  async function handleRemoveSubcategory(cat, subId) {
    const count = usage.porSubcategoria.get(`${cat.id}|${subId}`) ?? 0
    const sub = cat.subcategorias.find((s) => s.id === subId)
    const aviso =
      count > 0
        ? `${count} lançamento(s) usam a subcategoria "${sub?.label}". Se remover, eles continuam com a categoria "${cat.label}", mas ficam sem subcategoria. `
        : ''
    if (!confirm(`${aviso}Remover a subcategoria "${sub?.label}"?`)) return
    await upsertCategory({ ...cat, subcategorias: cat.subcategorias.filter((s) => s.id !== subId) })
  }

  async function handleDeleteCategory(cat) {
    const count = usage.porCategoria.get(cat.id) ?? 0
    const aviso =
      count > 0
        ? `${count} lançamento(s) usam a categoria "${cat.label}". Se excluir, eles ficam com uma categoria inválida (vão aparecer como "sem categoria" até você recategorizá-los). `
        : ''
    if (!confirm(`${aviso}Excluir a categoria "${cat.label}"?`)) return
    await deleteCategory(cat.id)
  }

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Carregando…</p>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Categorias</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Organize categorias e subcategorias de receitas e despesas. Renomear aqui atualiza o nome em
          todos os lançamentos que já usam essa categoria — não precisa editar um por um.
        </p>
      </div>

      {duplicateGroups.length > 0 && (
        <Card title="Categorias duplicadas">
          <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Essas categorias têm o mesmo nome (geralmente acontece ao renomear uma categoria pra um
            nome que já existia). Mesclar junta as subcategorias das duas numa lista só e move os
            lançamentos pra ficar tudo numa categoria única.
          </p>
          <div className="flex flex-col gap-2">
            {duplicateGroups.map((group) => (
              <div
                key={group.map((c) => c.id).join('|')}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--status-warning)' }}
              >
                <span>
                  <strong>{group[0].label}</strong> aparece {group.length} vezes (
                  {group.map((c) => `${(c.subcategorias ?? []).length} subcategoria(s)`).join(' + ')})
                </span>
                <button
                  onClick={() => handleMerge(group)}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                  style={{ background: 'var(--series-1)' }}
                >
                  Mesclar em uma só
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Nova categoria">
        <form onSubmit={handleAddCategory} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Nome da categoria"
            value={newCat.label}
            onChange={(e) => setNewCat((c) => ({ ...c, label: e.target.value }))}
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={newCat.receita}
              onChange={(e) => setNewCat((c) => ({ ...c, receita: e.target.checked }))}
            />
            Receita
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={newCat.despesa}
              onChange={(e) => setNewCat((c) => ({ ...c, despesa: e.target.checked }))}
            />
            Despesa
          </label>
          <button type="submit" className="rounded-md px-3 py-1.5 text-sm font-medium text-white" style={{ background: 'var(--series-1)' }}>
            Adicionar
          </button>
        </form>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            cat={cat}
            usage={usage}
            onRename={handleRenameCategory}
            onAddSub={handleAddSubcategory}
            onRenameSub={handleRenameSubcategory}
            onRemoveSub={handleRemoveSubcategory}
            onDelete={handleDeleteCategory}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryCard({ cat, usage, onRename, onAddSub, onRenameSub, onRemoveSub, onDelete }) {
  const [subLabel, setSubLabel] = useState('')
  const [editing, setEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(cat.label)
  const [editTipos, setEditTipos] = useState({
    receita: cat.tipos?.includes('receita') ?? false,
    despesa: cat.tipos?.includes('despesa') ?? false,
  })
  const countCategoria = usage.porCategoria.get(cat.id) ?? 0

  function startEdit() {
    setEditLabel(cat.label)
    setEditTipos({
      receita: cat.tipos?.includes('receita') ?? false,
      despesa: cat.tipos?.includes('despesa') ?? false,
    })
    setEditing(true)
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editLabel.trim()) return
    const tipos = [editTipos.receita && 'receita', editTipos.despesa && 'despesa'].filter(Boolean)
    if (tipos.length === 0) return
    await onRename(cat, { label: editLabel.trim(), tipos })
    setEditing(false)
  }

  return (
    <Card>
      {editing ? (
        <form onSubmit={saveEdit} className="mb-3 flex flex-col gap-2">
          <input
            type="text"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            className={inputClass}
            style={{ borderColor: 'var(--border)' }}
            autoFocus
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={editTipos.receita}
                onChange={(e) => setEditTipos((t) => ({ ...t, receita: e.target.checked }))}
              />
              Receita
            </label>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={editTipos.despesa}
                onChange={(e) => setEditTipos((t) => ({ ...t, despesa: e.target.checked }))}
              />
              Despesa
            </label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-md px-3 py-1 text-xs font-medium text-white" style={{ background: 'var(--series-1)' }}>
              Salvar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-2 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold">{cat.label}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {cat.tipos?.join(' · ')}
              {countCategoria > 0 && ` · ${countCategoria} lançamento(s)`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={startEdit} className="text-xs font-medium" style={{ color: 'var(--series-1)' }}>
              Editar
            </button>
            <button onClick={() => onDelete(cat)} className="text-xs font-medium" style={{ color: 'var(--status-critical)' }}>
              Excluir
            </button>
          </div>
        </div>
      )}

      <ul className="mb-2 flex flex-col gap-1">
        {(cat.subcategorias ?? []).map((s) => (
          <SubcategoryRow
            key={s.id}
            cat={cat}
            sub={s}
            count={usage.porSubcategoria.get(`${cat.id}|${s.id}`) ?? 0}
            onRename={onRenameSub}
            onRemove={onRemoveSub}
          />
        ))}
        {(cat.subcategorias ?? []).length === 0 && (
          <li className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Nenhuma subcategoria.
          </li>
        )}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onAddSub(cat, subLabel)
          setSubLabel('')
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Nova subcategoria"
          value={subLabel}
          onChange={(e) => setSubLabel(e.target.value)}
          className="flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
          style={{ borderColor: 'var(--border)' }}
        />
        <button type="submit" className="text-sm font-medium" style={{ color: 'var(--series-1)' }}>
          + adicionar
        </button>
      </form>
    </Card>
  )
}

function SubcategoryRow({ cat, sub, count, onRename, onRemove }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(sub.label)

  async function save(e) {
    e.preventDefault()
    if (!label.trim()) return
    await onRename(cat, sub.id, label.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <li>
        <form onSubmit={save} className="flex items-center gap-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="flex-1 rounded-md border bg-transparent px-2 py-1 text-sm"
            style={{ borderColor: 'var(--border)' }}
            autoFocus
          />
          <button type="submit" className="text-xs font-medium" style={{ color: 'var(--series-1)' }}>
            salvar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>
            cancelar
          </button>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
      <span>
        {sub.label}
        {count > 0 && (
          <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            ({count})
          </span>
        )}
      </span>
      <span className="flex gap-2 text-xs">
        <button onClick={() => setEditing(true)} style={{ color: 'var(--series-1)' }}>
          editar
        </button>
        <button onClick={() => onRemove(cat, sub.id)} style={{ color: 'var(--text-muted)' }}>
          remover
        </button>
      </span>
    </li>
  )
}
