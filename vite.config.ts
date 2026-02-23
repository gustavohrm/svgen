import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  root: "./src",
  publicDir: "./_public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: "./src/index.html",
        settings: "./src/settings/index.html",
        gallery: "./src/gallery/index.html",
      },
    },
  },
  plugins: [tailwindcss()],
});
