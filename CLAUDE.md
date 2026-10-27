# Pacto — notas para o Claude

Leia antes de qualquer tarefa. **Mantenha este arquivo atualizado:** a cada decisão, regra nova, migration ou mudança de fluxo, edite a seção certa no mesmo PR da mudança. Ideias, bugs e pendências do produto ficam em `docs/ideias.md` (mantenha atualizado também).

## O projeto

PWA de compromisso diário para um grupo de amigos (beta fechado, foco em programação). Cada dia tem 3 metas: **estudo** (foto + minutos + resumo), **digitação** (teste dentro do app, medido pelo servidor) e **leitura** (foto + páginas), mais um projeto opcional. Prazo 23:59 de São Paulo. Dia descumprido vira dívida (cardápio do grupo, padrão 1 Coca + 1 salgado). Provas podem ir a tribunal (voto do grupo). Há juiz IA (Gemini), ranking mensal, baús, sequência e avisos push.

Stack: Next.js 15 (App Router, React 19), Tailwind 4, Supabase (Postgres + RLS + Storage + Auth), Vercel. Código e comentários em inglês; textos da interface e conversa com o usuário em **português do Brasil**.

## Como trabalhar com o usuário

- Ele quer um **conselheiro crítico**: comece pelo que está errado ou faltando, discorda com motivo e alternativa, não cede sem informação nova.
- Marque afirmações com **[Certo]**, **[Provável]** ou **[Chutando]**.
- Nunca use "Ótima pergunta", "Você está absolutamente certo", "Isso faz muito sentido", "Absolutamente", "Definitivamente".
- Ele muitas vezes está no celular: não consegue rodar SQL nem fazer merge na hora. Diga sempre a **ordem** (migration antes do merge) e o que quebra se pular.
- Arquivos para ele: mande pela conversa (zip quando forem vários). Nunca salve no computador dele.
- **Design é do Astra** (diretor de design, outra IA dele). Ideias visuais passam por ele; aqui implementamos os briefs.

## Regras do repositório

