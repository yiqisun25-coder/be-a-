import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.CUSTOM_API_BASE':   JSON.stringify(env.CUSTOM_API_BASE),
        'process.env.CUSTOM_API_KEY':    JSON.stringify(env.CUSTOM_API_KEY),
        'process.env.CUSTOM_API_MODEL':  JSON.stringify(env.CUSTOM_API_MODEL),
        'process.env.DEEPSEEK_API_KEY':  JSON.stringify(env.DEEPSEEK_API_KEY),
        'process.env.GEMINI_API_KEY':    JSON.stringify(env.GEMINI_API_KEY),
        'process.env.API_KEY':           JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY':JSON.stringify(env.OPENROUTER_API_KEY),
        'process.env.OPENROUTER_MODEL':  JSON.stringify(env.OPENROUTER_MODEL ?? 'openai/gpt-4o-mini'),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
