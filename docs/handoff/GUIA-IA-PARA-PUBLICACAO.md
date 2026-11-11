# Guia para a IA do colega — integrar o Pacto web

Leia este documento antes de editar. O objetivo é portar e implementar no checkout oficial as mudanças desta entrega, sem substituir o produto web existente nem publicar sem validação.

## Checkout e pacote de referência

- Repositório oficial: `Taw3s/pactus`.
- Base do snapshot local: commit `fe4a580492888cdeeac14610da1f4ca24a6bceb3`, branch local `codex/port-local-beta-learning-2026-11-10`; o trabalho desta pasta não está commitado.
- Antes de portar, abra o checkout oficial mais recente e verifique se a branch principal avançou. O ZIP não contém `.git`; não use como checkout nem publique diretamente.
- Compare os arquivos do ZIP com o checkout atual. Integre as mudanças por partes, resolvendo conflitos manualmente. Preserve as rotas, dados, migrações e alterações recentes do checkout oficial.
- Não copie segredos, dados reais de usuário, e-mails pessoais ou perfis de teste. O material da entrega não deve conter o endereço de destino do feedback.

## Escopo que deve ser integrado

### 1. Área Aprender e videoaulas

Portar e revisar `/aprender`, componentes e materiais de programação que estão no snapshot:

- aulas didáticas por linguagem, com introdução, desenvolvimento e conclusão que prepara para o próximo conteúdo;
- exemplos e desafios por linguagem, níveis de dificuldade, dica gradual e opção de refazer voluntariamente;
- editor de digitação com referência escondida quando o exercício pede prática, bloqueio por erros e avanço controlado;
- playground de web com prévia HTML/CSS e console JavaScript; para linguagens não web, terminal/saída apenas quando existir runtime real local seguro;
- playlists gratuitas organizadas por linguagem e ordem, com progresso retomável;
- runtimes e licenças listados em `public/local-runtimes`, `public/toolchains`, `public/workers` e `src/workers`.

No produto web, faça o progresso pertencer à conta autenticada e sincronizar entre aparelhos, com migration, RLS e testes diferenciais. Não use o estado local do navegador como se fosse progresso sincronizado. O playground não deve enviar código pessoal ao servidor. Preserve isolamento de iframe/processo, políticas CSP, licenças dos runtimes e limites de execução. Não conceda pontos ou altere ranking/grupo sem uma regra de produto aprovada.

Mantenha aulas e desafios de beta identificados como beta e os controles de teste de desenvolvedor fora da interface de participantes. Preserve opções reais de repetir uma aula ou desafio para o usuário.

### 2. Feedback beta sem revelar e-mail

Integre o padrão mais novo do snapshot:

- componente `src/components/BetaFeedback.tsx`, rota `/feedback` e API `POST /api/feedback`;
- feedback exige sessão autenticada, valida origem, tipo, tamanho e categoria; respostas do endpoint não revelam o destinatário;
- entrega por Resend no servidor; o texto não é persistido no banco do app e o e-mail/perfil do participante não são anexados automaticamente;
- sem abrir o aplicativo de e-mail do participante nem exibir endereços em HTML, JavaScript, metadados, respostas da API, documentação compartilhada ou capturas;
- migration `0031_feedback_rate_limits.sql` e teste `supabase/tests/feedback_rate_limits_test.sql` implementam cooldown de 30 segundos e até 3 envios por 24 horas. O cron diário existente remove metadados sem atividade há 30 dias;
- ao portar para um checkout que avançou, escolha o próximo número de migration livre e atualize os testes/runner sem reordenar migrations já aplicadas.

Configure só no servidor: `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` e `FEEDBACK_FROM_EMAIL`. O remetente precisa estar verificado no Resend. Nunca criar variáveis `NEXT_PUBLIC_*` para esses dados, incluir destinatário no frontend ou adicionar `reply_to` com a conta do participante.

### 3. Identidade do projeto e textos legais

