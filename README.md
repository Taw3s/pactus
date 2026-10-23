# Pacto

App web (PWA) para um grupo de amigos controlar um desafio diário de estudo.

Todo dia, cada pessoa cumpre **3 metas**, cada uma com foto de prova:

| Meta | Tempo | Extra |
|---|---|---|
| 📚 Estudo | 60 min | resumo de no mínimo 40 caracteres |
| ⌨️ Digitação | 5 min | — |
| 📖 Leitura | 15 min | — |

- O dia só conta como cumprido se as 3 metas tiverem check-in até **23:59 (America/Sao_Paulo)**.
- **Escala 6x1:** cada pessoa escolhe 1 dia de folga por semana (padrão: domingo).
- **Penalidade:** cada dia descumprido vale 1 Coca-Cola + 1 salgado, devidos **ao grupo**. Quem recebe marca como pago.
- **Prazo de pagamento:** último dia do mês. Depois disso a dívida aparece como **atrasada**, mas continua valendo.
- **Tribunal:** qualquer membro pode contestar um check-in; o grupo vota (regras abaixo).

Stack: Next.js 15 (App Router) + TypeScript + Tailwind 4 + Supabase (Auth, Postgres, Storage com RLS) + Vercel.

---

## 1. Rodar localmente

Pré-requisitos: Node 22+ e um projeto Supabase (passo 2).

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase
npm run dev                  # http://localhost:3000
```

Testes:

```bash
npm test          # regras de data, dívidas e streak (Vitest)
npm run test:db   # SQL + RLS num Postgres descartável (precisa de Postgres 15+ instalado; não roda como root)
```

---

## 2. Criar o projeto no Supabase

1. Crie um projeto em <https://supabase.com/dashboard>. Qualquer região serve; `South America (São Paulo)` é a mais próxima.
2. **SQL Editor → New query:** cole todo o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) e clique em **Run**. Isso cria:
   - as tabelas `groups`, `members`, `day_off_changes`, `checkins`, `disputes`, `dispute_votes` e `payments`;
   - as views `dispute_results` (veredito do tribunal) e `completed_days` (dias com as 3 metas válidas);
   - os triggers de regra de negócio, as funções `join_group`, `check_invite_code` e `set_day_off`;
   - as políticas RLS de todas as tabelas;
   - o bucket privado `media` no Storage, com as políticas de upload e leitura.
   Em seguida, numa aba nova, cole e rode também [`supabase/migrations/0002_security_fixes.sql`](supabase/migrations/0002_security_fixes.sql) (correções da auditoria de segurança). **Rode cada arquivo uma vez só, nessa ordem.** Quem já tinha rodado o `0001` antes só precisa rodar o `0002`.
3. **Crie o grupo e o código de convite** (mesmo SQL Editor):

   ```sql
   insert into public.groups (name, invite_code)
   values ('Pacto', 'TROQUE-ESTE-CODIGO');   -- maiúsculas, 6+ caracteres, difícil de adivinhar
   ```

4. **Authentication → URL Configuration**
   - **Site URL:** a URL da Vercel (ex.: `https://pacto-xyz.vercel.app`). Antes do deploy, use `http://localhost:3000`.
   - **Redirect URLs:** adicione `http://localhost:3000/**` e `https://SEU-APP.vercel.app/**`.
5. **Authentication → Email Templates.** Troque o link destes dois templates. Assim o link funciona mesmo se for aberto num navegador diferente do que pediu:
   - **Magic Link:**
     ```html
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/hoje">Entrar no Pacto</a></p>
     ```
   - **Confirm signup:**
     ```html
     <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/hoje">Confirmar e-mail</a></p>
     ```
   A rota `/auth/confirm` aceita os dois formatos: esse (`token_hash`) e o padrão do Supabase (`?code=`).
6. **Limite de e-mails.** O SMTP embutido do Supabase tem um limite baixo de envios por hora. Duas saídas:
   - recomendar que todos entrem **com senha**, que não gasta e-mail no login; ou
   - configurar um SMTP próprio em **Authentication → SMTP Settings** (Resend, Brevo etc.).

   Para economizar ainda mais, você pode desligar **Confirm email** em *Authentication → Providers → Email*. O risco é aceitar e-mails digitados errado.
7. **Project Settings → API:** copie a `Project URL` e a chave `anon` (ou *publishable*) para o `.env.local`.

> **Não desligue "Allow new users to sign up".** A entrada por convite usa o cadastro normal do Supabase: o código vai nos metadados e um trigger cria o membro. Quem criar conta sem código válido fica sem acesso a nada (RLS) e cai na tela de pedir código.

---

## 3. Deploy na Vercel

