// Disagreements the differential test found and that are still open. Fixing one means deleting its
// entry here: the hand-written case named in `scenario` fails while the entry and the code disagree.
export const KNOWN: Record<string, { scenario: string; why: string }> = {
  "typing-retake-judged-test": {
    scenario: "digitação: refazer com um teste terminado antes da prova condenada",
    why:
      "After the tribunal annuls a typing proof, checkins_typing_test (0010) still takes any unused finished test of the day, " +
      "including one finished before the condemned proof. The app (unsentTypingTest, scoringTypingTests) treats those tests as judged: " +
      "it never offers them and the ranking gives them no points.",
  },
  "typing-proof-scores-zero": {
    scenario: "digitação: refazer com um teste terminado antes da prova condenada",
    why: "Consequence of the one above: the retake stands (day complete, chest, +20, no debt) while its typing points are 0.",
  },
  "typing-retake-no-way": {
    scenario: "digitação: prova anulada com as 3 tentativas do dia já gastas",
    why:
      "The guide says an annulled proof can be sent again until 23:59. With the 3 daily tests already used before the condemned proof, " +
      "the screen has nothing to send and no attempt to start; the day becomes a debt. The database alone would take one of the older tests.",
  },
};
