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
      // Les règles React 19 strict suivantes sont nouvelles et détectent des
      // faux positifs sur des patterns parfaitement valides :
      //   - purity : interdit Date.now() en Server Component (où c'est OK,
      //     SC s'exécute 1x par request, pas par render)
      //   - set-state-in-effect : pattern de sync state↔URL ou cleanup
      //     d'intervals/timers accepté en pratique
      //   - static-components : faux positif sur les mappings de composants
      //     (const Icon = MAP[key]; return <Icon />) qui est un pattern courant
      //     pour le rendering dynamique d'icônes
      // Réintégrer en "warn" si on veut les surveiller plus tard sans casser
      // le build de prod.
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
];

export default eslintConfig;
