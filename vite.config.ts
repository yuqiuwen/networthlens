import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:5555";

  return {
    server: {
      host: "::",
      port: 8080,
      strictPort: true,
      proxy: {
        "/v1": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      tsConfigPaths(),
      tailwindcss(),
      tanstackStart({
        customViteReactPlugin: true,
        server: { entry: "server" },
      }),
      viteReact(),
    ],
    resolve: {
      alias: {
        "@": "/src",
      },
    },
  };
});
