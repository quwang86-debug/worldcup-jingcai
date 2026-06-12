/**
 * 竞彩真实赔率读取层。数据由 scripts/fetch_odds.mjs 写入 data/worldcup_2026_odds.json。
 * 未匹配到真实数据时回退到确定性 mock（标注 source: mock）。
 */
import oddsBundle from "../../data/worldcup_2026_odds.json";
import { mockGetHandicapOdds, mockGetOdds, mockPlayOptions } from "../mocks/odds.mock.js";

const byEspnId = new Map(
  oddsBundle.matches
    .filter((m) => m.espn_event_id)
    .map((m) => [String(m.espn_event_id), m])
);

const byTeams = new Map(
  oddsBundle.matches.map((m) => [`${m.home_zh}|${m.away_zh}|${m.beijing_date}|${m.beijing_time}`, m])
);

export const oddsFetchedAt = oddsBundle.fetched_at;
export const oddsSource = oddsBundle.source;

function entryFor(match) {
  if (!match) return null;
  const byId = byEspnId.get(String(match.espn_event_id));
  if (byId) return byId;
  const key = `${match.home_team_zh}|${match.away_team_zh}|${match.beijing_date}|${match.beijing_time}`;
  return byTeams.get(key) ?? null;
}

function formatUpdated(updatedAt) {
  if (!updatedAt) return "刚刚";
  const diff = Date.now() - new Date(updatedAt.replace(" ", "T")).getTime();
  if (diff < 0) return updatedAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return updatedAt;
}

export function hasRealOdds(match) {
  return Boolean(entryFor(match)?.spf);
}

export function getOdds(match) {
  const entry = entryFor(match);
  if (entry?.spf) {
    return {
      home: entry.spf.home,
      draw: entry.spf.draw,
      away: entry.spf.away,
      delta: entry.spf.delta ?? 0,
      history: entry.spf.history ?? [entry.spf.home],
      updated: formatUpdated(entry.spf.updated_at ?? entry.updated_at),
      source: "sporttery",
    };
  }
  return mockGetOdds(match);
}

export function getHandicapOdds(match) {
  const entry = entryFor(match);
  if (entry?.rqspf) {
    const line = entry.rqspf.line ?? 0;
    return {
      line,
      home: entry.rqspf.home,
      draw: entry.rqspf.draw,
      away: entry.rqspf.away,
      source: "sporttery",
    };
  }
  return mockGetHandicapOdds(match);
}

/** 返回某玩法的选项列表；无真实数据时回退 mock */
export function getPlayOptions(match, playId) {
  const entry = entryFor(match);
  const map = {
    spf: () =>
      entry?.spf
        ? [
            { pick: "主胜", odds: entry.spf.home },
            { pick: "平局", odds: entry.spf.draw },
            { pick: "客胜", odds: entry.spf.away },
          ]
        : null,
    rqspf: () => {
      if (!entry?.rqspf) return null;
      const line = entry.rqspf.line ?? 0;
      const sign = line > 0 ? `+${line}` : `${line}`;
      return [
        { pick: `让球主胜(${sign})`, odds: entry.rqspf.home },
        { pick: `让球平(${sign})`, odds: entry.rqspf.draw },
        { pick: `让球客胜(${sign})`, odds: entry.rqspf.away },
      ];
    },
    bf: () => entry?.bf ?? null,
    jqs: () => entry?.jqs ?? null,
    bqc: () => entry?.bqc ?? null,
  };
  const real = map[playId]?.();
  if (real?.length) return real.map((o) => ({ pick: o.pick, odds: o.odds }));
  return mockPlayOptions(match, playId);
}
