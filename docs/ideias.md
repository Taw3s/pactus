# Pacto — ideias, decisões e pendências

Documento vivo: anote aqui o que for surgindo. Atualizado em 27/10/2026.

## Visão

O Pacto tem duas camadas:

1. **Núcleo (serve para qualquer conteúdo):** grupo, metas diárias, provas, juiz, tribunal, dívida, sequência e ranking. É a cobrança social, e é o que faz as pessoas voltarem.
2. **Trilhas (uma por conteúdo):** cada trilha tem as suas metas e pelo menos uma mecânica que o próprio app mede, sem depender de foto. A digitação é a mecânica da trilha de programação.

**Princípio:** toda trilha boa tem uma mecânica que o app mede e ninguém consegue fingir (o servidor cronometra e calcula a nota, como no teste de digitação).

## Agora: beta fechado

- Foco só em **programação**: estudar, ler um livro e fazer o teste de digitação.
- **Pergunta que o beta precisa responder:** o grupo continua usando depois de 4 semanas? Se a cobrança social segura as pessoas, vale investir em trilhas novas. Se não segura, nenhuma mecânica nova resolve.
- Sinal bom até aqui: os amigos estão mandando fotos e fazendo o teste de digitação.

## Bugs para corrigir

- [x] **Varredura responsiva (27/10):** nenhuma tela rolava para os lados, mas nomes longos viravam "…" (Hoje, ranking, pódio, tribunal, jurados) e três alvos de toque tinham menos de 44 px (nome no Feed, "Como a pontuação funciona", seta do mês em 320 px). Corrigido.
- [x] **Números ilegíveis (Daniel, 27/10):** na fonte pixel o 5 parecia S e o 3 parecia 8 (ranking, placar, código de convite). Corrigido: os algarismos usam a Inter, as letras continuam pixel.
- [x] **Imagem da prova de digitação não mudava ao refazer o teste** (PR #26): Hoje, Feed e página da prova desenham o cartão do melhor teste do dia. Falta: o tribunal ainda mostra a imagem guardada.
- [x] **Palavras "se mexendo" no teste de digitação** (feedback do grupo, 26/10): a partir da 40ª palavra a tela apagava a mais antiga e todas as quebras de linha mudavam. Corrigido no PR seguinte ao #26.
- [x] **Não dava para voltar e corrigir uma palavra** (feedback do grupo): agora Backspace numa palavra vazia volta para a anterior, se ela estiver errada (como no Monkeytype). No celular depende do teclado mandar o evento de apagar; conferir no Android e no iPhone.
- [x] **Leitura "pendente" que não deixava enviar** (Daniel, 26/10): o envio tinha funcionado, mas a tela não atualizou; o segundo envio dava "já enviada". Agora o app atualiza a tela em vez de mostrar erro.
- [ ] Ouvir o grupo sobre o que mais está "horrível" no teste de digitação depois dessas correções (pedir prints ou vídeo).

## Pendências de lançamento

- [ ] Rodar a migration **0014** (limite do Juiz IA) no Supabase, se ainda não rodou.
- [ ] Rodar a migration **0015** (criar desafio e cardápio de dívida) e depois fazer o merge do **PR #25**.
- [ ] Conferir em Configurações se você aparece como dono do grupo atual.
- [ ] **Preview da Vercel falha em todo PR.** Precisa do log: `npx vercel inspect <deploy> --logs`. Corrigindo, dá para testar cada mudança no celular antes do merge.
- [ ] **Domínio** (`pactus.dev.br` no registro.br): trocar **antes** de chamar mais gente, porque o app instalado e os avisos não passam para o endereço novo.
- [ ] **Astra:** revisar os sprites novos (troféus de prata e bronze, os 6 itens do cardápio) e as ideias de "elementos jurídicos" do ChatGPT.
- [ ] Alguém que usa Java e TypeScript no dia a dia ler os textos dessas abas.

## Trilhas futuras

### Enem

- **Sprint de questões:** bloco cronometrado no ritmo da prova (cerca de 3 minutos por questão). As provas e gabaritos antigos do Enem são públicos (INEP); conferir a licença antes de usar.
- **Leitura cronometrada com interpretação:** velocidade de leitura junto com acerto. É a "digitação" do Enem.
- **Flashcards com repetição espaçada:** fórmulas, datas, conceitos.
- **Redação semanal:** foto da redação, com o juiz IA conferindo só a estrutura (tema, proposta de intervenção, tamanho). Não prometer nota de redação feita por IA.

### Programação (pedidos do grupo, 27/10)

- **Treino de linguagens (Lucas):** questõezinhas simples em várias linguagens, "igual ao LeetCode". Sem compilador dá para começar com questões de múltipla escolha, "qual a saída deste código" e lacunas de sintaxe, com respostas conferidas pelo servidor. Rodar código de verdade pede um executor isolado (Judge0, Piston), com custo e risco de segurança: só depois que a versão sem execução provar que o grupo usa.
- **Digitação de código (Lustosa):** digitar código em vez de prosa. Contraria a decisão "só prosa": símbolos são difíceis no teclado do celular. Saída possível: um modo "Código" só no PC, com recordes próprios (o recorde já é separado por modo). Decidir antes de fazer.

### Mecânicas que servem para várias trilhas

- Teste cronometrado pelo servidor (já existe na digitação).
- Flashcards com repetição espaçada (servem também para sintaxe de programação).
- Sprint de questões com tempo por questão.

### O que precisa mudar no app para ter trilhas

Hoje as 3 metas (estudo, digitação, leitura) estão fixas no código e no banco. Ter trilhas significa que **cada grupo escolhe as suas metas**. Essa é a refatoração grande, e é por ela que tudo passa.

## Ideias do Duolingo (sem engenharia reversa)

Mecânicas que o Duolingo já documenta publicamente e que faltam no Pacto:

- **Proteção de ofensiva:** perder um dia sem zerar a sequência. É a mais barata e a de maior efeito.
- **Ligas semanais** com promoção e rebaixamento (hoje o ranking é mensal).
- **Lembrete no horário em que a pessoa costuma fazer as metas** (hoje o horário é fixo).
- **Ofensiva em dupla.**

Cuidado: o Pacto já tem dívida real como punição. Somar proteção de ofensiva com ligas pode virar pressão demais para um grupo pequeno; escolher uma das duas.

## Outros projetos

### Fazendinha de programação

Aprender programação cuidando de uma fazenda: cada área é um conteúdo, e aprender coisas novas aumenta a fazenda.

- O ponto principal: **o código precisa fazer a fazenda funcionar** (um laço rega a fileira, uma condição colhe o que está maduro, uma função automatiza o galinheiro). Se a fazenda for só recompensa, vira enfeite.
- Já existe algo parecido: **The Farmer Was Replaced** (Steam). Jogar antes e achar o diferencial (ensino do zero, várias linguagens, celular).
- Rodar código no navegador: JavaScript (nativo), TypeScript (compilador oficial), Python (Pyodide), SQL (sql.js). Java é o difícil (CheerpJ ou um servidor de execução, que custa dinheiro).
- MVP: uma linguagem, uma área, cerca de 10 conceitos; testar com o grupo do Pacto.
- O gargalo vai ser conteúdo, não código.

## Decisões em aberto

- **Código aberto?** Bom como portfólio, sem esperar que traga usuários. Licença MIT (portfólio) ou AGPL (se um dia quiser ganhar dinheiro). O histórico do git já foi varrido e não tem segredos.
- **Pontos do teste de 5 minutos:** hoje vale o melhor teste do dia de qualquer duração, então o de 5 minutos quase nunca conta. Mudar isso muda a regra.
- **Identidade jurídica (brief de 26/10):** passo 1 feito (PR #29) e revisado em 27/10: aprovado com ajustes (frase da data da foto, Feed no celular). Próximos: Perfil como arquivo mensal e pasta na cena de entrada; depois, autoria dos selos e legibilidade do tribunal. Para estudar: dossiê sem tribunal em duas colunas no desktop (foto à esquerda).
- **Inglês na digitação:** rende mais WPM que português; os recordes são separados, mas os pontos não.

## Decisões já tomadas (para não rediscutir)

- Logo (27/10): o juiz do app em low poly, busto, fundo amarelo. Recusados: P em pixel art (o app é low poly, não pixel), P 3D com rosto (pouco caricato), martelo com cara (clichê jurídico).
- Penalidade: cardápio de 1 ou 2 itens; só o dono troca; a troca vale na segunda seguinte.
- Qualquer pessoa sem grupo pode criar um desafio; cada pessoa fica em um grupo só.
- Digitação: teste dentro do app (sem foto), 3 tentativas por dia, vale o melhor; PC e celular separados.
- Textos de digitação: só prosa, sem símbolos de código.
- Astra é o diretor de design: ideias visuais passam por ele.
