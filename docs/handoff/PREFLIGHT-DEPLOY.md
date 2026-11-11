# Preflight de deploy — Pacto

**Decisão atual: não publicar em produção ainda.** O pacote para integração está pronto e as verificações locais do checkout passaram, mas faltam validações do banco e do ambiente real, configuração do feedback e a identidade legal do controlador.

## Verificações locais neste checkout

| Verificação | Resultado |
|---|---|
| Testes unitários | PASS — 198 testes em 25 arquivos |
| Build Next.js | PASS |
| TypeScript | PASS — `npm run typecheck` |
| Lint | PASS — executado durante o build |
| Espaços no diff rastreado | PASS — `git diff --check` |
| Varredura do endereço pessoal e mailto | Nenhuma ocorrência no código atual nem nos arquivos estáticos do build |
| Histórico Git local | Nenhuma ocorrência do endereço pessoal no histórico consultado |
| Testes SQL/RLS | NÃO EXECUTADOS — este ambiente não tem PostgreSQL/Supabase CLI; o script de banco depende de PostgreSQL local |
| npm audit | INCONCLUSIVO — o registry do npm falhou ao resolver por DNS |
| Staging / produção | NÃO ACESSADOS |
| Deploy | NÃO REALIZADO |

## O que mudou no feedback

- O formulário está em Configurações e em `/feedback`; exige conta autenticada.
- O navegador envia a categoria e o texto ao endpoint `POST /api/feedback`; o endereço de destino não vai ao navegador.
- O endpoint valida origem e corpo, limita mensagem a 2.000 caracteres, envia por Resend no servidor e não anexa automaticamente e-mail, perfil ou ID de conta à mensagem.
- A migration `0031_feedback_rate_limits.sql` limita os envios por conta; o cron diário apaga metadados antigos.
- `Equipe Pactus` é o nome público do projeto. Não foi usado como identidade legal do controlador.

## Bloqueios antes de produção

1. **Integrar no checkout oficial atualizado.** Esta entrega é uma cópia de referência sem histórico Git; revisar diferenças e preservar o trabalho recente do repositório oficial.
2. **Validar o banco.** Verificar a sequência das migrations no checkout-alvo, aplicar a migration de limite de feedback em staging e executar testes SQL/RLS. Não presumir que o número 0031 está livre em um checkout diferente.
3. **Configurar Resend em variáveis privadas do servidor:** `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` e `FEEDBACK_FROM_EMAIL`. O remetente precisa estar verificado. Nunca usar prefixo `NEXT_PUBLIC_` nem colocar esses valores no navegador ou em documentos compartilhados.
4. **Informar a identidade real do controlador** em `NEXT_PUBLIC_CONTROLLER_NAME` antes de gerar o build de produção. As páginas legais atuais mostram claramente que essa identidade ainda não foi informada. Equipe Pactus pode continuar como nome público.
5. **Repetir `npm audit`** quando o registry estiver acessível.
6. **Validar staging com dados sintéticos:** login, envio e falha de feedback, limite de envios, cron de limpeza, aulas, playlists, desafios, privacidade entre contas, uploads, logout e fluxos do grupo.
7. **Revisar as páginas legais, serviços externos, variáveis e redirects** no ambiente de staging. O texto deve corresponder à configuração real do Supabase, Vercel, Resend, Sentry, Gemini e YouTube.
8. Só propor o deploy público depois de apresentar os resultados ao responsável e receber autorização.

## Resultado

O código pode ser integrado e enviado à IA do colega agora. Para produção, os itens acima ainda precisam ser concluídos no checkout e nos serviços reais. Nenhuma alteração remota foi feita por este pacote.
