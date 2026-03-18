import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Relative base keeps the output portable for GitHub Pages under
 * root or repository sub-path deployments.
 */
export default defineConfig({
  base: "./",
  plugins: [react()]
});
