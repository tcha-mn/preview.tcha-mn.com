import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography';
import flowbitePlugin from 'flowbite/plugin';
import flowbiteTypography from 'flowbite-typography';

export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './node_modules/flowbite/**/*.js',
    'node_modules/flowbite-react/lib/esm/**/*.js',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--aw-color-primary)',
        secondary: 'var(--aw-color-secondary)',
        accent: 'var(--aw-color-accent)',
        default: 'var(--aw-color-text-default)',
        heading: 'var(--aw-color-text-heading)',
        muted: 'var(--aw-color-text-muted)',
        darkMode: 'var(--aw-color-bg-page-dark)',
      },
      fontFamily: {
        sans: ['var(--aw-font-sans)', ...defaultTheme.fontFamily.sans],
        serif: ['var(--aw-font-serif)', ...defaultTheme.fontFamily.serif],
        heading: ['var(--aw-font-heading)', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [typography, flowbitePlugin, flowbiteTypography],
  darkMode: 'class',
};
