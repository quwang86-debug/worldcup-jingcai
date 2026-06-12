<script setup>
import { computed, reactive } from "vue";
import {
  GROUPS,
  STAGE_ORDER,
  beijingDateKey,
  matches,
  nextMatch,
} from "../data/matches.js";
import MatchCard from "../components/MatchCard.vue";
import StatTile from "../components/StatTile.vue";
import CountdownTimer from "../components/CountdownTimer.vue";

const filters = reactive({ search: "", stage: "全部", group: "全部" });

const stages = STAGE_ORDER.filter((s) => matches.some((m) => m.stage_zh === s));

function onGroupChange() {
  if (filters.group !== "全部") filters.stage = "小组赛";
}

function reset() {
  filters.search = "";
  filters.stage = "全部";
  filters.group = "全部";
}

function searchText(m) {
  return [m.fixture_zh, m.fixture, m.home_team_abbr, m.away_team_abbr, m.city, m.country, m.venue, m.stage_zh, m.group]
    .join(" ")
    .toLowerCase();
}

const filtered = computed(() => {
  const q = filters.search.trim().toLowerCase();
  return matches.filter((m) => {
    const stageOk = filters.stage === "全部" || m.stage_zh === filters.stage;
    const groupOk = filters.group === "全部" || m.group === filters.group;
    return stageOk && groupOk && (!q || searchText(m).includes(q));
  });
});

