/** @type {import('prettier').Config} */
export default {
  printWidth: 120,
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  useTabs: false,
  plugins: ['prettier-plugin-astro', 'prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/assets/styles/tailwind.css',
  overrides: [{ files: '*.astro', options: { parser: 'astro' } }],
};
