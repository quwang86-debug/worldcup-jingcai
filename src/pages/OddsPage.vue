<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { beijingNow, upcomingMatches } from "../data/matches.js";
import { getOdds, hasRealOdds } from "../data/odds.js";
import { PLAY_TYPES, playTypeById } from "../data/playTypes.js";
import { isSelected, toggleSelection } from "../data/betSlip.js";
import GroupPill from "../components/GroupPill.vue";
import SparkLine from "../components/SparkLine.vue";

const router = useRouter();

const dateFilter = ref("48h");
const playFilter = ref("spf");
const expandedId = ref(null);

const currentPlay = computed(() => playTypeById(playFilter.value));

const rows = computed(() => {
  const now = beijingNow().getTime();
  const horizon = dateFilter.value === "48h" ? 48 : dateFilter.value === "7d" ? 24 * 7 : Infinity;
  return upcomingMatches()
    .filter((m) => (new Date(m.beijing_datetime).getTime() - now) / 3600000 <= horizon)
    .slice(0, 30)
    .map((m) => ({
      match: m,
      odds: getOdds(m),
      options: currentPlay.value.options(m),
    }));
});

/* 异动榜固定看胜平负主胜的变动幅度 */
const realCount = computed(() => rows.value.filter((r) => hasRealOdds(r.match)).length);

const movers = computed(() =>
  [...rows.value]
    .sort((a, b) => Math.abs(b.odds.delta) - Math.abs(a.odds.delta))
    .slice(0, 5)
);

function open(m, tab = "odds") {
  router.push({ path: `/match/${m.espn_event_id}`, query: { tab } });
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

const deltaText = (d) => `${d > 0 ? "▲" : d < 0 ? "▼" : ""}${Math.abs(d).toFixed(2)}`;

function pickOption(match, option) {
  toggleSelection(match, playFilter.value, option.pick, option.odds);
}
</script>

<template>
  <div class="page odds-page">
    <div class="head-row">
      <div>
        <h1>赔率中心</h1>
        <p class="subtitle">
          点选赔率加入方案，同场可多选 · 红涨绿跌
          <span v-if="realCount" class="source-tag">已接入 {{ realCount }} 场体彩官方数据</span>
        </p>
      </div>
      <div class="range-pills">
        <button
          v-for="r in [{ id: '48h', label: '48小时' }, { id: '7d', label: '7天' }, { id: 'all', label: '全部' }]"
          :key="r.id"
          type="button"
          class="range-pill"
          :class="{ active: dateFilter === r.id }"
          @click="dateFilter = r.id"
        >
          {{ r.label }}
        </button>
      </div>
    </div>

    <!-- 玩法切换 -->
    <div class="play-pills">
      <button
        v-for="p in PLAY_TYPES"
        :key="p.id"
        type="button"
        class="range-pill"
        :class="{ active: playFilter === p.id }"
        @click="playFilter = p.id; expandedId = null"
      >
        {{ p.label }}
      </button>
    </div>

    <div class="two-col">
      <section class="panel list">
        <div class="table-head">
          <span>比赛</span>
          <span>{{ currentPlay.label }}</span>
          <span class="center">更新</span>
        </div>

        <div v-if="!rows.length" class="empty">该时间范围内没有未开赛的比赛</div>

        <div v-for="r in rows" :key="r.match.espn_event_id" class="odds-item">
          <div class="odds-row-grid">
            <div class="match-cell" @click="open(r.match)">
              <div class="fixture">{{ r.match.fixture_zh }}</div>
              <div class="meta">
                <GroupPill v-if="r.match.group" :group="r.match.group" />
                <span class="num">{{ r.match.beijing_date }} {{ r.match.beijing_time }}</span>
              </div>
            </div>

            <div class="opts" :class="{ wide: r.options.length > 4 }">
              <div
                v-for="(o, idx) in r.options"
                :key="o.pick"
                class="opt-chip"
                :class="{ selected: isSelected(r.match.espn_event_id, playFilter, o.pick) }"
                @click="pickOption(r.match, o)"
              >
                <span class="opt-label">{{ o.pick }}</span>
                <strong class="num">{{ o.odds.toFixed(2) }}</strong>
                <span
                  v-if="playFilter === 'spf' && idx === 0 && r.odds.delta !== 0"
                  class="delta num"
                  :class="r.odds.delta > 0 ? 'up' : 'down'"
                >
                  {{ deltaText(r.odds.delta) }}
                </span>
              </div>
            </div>

            <div class="updated">
              {{ r.odds.updated }}
              <button
                v-if="playFilter === 'spf'"
                type="button"
                class="trend-toggle"
                @click.stop="toggleExpand(r.match.espn_event_id)"
              >
                走势
              </button>
            </div>
          </div>

          <div v-if="playFilter === 'spf' && expandedId === r.match.espn_event_id" class="expand">
            <SparkLine :points="r.odds.history" :width="280" :height="56" />
            <span class="expand-note">主胜赔率近 24 小时走势（模拟）</span>
          </div>
        </div>
      </section>

      <aside>
        <section class="panel panel-pad">
          <h2 class="section-title">异动榜 · Top 5</h2>
          <p class="muted">按胜平负主胜赔率变动幅度排序，异动常与阵容、资金消息相关。</p>
          <div class="mover-list">
            <button
              v-for="(r, i) in movers"
              :key="r.match.espn_event_id"
              type="button"
              class="mover"
              @click="open(r.match)"
            >
              <span class="mover-rank num">{{ i + 1 }}</span>
              <span class="mover-fixture">{{ r.match.fixture_zh }}</span>
              <span class="mover-delta num" :class="r.odds.delta > 0 ? 'up' : 'down'">
                {{ deltaText(r.odds.delta) }}
              </span>
            </button>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
h1 {
  font-size: clamp(22px, 3vw, 30px);
  font-weight: 850;
}

.subtitle {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.range-pills {
  display: flex;
  gap: 6px;
}

.play-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.range-pill {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--bg-soft);
  color: var(--muted);
  font-weight: 750;
  font-size: 13px;
  cursor: pointer;
}

.range-pill.active {
  border-color: var(--gold);
  background: var(--gold-dim);
  color: var(--gold);
}

.list {
  overflow: hidden;
}

.table-head {
  display: none;
  padding: 11px 16px;
  border-bottom: 1px solid var(--line-soft);
  color: var(--faint);
  font-size: 12px;
  font-weight: 700;
}

.empty {
  padding: 36px 16px;
  text-align: center;
  color: var(--muted);
}

.odds-item {
  border-bottom: 1px solid var(--line-soft);
}

.odds-item:last-child {
  border-bottom: 0;
}

/* 移动端：上下堆叠卡片 */
.odds-row-grid {
  display: grid;
  gap: 9px;
  padding: 13px 14px;
}

.match-cell {
  min-width: 0;
  cursor: pointer;
}

.match-cell:active .fixture {
  color: var(--gold);
}

.fixture {
  font-size: 15px;
  font-weight: 800;
}

.meta {
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--faint);
  font-size: 12px;
}

