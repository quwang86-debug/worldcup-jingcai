<script setup>
import { computed } from "vue";

const props = defineProps({
  points: { type: Array, required: true },
  width: { type: Number, default: 220 },
  height: { type: Number, default: 56 },
});

const path = computed(() => {
  const values = props.points;
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const padding = 6;
  const innerW = props.width - padding * 2;
  const innerH = props.height - padding * 2;
  return values
    .map((v, i) => {
      const x = padding + (i / (values.length - 1)) * innerW;
      const y = padding + (1 - (v - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
});

const rising = computed(() => props.points[props.points.length - 1] >= props.points[0]);
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="spark">
    <path :d="path" fill="none" stroke-width="2" :stroke="rising ? 'var(--red)' : 'var(--green)'" stroke-linecap="round" />
  </svg>
</template>

<style scoped>
.spark {
  display: block;
  max-width: 100%;
}
</style>
