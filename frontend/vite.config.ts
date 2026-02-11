import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [react(),tailwindcss()],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
            },
            // these are spring security endpoints involved in oauth2 login/logout
            "/oauth2": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
            },
            "/login": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
            },
            "/logout": {
                target: "http://localhost:8080",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
