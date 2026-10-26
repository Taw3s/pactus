// Texts for the typing test's "Texto" mode: short explanations about programming, in prose (no
// code symbols), so the test is also a reading. Each person keeps their place in every text
// (typing_progress); a text's id is stored, so never rename one. English texts are the same
// subjects; their ids start with "en-" (the database checks it).
import type { TypingLang } from "./typing";

export interface TypingText {
  id: string;
  lang: TypingLang;
  category: string;
  title: string;
  text: string;
}

export const TYPING_CATEGORIES = ["Fundamentos", "SQL e dados", "Python", "JavaScript", "Web"] as const;

const PT: TypingText[] = [
  {
    lang: "pt",
    id: "algoritmo",
    category: "Fundamentos",
    title: "O que é um algoritmo",
    text:
      "Um algoritmo é uma sequência finita de passos bem definidos para resolver um problema. Uma receita de bolo é um algoritmo: " +
      "tem ingredientes de entrada, instruções em ordem e um resultado no final. Na programação, a ideia é a mesma, mas os passos " +
      "precisam ser tão precisos que uma máquina consiga segui-los sem interpretar nada. Um bom algoritmo sempre termina, dá a " +
      "resposta certa para qualquer entrada válida e não gasta mais tempo nem memória do que o necessário. Por isso, dois " +
      "algoritmos podem resolver o mesmo problema e ainda assim ser muito diferentes: procurar um nome numa lista olhando item por " +
      "item funciona, mas numa lista ordenada é muito mais rápido abrir no meio e descartar metade a cada passo. Essa busca se " +
      "chama busca binária, e mostra que pensar antes de escrever o código costuma valer mais do que digitar rápido.",
  },
  {
    lang: "pt",
    id: "variavel",
    category: "Fundamentos",
    title: "Variáveis e tipos",
    text:
      "Uma variável é um nome que aponta para um valor guardado na memória. Em vez de repetir o número da idade de alguém em vários " +
      "lugares, o programa guarda esse número uma vez e usa o nome sempre que precisar dele. Todo valor tem um tipo, que diz o que " +
      "ele representa e o que se pode fazer com ele. Números inteiros podem ser somados, textos podem ser juntados, valores lógicos " +
      "são apenas verdadeiro ou falso. Algumas linguagens exigem que o tipo de cada variável seja declarado e conferem tudo antes " +
      "de o programa rodar; outras descobrem o tipo enquanto o programa executa. A primeira forma pega muitos erros cedo, a segunda " +
      "deixa escrever mais rápido. Escolher bons nomes para as variáveis parece detalhe, mas é uma das coisas que mais tornam um " +
      "código fácil de ler meses depois.",
  },
  {
    lang: "pt",
    id: "funcao",
    category: "Fundamentos",
    title: "Funções",
    text:
      "Uma função é um bloco de código com nome que recebe dados, faz um trabalho e devolve um resultado. Ela existe para evitar " +
      "repetição e para dar nome a uma ideia. Quando um cálculo de frete aparece em três telas, escrever esse cálculo uma única vez " +
      "dentro de uma função garante que todas as telas mudem juntas quando a regra mudar. Os dados que a função recebe se chamam " +
      "parâmetros. Uma função pura é aquela que, para as mesmas entradas, sempre devolve a mesma saída e não altera nada fora dela; " +
      "funções assim são fáceis de testar e de entender. Funções pequenas, que fazem uma coisa só, costumam ser mais fáceis de " +
      "reaproveitar. Quando o nome de uma função precisa de um e no meio para descrever o que ela faz, é um bom sinal de que ela " +
      "deveria ser dividida em duas.",
  },
  {
    lang: "pt",
    id: "complexidade",
    category: "Fundamentos",
    title: "Complexidade de algoritmos",
    text:
      "A complexidade de um algoritmo descreve como o tempo ou a memória que ele usa crescem quando a entrada cresce. Não importa se " +
      "uma lista de dez itens é processada em um ou dois milissegundos; importa o que acontece com um milhão de itens. Um algoritmo " +
      "linear faz um trabalho proporcional ao tamanho da entrada. Um quadrático, como comparar cada item com todos os outros, fica " +
      "cem vezes mais lento quando a entrada fica dez vezes maior. Já a busca binária é logarítmica: dobrar a lista acrescenta só " +
      "mais um passo. Essa forma de medir ignora detalhes da máquina e foca no formato do crescimento, por isso é chamada de análise " +
      "assintótica. Na prática, ela ajuda a perceber cedo quando uma solução que funciona bem nos testes vai travar quando os dados " +
      "reais chegarem.",
  },
  {
    lang: "pt",
    id: "api",
    category: "Fundamentos",
    title: "O que é uma API",
    text:
      "API quer dizer interface de programação de aplicações. É um contrato que diz como um programa pode pedir algo a outro: quais " +
      "pedidos existem, quais dados enviar e o que volta como resposta. Quando um aplicativo de clima mostra a previsão, ele " +
      "provavelmente pediu esses dados à API de um serviço de meteorologia. O aplicativo não precisa saber como o serviço calcula a " +
      "previsão, só precisa seguir o contrato. Essa separação é o que permite que sistemas diferentes, escritos em linguagens " +
      "diferentes, conversem entre si. Uma boa API é estável, bem documentada e difícil de usar errado. Mudar um contrato que outras " +
      "pessoas já usam quebra os programas delas, por isso APIs públicas costumam ganhar versões novas em vez de mudar as antigas.",
  },
  {
    lang: "pt",
    id: "http",
    category: "Fundamentos",
    title: "Como funciona o HTTP",
    text:
      "HTTP é o protocolo que o navegador usa para conversar com servidores. Cada conversa é um pedido seguido de uma resposta. O " +
      "pedido diz o que se quer, usando um método: GET para buscar algo, POST para enviar dados novos, PUT ou PATCH para alterar, " +
      "DELETE para apagar. A resposta traz um código de status, como duzentos quando deu tudo certo, quatrocentos e quatro quando o " +
      "endereço não existe e quinhentos quando o servidor falhou. Pedidos e respostas também levam cabeçalhos, que são informações " +
      "extras como o tipo do conteúdo ou o token de quem está logado. O HTTP não guarda memória entre um pedido e outro, então o " +
      "servidor só sabe quem você é porque cada pedido carrega essa prova. A versão segura, HTTPS, criptografa tudo no caminho.",
  },
  {
    lang: "pt",
    id: "git",
    category: "Fundamentos",
    title: "Git e controle de versão",
    text:
      "Git é um sistema de controle de versão: ele guarda o histórico de um projeto como uma série de fotografias chamadas commits. " +
      "Cada commit registra o que mudou, quem mudou e por quê, então é possível voltar no tempo, comparar versões e descobrir quando " +
      "um erro apareceu. Branches são linhas paralelas de trabalho. Uma pessoa pode criar uma branch para uma funcionalidade nova " +
      "sem mexer na versão que está em produção, e só juntar as duas quando o trabalho estiver pronto. Essa junção se chama merge. " +
      "Quando duas pessoas alteram a mesma linha, o Git não adivinha qual mudança vale e pede que alguém resolva o conflito. Commits " +
      "pequenos, com mensagens claras, transformam o histórico numa documentação de como o projeto chegou até aqui.",
  },
  {
    lang: "pt",
    id: "compilador-interpretador",
    category: "Fundamentos",
    title: "Compilador e interpretador",
    text:
      "O computador só entende instruções de máquina, então o código que escrevemos precisa ser traduzido. Um compilador traduz o " +
      "programa inteiro de uma vez, antes de ele rodar, e gera um arquivo executável. Linguagens como C, Go e Rust funcionam assim, " +
      "e por isso costumam ser rápidas e acusar muitos erros antes da execução. Um interpretador lê e executa o código aos poucos, " +
      "enquanto o programa roda, o que deixa testar ideias muito rápido. Na prática, a fronteira é borrada. Java é compilado para um " +
      "código intermediário que uma máquina virtual executa, e os motores de JavaScript dos navegadores compilam durante a execução " +
      "os trechos mais usados para ganhar velocidade. A pergunta útil não é se a linguagem é compilada, e sim quando cada erro vai " +
      "aparecer.",
  },
  {
    lang: "pt",
    id: "nuvem",
    category: "Fundamentos",
    title: "O que é a nuvem",
    text:
      "A nuvem é o uso de computadores de outra empresa pela internet, pagando pelo que se usa. Em vez de comprar servidores, " +
      "instalar e manter tudo numa sala, uma equipe aluga capacidade de provedores que têm centros de dados espalhados pelo mundo. " +
      "Existem níveis diferentes de serviço. No mais básico, você aluga máquinas virtuais e cuida de todo o resto. Em serviços " +
      "gerenciados, o provedor cuida do banco de dados, das cópias de segurança e das atualizações. No modelo sem servidor, você só " +
      "envia o código e ele roda quando alguém faz um pedido. A grande vantagem é poder crescer ou diminuir em minutos. O cuidado é " +
      "com a conta: recursos esquecidos ligados continuam custando, e configurar mal uma permissão pode deixar dados expostos para " +
      "qualquer pessoa.",
  },
  {
    lang: "pt",
    id: "senhas",
    category: "Fundamentos",
    title: "Como guardar senhas",
    text:
      "Um sistema nunca deveria guardar a senha das pessoas como ela foi digitada. Se o banco de dados vazar, todas as contas ficam " +
      "expostas, e como muita gente repete senhas, o estrago vai além daquele site. O certo é guardar um hash, que é o resultado de " +
      "uma função de mão única: é fácil calcular o hash a partir da senha, mas inviável fazer o caminho inverso. No login, o sistema " +
      "calcula o hash do que foi digitado e compara com o guardado. Cada senha também recebe um sal, um valor aleatório que impede " +
      "que duas senhas iguais tenham o mesmo hash. Funções feitas para isso, como bcrypt e argon2, são lentas de propósito, para que " +
      "testar milhões de tentativas fique caro demais para um atacante.",
  },
  {
    lang: "pt",
    id: "sql-o-que-e",
    category: "SQL e dados",
    title: "O que é SQL",
    text:
      "SQL é a linguagem usada para conversar com bancos de dados relacionais. Nesses bancos, os dados ficam em tabelas, com linhas " +
      "e colunas, parecidas com uma planilha bem organizada. Com SQL você descreve o que quer, e não como buscar. Por exemplo, pedir " +
      "todos os alunos com nota acima de sete, ordenados pelo nome, é uma única instrução; o banco decide sozinho o caminho mais " +
      "rápido para encontrar essas linhas. As instruções mais comuns são SELECT para consultar, INSERT para incluir, UPDATE para " +
      "alterar e DELETE para apagar. Também é possível juntar tabelas diferentes numa mesma consulta, combinando, por exemplo, cada " +
      "pedido com o cliente que o fez. Mesmo com tantas tecnologias novas, SQL continua sendo uma das habilidades mais úteis para " +
      "quem trabalha com dados.",
  },
  {
    lang: "pt",
    id: "sql-chaves",
    category: "SQL e dados",
    title: "Chaves primárias e estrangeiras",
    text:
      "Toda tabela bem desenhada tem uma chave primária, uma coluna cujo valor identifica cada linha de forma única. Pode ser um " +
      "número que cresce sozinho ou um identificador aleatório. Nome e email são escolhas ruins, porque mudam. Uma chave " +
      "estrangeira é uma coluna que aponta para a chave primária de outra tabela. Na tabela de pedidos, a coluna do cliente guarda " +
      "o identificador de alguém da tabela de clientes. O banco passa a garantir essa ligação: ele recusa um pedido para um cliente " +
      "que não existe e pode impedir que um cliente com pedidos seja apagado, ou apagar os pedidos junto, conforme a regra " +
      "escolhida. Essa garantia se chama integridade referencial. Ela tira do código da aplicação a responsabilidade de manter os " +
      "dados coerentes, porque nenhum programa consegue gravar uma ligação quebrada.",
  },
  {
    lang: "pt",
    id: "sql-indices",
    category: "SQL e dados",
    title: "Índices em bancos de dados",
    text:
      "Sem um índice, para encontrar as linhas de um cliente o banco precisa ler a tabela inteira, linha por linha. Com poucas " +
      "linhas isso não importa, mas com milhões vira um problema. Um índice funciona como o índice remissivo de um livro: uma " +
      "estrutura ordenada que diz onde está cada valor, geralmente organizada como uma árvore que permite chegar ao dado em poucos " +
      "passos. Índices deixam as consultas muito mais rápidas, mas não são de graça. Eles ocupam espaço e precisam ser atualizados a " +
      "cada inclusão ou alteração, o que deixa as escritas um pouco mais lentas. Por isso, a regra é criar índices para as colunas " +
      "mais usadas em filtros, junções e ordenações, e conferir com o plano de execução se o banco está mesmo usando o índice que " +
      "você criou.",
  },
  {
    lang: "pt",
    id: "sql-transacoes",
    category: "SQL e dados",
    title: "Transações",
    text:
      "Uma transação agrupa várias operações num bloco que acontece por inteiro ou não acontece. O exemplo clássico é uma " +
      "transferência bancária: tirar dinheiro de uma conta e colocar na outra são dois passos, e seria um desastre se só o primeiro " +
      "acontecesse por causa de uma queda de energia. Dentro de uma transação, se algo falhar, tudo é desfeito com um rollback; se " +
      "der certo, o commit confirma todas as mudanças de uma vez. Os bancos relacionais prometem quatro propriedades, conhecidas " +
      "pela sigla ACID: atomicidade, consistência, isolamento e durabilidade. O isolamento é o mais sutil, porque define o que uma " +
      "transação enxerga das outras que estão rodando ao mesmo tempo, e níveis mais rígidos trazem mais segurança ao custo de " +
      "desempenho.",
  },
  {
    lang: "pt",
    id: "python-intro",
    category: "Python",
    title: "Por que Python é tão popular",
    text:
      "Python é uma linguagem criada por Guido van Rossum e lançada em mil novecentos e noventa e um. Ela ficou famosa por ser fácil " +
      "de ler: os blocos de código são definidos pela indentação, e não por símbolos, o que obriga o código a ter uma aparência " +
      "organizada. Python é interpretada e tem tipagem dinâmica, então dá para testar ideias rapidamente no terminal. Sua maior " +
      "força está no ecossistema. Existem bibliotecas prontas para análise de dados, aprendizado de máquina, automação de tarefas, " +
      "desenvolvimento web e computação científica. Por isso a mesma linguagem é usada por cientistas, analistas e engenheiros de " +
      "software. A filosofia da linguagem diz que deveria haver uma forma óbvia de fazer cada coisa, e que legibilidade conta. O " +
      "preço da simplicidade é a velocidade, menor que a de linguagens compiladas.",
  },
  {
    lang: "pt",
    id: "python-listas",
    category: "Python",
    title: "Listas e dicionários em Python",
    text:
      "Em Python, as duas estruturas de dados mais usadas são a lista e o dicionário. Uma lista guarda itens em ordem e permite " +
      "acessá-los pela posição, começando do zero. Ela pode crescer, encolher e misturar tipos diferentes, e é ideal quando a ordem " +
      "importa. Um dicionário guarda pares de chave e valor, como um nome associado a um telefone. Buscar um valor pela chave é " +
      "muito rápido, mesmo com milhões de itens, porque o dicionário usa uma tabela de espalhamento por baixo. Python ainda oferece " +
      "tuplas, que são listas que não podem ser alteradas, e conjuntos, que guardam itens sem repetição. Escolher a estrutura certa " +
      "muda tudo: verificar se um nome está numa lista exige olhar item por item, enquanto num conjunto a resposta vem quase " +
      "instantaneamente.",
  },
  {
    lang: "pt",
    id: "js-intro",
    category: "JavaScript",
    title: "A história do JavaScript",
    text:
      "JavaScript foi criado em mil novecentos e noventa e cinco por Brendan Eich, em cerca de dez dias, para dar interatividade às " +
      "páginas do navegador Netscape. Apesar do nome, não tem relação com Java; o nome foi uma jogada de marketing da época. Hoje " +
      "ele é a única linguagem que todos os navegadores executam de forma nativa, e por isso está em praticamente todo site. Com o " +
      "Node.js, passou a rodar também em servidores, e uma mesma equipe pode escrever as duas pontas de uma aplicação. A linguagem " +
      "é padronizada com o nome ECMAScript e ganha novidades todos os anos. Muitos projetos usam TypeScript, que acrescenta tipos ao " +
      "JavaScript e acusa erros antes de o código rodar, sem mudar o que acontece no navegador.",
  },
  {
    lang: "pt",
    id: "js-assincrono",
    category: "JavaScript",
    title: "JavaScript assíncrono",
    text:
      "JavaScript executa uma coisa de cada vez, numa única linha de execução. Se cada pedido à internet travasse o programa até a " +
      "resposta chegar, a página congelaria. A solução é o modelo assíncrono. Quando o código pede algo demorado, como dados de um " +
      "servidor, ele registra o que fazer quando a resposta chegar e segue em frente. Um mecanismo chamado laço de eventos fica " +
      "conferindo quais tarefas terminaram e executa a continuação de cada uma. As promessas representam um valor que ainda vai " +
      "existir, e as palavras async e await permitem escrever esse fluxo como se fosse uma sequência normal, de cima para baixo. O " +
      "erro mais comum de quem está começando é esquecer de esperar uma promessa e usar um resultado que ainda não chegou.",
  },
  {
    lang: "pt",
    id: "html-css",
    category: "Web",
    title: "HTML e CSS",
    text:
      "Toda página web começa com HTML, a linguagem que descreve a estrutura do conteúdo: o que é título, o que é parágrafo, onde " +
      "há uma lista, uma imagem ou um botão. HTML não é uma linguagem de programação, porque não tem lógica nem decisões; ela marca " +
      "o significado de cada parte. Usar a marcação certa importa, porque leitores de tela e mecanismos de busca dependem dela para " +
      "entender a página. O CSS cuida da aparência: cores, fontes, espaçamentos e a disposição dos elementos na tela. Separar " +
      "estrutura de estilo permite mudar o visual de um site inteiro sem tocar no conteúdo. Com recursos como flexbox e grid, e com " +
      "regras que mudam conforme a largura da tela, o mesmo HTML se adapta a um celular e a um monitor grande.",
  },
  {
    lang: "pt",
    id: "web-navegador",
    category: "Web",
    title: "O que acontece ao abrir um site",
    text:
      "Quando você digita um endereço e aperta enter, muita coisa acontece em menos de um segundo. Primeiro, o navegador pergunta ao " +
      "DNS qual é o endereço numérico do servidor daquele nome. Depois abre uma conexão com ele e, se o site usa HTTPS, os dois " +
      "combinam uma chave para criptografar a conversa. Então o navegador pede a página, e o servidor responde com o HTML. Ao ler " +
      "esse HTML, o navegador descobre que precisa de outros arquivos, como estilos, scripts e imagens, e pede cada um deles. Com " +
      "tudo em mãos, monta a árvore de elementos, calcula onde cada coisa fica e pinta a tela. Por isso sites rápidos se preocupam " +
      "em enviar menos arquivos e arquivos menores, e em mostrar o conteúdo principal antes do resto.",
  },
];

