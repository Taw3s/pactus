# Cópia de segurança do banco (P100-4)

O plano grátis do Supabase não tem backup. Este roteiro cobre **o banco de dados**: contas (login), perfis, provas (textos, números, caminhos das fotos), testes de digitação, dívidas, pagamentos, tribunal, baús e coleção.

**Não cobre:** os arquivos do Storage (fotos e PDFs/ZIPs), as configurações do painel do Supabase (Auth, SMTP do Resend, Redirect URLs) e as variáveis da Vercel. Se o projeto do Supabase for perdido, as provas voltam **sem as fotos**. Guardar as fotos é outra decisão, porque custa espaço e tem outra retenção.

## Como funciona

- O workflow **Backup** (`.github/workflows/backup.yml`) roda todo dia às 03:17 de São Paulo e também pode ser rodado à mão em Actions → Backup → Run workflow.
- Ele chama `tools/backup/dump.sh`, que faz o mesmo dump que o Supabase documenta para migrar de projeto: `roles.sql`, `schema.sql` e `data.sql`. Também gera `counts.tsv`, com a contagem exata de linhas das tabelas, usada para conferir a restauração.
- A pasta é compactada e **cifrada com AES-256** (gpg, com a frase do segredo `BACKUP_PASSPHRASE`) antes de sair do runner. No GitHub fica só o arquivo `.gpg`, como artefato privado do repositório, apagado depois de **30 dias**.
- O CI (etapa "Backup round trip" do End-to-end) testa a ida e a volta em cada PR. Ele enche o banco local com o E2E, faz o dump, sobe um projeto local novo sem as nossas migrations (como um projeto novo do Supabase), restaura e compara a contagem de todas as tabelas.

## Configurar (uma vez, só você)

1. No Supabase: **Connect** → **Session pooler** → copie a connection string (`postgresql://postgres.<projeto>:<senha>@aws-0-...pooler.supabase.com:5432/postgres`). Use o *Session pooler*: a conexão direta é só IPv6 e os runners do GitHub não alcançam.
2. Gere uma frase longa para a cifra (por exemplo, 6 palavras aleatórias) e guarde-a **fora do GitHub**, no gerenciador de senhas. Sem ela, a cópia não abre.
3. No GitHub: repositório → Settings → Secrets and variables → Actions → **New repository secret**:
   - `SUPABASE_DB_URL` = a connection string do passo 1;
   - `BACKUP_PASSPHRASE` = a frase do passo 2.
4. Actions → Backup → **Run workflow**. Deve terminar verde com um artefato `pacto-backup-AAAA-MM-DD`. Sem os segredos, ele termina com um aviso e não faz nada.

Quem tem acesso ao repositório consegue baixar o artefato, mas sem a frase só vê bytes cifrados. Não coloque a frase em issue, PR ou conversa.

## Antes de cada migration

Rode o workflow à mão (passo 4 acima) e espere ficar verde. Esse é o ponto de volta se a migration der errado.

## Restaurar

**Nunca restaure por cima do projeto em uso.** O roteiro é para um projeto **novo e vazio**: o restore roda numa transação só e falha ao encontrar o que já existe.

1. Crie um projeto novo no Supabase, na mesma região, e copie a connection string dele (Session pooler).
2. Baixe o artefato do dia escolhido em Actions → Backup → a execução → Artifacts.
3. Num computador com o Supabase CLI e o `psql`:

   ```bash
   unzip pacto-backup-AAAA-MM-DD.zip
   gpg -d pacto-backup-AAAA-MM-DD.tar.gz.gpg | tar -xz
   tools/backup/restore.sh "<connection string do projeto novo>" pacto-backup
   ```

   A saída esperada é `restore ok: every counted table has the same number of rows`. Se aparecer uma diferença, o script mostra a tabela e termina com erro.
4. Refaça no painel do projeto novo o que não está no banco: Auth (provedores, Google, SMTP do Resend, Site URL e Redirect URLs), os buckets do Storage (as fotos antigas não voltam) e as chaves na Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). Depois, Redeploy.
5. Avise o grupo: as provas voltam sem as fotos. Quem saiu ou excluiu a conta depois da data da cópia pode pedir a exclusão de novo (a política de privacidade promete isso).

## Limites conhecidos

- Até 24 h de dados podem se perder (uma cópia por dia). Rodar à mão antes de mudanças grandes reduz isso.
- O artefato expira em 30 dias. Uma cópia mais antiga precisa ser baixada antes e guardada cifrada em outro lugar.
- O teste do CI restaura num Supabase local com a versão do CLI fixada (2.122.0). Um projeto novo na nuvem pode ter outra versão do Postgres ou do Auth. Antes de precisar de verdade, vale um ensaio: restaurar a cópia num projeto grátis descartável e abrir o app apontado para ele.
