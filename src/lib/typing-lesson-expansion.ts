import type { TypingText } from "./typing-texts";

const CATEGORY_GUIDES: Record<string, { pt: string; en: string }> = {
  Fundamentos: {
    pt: "Para aplicar a ideia, escreva primeiro a entrada e a saída esperada. Depois descreva as transformações em ordem, incluindo decisões e repetições, se forem necessárias. Use um exemplo pequeno e acompanhe cada valor até o resultado. Esse percurso revela passos esquecidos antes que virem um erro difícil de localizar.",
    en: "To apply the idea, write down the input and expected output first. Then describe the transformations in order, including decisions and repetition when needed. Use a small example and follow each value to the result. This walkthrough reveals missing steps before they become difficult errors.",
  },
  "SQL e dados": {
    pt: "Imagine uma tabela pequena com três registros e formule a pergunta antes de escrever a consulta. Decida quais colunas identificam cada registro, quais relações devem ser preservadas e quais linhas pertencem ao resultado. Confira a quantidade de linhas depois de cada filtro ou junção. Assim você percebe duplicações, referências ausentes e condições aplicadas cedo demais.",
    en: "Imagine a small table with three records and phrase the question before writing a query. Decide which columns identify each record, which relationships must be preserved, and which rows belong in the result. Check the row count after each filter or join. This helps reveal duplicates, missing references, and conditions applied too early.",
  },
  Python: {
    pt: "Escolha uma entrada curta e acompanhe os valores enquanto o programa trabalha. Observe quando uma lista muda, quando uma condição escolhe um caminho e o que uma função recebe e devolve. Depois experimente uma lista vazia e um valor inesperado. Comparar esses casos ensina mais do que decorar uma sintaxe sem saber como ela altera os dados.",
    en: "Choose a short input and follow the values while the program works. Notice when a list changes, when a condition selects a path, and what a function receives and returns. Then try an empty list and an unexpected value. Comparing these cases teaches more than memorizing syntax without understanding how it changes data.",
  },
  JavaScript: {
    pt: "Siga a ação de uma pessoa até a mudança que aparece na página: qual evento começou o trabalho, que estado foi lido, se houve espera por uma resposta e como o resultado foi mostrado? Pense também no que a interface deve exibir durante uma demora ou falha. Uma explicação completa acompanha tanto o caminho de sucesso quanto os estados intermediários.",
    en: "Follow a person's action through to the change shown on the page: which event started the work, what state was read, whether a response was awaited, and how the result appeared. Also consider what the interface should show during a delay or failure. A complete explanation follows both the successful path and intermediate states.",
  },
  TypeScript: {
    pt: "Separe duas perguntas: que formato o compilador consegue verificar antes da execução e que dado ainda precisa ser conferido quando chega de fora? Escreva um exemplo válido e um inválido, explique por que diferem e identifique onde uma verificação deve acontecer. Essa separação evita tratar uma declaração de tipo como garantia sobre dados externos.",
    en: "Separate two questions: which shape can the compiler check before execution, and which data still needs inspection when it arrives from outside? Write one valid and one invalid example, explain the difference, and identify where a check belongs. This prevents treating a type declaration as a guarantee about external data.",
  },
  Java: {
    pt: "Use um exemplo pequeno do domínio e identifique quais dados pertencem a cada objeto, quais operações protegem suas regras e que estrutura guarda vários valores. Acompanhe também como uma falha é comunicada. Se cada classe tiver uma responsabilidade explicável e cada método declarar o que promete, o desenho fica mais fácil de manter.",
    en: "Use a small example from the subject area and identify which data belong to each object, which operations protect its rules, and which structure stores many values. Also follow how a failure is reported. When each class has an explainable responsibility and each method states its promise, the design is easier to maintain.",
  },
  Web: {
    pt: "Acompanhe uma interação pela aplicação inteira: o conteúdo semântico apresentado, a ação no navegador, o pedido enviado, a validação no servidor e a resposta que retorna. Inclua teclado, leitores de tela, tela estreita, lentidão e erro no seu raciocínio. Uma aplicação bem ensinada não termina no caso ideal; ela explica como manter a experiência compreensível em cada estado.",
    en: "Follow one interaction through the whole application: the semantic content shown, the browser action, the request sent, server validation, and the response returned. Include keyboard use, screen readers, narrow screens, delays, and errors in your reasoning. A well-designed application does not stop at the ideal case; it keeps the experience understandable in every state.",
  },
  Bash: {
    pt: "Antes de executar uma linha, diga quais argumentos o shell produzirá, qual programa os receberá, de onde virá cada caminho e o que acontecerá se a operação falhar. Faça uma simulação com nomes que contenham espaços e com uma lista vazia. Para ações que alteram arquivos, confira o destino e imagine como recuperar o estado anterior.",
    en: "Before running a line, say which arguments the shell will produce, which program will receive them, where each path comes from, and what happens if the operation fails. Walk through a name containing spaces and an empty list. For actions that change files, check the destination and consider how to recover the previous state.",
  },
};

const NEXT_CATEGORY: Record<string, string> = {
  Fundamentos: "SQL e dados",
  "SQL e dados": "Python",
  Python: "JavaScript",
  JavaScript: "TypeScript",
  TypeScript: "Java",
  Java: "Web",
  Web: "Bash",
  Bash: "um exercício que reúna os conceitos estudados",
};

function firstSentence(text: string, lang: TypingText["lang"]) {
  const match = text.match(/^[\s\S]*?[.!?](?=\s|$)/);
  if (match?.[0]) return match[0];
  return lang === "pt" ? "A ideia principal está no texto acima." : "The main idea is in the passage above.";
}

