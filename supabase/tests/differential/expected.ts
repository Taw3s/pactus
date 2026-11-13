// Disagreements the differential test found and that are still open. Fixing one means deleting its
// entry here: the hand-written case named in `scenario` fails while the entry and the code disagree.
// Empty since 0031 (11/2026): the three typing retake divergences were closed by the rules approved on 10/11/2026.
export const KNOWN: Record<string, { scenario: string; why: string }> = {};
