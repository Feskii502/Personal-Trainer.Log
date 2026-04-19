import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Repo is served at https://feskii502.github.io/Personal-Trainer.Log/
// so all built asset URLs need that prefix.
export default defineConfig({
  plugins: [react()],
  base: '/Personal-Trainer.Log/',
  server: { host: true, port: 5173 },
});
