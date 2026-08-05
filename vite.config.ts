import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Cruciverbalis/',
  build: {
    rollupOptions: {
      input: {
        atelier: 'index.html',
        play: 'play/index.html',
      },
    },
  },
});
