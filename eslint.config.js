// Flat ESLint config (ESLint 9) building on Expo's shared config.
const expoFlat = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'coverage/*',
      'expo-env.d.ts',
      'babel.config.js',
    ],
  },
  ...expoFlat,
  prettier,
];
