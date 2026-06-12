<script setup>
defineProps({
  value: { type: [String, Number], required: true },
  label: { type: String, required: true },
  tone: { type: String, default: "" },
});
</script>

<template>
  <div class="stat-tile">
    <strong class="num" :class="tone">{{ value }}</strong>
    <span>{{ label }}</span>
  </div>
</template>

<style scoped>
.stat-tile {
  padding: 12px;
  background: var(--panel-2);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  min-width: 0;
}

.stat-tile strong {
  display: block;
  font-size: 24px;
  line-height: 1.1;
}

.stat-tile span {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 12px;
}

.gold { color: var(--gold); }
.green { color: var(--green); }
.red { color: var(--red); }
.blue { color: var(--blue); }
</style>
