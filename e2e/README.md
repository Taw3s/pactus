# Testes de ponta a ponta (E2E)

Rodam o app de verdade num navegador (Playwright + Chromium), contra um Supabase **local e descartável**,
com o Gemini **simulado**. Também passam o [axe](https://github.com/dequelabs/axe-core-npm) em todas as telas
(acessibilidade WCAG 2.1 AA, contraste incluído). Nunca tocam no banco de produção.

No GitHub, rodam sozinhos a cada pull request (`.github/workflows/ci.yml`). Os prints de cada execução
ficam no artefato **e2e-screens-and-logs** da execução.

## Etapas

| Arquivo | O que cobre |
|---|---|
| `e2e_a.mjs` | Login, convite, link mágico, conta sem convite |
| `e2e_b.mjs` | Provas do dia, compressão da foto e miniatura, tentativas de burlar a API |
| `e2e_c.mjs` | Feed e tribunal (culpado/inocente com motivo, condenação e absolvição) |
| `e2e_d.mjs` | Dívidas, histórico, sequência, configurações |
| `e2e_f.mjs` | Projetos, ranking do mês, folga |
| `e2e_g.mjs` | Juiz IA (simulado): confere, diverge, abre tribunal, selo VERIFICADO |
| `e2e_e.mjs` | PWA instalável |
| `e2e_h.mjs` | Acessibilidade (axe) em todas as telas, desktop e página "Sem conexão" |
| `e2e_i.mjs` | Baú do dia, coleção, desafio da semana e avisos push (servidor de push falso) |
| `e2e_j.mjs` | Prova refeita depois de condenada e sessões extras de estudo |
| `e2e_k.mjs` | Animações do juiz, tribunal, várias fotos, guia do juiz, Google, sessão órfã, criar desafio e cardápio |
| `e2e_l.mjs` | Data da foto, carimbos, resumo semanal e teste de digitação (texto, inglês, 5 minutos, cartão do melhor teste) |
| `e2e_m.mjs` | Remover membro, sair do grupo e excluir a conta (por último: tira pessoas do grupo) |
| `e2e_n.mjs` | Apresentação pública em `/`: textos, larguras 320–1440, alvos, rotas privadas continuam fechadas, ações para visitante, membro e conta sem grupo |
| `e2e_o.mjs` | Desafio novo: primeiros passos na Hoje (link copiado, combinado, primeira prova vinda do servidor, recolher e reabrir) e link de convite por cadastro com e-mail, login e Google; Feed e Ranking vazios |

As etapas compartilham estado (usuários criados em `a`, histórico semeado antes de `d`): rode sempre
o conjunto inteiro com `run.sh`, num banco recém-criado.

## Datas

Tudo é relativo a **hoje** em São Paulo (`dates.mjs`, `seed.sql`): todos entram há 6 dias, e a folga do
grupo é o dia da semana de amanhã (`setup.sql`). Assim os números esperados são os mesmos em qualquer data.

## Rodar no seu computador

Precisa de Docker, Node 22 e o [Supabase CLI](https://supabase.com/docs/guides/local-development).

```bash
supabase start                      # na raiz do repositório; aplica supabase/migrations
eval "$(supabase status -o env)"
export SUPABASE_URL=$API_URL SUPABASE_ANON_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
export NEXT_PUBLIC_SUPABASE_URL=$API_URL NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY NEXT_PUBLIC_SITE_URL=http://localhost:3000
export GEMINI_API_KEY=test-key GEMINI_API_URL=http://127.0.0.1:54400
export PUSH_TEST_SERVICE=1   # deixa o app entregar avisos ao servidor de push falso (nunca em produção)
export NEXT_PUBLIC_GOOGLE_LOGIN=1   # mostra o botão do Google (o teste só confere o redirecionamento)

npm ci && npm run build && npx next start -p 3000 &   # o app, com essas variáveis
cd e2e && npm ci && npx playwright install chromium
bash run.sh
```

Para rodar de novo, comece de um banco limpo: `supabase db reset` (na raiz) e depois `bash run.sh`.

Variáveis opcionais: `APP_URL` (padrão `http://localhost:3000`), `MAIL_URL` (caixa de e-mail do Supabase
local, padrão `http://127.0.0.1:54324`), `CHROMIUM_PATH` (usar um Chromium já instalado).

## Auditoria responsiva

Depois de rodar as etapas (o banco local fica com dados), `node responsive-audit.mjs /tmp/audit` abre cada tela em 320, 360, 390, 768, 1024 e 1440 px e lista: rolagem horizontal da página, elementos fora da tela, texto cortado e alvos de toque menores que 44 px. Os prints ficam na mesma pasta, para revisão visual. O único achado esperado é o resumo das metas da Hoje escondido para leitor de tela.
