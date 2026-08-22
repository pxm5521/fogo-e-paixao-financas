# Fogo e Paixão · Finanças

Site para controlar as finanças do Bloco Fogo e Paixão: importar o extrato do
Nubank, categorizar receitas e despesas, e acompanhar tudo em um painel com
gráficos.

- **Front-end:** React + Vite + Tailwind, hospedado de graça no **Netlify**.
- **Banco de dados:** **Firebase** (Firestore + Authentication com login Google).
- **Código-fonte:** pensado para viver no **GitHub** (deploy contínuo: todo
  `git push` gera um novo deploy no Netlify).

Todo o processamento de CSV e os cálculos do painel rodam no navegador; não há
servidor próprio além do Firebase.

## Primeiros passos

Siga o **[SETUP.md](./SETUP.md)** — ele tem o passo a passo completo (criar o
projeto Firebase, publicar as regras de segurança, subir para o GitHub e
publicar no Netlify) e também como rodar localmente:

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Firebase
npm run dev
```

## Estrutura

```
src/
  lib/            Firebase, acesso ao Firestore, categorias, importador de CSV, cálculos do painel
  hooks/          hooks de dados (transações, categorias, configurações) e autenticação
  components/     componentes de UI reutilizáveis (inclui os gráficos)
  pages/          uma página por rota (Resumo, Importar, A revisar, Lançamentos, Categorias, Configurações)
scripts/
  import-seed.mjs         importa o histórico (2021-2026) extraído da planilha para o Firestore
  seed_transactions.json  esse histórico já processado (ver SETUP.md)
firestore.rules   regra de segurança (só e-mails autorizados acessam os dados)
```

## Limitações conhecidas

- A importação do histórico da planilha usa uma classificação automática por
  palavras-chave; cerca de 12% dos lançamentos antigos não puderam ser
  classificados com confiança e ficam marcados como "A revisar".
- O saldo calculado no painel é a soma dos lançamentos cadastrados a partir de
  um saldo inicial que você define em Configurações — ele não é buscado
  automaticamente do banco.
