// Bash theory for the typing test's "Texto" mode, five stages per language (Básico to Expert), each with an
// explanation, an example told in words, common mistakes and an exercise. Prose only, like every typing text:
// the code itself is typed in the "Código" mode (typing-code-texts.ts). Ids are stored in typing_progress and in
// the server catalog (0034): never rename one.
import type { TypingText } from "./typing-texts";

const t = (lang: "pt" | "en", id: string, title: string, lines: string[]): TypingText => ({ lang, id, category: "Bash", title, text: lines.join(" ") });

export const BASH_TEXTS_PT: TypingText[] = [
  t("pt", "bash-basico", "Bash 1, básico: o terminal e o comando echo", [
    "O Bash é o interpretador que lê o que você digita no terminal e executa um comando por linha.",
    "Cada linha começa com o nome do programa e segue com argumentos separados por espaços.",
    "Exemplo: o comando echo seguido da palavra olá mostra olá na tela, e o comando pwd mostra em qual pasta você está agora.",
    "O comando ls lista os arquivos dessa pasta e o comando cd muda de pasta.",
    "Erros comuns: escrever Echo com letra maiúscula, porque o Bash diferencia maiúsculas de minúsculas;",
    "esquecer o espaço entre o comando e o argumento; e achar que o terminal guarda o que foi mostrado, quando ele só mostra.",
    "Exercício: abra um terminal, descubra a pasta atual, liste os arquivos e mostre uma frase sua com echo.",
    "Depois repita tudo sem olhar este texto, só pela memória, e anote quais comandos você ainda confunde.",
  ]),
  t("pt", "bash-facil", "Bash 2, fácil: variáveis e argumentos", [
    "Uma variável guarda um texto com um nome. No Bash ela é criada com o nome, o sinal de igual e o valor, tudo junto, sem espaços.",
    "Para ler o valor, escreva um cifrão antes do nome. Um script também recebe argumentos: o primeiro fica no cifrão um, o segundo no cifrão dois.",
    "Exemplo: guarde seu nome numa variável chamada nome e mostre com echo a frase olá seguida do cifrão nome.",
    "Erros comuns: colocar espaços em volta do sinal de igual, o que faz o Bash procurar um comando com o nome da variável;",
    "esquecer as aspas duplas em volta da variável, o que quebra nomes com espaço;",
    "e usar aspas simples quando quer o valor, porque dentro delas o cifrão não é trocado.",
    "Exercício: escreva um script que receba um nome como primeiro argumento e cumprimente essa pessoa.",
    "Sem argumento, ele deve usar a palavra visitante.",
  ]),
  t("pt", "bash-medio", "Bash 3, médio: condições e laços", [
    "O Bash decide pelo código de saída de um comando: zero quer dizer sucesso e qualquer outro número quer dizer falha.",
    "O if executa um comando de teste e, se ele der certo, roda o bloco do then até o fi.",
    "Para repetir, o for percorre uma lista de palavras e o while repete enquanto o teste continuar dando certo.",
    "Exemplo: um laço for que passa pelos arquivos terminados em ponto txt e mostra o nome de cada um.",
    "Erros comuns: esquecer os espaços dentro dos colchetes do teste; comparar números com o sinal de igual, que compara texto;",
    "e escrever um laço sobre a saída do ls, que quebra nomes com espaço, em vez de usar o padrão de arquivos direto.",
    "Exercício: percorra os números de um a dez e mostre só os pares, usando o resto da divisão por dois.",
  ]),
  t("pt", "bash-dificil", "Bash 4, difícil: funções, pipes e redirecionamento", [
    "Uma função dá nome a um bloco de comandos e recebe argumentos do mesmo jeito que um script.",
    "Variáveis criadas dentro dela devem ser declaradas com local, para não vazar para o resto do programa.",
    "O pipe liga a saída de um comando à entrada do próximo, e o redirecionamento manda a saída para um arquivo.",
    "Exemplo: uma função que conta as linhas de um arquivo passando o conteúdo pelo comando wc com a opção de linhas.",
    "Erros comuns: esquecer o local e sobrescrever uma variável global sem perceber;",
    "achar que uma variável alterada dentro de um pipe continua alterada depois, porque cada parte do pipe roda em outro processo;",
    "e redirecionar para o mesmo arquivo que está sendo lido, o que apaga o conteúdo antes da leitura.",
    "Exercício: escreva uma função que receba uma palavra e conte quantas linhas de um arquivo a contêm.",
  ]),
  t("pt", "bash-expert", "Bash 5, expert: scripts robustos", [
    "Um script que vai rodar sozinho precisa falhar cedo e de forma clara.",
    "A opção errexit encerra o script no primeiro comando que falhar, nounset trata variável não definida como erro e pipefail faz um pipe falhar se qualquer parte dele falhar.",
    "Arquivos temporários devem ser criados com mktemp e apagados por um trap na saída, mesmo quando o script é interrompido.",
    "Exemplo: um script de cópia que cria uma pasta temporária, registra um trap para limpá-la e só move o resultado no fim, se tudo deu certo.",
    "Erros comuns: confiar no errexit dentro de condições, onde ele não age; ignorar o código de saída de comandos importantes;",
    "e montar comandos juntando textos, o que abre espaço para injeção.",
    "Exercício: transforme um script seu nesse modelo e teste o que acontece quando um comando do meio falha.",
  ]),
];

