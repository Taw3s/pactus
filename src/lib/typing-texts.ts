// Texts for the typing test's "Texto" mode: short explanations about programming, in prose (no
// code symbols), so the test is also a reading. Each person keeps their place in every text
// (typing_progress); a text's id is stored, so never rename one.

export interface TypingText {
  id: string;
  category: string;
  title: string;
  text: string;
}

export const TYPING_CATEGORIES = ["Fundamentos", "SQL e dados", "Python", "JavaScript", "Web"] as const;

export const TYPING_TEXTS: TypingText[] = [
  {
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
