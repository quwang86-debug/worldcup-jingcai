<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import { displayMatch } from "../data/matches.js";
import GroupPill from "./GroupPill.vue";

const props = defineProps({
  match: { type: Object, required: true },
  compact: { type: Boolean, default: true },
});

const router = useRouter();
const m = computed(() => displayMatch(props.match));

function open() {
  router.push(`/match/${props.match.espn_event_id}`);
}

function scoreText(match) {
  if (match.home_score === null || match.away_score === null) return "未赛";
  return `${match.home_score} : ${match.away_score}`;
}
</script>

<template>
  <article class="match-card" :class="{ live: m.status_state === 'in' }" @click="open">
    <div class="time num">{{ m.beijing_time }}</div>

    <div class="status">
      <span v-if="m.status_state === 'in'" class="tag live"><span class="pulse-dot" />进行中</span>
      <span v-else-if="m.status_state === 'post'" class="tag done">已完赛</span>
      <span v-else class="tag">未开赛</span>
    </div>

    <div class="teams">
      <div class="fixture">{{ m.fixture_zh }}</div>
      <div class="meta">
        <GroupPill v-if="m.group" :group="m.group" />
        <span>{{ m.stage_zh }}</span>
        <span class="abbr">{{ m.home_team_abbr }} vs {{ m.away_team_abbr }}</span>
      </div>
    </div>

    <div class="score num" :class="{ pending: m.status_state === 'pre' }">
      {{ scoreText(m) }}
    </div>

    <div class="venue">
      {{ m.venue }}<br>{{ m.city }}, {{ m.country }}
    </div>
  </article>
</template>

<style scoped>
.match-card {
  display: grid;
  grid-template-columns: 64px 1fr 60px;
  gap: 8px 10px;
  align-items: center;
  padding: 12px 14px;
  background: var(--panel);
  border-bottom: 1px solid var(--line-soft);
  cursor: pointer;
  transition: background 0.15s ease;
}

.match-card:hover {
  background: var(--panel-2);
}

.match-card.live {
  box-shadow: inset 3px 0 0 var(--red);
}

.time {
  font-size: 18px;
  font-weight: 850;
  align-self: start;
}

.status {
  grid-column: 1;
  grid-row: 2;
}

.teams {
  grid-column: 2;
  grid-row: 1 / 3;
  min-width: 0;
}

.fixture {
  font-size: 15px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.meta {
  margin-top: 5px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.abbr {
  color: var(--faint);
}

.score {
  grid-column: 3;
  grid-row: 1 / 3;
  justify-self: end;
  font-size: 18px;
  font-weight: 900;
  color: var(--gold);
}

.score.pending {
  color: var(--faint);
  font-size: 13px;
  font-weight: 700;
}

.venue {
  display: none;
  color: var(--faint);
  font-size: 12px;
  line-height: 1.4;
}

/* 桌面端展开为五列行 */
@media (min-width: 900px) {
  .match-card {
    grid-template-columns: 78px 92px minmax(220px, 1fr) 88px minmax(180px, 0.6fr);
  }

  .time {
    font-size: 21px;
    align-self: center;
  }

  .status {
    grid-column: 2;
    grid-row: 1;
  }

  .teams {
    grid-column: 3;
    grid-row: 1;
  }

  .score {
    grid-column: 4;
    grid-row: 1;
    justify-self: center;
    font-size: 21px;
  }

  .venue {
    display: block;
    grid-column: 5;
    grid-row: 1;
  }
}
</style>
