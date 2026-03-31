import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ganti dari '/Rizalimaru/' menjadi nama repository Anda:
  base: '/rok_management_react_version/'
})