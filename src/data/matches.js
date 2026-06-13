import schedule from "../../data/worldcup_2026_matches_beijing.json";
import { mergeLiveMatch } from "./liveScores.js";

export const matches = schedule.matches;
export const fetchedAt = schedule.fetched_at;

export const STAGE_ORDER = ["小组赛", "1/16决赛", "1/8决赛", "1/4决赛", "半决赛", "三四名决赛", "决赛"];
export const GROUPS = "ABCDEFGHIJKL".split("");

/** 合并 ESPN 实时比分后的场次（用于展示） */
export function displayMatch(match) {
  return mergeLiveMatch(match);
}

export function matchById(id) {
  const m = matches.find((m) => String(m.espn_event_id) === String(id));
  return m ? displayMatch(m) : null;
}

export function beijingNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

export function beijingDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function upcomingMatches() {
  const now = beijingNow();
  return matches
    .filter((m) => {
      const d = displayMatch(m);
      return d.status_state === "pre" && new Date(d.beijing_datetime) >= now;
    })
    .map(displayMatch);
}

export function nextMatch() {
  return upcomingMatches()[0] ?? displayMatch(matches[matches.length - 1]);
}

/** 某支球队本届已赛场次（含进行中） */
export function teamPlayed(teamZh) {
  return matches
    .map(displayMatch)
    .filter(
      (m) => m.status_state !== "pre" && (m.home_team_zh === teamZh || m.away_team_zh === teamZh)
    );
}

/** 小组积分榜：从已完赛的小组赛比分实时计算 */
export function groupStandings(group) {
  const groupMatches = matches.map(displayMatch).filter((m) => m.group === group);
  const table = new Map();

  for (const m of groupMatches) {
    for (const team of [m.home_team_zh, m.away_team_zh]) {
      if (!table.has(team)) {
        table.set(team, { team, played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, pts: 0 });
      }
    }
    if (m.status_state !== "post") continue;

    const home = table.get(m.home_team_zh);
    const away = table.get(m.away_team_zh);
    home.played++; away.played++;
    home.gf += m.home_score; home.ga += m.away_score;
    away.gf += m.away_score; away.ga += m.home_score;
    if (m.result === "home_win") { home.win++; home.pts += 3; away.loss++; }
    else if (m.result === "away_win") { away.win++; away.pts += 3; home.loss++; }
    else { home.draw++; away.draw++; home.pts++; away.pts++; }
  }

  return [...table.values()].sort(
    (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  );
}
