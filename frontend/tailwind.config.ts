import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15171a',
        panel: '#f7f8fa',
        line: '#d9dee7',
        accent: '#2563eb',
      },
    },
  },
  plugins: [],
} satisfies Config;
