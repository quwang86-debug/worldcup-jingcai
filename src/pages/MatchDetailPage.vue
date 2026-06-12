<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { marked } from "marked";
import { groupStandings, matchById, teamPlayed } from "../data/matches.js";
import { getOdds, hasRealOdds } from "../data/odds.js";
import { PLAY_TYPES } from "../data/playTypes.js";
import { addMatchDefault, isSelected, legFor, toggleSelection } from "../data/betSlip.js";
import { getReport } from "../mocks/reports.js";
import GroupPill from "../components/GroupPill.vue";
import CountdownTimer from "../components/CountdownTimer.vue";
import OddsBadge from "../components/OddsBadge.vue";
import SparkLine from "../components/SparkLine.vue";

const route = useRoute();
const router = useRouter();

const match = computed(() => matchById(route.params.id));

const TABS = [
  { id: "overview", label: "概览" },
  { id: "odds", label: "赔率" },
  { id: "ai", label: "AI 分析" },
];
const tab = ref(TABS.some((t) => t.id === route.query.tab) ? route.query.tab : "overview");

watch(
  () => route.query.tab,
  (next) => {
    if (TABS.some((t) => t.id === next)) tab.value = next;
  }
);

const odds = computed(() => (match.value ? getOdds(match.value) : null));

/* 让球 / 比分 / 总进球数 / 半全场（胜平负单独成块展示涨跌与走势） */
const extraPlays = computed(() => {
  if (!match.value) return [];
  return PLAY_TYPES.filter((p) => p.id !== "spf").map((p) => ({
    id: p.id,
    label: p.label,
    options: p.options(match.value),
  }));
});

const canPick = computed(() => match.value?.status_state === "pre");
const inSlip = computed(() => Boolean(match.value && legFor(match.value.espn_event_id)));

function toggle(playId, pick, oddsValue) {
  if (!canPick.value) return;
  toggleSelection(match.value, playId, pick, oddsValue);
}

function sel(playId, pick) {
  return match.value ? isSelected(match.value.espn_event_id, playId, pick) : false;
}
const report = computed(() => (match.value ? getReport(match.value) : null));
const reportHtml = computed(() => (report.value ? marked.parse(report.value.markdown) : ""));

const homeHistory = computed(() => (match.value ? teamPlayed(match.value.home_team_zh) : []));
const awayHistory = computed(() => (match.value ? teamPlayed(match.value.away_team_zh) : []));
const standings = computed(() => (match.value?.group ? groupStandings(match.value.group) : []));

function resultFor(team, m) {
  if (m.result === "draw") return "平";
  const won = (m.result === "home_win" && m.home_team_zh === team) || (m.result === "away_win" && m.away_team_zh === team);
  return won ? "胜" : "负";
}

function addToCalculator() {
  addMatchDefault(match.value);
  router.push("/calculator");
}
</script>

