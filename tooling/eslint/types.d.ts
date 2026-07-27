// eslint-plugin-jsx-a11y ships no type declarations; declare the slice we use.
declare module "eslint-plugin-jsx-a11y" {
  import type { Linter } from "eslint";

  const plugin: {
    flatConfigs: Record<string, Linter.Config>;
  };

  export default plugin;
}
