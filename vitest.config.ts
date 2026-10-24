import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/**/*.test.ts"], maxWorkers:process.env.CI?2:4 } });
