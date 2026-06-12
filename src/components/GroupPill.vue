<script setup>
import { computed } from "vue";

const props = defineProps({ group: { type: String, required: true } });

// 三国点缀色按小组字母轮转：绿（墨）/ 蓝（美）/ 红（加）/ 金
const palette = ["green", "blue", "red", "gold"];
const tone = computed(() => palette["ABCDEFGHIJKL".indexOf(props.group) % palette.length]);
</script>

<template>
  <span class="group-pill num" :class="tone">{{ group }}组</span>
</template>

<style scoped>
.group-pill {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 800;
}

.green { background: var(--green-dim); color: var(--green); }
.blue { background: var(--blue-dim); color: var(--blue); }
.red { background: var(--red-dim); color: var(--red); }
.gold { background: var(--gold-dim); color: var(--gold); }
</style>