- Nome público do projeto: **Equipe Pactus**.
- Esse nome não foi confirmado como entidade legal. Não o declarar como controlador legal nem inventar razão social.
- `NEXT_PUBLIC_CONTROLLER_NAME` deve receber o nome real informado pelo responsável antes do build público. No snapshot atual o campo está vazio e a página deixa isso explícito.
- A rota pública `/feedback` é o canal de contato. O destino de e-mail não aparece para o participante.
- Atualize Privacidade e Termos para refletir fielmente o que foi portado e o que cada fornecedor recebe. A política já descreve Resend, aulas/YouTube, progresso local atual e dados mínimos do rate limit; revise depois da integração e da configuração real.

### 4. Segurança e mudanças relacionadas

Revise também as alterações do snapshot em middleware/CSP, proteção de origem das mutações, sanitização do Sentry, notificações Web Push, e documentação/testes. Compare cada mudança com o checkout oficial antes de aplicá-la. Não enfraqueça RLS, autenticação, isolamento de mídia, proteção contra replay ou cabeçalhos de segurança para fazer o build passar.

## Regras de produto já aprovadas

Implemente o que está em `REGRAS-APROVADAS-IMPLEMENTAR.md` sem pedir nova escolha:

1. prova substituta de digitação exige teste iniciado e concluído depois da anulação final;
2. após consumir as três tentativas diárias, uma única “Nova tentativa” especial pode ser liberada por anulação; se o tribunal anular também essa prova, registrar uma Coca adicional à dívida normal, uma única vez;
3. congelar na prova enviada o teste e a evidência que o grupo revisará;
4. quem sai ou é removido durante a semana não bloqueia o baú semanal dos outros; quem entra depois de segunda participa no desafio semanal seguinte.

Elegibilidade, contagem, penalidade e replay devem ser decididos transacionalmente no servidor/banco; a interface não cria o resultado.

## Sequência de implementação e validação

1. Atualize a branch oficial, revise estado e histórico. Crie uma branch de trabalho.
2. Compare o snapshot e produza uma lista de arquivos/decisões de merge antes de substituir arquivos.
3. Porte segurança, feedback, páginas legais e migrations; execute unitários e SQL/RLS.
4. Integre Aprender, runtimes licenciados, progresso por conta e playlists; valide segurança e responsividade.
5. Implemente as quatro regras aprovadas com testes de concorrência, replay, integração e documentação.
6. Atualize CI e rode lint, typecheck, suíte completa, build, SQL/RLS, testes de segurança e E2E.
7. Em staging, use contas e dados sintéticos. Verifique também falha de entrega do Resend, rate limit, cron, progresso entre aparelhos, YouTube nos navegadores suportados e uso móvel.
8. Apresente ao responsável o diff, variáveis necessárias, resultado de cada verificação e pendências. Não acesse nem altere produção e não faça deploy sem aprovação explícita.

## Variáveis e pré-condições de produção

Confira `.env.example` no snapshot e documente valores no painel seguro do provedor. Para feedback, os três valores server-only do Resend precisam estar configurados. Confirme ainda Supabase Auth/redirects, chave de serviço, CRON_SECRET, Sentry, Gemini, Web Push, domínio e cron.

Antes do build de produção, o controlador precisa informar a identidade real para `NEXT_PUBLIC_CONTROLLER_NAME`. “Equipe Pactus” é somente a marca pública. Não inclua uma identidade fictícia ou o endereço privado do feedback no app.

## Estado desta cópia

Na cópia local: 198 testes passaram em 25 arquivos; build, typecheck e lint passaram. Testes SQL/RLS não foram executados por falta de PostgreSQL/Supabase CLI no ambiente Windows. `npm audit` ficou inconclusivo porque o registry não resolveu por DNS. Staging e produção não foram acessados e nenhum deploy foi feito. Consulte `PREFLIGHT-DEPLOY.md` para os gates restantes.
