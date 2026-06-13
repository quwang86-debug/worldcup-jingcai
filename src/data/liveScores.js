/**
 * 浏览器端拉取 ESPN 比分，合并到静态赛程 JSON，解决部署后完赛状态不更新。
 */
import { reactive } from "vue";

const API =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260720&limit=200";

const STATUS_ZH = { pre: "未开赛", in: "进行中", post: "已完赛" };

/** espn_event_id → 最新 status / 比分 */
export const liveById = reactive(new Map());

let inflight = null;

function localizeStatus(state) {
  return STATUS_ZH[state] ?? state ?? "";
}

function patchFromEvent(event) {
  const comp = event.competitions?.[0];
  if (!comp) return;
  const status = comp.status?.type ?? {};
  const state = status.state ?? "pre";
  const isPre = state === "pre";
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  const homeScore = isPre ? null : Number(home?.score ?? 0);
  const awayScore = isPre ? null : Number(away?.score ?? 0);
  let result = null;
  if (!isPre && Number.isFinite(homeScore) && Number.isFinite(awayScore)) {
    result = homeScore > awayScore ? "home_win" : homeScore < awayScore ? "away_win" : "draw";
  }
  liveById.set(String(event.id), {
    status_state: state,
    status_zh: localizeStatus(state),
    status_detail: status.detail ?? status.shortDetail ?? null,
    home_score: homeScore,
    away_score: awayScore,
    result,
  });
}

export async function refreshLiveScores() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(API, { headers: { accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();
      for (const event of data.events ?? []) patchFromEvent(event);
    } catch {
      /* 静态数据兜底 */
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function mergeLiveMatch(match) {
  const live = liveById.get(String(match.espn_event_id));
  if (!live) return match;
  return { ...match, ...live };
}
