# Hospedagem isolada para vídeos e exercícios de código

O player do YouTube e os interpretadores Python, SQL e Bash devem usar uma origem separada da página autenticada. Isso impede que o código executado receba os cookies da sessão do Pacto.

## Configuração na Vercel

1. Adicione um segundo domínio ao mesmo projeto Vercel do Pacto, por exemplo um domínio Vercel independente como https://pactus-isolated.vercel.app. A origem do Pacto é https://www.pactus.dev.br.
2. Use um domínio registrável separado do Pacto. Não use subdomínio de pactus.dev.br e não configure cookie de autenticação com Domain compartilhado. O código rejeita o domínio principal e seus subdomínios como executor. O Supabase deve continuar usando cookies restritos ao hostname.
3. Confirme que NEXT_PUBLIC_SITE_URL aponta para a origem principal real do Pacto. O middleware usa essa configuração para distinguir a origem autenticada da origem isolada.
4. Defina NEXT_PUBLIC_ISOLATED_ORIGIN com a origem completa do segundo domínio, sem caminho, como https://pactus-isolated.vercel.app. Como a variável é pública e entra no build do Next.js, gere uma nova implantação depois de configurá-la.
5. A segunda origem pode apontar para a mesma implantação Vercel. O middleware permite ali apenas os arquivos estáticos necessários; páginas, login e APIs respondem 404. Os workers usam os mesmos arquivos do build, inclusive o worker empacotado do Bash.
6. Confirme no navegador que /playground-runner.html carrega, que uma URL de API nessa origem responde 404 e que o exercício de Bash encontra o arquivo em /_next/static/.

A política de incorporação permite somente https://www.pactus.dev.br e https://pactus.dev.br. Se o domínio principal mudar, atualize a lista em next.config.ts e public/isolated-origin-policy.js. Os previews da Vercel não recebem os dados do player; neles os vídeos usam o modo direto e o progresso manual.

## Desenvolvimento local

Com o app em http://localhost:3000, pode-se usar http://127.0.0.1:3000 como a origem isolada. Configure NEXT_PUBLIC_SITE_URL=http://localhost:3000 e NEXT_PUBLIC_ISOLATED_ORIGIN=http://127.0.0.1:3000 no ambiente local e reinicie o servidor. As duas origens usam hostnames diferentes e o navegador não compartilha cookies entre elas.

## Comportamento sem configuração

Sem NEXT_PUBLIC_ISOLATED_ORIGIN, os vídeos ainda abrem em youtube-nocookie.com sem carregar a API na página autenticada; a pessoa marca o progresso manualmente. A execução de Python, SQL e Bash fica desativada até a origem isolada responder e validar a mensagem de conexão. Java e JavaScript continuam com seus ambientes locais separados.

## Achados da revisão de 13/11/2026 (corrigidos nesta branch)

- O middleware decidia pelo `request.nextUrl.host`, que no `next start` e no `next dev` é o hostname do próprio servidor:
  a origem isolada recebia o app inteiro (login, páginas, APIs). Agora conta qualquer host que a requisição nomeia
  (`Host`, primeiro `X-Forwarded-Host`, URL do Next); um cabeçalho forjado só torna a resposta mais restrita.
- Em `/aprender`, que tem COEP no Chromium, o executor e o player isolados não carregavam (`chrome-error`): o atributo
  `credentialless` era posto num `ref`, depois de a navegação começar. Agora vem no próprio JSX.
- O Bash falhava no build de produção ("Module scripts don't support importScripts()"): o chunk do worker gerado pelo
  webpack carrega as partes com `importScripts`, então o executor o abre como worker clássico.
- JavaScript e TypeScript: um loop infinito síncrono no `iframe` travava a aba inteira, e o limite de 5 s nunca disparava.
  O compilador TypeScript (já usado para TS) agora põe um limite de tempo em todo loop (`src/lib/loop-guard.ts`).
  Travamentos que não são loop (`"x".repeat(1e9)`, expressão regular catastrófica) continuam possíveis.

## Validação na Vercel (depende de quem administra a conta)

O Python, o SQL e o Bash só rodam quando a página-mãe é `https://www.pactus.dev.br` ou `https://pactus.dev.br`
(lista fixa em `youtube-player-messages.ts`, `isolated-origin-policy.js` e no `frame-ancestors` do `next.config.ts`).
Num preview `*.vercel.app` eles ficam pausados de propósito, e os vídeos usam o modo direto. Para validar antes da
produção, é preciso um domínio de staging incluído nessas três listas, ou validar no domínio principal depois do deploy.
Roteiro: abrir `/aprender` no Chrome, conferir no DevTools que o `iframe` do executor vem de `NEXT_PUBLIC_ISOLATED_ORIGIN`,
rodar os exemplos de Python, SQL e Bash, e abrir `https://<origem isolada>/api/feedback` e `/login` (devem dar 404).
