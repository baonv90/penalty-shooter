import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react", "react-dom", "react-reconciler", "three"],
  },
  resolve: {
    dedupe: ["react", "react-dom", "three", "react-reconciler"],
  },
});
