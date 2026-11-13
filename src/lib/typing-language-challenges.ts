import type { BashDifficulty } from "./typing-code";
import type { LanguageCodeChallenge, LanguageExampleId } from "./typing-language-examples";

type ChallengeCopy = {
  title: string;
  prompt: string;
  solution: string;
  hints: [string, string, string];
  output: string;
};

function makeChallenge(pt: ChallengeCopy, en: ChallengeCopy): LanguageCodeChallenge {
  return {
    title: { pt: pt.title, en: en.title },
    prompt: { pt: pt.prompt, en: en.prompt },
    solution: { pt: pt.solution, en: en.solution },
    hints: { pt: pt.hints, en: en.hints },
    output: { pt: pt.output, en: en.output },
  };
}

type ExtraDifficulty = Exclude<BashDifficulty, "beginner">;

/** One original exercise per non-Bash language and difficulty. Bash reuses its existing tiered exercises. */
export const LANGUAGE_CODE_LEVEL_CHALLENGES: Partial<Record<LanguageExampleId, Record<ExtraDifficulty, LanguageCodeChallenge>>> = {
  fundamentals: {
    easy: makeChallenge(
      {
        title: "Contar valores acima do limite",
        prompt: "Percorra [2, 7, 5, 9] e conte quantos valores são maiores que 5. Mostre a contagem.",
        solution: "numeros = [2, 7, 5, 9]\nquantidade = 0\n\npara cada numero em numeros:\n    se numero > 5:\n        quantidade = quantidade + 1\n\nmostrar quantidade",
        hints: ["Crie uma variável contadora que começa em zero.", "Percorra a lista e aumente o contador só quando o valor ultrapassar 5.", "Use quantidade = 0, teste numero > 5 no laço e mostre quantidade ao final."],
        output: "3",
      },
      {
        title: "Count values above a limit",
        prompt: "Walk through [2, 7, 5, 9], count values greater than 5, and display the count.",
        solution: "numbers = [2, 7, 5, 9]\ncount = 0\n\nfor each number in numbers:\n    if number > 5:\n        count = count + 1\n\nshow count",
        hints: ["Create a counter that starts at zero.", "Walk through the list and increase the counter only when a value is above 5.", "Set count = 0, test number > 5 in the loop, then display count."],
        output: "3",
      },
    ),
    medium: makeChallenge(
      {
        title: "Encontrar mínimo e máximo",
        prompt: "Percorra [7, 3, 9, 4] uma vez, encontre o menor e o maior valor e mostre os dois.",
        solution: "numeros = [7, 3, 9, 4]\nmenor = numeros[0]\nmaior = numeros[0]\n\npara cada numero em numeros:\n    se numero < menor:\n        menor = numero\n    se numero > maior:\n        maior = numero\n\nmostrar menor, maior",
        hints: ["Inicialize as duas respostas com o primeiro item da lista.", "Em cada volta, compare o valor atual com menor e com maior.", "Atualize cada variável quando a comparação correspondente for verdadeira e mostre ambas no fim."],
        output: "Menor: 3\nMaior: 9",
      },
      {
        title: "Find the minimum and maximum",
        prompt: "Walk through [7, 3, 9, 4] once, find the smallest and largest values, and display both.",
        solution: "numbers = [7, 3, 9, 4]\nsmallest = numbers[0]\nlargest = numbers[0]\n\nfor each number in numbers:\n    if number < smallest:\n        smallest = number\n    if number > largest:\n        largest = number\n\nshow smallest, largest",
        hints: ["Initialize both answers with the first list item.", "On each pass, compare the current value with smallest and largest.", "Update each variable when its comparison is true, then display both at the end."],
        output: "Smallest: 3\nLargest: 9",
      },
    ),
    hard: makeChallenge(
      {
        title: "Remover repetições sem reordenar",
        prompt: "Crie uma nova lista sem valores repetidos, preservando a primeira ordem de [3, 1, 3, 2, 1].",
        solution: "numeros = [3, 1, 3, 2, 1]\nunicos = []\n\npara cada numero em numeros:\n    se numero nao esta em unicos:\n        adicionar numero em unicos\n\nmostrar unicos",
        hints: ["A resposta deve ser construída em uma lista nova.", "Antes de adicionar um item, verifique se ele já aparece na lista de resposta.", "Percorra numeros, adicione somente quando numero nao esta em unicos e mostre unicos."],
        output: "[3, 1, 2]",
      },
      {
        title: "Remove duplicates without reordering",
        prompt: "Build a new list without repeated values while preserving the first order in [3, 1, 3, 2, 1].",
        solution: "numbers = [3, 1, 3, 2, 1]\nunique = []\n\nfor each number in numbers:\n    if number is not in unique:\n        add number to unique\n\nshow unique",
        hints: ["Build the answer in a new list.", "Before adding an item, check whether it is already in the answer list.", "Walk through numbers, add only when number is not in unique, then display unique."],
        output: "[3, 1, 2]",
      },
    ),
    expert: makeChallenge(
      {
        title: "Encontrar o valor mais frequente",
        prompt: "Conte as ocorrências em [4, 2, 4, 3, 2, 4] e mostre o valor com maior frequência e sua quantidade.",
        solution: "numeros = [4, 2, 4, 3, 2, 4]\nfrequencias = mapa vazio\n\npara cada numero em numeros:\n    frequencias[numero] = (frequencias[numero] ou 0) + 1\n\nmais_frequente = numeros[0]\npara cada numero em numeros:\n    se frequencias[numero] > frequencias[mais_frequente]:\n        mais_frequente = numero\n\nmostrar mais_frequente, frequencias[mais_frequente]",
        hints: ["Use um mapa cuja chave seja o valor e cujo conteúdo seja a quantidade vista.", "Faça uma primeira passagem para contar e uma segunda para achar a maior contagem.", "Inicialize frequencias, some um a cada ocorrência e acompanhe mais_frequente quando a contagem aumentar."],
        output: "Valor: 4\nOcorrências: 3",
      },
      {
        title: "Find the most frequent value",
        prompt: "Count occurrences in [4, 2, 4, 3, 2, 4] and display the value with the highest frequency and its count.",
        solution: "numbers = [4, 2, 4, 3, 2, 4]\nfrequencies = empty map\n\nfor each number in numbers:\n    frequencies[number] = (frequencies[number] or 0) + 1\n\nmost_frequent = numbers[0]\nfor each number in numbers:\n    if frequencies[number] > frequencies[most_frequent]:\n        most_frequent = number\n\nshow most_frequent, frequencies[most_frequent]",
        hints: ["Use a map whose key is a value and whose content is the number of times it appeared.", "Make one pass to count and a second pass to find the highest count.", "Initialize frequencies, add one for each occurrence, and update most_frequent when its count grows."],
        output: "Value: 4\nOccurrences: 3",
      },
    ),
  },
  sql: {
    easy: makeChallenge(
      {
        title: "Ordenar tarefas pendentes",
        prompt: "A tabela tarefas(nome, prioridade, concluida) já existe; concluida vale TRUE ou FALSE. Mostre nome e prioridade apenas das tarefas pendentes, da prioridade mais alta para a mais baixa.",
        solution: "SELECT nome, prioridade\nFROM tarefas\nWHERE concluida = FALSE\nORDER BY prioridade DESC;",
        hints: ["A tabela já fornece nome, prioridade e estado: leia dela com FROM tarefas.", "Use WHERE para deixar passar somente linhas não concluídas.", "Ordene por prioridade em ordem decrescente depois do filtro."],
        output: "Praticar | 3\nRevisar | 1",
      },
      {
        title: "Sort pending tasks",
        prompt: "The table tasks(name, priority, completed) already exists; completed is TRUE or FALSE. Show the name and priority of pending tasks only, from highest priority to lowest.",
        solution: "SELECT name, priority\nFROM tasks\nWHERE completed = FALSE\nORDER BY priority DESC;",
        hints: ["The table already provides a name, priority, and status: read from it with FROM tasks.", "Use WHERE to keep only rows that are not completed.", "Sort by priority in descending order after filtering."],
        output: "Practice | 3\nReview | 1",
      },
    ),
    medium: makeChallenge(
      {
        title: "Contar pendências por categoria",
        prompt: "Na tabela tarefas(nome, categoria, concluida), conte as tarefas pendentes em cada categoria. Mostre a categoria e a contagem, e inclua apenas categorias que tenham pelo menos uma pendência.",
        solution: "SELECT categoria, COUNT(*) AS pendentes\nFROM tarefas\nWHERE concluida = FALSE\nGROUP BY categoria\nHAVING COUNT(*) > 0\nORDER BY categoria;",
        hints: ["Primeiro filtre para manter somente tarefas não concluídas.", "Agrupe as linhas pela categoria e conte cada grupo.", "Combine WHERE, GROUP BY categoria e HAVING COUNT(*) > 0."],
        output: "Estudo | 1\nProjeto | 2",
      },
      {
        title: "Count pending tasks by category",
        prompt: "In the table tasks(name, category, completed), count pending tasks in each category. Show the category and the count, and include only categories that have at least one pending task.",
        solution: "SELECT category, COUNT(*) AS pending\nFROM tasks\nWHERE completed = FALSE\nGROUP BY category\nHAVING COUNT(*) > 0\nORDER BY category;",
        hints: ["Filter first so only incomplete tasks remain.", "Group the rows by category and count each group.", "Combine WHERE, GROUP BY category, and HAVING COUNT(*) > 0."],
        output: "Project | 2\nStudy | 1",
      },
    ),
    hard: makeChallenge(
      {
        title: "Achar categorias sem tarefas",
        prompt: "As tabelas categorias(nome) e tarefas(nome, categoria) já existem. Use LEFT JOIN para listar o nome das categorias que ainda não possuem nenhuma tarefa cadastrada.",
        solution: "SELECT categorias.nome\nFROM categorias\nLEFT JOIN tarefas ON tarefas.categoria = categorias.nome\nWHERE tarefas.nome IS NULL\nORDER BY categorias.nome;",
        hints: ["A consulta precisa manter todas as categorias, inclusive sem correspondência.", "LEFT JOIN preserva a tabela da esquerda; colunas ausentes do lado direito ficam NULL.", "Junte por categoria e filtre WHERE tarefas.nome IS NULL."],
        output: "Leitura",
      },
      {
        title: "Find categories without tasks",
        prompt: "The tables categories(name) and tasks(name, category) already exist. Use LEFT JOIN to list the name of the categories that do not have any task registered yet.",
        solution: "SELECT categories.name\nFROM categories\nLEFT JOIN tasks ON tasks.category = categories.name\nWHERE tasks.name IS NULL\nORDER BY categories.name;",
        hints: ["The query must keep every category, including those without a match.", "LEFT JOIN preserves the left table; missing right-side columns become NULL.", "Join by category and filter with WHERE tasks.name IS NULL."],
        output: "Reading",
      },
    ),
    expert: makeChallenge(
      {
        title: "Classificar tarefas por categoria",
        prompt: "Na tabela tarefas(nome, categoria, prazo, concluida), numere as tarefas pendentes dentro de cada categoria por prazo crescente e mostre categoria, nome e prazo das duas primeiras de cada uma.",
        solution: "WITH classificadas AS (\n  SELECT nome, categoria, prazo,\n         ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY prazo) AS posicao\n  FROM tarefas\n  WHERE concluida = FALSE\n)\nSELECT categoria, nome, prazo\nFROM classificadas\nWHERE posicao <= 2\nORDER BY categoria, posicao;",
        hints: ["Filtre tarefas concluídas antes de classificar.", "ROW_NUMBER pode reiniciar a contagem para cada categoria com PARTITION BY.", "Crie uma CTE com ROW_NUMBER() OVER (PARTITION BY categoria ORDER BY prazo) e filtre posicao <= 2."],
        output: "Estudo | Praticar | 1\nEstudo | Revisar | 2\nProjeto | Enviar | 2",
      },
      {
        title: "Rank tasks within each category",
        prompt: "In the table tasks(name, category, due_day, completed), rank pending tasks in each category by earliest deadline and show the category, name, and due_day of the first two in every category.",
        solution: "WITH ranked AS (\n  SELECT name, category, due_day,\n         ROW_NUMBER() OVER (PARTITION BY category ORDER BY due_day) AS position\n  FROM tasks\n  WHERE completed = FALSE\n)\nSELECT category, name, due_day\nFROM ranked\nWHERE position <= 2\nORDER BY category, position;",
        hints: ["Filter out completed tasks before ranking them.", "ROW_NUMBER can restart for each category by using PARTITION BY.", "Create a CTE with ROW_NUMBER() OVER (PARTITION BY category ORDER BY due_day), then filter position <= 2."],
        output: "Project | Send | 2\nStudy | Practice | 1\nStudy | Review | 2",
      },
    ),
  },
  python: {
    easy: makeChallenge(
      {
        title: "Converter nomes em maiúsculas",
        prompt: "Leia uma linha com nomes separados por espaço (por exemplo: ana bia caio) e mostre uma lista com os nomes em maiúsculas.",
        solution: "nomes = input().split()\nmaiusculos = [nome.upper() for nome in nomes]\nprint(maiusculos)",
        hints: ["input() lê a linha e split() a separa em nomes; cada item da nova lista vem de transformar um deles.", "Strings têm o método upper() para converter letras em maiúsculas.", "Use uma compreensão de lista que aplique nome.upper() em cada nome."],
        output: "['ANA', 'BIA', 'CAIO']",
      },
      {
        title: "Convert names to uppercase",
        prompt: "Read a line of names separated by spaces (for example: ana bia caio) and print a list with every name in uppercase.",
        solution: "names = input().split()\nuppercase = [name.upper() for name in names]\nprint(uppercase)",
        hints: ["input() reads the line and split() separates it into names; each item in the new list comes from transforming one of them.", "Strings have an upper() method to convert letters to uppercase.", "Use a list comprehension that applies name.upper() to each name."],
        output: "['ANA', 'BIA', 'CAIO']",
      },
    ),
    medium: makeChallenge(
      {
        title: "Contar palavras",
        prompt: "Leia uma linha de palavras separadas por espaço (por exemplo: sol lua sol mar lua sol), conte quantas vezes cada uma aparece e mostre o dicionário, com as palavras na ordem em que surgem.",
        solution: "texto = input()\nfrequencias = {}\nfor palavra in texto.split():\n    frequencias[palavra] = frequencias.get(palavra, 0) + 1\nprint(frequencias)",
        hints: ["input() lê a linha; split() a transforma em uma lista de palavras.", "Um dicionário pode guardar a palavra como chave e a quantidade como valor.", "Use get(palavra, 0) + 1 para criar ou incrementar cada contagem."],
        output: "{'sol': 3, 'lua': 2, 'mar': 1}",
      },
      {
        title: "Count words",
        prompt: "Read a line of words separated by spaces (for example: sun moon sun sea moon sun), count how often each one appears, and print the dictionary, with the words in the order they first show up.",
        solution: "text = input()\nfrequencies = {}\nfor word in text.split():\n    frequencies[word] = frequencies.get(word, 0) + 1\nprint(frequencies)",
        hints: ["input() reads the line; split() turns it into a list of words.", "A dictionary can store each word as a key and its count as the value.", "Use get(word, 0) + 1 to create or increment each count."],
        output: "{'sun': 3, 'moon': 2, 'sea': 1}",
      },
    ),
    hard: makeChallenge(
      {
        title: "Agrupar palavras pela inicial",
        prompt: "Leia uma linha de palavras separadas por espaço (por exemplo: uva abacate ameixa banana), agrupe-as em um dicionário pela primeira letra e mostre o resultado.",
        solution: "palavras = input().split()\ngrupos = {}\nfor palavra in palavras:\n    inicial = palavra[0]\n    grupos.setdefault(inicial, []).append(palavra)\nprint(grupos)",
        hints: ["Leia as palavras com input().split(); a chave do grupo é a primeira letra da palavra.", "Cada chave deve guardar uma lista, pois pode haver várias palavras com a mesma inicial.", "Use setdefault(inicial, []) e depois append(palavra)."],
        output: "{'u': ['uva'], 'a': ['abacate', 'ameixa'], 'b': ['banana']}",
      },
      {
        title: "Group words by first letter",
        prompt: "Read a line of words separated by spaces (for example: grape apple apricot banana), group them in a dictionary by first letter, and print the result.",
        solution: "words = input().split()\ngroups = {}\nfor word in words:\n    initial = word[0]\n    groups.setdefault(initial, []).append(word)\nprint(groups)",
        hints: ["Read the words with input().split(); the group key is the first letter of each word.", "Each key should hold a list because several words can share an initial.", "Use setdefault(initial, []) and then append(word)."],
        output: "{'g': ['grape'], 'a': ['apple', 'apricot'], 'b': ['banana']}",
      },
    ),
    expert: makeChallenge(
      {
        title: "Obter as três maiores notas válidas",
        prompt: "As entradas chegam como argumentos do programa (sys.argv[1:]; por exemplo: 8 inválida 10 7 9). Converta-as em números quando possível, ignore as inválidas e mostre a lista com as três maiores em ordem decrescente.",
        solution: "import sys\n\nentradas = sys.argv[1:]\nnotas = []\nfor entrada in entradas:\n    try:\n        notas.append(float(entrada))\n    except ValueError:\n        continue\nprint(sorted(notas, reverse=True)[:3])",
        hints: ["sys.argv[1:] traz os argumentos como texto; a conversão pode falhar, então trate ValueError sem interromper o programa.", "Adicione à lista apenas valores que puder converter.", "Ordene com reverse=True e use o fatiamento [:3] para limitar a saída."],
        output: "[10.0, 9.0, 8.0]",
      },
      {
        title: "Get the three highest valid scores",
        prompt: "The entries arrive as program arguments (sys.argv[1:]; for example: 8 invalid 10 7 9). Convert them to numbers when possible, ignore the invalid ones, and print the list of the top three in descending order.",
        solution: "import sys\n\nentries = sys.argv[1:]\nscores = []\nfor entry in entries:\n    try:\n        scores.append(float(entry))\n    except ValueError:\n        continue\nprint(sorted(scores, reverse=True)[:3])",
        hints: ["sys.argv[1:] holds the arguments as text; conversion can fail, so handle ValueError without stopping the program.", "Append only values that can be converted.", "Sort with reverse=True and use the [:3] slice to limit the output."],
        output: "[10.0, 9.0, 8.0]",
      },
    ),
  },
  javascript: {
    easy: makeChallenge(
      {
        title: "Transformar nomes com map",
        prompt: "Use map para transformar ['ana', 'bia', 'caio'] em nomes em maiúsculas e mostre a nova lista.",
        solution: "const nomes = ['ana', 'bia', 'caio'];\nconst maiusculos = nomes.map((nome) => nome.toUpperCase());\nconsole.log(maiusculos);",
        hints: ["map cria uma nova lista transformando cada item.", "Strings têm o método toUpperCase().", "Chame nomes.map com uma função que retorna nome.toUpperCase()."],
        output: "['ANA', 'BIA', 'CAIO']",
      },
      {
        title: "Transform names with map",
        prompt: "Use map to turn ['ana', 'bia', 'caio'] into uppercase names and print the new array.",
        solution: "const names = ['ana', 'bia', 'caio'];\nconst uppercase = names.map((name) => name.toUpperCase());\nconsole.log(uppercase);",
        hints: ["map creates a new array by transforming each item.", "Strings have a toUpperCase() method.", "Call names.map with a function that returns name.toUpperCase()."],
        output: "['ANA', 'BIA', 'CAIO']",
      },
    ),
    medium: makeChallenge(
      {
        title: "Somar valores com reduce",
        prompt: "Use reduce para somar os valores 12, 8 e 5. Mostre o total.",
        solution: "const valores = [12, 8, 5];\nconst total = valores.reduce((soma, valor) => soma + valor, 0);\nconsole.log(total);",
        hints: ["reduce percorre a lista mantendo um acumulador.", "O acumulador começa em zero nesta soma.", "Some soma + valor e passe 0 como valor inicial do reduce."],
        output: "25",
      },
      {
        title: "Add values with reduce",
        prompt: "Use reduce to add 12, 8, and 5. Print the total.",
        solution: "const values = [12, 8, 5];\nconst total = values.reduce((sum, value) => sum + value, 0);\nconsole.log(total);",
        hints: ["reduce walks through the array while keeping an accumulator.", "The accumulator starts at zero for this sum.", "Return sum + value and pass 0 as the initial reduce value."],
        output: "25",
      },
    ),
    hard: makeChallenge(
      {
        title: "Agrupar tarefas por estado",
        prompt: "Agrupe as tarefas pela propriedade estado usando reduce e mostre o objeto resultante.",
        solution: "const tarefas = [\n  { nome: 'Ler', estado: 'feita' },\n  { nome: 'Praticar', estado: 'pendente' },\n  { nome: 'Revisar', estado: 'feita' },\n];\nconst grupos = tarefas.reduce((resultado, tarefa) => {\n  (resultado[tarefa.estado] ??= []).push(tarefa.nome);\n  return resultado;\n}, {});\nconsole.log(grupos);",
        hints: ["O objeto final terá uma chave para cada estado.", "Cada chave guarda uma lista de nomes; inicialize essa lista na primeira ocorrência.", "No reduce, use resultado[tarefa.estado] ??= [], adicione o nome e retorne resultado."],
        output: "{ feita: ['Ler', 'Revisar'], pendente: ['Praticar'] }",
      },
      {
        title: "Group tasks by status",
        prompt: "Group tasks by their status property with reduce and print the resulting object.",
        solution: "const tasks = [\n  { name: 'Read', status: 'done' },\n  { name: 'Practice', status: 'pending' },\n  { name: 'Review', status: 'done' },\n];\nconst groups = tasks.reduce((result, task) => {\n  (result[task.status] ??= []).push(task.name);\n  return result;\n}, {});\nconsole.log(groups);",
        hints: ["The final object will have one key for each status.", "Each key holds a list of names; initialize that list on the first occurrence.", "In reduce, use result[task.status] ??= [], add the name, and return result."],
        output: "{ done: ['Read', 'Review'], pending: ['Practice'] }",
      },
    ),
    expert: makeChallenge(
      {
        title: "Criar um resumo ordenado por categoria",
        prompt: "Agrupe itens por categoria, some seus valores e mostre as categorias em ordem alfabética com o total de cada uma.",
        solution: "const itens = [\n  { categoria: 'livros', valor: 12 },\n  { categoria: 'jogos', valor: 8 },\n  { categoria: 'livros', valor: 5 },\n];\nconst totais = itens.reduce((resultado, item) => {\n  resultado[item.categoria] = (resultado[item.categoria] ?? 0) + item.valor;\n  return resultado;\n}, {});\nfor (const categoria of Object.keys(totais).sort()) {\n  console.log(`${categoria}: ${totais[categoria]}`);\n}",
        hints: ["Primeiro acumule um total para cada categoria.", "Depois obtenha as chaves do objeto e ordene-as antes de imprimir.", "Use reduce para somar e Object.keys(totais).sort() para percorrer em ordem alfabética."],
        output: "jogos: 8\nlivros: 17",
      },
      {
        title: "Build a category summary in order",
        prompt: "Group items by category, sum their values, and print categories alphabetically with each total.",
        solution: "const items = [\n  { category: 'books', value: 12 },\n  { category: 'games', value: 8 },\n  { category: 'books', value: 5 },\n];\nconst totals = items.reduce((result, item) => {\n  result[item.category] = (result[item.category] ?? 0) + item.value;\n  return result;\n}, {});\nfor (const category of Object.keys(totals).sort()) {\n  console.log(`${category}: ${totals[category]}`);\n}",
        hints: ["First accumulate a total for each category.", "Then get the object keys and sort them before printing.", "Use reduce to add values and Object.keys(totals).sort() to iterate alphabetically."],
        output: "books: 17\ngames: 8",
      },
    ),
  },
  typescript: {
    easy: makeChallenge(
      {
        title: "Formatar estado com união literal",
        prompt: "Declare o tipo Estado como 'pendente' ou 'feito' e crie uma função que mostre um rótulo amigável para cada estado.",
        solution: "type Estado = 'pendente' | 'feito';\nfunction rotulo(estado: Estado): string {\n  return estado === 'feito' ? 'Concluída' : 'Em andamento';\n}\nconsole.log(rotulo('pendente'));",
        hints: ["Uma união literal limita os valores possíveis de uma variável.", "A função recebe Estado e retorna uma string.", "Compare com 'feito' e escolha o rótulo apropriado com uma expressão condicional."],
        output: "Em andamento",
      },
      {
        title: "Format a status with a literal union",
        prompt: "Declare Status as 'pending' or 'done' and write a function that returns a friendly label for each status.",
        solution: "type Status = 'pending' | 'done';\nfunction label(status: Status): string {\n  return status === 'done' ? 'Completed' : 'In progress';\n}\nconsole.log(label('pending'));",
        hints: ["A literal union limits the possible values of a variable.", "The function accepts Status and returns a string.", "Compare with 'done' and choose the label with a conditional expression."],
        output: "In progress",
      },
    ),
    medium: makeChallenge(
      {
        title: "Criar uma função genérica segura",
        prompt: "Escreva uma função genérica primeiro<T> que devolva o primeiro item de uma lista ou undefined quando ela estiver vazia.",
        solution: "function primeiro<T>(itens: T[]): T | undefined {\n  return itens[0];\n}\nconsole.log(primeiro([4, 8, 12]));\nconsole.log(primeiro<string>([]));",
        hints: ["T representa o tipo do item e deve aparecer na entrada e na saída.", "O índice zero pode não existir quando a lista está vazia.", "Declare T[] como parâmetro e T | undefined como retorno."],
        output: "4\nundefined",
      },
      {
        title: "Write a safe generic function",
        prompt: "Write a generic first<T> function that returns the first list item or undefined when the list is empty.",
        solution: "function first<T>(items: T[]): T | undefined {\n  return items[0];\n}\nconsole.log(first([4, 8, 12]));\nconsole.log(first<string>([]));",
        hints: ["T represents the item type and should appear in both input and output.", "Index zero may not exist when the list is empty.", "Declare T[] as the parameter and T | undefined as the return type."],
        output: "4\nundefined",
      },
    ),
    hard: makeChallenge(
      {
        title: "Tratar eventos com união discriminada",
        prompt: "Defina eventos de conclusão e cancelamento e crie uma função que produza uma mensagem para cada tipo sem perder a checagem de tipos.",
        solution: "type Evento =\n  | { tipo: 'concluido'; tarefa: string }\n  | { tipo: 'cancelado'; motivo: string };\nfunction descrever(evento: Evento): string {\n  switch (evento.tipo) {\n    case 'concluido': return `Concluída: ${evento.tarefa}`;\n    case 'cancelado': return `Cancelada: ${evento.motivo}`;\n  }\n}\nconsole.log(descrever({ tipo: 'concluido', tarefa: 'Estudar' }));",
        hints: ["Cada variante precisa de um campo discriminador com valor literal.", "Use o campo tipo em um switch para estreitar a variante.", "No caso concluido leia tarefa; no caso cancelado leia motivo."],
        output: "Concluída: Estudar",
      },
      {
        title: "Handle events with a discriminated union",
        prompt: "Define completion and cancellation events and write a function that returns a message for each kind with type checking intact.",
        solution: "type Event =\n  | { kind: 'completed'; task: string }\n  | { kind: 'cancelled'; reason: string };\nfunction describe(event: Event): string {\n  switch (event.kind) {\n    case 'completed': return `Completed: ${event.task}`;\n    case 'cancelled': return `Cancelled: ${event.reason}`;\n  }\n}\nconsole.log(describe({ kind: 'completed', task: 'Study' }));",
        hints: ["Give each variant a discriminator field with a literal value.", "Switch on the kind field to narrow the variant.", "Read task in the completed case and reason in the cancelled case."],
        output: "Completed: Study",
      },
    ),
    expert: makeChallenge(
      {
        title: "Agrupar objetos mantendo os tipos",
        prompt: "Implemente agruparPor<T, K> para agrupar itens por uma chave textual e preserve o tipo original dos itens.",
        solution: "function agruparPor<T, K extends string>(\n  itens: T[],\n  chave: (item: T) => K,\n): Record<K, T[]> {\n  return itens.reduce((grupos, item) => {\n    const valor = chave(item);\n    (grupos[valor] ??= []).push(item);\n    return grupos;\n  }, {} as Record<K, T[]>);\n}\nconst grupos = agruparPor(\n  [{ nome: 'Ana', setor: 'A' }, { nome: 'Bia', setor: 'B' }],\n  (item) => item.setor,\n);\nconsole.log(grupos.A.length);",
        hints: ["T é o tipo completo do item; K limita a chave escolhida a texto.", "A função de chave recebe T e devolve K.", "Acumule em Record<K, T[]> e use ??= [] antes de adicionar cada item."],
        output: "1",
      },
      {
        title: "Group objects while preserving their types",
        prompt: "Implement groupBy<T, K> to group items by a string key while preserving each item's original type.",
        solution: "function groupBy<T, K extends string>(\n  items: T[],\n  key: (item: T) => K,\n): Record<K, T[]> {\n  return items.reduce((groups, item) => {\n    const value = key(item);\n    (groups[value] ??= []).push(item);\n    return groups;\n  }, {} as Record<K, T[]>);\n}\nconst groups = groupBy(\n  [{ name: 'Ana', team: 'A' }, { name: 'Bea', team: 'B' }],\n  (item) => item.team,\n);\nconsole.log(groups.A.length);",
        hints: ["T is the full item type; K limits the chosen key to strings.", "The key callback receives T and returns K.", "Accumulate into Record<K, T[]> and use ??= [] before adding each item."],
        output: "1",
      },
    ),
  },
  java: {
    easy: makeChallenge(
      {
        title: "Filtrar nomes curtos",
        prompt: "Use streams para selecionar nomes com mais de três letras e mostre a lista resultante.",
        solution: "import java.util.List;\nimport java.util.stream.Collectors;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> nomes = List.of(\"Ana\", \"Bruno\", \"Bia\", \"Caio\");\n        List<String> longos = nomes.stream()\n            .filter(nome -> nome.length() > 3)\n            .collect(Collectors.toList());\n        System.out.println(longos);\n    }\n}",
        hints: ["Transforme a lista em um stream.", "filter recebe uma condição para cada nome.", "Mantenha nome.length() > 3 e colete com Collectors.toList()."],
        output: "[Bruno, Caio]",
      },
      {
        title: "Filter short names",
        prompt: "Use streams to select names with more than three letters and print the resulting list.",
        solution: "import java.util.List;\nimport java.util.stream.Collectors;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = List.of(\"Ana\", \"Bruno\", \"Bea\", \"Caio\");\n        List<String> longNames = names.stream()\n            .filter(name -> name.length() > 3)\n            .collect(Collectors.toList());\n        System.out.println(longNames);\n    }\n}",
        hints: ["Turn the list into a stream.", "filter receives a condition for each name.", "Keep name.length() > 3 and collect with Collectors.toList()."],
        output: "[Bruno, Caio]",
      },
    ),
    medium: makeChallenge(
      {
        title: "Calcular média e contar aprovados",
        prompt: "Com notas 8, 5 e 9, calcule a média e conte quantas notas são pelo menos 7.",
        solution: "import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> notas = List.of(8, 5, 9);\n        double media = notas.stream().mapToInt(Integer::intValue).average().orElse(0);\n        long aprovadas = notas.stream().filter(nota -> nota >= 7).count();\n        System.out.println(\"Média: \" + media);\n        System.out.println(\"Aprovadas: \" + aprovadas);\n    }\n}",
        hints: ["Calcule a média com average() e trate a lista vazia com orElse.", "Faça outro stream para aplicar a condição nota >= 7.", "Use filter(nota -> nota >= 7).count() para a quantidade de aprovadas."],
        output: "Média: 7.333333333333333\nAprovadas: 2",
      },
      {
        title: "Calculate an average and count passing scores",
        prompt: "With scores 8, 5, and 9, calculate the average and count how many scores are at least 7.",
        solution: "import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> scores = List.of(8, 5, 9);\n        double average = scores.stream().mapToInt(Integer::intValue).average().orElse(0);\n        long passing = scores.stream().filter(score -> score >= 7).count();\n        System.out.println(\"Average: \" + average);\n        System.out.println(\"Passing: \" + passing);\n    }\n}",
        hints: ["Calculate the average with average() and handle an empty list with orElse.", "Use another stream to apply the score >= 7 condition.", "Use filter(score -> score >= 7).count() for the passing count."],
        output: "Average: 7.333333333333333\nPassing: 2",
      },
    ),
    hard: makeChallenge(
      {
        title: "Agrupar tarefas e contar por estado",
        prompt: "(JDK 16+) Agrupe tarefas por estado e mostre quantas estão pendentes e quantas foram concluídas.",
        solution: "import java.util.List;\nimport java.util.Map;\nimport java.util.stream.Collectors;\n\nrecord Tarefa(String nome, String estado) {}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Tarefa> tarefas = List.of(\n            new Tarefa(\"Ler\", \"Feita\"),\n            new Tarefa(\"Praticar\", \"Pendente\"),\n            new Tarefa(\"Revisar\", \"Feita\")\n        );\n        Map<String, Long> contagem = tarefas.stream()\n            .collect(Collectors.groupingBy(Tarefa::estado, Collectors.counting()));\n        System.out.println(contagem);\n    }\n}",
        hints: ["O método groupingBy cria grupos com base no estado.", "Use counting como coletor dentro de cada grupo.", "Combine Collectors.groupingBy(Tarefa::estado, Collectors.counting())."],
        output: "{Pendente=1, Feita=2}",
      },
      {
        title: "Group tasks and count by status",
        prompt: "(JDK 16+) Group tasks by status and print how many are pending and how many are completed.",
        solution: "import java.util.List;\nimport java.util.Map;\nimport java.util.stream.Collectors;\n\nrecord Task(String name, String status) {}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Task> tasks = List.of(\n            new Task(\"Read\", \"Done\"),\n            new Task(\"Practice\", \"Pending\"),\n            new Task(\"Review\", \"Done\")\n        );\n        Map<String, Long> counts = tasks.stream()\n            .collect(Collectors.groupingBy(Task::status, Collectors.counting()));\n        System.out.println(counts);\n    }\n}",
        hints: ["groupingBy creates groups based on status.", "Use counting as the collector inside each group.", "Combine Collectors.groupingBy(Task::status, Collectors.counting())."],
        output: "{Pending=1, Done=2}",
      },
    ),
    expert: makeChallenge(
      {
        title: "Montar um ranking determinístico",
        prompt: "(JDK 16+) Ordene jogadores por pontuação decrescente e, em caso de empate, por nome crescente. Mostre os dois primeiros.",
        solution: "import java.util.Comparator;\nimport java.util.List;\n\nrecord Jogador(String nome, int pontos) {}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Jogador> jogadores = List.of(\n            new Jogador(\"Bia\", 12),\n            new Jogador(\"Ana\", 12),\n            new Jogador(\"Caio\", 9)\n        );\n        jogadores.stream()\n            .sorted(Comparator.comparingInt(Jogador::pontos).reversed()\n                .thenComparing(Jogador::nome))\n            .limit(2)\n            .forEach(jogador -> System.out.println(jogador.nome() + \" \" + jogador.pontos()));\n    }\n}",
        hints: ["O comparador precisa de um critério principal e outro para desempate.", "Inverta a comparação de pontos, mas mantenha o nome em ordem crescente.", "Encadeie comparingInt(...).reversed().thenComparing(...), limite a dois e imprima."],
        output: "Ana 12\nBia 12",
      },
      {
        title: "Build a deterministic ranking",
        prompt: "(JDK 16+) Sort players by descending score and, on ties, by ascending name. Print the top two.",
        solution: "import java.util.Comparator;\nimport java.util.List;\n\nrecord Player(String name, int score) {}\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Player> players = List.of(\n            new Player(\"Bea\", 12),\n            new Player(\"Ana\", 12),\n            new Player(\"Kai\", 9)\n        );\n        players.stream()\n            .sorted(Comparator.comparingInt(Player::score).reversed()\n                .thenComparing(Player::name))\n            .limit(2)\n            .forEach(player -> System.out.println(player.name() + \" \" + player.score()));\n    }\n}",
        hints: ["The comparator needs a primary rule and a tie-breaker.", "Reverse the score order but keep names in ascending order.", "Chain comparingInt(...).reversed().thenComparing(...), limit to two, and print."],
        output: "Ana 12\nBea 12",
      },
    ),
  },
  web: {
    easy: makeChallenge(
      {
        title: "Criar um formulário acessível",
        prompt: "Monte um formulário HTML com rótulo associado ao campo de nome e um botão de envio.",
        solution: "<form>\n  <label for=\"nome\">Nome</label>\n  <input id=\"nome\" name=\"nome\" autocomplete=\"name\" required>\n  <button type=\"submit\">Enviar</button>\n</form>",
        hints: ["Formulários agrupam campos e uma ação de envio.", "O atributo for do label precisa apontar para o id do campo.", "Associe label for=nome ao input id=nome e adicione um botão submit."],
        output: "Um formulário com campo Nome identificado e botão Enviar.",
      },
      {
        title: "Create an accessible form",
        prompt: "Build an HTML form with a label associated with a name field and a submit button.",
        solution: "<form>\n  <label for=\"name\">Name</label>\n  <input id=\"name\" name=\"name\" autocomplete=\"name\" required>\n  <button type=\"submit\">Submit</button>\n</form>",
        hints: ["Forms group fields and a submission action.", "The label's for attribute must point to the field's id.", "Connect label for=name to input id=name and add a submit button."],
        output: "A form with a labeled Name field and a Submit button.",
      },
    ),
    medium: makeChallenge(
      {
        title: "Criar cartões responsivos com CSS Grid",
        prompt: "Escreva uma regra CSS para uma grade de cartões que use colunas de no mínimo 14rem e se ajuste ao espaço disponível.",
        solution: ".cartoes {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));\n  gap: 1rem;\n}",
        hints: ["CSS Grid cria linhas e colunas sem precisar fixar uma quantidade de cartões.", "auto-fit repete quantas colunas couberem.", "Use repeat(auto-fit, minmax(14rem, 1fr)) e defina um gap."],
        output: "Cartões em colunas flexíveis, com largura mínima de 14rem.",
      },
      {
        title: "Create responsive cards with CSS Grid",
        prompt: "Write a CSS rule for a card grid with columns at least 14rem wide that adapts to the available space.",
        solution: ".cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));\n  gap: 1rem;\n}",
        hints: ["CSS Grid creates rows and columns without fixing the number of cards.", "auto-fit repeats as many columns as fit.", "Use repeat(auto-fit, minmax(14rem, 1fr)) and set a gap."],
        output: "Cards arranged in flexible columns with a 14rem minimum width.",
      },
    ),
    hard: makeChallenge(
      {
        title: "Validar campo com mensagem acessível",
        prompt: "Crie um campo obrigatório de e-mail e conecte uma mensagem de ajuda por aria-describedby.",
        solution: "<label for=\"email\">E-mail</label>\n<input id=\"email\" name=\"email\" type=\"email\" aria-describedby=\"ajuda-email\" required>\n<p id=\"ajuda-email\">Use um endereço que você possa acessar.</p>",
        hints: ["Use type=email para habilitar a semântica e a validação básica do navegador.", "A mensagem precisa de um id estável.", "Aponte aria-describedby do input para o id do texto de ajuda."],
        output: "O campo obrigatório de e-mail fica associado à sua instrução.",
      },
      {
        title: "Validate a field with an accessible message",
        prompt: "Create a required email field and connect its help message with aria-describedby.",
        solution: "<label for=\"email\">Email</label>\n<input id=\"email\" name=\"email\" type=\"email\" aria-describedby=\"email-help\" required>\n<p id=\"email-help\">Use an address you can access.</p>",
        hints: ["Use type=email for browser semantics and basic validation.", "The message needs a stable id.", "Point the input's aria-describedby to the help text id."],
        output: "The required email field is associated with its instruction.",
      },
    ),
    expert: makeChallenge(
      {
        title: "Montar uma página semântica e adaptável",
        prompt: "Estruture uma página com link para pular ao conteúdo, navegação, conteúdo principal e um aviso que respeite a preferência por movimento reduzido.",
        solution: "<a class=\"pular\" href=\"#conteudo\">Pular para o conteúdo</a>\n<nav aria-label=\"Principal\">\n  <a href=\"/inicio\" aria-current=\"page\">Início</a>\n</nav>\n<main id=\"conteudo\">\n  <h1>Resumo</h1>\n  <p>Seu progresso está atualizado.</p>\n</main>\n<style>\n  a { transition: color 150ms ease; }\n  @media (prefers-reduced-motion: reduce) {\n    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }\n  }\n</style>",
        hints: ["Comece com landmarks semânticos e um destino real para o link de pular.", "Marque a página atual na navegação com aria-current.", "Use prefers-reduced-motion para reduzir animações quando o sistema solicitar."],
        output: "Uma página com navegação semântica, link de salto e movimento reduzido respeitado.",
      },
      {
        title: "Build a semantic, adaptable page",
        prompt: "Structure a page with a skip link, navigation, main content, and a notice that respects reduced-motion preferences.",
        solution: "<a class=\"skip\" href=\"#content\">Skip to content</a>\n<nav aria-label=\"Primary\">\n  <a href=\"/home\" aria-current=\"page\">Home</a>\n</nav>\n<main id=\"content\">\n  <h1>Summary</h1>\n  <p>Your progress is up to date.</p>\n</main>\n<style>\n  a { transition: color 150ms ease; }\n  @media (prefers-reduced-motion: reduce) {\n    *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }\n  }\n</style>",
        hints: ["Start with semantic landmarks and a real destination for the skip link.", "Mark the current page in navigation with aria-current.", "Use prefers-reduced-motion to reduce animation when the system requests it."],
        output: "A page with semantic navigation, a skip link, and reduced-motion support.",
      },
    ),
  },
};
