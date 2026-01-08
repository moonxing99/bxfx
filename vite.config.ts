
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 必须与仓库名一致，确保 GitHub Pages 路径正确
  base: '/bxxqfx/', 
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
});
