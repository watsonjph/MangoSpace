import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["e2e/**", "scripts/**"],
    ignores: ["scripts/wait-for-lgus-source.mjs"],
    rules: {
      "no-restricted-syntax": ["error", {
        selector: "CallExpression[callee.type='MemberExpression'][callee.property.name='isSourceLoaded'], CallExpression[callee.type='MemberExpression'][callee.property.value='isSourceLoaded']",
        message: "Use waitForLgusSource(page) so getSource guards isSourceLoaded before the source exists.",
      }],
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
