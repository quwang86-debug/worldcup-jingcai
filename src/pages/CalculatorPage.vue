<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { matchById, upcomingMatches } from "../data/matches.js";
import { PLAY_TYPES, playTypeById } from "../data/playTypes.js";
import { MAX_MATCHES, addMatchDefault, ensureLegMults, legs, legsFor, removeLegAt, removeMatch } from "../data/betSlip.js";
import { calcParlay, clampMult, groupLegsByMatch, ticketsForParlaySize, uniqueMatchCount, UNIT_PRICE } from "../data/parlayMath.js";
import BottomSheet from "../components/BottomSheet.vue";
import GroupPill from "../components/GroupPill.vue";

const route = useRoute();

const PAYOUT_CAP = 5_000_000;

/* ---------- 场次（腿）管理：与全局选注单共享 ---------- */

const sheetOpen = ref(false);
const sheetSearch = ref("");

const candidates = computed(() => {
  const q = sheetSearch.value.trim().toLowerCase();
  return upcomingMatches()
    .filter((m) => !legsFor(m.espn_event_id).length)
    .filter((m) => !q || `${m.fixture_zh}${m.fixture}`.toLowerCase().includes(q))
    .slice(0, 40);
});

const groupedLegs = computed(() => groupLegsByMatch(legs));
const matchCount = computed(() => uniqueMatchCount(legs));

function addLeg(match) {
  addMatchDefault(match);
  sheetOpen.value = false;
  sheetSearch.value = "";
}

function legOptions(leg) {
  const match = matchById(leg.matchId);
  return match ? playTypeById(leg.playId).options(match) : [];
}

function onPlayChange(leg) {
  const options = legOptions(leg);
  if (options.length) {
    leg.pick = options[0].pick;
    leg.odds = options[0].odds;
  }
}

function onPickChange(leg) {
  const option = legOptions(leg).find((o) => o.pick === leg.pick);
  if (option) leg.odds = option.odds;
}

onMounted(() => {
  ensureLegMults();
  const id = route.query.add;
  if (id) {
    const match = matchById(id);
    if (match && match.status_state === "pre") addMatchDefault(match);
  }
});

/* ---------- 过关方式与奖金计算 ---------- */

const globalMult = ref(1);
const selectedSizes = ref(new Set());

const sizeOptions = computed(() => {
  const n = matchCount.value;
  if (n < 2) return [];
  const sizes = [];
  for (let m = 2; m <= n; m++) sizes.push(m);
  return sizes;
});

/* 场次变化时清掉失效的过关方式；默认 n 串 1 */
watch(
  matchCount,
  (n) => {
    const valid = [...selectedSizes.value].filter((m) => m >= 2 && m <= n);
    if (!valid.length && n >= 2) {
      selectedSizes.value = new Set([n]);
    } else if (valid.length !== selectedSizes.value.size) {
      selectedSizes.value = new Set(valid);
    }
  },
  { immediate: true }
);

function toggleSize(m) {
  const next = new Set(selectedSizes.value);
  if (next.has(m)) next.delete(m);
  else next.add(m);
  selectedSizes.value = next;
}

const result = computed(() => calcParlay(legs, [...selectedSizes.value]));

function applyGlobalToLegs() {
  const m = clampMult(globalMult.value);
  for (const leg of legs) leg.mult = m;
}

function onLegMultInput(leg) {
  leg.mult = clampMult(leg.mult);
}

const capped = computed(() => result.value && result.value.payout > PAYOUT_CAP);

const fmt = (v) =>
  v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v.toFixed(2);

/* ---------- 本地投注记录 ---------- */

const STORAGE_KEY = "wc_tickets";
const tickets = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.value));
}

function saveTicket() {
  if (!result.value || !result.value.tickets) return;
  tickets.value.unshift({
    id: Date.now(),
    time: new Date().toLocaleString("zh-CN", { hour12: false }),
    legs: legs.map((l) => ({
      label: l.label,
      pick: l.pick,
      odds: l.odds,
      mult: clampMult(l.mult),
    })),
    globalMult: clampMult(globalMult.value),
    mode: result.value.mode,
    invest: result.value.invest,
    payout: Math.min(result.value.payout, PAYOUT_CAP),
    status: "pending",
  });
  persist();
}

function setStatus(ticket, status) {
  ticket.status = status;
  persist();
}

function removeTicket(id) {
  tickets.value = tickets.value.filter((t) => t.id !== id);
  persist();
}

