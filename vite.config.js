import { defineConfig } from 'vite';

export default defineConfig({
    root: '.', // Ensure Vite serves from the root folder
    build: {
        outDir: 'dist', // Output compiled files to 'dist'
    },
    server: {
        open: true, // Auto-open in browser
        debug: true  // ✅ Shows physics bodies
    }
});
