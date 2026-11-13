import type { TypingText } from "./typing-texts";

/** Long, original lessons written for deliberate reading and typing practice in the local lab. */
const LESSON_NEXT_STEPS_PT: Record<string, string> = {
  "aula-fundamentos-professor": "Na próxima leitura, vamos transformar esse raciocínio em um algoritmo: uma sequência precisa de passos que termina e resolve o problema.",
  "aula-sql-professor": "Na próxima leitura, vamos escrever consultas SQL e observar como filtros, ordenações e junções mudam o resultado.",
  "aula-python-professor": "Na próxima leitura, conheça a filosofia de Python; em seguida, vamos organizar dados com listas e dicionários.",
  "aula-javascript-professor": "Na próxima leitura, conheça a história do JavaScript; depois, vamos acompanhar tarefas assíncronas no navegador.",
  "aula-typescript-professor": "Na próxima leitura, conheça o TypeScript e comece pelos tipos básicos que descrevem textos, números e objetos.",
  "aula-java-professor": "Na próxima leitura, vamos conhecer a máquina virtual Java e entender como ela executa programas em diferentes sistemas.",
  "aula-web-professor": "Na próxima leitura, vamos separar estrutura e aparência usando HTML e CSS, e acompanhar o que acontece quando um site abre.",
  "aula-bash-professor": "Na próxima leitura, vamos praticar comandos de terminal e aplicar o mesmo cuidado a caminhos, aspas e arquivos.",
};

