import { defineConfig, loadEnv } from "vite";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const devApiProxyTarget = env.DEV_API_PROXY_TARGET;
  const stripApiPrefix = env.DEV_API_PROXY_STRIP_API_PREFIX === "true";

  return {
    plugins: [
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used - do not remove them.
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory.
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: devApiProxyTarget
      ? {
          proxy: {
            "/api": {
              target: devApiProxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: stripApiPrefix ? (path) => path.replace(/^\/api/, "") : undefined,
            },
          },
        }
      : undefined,

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ["**/*.svg", "**/*.csv"],
  };
});
