import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*"],
              message:
                "Import a module through its public API: @/modules/<name>",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*"],
              message:
                "Import a module through its public API: @/modules/<name>",
            },
            {
              group: ["../../*"],
              message:
                "Don't reach into another module with relative paths; use @/modules/<name>",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["react", "react-dom", "server-only"],
          patterns: [
            {
              group: ["@/modules/*/*"],
              message:
                "Import a module through its public API: @/modules/<name>",
            },
            {
              group: ["../../*"],
              message:
                "Don't reach into another module with relative paths; use @/modules/<name>",
            },
            {
              group: ["@/modules/*", "!@/modules/money"],
              message: "domain/ may only import the money module",
            },
            {
              group: [
                "next",
                "next/*",
                "@supabase/*",
                "@/lib/*",
                "@/components/*",
                "../server",
                "../server/*",
                "../ui",
                "../ui/*",
              ],
              message:
                "domain/ must stay pure TypeScript: no React, Next.js, Supabase or UI",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
