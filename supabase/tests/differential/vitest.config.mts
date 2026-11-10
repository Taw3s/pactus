import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Run by supabase/tests/run.sh against its throwaway Postgres (not part of `npm test`: it needs the database).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("../../../src", import.meta.url)) } },
  // verbose + not silent: the CI log shows how much the random histories reached
  test: { include: ["supabase/tests/differential/*.diff.ts"], testTimeout: 1_800_000, reporters: ["verbose"], silent: false },
});
