module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    es2022: true,
    node: true,
    browser: false,
  },
  ignorePatterns: ['**/dist/**', '**/.next/**', '**/build/**', '**/.turbo/**', 'node_modules'],
  extends: [],
  rules: {},
};
