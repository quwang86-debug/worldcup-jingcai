<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({ target: { type: String, required: true } });

const now = ref(Date.now());
let timer;

onMounted(() => {
  timer = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(timer));

const remain = computed(() => {
  const diff = new Date(props.target).getTime() - now.value;
  if (diff <= 0) return null;
  const pad = (v) => String(v).padStart(2, "0");
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, text: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` };
});
</script>

<template>
  <span v-if="remain" class="countdown num">
    <template v-if="remain.days > 0">{{ remain.days }}天 </template>{{ remain.text }}
  </span>
  <span v-else class="countdown started">比赛时间已到</span>
</template>

<style scoped>
.countdown {
  font-weight: 800;
  color: var(--gold);
}

.started {
  color: var(--red);
}
</style>
