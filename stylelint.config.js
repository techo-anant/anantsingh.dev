/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  ignoreFiles: ['dist/**', '.astro/**', 'node_modules/**'],
  rules: {
    // Keep colors in the spec's notation (rgba(r, g, b, 0.35)) so tokens can
    // be checked against BUILD_PLAN.md line by line.
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,
    // Blank lines separate token groups (cover, each world, backgrounds).
    'custom-property-empty-line-before': null,
  },
};
