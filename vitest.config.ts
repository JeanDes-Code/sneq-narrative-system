import { defineConfig } from "vitest/config";

const includeIntegration = process.env.SNEQ_INTEGRATION_SMOKE === "1";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: includeIntegration ? [] : ["test/integration/**"],
    environment: "node",
    typecheck: { enabled: false },
    pool: "threads",
    poolOptions: { threads: { singleThread: false } }
  }
});
