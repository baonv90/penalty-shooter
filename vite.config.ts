import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // webOS 5/6 ship Chromium 68/79, even when the television firmware is current.
  build: { target: "chrome68", cssTarget: "chrome68" },
  optimizeDeps: {
    include: ["react", "react-dom", "react-reconciler", "three"],
  },
  resolve: {
    dedupe: ["react", "react-dom", "three", "react-reconciler"],
  },
});
