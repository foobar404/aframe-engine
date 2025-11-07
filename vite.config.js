import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { terser } from 'rollup-plugin-terser'
import mkcert from 'vite-plugin-mkcert';


// https://vite.dev/config/
export default defineConfig({
    plugins: [
        react({
            include: /\.(jsx|js)$/,
            babel: {
                babelrc: false,
                configFile: false,
                presets: ['@babel/preset-react']
            }
        }),
        tailwindcss(),
        mkcert()
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.json']
    },
    css: {
        preprocessorOptions: {
            styl: {
                additionalData: ''
            }
        }
    },
    server: {
        port: 8080,
        open: true,
        host: true,
        https: true
    },
    build: {
        minify: false,
        rollupOptions: {
            input: './src/index.jsx',
            output: [
                {
                    entryFileNames: 'aframe-engine.js',
                    format: 'iife', // forces full bundle for browser
                    globals: {},
                },
                {
                    entryFileNames: 'aframe-engine.min.js',
                    format: 'iife', // forces full bundle for browser
                    globals: {},
                    plugins: [terser()]
                }
            ],
            external: []       // ensure nothing is excluded
        }
    }
})