<template>
  <div class="page detail-page">
    <template v-if="match">
      <!-- 对阵头部 -->
      <section class="panel head">
        <div class="head-tags">
          <GroupPill v-if="match.group" :group="match.group" />
          <span class="tag">{{ match.stage_zh }}</span>
          <span v-if="match.status_state === 'in'" class="tag live"><span class="pulse-dot" />进行中</span>
          <span v-else-if="match.status_state === 'post'" class="tag done">已完赛</span>
        </div>

        <div class="versus">
          <div class="team">{{ match.home_team_zh }}</div>
          <div class="center">
            <div v-if="match.status_state !== 'pre'" class="big-score num">
              {{ match.home_score }} : {{ match.away_score }}
            </div>
            <template v-else>
              <div class="kickoff num">{{ match.beijing_time }}</div>
              <CountdownTimer :target="match.beijing_datetime" />
            </template>
          </div>
          <div class="team">{{ match.away_team_zh }}</div>
        </div>

        <p class="head-meta">
          {{ match.beijing_date }} {{ match.beijing_weekday }} · {{ match.venue }} · {{ match.city }}, {{ match.country }}
        </p>
      </section>

      <!-- Tab 切换 -->
      <nav class="tabs">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          class="tab-btn"
          :class="{ active: tab === t.id }"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </nav>

      <!-- 概览 -->
      <section v-if="tab === 'overview'" class="tab-body">
        <div class="overview-grid">
          <div class="panel panel-pad">
            <h2 class="section-title">{{ match.home_team_zh }} · 本届已赛</h2>
            <ul v-if="homeHistory.length" class="played">
              <li v-for="m in homeHistory" :key="m.espn_event_id">
                <span class="tag" :class="{ done: resultFor(match.home_team_zh, m) === '胜' }">{{ resultFor(match.home_team_zh, m) }}</span>
                <span class="played-fixture">{{ m.fixture_zh }}</span>
                <strong class="num">{{ m.home_score }}:{{ m.away_score }}</strong>
              </li>
            </ul>
            <p v-else class="muted">本届尚无完赛记录</p>
          </div>

          <div class="panel panel-pad">
            <h2 class="section-title">{{ match.away_team_zh }} · 本届已赛</h2>
            <ul v-if="awayHistory.length" class="played">
              <li v-for="m in awayHistory" :key="m.espn_event_id">
                <span class="tag" :class="{ done: resultFor(match.away_team_zh, m) === '胜' }">{{ resultFor(match.away_team_zh, m) }}</span>
                <span class="played-fixture">{{ m.fixture_zh }}</span>
                <strong class="num">{{ m.home_score }}:{{ m.away_score }}</strong>
              </li>
            </ul>
            <p v-else class="muted">本届尚无完赛记录</p>
          </div>
        </div>

        <div v-if="standings.length" class="panel panel-pad standings">
          <h2 class="section-title">{{ match.group }}组积分榜</h2>
          <div class="standings-table">
            <div class="standings-row head-row">
              <span>球队</span><span class="num">赛</span><span class="num">胜</span><span class="num">平</span><span class="num">负</span><span class="num">净胜</span><span class="num">积分</span>
            </div>
            <div
              v-for="(r, i) in standings"
              :key="r.team"
              class="standings-row"
              :class="{ qualify: i < 2, highlight: r.team === match.home_team_zh || r.team === match.away_team_zh }"
            >
              <span class="team-name">{{ i + 1 }}. {{ r.team }}</span>
              <span class="num">{{ r.played }}</span>
              <span class="num">{{ r.win }}</span>
              <span class="num">{{ r.draw }}</span>
              <span class="num">{{ r.loss }}</span>
              <span class="num">{{ r.gf - r.ga > 0 ? "+" : "" }}{{ r.gf - r.ga }}</span>
              <span class="num pts">{{ r.pts }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 赔率（mock） -->
      <section v-else-if="tab === 'odds'" class="tab-body">
        <div class="panel panel-pad">
          <div class="odds-head">
            <h2 class="section-title">胜平负</h2>
            <span class="muted">
              更新于 {{ odds.updated }}
              · {{ hasRealOdds(match) ? "体彩官方" : "模拟数据" }}
            </span>
          </div>
          <p v-if="canPick" class="pick-hint">点选赔率即可加入下注方案</p>
          <div class="odds-row">
            <OddsBadge
              :value="odds.home"
              :delta="odds.delta"
              :label="`主胜 ${match.home_team_zh}`"
              :selectable="canPick"
              :selected="sel('spf', '主胜')"
              @pick="toggle('spf', '主胜', odds.home)"
            />
            <OddsBadge
              :value="odds.draw"
              label="平局"
              :selectable="canPick"
              :selected="sel('spf', '平局')"
              @pick="toggle('spf', '平局', odds.draw)"
            />
            <OddsBadge
              :value="odds.away"
              :label="`客胜 ${match.away_team_zh}`"
              :selectable="canPick"
              :selected="sel('spf', '客胜')"
              @pick="toggle('spf', '客胜', odds.away)"
            />
          </div>
        </div>

        <div v-for="play in extraPlays" :key="play.id" class="panel panel-pad">
          <h2 class="section-title">{{ play.label }}</h2>
          <div class="chip-grid">
            <div
              v-for="o in play.options"
              :key="o.pick"
              class="opt-chip"
              :class="{ selected: sel(play.id, o.pick), tappable: canPick }"
              @click="toggle(play.id, o.pick, o.odds)"
            >
              <span class="opt-label">{{ o.pick }}</span>
              <strong class="num">{{ o.odds.toFixed(2) }}</strong>
            </div>
          </div>
        </div>

        <div class="panel panel-pad">
          <h2 class="section-title">主胜赔率走势（近 24 小时）</h2>
          <SparkLine :points="odds.history" :width="320" :height="72" />
          <p class="muted spark-note">
            {{ odds.delta > 0 ? "赔率上升：市场对主队信心减弱" : odds.delta < 0 ? "赔率下降：资金流向主队" : "赔率平稳" }}
            （变动 {{ odds.delta > 0 ? "+" : "" }}{{ odds.delta }}）
          </p>
        </div>
      </section>

      <!-- AI 分析（mock） -->
      <section v-else class="tab-body">
        <div class="panel panel-pad report">
          <div class="report-head">
            <span class="tag gold">信心等级：{{ report.confidence }}</span>
            <span class="muted">模拟报告 · 正式版由 LLM 管道生成</span>
          </div>
          <article class="report-body" v-html="reportHtml" />
        </div>
      </section>

      <!-- 底部固定操作条（已入单后由全局方案栏接管） -->
      <div v-if="canPick && !inSlip" class="action-bar">
        <button class="btn btn-gold action-btn" type="button" @click="addToCalculator">
          加入串关计算器
        </button>
      </div>
    </template>

    <div v-else class="panel panel-pad">
      <p>没有找到这场比赛。</p>
      <router-link to="/" class="btn" style="margin-top: 12px">返回赛程</router-link>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  width: min(900px, 100%);
}

