/** @type {import('lint-staged').Configuration} */
export default {
  '*.{js,mjs,cjs,ts,astro}': ['eslint --fix', 'prettier --write'],
  '*.{css,astro}': ['stylelint --fix --allow-empty-input'],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};
