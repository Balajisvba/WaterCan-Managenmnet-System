import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'https://script.google.com/macros/s/AKfycbwS1Tb-xScrShFIZeFTtMvNJC5LMA8eyUHK_CifXU1seYaBVjZSG6sVYuAzdp4YZTnH/exec',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
