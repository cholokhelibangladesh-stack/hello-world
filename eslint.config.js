import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// Block module-scope reads of browser-only globals in src/. These crash SSR
// on Cloudflare Workers because there is no window/document at request time.
// Allowed inside functions (useEffect, event handlers, <ClientOnly>, etc.)
// or behind a `typeof window !== "undefined"` guard.
const browserGlobalSelectors = ["window", "document", "localStorage", "sessionStorage", "navigator"].flatMap((name) => [
  `Program > ExpressionStatement > MemberExpression[object.name="${name}"]`,
  `Program > VariableDeclaration VariableDeclarator > MemberExpression[object.name="${name}"]`,
  `Program > VariableDeclaration VariableDeclarator > CallExpression > MemberExpression[object.name="${name}"]`,
]);

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/routeTree.gen.ts", "scripts/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/routeTree.gen.ts",
      "src/integrations/**",
      "src/**/*.server.ts",
      "src/**/*.server.tsx",
      "src/routes/api/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...browserGlobalSelectors.map((selector) => ({
          selector,
          message:
            "Do not touch browser globals (window/document/localStorage/sessionStorage/navigator) at module scope — it breaks SSR. Move the read into useEffect, an event handler, <ClientOnly>, or a typeof-window guard.",
        })),
      ],
    },
  },
);