const profit = computed(() => {
  let invested = 0;
  let won = 0;
  for (const t of tickets.value) {
    if (t.status === "pending") continue;
    invested += t.invest;
    if (t.status === "win") won += t.payout;
  }
  return { invested, won, net: won - invested };
});
</script>

<template>
  <div class="page calc-page">
    <h1>串关奖金计算器</h1>
    <p class="subtitle">最多 {{ MAX_MATCHES }} 场过关 · 同场可多选复式 · 计算结果仅供参考</p>

    <div class="two-col">
      <section class="main-col">
        <!-- 已选场次 -->
        <div v-if="!legs.length" class="panel panel-pad empty-state">
          <p>还没有选择场次。</p>
          <button class="btn btn-gold" type="button" @click="sheetOpen = true">+ 添加场次</button>
        </div>

        <template v-else>
          <div class="panel legs-panel">
            <div v-for="g in groupedLegs" :key="g.matchId" class="leg">
              <div class="leg-head">
                <div class="leg-title">
                  <GroupPill v-if="g.group" :group="g.group" />
                  <strong>{{ g.label }}</strong>
                  <span v-if="g.picks.length > 1" class="dup-tag">{{ g.picks.length }}项复式</span>
                </div>
                <button class="btn btn-ghost btn-sm" type="button" @click="removeMatch(g.matchId)">移除本场</button>
              </div>
              <div class="leg-meta num">{{ g.date }}</div>
              <div class="leg-pick-head">
                <span>玩法</span>
                <span>投注选项</span>
                <span>赔率</span>
                <span>下注倍数</span>
                <span class="leg-pick-head-action">操作</span>
              </div>
              <div v-for="(leg, pi) in g.picks" :key="`${leg.playId}-${leg.pick}`" class="leg-pick-row">
                <select v-model="leg.playId" class="select" @change="onPlayChange(leg)">
                  <option v-for="p in PLAY_TYPES" :key="p.id" :value="p.id">{{ p.label }}</option>
                </select>
                <select v-model="leg.pick" class="select" @change="onPickChange(leg)">
                  <option v-for="o in legOptions(leg)" :key="o.pick" :value="o.pick">{{ o.pick }}</option>
                </select>
                <input
                  v-model.number="leg.odds"
                  class="input num odds-input"
                  type="number"
                  step="0.01"
                  min="1"
                  inputmode="decimal"
                  aria-label="赔率"
                >
                <input
                  v-model.number="leg.mult"
                  class="input num mult-input"
                  type="number"
                  min="1"
                  step="1"
                  inputmode="numeric"
                  aria-label="倍数"
                  title="单项倍数"
                  @change="onLegMultInput(leg)"
                >
                <button
                  class="btn btn-ghost btn-sm"
                  type="button"
                  @click="removeLegAt(legs.indexOf(leg))"
                >
                  删
                </button>
              </div>
            </div>
          </div>
        </template>

        <button
          v-if="legs.length && matchCount < MAX_MATCHES"
          class="btn add-more"
          type="button"
          @click="sheetOpen = true"
        >
          + 添加场次（{{ matchCount }}/{{ MAX_MATCHES }}）
        </button>

        <!-- 过关方式 -->
        <div v-if="sizeOptions.length" class="panel panel-pad">
          <h2 class="section-title">过关方式（可多选组合）</h2>
          <div class="size-pills">
            <button
              v-for="m in sizeOptions"
              :key="m"
              type="button"
              class="size-pill num"
              :class="{ active: selectedSizes.has(m) }"
              @click="toggleSize(m)"
            >
              {{ m }}串1
              <span class="combos">{{ ticketsForParlaySize(legs, m) }}注</span>
            </button>
          </div>
        </div>

        <!-- 投注记录 -->
        <div class="panel panel-pad history">
          <div class="history-head">
            <h2 class="section-title">投注记录（仅存本机）</h2>
            <span v-if="profit.invested" class="num" :class="profit.net >= 0 ? 'win' : 'lose'">
              已结算盈亏 {{ profit.net >= 0 ? "+" : "" }}{{ profit.net.toFixed(2) }} 元
            </span>
          </div>
          <p v-if="!tickets.length" class="muted">保存的模拟票会显示在这里，可标记中奖结果统计盈亏。</p>
          <div v-for="t in tickets" :key="t.id" class="ticket">
            <div class="ticket-top">
              <span class="num ticket-time">{{ t.time }}</span>
              <span
                class="tag"
                :class="{ done: t.status === 'win', live: t.status === 'lose' }"
              >{{ t.status === "win" ? "已中奖" : t.status === "lose" ? "未中奖" : "待开奖" }}</span>
            </div>
            <ul class="ticket-legs">
              <li v-for="(l, j) in t.legs" :key="j">
                {{ l.label }} · {{ l.pick }}
                <span class="num">@{{ Number(l.odds).toFixed(2) }}</span>
                <span v-if="l.mult > 1" class="num">×{{ l.mult }}</span>
              </li>
            </ul>
            <div class="ticket-bottom">
              <span>{{ t.mode }} · 投入 <strong class="num">{{ t.invest }}</strong> 元 · 满额可中
                <strong class="num gold-text">{{ fmt(t.payout) }}</strong> 元</span>
              <span class="ticket-actions">
                <button v-if="t.status === 'pending'" class="btn btn-sm" type="button" @click="setStatus(t, 'win')">中奖</button>
                <button v-if="t.status === 'pending'" class="btn btn-sm" type="button" @click="setStatus(t, 'lose')">未中</button>
                <button class="btn btn-ghost btn-sm" type="button" @click="removeTicket(t.id)">删除</button>
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- 结果面板：桌面侧栏 / 移动端底部常驻 -->
      <aside>
        <div class="panel panel-pad result-panel">
          <h2 class="section-title">奖金试算</h2>
          <div class="stake-row">
            <label for="global-mult">合计倍数</label>
            <div class="stake-controls">
              <input
                id="global-mult"
                v-model.number="globalMult"
                class="input num"
                type="number"
                min="1"
                step="1"
                inputmode="numeric"
                @change="globalMult = clampMult(globalMult)"
              >
              <button class="btn btn-sm" type="button" @click="applyGlobalToLegs">应用到每项</button>
            </div>
          </div>
          <p class="stake-hint">
            总投入 = 各选项下注倍数 × {{ UNIT_PRICE }} 之和。合计倍数点「应用到每项」后写入各行下注倍数，本身不参与计算。
          </p>
          <template v-if="result">
            <div class="result-rows">
              <div class="result-row"><span>方式</span><strong>{{ result.mode }}</strong></div>
              <div class="result-row"><span>注数</span><strong class="num">{{ result.tickets }}</strong></div>
              <div class="result-row"><span>总投入</span><strong class="num">{{ result.invest.toFixed(2) }} 元</strong></div>
            </div>
            <div class="payout">
              <span>全中可得（含本金）</span>
              <strong class="num">{{ fmt(Math.min(result.payout, PAYOUT_CAP)) }} 元</strong>
            </div>
            <p v-if="capped" class="cap-note">已触及单票 500 万元奖金上限，超出部分不予兑付。</p>
            <p v-if="result.isSingleMulti" class="cap-note">同场多选为独立单关，展示为命中最高赔率项可得金额。</p>
            <button class="btn btn-gold save-btn" type="button" :disabled="!result.tickets" @click="saveTicket">
              保存为模拟票
            </button>
          </template>
          <p v-else class="muted">添加场次后开始计算。</p>
        </div>
      </aside>
    </div>

    <!-- 场次选择抽屉 -->
    <BottomSheet :open="sheetOpen" title="选择比赛（未开赛）" @close="sheetOpen = false">
      <input
        v-model="sheetSearch"
        class="input"
        type="search"
        placeholder="搜索球队"
        style="margin-bottom: 10px"
      >
      <div v-if="!candidates.length" class="muted" style="padding: 20px 0; text-align: center">
        没有可选的比赛
      </div>
      <button
        v-for="m in candidates"
        :key="m.espn_event_id"
        type="button"
        class="candidate"
        @click="addLeg(m)"
      >
        <span class="candidate-fixture">{{ m.fixture_zh }}</span>
        <span class="candidate-meta num">{{ m.beijing_date }} {{ m.beijing_time }} · {{ m.stage_zh }}{{ m.group ? ` · ${m.group}组` : "" }}</span>
      </button>
    </BottomSheet>
  </div>
