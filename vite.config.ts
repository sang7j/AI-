import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  // GitHub Pages 에서 레포 이름이 AI- 이므로 base는 반드시 /AI-/ 여야 함
  base: '/AI-/',

  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: [
      {
        // "패키지이름@1.2.3" → "패키지이름" 으로 자동 치환
        // 예) "@radix-ui/react-slot@1.1.2" → "@radix-ui/react-slot"
        //     "lucide-react@0.487.0"       → "lucide-react"
        find: /(.+)@\d+\.\d+\.\d+/,
        replacement: '$1',
      },
      {
        // "@/..." → src 폴더
        find: '@',
        replacement: path.resolve(__dirname, './src'),
      },
    ],
  },
  build: {
    target: 'esnext',
    outDir: 'docs', // GitHub Pages 에서 /docs 폴더를 사용할 경우
  },
  server: {
    port: 3000,
    open: true,
  },
});