const EN: Omit<TypingText, "lang">[] = [
  {
    id: "en-algorithm",
    category: "Fundamentos",
    title: "What is an algorithm",
    text:
      "An algorithm is a finite sequence of well defined steps that solves a problem. A cake recipe is an algorithm: it has " +
      "ingredients as input, instructions in order and a result at the end. In programming the idea is the same, but the steps " +
      "must be so precise that a machine can follow them without interpreting anything. A good algorithm always finishes, gives " +
      "the right answer for every valid input and uses no more time or memory than it needs. That is why two algorithms can solve " +
      "the same problem and still be very different. Looking for a name in a list by checking every item works, but in a sorted " +
      "list it is much faster to open the middle and throw away half of the list at each step. This is called binary search, and " +
      "it shows that thinking before writing code is often worth more than typing fast.",
  },
  {
    id: "en-variables",
    category: "Fundamentos",
    title: "Variables and types",
    text:
      "A variable is a name that points to a value stored in memory. Instead of repeating a number in many places, a program keeps " +
      "it once and uses the name whenever it needs it. Every value has a type, which says what it represents and what can be done " +
      "with it. Whole numbers can be added, pieces of text can be joined, and boolean values are only true or false. Some languages " +
      "require the type of every variable to be declared and check everything before the program runs; others find out the types " +
      "while the program is running. The first approach catches many mistakes early, while the second lets you write code faster. " +
      "Choosing good names for variables looks like a small detail, but it is one of the things that most help code stay easy to " +
      "read months later.",
  },
  {
    id: "en-functions",
    category: "Fundamentos",
    title: "Functions",
    text:
      "A function is a named block of code that receives data, does some work and returns a result. It exists to avoid repetition " +
      "and to give a name to an idea. When the same shipping calculation appears on three screens, writing it once inside a function " +
      "makes sure all three screens change together when the rule changes. The values a function receives are called parameters. A " +
      "pure function always returns the same output for the same inputs and changes nothing outside of itself, which makes it easy " +
      "to test and to understand. Small functions that do only one thing are usually easier to reuse. When the name of a function " +
      "needs the word and in the middle to describe what it does, that is a good sign it should be split into two.",
  },
  {
    id: "en-complexity",
    category: "Fundamentos",
    title: "Algorithm complexity",
    text:
      "The complexity of an algorithm describes how the time or memory it needs grows as the input grows. It does not matter " +
      "whether a list of ten items takes one or two milliseconds; what matters is what happens with a million items. A linear " +
      "algorithm does work in proportion to the size of the input. A quadratic one, such as comparing every item with every other " +
      "item, becomes a hundred times slower when the input becomes ten times larger. Binary search is logarithmic: doubling the " +
      "list adds only one more step. This way of measuring ignores the details of the machine and focuses on the shape of the " +
      "growth, which is why it is called asymptotic analysis. In practice it helps you notice early when a solution that works well " +
      "in tests will freeze once real data arrives.",
  },
  {
    id: "en-api",
    category: "Fundamentos",
    title: "What is an API",
    text:
      "API stands for application programming interface. It is a contract that says how one program can ask something of another: " +
      "which requests exist, which data to send and what comes back as an answer. When a weather app shows the forecast, it has " +
      "probably asked a weather service for that data through its API. The app does not need to know how the service calculates " +
      "the forecast; it only needs to follow the contract. This separation is what allows different systems, written in different " +
      "languages, to talk to each other. A good API is stable, well documented and hard to use the wrong way. Changing a contract " +
      "that other people already depend on breaks their programs, so public APIs usually get new versions instead of changing the " +
      "old ones.",
  },
  {
    id: "en-http",
    category: "Fundamentos",
    title: "How HTTP works",
    text:
      "HTTP is the protocol a browser uses to talk to servers. Every conversation is a request followed by a response. The request " +
      "says what is wanted by using a method: GET to fetch something, POST to send new data, PUT or PATCH to change it and DELETE " +
      "to remove it. The response carries a status code, such as two hundred when everything went well, four hundred and four when " +
      "the address does not exist and five hundred when the server failed. Requests and responses also carry headers, which are " +
      "extra details like the type of the content or the token of the person who is logged in. HTTP keeps no memory between one " +
      "request and the next, so the server only knows who you are because every request carries that proof. Its secure version, " +
      "HTTPS, encrypts everything along the way.",
  },
  {
    id: "en-git",
    category: "Fundamentos",
    title: "Git and version control",
    text:
      "Git is a version control system: it keeps the history of a project as a series of snapshots called commits. Each commit " +
      "records what changed, who changed it and why, so you can go back in time, compare versions and find out when a bug first " +
      "appeared. Branches are parallel lines of work. Someone can create a branch for a new feature without touching the version " +
      "that is running in production, and only join the two when the work is ready. Joining them is called a merge. When two people " +
      "change the same line, Git does not guess which change wins and asks someone to resolve the conflict. Small commits with clear " +
      "messages turn the history into documentation of how the project got to where it is today.",
  },
  {
    id: "en-compiler-interpreter",
    category: "Fundamentos",
    title: "Compiler and interpreter",
    text:
      "A computer only understands machine instructions, so the code we write has to be translated. A compiler translates the whole " +
      "program at once, before it runs, and produces an executable file. Languages like C, Go and Rust work this way, which is why " +
      "they tend to be fast and to report many errors before the program even starts. An interpreter reads and runs the code bit by " +
      "bit while the program is running, which makes it very quick to try out ideas. In practice the line is blurry. Java is " +
      "compiled into an intermediate code that a virtual machine runs, and the JavaScript engines in browsers compile the most used " +
      "parts of the code while it runs in order to make them faster. The useful question is not whether a language is compiled, but " +
      "when each kind of error will show up.",
  },
  {
    id: "en-cloud",
    category: "Fundamentos",
    title: "What is the cloud",
    text:
      "The cloud means using computers owned by another company over the internet and paying for what you use. Instead of buying servers " +
      "and keeping them running in a room, a team rents capacity from providers that have data centers all over the world. There " +
      "are different levels of service. At the most basic level you rent virtual machines and take care of everything else. With " +
      "managed services, the provider looks after the database, the backups and the updates. In the serverless model you only send " +
      "your code, and it runs whenever someone makes a request. The big advantage is being able to grow or shrink in minutes. The " +
      "risk is the bill: forgotten resources keep costing money, and a badly configured permission can leave data open to anyone.",
  },
  {
    id: "en-passwords",
    category: "Fundamentos",
    title: "How to store passwords",
    text:
      "A system should never store passwords exactly as people typed them. If the database leaks, every account is exposed, and " +
      "since many people reuse passwords, the damage goes far beyond that one site. The right way is to store a hash, the result of " +
      "a one way function: it is easy to compute the hash from the password, but practically impossible to go the other way. At " +
      "login, the system hashes what was typed and compares it with the stored value. Each password also gets a salt, a random " +
      "value that keeps two identical passwords from having the same hash. Functions made for this purpose, such as bcrypt and " +
      "argon2, are slow on purpose, so that trying millions of guesses becomes far too expensive for an attacker.",
  },
  {
    id: "en-sql-what",
    category: "SQL e dados",
    title: "What is SQL",
    text:
      "SQL is the language used to talk to relational databases. In these databases, data lives in tables made of rows and columns, " +
      "much like a well organized spreadsheet. With SQL you describe what you want, not how to find it. For example, asking for all " +
      "students with a grade above seven, sorted by name, is a single statement; the database decides on its own the fastest way to " +
      "find those rows. The most common statements are SELECT to read data, INSERT to add it, UPDATE to change it and DELETE to " +
      "remove it. You can also join different tables in the same query, matching for example each order with the customer who " +
      "placed it. Even with so many new technologies around, SQL is still one of the most useful skills for anyone who works with " +
      "data.",
  },
  {
    id: "en-sql-keys",
    category: "SQL e dados",
    title: "Primary and foreign keys",
    text:
      "Every well designed table has a primary key, a column whose value identifies each row in a unique way. It can be a number " +
      "that grows on its own or a random identifier. Names and email addresses are poor choices, because they change. A foreign key " +
      "is a column that points to the primary key of another table. In an orders table, the customer column holds the identifier of " +
      "someone from the customers table. The database then guarantees that link: it refuses an order for a customer who does not " +
      "exist, and it can either stop a customer with orders from being deleted or delete the orders as well, depending on the rule " +
      "you chose. This guarantee is called referential integrity. It takes the job of keeping data consistent away from the " +
      "application code, because no program can save a broken link.",
  },
  {
    id: "en-sql-indexes",
    category: "SQL e dados",
    title: "Database indexes",
    text:
      "Without an index, to find the rows of one customer the database has to read the entire table, row by row. With a few rows " +
      "that does not matter, but with millions it becomes a problem. An index works like the index at the back of a book: a sorted " +
      "structure that says where each value is, usually organized as a tree that reaches the data in a few steps. Indexes make " +
      "queries much faster, but they are not free. They take up space and must be updated on every insert or change, which makes " +
      "writes a little slower. So the rule is to create indexes for the columns that are used most in filters, joins and sorting, " +
      "and to check the execution plan to make sure the database is really using the index you created.",
  },
  {
    id: "en-sql-transactions",
    category: "SQL e dados",
    title: "Transactions",
    text:
      "A transaction groups several operations into a block that either happens completely or does not happen at all. The classic " +
      "example is a bank transfer: taking money out of one account and putting it into another are two steps, and it would be a " +
      "disaster if only the first one happened because of a power cut. Inside a transaction, if something fails, everything is " +
      "undone with a rollback; if it all works, a commit confirms every change at once. Relational databases promise four " +
      "properties, known by the acronym ACID: atomicity, consistency, isolation and durability. Isolation is the most subtle one, " +
      "because it defines what a transaction can see of others running at the same time, and stricter levels bring more safety at " +
      "the cost of performance.",
  },
  {
    id: "en-python-intro",
    category: "Python",
    title: "Why Python is so popular",
    text:
      "Python is a language created by Guido van Rossum and first released in nineteen ninety one. It became famous for being easy " +
      "to read: blocks of code are defined by indentation instead of symbols, which forces the code to look organized. Python is " +
      "interpreted and dynamically typed, so you can try ideas quickly in the terminal. Its greatest strength is its ecosystem. " +
      "There are ready made libraries for data analysis, machine learning, task automation, web development and scientific " +
      "computing. That is why the same language is used by scientists, analysts and software engineers. The philosophy of the " +
      "language says that there should be one obvious way to do each thing, and that readability counts. The price of this " +
      "simplicity is speed, which is lower than in compiled languages.",
  },
  {
    id: "en-python-collections",
    category: "Python",
    title: "Lists and dictionaries in Python",
    text:
      "In Python, the two most used data structures are the list and the dictionary. A list keeps items in order and lets you reach " +
      "them by position, starting from zero. It can grow, shrink and mix different types, and it is ideal when order matters. A " +
      "dictionary keeps pairs of keys and values, like a name linked to a phone number. Looking up a value by its key is very fast, " +
      "even with millions of items, because the dictionary uses a hash table underneath. Python also offers tuples, which are lists " +
      "that cannot be changed, and sets, which keep items without repetition. Choosing the right structure changes everything: " +
      "checking whether a name is in a list means looking at every item, while in a set the answer comes almost instantly.",
  },
  {
    id: "en-js-intro",
    category: "JavaScript",
    title: "The story of JavaScript",
    text:
      "JavaScript was created in nineteen ninety five by Brendan Eich, in about ten days, to make pages in the Netscape browser " +
      "interactive. Despite its name, it has nothing to do with Java; the name was a marketing move of the time. Today it is the " +
      "only language that every browser runs natively, which is why it is on almost every website. With Node.js it also runs on " +
      "servers, so a single team can write both ends of an application. The language is standardized under the name ECMAScript and " +
      "gets new features every year. Many projects use TypeScript, which adds types to JavaScript and reports errors before the code " +
      "runs, without changing what happens in the browser.",
  },
  {
    id: "en-js-async",
    category: "JavaScript",
    title: "Asynchronous JavaScript",
    text:
      "JavaScript runs one thing at a time, on a single thread. If every request to the internet stopped the program until the " +
      "answer arrived, the page would freeze. The solution is the asynchronous model. When the code asks for something slow, such " +
      "as data from a server, it registers what to do when the answer arrives and moves on. A mechanism called the event loop keeps " +
      "checking which tasks have finished and runs the next part of each one. Promises represent a value that will exist later, and " +
      "the words async and await let you write this flow as if it were a normal sequence, from top to bottom. The most common " +
      "mistake beginners make is forgetting to wait for a promise and using a result that has not arrived yet.",
  },
  {
    id: "en-html-css",
    category: "Web",
    title: "HTML and CSS",
    text:
      "Every web page starts with HTML, the language that describes the structure of the content: what is a heading, what is a " +
      "paragraph, where there is a list, an image or a button. HTML is not a programming language, because it has no logic or " +
      "decisions; it marks the meaning of each part. Using the right markup matters, because screen readers and search engines " +
      "depend on it to understand the page. CSS takes care of how things look: colors, fonts, spacing and the layout of elements on " +
      "the screen. Keeping structure apart from style lets you change the look of a whole site without touching the content. With " +
      "tools like flexbox and grid, and rules that change with the width of the screen, the same HTML adapts to a phone and to a " +
      "large monitor.",
  },
  {
    id: "en-web-browser",
    category: "Web",
    title: "What happens when you open a site",
    text:
      "When you type an address and press enter, a lot happens in less than a second. First, the browser asks the DNS for the " +
      "numeric address of the server behind that name. Then it opens a connection to it and, if the site uses HTTPS, the two agree " +
      "on a key to encrypt the conversation. Next the browser asks for the page, and the server answers with the HTML. While " +
      "reading that HTML, the browser finds out it needs other files, such as styles, scripts and images, and asks for each of " +
      "them. With everything in hand, it builds the tree of elements, works out where each thing goes and paints the screen. That " +
      "is why fast sites care about sending fewer and smaller files, and about showing the main content before everything else.",
  },
];

export const TYPING_TEXTS: TypingText[] = [...PT, ...EN.map((t) => ({ ...t, lang: "en" as const }))];

export function typingText(id: string | null | undefined) {
  return TYPING_TEXTS.find((t) => t.id === id) ?? null;
}

export function textWords(t: TypingText) {
  return t.text.split(/\s+/).filter(Boolean);
}

/**
 * The words of a test that starts `start` words into the text. Past the end it starts over (the
 * person then returns to the beginning: `wraps` marks where).
 */
export function wordsFrom(t: TypingText, start: number, n = 160) {
  const all = textWords(t);
  const from = start % all.length;
  const out: string[] = [];
  for (let i = 0; out.length < n; i++) out.push(all[(from + i) % all.length]);
  return { words: out, wrapsAt: all.length - from };
}

/** Where the person stands in a text after typing `typed` words from `start`. */
export function progressAfter(t: TypingText, start: number, typed: number) {
  const total = textWords(t).length;
  const at = (start % total) + typed;
  return at >= total ? { restart: true, words: 0 } : { restart: false, words: at };
}
