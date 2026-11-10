# Teste diferencial: banco × TypeScript

As regras do Pacto existem duas vezes: nos gatilhos, views e RPCs do banco (`supabase/migrations`) e no
TypeScript (`src/lib/ledger.ts`, `src/lib/ranking.ts`, a tela Hoje, o painel de baús). Este teste passa o
**mesmo histórico** pelos dois lados e falha quando eles respondem coisas diferentes.

Roda no fim do `npm run test:db` (`supabase/tests/run.sh`), no Postgres descartável, e por isso em todo PR.
Não entra no `npm test`: precisa do banco.

## Como funciona

1. `scenarios.ts` monta históricos: casos de borda escritos à mão (`HAND`) e históricos aleatórios com
   semente fixa (`randomScenario`). Um histórico é uma lista de ações com hora marcada: entrar, sair, mandar
   prova, fazer teste de digitação, acusar, votar, trocar a folga, trocar o cardápio, registrar pagamento,
   abrir baú.
2. Cada ação passa pelo banco **de verdade**: como usuário `authenticated`, com RLS, pelos mesmos RPCs e
   gatilhos da produção. O banco aceita ou recusa; o histórico não decide nada.
3. `clock.sql` dá ao banco um relógio de teste, para o histórico atravessar dias, segundas-feiras e as 72 h
   do tribunal. Nenhuma regra é reescrita: as funções mantêm o corpo e só passam a ler `now()` do relógio.
4. Nas sondagens, `diff.probe` (`harness.sql`) pergunta ao banco tudo o que o app também responde, e tenta de
   verdade o que o app oferece (tudo dentro de uma subtransação desfeita): registrar cada item de cada dia
   de cada pessoa como pago, abrir os dois baús, mandar cada prova, usar cada teste de digitação.
5. `compare.ts` responde às mesmas perguntas com as funções do app e lista as diferenças.

| Regra | Lado TypeScript | Lado banco |
|---|---|---|
| Dia e calendário | `spToday`, `weekStart`, `nextMonday`, `weekdayOf` | `sp_today`, `date_trunc('week')`, `next_monday`, `extract(dow)` |
| Folga | `dayOffOn` | `day_off_for`, `set_day_off` |
| Cardápio do dia | `itemsOn` | `debt_items_on`, `set_debt_menu` |
| Dívida (dia da entrada, folga, dia completo, item) | `debtLines` | o que `payments_before_insert` aceita |
| Sequência | `currentStreak` | refeita com as respostas do banco (dia pagável quebra, dia completo fora da folga soma) |
| Dia completo | estados das metas na Hoje; contagem do painel do grupo | `completed_days`; `open_chest('daily')` |
| Baú da semana | `ChestsPanel` (5 dias de todos, estava no grupo na segunda) | `weekly_progress`; `open_chest('weekly')` |
| Prova nova, refeita, sessão extra | formulários da Hoje | o que `checkins_before_insert` aceita |
| Teste de digitação que serve de prova | `unsentTypingTest`, `scoringTypingTests` | o que `checkins_typing_test` aceita |
| Pontos do ranking | `scoreMonth` + `typingBestByDay` | **não existe no banco**: `diff.ranking` escreve a regra do guia em SQL, só para o teste |
| Saída, remoção, exclusão da conta | o que o app mostra para quem fica | `leave_group`, `remove_member`, `_drop_member` |

Três trechos do app vivem dentro de páginas e não são importáveis (estados das metas e baús em
`hoje/page.tsx`, `getMonthScores` em `data.ts`): `compare.ts` os transcreve e diz de onde vieram. Se mudar
um deles, mude a transcrição.

## Rodar

```bash
npm run test:db
```

Mais históricos (o padrão são 40, para o CI ficar perto de um minuto):

```bash
PACTO_DIFF_RANDOM=300 npm run test:db
```

## Quando falha

A mensagem traz a semente, a sondagem, a regra e a resposta de cada lado:

```
semente 23:
[debt] dia 3, 23:59:59 · U2 2026-03-04|coke: banco = open; app = not owed
```

Para ver o histórico inteiro, com o que o banco aceitou e recusou, ponha `PACTO_DIFF_SEED=23` (ou
`PACTO_DIFF_CASE="parte do nome"` para um caso escrito à mão) e rode de novo. Reduza o histórico até o menor
que ainda diverge e ponha-o em `HAND`: ele vira o teste da correção.

**Não mude a regra para o teste passar.** Se os dois lados são defensáveis, a decisão é do dono.

## Divergências conhecidas

`expected.ts` lista as que já foram encontradas e ainda estão abertas, cada uma presa ao caso que a
reproduz. Enquanto estiver lá, o teste passa com ela **e falha se ela sumir**: corrigiu, apague a entrada.

## O que este teste não cobre

- O Feed e a página da prova (o "+N extra", o corte de digitação por quadro): a lógica está dentro das páginas.
- O juiz IA (o tribunal aberto pela IA entra como acusação sem autor, sem passar por `checkin_reviews`).
- A medição do teste de digitação (`start_typing_test` / `finish_typing_test`): os testes entram prontos.
- Corridas entre requisições simultâneas e fotos no Storage.
- Listas com mais de 1000 linhas (o limite padrão do PostgREST).
