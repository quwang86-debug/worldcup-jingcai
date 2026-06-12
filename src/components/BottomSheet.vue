<script setup>
defineProps({
  open: { type: Boolean, required: true },
  title: { type: String, default: "" },
});
const emit = defineEmits(["close"]);
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="open" class="sheet-overlay" @click.self="emit('close')">
        <div class="sheet-panel" role="dialog" aria-modal="true">
          <div class="sheet-head">
            <strong>{{ title }}</strong>
            <button class="btn btn-ghost btn-sm" type="button" @click="emit('close')">关闭</button>
          </div>
          <div class="sheet-body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(4, 8, 16, 0.62);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* 移动端：底部抽屉 */
.sheet-panel {
  width: 100%;
  max-height: 78vh;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px 14px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line-soft);
  font-size: 15px;
}

.sheet-body {
  overflow-y: auto;
  padding: 12px 16px 16px;
}

/* 桌面端：右侧滑出 */
@media (min-width: 768px) {
  .sheet-overlay {
    align-items: stretch;
    justify-content: flex-end;
  }

  .sheet-panel {
    width: 440px;
    max-height: none;
    border-radius: 0;
    border-top: 0;
    border-bottom: 0;
    border-right: 0;
  }
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.2s ease;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.22s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(40px);
}

@media (min-width: 768px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateX(60px);
  }
}
</style>
