import type { TypingLang } from "./typing";

export type BashCodeSnippet = {
  id: string;
  difficulty: BashDifficulty;
  title: Record<TypingLang, string>;
  description: Record<TypingLang, string>;
  challenge: Record<TypingLang, string>;
  hints: Record<TypingLang, string[]>;
  code: Record<TypingLang, string>;
  output: Record<TypingLang, string>;
};

export type BashDifficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

const code = (pt: string[], en: string[]): Record<TypingLang, string> => ({
  pt: pt.join("\n"),
  en: en.join("\n"),
});

/** Static practice examples. The beta displays these examples and never runs typed code. */
const SNIPPETS: Omit<BashCodeSnippet, "difficulty" | "output">[] = [
  {
    id: "bash-printf",
    title: { pt: "Exibir uma mensagem", en: "Print a message" },
    description: { pt: "Use uma variável e printf para formatar uma saudação.", en: "Use a variable and printf to format a greeting." },
    challenge: { pt: "Escreva um script que use o primeiro argumento como nome. Se nenhum nome for informado, use “visitante”. Exiba “Olá, <nome>” em uma linha.", en: "Write a script that uses the first argument as a name. If no name is provided, use “visitor”. Print “Hello, <name>” on one line." },
    hints: {
      pt: [
        "A mensagem tem uma parte fixa e outra que depende do nome recebido pelo script.",
        "O primeiro argumento fica em $1. Pense também no que deve acontecer quando ele estiver vazio.",
        "Use ${1:-visitante} como valor padrão e printf com %s para inserir o nome na saudação.",
      ],
      en: [
        "The message has one fixed part and another part that depends on the name passed to the script.",
        "The first argument is $1. Also decide what to use when it is empty.",
        "Use ${1:-visitor} as the fallback and printf with %s to insert the name into the greeting.",
      ],
    },
    code: code(
      ['name="${1:-visitante}"', "printf 'Olá, %s\\n' \"$name\""],
      ['name="${1:-visitor}"', "printf 'Hello, %s\\n' \"$name\""],
    ),
  },
  {
    id: "bash-read-input",
    title: { pt: "Ler uma resposta", en: "Read an answer" },
    description: { pt: "Leia uma linha sem remover barras invertidas.", en: "Read one line without removing backslashes." },
    challenge: { pt: "Peça o nome da pessoa, leia a resposta preservando barras invertidas e exiba uma saudação usando o nome informado.", en: "Ask for a person's name, read the answer while preserving backslashes, and print a greeting with that name." },
    hints: {
      pt: [
        "Este exercício precisa de uma entrada interativa e de uma mensagem que use a resposta recebida.",
        "Em Bash, read pode guardar a resposta em uma variável; procure uma opção para mostrar a pergunta junto da leitura.",
        "Use read -r -p para ler em name sem interpretar barras invertidas e depois formate a saudação com printf.",
      ],
      en: [
        "This exercise needs interactive input and a message that uses the answer.",
        "In Bash, read can store an answer in a variable; look for an option that displays the prompt while reading.",
        "Use read -r -p to read into name without interpreting backslashes, then format the greeting with printf.",
      ],
    },
    code: code(
      ['read -r -p "Qual é seu nome? " name', "printf 'Olá, %s\\n' \"$name\""],
      ['read -r -p "What is your name? " name', "printf 'Hello, %s\\n' \"$name\""],
    ),
  },
  {
    id: "bash-directory-check",
    title: { pt: "Verificar uma pasta", en: "Check a directory" },
    description: { pt: "Use uma condição para informar se o caminho é uma pasta.", en: "Use a condition to report whether a path is a directory." },
    challenge: { pt: "Receba um caminho como primeiro argumento (use a pasta atual se ele estiver vazio). Informe se o caminho é uma pasta existente.", en: "Read a path from the first argument (use the current directory when it is empty). Report whether the path is an existing directory." },
    hints: {
      pt: [
        "O script precisa escolher entre dois resultados, com base no tipo de caminho recebido.",
        "Use uma condição do Bash para testar se o caminho existe e é uma pasta. Proteja caminhos com espaços.",
        "Defina folder com ${1:-.}, teste [[ -d \"$folder\" ]] em if/else e mostre cada resultado com printf.",
      ],
      en: [
        "The script needs to choose between two outcomes based on the kind of path it receives.",
        "Use a Bash condition to test whether the path exists as a directory. Protect paths that contain spaces.",
        "Set folder with ${1:-.}, test [[ -d \"$folder\" ]] in an if/else, and print each outcome with printf.",
      ],
    },
    code: code(
      [
        'folder="${1:-.}"',
        'if [[ -d "$folder" ]]; then',
        "  printf 'Pasta encontrada: %s\\n' \"$folder\"",
        "else",
        "  printf 'Pasta não encontrada: %s\\n' \"$folder\"",
        "fi",
      ],
      [
        'folder="${1:-.}"',
        'if [[ -d "$folder" ]]; then',
        "  printf 'Directory found: %s\\n' \"$folder\"",
        "else",
        "  printf 'Directory not found: %s\\n' \"$folder\"",
        "fi",
      ],
    ),
  },
  {
    id: "bash-array",
    title: { pt: "Percorrer uma lista", en: "Loop through a list" },
    description: { pt: "Arrays mantêm cada caminho separado, inclusive quando há espaços.", en: "Arrays keep each path separate, including names with spaces." },
    challenge: { pt: "Guarde “relatório final.pdf” e “notas.txt” em uma lista e mostre cada nome em uma linha, sem separar o primeiro nome nos espaços.", en: "Store “final report.pdf” and “notes.txt” in a list and print each name on its own line without splitting the first name at spaces." },
    hints: {
      pt: [
        "Os nomes precisam continuar sendo dois itens separados, mesmo que um deles tenha espaços.",
        "Arrays Bash guardam cada nome como um elemento. Percorra os itens em um laço em vez de dividir uma string.",
        "Declare files=(...), use for file in \"${files[@]}\" e imprima cada \"$file\" com printf.",
      ],
      en: [
        "The names must remain two separate items even though one of them contains spaces.",
        "Bash arrays keep each name as an element. Loop over the elements instead of splitting one string.",
        "Declare files=(...), use for file in \"${files[@]}\", and print each \"$file\" with printf.",
      ],
    },
    code: code(
      [
        'files=("relatório final.pdf" "notas.txt")',
        'for file in "${files[@]}"; do',
        "  printf 'Arquivo: %s\\n' \"$file\"",
        "done",
      ],
      [
        'files=("final report.pdf" "notes.txt")',
        'for file in "${files[@]}"; do',
        "  printf 'File: %s\\n' \"$file\"",
        "done",
      ],
    ),
  },
  {
    id: "bash-glob",
    title: { pt: "Listar arquivos com segurança", en: "List files safely" },
    description: { pt: "Ative nullglob e trate a lista vazia antes de usar os caminhos.", en: "Enable nullglob and handle an empty list before using the paths." },
    challenge: { pt: "Liste os arquivos .txt da pasta atual, um por linha. Ignore diretórios e não mostre o padrão literal quando não houver arquivos correspondentes.", en: "List the .txt files in the current directory, one per line. Skip directories and do not print the literal pattern when no files match." },
    hints: {
      pt: [
        "O padrão *.txt pode não encontrar nada. Nesse caso, o script não deve imprimir o próprio padrão como se fosse um arquivo.",
        "A opção nullglob muda como Bash expande padrões sem correspondência. Um laço pode percorrer os caminhos encontrados.",
        "Ative nullglob com shopt, percorra ./*.txt, ignore itens que não passem em [[ -f \"$file\" ]] e imprima os restantes.",
      ],
      en: [
        "The *.txt pattern may match nothing. In that case, the script should not print the pattern itself as a filename.",
        "The nullglob option changes how Bash expands unmatched patterns. A loop can process the paths that are found.",
        "Enable nullglob with shopt, loop over ./*.txt, skip items that fail [[ -f \"$file\" ]], and print the rest.",
      ],
    },
    code: code(
      [
        "shopt -s nullglob",
        "",
        "for file in ./*.txt; do",
        '  [[ -f "$file" ]] || continue',
        "  printf '%s\\n' \"$file\"",
        "done",
      ],
      [
        "shopt -s nullglob",
        "",
        "for file in ./*.txt; do",
        '  [[ -f "$file" ]] || continue',
        "  printf '%s\\n' \"$file\"",
        "done",
      ],
    ),
  },
  {
    id: "bash-function",
    title: { pt: "Criar uma função", en: "Write a function" },
    description: { pt: "Use local para manter a variável dentro da função.", en: "Use local to keep the variable inside the function." },
    challenge: { pt: "Crie uma função greet que receba um nome, use “visitante” quando ele estiver vazio e mostre uma saudação. Chame a função com o primeiro argumento do script.", en: "Create a greet function that accepts a name, uses “visitor” when it is empty, and prints a greeting. Call the function with the script's first argument." },
    hints: {
      pt: [
        "Separe a saudação em uma função para que ela receba um nome e possa ser chamada pelo script.",
        "A função pode criar uma variável local, escolher um nome padrão e depois ser chamada com o argumento do script.",
        "Defina greet() com local name=\"${1:-visitante}\", use printf dentro dela e chame greet com \"${1:-}\".",
      ],
      en: [
        "Put the greeting in a function so it can receive a name and be called by the script.",
        "The function can create a local variable, choose a fallback name, and then be called with the script argument.",
        "Define greet() with local name=\"${1:-visitor}\", use printf inside it, and call greet with \"${1:-}\".",
      ],
    },
    code: code(
      [
        "greet() {",
        '  local name="${1:-visitante}"',
        "  printf 'Olá, %s\\n' \"$name\"",
        "}",
        'greet "${1:-}"',
      ],
      [
        "greet() {",
        '  local name="${1:-visitor}"',
        "  printf 'Hello, %s\\n' \"$name\"",
        "}",
        'greet "${1:-}"',
      ],
    ),
  },
  {
    id: "bash-case",
    title: { pt: "Escolher uma ação", en: "Choose an action" },
    description: { pt: "case organiza opções sem executar comandos recebidos como texto.", en: "case organizes options without executing commands received as text." },
    challenge: { pt: "Leia a ação do primeiro argumento (padrão: ajuda). Para “status”, mostre “Tudo certo”; para “ajuda”, mostre “Use: status”; para qualquer outra opção, informe que ela é desconhecida.", en: "Read an action from the first argument (default: help). For “status”, print “All good”; for “help”, print “Use: status”; for any other option, report that it is unknown." },
    hints: {
      pt: [
        "O resultado depende de uma opção de texto. Trate valores previstos e também qualquer valor inesperado.",
        "case é adequado para comparar uma variável com várias opções; feche cada ramo e a estrutura corretamente.",
        "Use choice=\"${1:-ajuda}\", ramos status), ajuda) e *) dentro de case \"$choice\" in, encerrando com esac.",
      ],
      en: [
        "The result depends on a text option. Handle the expected values and any unexpected value too.",
        "case is useful for matching one variable against several options; close each branch and the structure correctly.",
        "Use choice=\"${1:-help}\", the status), help), and *) branches inside case \"$choice\" in, and close with esac.",
      ],
    },
    code: code(
      [
        'choice="${1:-ajuda}"',
        "",
        'case "$choice" in',
        "  status) printf 'Tudo certo\\n' ;;",
        "  ajuda) printf 'Use: status\\n' ;;",
        "  *) printf 'Opção desconhecida\\n' ;;",
        "esac",
      ],
      [
        'choice="${1:-help}"',
        "",
        'case "$choice" in',
        "  status) printf 'All good\\n' ;;",
        "  help) printf 'Use: status\\n' ;;",
        "  *) printf 'Unknown option\\n' ;;",
        "esac",
      ],
    ),
  },
  {
    id: "bash-pipeline",
    title: { pt: "Combinar comandos", en: "Combine commands" },
    description: { pt: "Um pipeline envia a saída de uma etapa para a próxima.", en: "A pipeline sends one step's output to the next command." },
    challenge: { pt: "Crie uma lista com as frases “Bash interpreta comandos”, “Python processa dados” e “Bash combina ferramentas”. Mostre somente as frases que contêm “bash”, ignorando maiúsculas e minúsculas, em ordem alfabética.", en: "Create a list with “Bash interprets commands”, “Python processes data”, and “Bash combines tools”. Print only lines containing “bash”, ignoring case, in alphabetical order." },
    hints: {
      pt: [
        "A solução precisa produzir várias linhas e passar esses dados por mais de uma ferramenta.",
        "Primeiro transforme os itens em linhas. Depois filtre pela palavra sem diferenciar caixa e, por fim, ordene.",
        "Use printf para emitir \"${lines[@]}\" e encadeie grep -i 'bash' com sort usando |.",
      ],
      en: [
        "The solution needs to produce several lines and pass that data through more than one tool.",
        "First turn the items into lines. Then filter the word without matching case and sort the result last.",
        "Use printf to emit \"${lines[@]}\" and pipe through grep -i 'bash' and sort.",
      ],
    },
    code: code(
      [
        'lines=("Bash interpreta comandos" "Python processa dados" "Bash combina ferramentas")',
        "printf '%s\\n' \"${lines[@]}\" | grep -i 'bash' | sort",
      ],
      [
        'lines=("Bash interprets commands" "Python processes data" "Bash combines tools")',
        "printf '%s\\n' \"${lines[@]}\" | grep -i 'bash' | sort",
      ],
    ),
  },
];