- **Nunca push no `main`.** Um branch por mudança, PR pelo `gh api repos/Taw3s/pactus/pulls` (GraphQL é bloqueado). O usuário faz o merge.
- Commits terminam com as linhas de atribuição pedidas pelo ambiente; **nenhum identificador de modelo** em commit, PR ou código.
- PRs em português, com seções "O que muda", "Banco" (se houver migration) e "Testes"; terminam com `🤖 Generated with [Claude Code](https://claude.com/claude-code)` e o link da sessão.
- Depois de abrir o PR: assinar a atividade, comentar **uma vez** sobre o preview da Vercel (veja abaixo) e esperar o "End-to-end" do GitHub ficar verde antes de dizer que pode mergear. Mergear com o E2E rodando já deixou o `main` vermelho uma vez (PR #20).
- **Segredos:** nada de chave no repositório nem na conversa. Use `.env.local` (há `.env.example`). `service_role` só no servidor, nunca `NEXT_PUBLIC_`. O histórico do git foi varrido em 26/10/2026 e está limpo.
- Estilo de código: siga o arquivo ao redor (comentários curtos que explicam o porquê, linhas longas até ~160). Não rode o Prettier com a configuração padrão (80 colunas): ele reformata o arquivo inteiro.

## Banco de dados (Supabase)

- Migrations em `supabase/migrations/NNNN_nome.sql`, rodadas **à mão pelo usuário no SQL Editor**, em ordem. Cada uma confere no início se a anterior foi rodada.
- Toda migration nova precisa: teste em `supabase/tests/*_test.sql` + linha em `supabase/tests/run.sh`; aviso no PR de que deve ser rodada **antes do merge**.
- RPCs `security definer` com `set search_path = public`; grants explícitos; RLS em toda tabela.
- Estado em 27/10/2026: 0001–0015 rodadas em produção (0014 e 0015 entregues para rodar antes do merge do PR #25, já mergeado). A próxima migration é a **0016**.
- Testes do banco: `npm run test:db` (precisa de binários do Postgres 15+; no container da nuvem roda como usuário `postgres` copiando a pasta para um lugar legível).

## Testes

- Unitários: `npm test` (vitest). Também `npm run lint` e `npm run typecheck`.
- E2E: `e2e/run.sh` roda as etapas `a`…`l` em sequência contra um Supabase local descartável, com Gemini e push simulados (veja `e2e/README.md`). As etapas compartilham estado: rode sempre o conjunto inteiro, num banco limpo. `e2e/setup.sql` faz o teste de digitação durar 3 s em vez de 60.
- O CI (`.github/workflows/ci.yml`) roda tudo isso em cada PR: "Lint, types, unit and database tests" e "End-to-end (Playwright + axe)".
- **Preview da Vercel falha em todo PR** desde o #8, antes do build (produção funciona). Causa desconhecida: precisa do log (`npx vercel inspect <deploy> --logs`) que só o usuário consegue. Não é motivo para bloquear PR.
- O ambiente local de E2E montado nas sessões da nuvem fica fora do repositório e se perde entre sessões; sem ele, confie no CI ou monte de novo pelo `e2e/README.md`.

## Mapa rápido do código

- `src/app/(app)/`: telas (hoje, feed, ranking, dividas, historico, checkin/[id], config). `src/app/(auth)/`: login e join (inclui criar desafio).
- `src/lib/ledger.ts`: status do dia, sequência e dívidas (espelha os gatilhos do banco; manter os dois iguais).
- `src/lib/ranking.ts`: pontuação e pódio. `src/lib/debt-items.ts`: cardápio da dívida (ids gravados no banco, não renomear).
- Digitação: `src/components/TypingTest.tsx`, `src/lib/typing.ts`, textos em `src/lib/typing-texts-pt.ts` e `-en.ts` (só prosa, sem símbolos de código; ids gravados no banco, não renomear; inglês começa com `en-`).
- Juiz IA: `src/app/api/review/route.ts` (cada chamada ao Gemini passa por `claim_ai_review`), `src/lib/gemini.ts`.
- Fonte pixel (Pixelify) só para letras: os algarismos 0–9 vêm da Inter por um `@font-face` "Pacto Digits" com `unicode-range` em `globals.css` (na Pixelify, 5 parece S e 3 parece 8). Não tire isso para "ficar mais pixel".
- Identidade jurídica (brief de 26/10, passo 1): provas enviadas são documentos numa pasta (`doc-tab`, aba vinho de 8 px; etiqueta de papel `paper-label` "Prova enviada"; cabeçalho da prova com o sprite `evidenceFolder`), e cada item de dívida recebido vira um recibo (`receipt`, papel creme com texto escuro). Tokens `folder`, `paper`, `on-paper` em `globals.css`. Papel só em detalhes, sempre com texto escuro; nada de número processual, assinatura ou selo oficial. Próximos passos do brief (Perfil como arquivo, cena de entrada, autoria dos selos) só depois da revisão dos prints.
- Sprites low poly: `tools/lowpoly/models.js` + `render.mjs` (PNG 48×48 em `public/lowpoly`, sempre em escala inteira). Juiz animado: `src/lib/judge.ts`.
- Logo e ícones do app: o busto do juiz low poly (sobrancelha erguida, desconfiado) sobre o amarelo `#ffcd38`, gerado por `tools/lowpoly/icons.mjs` em `public/icons`. A identidade é low poly, não pixel art: não desenhe a logo em grade de pixels (a v1 assim foi recusada).
- Guia do juiz (perguntas fixas): `src/lib/guide.ts` — atualize quando mudar uma regra.

## Decisões que não se rediscutem

- Digitação: teste no app, 3 tentativas por dia, vale o melhor (qualquer duração, idioma ou modo); recordes separados por aparelho, modo, idioma e duração. Backspace numa palavra vazia volta para a anterior só se ela estiver errada (como no Monkeytype); o resultado conta as palavras finais.
- Dívida: cardápio de 1 ou 2 itens; só o dono troca; vale a partir da segunda seguinte; dias passados mantêm os itens antigos.
- Qualquer pessoa sem grupo cria um desafio; uma pessoa, um grupo.
- Provas não podem ser editadas; a prova de digitação mostra o cartão do melhor teste do dia, desenhado na hora.