export const TEACHER_TEXTS_PT: TypingText[] = [
  {
    lang: "pt",
    id: "aula-fundamentos-professor",
    category: "Fundamentos",
    title: "Aula guiada: pensar como quem programa",
    text: [
      "Vamos começar pelo princípio mais importante: programar não é decorar comandos, é aprender a transformar uma necessidade em passos que outra pessoa, ou uma máquina, consiga seguir. Imagine que uma biblioteca quer descobrir quais livros precisam voltar para a estante. Antes de escrever qualquer instrução, pergunte o que sabemos, o que precisamos descobrir e quais regras não podem ser esquecidas. Sabemos a lista de empréstimos, as datas e os leitores; queremos encontrar os atrasos; precisamos ignorar empréstimos ainda dentro do prazo. Essa conversa é parte do trabalho técnico, não uma etapa dispensável.",
      "Depois, descreva a solução sem se preocupar com uma linguagem específica. Primeiro percorremos cada empréstimo. Em seguida comparamos a data de devolução com a data de hoje. Se o prazo terminou e o livro ainda não voltou, registramos aquele empréstimo como atrasado. Ao final, apresentamos a lista. Repare que cada frase tem uma responsabilidade clara. A repetição sobre todos os empréstimos é um laço; a decisão sobre o prazo é uma condição; a lista resultante é uma saída. Quando os passos estão claros, escolher comandos fica muito mais simples.",
      "Agora dê nome aos dados. Uma variável é uma referência útil para um valor, não uma caixa mágica que entende a intenção de quem escreveu o programa. Um nome como dataDevolucao explica melhor que valorDois. Um tipo informa quais operações fazem sentido: somar quantidades é razoável, somar um endereço a uma data talvez não seja. Tipos bem escolhidos funcionam como placas numa estrada: avisam o que cada dado representa e ajudam a encontrar enganos cedo. A máquina executa regras; ela não adivinha que um número deveria ser uma data.",
      "Quando a solução crescer, divida o trabalho em funções pequenas. Uma função pode verificar um empréstimo, outra pode reunir atrasos, e uma terceira pode apresentar o resultado. Isso não é apenas organização estética. Se a regra de atraso mudar, você sabe onde procurar. Se algo falhar, pode testar cada parte separadamente. Procure nomes que descrevam o resultado e evite uma função que tenta ler arquivos, calcular regras e desenhar uma tela ao mesmo tempo.",
      "Por fim, pratique a depuração como uma investigação. Escolha uma entrada pequena e escreva no papel qual resultado espera. Execute mentalmente cada passo e compare com o resultado do programa. Teste também uma lista vazia, um item no limite do prazo e um empréstimo devolvido cedo. Um programa que funciona só no exemplo mais confortável ainda não está pronto. Pergunte: qual hipótese estou fazendo, qual caso pode quebrá-la e como vou perceber o erro? Esse hábito vale mais que digitar depressa. Ao treinar, leia a frase, compreenda a ideia e digite com atenção; precisão também é parte de pensar como programador.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-sql-professor",
    category: "SQL e dados",
    title: "Aula guiada: organizar e consultar dados",
    text: [
      "Pense em um banco de dados como um arquivo cuidadosamente organizado, não como uma gaveta onde qualquer informação pode ser jogada. Uma tabela representa um tipo de coisa, como leitor, livro ou empréstimo. Cada linha descreve uma ocorrência; cada coluna descreve uma característica. Se uma coluna chamada data guarda ora datas, ora observações, a tabela deixa de explicar o que contém. Bons nomes, tipos coerentes e regras explícitas ajudam pessoas e programas a interpretar os mesmos dados da mesma maneira.",
      "As relações entre tabelas são tão importantes quanto as próprias tabelas. Um empréstimo pertence a um leitor e a um livro. Em vez de copiar o nome inteiro do leitor em cada empréstimo, guardamos uma chave que identifica aquela pessoa. A chave primária identifica uma linha de forma única. A chave estrangeira aponta para uma linha relacionada e permite ao banco impedir referências quebradas. Se alguém tentar registrar um empréstimo para um leitor inexistente, a regra pode recusar a operação antes que o erro se espalhe.",
      "Uma consulta SQL descreve o resultado que você deseja. Você pode pedir os empréstimos ainda abertos, ordenar pela data mais antiga e mostrar apenas alguns campos. O banco decide como localizar as linhas, mas a consulta ainda precisa expressar a regra correta. Um filtro aplicado cedo demais pode excluir informações necessárias; uma junção feita com a coluna errada pode multiplicar resultados. Por isso, confira primeiro uma tabela, depois acrescente uma relação por vez e observe como a quantidade de linhas muda.",
      "Também precisamos pensar em mudanças, não apenas em consultas. Uma transação agrupa operações que precisam acontecer juntas. Imagine registrar o empréstimo e diminuir a quantidade disponível de um livro. Se uma ação funcionar e a outra falhar, os dados deixam de concordar. A transação permite confirmar todas as mudanças ou desfazê-las como um conjunto. Essa propriedade protege a consistência em momentos de erro, interrupção ou acessos simultâneos. Dados corretos dependem de regras que continuam válidas mesmo quando a aplicação tem um defeito.",
      "Índices podem acelerar buscas frequentes, como localizar empréstimos por leitor, mas ocupam espaço e tornam gravações um pouco mais custosas porque também precisam ser atualizados. Não crie índices por reflexo; descubra primeiro quais consultas são lentas. Aprenda a ler o plano de execução e compare a busca antes e depois. Para praticar, desenhe as tabelas de uma biblioteca, escolha as chaves, descreva as regras de integridade e escreva consultas em linguagem comum antes de traduzi-las para SQL. Se outra pessoa consegue explicar por que cada relação existe, o modelo está mais claro.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-python-professor",
    category: "Python",
    title: "Aula guiada: construir soluções com Python",
    text: [
      "Em Python, comece observando os valores que o programa recebe e o resultado que deve produzir. O nome de uma variável aponta para um valor; ele não transforma esse valor. Se uma idade chega como texto, a comparação com um número pode falhar ou produzir uma regra diferente da esperada. Antes de calcular, confirme o formato dos dados e decida o que fazer quando estiverem ausentes ou fora do intervalo permitido. Essa disciplina evita que um caso inesperado se transforme em um erro distante da origem.",
      "Listas são úteis quando precisamos manter uma sequência de itens, como títulos de livros. Um laço permite examinar cada título sem repetir a mesma instrução manualmente. Uma condição escolhe o caminho apropriado para cada item. Ensine a si mesmo a acompanhar uma única passagem do laço: qual item está sendo analisado, qual é o estado acumulado e o que muda nesta volta? Uma variável acumuladora pode guardar uma contagem ou uma soma. Se você não consegue explicar como ela muda, o laço provavelmente precisa ficar mais simples.",
      "Funções dão nomes a etapas de raciocínio. Em vez de copiar a regra que calcula uma média em vários lugares, escreva uma função que recebe os valores e devolve o resultado. Mantenha clara a diferença entre devolver um valor e apenas exibi-lo na tela. Uma função pequena deve ter uma responsabilidade que possa ser descrita em uma frase. Parâmetros mostram quais informações são necessárias; o valor retornado mostra o que a função promete entregar. Isso facilita reaproveitar e testar a regra.",
      "Erros fazem parte do aprendizado. Uma mensagem de exceção costuma indicar o tipo do problema e a linha onde ele apareceu, mas a causa pode estar alguns passos antes. Leia a mensagem de cima para baixo, reproduza o caso com a menor entrada possível e confira os valores naquele ponto. Evite esconder qualquer exceção sem decidir como recuperar. Às vezes a resposta correta é pedir outra entrada; em outras situações é melhor interromper e explicar claramente o que faltou.",
      "Separe o código em módulos quando o projeto ganhar responsabilidades diferentes. Um módulo pode cuidar de leitura de arquivos, outro das regras e outro da apresentação. Testes pequenos verificam exemplos e casos limite sem exigir que uma pessoa repita manualmente cada etapa. Para estudar, escreva uma solução simples, explique em voz alta cada variável e depois altere a entrada: lista vazia, um único item, valor repetido e dado inválido. O objetivo não é produzir mais linhas. É construir uma solução cujo comportamento você consegue prever e justificar.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-javascript-professor",
    category: "JavaScript",
    title: "Aula guiada: JavaScript e comportamento da página",
    text: [
      "JavaScript dá comportamento às páginas, mas o navegador não é apenas uma tela que recebe comandos. Ele mantém documentos, eventos, tarefas e comunicação com servidores. Um botão pode receber um clique, validar os campos e pedir ao servidor para salvar uma alteração. Para entender esse fluxo, siga cada dado desde a entrada até a resposta. Pergunte quem criou o valor, quem pode modificá-lo e em que momento a interface deve mostrá-lo.",
      "Os valores têm tipos e regras. Texto, número, valor lógico, lista e objeto ajudam a representar ideias distintas. Uma conversão implícita pode esconder uma diferença: o texto que parece um número não é automaticamente o mesmo que um número. Use comparações e conversões de forma consciente. Quando um dado ainda não existe, represente essa ausência explicitamente e decida o que a página deve mostrar enquanto espera. Uma tela previsível explica o estado vazio, o carregamento e o erro, não apenas o caso de sucesso.",
      "A programação orientada a eventos significa que uma função pode esperar até algo acontecer. O navegador chama um manipulador quando o usuário clica, digita ou muda de página. A função deve responder rapidamente para que a interface continue fluida. Operações de rede podem levar tempo, então JavaScript oferece promessas e sintaxe assíncrona para aguardar resultados sem congelar a página. Durante a espera, mantenha um estado de carregamento; quando a resposta chegar, confira se deu certo antes de anunciar conclusão.",
      "Uma armadilha comum é imaginar que as tarefas assíncronas terminam na mesma ordem em que começaram. Duas solicitações podem voltar em ordens diferentes. Se o usuário pesquisa uma palavra e logo depois outra, a primeira resposta pode chegar por último e substituir a mais recente. A interface deve reconhecer qual pedido ainda é válido ou cancelar trabalho antigo quando possível. Esse exemplo mostra por que entender o tempo é parte do raciocínio, não um detalhe de sintaxe.",
      "Organize o código separando apresentação, estado e regras sempre que isso melhorar a leitura. Valide dados novamente no servidor, pois o navegador não é uma fronteira de segurança. Trate erros de rede com uma mensagem útil e preserve o que a pessoa já escreveu. Ao estudar, construa uma pequena lista de tarefas: desenhe primeiro o estado vazio, depois a criação, a edição e a falha ao salvar. Teste cliques repetidos, entrada em branco e resposta atrasada. Uma boa página guia a pessoa em cada etapa e não finge que uma ação foi concluída antes da confirmação real.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-typescript-professor",
    category: "TypeScript",
    title: "Aula guiada: usar tipos para explicar o programa",
    text: [
      "TypeScript acrescenta uma linguagem de descrição ao JavaScript. Os tipos ajudam a registrar quais valores uma parte do programa aceita e quais resultados promete produzir. Imagine uma função que recebe uma data de entrega: se ela aceitar qualquer texto, um nome de pessoa ou uma lista, quem a chama pode cometer enganos difíceis de perceber. Um tipo mais preciso torna o contrato visível enquanto escrevemos e permite que o editor aponte algumas inconsistências antes de executar o programa.",
      "O compilador consegue inferir muitos tipos a partir dos valores e do contexto. Isso evita anotações repetidas, mas não elimina a necessidade de pensar. Quando uma variável pode ter mais de uma forma válida, uma união descreve essas possibilidades. Antes de usar uma propriedade específica, o programa precisa descobrir qual forma recebeu. Esse processo de estreitamento é como conferir o bilhete antes de entrar em uma sala: primeiro confirmamos a condição, depois usamos as garantias que ela oferece.",
      "Uma interface ou um tipo de objeto pode documentar a estrutura de uma resposta, como o perfil de uma pessoa. O nome da propriedade e a sua obrigatoriedade são decisões importantes. Se um campo pode estar ausente, diga isso no tipo e trate a ausência no código. Não use um tipo amplo só para calar o compilador. Uma anotação que aceita tudo não protege ninguém. Prefira expressar a regra real, mesmo que isso exija representar estados diferentes com mais cuidado.",
      "Há uma diferença essencial entre checagem estática e validação em execução. Os tipos de TypeScript são removidos quando o código é compilado; eles não examinam por conta própria um dado recebido pela internet. Uma resposta externa continua sendo desconhecida até que o programa confira seu formato. Use validação na fronteira, converta o dado desconhecido em uma forma segura e só depois aplique as regras internas. Essa separação evita confiar em uma declaração que o dado recebido nunca precisou obedecer.",
      "Tipos genéricos permitem criar funções e estruturas que funcionam com mais de um tipo sem perder informação. Use-os quando a relação entre entrada e saída for realmente reutilizável, e não para tornar cada assinatura mais complicada. No final, pergunte se o tipo ajuda outra pessoa a entender o domínio. Se uma mudança de requisito quebra em pontos claros e o editor explica por quê, o sistema de tipos está sendo útil. O objetivo é comunicar melhor as regras e diminuir enganos, não vencer uma disputa com o compilador.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-java-professor",
    category: "Java",
    title: "Aula guiada: modelar um programa em Java",
    text: [
      "Java é uma linguagem tipada que roda sobre uma máquina virtual. Essa camada permite que o mesmo programa seja executado em sistemas diferentes quando o ambiente necessário está disponível. Ao escrever Java, você descreve classes, métodos e valores de modo explícito. A declaração de tipos pode parecer trabalhosa no começo, mas também torna visíveis muitas decisões do projeto: que informação existe, quais operações são permitidas e qual resultado cada método deve entregar.",
      "Uma classe deve representar uma ideia do domínio ou uma responsabilidade bem definida. Um objeto reúne estado e comportamento; não é simplesmente um lugar para colocar variáveis. Considere um empréstimo de livro. Ele pode conhecer o prazo e a situação, e oferecer uma operação que diga se está atrasado. A regra fica perto dos dados que a explicam. Ao mesmo tempo, não transforme tudo em uma classe: um método pequeno que calcula um valor pode ser mais claro como função auxiliar do que como uma hierarquia inteira.",
      "Encapsulamento significa proteger as regras internas e oferecer operações claras. Se qualquer parte do programa puder alterar diretamente o estado de um objeto, fica difícil garantir que ele continue válido. Construtores e métodos podem exigir informações necessárias e recusar combinações impossíveis. Interfaces descrevem comportamentos que diferentes classes podem oferecer. Isso permite depender de uma capacidade, como salvar um registro, sem amarrar toda a aplicação a uma implementação específica.",
      "Coleções ajudam a trabalhar com muitos valores, e cada coleção tem propriedades diferentes. Uma lista preserva uma sequência; um conjunto evita repetições; um mapa localiza um valor por uma chave. Escolher a estrutura adequada simplifica o raciocínio e o custo da operação. Exceções devem representar situações que impedem o fluxo normal. Capture somente quando souber como tratar o problema; esconder um erro e continuar pode produzir dados incorretos mais tarde.",
      "Organize pacotes por responsabilidades compreensíveis e escreva testes para regras que tenham consequências importantes. Um teste pode verificar um empréstimo no prazo, um atrasado e uma data exatamente no limite. Esses exemplos ensinam tanto quanto a implementação. Durante a leitura do código, siga a chamada de método como uma conversa: quem pede o trabalho, quais dados envia, quais garantias recebe e onde uma falha pode aparecer? Um projeto Java fica mais fácil de manter quando seus contratos são explícitos e as classes têm motivos claros para existir.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-web-professor",
    category: "Web",
    title: "Aula guiada: como uma aplicação web funciona",
    text: [
      "Uma aplicação web é uma conversa entre um navegador e um servidor. O navegador apresenta conteúdo e recebe ações; o servidor aplica regras, consulta dados e envia respostas. O protocolo dessa conversa define pedidos, métodos, cabeçalhos e códigos de estado. Quando uma página parece parada, pergunte em que parte a espera está acontecendo: a interface ainda não enviou o pedido, a rede está lenta, o servidor está processando ou a resposta não foi interpretada corretamente? Essa investigação separa sintomas que parecem iguais.",
      "HTML descreve a estrutura e o significado do conteúdo. Um título deve ser um título, uma lista deve indicar itens relacionados e um botão deve representar uma ação. Essa semântica ajuda leitores de tela, navegação por teclado e ferramentas de busca. CSS cuida da apresentação: espaçamento, cores, alinhamento e adaptação a telas diferentes. JavaScript responde a interações e atualiza a página. Separar essas responsabilidades torna mais fácil descobrir se um problema está no conteúdo, no visual ou no comportamento.",
      "Uma página responsiva não é simplesmente uma tela de computador encolhida. Pessoas podem usar celulares estreitos, zoom, teclados externos ou preferências de movimento reduzido. Planeje o conteúdo para que continue legível, deixe os botões fáceis de alcançar e evite depender apenas da cor para comunicar um estado. Teste a navegação sem mouse e confirme se cada campo tem um rótulo compreensível. Acessibilidade melhora a experiência para pessoas com diferentes necessidades e também costuma revelar uma estrutura mais clara.",
      "Dados enviados pelo navegador não são confiáveis, mesmo quando a tela parece impedir valores incorretos. Alguém pode construir outro pedido sem usar a interface. O servidor precisa autenticar a pessoa, verificar se ela tem autorização e validar cada campo antes de alterar dados. Uma conexão criptografada protege a viagem, mas não substitui permissões corretas. Também é importante evitar mostrar mensagens internas, chaves ou informações privadas nos registros e nas respostas públicas.",
      "Ao depurar, use as ferramentas do navegador para observar o pedido, a resposta, os erros do console e o tamanho dos recursos. Comece com uma ação pequena e reproduzível. Depois altere uma variável por vez. Para aprender, desenhe o caminho de um clique até o banco de dados e de volta à tela. Marque onde o estado muda e o que a pessoa vê durante cada etapa. Essa visão completa ajuda a construir experiências que continuam claras quando a rede demora, uma validação falha ou o usuário volta atrás.",
    ].join("\n\n"),
  },
  {
    lang: "pt",
    id: "aula-bash-professor",
    category: "Bash",
    title: "Aula guiada: escrever scripts Bash com cuidado",
    text: [
      "Bash é um interpretador de comandos e uma linguagem de automação. Ele recebe texto, aplica regras de expansão e encaminha os argumentos para programas. Uma linha que parece simples pode envolver variáveis, aspas, caminhos, redirecionamentos e vários processos. Ao ensinar a si mesmo um script, leia cada etapa em voz alta: que valor existe aqui, como ele é interpretado e qual programa vai recebê-lo? Entender essas fronteiras evita surpresas, especialmente quando uma entrada contém espaços ou caracteres especiais.",
      "Aspas duplas costumam preservar espaços dentro de uma variável, enquanto aspas simples mantêm o conteúdo literal. Sem aspas, o shell pode dividir o valor em palavras e expandir padrões de arquivos. Isso importa quando um nome válido contém espaços, colchetes ou asteriscos. Arrays guardam elementos separadamente e são mais seguros do que construir uma lista juntando nomes com espaços. Se um caminho vier de outra pessoa ou de um arquivo, valide-o e confirme o diretório antes de fazer alterações.",
      "Um script confiável verifica operações importantes. O código de saída zero costuma indicar sucesso; outros valores sinalizam falha, mas não contam toda a história. Uma mensagem clara deve explicar o que falhou e qual ação foi interrompida sem revelar senhas ou tokens. Opções que tentam encerrar o script automaticamente diante de erros ajudam em alguns casos, mas não substituem decisões explícitas. Em pipelines, uma falha anterior pode ficar escondida se apenas o resultado final for observado. Conheça o comportamento antes de confiar na automação.",
      "Antes de apagar, substituir ou mover muitos arquivos, mostre quais caminhos serão afetados e peça confirmação quando apropriado. Use uma pasta temporária criada pelo próprio processo e limpe somente essa pasta. Se o script precisa de privilégios administrativos, explique por quê e limite a operação ao necessário. Uma cópia recuperável e uma execução de prévia reduzem o custo de um engano. Em automações agendadas, registre o resultado, estabeleça limites de tempo e cuide de tarefas que possam ficar presas.",
      "A manutenção também faz parte da segurança. Declare o interpretador esperado, documente programas externos necessários e teste em um ambiente parecido com aquele onde o script será usado. Ferramentas de análise estática encontram padrões suspeitos, mas testes com diretórios vazios, nomes com espaços, permissões negadas e arquivos ausentes revelam o que acontece de verdade. Scripts pequenos, divididos em funções de responsabilidade única, são mais fáceis de revisar e explicar. O objetivo não é automatizar tudo a qualquer custo; é tornar uma tarefa repetida previsível, verificável e segura para quem vai executá-la.",
    ].join("\n\n"),
  },
].map((lesson) => {
  return {
    ...lesson,
    lang: "pt" as const,
    text: `${lesson.text}\n\n${LESSON_NEXT_STEPS_PT[lesson.id]}`,
  };
});