</template>

<style scoped>
h1 {
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 850;
}

.subtitle {
  margin: 6px 0 16px;
  color: var(--muted);
  font-size: 13px;
}

.main-col {
  display: grid;
  gap: 12px;
}

.empty-state {
  display: grid;
  gap: 12px;
  justify-items: center;
  padding: 36px 16px;
  color: var(--muted);
}

.legs-panel {
  padding: 16px;
}

.leg {
  padding-top: 14px;
}

.leg + .leg {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
}

.leg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.leg-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  min-width: 0;
}

.leg-meta {
  margin-top: 4px;
  color: var(--faint);
  font-size: 12px;
}

.dup-tag {
  font-size: 11px;
  color: var(--gold);
  font-weight: 700;
}

.leg-pick-head,
.leg-pick-row {
  display: grid;
  grid-template-columns: 1fr 1fr 76px 72px auto;
  gap: 8px;
  align-items: center;
}

.leg-pick-head {
  margin-top: 12px;
  padding-bottom: 6px;
  color: var(--muted);
  font-size: 14px;
  font-weight: 800;
}

.leg-pick-head span:nth-child(3),
.leg-pick-head span:nth-child(4) {
  text-align: center;
}

.leg-pick-row {
  margin-top: 8px;
}

.leg-pick-row .select,
.leg-pick-row .input {
  font-size: 14px;
}

