<script setup>
import AppNav from "./components/AppNav.vue";
import BetSlipBar from "./components/BetSlipBar.vue";
</script>

<template>
  <AppNav />
  <router-view />
  <BetSlipBar />
  <footer class="app-footer">
    <p>赛程：ESPN · 赔率：体彩官方（500.com 竞彩 XML 镜像）· AI 分析为模拟演示</p>
    <p class="strong">彩票是公益娱乐形式，请理性参与，量力而行。</p>
  </footer>
</template>

<style scoped>
.app-footer {
  width: min(1380px, 100%);
  margin: 0 auto;
  padding: 18px 16px calc(var(--tab-h) + env(safe-area-inset-bottom) + 18px);
  color: var(--faint);
  font-size: 12px;
  text-align: center;
  display: grid;
  gap: 4px;
}

.app-footer .strong {
  color: var(--muted);
  font-weight: 700;
}

@media (min-width: 768px) {
  .app-footer {
    padding-bottom: 18px;
  }
}
</style>
