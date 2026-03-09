/** @type {import("eslint").Linter.Config} */
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  plugins: ["@typescript-eslint"],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/no-explicit-any": "warn",

    // ── Agent-friendly architecture rules ──
    // Each message tells the agent exactly how to fix the violation.

    "no-restricted-syntax": [
      "error",
      {
        selector: "CallExpression[callee.object.name='console'][callee.property.name='log']",
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
        selector: "MemberExpression[object.object.name='process'][object.property.name='env']",
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
  overrides: [
    {
      // Relax rules for test files — tests legitimately use console.log and process.env
      files: ["**/*.test.ts", "**/*.test.tsx", "**/tests/**"],
      rules: {
        "no-restricted-syntax": "off",
      },
    },
  ],
  ignorePatterns: ["node_modules/", "dist/", ".next/", ".expo/"],
};
