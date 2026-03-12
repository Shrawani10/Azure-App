import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        // Proxies /azure/* → https://proj-kisan.services.ai.azure.com/*
        // Avoids CORS errors when the browser calls Azure directly
        '/azure': {
          target: env.VITE_API_BASE_URL || 'https://proj-kisan.services.ai.azure.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/azure/, ''),
          secure: true,
        },
      },
    },
  };
});