const DIFFICULTY: Record<string, BashDifficulty> = {
  "bash-printf": "beginner",
  "bash-read-input": "easy",
  "bash-directory-check": "easy",
  "bash-array": "medium",
  "bash-function": "medium",
  "bash-glob": "hard",
  "bash-case": "hard",
  "bash-pipeline": "expert",
};

/** Fixed sample output for teaching; the displayed or typed code is never executed. */
const OUTPUT: Record<string, Record<TypingLang, string>> = {
  "bash-printf": { pt: "Ol\u00e1, visitante", en: "Hello, visitor" },
  "bash-read-input": { pt: "Qual \u00e9 seu nome? Ana\nOl\u00e1, Ana", en: "What is your name? Ana\nHello, Ana" },
  "bash-directory-check": { pt: "Pasta encontrada: .", en: "Directory found: ." },
  "bash-array": { pt: "Arquivo: relat\u00f3rio final.pdf\nArquivo: notas.txt", en: "File: final report.pdf\nFile: notes.txt" },
  "bash-glob": { pt: "notas.txt\ntarefas.txt", en: "notes.txt\ntasks.txt" },
  "bash-function": { pt: "Ol\u00e1, visitante", en: "Hello, visitor" },
  "bash-case": { pt: "Use: status", en: "Use: status" },
  "bash-pipeline": { pt: "Bash combina ferramentas\nBash interpreta comandos", en: "Bash combines tools\nBash interprets commands" },
};

export const BASH_CODE_SNIPPETS: BashCodeSnippet[] = SNIPPETS.map((snippet) => ({
  ...snippet,
  difficulty: DIFFICULTY[snippet.id],
  output: OUTPUT[snippet.id],
}));

export function codeTypingStats(target: string, typed: string) {
  let correct = 0;
  const expected = [...target];
  const entered = [...typed];
  for (let i = 0; i < entered.length; i++) {
    if (entered[i] === expected[i]) correct++;
  }
  return {
    complete: typed === target,
    correct,
    typed: entered.length,
    errors: entered.length - correct,
    accuracy: entered.length ? correct / entered.length : 0,
  };
}
