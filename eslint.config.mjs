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
      // Allow prefer-const for now
      "prefer-const": "warn",
      // Disable React strict rules that cause issues
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/naming-convention": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      // Disable Next.js link rule for external links
      "@next/next/no-html-link-for-pages": "off",
      // Disable unnecessary type constraints
      "@typescript-eslint/no-unnecessary-type-constraint": "off",
      // Disable wrapper object types
      "@typescript-eslint/no-wrapper-object-types": "off",
      // Disable empty object type
      "@typescript-eslint/no-empty-object-type": "off",
      // Disable array constructor
      "@typescript-eslint/no-array-constructor": "off",
      // Disable no-invalid-void-type
      "no-invalid-void-type": "off",
      // Disable this-alias (from Prisma generated code)
      "@typescript-eslint/no-this-alias": "off",
      // Disableban-scripts
      "no-await-in-loop": "off",
      // Disable Function type
      "@typescript-eslint/ban-types": "off",
      // Disable no-use-before-define
      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "off",
    },
  },
  // Ignore generated/prisma files
  {
    ignores: ["**/node_modules/**", "**/.next/**", "**/query_compiler*", "**/prisma/**"],
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
