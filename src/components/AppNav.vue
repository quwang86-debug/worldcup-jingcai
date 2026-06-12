<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const links = [
  { to: "/", label: "赛程" },
  { to: "/odds", label: "赔率" },
  { to: "/calculator", label: "计算器" },
  { to: "/reports", label: "分析" },
];

const clock = ref("--:--:--");
let timer;

function tick() {
  clock.value = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

onMounted(() => {
  tick();
  timer = setInterval(tick, 1000);
});
onBeforeUnmount(() => clearInterval(timer));
</script>

<template>
  <!-- 桌面端顶部导航 -->
  <header class="topnav">
    <div class="topnav-inner">
      <router-link to="/" class="brand">
        <span class="brand-mark num">26</span>
        <span class="brand-name">世界杯竞彩工具</span>
      </router-link>
      <nav class="top-links">
        <router-link v-for="link in links" :key="link.to" :to="link.to" class="top-link">
          {{ link.label }}
        </router-link>
      </nav>
      <div class="clock">
        <strong class="num">{{ clock }}</strong>
        <span>北京时间</span>
      </div>
    </div>
  </header>

  <!-- 移动端底部 Tab 栏 -->
  <nav class="bottom-tabs">
    <router-link v-for="link in links" :key="link.to" :to="link.to" class="tab-link">
      {{ link.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.topnav {
  position: sticky;
  top: 0;
  z-index: 40;
  height: var(--nav-h);
  background: rgba(10, 17, 31, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line-soft);
}

.topnav-inner {
  width: min(1380px, 100%);
  height: 100%;
  margin: 0 auto;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 20px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 850;
  font-size: 16px;
  white-space: nowrap;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: var(--gold);
  color: #1d1503;
  font-size: 14px;
  font-weight: 900;
}

.top-links {
  display: none;
  gap: 4px;
  flex: 1;
}

.top-link {
  padding: 8px 14px;
  border-radius: 999px;
  color: var(--muted);
  font-weight: 700;
  font-size: 14px;
}

.top-link:hover {
  color: var(--ink);
}

.top-link.router-link-active {
  color: var(--gold);
  background: var(--gold-dim);
}

.clock {
  margin-left: auto;
  display: none;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.clock strong {
  font-size: 15px;
}

.clock span {
  color: var(--faint);
  font-size: 11px;
}

.bottom-tabs {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: calc(var(--tab-h) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(13, 22, 38, 0.96);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--line-soft);
}

.tab-link {
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 13px;
  font-weight: 750;
}

.tab-link.router-link-active {
  color: var(--gold);
}

@media (min-width: 768px) {
  .top-links,
  .clock {
    display: flex;
  }

  .bottom-tabs {
    display: none;
  }
}

@media (max-width: 359px) {
  .brand-name {
    display: none;
  }
}
</style>
