import { defineConfig } from "vite";

const isElectron = process.env.BUILD_TARGET === "electron"
export default defineConfig({
    base: isElectron ? "./" : "/deeper/",
    root: ".", // Ensure Vite serves from the root folder
    build: {
        outDir: "dist",
        target: "esnext"
    },
    server: {
        open: true, // Auto-open in browser
        debug: true  // ✅ Shows physics bodies
    }
});