const grouped = computed(() => {
  const map = new Map();
  for (const m of filtered.value) {
    const key = `${m.beijing_date} ${m.beijing_weekday}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  }
  return [...map.entries()];
});

const total = matches.length;
const finished = computed(() => matches.filter((m) => m.status_state === "post").length);
const todayCount = computed(() => {
  const today = beijingDateKey();
  return matches.filter((m) => m.beijing_date === today).length;
});
const doneWidth = computed(() => (total ? (finished.value / total) * 100 : 0));

const spotlight = nextMatch();

const stageCounts = computed(() => {
  const counts = {};
  for (const m of matches) counts[m.stage_zh] = (counts[m.stage_zh] || 0) + 1;
  return counts;
});

const groupCounts = computed(() => {
  const counts = {};
  for (const m of matches) {
    if (m.stage_zh === "小组赛" && m.group) counts[m.group] = (counts[m.group] || 0) + 1;
  }
  return counts;
});

const maxStage = computed(() => Math.max(...Object.values(stageCounts.value)));
</script>

<template>
  <div class="page">
    <div class="hero">
      <div>
        <h1>2026世界杯赛程</h1>
        <p class="subtitle">全部时间为北京时间 · 点击比赛查看详情、赔率与 AI 分析</p>
      </div>
    </div>

    <!-- 下一场聚焦 -->
    <section class="panel panel-pad spotlight">
      <div class="spotlight-main">
        <span class="tag gold">下一场比赛</span>
        <div class="spotlight-fixture">{{ spotlight.fixture_zh }}</div>
        <div class="spotlight-meta">
          {{ spotlight.beijing_date }} {{ spotlight.beijing_weekday }} {{ spotlight.beijing_time }}
          · {{ spotlight.stage_zh }}<template v-if="spotlight.group"> · {{ spotlight.group }}组</template>
          · {{ spotlight.city }}
        </div>
      </div>
      <div class="spotlight-side">
        <CountdownTimer class="spotlight-countdown" :target="spotlight.beijing_datetime" />
        <div class="meter">
          <div class="meter-track">
            <span :style="{ width: doneWidth + '%' }" />
          </div>
          <div class="meter-labels num">
            <span>已完赛 {{ finished }}</span>
            <span>未开赛 {{ total - finished }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 移动端横滑统计条 -->
    <div class="stat-strip">
      <StatTile :value="total" label="总场次" />
      <StatTile :value="finished" label="已完赛" tone="green" />
      <StatTile :value="total - finished" label="未开赛" />
      <StatTile :value="todayCount" label="今日比赛" tone="gold" />
    </div>

    <div class="two-col">
      <section>
        <!-- 筛选 -->
        <form class="filters panel panel-pad" @submit.prevent>
          <div class="field">
            <label for="search">搜索球队 / 城市 / 场馆</label>
            <input id="search" v-model="filters.search" class="input" type="search" placeholder="例如：阿根廷、达拉斯">
          </div>
          <div class="field">
            <label for="stage">阶段</label>
            <select id="stage" v-model="filters.stage" class="select">
              <option value="全部">全部阶段</option>
              <option v-for="s in stages" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="field">
            <label for="group">小组</label>
            <select id="group" v-model="filters.group" class="select" @change="onGroupChange">
              <option value="全部">全部小组</option>
              <option v-for="g in GROUPS" :key="g" :value="g">{{ g }}组</option>
            </select>
          </div>
          <button class="btn" type="button" @click="reset">重置</button>
        </form>

        <!-- 列表 -->
        <section class="panel list">
          <div class="list-head">
            <strong>赛程列表</strong>
            <span class="num">{{ filtered.length }} 场</span>
          </div>
          <div v-if="!grouped.length" class="empty">没有匹配的比赛</div>
          <section v-for="[date, dayMatches] in grouped" :key="date" class="day-group">
            <div class="day-title">
              <span>{{ date }}</span>
              <span class="num">{{ dayMatches.length }} 场</span>
            </div>
            <MatchCard v-for="m in dayMatches" :key="m.espn_event_id" :match="m" />
          </section>
        </section>
      </section>

      <!-- 侧栏（桌面端） -->
      <aside class="sidebar">
        <section class="panel panel-pad">
          <h2 class="section-title">概览</h2>
          <div class="stat-grid">
            <StatTile :value="total" label="总场次" />
            <StatTile :value="finished" label="已完赛" tone="green" />
            <StatTile :value="total - finished" label="未开赛" />
            <StatTile :value="todayCount" label="今日比赛" tone="gold" />
          </div>
        </section>

        <section class="panel panel-pad">
          <h2 class="section-title">阶段分布</h2>
          <div class="bars">
            <div v-for="s in stages" :key="s" class="bar">
              <span>{{ s }}</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: ((stageCounts[s] || 0) / maxStage) * 100 + '%' }" />
              </div>
              <strong class="num">{{ stageCounts[s] || 0 }}</strong>
            </div>
          </div>
        </section>

        <section class="panel panel-pad">
          <h2 class="section-title">小组赛分布</h2>
          <div class="bars">
            <div v-for="g in GROUPS" :key="g" class="bar">
              <span>{{ g }}组</span>
              <div class="bar-track">
                <div class="bar-fill" :style="{ width: ((groupCounts[g] || 0) / 6) * 100 + '%' }" />
              </div>
              <strong class="num">{{ groupCounts[g] || 0 }}</strong>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.hero {
  margin-bottom: 14px;
}

h1 {
  font-size: clamp(22px, 3vw, 34px);
  font-weight: 850;
  line-height: 1.1;
}

.subtitle {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.spotlight {
  display: grid;
  gap: 14px;
  margin-bottom: 14px;
}

.spotlight-fixture {
  margin-top: 10px;
  font-size: clamp(19px, 2.4vw, 28px);
  font-weight: 850;
  line-height: 1.2;
}

.spotlight-meta {
  margin-top: 6px;
  color: var(--muted);
  font-size: 13px;
}

.spotlight-side {
  display: grid;
  gap: 10px;
  align-content: start;
}

.spotlight-countdown {
  font-size: 22px;
}

.meter-track {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--bg-soft);
}

.meter-track span {
  display: block;
  height: 100%;
  background: var(--gold);
}

.meter-labels {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 12px;
}

@media (min-width: 768px) {
  .spotlight {
    grid-template-columns: 1fr 280px;
    align-items: center;
  }
}

/* 移动端横滑统计条 */
.stat-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(116px, 1fr);
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 14px;
  padding-bottom: 4px;
}

@media (min-width: 1280px) {
  .stat-strip {
    display: none;
  }
}

.sidebar {
  display: none;
}

@media (min-width: 1280px) {
  .sidebar {
    display: grid;
    gap: 14px;
  }
}

.filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 14px;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.field label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

@media (min-width: 768px) {
  .filters {
    grid-template-columns: minmax(190px, 1.3fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) auto;
    align-items: end;
  }
}

.list {
  overflow: hidden;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 16px;
  border-bottom: 1px solid var(--line-soft);
}

.list-head span {
  color: var(--muted);
  font-size: 13px;
}

.day-title {
  display: flex;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--panel-2);
  color: var(--gold);
  font-weight: 800;
  font-size: 13px;
  border-bottom: 1px solid var(--line-soft);
}

.empty {
  padding: 36px 16px;
  text-align: center;
  color: var(--muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.bars {
  display: grid;
  gap: 9px;
}

.bar {
  display: grid;
  grid-template-columns: 70px 1fr 28px;
  gap: 8px;
  align-items: center;
  color: var(--muted);
  font-size: 12px;
}

.bar-track {
  height: 7px;
  background: var(--bg-soft);
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 999px;
}
</style>
