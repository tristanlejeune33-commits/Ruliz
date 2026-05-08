import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "prisma/migrations/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      // React Compiler flags RHF's `watch()` as un-memoizable, but RHF is
      // explicitly designed not to be memoized. Disable the warning project-wide.
      "react-hooks/incompatible-library": "off",
    },
  },
];

export default eslintConfig;
