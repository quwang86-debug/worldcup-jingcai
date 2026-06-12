import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  // GitHub Pages 项目站路径为 /worldcup-jingcai/；本地与 Cloudflare 部署用根路径 /
  base: process.env.BASE_PATH || "/",
  plugins: [vue()],
  server: {
    host: true,
  },
});
