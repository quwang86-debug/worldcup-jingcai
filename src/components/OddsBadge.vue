<script setup>
defineProps({
  value: { type: Number, required: true },
  delta: { type: Number, default: 0 },
  label: { type: String, default: "" },
  /** 可点选（未开赛场次） */
  selectable: { type: Boolean, default: false },
  /** 已加入下注方案 */
  selected: { type: Boolean, default: false },
});

const emit = defineEmits(["pick"]);
</script>

<template>
  <div
    class="odds-badge"
    :class="{ selectable, selected }"
    @click="selectable && emit('pick')"
  >
    <span v-if="label" class="odds-label">{{ label }}</span>
    <strong class="num">{{ value.toFixed(2) }}</strong>
    <!-- 国内习惯：红涨绿跌 -->
    <span v-if="delta > 0" class="arrow up num">▲{{ Math.abs(delta).toFixed(2) }}</span>
    <span v-else-if="delta < 0" class="arrow down num">▼{{ Math.abs(delta).toFixed(2) }}</span>
  </div>
</template>

<style scoped>
.odds-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 64px;
  min-height: 56px;
  padding: 8px 10px;
  background: var(--bg-soft);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.odds-badge.selectable {
  cursor: pointer;
}

.odds-badge.selectable:active {
  transform: scale(0.97);
}

.odds-badge.selected {
  border-color: var(--gold);
  background: var(--gold-dim);
}

.odds-badge.selected .odds-label,
.odds-badge.selected strong {
  color: var(--gold);
}

.odds-label {
  color: var(--muted);
  font-size: 11px;
  text-align: center;
}

.odds-badge strong {
  font-size: 18px;
  line-height: 1.1;
}

.arrow {
  font-size: 11px;
  font-weight: 700;
}

.up { color: var(--red); }
.down { color: var(--green); }
</style>
