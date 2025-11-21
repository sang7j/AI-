import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  // GitHub Pages 기본 경로 (레포 이름)
  base: '/AI-/',

  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: [
      {
        // 1) "패키지이름@1.2.3" 이런 건 전부 "패키지이름" 으로 치환
        //    예) "@radix-ui/react-slot@1.1.2" -> "@radix-ui/react-slot"
        //        "lucide-react@0.487.0"       -> "lucide-react"
        //        "class-variance-authority@0.7.1" -> "class-variance-authority"
        //        "@jsr/supabase__supabase-js@2.49.8" -> "@jsr/supabase__supabase-js"
        find: /(.+)@\d+\.\d+\.\d+/,
        replacement: '$1',
      },
      {
        // 2) "@/..." 를 src 폴더로 연결
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  build: {
    target: 'esnext',
    outDir: 'docs', // GitHub Pages에서 사용할 폴더
  },
  server: {
    port: 3000,
    open: true,
  },
});