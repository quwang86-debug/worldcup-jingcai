import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  { path: "/", name: "home", component: () => import("./pages/HomePage.vue") },
  { path: "/match/:id", name: "match", component: () => import("./pages/MatchDetailPage.vue") },
  { path: "/calculator", name: "calculator", component: () => import("./pages/CalculatorPage.vue") },
  { path: "/odds", name: "odds", component: () => import("./pages/OddsPage.vue") },
  { path: "/reports", name: "reports", component: () => import("./pages/ReportsPage.vue") },
];

export default createRouter({
  // hash 模式：静态托管无需服务端路由配置
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});
