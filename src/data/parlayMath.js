/** 串关复式注数与奖金计算（同场可多选） */

export function groupLegsByMatch(legs) {
  const groups = new Map();
  for (const leg of legs) {
    const id = String(leg.matchId);
    if (!groups.has(id)) {
      groups.set(id, {
        matchId: id,
        label: leg.label,
        date: leg.date,
        group: leg.group,
        picks: [],
      });
    }
    groups.get(id).picks.push(leg);
  }
  return [...groups.values()];
}

export function uniqueMatchCount(legs) {
  return new Set(legs.map((l) => String(l.matchId))).size;
}

export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - i + 1)) / i;
  return Math.round(r);
}

/** 从 n 个下标中选 k 个的所有组合 */
export function indexCombinations(n, k) {
  const out = [];
  const buf = [];
  function dfs(start) {
    if (buf.length === k) {
      out.push([...buf]);
      return;
    }
    for (let i = start; i < n; i++) {
      buf.push(i);
      dfs(i + 1);
      buf.pop();
    }
  }
  dfs(0);
  return out;
}

/** 给定场次下标组合，注数 = 各场选项数之积 */
export function ticketsInCombo(oddsPerGroup, groupIndices) {
  let t = 1;
  for (const i of groupIndices) t *= oddsPerGroup[i].length;
  return t;
}

/** 给定场次下标组合，所有选项赔率乘积之和 */
export function payoutSumInCombo(oddsPerGroup, groupIndices) {
  let sum = 0;
  const picks = groupIndices.map((i) => oddsPerGroup[i]);
  function dfs(depth, product) {
    if (depth === picks.length) {
      sum += product;
      return;
    }
    for (const o of picks[depth]) dfs(depth + 1, product * o);
  }
  dfs(0, 1);
  return sum;
}

/**
 * @param {Array} legs 扁平选注列表
 * @param {number[]} selectedSizes 过关阶数如 [2,3]
 * @param {number} stakePerTicket 每注金额（已含倍数）
 */
export function calcParlay(legs, selectedSizes, stakePerTicket) {
  const groups = groupLegsByMatch(legs);
  const n = groups.length;
  if (!n) return null;

  const oddsPerGroup = groups.map((g) => g.picks.map((p) => Number(p.odds) || 0));

  if (n === 1) {
    const k = oddsPerGroup[0].length;
    const maxOdds = Math.max(...oddsPerGroup[0], 0);
    return {
      mode: k > 1 ? `单关·${k}注` : "单关",
      tickets: k,
      invest: k * stakePerTicket,
      payout: maxOdds * stakePerTicket,
      isSingleMulti: k > 1,
    };
  }

  const sizes = [...selectedSizes].filter((m) => m >= 2 && m <= n);
  if (!sizes.length) return { mode: "未选过关方式", tickets: 0, invest: 0, payout: 0 };

  let tickets = 0;
  let payout = 0;
  for (const m of sizes) {
    for (const combo of indexCombinations(n, m)) {
      tickets += ticketsInCombo(oddsPerGroup, combo);
      payout += payoutSumInCombo(oddsPerGroup, combo) * stakePerTicket;
    }
  }

  const label =
    sizes.length === 1 && sizes[0] === n
      ? `${n}串1${tickets > choose(n, n) ? `·复式${tickets}注` : ""}`
      : `${sizes.map((m) => `${m}串1`).join("+")}（共${tickets}注）`;

  return { mode: label, tickets, invest: tickets * stakePerTicket, payout };
}

/** 某过关阶数的注数（用于过关方式 pill 展示） */
export function ticketsForParlaySize(legs, m) {
  const groups = groupLegsByMatch(legs);
  const n = groups.length;
  if (m < 2 || m > n) return 0;
  const oddsPerGroup = groups.map((g) => g.picks.map((p) => Number(p.odds) || 0));
  let t = 0;
  for (const combo of indexCombinations(n, m)) t += ticketsInCombo(oddsPerGroup, combo);
  return t;
}
