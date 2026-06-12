/**
 * 全局选注单（下注方案）store。
 * 体彩 App 式交互：在任何页面点选赔率即加入方案；同一场比赛只保留一个选项，
 * 重复点选同一选项则取消。数据持久化到 localStorage，与串关计算器共享。
 */
import { reactive, watch } from "vue";
import { getPlayOptions } from "./odds.js";

export const MAX_LEGS = 6;
const STORAGE_KEY = "wc_betslip";

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 形状与计算器的"腿"一致：{ matchId, label, date, group, playId, pick, odds } */
export const legs = reactive(load());

watch(
  legs,
  (value) => localStorage.setItem(STORAGE_KEY, JSON.stringify(value)),
  { deep: true }
);

export function legFor(matchId) {
  return legs.find((l) => String(l.matchId) === String(matchId));
}

export function isSelected(matchId, playId, pick) {
  const leg = legFor(matchId);
  return Boolean(leg && leg.playId === playId && leg.pick === pick);
}

function makeLeg(match, playId, pick, odds) {
  return {
    matchId: match.espn_event_id,
    label: match.fixture_zh,
    date: `${match.beijing_date} ${match.beijing_time}`,
    group: match.group,
    playId,
    pick,
    odds,
  };
}

/**
 * 点选一个赔率选项。已选同一选项 → 取消；同场其他选项 → 替换；
 * 新场次且未满 6 场 → 加入。返回 false 表示方案已满。
 */
export function toggleSelection(match, playId, pick, odds) {
  const existing = legFor(match.espn_event_id);
  if (existing && existing.playId === playId && existing.pick === pick) {
    legs.splice(legs.indexOf(existing), 1);
    return true;
  }
  if (existing) {
    existing.playId = playId;
    existing.pick = pick;
    existing.odds = odds;
    return true;
  }
  if (legs.length >= MAX_LEGS) return false;
  legs.push(makeLeg(match, playId, pick, odds));
  return true;
}

/** 以默认玩法（胜平负第一项）加入一场比赛，已在单中则忽略 */
export function addMatchDefault(match) {
  if (!match || legFor(match.espn_event_id) || legs.length >= MAX_LEGS) return;
  const options = getPlayOptions(match, "spf");
  if (options.length) legs.push(makeLeg(match, "spf", options[0].pick, options[0].odds));
}

export function removeLegAt(index) {
  legs.splice(index, 1);
}

export function clearSlip() {
  legs.splice(0, legs.length);
}
