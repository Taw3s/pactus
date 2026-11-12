import type { TypingText } from "./typing-texts";

/** Long, original lessons written for deliberate reading and typing practice in the local lab. */
const LESSON_NEXT_STEPS_EN: Record<string, string> = {
  "en-teacher-fundamentals": "In the next reading, we will turn this reasoning into an algorithm: precise steps that finish and solve a problem.",
  "en-teacher-sql": "In the next reading, we will write SQL queries and see how filters, sorting, and joins change the result.",
  "en-teacher-python": "In the next reading, we will organize collections with lists and dictionaries and choose a structure for each problem.",
  "en-teacher-javascript": "In the next reading, we will follow asynchronous tasks and see how a page waits for responses without freezing.",
  "en-teacher-typescript": "In the next reading, we will see how types describe values and how to validate data received at runtime.",
  "en-teacher-java": "In the next reading, we will apply these contracts to collections and careful exception handling.",
  "en-teacher-web": "In the next reading, we will separate structure and appearance with HTML and CSS, then follow what happens when a site opens.",
  "en-teacher-bash": "In the next reading, we will practice terminal commands and apply the same care to paths, quotes, and files.",
};

export const TEACHER_TEXTS_EN: TypingText[] = [
  {
    lang: "en",
    id: "en-teacher-fundamentals",
    category: "Fundamentos",
    title: "Guided lesson: think like a programmer",
    text: [
      "Let us begin with the most important idea: programming is not memorizing commands. It is learning to turn a need into steps that another person, or a machine, can follow. Imagine a library that wants to find which books should be returned to the shelves. Before writing instructions, ask what information is available, what must be discovered, and which rules cannot be ignored. We have a list of loans, due dates, and readers. We want to find overdue books, but loans that are still on time must be left alone. This conversation is part of technical work, not a step to skip.",
      "Now describe the solution without choosing a programming language. Visit each loan. Compare its due date with today. If the date has passed and the book has not been returned, add that loan to the overdue list. Finally, present the list. Each sentence has a clear responsibility. Repeating an action for every loan is a loop; choosing what to do about a due date is a condition; the resulting list is an output. When the steps are clear, selecting commands becomes much easier.",
      "Give the information useful names. A variable is a reference to a value; it is not a magic box that understands the writer's intention. A name such as returnDate explains more than secondValue. A type tells us which operations make sense. Adding quantities is reasonable; adding a street address to a date probably is not. Useful types work like road signs: they tell us what each value means and help reveal mistakes early. The machine follows rules. It does not guess that a number was meant to represent a date.",
      "As a solution grows, divide the work into small functions. One function can check a loan, another can collect overdue loans, and a third can present the result. This is more than tidy formatting. If the overdue rule changes, you know where to look. If something fails, you can examine each part separately. Choose names that describe the result, and avoid a function that reads files, applies rules, and draws a screen all at once.",
      "Finally, practice debugging as an investigation. Choose a small input and write down the result you expect. Trace each step and compare it with the program's result. Also try an empty list, a loan due today, and a book returned early. A program that works only for the comfortable example is not finished. Ask yourself: what assumption am I making, which case could break it, and how would I notice? This habit is more valuable than typing quickly. Read each sentence, understand the idea, and type carefully; accuracy is part of thinking like a programmer.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-sql",
    category: "SQL e dados",
    title: "Guided lesson: organize and query data",
    text: [
      "Think of a database as a carefully organized archive, not a drawer where any information can be dropped. A table represents one kind of thing, such as a reader, a book, or a loan. Each row describes one occurrence; each column describes one property. If a column called dueDate sometimes stores dates and sometimes stores comments, the table no longer explains its contents. Clear names, consistent types, and explicit rules help people and programs interpret the same data in the same way.",
      "Relationships between tables are just as important as the tables themselves. A loan belongs to a reader and a book. Instead of copying a reader's full name into every loan, we store a key that identifies that person. A primary key identifies one row uniquely. A foreign key points to a related row and lets the database prevent broken references. If someone tries to create a loan for a reader who does not exist, a database rule can reject the change before the mistake spreads.",
      "An SQL query describes the result you want. You might ask for open loans, sort them by the oldest due date, and show only a few fields. The database decides how to locate the rows, but the query still has to express the right rule. A filter applied too early can remove information you need; a join using the wrong column can multiply results. Start with one table, add one relationship at a time, and observe how the number of rows changes.",
      "We must also think about changes, not only queries. A transaction groups operations that need to succeed together. Imagine recording a loan and reducing the available quantity of a book. If one action succeeds and the other fails, the data disagree. A transaction lets the application confirm all changes or undo the group. This protects consistency during an error, interruption, or simultaneous access. Correct data depend on rules that still work when the application contains a defect.",
      "Indexes can speed up frequent searches, such as finding loans by reader, but they use storage and add work to writes because they must be updated too. Do not add indexes automatically; first find out which queries are slow. Learn to read a query plan and compare the search before and after. To practice, draw the tables for a library, choose the keys, describe the integrity rules, and write queries in plain language before translating them into SQL. If another person can explain why each relationship exists, the data model is easier to understand.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-python",
    category: "Python",
    title: "Guided lesson: build solutions with Python",
    text: [
      "In Python, begin by looking at the values the program receives and the result it should produce. A variable name refers to a value; it does not transform that value. If an age arrives as text, comparing it with a number may fail or apply a different rule than intended. Before calculating, confirm the data format and decide what to do when information is missing or outside an allowed range. This discipline prevents an unexpected case from turning into an error far from its source.",
      "Lists are useful when we need to keep a sequence of items, such as book titles. A loop lets us inspect each title without writing the same instruction by hand. A condition chooses the appropriate path for each item. Teach yourself to follow one pass through the loop: which item is being examined, what state has been collected, and what changes during this pass? An accumulator can keep a count or a sum. If you cannot explain how it changes, the loop probably needs to be simpler.",
      "Functions give names to steps in our reasoning. Instead of copying an average calculation in several places, write one function that receives values and returns the result. Keep the difference between returning a value and displaying it on screen clear. A small function should have one responsibility that can be described in a sentence. Parameters show which information is needed; the return value shows what the function promises to provide. This makes the rule easier to reuse and test.",
      "Errors are part of learning. An exception message usually identifies the kind of problem and the line where it appeared, but the cause may be a few steps earlier. Read the message from top to bottom, reproduce the case with the smallest possible input, and inspect the values at that point. Do not hide every exception without deciding how to recover. Sometimes the right response is to ask for different input; in other situations, it is better to stop and explain what is missing.",
      "Separate code into modules when a project gains different responsibilities. One module can handle file reading, another can hold the rules, and another can present results. Small tests check examples and edge cases without making someone repeat every step by hand. To study, write a simple solution, explain each variable aloud, and then change the input: an empty list, one item, a duplicate, and invalid data. The goal is not to produce more lines. It is to build a solution whose behavior you can predict and justify.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-javascript",
    category: "JavaScript",
    title: "Guided lesson: JavaScript and page behavior",
    text: [
      "JavaScript gives a page behavior, but a browser is more than a screen that receives commands. It manages documents, events, tasks, and communication with servers. A button can receive a click, validate fields, and ask a server to save a change. To understand this flow, follow every value from its source to the response. Ask who created the value, who may change it, and when the interface should show it.",
      "Values have types and rules. Text, numbers, logical values, lists, and objects represent different ideas. An implicit conversion can hide a difference: text that looks like a number is not automatically the same as a number. Convert and compare values deliberately. When information does not exist yet, represent that absence explicitly and decide what the page should show while it waits. A predictable screen explains empty, loading, and error states, not only success.",
      "Event-driven programming means a function can wait until something happens. The browser calls a handler when a person clicks, types, or changes a page. That function should respond quickly so the interface stays fluid. Network operations can take time, so JavaScript provides promises and asynchronous syntax to wait without freezing the page. While waiting, show a loading state; when the response arrives, check that it succeeded before announcing completion.",
      "A common trap is assuming asynchronous tasks finish in the order they started. Two requests can return in a different order. If someone searches for one word and then another, the first response may arrive last and replace the newer result. The interface must recognize which request is still valid or cancel old work when possible. This example shows why understanding time is part of programming, not a syntax detail.",
      "Organize code by separating presentation, state, and rules when it improves understanding. Validate data again on the server because the browser is not a security boundary. Handle network failures with a useful message and preserve what the person has already typed. To study, build a small task list: first draw the empty state, then creation, editing, and a failed save. Test repeated clicks, blank input, and a delayed response. A good page guides people through every step and never pretends an action succeeded before receiving confirmation.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-typescript",
    category: "TypeScript",
    title: "Guided lesson: use types to explain a program",
    text: [
      "TypeScript adds a language for describing values to JavaScript. Types record which values a part of a program accepts and which results it promises to return. Imagine a function that receives a delivery date. If it accepts any text, a person's name, or a list, callers can make mistakes that are hard to notice. A more precise type makes the contract visible while we write and lets the editor point out some inconsistencies before the program runs.",
      "The compiler can infer many types from values and context. This avoids repeated annotations, but it does not remove the need to think. When a variable can have more than one valid form, a union describes those possibilities. Before using a property available on only one form, the program must find out which form it received. This narrowing is like checking a ticket before entering a room: first confirm the condition, then use the guarantees it provides.",
      "An interface or object type can document the structure of a response, such as a person's profile. Whether a property is required is an important decision. If a field can be missing, say so in the type and handle that absence in the code. Do not use a broad type just to silence the compiler. A declaration that accepts everything protects no one. Prefer to express the real rule, even when doing so means representing different states more carefully.",
      "There is an essential difference between static checking and validation at runtime. TypeScript types are removed when the code is compiled; they do not inspect data received from the internet. An external response remains unknown until the program checks its shape. Validate at the boundary, turn the unknown value into a safe form, and only then apply internal rules. This separation prevents us from trusting a declaration that the received data never had to follow.",
      "Generics let us create functions and structures that work with more than one type while preserving useful information. Use them when the relationship between input and output is genuinely reusable, not to make every signature more complicated. In the end, ask whether a type helps another person understand the subject. If a requirement change breaks in clear places and the editor explains why, the type system is helping. The goal is to communicate rules and reduce mistakes, not to win an argument with the compiler.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-java",
    category: "Java",
    title: "Guided lesson: model a program in Java",
    text: [
      "Java is a typed language that runs on a virtual machine. This layer allows the same program to run on different systems when the required environment is available. When writing Java, you describe classes, methods, and values explicitly. Declaring types may feel demanding at first, but it also makes many design decisions visible: what information exists, which operations are allowed, and what result each method should provide.",
      "A class should represent an idea in the subject area or a clear responsibility. An object combines state and behavior; it is not merely a place to put variables. Consider a book loan. It can know its due date and status, and provide an operation that tells us whether it is overdue. The rule stays near the data that explains it. At the same time, do not turn everything into a class. A small method that calculates a value may be clearer as a helper than as an entire class hierarchy.",
      "Encapsulation means protecting internal rules and providing clear operations. If every part of a program can directly change an object's state, it becomes hard to guarantee that the object remains valid. Constructors and methods can require necessary information and refuse impossible combinations. Interfaces describe behaviors that different classes can provide. This lets an application depend on a capability, such as saving a record, without tying every part of the program to one implementation.",
      "Collections help us work with many values, and each collection has different properties. A list preserves a sequence; a set prevents duplicates; a map locates a value through a key. Choosing the right structure simplifies reasoning and affects the cost of an operation. Exceptions should represent situations that interrupt the normal flow. Catch an exception only when you know how to handle the problem; hiding an error and continuing may produce incorrect data later.",
      "Organize packages around understandable responsibilities and write tests for rules with important consequences. A test might check a loan that is on time, one that is overdue, and a date exactly at the boundary. These examples teach as much as the implementation. When reading code, follow a method call like a conversation: who asks for the work, which data are sent, what guarantees come back, and where could a failure appear? A Java project is easier to maintain when its contracts are explicit and its classes have clear reasons to exist.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-web",
    category: "Web",
    title: "Guided lesson: how a web application works",
    text: [
      "A web application is a conversation between a browser and a server. The browser presents content and receives actions; the server applies rules, reads data, and sends responses. The protocol for that conversation defines requests, methods, headers, and status codes. When a page appears stuck, ask where the delay is happening: has the interface sent the request, is the network slow, is the server working, or was the response interpreted incorrectly? This investigation separates symptoms that may look alike.",
      "HTML describes structure and meaning. A heading should be a heading, a list should identify related items, and a button should represent an action. This meaning helps screen readers, keyboard navigation, and search tools. CSS handles presentation: spacing, colors, alignment, and adaptation to different screens. JavaScript responds to interactions and updates the page. Separating these responsibilities makes it easier to find whether a problem is in the content, the appearance, or the behavior.",
      "A responsive page is not simply a computer screen made smaller. People may use narrow phones, zoom, external keyboards, or reduced-motion preferences. Plan content so it remains readable, make buttons easy to reach, and do not depend on color alone to communicate a state. Test navigation without a mouse and make sure each field has a clear label. Accessibility improves the experience for people with different needs and often reveals a clearer structure for everyone.",
      "Data sent by the browser is untrusted, even when the screen seems to prevent invalid values. Someone can build a request without using the interface. The server must authenticate the person, check authorization, and validate each field before changing data. An encrypted connection protects data in transit, but it does not replace correct permissions. It is also important to avoid showing internal messages, keys, or private information in logs and public responses.",
      "When debugging, use browser tools to inspect a request, its response, console errors, and the size of page resources. Start with one small action that can be repeated. Then change one variable at a time. To learn, draw the route from a click to the database and back. Mark where state changes and what the person sees at each step. This complete view helps us build experiences that stay clear when the network is slow, validation fails, or someone changes their mind.",
    ].join("\n\n"),
  },
  {
    lang: "en",
    id: "en-teacher-bash",
    category: "Bash",
    title: "Guided lesson: write Bash scripts carefully",
    text: [
      "Bash is a command interpreter and an automation language. It receives text, applies expansion rules, and passes arguments to programs. A line that looks simple may involve variables, quotes, paths, redirections, and several processes. When teaching yourself a script, read each step aloud: what value exists here, how is it interpreted, and which program will receive it? Understanding these boundaries prevents surprises, especially when an input contains spaces or special characters.",
      "Double quotes usually preserve spaces inside a variable, while single quotes keep content literal. Without quotes, the shell may split a value into words and expand file patterns. This matters when a valid name contains spaces, brackets, or an asterisk. Arrays keep elements separate and are safer than building a list by joining names with spaces. If a path comes from another person or a file, validate it and confirm the working directory before changing anything.",
      "A reliable script checks important operations. Exit status zero usually indicates success; other values signal failure, but they do not tell the whole story. A clear message should explain what failed and which action stopped without revealing passwords or tokens. Options that try to stop a script automatically after errors help in some cases, but they do not replace explicit decisions. In pipelines, an earlier failure can be hidden if we inspect only the final result. Learn the behavior before trusting the automation.",
      "Before deleting, replacing, or moving many files, show which paths will be affected and ask for confirmation when appropriate. Use a temporary directory created by the process and clean only that directory. If the script needs administrative privileges, explain why and limit the action to what is necessary. A recoverable copy and a preview run reduce the cost of a mistake. Scheduled automation should record its result, use time limits, and handle tasks that may become stuck.",
      "Maintenance is also part of safety. Declare the expected interpreter, document required external programs, and test in an environment similar to the one where the script will run. Static analysis tools find suspicious patterns, but tests with empty directories, names containing spaces, denied permissions, and missing files show what really happens. Small scripts divided into functions with one responsibility are easier to review and explain. The goal is not to automate everything at any cost; it is to make a repeated task predictable, verifiable, and safe for the person who runs it.",
    ].join("\n\n"),
  },
].map((lesson) => {
  return {
    ...lesson,
    lang: "en" as const,
    text: `${lesson.text}\n\n${LESSON_NEXT_STEPS_EN[lesson.id]}`,
  };
});
