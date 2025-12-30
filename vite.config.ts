import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Permite que process.env funcione en el navegador para la API Key
    'process.env': process.env
  }
});