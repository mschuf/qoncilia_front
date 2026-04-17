import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("@dnd-kit")) {
            return "drag-drop";
          }

          if (id.includes("react-phone-number-input") || id.includes("libphonenumber-js")) {
            return "phone";
          }

          if (id.includes("framer-motion")) {
            return "motion";
          }

          return "vendor";
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src/components", import.meta.url))
    }
  }
});
