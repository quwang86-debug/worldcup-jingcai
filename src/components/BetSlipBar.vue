<script setup>
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { MAX_MATCHES, clearSlip, legs } from "../data/betSlip.js";
import { uniqueMatchCount } from "../data/parlayMath.js";

const route = useRoute();

const visible = computed(() => legs.length > 0 && route.path !== "/calculator");
const matchCount = computed(() => uniqueMatchCount(legs));
const pickCount = computed(() => legs.length);

const modeText = computed(() => {
  if (!pickCount.value) return "";
  if (matchCount.value === 1 && pickCount.value > 1) return `单关·${pickCount.value}注`;
  if (matchCount.value > 1) return `${matchCount.value}串1 · ${pickCount.value}项`;
  return `单关 ${Number(legs[0]?.odds || 1).toFixed(2)}`;
});

watch(
  visible,
  (v) => document.body.classList.toggle("has-slip", v),
  { immediate: true }
);
</script>

<template>
  <Transition name="slip">
    <div v-if="visible" class="slip-bar">
      <div class="slip-info">
        <span class="count"><strong class="num">{{ matchCount }}</strong>/{{ MAX_MATCHES }} 场</span>
        <span class="mode num">{{ modeText }}</span>
        <span v-if="matchCount >= MAX_MATCHES" class="full">已满</span>
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
