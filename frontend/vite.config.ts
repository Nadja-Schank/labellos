import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// strictPort: Das Backend erlaubt (CORS) nur Anfragen von Port 5173.
export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, strictPort: true },
});
