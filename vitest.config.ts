import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "b2",
          include: ["convex/**/*.test.ts"],
          environment: "edge-runtime",
        },
      },
      {
        test: {
          name: "b4-b5",
          include: ["tests/**/*.test.ts"],
          environment: "node",
          testTimeout: 30000,
        },
      },
    ],
  },
});
