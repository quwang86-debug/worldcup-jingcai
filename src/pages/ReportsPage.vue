<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { upcomingMatches } from "../data/matches.js";
import { getReport } from "../mocks/reports.js";
import GroupPill from "../components/GroupPill.vue";

const router = useRouter();

const stageFilter = ref("全部");
const STAGE_PILLS = ["全部", "小组赛", "淘汰赛"];

const cards = computed(() =>
  upcomingMatches()
    .filter((m) => {
      if (stageFilter.value === "全部") return true;
      if (stageFilter.value === "小组赛") return m.stage_zh === "小组赛";
      return m.stage_zh !== "小组赛";
    })
    .slice(0, 12)
    .map((m) => ({ match: m, report: getReport(m) }))
);

function open(m) {
  router.push({ path: `/match/${m.espn_event_id}`, query: { tab: "ai" } });
}

const confidenceTone = (c) => (c === "高" ? "done" : c === "中" ? "gold" : "");
</script>

<template>
  <div class="page reports-page">
    <div class="head-row">
      <div>
        <h1>AI 赛前分析</h1>
        <p class="subtitle">模拟报告演示 · 正式版由 GitHub Actions 调用 LLM 在赛前 24 小时自动生成</p>
      </div>
      <div class="range-pills">
        <button
          v-for="s in STAGE_PILLS"
          :key="s"
          type="button"
          class="range-pill"
          :class="{ active: stageFilter === s }"
          @click="stageFilter = s"
        >
          {{ s }}
        </button>
      </div>
    </div>

    <div v-if="!cards.length" class="panel panel-pad empty">该阶段暂无待分析的比赛</div>

    <div class="card-grid">
      <article v-for="c in cards" :key="c.match.espn_event_id" class="panel report-card" @click="open(c.match)">
        <div class="card-top">
          <div class="card-tags">
            <GroupPill v-if="c.match.group" :group="c.match.group" />
            <span class="tag">{{ c.match.stage_zh }}</span>
          </div>
          <span class="tag" :class="confidenceTone(c.report.confidence)">信心 {{ c.report.confidence }}</span>
        </div>

        <h2 class="card-title">{{ c.match.fixture_zh }}</h2>
        <div class="card-time num">{{ c.match.beijing_date }} {{ c.match.beijing_weekday }} {{ c.match.beijing_time }}</div>

        <ul class="summary">
          <li v-for="(s, i) in c.report.summary" :key="i">{{ s }}</li>
        </ul>

        <span class="read-more">查看完整分析</span>
      </article>
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
  margin-bottom: 16px;
}

.range-pills {
  display: flex;
  gap: 6px;
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

.empty {
  text-align: center;
  color: var(--muted);
}

.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.report-card {
  padding: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.report-card:hover {
  background: var(--panel-2);
  border-color: var(--line);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-tags {
  display: flex;
  gap: 6px;
}

.card-title {
  font-size: 17px;
  font-weight: 850;
  line-height: 1.25;
}

.card-time {
  color: var(--faint);
  font-size: 12px;
}

.summary {
  list-style: none;
  margin: 4px 0 0;
  padding: 0;
  display: grid;
  gap: 6px;
  flex: 1;
}

.summary li {
  position: relative;
  padding-left: 14px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.summary li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--gold);
}

.read-more {
  margin-top: 6px;
  color: var(--gold);
  font-size: 13px;
  font-weight: 750;
}
</style>
