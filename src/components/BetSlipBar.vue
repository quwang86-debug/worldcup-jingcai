<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { MAX_LEGS, clearSlip, legs } from "../data/betSlip.js";

const route = useRoute();

const visible = computed(() => legs.length > 0 && route.path !== "/calculator");

/* 方案栏出现时给页面底部留出空间，避免遮挡列表末尾 */
watch(
  visible,
  (v) => document.body.classList.toggle("has-slip", v),
  { immediate: true }
);
const product = computed(() => legs.reduce((acc, l) => acc * (Number(l.odds) || 1), 1));
const modeText = computed(() =>
  legs.length > 1 ? `${legs.length}串1 赔率 ${product.value.toFixed(2)}` : `单关 赔率 ${product.value.toFixed(2)}`
);
</script>

<template>
  <Transition name="slip">
    <div v-if="visible" class="slip-bar">
      <div class="slip-info">
        <span class="count"><strong class="num">{{ legs.length }}</strong>/{{ MAX_LEGS }} 场</span>
        <span class="mode num">{{ modeText }}</span>
        <span v-if="legs.length >= MAX_LEGS" class="full">已满</span>
      </div>
      <button class="btn btn-ghost btn-sm" type="button" @click="clearSlip">清空</button>
      <router-link to="/calculator" class="btn btn-gold btn-sm">生成方案</router-link>
    </div>
  </Transition>
</template>

<style scoped>
.slip-bar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(var(--tab-h) + env(safe-area-inset-bottom) + 10px);
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--panel-2);
  border: 1px solid rgba(233, 187, 79, 0.55);
  border-radius: 12px;
}

.slip-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.count {
  color: var(--muted);
  font-size: 13px;
}

.count strong {
  color: var(--gold);
  font-size: 18px;
}

.mode {
  color: var(--ink);
  font-size: 13px;
  font-weight: 750;
}

.full {
  color: var(--red);
  font-size: 12px;
  font-weight: 700;
}

@media (min-width: 768px) {
  .slip-bar {
    left: auto;
    right: 24px;
    bottom: 24px;
    width: 380px;
  }
}

.slip-enter-active,
.slip-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.slip-enter-from,
.slip-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
</style>
