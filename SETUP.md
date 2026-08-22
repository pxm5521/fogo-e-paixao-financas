# Guia de instalação — Firebase + GitHub + Netlify

Este guia assume que você nunca configurou nenhum dos três. São uns 20-30
minutos na primeira vez; leia até o fim antes de começar.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e clique em **"Criar projeto"**.
2. Dê um nome (ex.: `fogo-e-paixao-financas`) e siga o assistente (pode
   desativar o Google Analytics, não é necessário).
3. Dentro do projeto, no menu à esquerda, vá em **Build > Authentication** >
   **Get started**. Na aba **Sign-in method**, ative o provedor **Google**.
4. Vá em **Build > Firestore Database** > **Create database**. Escolha uma
   região (ex.: `southamerica-east1` para o Brasil) e comece em **modo de
   produção** (as regras de segurança deste projeto já cuidam do acesso).
5. Vá em **Configurações do projeto** (ícone de engrenagem) > aba **Geral** >
   role até **"Seus apps"** > clique no ícone **`</>`** (Web) para registrar um
   app. Dê um nome e **não** marque Firebase Hosting (vamos usar o Netlify).
6. Copie os valores de `firebaseConfig` que aparecem na tela — você vai usar
   no passo 3.

## 2. Autorizar seu e-mail

Edite dois arquivos deste projeto com o e-mail do Google que você vai usar
para logar:

- **`firestore.rules`**: troque `'seu-email@gmail.com'` pelo(s) e-mail(s)
  reais (pode listar mais de um, separados por vírgula, se outra pessoa do
  bloco também for usar o site).
- **`.env`** (próximo passo): a variável `VITE_ALLOWED_EMAILS`.

Os dois precisam bater — o `.env` controla o que a interface mostra, mas
quem realmente impede acesso de gente não autorizada é o `firestore.rules`.

Publique as regras (precisa da Firebase CLI):

```bash
npm install -g firebase-tools
firebase login
firebase use --add        # escolha o projeto que você criou
firebase deploy --only firestore:rules
```

## 3. Configurar as variáveis de ambiente

```bash
cp .env.example .env
```

Abra `.env` e preencha com os valores do `firebaseConfig` copiados no passo
1.6, e a lista de e-mails autorizados:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ALLOWED_EMAILS=seu-email@gmail.com
```

Teste local:

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (ex. `http://localhost:5173`), entre com Google
e confira se carrega o painel (vazio, ainda sem lançamentos).

## 4. Importar o histórico (2021-2026) da planilha

Isso só precisa ser feito **uma vez**.

1. No Console do Firebase: **Configurações do projeto > Contas de serviço**
   (Service accounts) > **Gerar nova chave privada**. Um arquivo `.json` será
   baixado.
2. Renomeie/mova esse arquivo para `scripts/serviceAccountKey.json` (esse
   nome já está no `.gitignore`, não vai parar no GitHub).
3. Rode:
   ```bash
   node scripts/import-seed.mjs
   ```
4. Rode também:
   ```bash
   node scripts/sync-categories.mjs
   ```
   Isso grava/atualiza no Firestore a lista de categorias em
   `src/lib/categories.js`. É necessário porque o site só cria as categorias
   padrão sozinho na primeira vez que a coleção está vazia — se você já tinha
   entrado no site antes (com uma versão anterior deste projeto), essa
   coleção já não está mais vazia e precisa ser sincronizada manualmente uma
   vez com este script. Rode `import-seed.mjs` **antes** deste, nessa ordem.
