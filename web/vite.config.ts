import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Excalidraw's prebuilt bundle reads this at module scope.
  define: { "process.env.IS_PREACT": JSON.stringify("false") },
});
