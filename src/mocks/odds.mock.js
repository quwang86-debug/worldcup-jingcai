/**
 * 确定性 mock 赔率（仅在无真实体彩数据时作为回退）。
 */

function hash(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let s = hash(seed) || 1;
  return () => {
    s = (Math.imul(s, 48271) % 2147483647) >>> 0;
    return s / 2147483647;
  };
}

const round2 = (v) => Math.round(v * 100) / 100;

export function mockGetOdds(match) {
  const rand = rng(match.espn_event_id);
  const bias = rand() * 1.6 - 0.8;
  const home = round2(Math.max(1.18, 2.3 + bias + rand() * 0.7));
  const away = round2(Math.max(1.22, 2.3 - bias + rand() * 0.7));
  const draw = round2(2.9 + rand() * 0.9);
  const delta = round2((rand() - 0.5) * 0.36);
  const history = [];
  let v = home - delta;
  for (let i = 0; i < 6; i++) {
    history.push(round2(v));
    v += delta / 5 + (rand() - 0.5) * 0.05;
  }
  history[5] = home;
  const minutes = 5 + Math.floor(rand() * 50);
  return {
    home,
    draw,
    away,
    delta,
    history,
    updated: `${minutes}分钟前`,
    source: "mock",
  };
}

export function mockGetHandicapOdds(match) {
  const base = mockGetOdds(match);
  const line = base.home < base.away ? -1 : +1;
  return {
    line,
    home: round2(base.home + line * 0.85),
    draw: round2(base.draw + 0.4),
    away: round2(Math.max(1.15, base.away - line * 0.75)),
    source: "mock",
  };
}

export function mockPlayOptions(match, playId) {
  const o = mockGetOdds(match);
  const h = mockGetHandicapOdds(match);
  switch (playId) {
    case "spf":
      return [
        { pick: "主胜", odds: o.home },
        { pick: "平局", odds: o.draw },
        { pick: "客胜", odds: o.away },
      ];
    case "rqspf": {
      const sign = h.line > 0 ? `+${h.line}` : `${h.line}`;
      return [
        { pick: `让球主胜(${sign})`, odds: h.home },
        { pick: `让球平(${sign})`, odds: h.draw },
        { pick: `让球客胜(${sign})`, odds: h.away },
      ];
    }
    case "bf": {
      const base = Math.min(o.home, o.away);
      const scores = ["1:0", "2:0", "2:1", "3:1", "0:0", "1:1", "2:2", "0:1", "0:2", "1:2"];
      return scores.map((s, i) => ({ pick: s, odds: round2(base * 3.2 + i * 1.7) }));
    }
    case "jqs":
      return [
        { pick: "0球", odds: round2(o.draw + 2) },
        { pick: "1球", odds: round2(o.draw + 0.5) },
        { pick: "2球", odds: 2.95 },
        { pick: "3球", odds: round2(o.draw + 0.6) },
        { pick: "4球", odds: round2(o.draw + 2.6) },
        { pick: "5球", odds: 13 },
        { pick: "6球", odds: 24 },
        { pick: "7+球", odds: 35 },
      ];
    case "bqc":
      return [
        { pick: "胜/胜", odds: round2(o.home * 1.55) },
        { pick: "平/胜", odds: round2(o.home * 2.3) },
        { pick: "平/平", odds: round2(o.draw * 1.6) },
        { pick: "平/负", odds: round2(o.away * 2.3) },
        { pick: "胜/负", odds: 26 },
        { pick: "负/负", odds: round2(o.away * 1.55) },
      ];
    default:
      return [];
  }
}