5. Ao final, entre no site (`npm run dev` ou já publicado) e confira o menu
   **"A revisar"**. As categorias e subcategorias do site vieram direto das
   colunas Tipo (=categoria) e Classe (=subcategoria) da sua planilha (mesmos
   nomes que você já usava — ao todo 20 categorias). Só **64 lançamentos
   antigos** (cerca de 2% do total) não tinham Tipo preenchido na planilha e
   por isso caem em "Sem Categoria"/"A revisar". Revise e categorize quando
   puder; enquanto isso eles entram nos totais do painel como "sem
   categoria".

   Use a tela **Categorias** do site (editar/renomear/mesclar) para ajustar
   nomes quando quiser; como o site guarda só o *id* da categoria em cada
   lançamento (não o nome), renomear uma categoria lá atualiza
   automaticamente todos os lançamentos que já usam ela, sem precisar
   reimportar nada.

   Depois desse passo você pode apagar `scripts/serviceAccountKey.json` do
   seu computador — ele não precisa ficar salvo.

   *(Opcional: `scripts/seed_transactions.json` já vem pronto neste projeto.
   Se um dia você quiser reprocessar a planilha original do zero — por
   exemplo depois de editar Classe/Tipo nela —, o script que gerou esse
   arquivo está em `scripts/generate_seed.py` — requer
   `pip install openpyxl` e é chamado com
   `python3 scripts/generate_seed.py caminho/para/sua/planilha.xlsx`. Ele
   também gera `scripts/categories_data.json` com a lista de categorias
   encontradas; se quiser recriar `src/lib/categories.js` a partir disso
   (a lista usada só para *popular* categorias novas no primeiro acesso —
   não afeta quem já foi importado), rode
   `python3 scripts/emit_categories_js.py` na pasta `scripts/` e copie o
   `categories.generated.js` resultante para `src/lib/categories.js`.)*

**Importante:** essa importação já cobre o extrato até **09/06/2026** (a
última data que constava na planilha). O CSV do Nubank de fevereiro/2025 que
você enviou já está incluído nesse histórico — não precisa importá-lo de
novo pelo site. Ao exportar extratos novos do Nubank daqui pra frente, baixe
sempre a partir dessa data (ou de um pouco antes: o importador do site avisa
quando uma linha parece já existir e deixa você desmarcar).

## 5. Subir para o GitHub

```bash
git init
git add .
git commit -m "Site de finanças do Fogo e Paixão"
```

Crie um repositório vazio em https://github.com/new (marque como **privado**
— tem dados financeiros do bloco) e depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/fogo-e-paixao-financas.git
git branch -M main
git push -u origin main
```

## 6. Publicar no Netlify

1. Acesse https://app.netlify.com > **Add new site > Import an existing
   project** > conecte sua conta do GitHub > escolha o repositório.
2. O Netlify já deve detectar as configurações do `netlify.toml`
   (`npm run build`, pasta `dist`). Confirme.
3. Antes de publicar (ou logo depois, em **Site settings > Environment
   variables**), adicione as mesmas variáveis do seu `.env`:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`,
   `VITE_ALLOWED_EMAILS`.
4. Clique em **Deploy**. Depois de pronto, pegue a URL gerada
   (`algumnome.netlify.app`) — pode trocar por um subdomínio melhor em
   **Site settings > Domain management**.
5. Volte ao Console do Firebase > **Authentication > Settings > Authorized
   domains** e adicione o domínio do Netlify (ex.: `algumnome.netlify.app`),
   senão o login com Google não vai funcionar em produção.

Pronto: a cada `git push` para `main`, o Netlify publica uma nova versão
automaticamente.

## Uso no dia a dia

- **Importar extrato**: exporte o CSV do Nubank e envie na aba "Importar
  extrato". O site ignora automaticamente linhas já importadas antes (usa o
  identificador único que o Nubank coloca em cada lançamento) e avisa quando
  uma linha *parece* duplicada (mesma data e valor de outra já existente).
  Cada linha nova já chega com uma **categoria sugerida automaticamente**:
  primeiro tenta pela mesma contraparte ("quem") que você já categorizou
  antes (a fonte mais confiável — melhora sozinha com o uso), e só se não
  achar nada usa um conjunto de palavras-chave genéricas. Dá pra corrigir a
  sugestão ali mesmo na pré-visualização, antes de importar.
- **A revisar**: lançamentos importados chegam aqui com a categoria já
  preenchida (quando o site conseguiu sugerir uma) — é só olhar e clicar em
  "Confirmar", ou ajustar antes de confirmar. Tem um botão para confirmar de
  uma vez todos os que vieram com sugestão automática, depois de dar uma
  olhada geral na lista. Lançamentos sem nenhuma sugestão (contraparte nova e
  sem palavra-chave reconhecida) ficam com "sem sugestão" e precisam de
  categoria manual.
- **Lançamentos**: lista tudo, com busca e filtro; clique em qualquer linha
  para editar ou excluir. O botão "+ Novo lançamento" cadastra algo que não
  veio do banco (dinheiro em espécie, etc).
- **Categorias**: crie, renomeie ou remova categorias e subcategorias.
- **Resumo**: painel com saldo, receitas x despesas por mês, saldo acumulado
  e o ranking de categorias — com filtro por período e por evento/temporada.
