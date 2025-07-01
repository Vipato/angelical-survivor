import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/angelical-survivor/', // <--- ESSA É A LINHA IMPORTANTE
  plugins: [react()],
})