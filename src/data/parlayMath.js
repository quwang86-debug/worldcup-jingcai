/** 串关复式注数与奖金（总投入 = Σ(每项下注倍数×2)，合计倍数仅用于批量覆盖单项倍数） */

export const UNIT_PRICE = 2;

export function clampMult(v) {
  return Math.max(1, Math.floor(Number(v)) || 1);
}

/** 总投入：每个单项下注倍数 × 2，再相加（不含合计倍数） */
export function investFromLegs(legs) {
  let invest = 0;
  for (const leg of legs) {
    invest += UNIT_PRICE * clampMult(leg.mult);
  }
  return invest;
}

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

function picksPerGroup(legs) {
  return groupLegsByMatch(legs).map((g) =>
    g.picks.map((p) => ({
      odds: Number(p.odds) || 0,
      mult: clampMult(p.mult),
    }))
  );
}

export function ticketsInCombo(lengthsPerGroup, groupIndices) {
  let t = 1;
  for (const i of groupIndices) t *= lengthsPerGroup[i];
  return t;
}

/** 串关某一过关组合的注数与奖金（本金 = 该组合内各项下注倍数×2 之和） */
function sumCombo(picksPerGroup, groupIndices) {
  let tickets = 0;
  let payout = 0;
  const groupsPicks = groupIndices.map((i) => picksPerGroup[i]);

  function dfs(depth, oddsProduct, pickedMults) {
    if (depth === groupsPicks.length) {
      tickets += 1;
      const stake = pickedMults.reduce((s, m) => s + UNIT_PRICE * m, 0);
      payout += oddsProduct * stake;
      return;
    }
    for (const p of groupsPicks[depth]) {
      dfs(depth + 1, oddsProduct * p.odds, [...pickedMults, p.mult]);
    }
  }
  dfs(0, 1, []);
  return { tickets, payout };
}

/**
 * @param {Array} legs 扁平选注列表（每项 mult 为下注倍数）
 * @param {number[]} selectedSizes 过关阶数
 */
export function calcParlay(legs, selectedSizes) {
  const groups = picksPerGroup(legs);
  const n = groups.length;
  if (!n) return null;

  if (n === 1) {
    const picks = groups[0];
    const invest = investFromLegs(legs);
    let maxPayout = 0;
    for (const p of picks) {
      const stake = UNIT_PRICE * p.mult;
      maxPayout = Math.max(maxPayout, p.odds * stake);
    }
    return {
      mode: picks.length > 1 ? `单关·${picks.length}注` : "单关",
      tickets: picks.length,
      invest,
      payout: maxPayout,
      isSingleMulti: picks.length > 1,
    };
  }

  const sizes = [...selectedSizes].filter((m) => m >= 2 && m <= n);
  if (!sizes.length) {
    return { mode: "未选过关方式", tickets: 0, invest: 0, payout: 0 };
  }

  let tickets = 0;
  let payout = 0;
  for (const m of sizes) {
    for (const combo of indexCombinations(n, m)) {
      const part = sumCombo(groups, combo);
      tickets += part.tickets;
      payout += part.payout;
    }
  }

  const invest = investFromLegs(legs);

  const label =
    sizes.length === 1 && sizes[0] === n
      ? `${n}串1${tickets > choose(n, n) ? `·复式${tickets}注` : ""}`
      : `${sizes.map((m) => `${m}串1`).join("+")}（共${tickets}注）`;

  return { mode: label, tickets, invest, payout };
}

export function ticketsForParlaySize(legs, m) {
  const groups = picksPerGroup(legs);
  const n = groups.length;
  if (m < 2 || m > n) return 0;
  const lengths = groups.map((g) => g.length);
  let t = 0;
  for (const combo of indexCombinations(n, m)) {
    t += ticketsInCombo(lengths, combo);
  }
  return t;
}
