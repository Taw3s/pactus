# Limites dos planos grátis e o que acontece no Pactus

Consultado em **21/11/2026** nas páginas oficiais abaixo. Os números mudam sem aviso (o Google diz isso com todas as letras): confira o painel de cada serviço antes de decidir, e atualize este arquivo com a data nova.

## Supabase (plano Free)

Fontes: [supabase.com/pricing](https://supabase.com/pricing) e [Database size](https://supabase.com/docs/guides/platform/database-size).

| Limite | Valor | O que acontece no Pactus | Onde o código reage |
| --- | --- | --- | --- |
| Tamanho do banco | 500 MB por projeto (cota de cobrança, pela média diária do ciclo) | Acima da cota da organização, a API pode responder **402** | **Não existe** tratamento: nenhuma ocorrência de `402` em `src/`. O usuário vê a mensagem genérica de cada formulário. |
| Disco | 2 GB fixos, sem autoescala | A **95%** do disco o banco fica **só leitura** (`cannot execute INSERT in a read-only transaction`, SQLSTATE 25006): ninguém envia prova, vota nem paga, e os gatilhos de dívida das 23:59 continuam derivados (a dívida é calculada, não gravada). Disco cheio: o Postgres para até mudar para o Pro. | **Não existe**: nenhuma ocorrência de `25006` ou `read-only` em `src/`. |
| Armazenamento (fotos e anexos) | 1 GB; upload de até 50 MB por arquivo | Upload recusado: a prova não sai | A retenção limita o crescimento: fotos grandes e PDF/ZIP saem depois de 30 dias (`src/lib/media-retention.ts`, `KEEP_FULL_DAYS`); anexos até 10 MB (`src/lib/attachments.ts`). Não há aviso de cota cheia. |
| Egress | 5 GB por mês na organização (mais 5 GB em cache) | Fotos abertas no Feed e na prova contam | Nenhum controle no app. |
| Usuários ativos | 50 000 por mês | Longe de ser problema no beta | — |
| Inatividade | Projeto pausado depois de 1 semana sem atividade | O app inteiro para | O cron diário `/api/cron/remind` consulta o banco todo dia (`vercel.json`). [Provável] Isso conta como atividade; o Supabase não define "atividade" na página. |
| Logs | 1 dia de retenção | Erro de ontem não aparece no painel | Sentry guarda os erros do app (`src/lib/sentry.ts`). |

## Vercel (plano Hobby)

Fontes: [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby) e [Cron jobs: usage and pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing).

| Limite | Valor (por mês) | O que acontece no Pactus | Onde o código reage |
| --- | --- | --- | --- |
| Invocações de função | 1 000 000 | Acima disso, "na maioria dos casos" a Vercel bloqueia o recurso por **30 dias** (a página não diz como: [Chutando] páginas e rotas param de responder) | **Não existe** e nem tem como: é o servidor que para. |
| CPU ativa | 4 h | Igual ao anterior | Rotas pesadas têm `maxDuration = 60` (`src/app/api/review/route.ts:12`, `src/app/api/cron/remind/route.ts:10`, `src/app/api/cron/weekly/route.ts:9`). |
| Transferência rápida | 100 GB | Igual | — |
| Requisições de CDN | 1 000 000 | Igual | — |
| Deploys | 100 por dia | Previews de PR param de abrir | — |
| Cron jobs | Até 100 por projeto, **no máximo 1 vez por dia**, com precisão de **±59 min** | Expressão mais frequente falha no deploy | `vercel.json`: `0 23 * * *` (20:00 em São Paulo) e `0 0 * * 1` (domingo 21:00 em São Paulo). |

**Divergência achada [Certo]:** o guia diz "O app lembra às 20h" e "resumo da semana no domingo às 21h" (`src/lib/guide.ts:118`). No Hobby o disparo pode cair em qualquer minuto entre 20:00 e 20:59 (e entre 21:00 e 21:59). Não é grave (o prazo é 23:59), mas o texto promete uma hora exata. Proposta: "por volta das 20h" e "domingo à noite". Não mudei o guia neste PR: é texto de interface e você decide.

**Desatualizado no CLAUDE.md [Certo]:** a nota "o plano grátis da Vercel só tem 2 crons" (CLAUDE.md, seção Fotos) não vale mais: hoje são 100 por projeto, uma vez por dia. A limpeza continua dentro do `remind`, o que é bom (menos invocações); só a justificativa mudou. Corrigido neste PR.

## Gemini (plano gratuito da API)

Fonte: [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) (redireciona para `aistudio.google.com/docs/rate-limits`).

- **A página não publica mais os números do plano gratuito para os modelos Flash e Flash-Lite**: manda ver em "Google AI Studio" (projeto → limites). Relatos no fórum oficial falam em cortes fortes desde dezembro de 2025 (ex.: Flash de 250 para 20 pedidos por dia). [Provável] O número atual do projeto só você vê no AI Studio.
- Limites por **projeto**, não por chave: RPM (pedidos por minuto), TPM (tokens por minuto) e RPD (pedidos por dia). O RPD zera à **meia-noite do Pacífico** (5h ou 4h da manhã em São Paulo, conforme o horário de verão de lá).
- Acima do limite a API devolve erro de limite (429).

O que acontece no Pactus quando estoura [Certo]:

1. `src/lib/gemini.ts:49-50`: um 429 conta como "tentável de novo" e o app tenta o modelo reserva (`gemini-flash-lite-latest`, linha 7). [Provável] Como cada modelo tem a própria cota, isso às vezes salva a conferência.
2. Se os dois falham, `src/app/api/review/route.ts:85-87` registra no log e responde 502. Nenhuma linha vai para `checkin_reviews`.
3. A prova **continua valendo**: o juiz IA só informa e nunca anula sozinho. O selo da prova fica "IA indisponível" (`src/components/StatusBadges.tsx:27-28`).
4. Efeito colateral [Certo]: cada chamada grava uma linha em `ai_review_attempts` antes de ir ao Gemini (`claim_ai_review`, `supabase/migrations/0019_concurrent_attempt_limits.sql:73-77`; chamada em `route.ts:58`), e nada a apaga quando o Gemini recusa. Uma prova tem no máximo 3 tentativas (`exhausted`, linha 70) e cada pessoa 30 por dia (`limit`, linha 74). Com a cota do Google estourada, três falhas seguidas deixam a prova **para sempre** sem conferência da IA. É de propósito (limita custo e abuso), mas vale saber. Não mexi: seria mudança de regra e migration.

## O que vigiar no beta

- Painel do Supabase → Usage: disco (alerta perto de 1,5 GB), Storage, egress.
- Painel da Vercel → Usage: invocações e CPU ativa.
- AI Studio → limites do projeto do Gemini e uso diário. Se o RPD do Flash estiver em 20, um grupo de 10 pessoas com 3 provas com foto por dia já passa do limite: ou se ativa o faturamento (política e `/apoiar` mudam no mesmo dia), ou se aceita "IA indisponível" no fim do dia.
