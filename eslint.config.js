const eslint = require("@eslint/js");
const jest = require("eslint-plugin-jest");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");

module.exports = tseslint.config(
  {
    ignores: ["**/dist/**", "eslint.config.js", ".prettierrc.js"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["test/**"],
    ...jest.configs["flat/recommended"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        // allow renaming with _underscore to suppress error
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
);