.head {
  padding: 18px 16px;
  text-align: center;
}

.head-tags {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.versus {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 10px;
  align-items: center;
}

.team {
  font-size: clamp(17px, 2.4vw, 24px);
  font-weight: 850;
  overflow-wrap: anywhere;
}

.center {
  display: grid;
  gap: 4px;
  justify-items: center;
  min-width: 110px;
}

.big-score {
  font-size: clamp(34px, 6vw, 52px);
  font-weight: 900;
  color: var(--gold);
  line-height: 1;
}

.kickoff {
  font-size: clamp(26px, 5vw, 38px);
  font-weight: 900;
  line-height: 1;
}

.head-meta {
  margin-top: 14px;
  color: var(--muted);
  font-size: 13px;
}

.tabs {
  display: flex;
  gap: 2px;
  margin: 16px 0 14px;
  border-bottom: 1px solid var(--line-soft);
}

.tab-btn {
  background: none;
  border: 0;
  padding: 10px 16px;
  color: var(--muted);
  font-weight: 750;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}

.tab-btn.active {
  color: var(--gold);
  border-bottom-color: var(--gold);
}

.tab-body {
  display: grid;
  gap: 14px;
}

.overview-grid {
  display: grid;
  gap: 14px;
}

@media (min-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.played {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 8px;
}

.played li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.played-fixture {
  flex: 1;
  min-width: 0;
  color: var(--muted);
}

.muted {
  color: var(--faint);
  font-size: 13px;
}

.standings-table {
  display: grid;
  gap: 2px;
}

.standings-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 30px 30px 30px 30px 44px 40px;
  gap: 4px;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 13px;
}

.standings-row > .num {
  text-align: center;
}

.head-row {
  color: var(--faint);
  font-size: 12px;
}

.standings-row.qualify {
  background: var(--bg-soft);
}

.standings-row.highlight {
  background: var(--gold-dim);
}

.standings-row .pts {
  font-weight: 900;
  color: var(--gold);
}

.odds-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.odds-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 8px;
}

.spark-note {
  margin-top: 8px;
}

.pick-hint {
  margin: 6px 0 0;
  color: var(--gold);
  font-size: 12px;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.opt-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 9px 4px;
  min-height: 56px;
  background: var(--bg-soft);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  min-width: 0;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.12s ease, background 0.12s ease;
}

.opt-chip.tappable {
  cursor: pointer;
}

.opt-chip.tappable:active {
  transform: scale(0.97);
}

.opt-chip.selected {
  border-color: var(--gold);
  background: var(--gold-dim);
}

.opt-chip.selected .opt-label,
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

.report-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.report-body :deep(h2) {
  font-size: 19px;
  margin: 14px 0 8px;
}

.report-body :deep(h3) {
  font-size: 15px;
  margin: 16px 0 6px;
  color: var(--gold);
}

.report-body :deep(p),
.report-body :deep(li) {
  color: var(--ink);
  font-size: 14px;
  line-height: 1.7;
}

.report-body :deep(blockquote) {
  margin: 14px 0 0;
  padding: 10px 14px;
  border-left: 3px solid var(--gold);
  background: var(--bg-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
  color: var(--muted);
  font-size: 13px;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(var(--tab-h) + env(safe-area-inset-bottom));
  padding: 10px 16px;
  background: rgba(13, 22, 38, 0.94);
  backdrop-filter: blur(10px);
  border-top: 1px solid var(--line-soft);
  display: flex;
  justify-content: center;
  z-index: 30;
}

.action-btn {
  width: min(420px, 100%);
}

@media (min-width: 768px) {
  .action-bar {
    bottom: 0;
  }
}
</style>
