# Lançamento do beta: roteiros para o dono

Feito em 21/11/2026. Nada aqui roda sozinho nem mexe no banco.

## 1. Python, SQL e Bash no `/aprender` de produção (10 passos, no Chrome ou Edge)

O E2E do CI não consegue testar isso (motivo em `docs/ideias.md`, "Aprender e Digitação"). Use uma conta de teste se puder.

1. Na Vercel, confira que `NEXT_PUBLIC_ISOLATED_ORIGIN` existe em Production e aponta para o domínio isolado (`docs/security/isolated-host-setup.md`).
2. Abra `https://www.pactus.dev.br/aprender` logado. Em Desafios, escolha **Python → Iniciante**.
3. Cole uma resposta que só imprime um texto fixo (ex.: `print("ok")`) e confira. Esperado: **reprovada**, com "esperado" e "obtido" lado a lado.
4. Revele a solução de referência (custa os pontos; use a conta de teste) e confira de novo. Esperado: **aprovada**.
5. Toque em abrir no playground. Esperado: o código abre com a entrada do caso 1 e roda.
6. Repita os passos 3 e 4 em **SQL → Iniciante** (uma consulta errada, como `select 1;`, deve ser reprovada; a referência, aprovada).
7. Repita os passos 3 e 4 em **Bash → Iniciante** (`echo ok` deve ser reprovado).
8. Cole em Python `while True: pass` e confira. Esperado: reprovada por tempo (o playground corta em 10 s; o limite exato da conferência não foi medido), e a página continua respondendo.
9. No DevTools (F12 → Console), procure erros vermelhos de CSP ou de `postMessage`. Esperado: nenhum.
10. Abra `https://<domínio isolado>/hoje`. Esperado: **404** (o host isolado só serve os arquivos da lista). Mande print do que divergir.

## 2. Retenção do grupo (SQL Editor do Supabase, só leitura)

**O que colar:** o arquivo inteiro `supabase/queries/retention.sql`, do primeiro `--` até o último `;`. Ele é um único `SELECT`: não muda nada no banco.

**Para escolher o grupo:** na linha `select null::text as invite_code`, troque `null` pelo código entre aspas simples, por exemplo `select 'ABC123'::text as invite_code`. Deixando `null`, ele pega o grupo com mais membros (no beta, é o seu).

**Como ler (uma linha por semana de vida de cada pessoa no grupo):**

- `semana`: 0 é a primeira semana de cada pessoa, contada **a partir do dia em que ela entrou** (quem entrou depois é comparado na mesma "idade").
- `membros`: quantas pessoas já chegaram nessa semana, incluindo quem saiu depois.
- `ativos` / `ativos_pct`: quantas mandaram pelo menos uma prova naquela semana.
- `cumpriram_1_dia` / `cumpriram_pct`: quantas fecharam pelo menos um dia completo (as 3 metas). **Este é o número que importa.**
- `ja_sairam`: quantas já tinham saído antes de a semana começar (contam como perda, é de propósito).
- `parcial = true`: a semana ainda não terminou. Não tire conclusão dessa linha.

**A pergunta do beta é a semana 3 (a 4ª semana):** se `cumpriram_pct` da semana 3 ficar parecido com o da semana 0, a cobrança está segurando. Se cair pela metade ou mais, não está. Com 5 a 10 pessoas, uma pessoa só muda 10 a 20 pontos: olhe as contagens, não só a porcentagem.

**Ponto cego:** quem saiu antes de você rodar a migration 0018 não aparece.

**Não publique esses números** no repositório público (`Taw3s/pacto`): regra do CLAUDE.md.
