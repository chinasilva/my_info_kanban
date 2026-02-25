import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override some strict rules for this project
  {
    rules: {
      // Allow require() for dynamic imports (e.g., scraper modules)
      "@typescript-eslint/no-require-imports": "off",
      // Allow any type in certain contexts
      "@typescript-eslint/no-explicit-any": "warn",
      // Relax unused variable rules
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