/* 玩法选项：自适应换行，移动端禁止横向滚动 */
.opts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.opts.wide {
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
}

.opt-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  min-height: 56px;
  background: var(--bg-soft);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  min-width: 0;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.opt-chip:active {
  transform: scale(0.97);
}

.opt-chip.selected {
  border-color: var(--gold);
  background: var(--gold-dim);
}

.opt-chip.selected .opt-label {
  color: var(--gold);
}

.opt-chip.selected strong {
  color: var(--gold);
}

.opt-label {
  color: var(--muted);
  font-size: 11px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt-chip strong {
  font-size: 16px;
  line-height: 1.1;
}

.delta {
  padding: 1px 2px;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
}

.trend-toggle {
  background: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  color: var(--muted);
  font-size: 11px;
  padding: 3px 9px;
  cursor: pointer;
}

.trend-toggle:hover {
  border-color: var(--gold);
  color: var(--gold);
}

.up { color: var(--red); }
.down { color: var(--green); }

.updated {
  color: var(--faint);
  font-size: 11px;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* 桌面端：三栏行布局 */
@media (min-width: 900px) {
  .table-head {
    display: grid;
    grid-template-columns: minmax(210px, 0.8fr) minmax(0, 2fr) 80px;
    gap: 12px;
  }

  .odds-row-grid {
    grid-template-columns: minmax(210px, 0.8fr) minmax(0, 2fr) 80px;
    gap: 12px;
    align-items: center;
  }

  .center {
    text-align: center;
  }

  .updated {
    justify-content: center;
    font-size: 12px;
    flex-direction: column;
    gap: 4px;
  }
}

.expand {
  padding: 4px 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.expand-note {
  color: var(--faint);
  font-size: 12px;
}

.muted {
  color: var(--faint);
  font-size: 12px;
  margin-bottom: 10px;
}

.mover-list {
  display: grid;
  gap: 6px;
}

.mover {
  display: grid;
  grid-template-columns: 26px 1fr auto;
  gap: 8px;
  align-items: center;
  width: 100%;
  text-align: left;
  background: var(--bg-soft);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  padding: 10px 12px;
  cursor: pointer;
}

.mover:hover {
  background: var(--panel-2);
}

.mover-rank {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background: var(--gold-dim);
  color: var(--gold);
  font-weight: 900;
  font-size: 13px;
}

.mover-fixture {
  font-size: 13px;
  font-weight: 750;
  min-width: 0;
}

.mover-delta {
  font-weight: 800;
  font-size: 13px;
}

.source-tag {
  margin-left: 6px;
  color: var(--green);
  font-weight: 700;
}
</style>
