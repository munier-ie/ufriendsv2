import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react({
            // Force the automatic JSX transform
            jsxRuntime: 'automatic',
        }),
    ],
    esbuild: {
        // This ensures esbuild also uses the automatic transform
        jsx: 'automatic',
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
})
