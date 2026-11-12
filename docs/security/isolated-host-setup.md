# Hospedagem isolada para vídeos e exercícios de código

O player do YouTube e os interpretadores Python, SQL e Bash devem usar uma origem separada da página autenticada. Isso impede que o código executado receba os cookies da sessão do Pacto.

## Configuração na Vercel

1. Adicione um segundo domínio ao mesmo projeto Vercel do Pacto, por exemplo um domínio Vercel independente como https://pactus-isolated.vercel.app. A origem do Pacto é https://www.pactus.dev.br.
2. Use um domínio registrável separado do Pacto. Não use subdomínio de pactus.dev.br e não configure cookie de autenticação com Domain compartilhado. O Supabase deve continuar usando cookies restritos ao hostname.
3. Confirme que NEXT_PUBLIC_SITE_URL aponta para a origem principal real do Pacto. O middleware usa essa configuração para distinguir a origem autenticada da origem isolada.
4. Defina NEXT_PUBLIC_ISOLATED_ORIGIN com a origem completa do segundo domínio, sem caminho, como https://pactus-isolated.vercel.app. Como a variável é pública e entra no build do Next.js, gere uma nova implantação depois de configurá-la.
5. A segunda origem pode apontar para a mesma implantação Vercel. O middleware permite ali apenas os arquivos estáticos necessários; páginas, login e APIs respondem 404. Os workers usam os mesmos arquivos do build, inclusive o worker empacotado do Bash.
6. Confirme no navegador que /playground-runner.html carrega, que uma URL de API nessa origem responde 404 e que o exercício de Bash encontra o arquivo em /_next/static/.

A política de incorporação permite somente https://www.pactus.dev.br e https://pactus.dev.br. Se o domínio principal mudar, atualize a lista em next.config.ts e public/isolated-origin-policy.js. Os previews da Vercel não recebem os dados do player; neles os vídeos usam o modo direto e o progresso manual.

## Desenvolvimento local

Com o app em http://localhost:3000, pode-se usar http://127.0.0.1:3000 como a origem isolada. Configure NEXT_PUBLIC_SITE_URL=http://localhost:3000 e NEXT_PUBLIC_ISOLATED_ORIGIN=http://127.0.0.1:3000 no ambiente local e reinicie o servidor. As duas origens usam hostnames diferentes e o navegador não compartilha cookies entre elas.

## Comportamento sem configuração

Sem NEXT_PUBLIC_ISOLATED_ORIGIN, os vídeos ainda abrem em youtube-nocookie.com sem carregar a API na página autenticada; a pessoa marca o progresso manualmente. A execução de Python, SQL e Bash fica desativada até a origem isolada responder e validar a mensagem de conexão. Java e JavaScript continuam com seus ambientes locais separados.