/** Adds a guided, topic-aware study section to short readings until each lesson reaches 2,000 chars. */
export function expandTypingLessons(texts: TypingText[], minimumLength = 2000): TypingText[] {
  return texts.map((lesson, index) => {
    if (lesson.text.length >= minimumLength) return lesson;
    const english = lesson.lang === "en";
    const guide = CATEGORY_GUIDES[lesson.category];
    const samePath = texts.slice(index + 1).find((candidate) => candidate.lang === lesson.lang && candidate.category === lesson.category);
    const nextTitle = samePath?.title ?? NEXT_CATEGORY[lesson.category] ?? (english ? "the next lesson in this path" : "a próxima aula desta trilha");
    const opening = firstSentence(lesson.text, lesson.lang);
    const sections = english
      ? [
          `Introduction and learning goal. This reading is about “${lesson.title}.” Begin with its central statement: “${opening}” Ask what problem this idea helps solve, what information it needs, and what result a person should expect. Explain the answer in your own words before continuing. This makes the lesson a sequence of reasons rather than a list of terms to memorize.`,
          `Development with a guided example. ${guide?.en ?? "Start with one small case, identify the information available, and follow each decision until the result is clear."} Now change one detail in the example and predict what should happen. If the result changes, point to the exact rule that caused the change. If it does not, explain why the changed detail is irrelevant. This comparison helps distinguish a real rule from a coincidence in one example.`,
          `Guided practice. Teach the idea in three steps: name the input, describe the operation, and state the output. Write down one ordinary case and one boundary case, such as missing information, an empty collection, or a value at the limit. Work through both slowly. Check whether every step follows from the previous one, and revise the explanation wherever you had to guess. A clear explanation should let another learner predict the result without running the program.`,
          `Common misunderstandings. Do not assume that a familiar name, a successful example, or a warning-free screen proves the whole rule is correct. Ask what happens when information is absent, repeated, delayed, or outside the expected range. Separate what the program promises from what you hope it will do. When an assumption is necessary, state it. When a result depends on another part of the system, identify that dependency rather than attributing everything to this concept.`,
          `Conclusion and continuation. Summarize “${lesson.title}” in one sentence, then give a short example that supports your explanation. You are ready to continue when you can describe both the normal case and one likely mistake, and explain how to notice the difference. The next reading, “${nextTitle},” builds on this idea; carry your example forward and look for the new rule it introduces.`,
        ]
      : [
          `Introdução e objetivo. Esta leitura trata de “${lesson.title}”. Comece pela afirmação central: “${opening}” Pergunte que problema essa ideia ajuda a resolver, de quais informações ela precisa e qual resultado devemos esperar. Explique a resposta com suas palavras antes de continuar. Assim, a aula vira uma sequência de motivos, em vez de uma lista de termos para decorar.`,
          `Desenvolvimento com exemplo guiado. ${guide?.pt ?? "Comece por um caso pequeno, identifique as informações disponíveis e acompanhe cada decisão até o resultado ficar claro."} Agora altere um detalhe do exemplo e tente prever o que deve acontecer. Se o resultado mudar, indique a regra exata que causou a mudança. Se não mudar, explique por que o detalhe é irrelevante. Comparar casos ajuda a separar uma regra verdadeira de uma coincidência observada uma única vez.`,
          `Prática orientada. Ensine a ideia em três passos: nomeie a entrada, descreva a operação e indique a saída. Anote um caso comum e um caso limite, como informação ausente, coleção vazia ou valor no limite permitido. Resolva ambos devagar. Confira se cada etapa decorre da anterior e revise a explicação onde você precisou adivinhar. Uma explicação clara permite que outra pessoa preveja o resultado sem executar o programa.`,
          `Dúvidas frequentes. Não conclua que um nome familiar, um exemplo bem sucedido ou uma tela sem avisos provam toda a regra. Pergunte o que acontece quando a informação falta, se repete, demora ou fica fora do intervalo esperado. Separe o que o programa promete do que você espera que aconteça. Quando uma hipótese for necessária, diga qual é. Quando o resultado depender de outra parte do sistema, identifique essa dependência em vez de atribuir tudo a este conceito.`,
          `Conclusão e continuidade. Resuma “${lesson.title}” em uma frase e dê um exemplo curto que sustente sua explicação. Você pode avançar quando conseguir descrever o caso normal, um erro provável e como perceber a diferença. A próxima leitura, “${nextTitle}”, aproveita esta ideia; leve seu exemplo adiante e procure a regra nova que ela apresenta.`,
        ];

    let expanded = `${lesson.text}\n\n${sections.join("\n\n")}`;
    const reinforcement = english
      ? `Final review. Return to the question that opened this lesson and answer it without copying the original wording. Check that your example includes a starting situation, a decision or transformation, and an observable result. If another learner could follow the explanation and notice when the result is wrong, the concept is becoming part of your working knowledge. Keep this note as a bridge to “${nextTitle}.”`
      : `Revisão final. Volte à pergunta que abriu esta aula e responda sem copiar a formulação original. Confira se seu exemplo tem uma situação inicial, uma decisão ou transformação e um resultado que possa ser observado. Se outra pessoa consegue seguir a explicação e perceber quando o resultado está errado, o conceito está virando conhecimento que você sabe usar. Guarde essa ideia como ponte para “${nextTitle}.”`;
    if (expanded.length < minimumLength) expanded += `\n\n${reinforcement}`;

    return { ...lesson, text: expanded };
  });
}
