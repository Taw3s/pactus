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
- Depois de abrir o PR: assinar a atividade, passar ao usuário o link do preview da Vercel (para testar no celular) e esperar o "End-to-end" do GitHub ficar verde antes de dizer que pode mergear. Mergear com o E2E rodando já deixou o `main` vermelho uma vez (PR #20).
- **Segredos:** nada de chave no repositório nem na conversa. Use `.env.local` (há `.env.example`). `service_role` só no servidor, nunca `NEXT_PUBLIC_`. O histórico do git foi varrido em 26/10/2026 e está limpo.
- Estilo de código: siga o arquivo ao redor (comentários curtos que explicam o porquê, linhas longas até ~160). Não rode o Prettier com a configuração padrão (80 colunas): ele reformata o arquivo inteiro.

## Banco de dados (Supabase)

- Migrations em `supabase/migrations/NNNN_nome.sql`, rodadas **à mão pelo usuário no SQL Editor**, em ordem. Cada uma confere no início se a anterior foi rodada.
- Toda migration nova precisa: teste em `supabase/tests/*_test.sql` + linha em `supabase/tests/run.sh`; aviso no PR de que deve ser rodada **antes do merge**.
- RPCs `security definer` com `set search_path = public`; grants explícitos; RLS em toda tabela.
- Estado em 28/10/2026: 0001–0018 rodadas em produção. A próxima é a 0019.
- Consultas avulsas (só leitura, não são migrations): `supabase/queries/`. Retenção semana a semana do grupo: `retention.sql`, que conta quem saiu pelo `membership_log` (0018): cada passagem por um grupo guarda entrada, saída e as semanas com prova, sem ligação com a conta depois da saída; o cron diário apaga um ano depois. Quem saiu antes da 0018 não aparece.
- Testes do banco: `npm run test:db` (precisa de binários do Postgres 15+; no container da nuvem roda como usuário `postgres` copiando a pasta para um lugar legível).

## Testes

- Unitários: `npm test` (vitest). Também `npm run lint` e `npm run typecheck`.
- E2E: `e2e/run.sh` roda as etapas `a`…`o` em sequência contra um Supabase local descartável, com Gemini e push simulados (veja `e2e/README.md`). As etapas compartilham estado: rode sempre o conjunto inteiro, num banco limpo. `e2e/setup.sql` faz o teste de digitação durar 3 s em vez de 60.
- O CI (`.github/workflows/ci.yml`) roda tudo isso em cada PR: "Lint, types, unit and database tests" e "End-to-end (Playwright + axe)".
- **Domínio e e-mail** (28/10): `pactus.dev.br` no registro.br (DNS do próprio registro.br, modo avançado); na Vercel o principal é `https://www.pactus.dev.br` e o sem `www` redireciona. Use esse endereço em `NEXT_PUBLIC_SITE_URL` e no Supabase (Site URL, Redirect URLs). E-mail pelo Resend (região São Paulo); a chave fica só no painel do Supabase. O SMTP padrão do Supabase só entrega para a equipe do projeto.
- **Preview da Vercel**: abre em cada PR (corrigido em 28/10). Do #8 ao #39 falhava em 3 s, antes do build, porque o `CRON_SECRET` do ambiente Preview tinha acentos (a Vercel só aceita ASCII visível em variáveis usadas como cabeçalho). Variável nova na Vercel: só ASCII, sem acento nem aspas curvas. `CRON_SECRET` precisa existir em Production e em Preview: sem ele, as rotas `/api/cron/*` ficam abertas (a checagem só roda se a variável existir; Production ficou sem até 28/10). Se o preview voltar a falhar, peça ao usuário o print do erro do deployment (o log só ele vê).
- Auditoria responsiva: `e2e/responsive-audit.mjs` (veja `e2e/README.md`), rodada à mão depois de mudanças de layout. Nomes e textos quebram linha (`break-words`, `hyphens-auto`), nunca `truncate`: nomes longos já quebraram o Feed e o tribunal.
- O ambiente local de E2E montado nas sessões da nuvem fica fora do repositório e se perde entre sessões; sem ele, confie no CI ou monte de novo pelo `e2e/README.md`. No container da nuvem: o Docker não sobe sozinho (rode `dockerd` em segundo plano), o Supabase CLI instala por `npm i supabase` numa pasta temporária e o Chromium já vem em `/opt/pw-browsers` (`CHROMIUM_PATH`). Antes de rodar o E2E de novo, pare o `next-server` antigo (ele não morre com `pkill -x`): um servidor velho serve CSS de outro build e as checagens de layout falham. Cada `newContext` do Playwright tem o próprio `localStorage`, como um aparelho novo.

## Mapa rápido do código

- `src/app/(app)/`: telas (hoje, feed, ranking, dividas, historico, checkin/[id], config). `src/app/(auth)/`: login e join (inclui criar desafio).
- Apresentação pública (rodada 4, peça 1): `src/app/page.tsx` em `/`, sem dado de grupo nem números. Visitante vê "Criar um desafio" (`/join?criar=1`) e "Tenho um código de convite"; membro vê só "Ir para meu desafio" (uma pessoa, um grupo); logado sem grupo vai direto para `/join?step=code`. `/` é pública por `isPublicPath` em `src/lib/supabase/middleware.ts` (só o caminho exato; teste em `middleware.test.ts` e na etapa `n` do E2E). O PWA instalado continua abrindo em `/hoje` (`start_url`). Não publicar tempos mínimos das metas na apresentação.
- Primeiros passos e convite (rodada 4, peça 2): `src/components/FirstSteps.tsx` entre o PageHeader e o placar da Hoje, para quem ainda não tem prova das 3 metas ou entrou há até 7 dias (ou `?primeiros=1`, link "Rever primeiros passos" no guia). Copiar/entender/recolher/fechar ficam no `localStorage` (`pacto:first-steps:<user>:<group>`, com reserva em memória); a primeira prova vem do servidor (projeto não conta). Link de convite `/join?convite=CODIGO` (`src/lib/invite.ts`): só o código, conferido por `check_invite_code`/`join_group` como o digitado; atravessa o cadastro por e-mail (metadado `invite_code`, como antes), o Google (`GoogleButton next`) e o login (`/login?next=`, só caminhos do próprio site). Copiar é "Link copiado", nunca "amigos convidados".
- `src/lib/ledger.ts`: status do dia, sequência e dívidas (espelha os gatilhos do banco; manter os dois iguais).
- `src/lib/ranking.ts`: pontuação e pódio. `src/lib/debt-items.ts`: cardápio da dívida (ids gravados no banco, não renomear).
- Digitação: `src/components/TypingTest.tsx`, `src/lib/typing.ts`, textos em `src/lib/typing-texts-pt.ts` e `-en.ts` (só prosa, sem símbolos de código; ids gravados no banco, não renomear; inglês começa com `en-`).
- Fotos: a prova guarda as fotos grandes por 30 dias; depois fica só a miniatura da primeira (`src/lib/media-retention.ts`, rodado pelo cron diário `/api/cron/remind`, porque o plano grátis da Vercel só tem 2 crons). A página da prova mostra a miniatura e avisa.
- Privacidade e termos: `src/app/(legal)/privacidade` e `termos` (públicas, ligadas no login e em Configurações). O texto descreve o que o código guarda e manda para fora: **ao coletar um dado novo ou usar um serviço novo (Sentry, analytics, e-mail), atualize a política no mesmo PR** e a data em `src/lib/legal.ts`. Nome e e-mail do responsável vêm de `NEXT_PUBLIC_CONTROLLER_NAME` e `NEXT_PUBLIC_CONTACT_EMAIL`. Texto conferido com a LGPD, o CDC e o Marco Civil no repositório `ctresb/leis` (`federal/leis-ordinarias/2018/lei-13709-2018-08-14.md` etc.): cite artigos de lá, não de memória. Termos não podem limitar a responsabilidade do fornecedor (CDC, arts. 25 e 51, I). O juiz IA usa o **plano gratuito** da API Gemini (decisão de 28/10/2026), e a política diz isso com todas as letras: o Google pode usar fotos e respostas para melhorar os produtos dele, com revisão humana. Se ativar o faturamento, troque o texto no mesmo dia.
- Apoiar (28/10/2026): `/apoiar` em `src/app/(legal)/apoiar`, pública. **Doação pura** pelo Apoia-se: quem apoia não ganha nada no app (nem selo, ponto ou ranking), para o dinheiro não entrar no jogo do grupo. O link vem de `NEXT_PUBLIC_SUPPORT_URL` (`src/lib/support.ts`); vazio, a página diz que o apoio ainda não está no ar e os links no rodapé de `/` e em Configurações somem. O texto diz para onde vai o dinheiro: se isso mudar (ex.: Gemini pago ativado), atualize a página. Visual (rodada 5 do Astra): juiz parado em `present6` a 96 px, acima do título no celular e à direita da introdução a partir de 768 px; botão "Apoiar pelo Apoia-se" com a nota "Apoio voluntário, sem vantagens no app."; sem cofre, contador ou recibo decorativo. Página com os nomes de quem apoiou só com 3 ou mais apoiadores, com brief do Astra e consentimento de cada um (nome em página pública é dado pessoal).
- Juiz IA: `src/app/api/review/route.ts` (cada chamada ao Gemini passa por `claim_ai_review`), `src/lib/gemini.ts`.
- Fonte pixel (Pixelify) só para letras: os algarismos 0–9 vêm da Inter por um `@font-face` "Pacto Digits" com `unicode-range` em `globals.css` (na Pixelify, 5 parece S e 3 parece 8). Não tire isso para "ficar mais pixel".
- Identidade jurídica (brief de 26/10, passo 1): provas enviadas são documentos numa pasta (`doc-tab`, aba vinho de 8 px; etiqueta de papel `paper-label` "Prova enviada"; cabeçalho da prova com o sprite `evidenceFolder`), e cada item de dívida recebido vira um recibo (`receipt`, papel creme com texto escuro). Tokens `folder`, `paper`, `on-paper` em `globals.css`. Papel só em detalhes, sempre com texto escuro; nada de número processual, assinatura ou selo oficial. Próximos passos do brief (Perfil como arquivo, cena de entrada, autoria dos selos) só depois da revisão dos prints.
- Sprites low poly: `tools/lowpoly/models.js` + `render.mjs` (PNG 48×48 em `public/lowpoly`, sempre em escala inteira). Juiz animado: `src/lib/judge.ts`.
- Vídeo de apresentação (brief do Astra de 28/10/2026): `tools/video` (Remotion), versões de 43 s (Apoia-se, 16:9) e 38 s (WhatsApp, 9:16). Usa capturas reais de um grupo fictício (Ana, Bruno, Carla, Diego, Elisa), feitas pelo workflow "Video shots", que publica no branch `video-shots` (o container da nuvem não baixa artefatos do Actions nem sobe o Supabase local: Docker Hub e ECR limitam). Ao mudar uma tela que aparece no vídeo, refaça as capturas. Regras de movimento e tipografia no `tools/video/README.md`.
- Logo e ícones do app: o busto do juiz low poly (sobrancelha erguida, desconfiado) sobre o amarelo `#ffcd38`, gerado por `tools/lowpoly/icons.mjs` em `public/icons`. A identidade é low poly, não pixel art: não desenhe a logo em grade de pixels (a v1 assim foi recusada).
- Pergunta do dia do estudo: `src/lib/study-prompts.ts` (ids gravados em `checkins.study_prompt`, não renomear nem reaproveitar). A avaliação da resposta pela IA (`checkin_reviews.answer_check`) só informa: nunca muda o veredito nem abre tribunal.
- Guia do juiz (perguntas fixas): `src/lib/guide.ts` — atualize quando mudar uma regra.
- Confirmações (rodada 4, peça 3): `src/components/ui/ConfirmDialog.tsx`, `<dialog>` modal com variantes `danger` (remover, sair: `btn-danger`, vermelho sobre vinho) e `neutral` (registrar recebimento: amarelo). Foco começa em Cancelar e volta ao botão que abriu (ou a um alvo de reserva quando a linha some); no celular a ação principal fica em cima, no desktop à direita, e a ordem do DOM segue a visual. Nada de `confirm()` nativo; só excluir a conta ainda usa `prompt()` (fora do escopo da rodada 4). Recebimento não tem desfazer (sem grant de update/delete em `payments`); resposta perdida → o botão consulta se o pagamento existe antes de dizer que falhou.

## Decisões que não se rediscutem

- Saída do grupo (0016): quem sai leva as próprias provas, dívidas e fotos, mas não o histórico do grupo: pagamentos que recebeu, acusações e votos ficam (sem o vínculo; o recibo guarda o nome). O dono que sai passa o grupo ao membro mais antigo; o último a sair apaga o grupo. Só o dono remove membros. Excluir a conta = sair do grupo + apagar fotos + apagar o usuário (`/api/account`).
- Digitação: teste no app, 3 tentativas por dia, vale o melhor (qualquer duração, idioma ou modo); recordes separados por aparelho, modo, idioma e duração. Backspace numa palavra vazia volta para a anterior só se ela estiver errada (como no Monkeytype); o resultado conta as palavras finais.
- Dívida: cardápio de 1 ou 2 itens; só o dono troca; vale a partir da segunda seguinte; dias passados mantêm os itens antigos.
- Qualquer pessoa sem grupo cria um desafio; uma pessoa, um grupo.
- Provas não podem ser editadas; a prova de digitação mostra o cartão do melhor teste do dia, desenhado na hora.