export const BASH_TEXTS_EN: TypingText[] = [
  t("en", "en-bash-basic", "Bash 1, basics: the terminal and echo", [
    "Bash is the interpreter that reads what you type in the terminal and runs one command per line.",
    "Each line starts with the name of a program and goes on with arguments separated by spaces.",
    "Example: the command echo followed by the word hello prints hello on the screen, and the command pwd shows the folder you are in.",
    "The command ls lists the files in that folder and the command cd changes folders.",
    "Common mistakes: writing Echo with a capital letter, because Bash tells upper and lower case apart;",
    "leaving out the space between the command and its argument; and thinking the terminal keeps what it printed, when it only shows it.",
    "Exercise: open a terminal, find the current folder, list its files and print a sentence of your own with echo.",
    "Then do it all again from memory, without this text, and write down which commands you still mix up.",
  ]),
  t("en", "en-bash-easy", "Bash 2, easy: variables and arguments", [
    "A variable keeps a piece of text under a name. In Bash it is created with the name, an equals sign and the value, all together, with no spaces.",
    "To read the value, write a dollar sign before the name. A script also gets arguments: the first one is dollar one, the second one is dollar two.",
    "Example: store your name in a variable called name and use echo to print hello followed by dollar name.",
    "Common mistakes: putting spaces around the equals sign, which makes Bash look for a command with the name of the variable;",
    "leaving out the double quotes around the variable, which breaks names that contain a space;",
    "and using single quotes when you want the value, because inside them the dollar sign is not replaced.",
    "Exercise: write a script that takes a name as its first argument and greets that person.",
    "With no argument, it should use the word visitor.",
  ]),
  t("en", "en-bash-medium", "Bash 3, medium: conditions and loops", [
    "Bash decides by the exit code of a command: zero means success and any other number means failure.",
    "The if keyword runs a test command and, when it succeeds, runs the block from then to fi.",
    "To repeat, for walks through a list of words and while repeats as long as the test keeps succeeding.",
    "Example: a for loop that goes through the files ending in dot txt and prints the name of each one.",
    "Common mistakes: leaving out the spaces inside the brackets of the test; comparing numbers with the equals sign, which compares text;",
    "and looping over the output of ls, which breaks names with spaces, instead of using the file pattern directly.",
    "Exercise: go through the numbers from one to ten and print only the even ones, using the remainder of a division by two.",
  ]),
  t("en", "en-bash-hard", "Bash 4, hard: functions, pipes and redirection", [
    "A function gives a name to a block of commands and takes arguments the same way a script does.",
    "Variables created inside it should be declared with local, so they do not leak into the rest of the program.",
    "A pipe connects the output of one command to the input of the next, and a redirection sends the output to a file.",
    "Example: a function that counts the lines of a file by passing its content through the command wc with the lines option.",
    "Common mistakes: forgetting local and overwriting a global variable without noticing;",
    "thinking that a variable changed inside a pipe stays changed afterwards, because each part of a pipe runs in another process;",
    "and redirecting into the same file that is being read, which empties it before it is read.",
    "Exercise: write a function that takes a word and counts how many lines of a file contain it.",
  ]),
  t("en", "en-bash-expert", "Bash 5, expert: robust scripts", [
    "A script that will run on its own has to fail early and clearly.",
    "The errexit option stops the script at the first failing command, nounset treats an unset variable as an error and pipefail makes a pipe fail when any part of it fails.",
    "Temporary files should be created with mktemp and removed by a trap on exit, even when the script is interrupted.",
    "Example: a copy script that creates a temporary folder, registers a trap to clean it up and only moves the result at the end, when everything worked.",
    "Common mistakes: trusting errexit inside conditions, where it does not act; ignoring the exit code of important commands;",
    "and building commands by joining strings, which opens the door to injection.",
    "Exercise: turn one of your scripts into this model and test what happens when a command in the middle fails.",
  ]),
];
