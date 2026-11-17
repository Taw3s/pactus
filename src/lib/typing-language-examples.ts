import type { TypingLang } from "./typing";

export type LanguageExampleId = "fundamentals" | "sql" | "python" | "javascript" | "typescript" | "java" | "web" | "bash";

export type LanguageCodeChallenge = {
  title: Record<TypingLang, string>;
  prompt: Record<TypingLang, string>;
  solution: Record<TypingLang, string>;
  hints: Record<TypingLang, string[]>;
  output: Record<TypingLang, string>;
};

export type LanguageExample = {
  id: LanguageExampleId;
  label: Record<TypingLang, string>;
  title: Record<TypingLang, string>;
  summary: Record<TypingLang, string>;
  code: Record<TypingLang, string>;
  expected: Record<TypingLang, string>;
  howToTry: Record<TypingLang, string>;
  challenge: LanguageCodeChallenge;
};

/** One small, original starting example for every programming path in the local lab. */
export const LANGUAGE_CODE_EXAMPLES: LanguageExample[] = [
  {
    id: "fundamentals",
    label: { pt: "Fundamentos", en: "Fundamentals" },
    title: { pt: "Encontrar o maior número", en: "Find the largest number" },
    summary: { pt: "Pseudocódigo: percorra uma lista e atualize a resposta quando encontrar um valor maior.", en: "Pseudocode: walk through a list and update the answer whenever you find a larger value." },
    code: {
      pt: "numeros = [7, 3, 9, 4]\nmaior = numeros[0]\n\npara cada numero em numeros:\n    se numero > maior:\n        maior = numero\n\nmostrar maior",
      en: "numbers = [7, 3, 9, 4]\nlargest = numbers[0]\n\nfor each number in numbers:\n    if number > largest:\n        largest = number\n\nshow largest",
    },
    expected: { pt: "9", en: "9" },
    howToTry: { pt: "Leia como um roteiro e acompanhe o valor de maior a cada volta. Depois troque os números e preveja o resultado.", en: "Read it as a recipe and track largest on each pass. Change the numbers and predict the result." },
    challenge: {
      title: { pt: "Somar valores passo a passo", en: "Add values step by step" },
      prompt: { pt: "Escreva pseudocódigo que percorra a lista [4, 2, 5], some todos os valores em uma variável acumuladora e mostre o total.", en: "Write pseudocode that walks through [4, 2, 5], adds every value to an accumulator, and displays the total." },
      solution: {
        pt: "numeros = [4, 2, 5]\nsoma = 0\n\npara cada numero em numeros:\n    soma = soma + numero\n\nmostrar soma",
        en: "numbers = [4, 2, 5]\nsum = 0\n\nfor each number in numbers:\n    sum = sum + number\n\nshow sum",
      },
      hints: {
        pt: ["Você precisa guardar uma resposta que começa em zero e cresce durante o percurso.", "Percorra cada número e some o valor atual à variável acumuladora.", "Use soma = 0, um laço sobre numeros e atualize soma com soma + numero antes de mostrar o total."],
        en: ["Keep a result that starts at zero and grows while you walk through the list.", "Visit each number and add the current value to the accumulator.", "Start with sum = 0, loop over numbers, update sum with sum + number, then display the total."],
      },
      output: { pt: "11", en: "11" },
    },
  },
  {
    id: "sql",
    label: { pt: "SQL", en: "SQL" },
    title: { pt: "Consultar tarefas abertas", en: "Query open tasks" },
    summary: { pt: "Uma consulta pequena filtra as tarefas concluídas e ordena as restantes pelo nome.", en: "A small query filters completed tasks and sorts the remaining ones by name." },
    code: {
      pt: "WITH tarefas(nome, concluida) AS (\n  VALUES ('Estudar', TRUE), ('Revisar', FALSE), ('Praticar', FALSE)\n)\nSELECT nome\nFROM tarefas\nWHERE concluida = FALSE\nORDER BY nome;",
      en: "WITH tasks(name, completed) AS (\n  VALUES ('Study', TRUE), ('Review', FALSE), ('Practice', FALSE)\n)\nSELECT name\nFROM tasks\nWHERE completed = FALSE\nORDER BY name;",
    },
    expected: { pt: "Praticar\nRevisar", en: "Practice\nReview" },
    howToTry: { pt: "Execute em PostgreSQL ou SQLite recente. Mude TRUE/FALSE e observe quais linhas entram no resultado.", en: "Run it in PostgreSQL or recent SQLite. Change TRUE/FALSE and observe which rows appear." },
    challenge: {
      title: { pt: "Filtrar tarefas pendentes", en: "Filter pending tasks" },
      prompt: { pt: "A tabela tarefas(nome, concluida) já existe; concluida vale TRUE ou FALSE. Escreva uma consulta que mostre apenas os nomes das tarefas pendentes, em ordem alfabética.", en: "The table tasks(name, completed) already exists; completed is TRUE or FALSE. Write a query that returns only the names of pending tasks in alphabetical order." },
      solution: {
        pt: "SELECT nome\nFROM tarefas\nWHERE concluida = FALSE\nORDER BY nome;",
        en: "SELECT name\nFROM tasks\nWHERE completed = FALSE\nORDER BY name;",
      },
      hints: {
        pt: ["A tabela já está pronta: a consulta só precisa ler dela com SELECT ... FROM tarefas.", "Filtre as linhas em que concluida é FALSE e ordene pelo nome.", "Use SELECT nome FROM tarefas, WHERE concluida = FALSE e ORDER BY nome."],
        en: ["The table is ready: the query only needs to read from it with SELECT ... FROM tasks.", "Filter rows where completed is FALSE, then sort by name.", "Use SELECT name FROM tasks, WHERE completed = FALSE, and ORDER BY name."],
      },
      output: { pt: "Praticar\nRevisar", en: "Practice\nReview" },
    },
  },
  {
    id: "python",
    label: { pt: "Python", en: "Python" },
    title: { pt: "Calcular a média", en: "Calculate an average" },
    summary: { pt: "Use uma lista, some os valores e divida pela quantidade de itens.", en: "Use a list, add its values, and divide by the number of items." },
    code: {
      pt: "notas = [8, 6, 10]\nmedia = sum(notas) / len(notas)\nprint(f\"Média: {media:.1f}\")",
      en: "scores = [8, 6, 10]\naverage = sum(scores) / len(scores)\nprint(f\"Average: {average:.1f}\")",
    },
    expected: { pt: "Média: 8.0", en: "Average: 8.0" },
    howToTry: { pt: "Salve como media.py e execute com Python 3. Troque as notas; depois veja o que acontece com uma lista vazia.", en: "Save as average.py and run with Python 3. Change the scores, then consider what happens with an empty list." },
    challenge: {
      title: { pt: "Selecionar números pares", en: "Select even numbers" },
      prompt: { pt: "Leia uma linha com números inteiros separados por espaço (por exemplo: 2 5 8 1), selecione os divisíveis por dois e mostre a lista resultante.", en: "Read a line of integers separated by spaces (for example: 2 5 8 1), select the ones divisible by two, and print the resulting list." },
      solution: {
        pt: "numeros = [int(parte) for parte in input().split()]\npares = [numero for numero in numeros if numero % 2 == 0]\nprint(pares)",
        en: "numbers = [int(part) for part in input().split()]\nevens = [number for number in numbers if number % 2 == 0]\nprint(evens)",
      },
      hints: {
        pt: ["input() lê a linha, split() separa as partes e int() converte cada uma; o operador de resto diz se a divisão por dois deixa sobra.", "Percorra a lista e mantenha somente os valores cujo resto da divisão por dois é zero.", "Use uma compreensão de lista com numero % 2 == 0 e depois imprima pares."],
        en: ["input() reads the line, split() separates the parts, and int() converts each one; the remainder operator tells whether division by two leaves anything over.", "Walk through the list and keep values whose remainder after division by two is zero.", "Use a list comprehension with number % 2 == 0, then print evens."],
      },
      output: { pt: "[2, 8]", en: "[2, 8]" },
    },
  },
  {
    id: "javascript",
    label: { pt: "JavaScript", en: "JavaScript" },
    title: { pt: "Filtrar tarefas concluídas", en: "Filter completed tasks" },
    summary: { pt: "Filtre objetos por uma propriedade e mostre os nomes selecionados.", en: "Filter objects by a property and display the selected names." },
    code: {
      pt: "const tarefas = [\n  { nome: \"Ler\", concluida: true },\n  { nome: \"Praticar\", concluida: false },\n  { nome: \"Revisar\", concluida: true },\n];\nconst feitas = tarefas.filter((tarefa) => tarefa.concluida);\nconst painel = document.querySelector(\"#pactus-playground-root\");\nconst lista = document.createElement(\"ul\");\nfor (const tarefa of feitas) {\n  const item = document.createElement(\"li\");\n  item.textContent = tarefa.nome;\n  lista.append(item);\n}\npainel?.replaceChildren(lista);\nconsole.log(\"Concluídas:\", feitas.map((tarefa) => tarefa.nome).join(\", \"));",
      en: "const tasks = [\n  { name: \"Read\", completed: true },\n  { name: \"Practice\", completed: false },\n  { name: \"Review\", completed: true },\n];\nconst done = tasks.filter((task) => task.completed);\nconst panel = document.querySelector(\"#pactus-playground-root\");\nconst list = document.createElement(\"ul\");\nfor (const task of done) {\n  const item = document.createElement(\"li\");\n  item.textContent = task.name;\n  list.append(item);\n}\npanel?.replaceChildren(list);\nconsole.log(\"Completed:\", done.map((task) => task.name).join(\", \"));",
    },
    expected: { pt: "Ler, Revisar", en: "Read, Review" },
    howToTry: { pt: "No playground após o desafio, pressione Executar. A lista aparece na prévia Web e o console mostra os nomes. Altere concluida para true ou false e execute de novo.", en: "In the playground after the challenge, press Run. The list appears in the Web preview and the console prints the names. Change completed to true or false and run again." },
    challenge: {
      title: { pt: "Listar itens ativos", en: "List active items" },
      prompt: { pt: "A lista de tarefas já vem declarada em entrada: objetos com nome e ativa, como [{ nome: 'Ler', ativa: true }, { nome: 'Pausar', ativa: false }]. Filtre as tarefas ativas e mostre com console.log os nomes delas separados por vírgula e espaço. Não declare a lista na resposta: cada caso traz uma lista diferente.", en: "The list of tasks is already declared as input: objects with name and active, such as [{ name: 'Read', active: true }, { name: 'Pause', active: false }]. Filter the active tasks and print their names with console.log, separated by a comma and a space. Do not declare the list in your answer: each case brings a different list." },
      solution: {
        pt: "const ativas = entrada.filter((tarefa) => tarefa.ativa);\nconsole.log(ativas.map((tarefa) => tarefa.nome).join(\", \"));",
        en: "const active = input.filter((task) => task.active);\nconsole.log(active.map((task) => task.name).join(\", \"));",
      },
      hints: {
        pt: ["A lista já existe na variável entrada; cada objeto tem nome e um valor booleano ativa.", "Use filter para escolher os objetos e map para extrair os nomes.", "Filtre por tarefa.ativa e imprima ativas.map(tarefa => tarefa.nome).join(', ')."],
        en: ["The list already exists in the input variable; each object has a name and a boolean active value.", "Use filter to choose objects and map to extract their names.", "Filter by task.active and print active.map(task => task.name).join(', ')."],
      },
      output: { pt: "Ler", en: "Read" },
    },
  },
  {
    id: "typescript",
    label: { pt: "TypeScript", en: "TypeScript" },
    title: { pt: "Descrever uma tarefa com tipos", en: "Describe a task with types" },
    summary: { pt: "Declare o formato dos dados e deixe o compilador conferir o uso das propriedades.", en: "Declare the data shape and let the compiler check how its properties are used." },
    code: {
      pt: "type Tarefa = {\n  nome: string;\n  concluida: boolean;\n};\n\nconst tarefa: Tarefa = { nome: \"Estudar\", concluida: false };\nconsole.log(tarefa.concluida ? \"Feita\" : \"Pendente\");",
      en: "type Task = {\n  name: string;\n  completed: boolean;\n};\n\nconst task: Task = { name: \"Study\", completed: false };\nconsole.log(task.completed ? \"Done\" : \"Pending\");",
    },
    expected: { pt: "Pendente", en: "Pending" },
    howToTry: { pt: "Cole no TypeScript Playground ou em um projeto TypeScript. Mude concluida para texto e observe o aviso do compilador.", en: "Paste it into the TypeScript Playground or a TypeScript project. Change completed to text and observe the compiler error." },
    challenge: {
      title: { pt: "Formatar o estado de uma tarefa", en: "Format a task status" },
      prompt: { pt: "Declare um tipo Tarefa com nome (texto) e concluida (booleano). A tarefa de cada caso já vem em entrada (escreva declare const entrada: Tarefa; para dar o tipo a ela). Mostre com console.log 'Feita' quando ela está concluída e 'Pendente' quando não está. Não crie a tarefa na resposta: cada caso traz uma diferente.", en: "Declare a Task type with name (text) and completed (boolean). Each case's task is already in input (write declare const input: Task; to give it the type). Print 'Done' with console.log when it is completed and 'Pending' when it is not. Do not create the task in your answer: each case brings a different one." },
      solution: {
        pt: "type Tarefa = {\n  nome: string;\n  concluida: boolean;\n};\ndeclare const entrada: Tarefa;\n\nconst estado = entrada.concluida ? \"Feita\" : \"Pendente\";\nconsole.log(estado);",
        en: "type Task = {\n  name: string;\n  completed: boolean;\n};\ndeclare const input: Task;\n\nconst status = input.completed ? \"Done\" : \"Pending\";\nconsole.log(status);",
      },
      hints: {
        pt: ["A tarefa já existe na variável entrada; o tipo descreve o formato do objeto, mas não escolhe o estado por conta própria.", "Dê o tipo Tarefa a entrada com declare const e use uma expressão condicional para escolher o texto.", "Declare Tarefa, atribua estado com entrada.concluida ? 'Feita' : 'Pendente' e imprima."],
        en: ["The task already exists in the input variable; the type describes the object shape, but it does not choose the state by itself.", "Give input the Task type with declare const and use a conditional expression to choose the text.", "Declare Task, assign status with input.completed ? 'Done' : 'Pending', then print it."],
      },
      output: { pt: "Pendente", en: "Pending" },
    },
  },
  {
    id: "java",
    label: { pt: "Java", en: "Java" },
    title: { pt: "Somar valores de uma lista", en: "Add values in a list" },
    summary: { pt: "Crie uma lista tipada, some seus itens e mostre o total no terminal.", en: "Create a typed list, add its items, and print the total in the terminal." },
    code: {
      pt: "import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> numeros = List.of(3, 5, 8);\n        int soma = numeros.stream()\n            .mapToInt(Integer::intValue)\n            .sum();\n        System.out.println(\"Soma: \" + soma);\n    }\n}",
      en: "import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<Integer> numbers = List.of(3, 5, 8);\n        int sum = numbers.stream()\n            .mapToInt(Integer::intValue)\n            .sum();\n        System.out.println(\"Sum: \" + sum);\n    }\n}",
    },
    expected: { pt: "Soma: 16", en: "Sum: 16" },
    howToTry: { pt: "Salve como Main.java e use JDK 11 ou mais recente: compile com javac Main.java e rode java Main.", en: "Save as Main.java and use JDK 11 or newer: compile with javac Main.java, then run java Main." },
    challenge: {
      title: { pt: "Contar valores positivos", en: "Count positive values" },
      prompt: { pt: "A entrada padrão (System.in) traz uma linha com números inteiros separados por espaço, como -2 4 0 7. Leia essa linha (com BufferedReader ou Scanner), conte quantos números são maiores que zero e mostre a contagem com System.out.println. Não escreva os números na resposta: cada caso traz uma linha diferente.", en: "Standard input (System.in) brings one line of integers separated by spaces, such as -2 4 0 7. Read that line (with BufferedReader or Scanner), count how many numbers are greater than zero, and print the count with System.out.println. Do not write the numbers in your answer: each case brings a different line." },
      solution: {
        pt: "import java.io.BufferedReader;\nimport java.io.InputStreamReader;\nimport java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader leitor = new BufferedReader(new InputStreamReader(System.in));\n        long positivos = Arrays.stream(leitor.readLine().trim().split(\" \"))\n            .mapToInt(Integer::parseInt)\n            .filter(numero -> numero > 0)\n            .count();\n        System.out.println(positivos);\n    }\n}",
        en: "import java.io.BufferedReader;\nimport java.io.InputStreamReader;\nimport java.util.Arrays;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));\n        long positives = Arrays.stream(reader.readLine().trim().split(\" \"))\n            .mapToInt(Integer::parseInt)\n            .filter(number -> number > 0)\n            .count();\n        System.out.println(positives);\n    }\n}",
      },
      hints: {
        pt: ["Os números chegam pela entrada padrão: leia a linha com BufferedReader e separe com split. Zero não conta como maior que zero.", "Transforme as partes em um fluxo de inteiros, mantenha numero > 0 e conte os elementos restantes.", "Use Arrays.stream(...).mapToInt(Integer::parseInt), filter(numero -> numero > 0), count() e imprima o resultado."],
        en: ["The numbers arrive on standard input: read the line with BufferedReader and split it. Zero is not greater than zero.", "Turn the parts into a stream of integers, keep number > 0, and count the remaining items.", "Use Arrays.stream(...).mapToInt(Integer::parseInt), filter(number -> number > 0), count(), and print the result."],
      },
      output: { pt: "2", en: "2" },
    },
  },
  {
    id: "web",
    label: { pt: "Web · HTML/CSS", en: "Web · HTML/CSS" },
    title: { pt: "Montar um cartão de boas-vindas", en: "Build a welcome card" },
    summary: { pt: "HTML organiza o conteúdo; CSS define cores, espaço e aparência.", en: "HTML organizes content; CSS sets color, spacing, and appearance." },
    code: {
      pt: "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Meu primeiro cartão</title>\n  <style>\n    body { font-family: sans-serif; background: #f1eee8; padding: 2rem; }\n    main { max-width: 28rem; margin: auto; padding: 1.5rem; background: white; border-radius: 1rem; }\n    h1 { color: #7251a3; }\n  </style>\n</head>\n<body>\n  <main><h1>Olá!</h1><p>Esta é minha primeira página.</p></main>\n</body>\n</html>",
      en: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>My first card</title>\n  <style>\n    body { font-family: sans-serif; background: #f1eee8; padding: 2rem; }\n    main { max-width: 28rem; margin: auto; padding: 1.5rem; background: white; border-radius: 1rem; }\n    h1 { color: #7251a3; }\n  </style>\n</head>\n<body>\n  <main><h1>Hello!</h1><p>This is my first page.</p></main>\n</body>\n</html>",
    },
    expected: { pt: "Uma página com um cartão centralizado, título roxo e uma mensagem de boas-vindas.", en: "A centered card with a purple heading and a welcome message." },
    howToTry: { pt: "Salve como index.html e abra o arquivo no navegador. Edite a cor do título ou o espaçamento do cartão.", en: "Save as index.html and open it in a browser. Change the heading color or card spacing." },
    challenge: {
      title: { pt: "Criar um aviso acessível", en: "Create an accessible notice" },
      prompt: { pt: "Escreva uma página HTML com o idioma declarado em <html> (lang), o título de página 'Aviso' e, dentro de main, um h1 'Aviso', um parágrafo 'Seu progresso foi salvo.' e um botão 'Entendi' com type=\"button\". A conferência monta a sua página num quadro isolado e examina o resultado (elementos, textos e atributos), não o texto do código.", en: "Write an HTML page with the language declared on <html> (lang), the page title 'Notice' and, inside main, an h1 'Notice', a paragraph 'Your progress was saved.' and an 'I understand' button with type=\"button\". The check mounts your page in an isolated frame and examines the result (elements, texts and attributes), not the text of the code." },
      solution: {
        pt: "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Aviso</title>\n</head>\n<body>\n  <main>\n    <h1>Aviso</h1>\n    <p>Seu progresso foi salvo.</p>\n    <button type=\"button\">Entendi</button>\n  </main>\n</body>\n</html>",
        en: "<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n  <title>Notice</title>\n</head>\n<body>\n  <main>\n    <h1>Notice</h1>\n    <p>Your progress was saved.</p>\n    <button type=\"button\">I understand</button>\n  </main>\n</body>\n</html>",
      },
      hints: {
        pt: ["A conferência olha a página pronta: comece com doctype, idioma, título da página e codificação UTF-8.", "Use main para o conteúdo principal, h1 para o título e um botão com type=button.", "Monte a estrutura HTML e coloque o texto 'Seu progresso foi salvo.' e o botão 'Entendi' dentro de main."],
        en: ["The check looks at the finished page: start with the doctype, document language, page title, and UTF-8 encoding.", "Use main for the primary content, h1 for the heading, and a button with type=button.", "Build the HTML structure and place 'Your progress was saved.' and the 'I understand' button inside main."],
      },
      output: { pt: "Uma página com o título Aviso, a mensagem de progresso e o botão Entendi.", en: "A page with the Notice heading, the progress message, and the I understand button." },
    },
  },
  {
    id: "bash",
    label: { pt: "Bash", en: "Bash" },
    title: { pt: "Saudar pelo nome", en: "Greet by name" },
    summary: { pt: "Leia o primeiro argumento e use um nome padrão quando ele não for fornecido.", en: "Read the first argument and use a default name when none is provided." },
    code: {
      pt: "nome=\"${1:-colega}\"\nprintf 'Olá, %s!\\n' \"$nome\"",
      en: "name=\"${1:-friend}\"\nprintf 'Hello, %s!\\n' \"$name\"",
    },
    expected: { pt: "Sem argumento: Olá, colega!\nCom Ana: Olá, Ana!", en: "Without argument: Hello, friend!\nWith Sam: Hello, Sam!" },
    howToTry: { pt: "Salve como saudacao.sh. No terminal, rode bash saudacao.sh e depois bash saudacao.sh Ana.", en: "Save as greet.sh. In a terminal, run bash greet.sh and then bash greet.sh Sam." },
    challenge: {
      title: { pt: "Saudar com um valor padrão", en: "Greet with a fallback" },
      prompt: { pt: "Leia o primeiro argumento como nome, use 'colega' quando estiver ausente e mostre uma saudação com printf.", en: "Read the first argument as a name, use 'friend' when it is missing, and print a greeting with printf." },
      solution: {
        pt: "nome=\"${1:-colega}\"\nprintf 'Olá, %s!\\n' \"$nome\"",
        en: "name=\"${1:-friend}\"\nprintf 'Hello, %s!\\n' \"$name\"",
      },
      hints: {
        pt: ["O primeiro argumento do script fica em $1; ele pode estar vazio.", "A expansão ${1:-valor} escolhe um padrão quando o argumento não foi informado.", "Defina nome com ${1:-colega} e use printf com %s e a variável entre aspas."],
        en: ["The script's first argument is $1; it may be empty.", "The ${1:-value} expansion selects a fallback when the argument is missing.", "Set name with ${1:-friend} and use printf with %s and the quoted variable."],
      },
      output: { pt: "Sem argumento: Olá, colega!\nCom Ana: Olá, Ana!", en: "Without argument: Hello, friend!\nWith Sam: Hello, Sam!" },
    },
  },
];