1. Suba a pasta para um repositório no GitHub (o `.gitignore` já exclui `.env.local`).
2. Em <https://vercel.com/new>, importe o repositório. O framework é detectado como Next.js; não mude nada.
3. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-APP.vercel.app` |

4. Clique em **Deploy**. Depois volte ao Supabase (passo 2.4) e coloque a URL final em *Site URL* e *Redirect URLs*.

Sem GitHub, dá para usar a CLI na pasta do projeto: `npx vercel` e, depois, `npx vercel --prod`. Configure as mesmas variáveis no painel.

### Instalar no celular

- **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Instalar app*.

> No iPhone, o app instalado não compartilha sessão com o Safari. Se você pedir um link mágico, ele abre no Safari, não no app. **Dentro do app instalado, entre com senha.**

---

## 4. Decisões de arquitetura

### Sem cron: tudo é calculado na hora
Dias descumpridos, dívidas e streaks **não são gravados**. A cada carregamento, o servidor (Server Components) lê os check-ins, as trocas de folga e os pagamentos e calcula tudo em [`src/lib/ledger.ts`](src/lib/ledger.ts):

- Um dia D é **descumprido** se D é anterior a hoje (SP), D é igual ou posterior à data de entrada da pessoa, não era a folga dela naquele dia e não existem as 3 metas válidas.
- **Hoje nunca é dívida**: ele só fecha depois das 23:59.
- A dívida é a lista de dias descumpridos × {Coca, salgado}, menos o que está na tabela `payments`.
- Para 6 pessoas são poucos milhares de linhas por ano. As consultas são paginadas (`fetchAll`), para não esbarrar no limite de 1000 linhas do PostgREST.

Vantagens: não depende de job agendado, não fica dado inconsistente se um job falhar, e qualquer regra corrigida vale para o passado. O trigger de `payments` repete a regra de "dia descumprido" no SQL, para impedir que alguém marque como pago um dia que não deve. **Se mudar a regra num lugar, mude no outro.**

### Fuso horário
- Todo "dia" é uma data `YYYY-MM-DD` em **America/Sao_Paulo**: `sp_today()` no Postgres e `spToday()` em [`src/lib/dates.ts`](src/lib/dates.ts), via `Intl`. Nunca UTC puro.
- **O cliente não escolhe a data do check-in.** Um trigger grava `day = sp_today()` no momento do insert. Por isso não dá para enviar check-in de dia passado, nem pela API.
- Um envio que chegar ao servidor depois de 00:00 conta para o novo dia.

### Provas imutáveis
- `checkins` só tem permissão de `INSERT` (por coluna: `goal`, `photo_path`, `summary`). Não há `UPDATE` nem `DELETE`.
- No Storage só existe política de upload, sem sobrescrever (`upsert: false`) nem apagar.
- O caminho da foto precisa ser `<group_id>/<user_id>/…`, conferido pelo RLS do Storage e pelo trigger.

### Fotos
Comprimidas no navegador antes do upload ([`src/lib/image.ts`](src/lib/image.ts)): lado maior de no máximo 1600 px, JPEG com qualidade 0,8, respeitando a rotação EXIF. Fotos de perfil ficam em 512 px. O bucket aceita só `image/jpeg` até 5 MB. As fotos podem vir da câmera ou da galeria.

### Tribunal (contestação)
- Só dá para contestar check-ins **de hoje ou de ontem**. Cada check-in pode ter uma contestação.
- **Votam** os membros que já estavam no grupo quando a contestação foi aberta, menos o dono do check-in. O eleitorado fica congelado: quem entra depois não vota nem muda a maioria, então um veredito encerrado não reabre. Quem contestou já conta como 1 voto "procede".
- **Procede:** maioria absoluta dos aptos (com 6 pessoas, 3 de 5). O check-in é **anulado** e a meta deixa de contar; se o dia não fechar as 3 metas, vira dívida.
- **Rejeitada:** quando "procede" não consegue mais chegar à maioria.
- **Prazo de 72h:** sem maioria até lá, vale quem tiver mais votos; o empate mantém o check-in.
- O dono responde **uma vez**. Votos não mudam. Check-in anulado não pode ser refeito (a regra é uma prova por meta por dia).
- O veredito é calculado na view `dispute_results` (sem cron, como as dívidas).

### Folga
As trocas ficam em `day_off_changes` com `effective_from = próxima segunda-feira`, uma escolha por semana (trocar de novo na mesma semana só substitui a escolha). Assim toda semana de segunda a domingo tem exatamente 1 folga, e trocar nunca muda dias passados.

### Notificações push
Fora do MVP de propósito (no iPhone, push exige o app instalado). A estrutura está pronta: veja [`src/lib/push/README.md`](src/lib/push/README.md) e os handlers comentados em [`public/sw.js`](public/sw.js).

---

## 5. Estrutura

```
src/
  app/
    (auth)/login, (auth)/join     login (senha | link mágico) e entrada com convite
    auth/confirm/route.ts         recebe links de e-mail (token_hash ou code)
    (app)/hoje                    checklist do dia + contagem até 23:59
    (app)/feed                    check-ins do dia de todos + tribunal em andamento
    (app)/checkin/[id]            prova, contestação, resposta e votação
    (app)/dividas                 saldo por pessoa + "Recebi"
    (app)/historico/[userId]      calendário mensal + streak
    (app)/config                  folga, nome, foto, sair
    manifest.ts                   manifest do PWA
  components/                     UI (client components para mutações)
  lib/
    dates.ts                      tudo de fuso SP
    ledger.ts                     dias, streak e dívidas (funções puras, testadas)
    data.ts                       leitura no servidor (RLS + paginação + URLs assinadas)
    image.ts                      compressão no cliente
    supabase/                     clients browser/server/middleware
    push/README.md                como ligar push depois
  middleware.ts                   renova a sessão e protege as rotas
supabase/
  migrations/0001_init.sql        schema + RLS + storage (rodar no SQL Editor)
  tests/                          testes de SQL/RLS em Postgres local
public/sw.js, public/icons/       PWA
```

## 6. Limitações conhecidas do MVP

- Marcar "Recebi" não tem desfazer. Há uma confirmação antes, e a correção se faz pelo SQL Editor.
- Se uma foto subir e o check-in falhar (por exemplo, sem internet no meio), o arquivo fica órfão no Storage. É raro e o impacto é desprezível.
- Se alguém sair do grupo, o número de votantes muda nas votações em aberto.
- Não há tela de administração: o grupo e o código de convite são criados no SQL Editor.