.leg-pick-row .odds-input,
.leg-pick-row .mult-input {
  min-width: 0;
}

.mult-input {
  text-align: center;
}

@media (max-width: 480px) {
  .leg-pick-head,
  .leg-pick-row {
    grid-template-columns: 1fr 1fr 68px 64px;
  }

  .leg-pick-head span:nth-child(3),
  .leg-pick-head span:nth-child(4) {
    text-align: center;
  }

  .leg-pick-head-action {
    display: none;
  }

  .leg-pick-row .odds-input {
    grid-column: 1 / 2;
  }

  .leg-pick-row .mult-input {
    grid-column: 2 / 3;
  }

  .leg-pick-row .btn {
    grid-column: 3 / 5;
    justify-self: end;
  }
}

.leg-controls {
  margin-top: 10px;
  display: grid;
  grid-template-columns: 1fr 1fr 96px;
  gap: 8px;
}

@media (max-width: 480px) {
  .leg-controls {
    grid-template-columns: 1fr 1fr;
  }

  .leg-controls input {
    grid-column: 1 / 3;
  }
}

.add-more {
  justify-self: start;
}

.size-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.size-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-height: 48px;
  padding: 7px 16px;
  border-radius: var(--radius);
  border: 1px solid var(--line);
  background: var(--bg-soft);
  color: var(--ink);
  font-weight: 800;
  cursor: pointer;
}

.size-pill .combos {
  font-size: 11px;
  font-weight: 600;
  color: var(--faint);
}

.size-pill.active {
  border-color: var(--gold);
  background: var(--gold-dim);
  color: var(--gold);
}

.size-pill.active .combos {
  color: var(--gold-deep);
}

/* 结果面板 */
.result-panel {
  display: grid;
  gap: 12px;
}

.stake-row {
  display: grid;
  gap: 6px;
}

.stake-row label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.stake-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.stake-controls .input {
  width: 88px;
  flex-shrink: 0;
}

.stake-hint {
  margin: 0;
  color: var(--faint);
  font-size: 11px;
  line-height: 1.4;
}

.result-rows {
  display: grid;
  gap: 8px;
}

.result-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--muted);
}

.result-row strong {
  color: var(--ink);
  text-align: right;
}

.payout {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--gold-dim);
  border: 1px solid rgba(233, 187, 79, 0.35);
  display: grid;
  gap: 4px;
}

.payout span {
  color: var(--muted);
  font-size: 12px;
}

.payout strong {
  font-size: 30px;
  line-height: 1.1;
  color: var(--gold);
}

.cap-note {
  color: var(--red);
  font-size: 12px;
}

.save-btn {
  width: 100%;
}

/* 移动端：结果面板排在最上方，随时可见 */
@media (max-width: 1279px) {
  aside {
    order: -1;
  }
}

/* 投注记录 */
.history {
  display: grid;
  gap: 10px;
}

.history-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.win { color: var(--red); font-weight: 800; }
.lose { color: var(--green); font-weight: 800; }

.ticket {
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  padding: 11px 12px;
  display: grid;
  gap: 7px;
  background: var(--bg-soft);
}

.ticket-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.ticket-time {
  color: var(--faint);
  font-size: 12px;
}

.ticket-legs {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 3px;
  font-size: 13px;
  color: var(--muted);
}

.ticket-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--muted);
}

.gold-text {
  color: var(--gold);
}

.ticket-actions {
  display: flex;
  gap: 6px;
}

.muted {
  color: var(--faint);
  font-size: 13px;
}

/* 抽屉里的候选比赛 */
.candidate {
  display: grid;
  gap: 3px;
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  border-bottom: 1px solid var(--line-soft);
  padding: 11px 2px;
  cursor: pointer;
}

.candidate:hover {
  background: var(--panel-2);
}

.candidate-fixture {
  font-weight: 800;
  font-size: 14px;
}

.candidate-meta {
  color: var(--faint);
  font-size: 12px;
}
</style>
