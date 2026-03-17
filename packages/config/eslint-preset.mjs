import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      // ── Agent-friendly architecture rules ──
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message:
            "AGENT FIX: Do not use console.log in production code. " +
            "For API routers, use structured logging or remove this debug statement. " +
            "See docs/dev/conventions.md for logging patterns.",
        },
        {
          selector: "TaggedTemplateExpression[tag.name='sql']",
          message:
            "AGENT FIX: Do not use raw SQL template literals. " +
            "Use Drizzle ORM query builders from '@petforce/db'. " +
            "See docs/dev/conventions.md for database access patterns.",
        },
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message:
            "AGENT FIX: Do not read process.env directly in application code. " +
            "Environment variables are loaded via dotenv-cli in package.json scripts. " +
            "If you need a config value, accept it as a function parameter or import from a config module. " +
            "See docs/dev/conventions.md.",
        },
      ],

      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../../../*"],
              message:
                "AGENT FIX: Deep relative imports (3+ levels) indicate a missing abstraction. " +
                "Export from the package's index.ts and use '@petforce/*' workspace imports instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Relax rules for test files
    files: ["**/*.test.ts", "**/*.test.tsx", "**/tests/**"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  {
    // Schema files legitimately use sql`` for Drizzle check constraints
    files: ["**/schema.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message:
            "AGENT FIX: Do not use console.log in production code.",
        },
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env']",
          message:
            "AGENT FIX: Do not read process.env directly in application code.",
        },
      ],
    },
  },
  {
    // Infrastructure files that legitimately need process.env
    files: ["**/client.ts", "**/index.ts", "**/lib/**", "**/*.config.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='console'][callee.property.name='log']",
          message:
            "AGENT FIX: Do not use console.log in production code.",
        },
        {
          selector: "TaggedTemplateExpression[tag.name='sql']",
          message:
            "AGENT FIX: Do not use raw SQL template literals.",
        },
      ],
    },
  },
  {
    ignores: ["node_modules/", "dist/", ".next/", ".expo/"],
  },
];
