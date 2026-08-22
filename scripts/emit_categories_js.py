import json

data = json.load(open("categories_data.json", encoding="utf-8"))


def esc(s):
    return s.replace("\\", "\\\\").replace("'", "\\'")


lines = []
lines.append("// Taxonomia de categorias/subcategorias do Bloco Fogo e Paixão.")
lines.append("// Gerada diretamente das colunas Tipo (=categoria) e Classe (=subcategoria)")
lines.append('// da planilha "Saldo em Conta FP v.xlsx" (aba ExtratoNu) — a pedido do Pedro,')
lines.append("// para manter os mesmos nomes que ele já usava, em vez de uma reorganização")
lines.append('// nova. Isto é só a "semente": no app, categorias ficam no Firestore (coleção')
lines.append("// `categories`) e podem ser editadas/renomeadas/ampliadas por quem estiver")
lines.append("// logado (ver src/pages/Categories.jsx). Os `id` abaixo têm que bater com os")
lines.append("// usados em build/seed_transactions.json / scripts/seed_transactions.json.")
lines.append("")
lines.append("export const DEFAULT_CATEGORIES = [")
for c in data:
    lines.append("  {")
    lines.append(f"    id: '{c['id']}',")
    lines.append(f"    label: '{esc(c['label'])}',")
    tipos = ", ".join(f"'{t}'" for t in c["tipos"])
    lines.append(f"    tipos: [{tipos}],")
    if c["subcategorias"]:
        lines.append("    subcategorias: [")
        for s in c["subcategorias"]:
            lines.append(f"      {{ id: '{s['id']}', label: '{esc(s['label'])}' }},")
        lines.append("    ],")
    else:
        lines.append("    subcategorias: [],")
    lines.append("  },")
lines.append("]")
lines.append("")
lines.append("export function findCategory(categoryId) {")
lines.append("  return DEFAULT_CATEGORIES.find((c) => c.id === categoryId)")
lines.append("}")
lines.append("")
lines.append("export function findSubcategory(categoryId, subcategoryId) {")
lines.append("  const cat = findCategory(categoryId)")
lines.append("  return cat?.subcategorias.find((s) => s.id === subcategoryId)")
lines.append("}")
lines.append("")
lines.append("export function categoryLabel(categoryId) {")
lines.append("  return findCategory(categoryId)?.label ?? categoryId")
lines.append("}")
lines.append("")
lines.append("export function subcategoryLabel(categoryId, subcategoryId) {")
lines.append("  return findSubcategory(categoryId, subcategoryId)?.label ?? subcategoryId")
lines.append("}")
lines.append("")
lines.append("export function categoriesForTipo(tipo) {")
lines.append("  return DEFAULT_CATEGORIES.filter((c) => c.tipos.includes(tipo))")
lines.append("}")

out = "\n".join(lines) + "\n"
with open("categories.generated.js", "w", encoding="utf-8") as f:
    f.write(out)
print("wrote", len(lines), "lines")
